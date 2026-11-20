package expo.modules.earbudnative

import android.Manifest
import android.app.NotificationManager
import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothClass
import android.bluetooth.BluetoothDevice
import android.bluetooth.BluetoothGatt
import android.bluetooth.BluetoothGattCallback
import android.bluetooth.BluetoothGattCharacteristic
import android.bluetooth.BluetoothManager
import android.bluetooth.BluetoothProfile
import android.bluetooth.le.ScanCallback
import android.bluetooth.le.ScanFilter
import android.bluetooth.le.ScanResult
import android.bluetooth.le.ScanSettings
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.PackageManager
import android.media.AudioAttributes
import android.media.AudioFocusRequest
import android.media.AudioManager
import android.media.audiofx.Equalizer
import android.os.Build
import android.os.PowerManager
import android.provider.Settings
import android.util.Log
import android.view.KeyEvent
import androidx.core.content.ContextCompat
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.coroutines.withTimeoutOrNull
import java.util.UUID
import kotlin.coroutines.resume

private const val TAG = "EarbudNative"

val BATTERY_SERVICE_UUID: UUID = UUID.fromString("0000180F-0000-1000-8000-00805F9B34FB")
val BATTERY_LEVEL_CHAR_UUID: UUID = UUID.fromString("00002A19-0000-1000-8000-00805F9B34FB")

const val ACTION_BATTERY_LEVEL_CHANGED = "android.bluetooth.device.action.BATTERY_LEVEL_CHANGED"
const val EXTRA_BATTERY_LEVEL = "android.bluetooth.device.extra.BATTERY_LEVEL"

class EarbudNativeModule : Module() {
    companion object {
        var instance: EarbudNativeModule? = null
            private set
        
        val batteryCache = mutableMapOf<String, Int>()
    }

    private val context: Context
        get() = appContext.reactContext ?: throw IllegalStateException("React context is unavailable")

    private val bluetoothManager: BluetoothManager?
        get() = context.getSystemService(Context.BLUETOOTH_SERVICE) as? BluetoothManager

    private val bluetoothAdapter: BluetoothAdapter?
        get() = bluetoothManager?.adapter ?: BluetoothAdapter.getDefaultAdapter()

    private val audioManager: AudioManager?
        get() = context.getSystemService(Context.AUDIO_SERVICE) as? AudioManager

    private val notificationManager: NotificationManager?
        get() = context.getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager

    private val powerManager: PowerManager?
        get() = context.getSystemService(Context.POWER_SERVICE) as? PowerManager

    private var a2dpProfile: BluetoothProfile? = null
    private var headsetProfile: BluetoothProfile? = null
    private var isReceiverRegistered = false

    // BLE RSSI Scanning
    private var isScanningRssi = false
    private var targetScanAddress: String? = null

    // Equalizer instance (audio session 0 = global mix)
    private var nativeEqualizer: Equalizer? = null
    private var isEqSupported: Boolean? = null

    private val bleScanCallback = object : ScanCallback() {
        override fun onScanResult(callbackType: Int, result: ScanResult?) {
            result ?: return
            val dev = result.device ?: return
            val address = dev.address ?: return
            val devName = try { dev.name ?: "" } catch (_: SecurityException) { "" } catch (_: Exception) { "" }
            val target = targetScanAddress ?: return

            val matchesAddress = address.equals(target, ignoreCase = true)
            val matchesName = devName.isNotEmpty() && (target.contains(devName, ignoreCase = true) || devName.contains(target, ignoreCase = true))

            if (matchesAddress || matchesName) {
                val rssi = result.rssi
                Log.d(TAG, "BLE Scan RSSI for ${dev.address} ($devName): $rssi dBm")
                try {
                    sendEvent("onBleRssiScanned", mapOf(
                        "address" to target,
                        "rssi" to rssi
                    ))
                } catch (e: Exception) {
                    Log.w(TAG, "Could not send RSSI event: ${e.message}")
                }
            }
        }

        override fun onScanFailed(errorCode: Int) {
            Log.w(TAG, "BLE Scan failed with error code: $errorCode")
            isScanningRssi = false
        }
    }

    private val profileListener = object : BluetoothProfile.ServiceListener {
        override fun onServiceConnected(profile: Int, proxy: BluetoothProfile) {
            when (profile) {
                BluetoothProfile.A2DP -> a2dpProfile = proxy
                BluetoothProfile.HEADSET -> headsetProfile = proxy
            }
        }

        override fun onServiceDisconnected(profile: Int) {
            when (profile) {
                BluetoothProfile.A2DP -> a2dpProfile = null
                BluetoothProfile.HEADSET -> headsetProfile = null
            }
        }
    }

    private val bluetoothReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            intent ?: return
            val action = intent.action ?: return

            when (action) {
                BluetoothDevice.ACTION_ACL_CONNECTED,
                BluetoothDevice.ACTION_ACL_DISCONNECTED -> {
                    val device: BluetoothDevice? = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                        intent.getParcelableExtra(BluetoothDevice.EXTRA_DEVICE, BluetoothDevice::class.java)
                    } else {
                        @Suppress("DEPRECATION")
                        intent.getParcelableExtra(BluetoothDevice.EXTRA_DEVICE)
                    }

                    device?.let { dev ->
                        val isConnected = (action == BluetoothDevice.ACTION_ACL_CONNECTED)
                        handleDeviceConnectionEvent(dev, isConnected)
                    }
                }

                BluetoothAdapter.ACTION_STATE_CHANGED -> {
                    val state = intent.getIntExtra(BluetoothAdapter.EXTRA_STATE, BluetoothAdapter.ERROR)
                    val isEnabled = (state == BluetoothAdapter.STATE_ON)
                    handleBluetoothStateEvent(isEnabled)
                }

                BluetoothDevice.ACTION_BOND_STATE_CHANGED -> {
                    sendEvent("onBondStateChanged", mapOf<String, Any>())
                }

                ACTION_BATTERY_LEVEL_CHANGED -> {
                    val device: BluetoothDevice? = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                        intent.getParcelableExtra(BluetoothDevice.EXTRA_DEVICE, BluetoothDevice::class.java)
                    } else {
                        @Suppress("DEPRECATION")
                        intent.getParcelableExtra(BluetoothDevice.EXTRA_DEVICE)
                    }

                    val level = intent.getIntExtra(EXTRA_BATTERY_LEVEL, -1)
                    device?.address?.let { address ->
                        if (level in 0..100) {
                            batteryCache[address.uppercase()] = level
                            handleBatteryLevelEvent(address, level)
                        }
                    }
                }
            }
        }
    }

    fun handleDeviceConnectionEvent(device: BluetoothDevice, isConnected: Boolean) {
        val address = device.address ?: ""
        val name = try {
            if (hasConnectPermission()) device.name ?: "Unknown" else "Unknown"
        } catch (e: SecurityException) {
            "Unknown"
        }

        val isScreenOn = powerManager?.isInteractive ?: true
        Log.d(TAG, "Device connection event: $address ($name) connected=$isConnected isScreenOn=$isScreenOn")

        try {
            sendEvent("onDeviceConnectionChanged", mapOf(
                "address" to address,
                "name" to name,
                "connected" to isConnected,
                "isScreenOn" to isScreenOn
            ))
        } catch (e: Exception) {
            Log.w(TAG, "Could not send connection event to JS: ${e.message}")
        }
    }

    fun handleBluetoothStateEvent(isEnabled: Boolean) {
        Log.d(TAG, "Bluetooth state changed: enabled=$isEnabled")
        try {
            sendEvent("onBluetoothStateChanged", mapOf(
                "enabled" to isEnabled
            ))
        } catch (e: Exception) {
            Log.w(TAG, "Could not send bluetooth state event to JS: ${e.message}")
        }
    }

    fun handleBatteryLevelEvent(address: String, level: Int?) {
        Log.d(TAG, "Battery level update for $address: $level")
        try {
            sendEvent("onBatteryLevelChanged", mapOf(
                "address" to address,
                "batteryLevel" to level
            ))
        } catch (e: Exception) {
            Log.w(TAG, "Could not send battery event to JS: ${e.message}")
        }
    }

    override fun definition() = ModuleDefinition {
        Name("EarbudNative")

        Events(
            "onDeviceConnectionChanged",
            "onBluetoothStateChanged",
            "onBondStateChanged",
            "onBatteryLevelChanged",
            "onBleRssiScanned"
        )

        OnCreate {
            instance = this@EarbudNativeModule
            initProfileProxies()
            registerBluetoothReceiver()
        }

        OnDestroy {
            if (instance === this@EarbudNativeModule) {
                instance = null
            }
            releaseEqualizer()
            stopBleRssiScan()
            unregisterBluetoothReceiver()
            closeProfileProxies()
        }

        OnStartObserving {
            registerBluetoothReceiver()
        }

        OnStopObserving {
            // Keep listening in background
        }

        Function("hasBluetoothPermission") {
            hasConnectPermission()
        }

        Function("hasScanPermission") {
            hasScanPermissionInternal()
        }

        Function("isBluetoothEnabled") {
            bluetoothAdapter?.isEnabled ?: false
        }

        Function("isScreenInteractive") {
            powerManager?.isInteractive ?: true
        }

        Function("isWatcherServiceRunning") {
            EarbudForegroundService.isServiceRunning
        }

        AsyncFunction("startWatcherService") {
            try {
                EarbudForegroundService.start(context)
                true
            } catch (e: Exception) {
                Log.e(TAG, "Failed to start foreground service", e)
                false
            }
        }

        AsyncFunction("stopWatcherService") {
            try {
                EarbudForegroundService.stop(context)
                true
            } catch (e: Exception) {
                Log.e(TAG, "Failed to stop foreground service", e)
                false
            }
        }

        Function("openBluetoothSettings") {
            try {
                val intent = Intent(Settings.ACTION_BLUETOOTH_SETTINGS).apply {
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                context.startActivity(intent)
                true
            } catch (e: Exception) {
                Log.e(TAG, "Failed to open bluetooth settings", e)
                false
            }
        }

        Function("openAppSettings") {
            try {
                val intent = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
                    data = android.net.Uri.fromParts("package", context.packageName, null)
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                context.startActivity(intent)
                true
            } catch (e: Exception) {
                Log.e(TAG, "Failed to open app settings", e)
                false
            }
        }

        /**
         * Stage 9: Check if Equalizer is supported by the device's AudioFX engine
         */
        Function("isEqualizerAvailable") {
            checkEqualizerSupport()
        }

        /**
         * Stage 9: Get Equalizer parameters (bands, min/max level, center frequencies)
         */
        Function("getEqualizerParameters") {
            try {
                val eq = getOrCreateEqualizer() ?: return@Function null
                val numBands = eq.numberOfBands.toInt()
                val minLevel = eq.bandLevelRange[0].toInt() // typically -1500 mB
                val maxLevel = eq.bandLevelRange[1].toInt() // typically +1500 mB

                val bandsList = mutableListOf<Map<String, Any>>()
                for (b in 0 until numBands) {
                    val bandShort = b.toShort()
                    val centerFreqHz = eq.getCenterFreq(bandShort) / 1000 // Convert mHz to Hz
                    val currentLevelMB = eq.getBandLevel(bandShort).toInt()

                    bandsList.add(mapOf(
                        "band" to b,
                        "centerFreqHz" to centerFreqHz,
                        "currentLevelMB" to currentLevelMB
                    ))
                }

                mapOf(
                    "isSupported" to true,
                    "numberOfBands" to numBands,
                    "minLevelMB" to minLevel,
                    "maxLevelMB" to maxLevel,
                    "bands" to bandsList
                )
            } catch (e: Exception) {
                Log.w(TAG, "Failed to get equalizer parameters: ${e.message}")
                null
            }
        }

        /**
         * Stage 9: Set individual Equalizer band level in millibels
         */
        Function("setEqualizerBandLevel") { band: Int, levelMB: Int ->
            try {
                val eq = getOrCreateEqualizer() ?: return@Function false
                val range = eq.bandLevelRange
                val clamped = levelMB.coerceIn(range[0].toInt(), range[1].toInt()).toShort()
                eq.setBandLevel(band.toShort(), clamped)
                Log.d(TAG, "Set EQ band $band to $clamped mB")
                true
            } catch (e: Exception) {
                Log.e(TAG, "Failed to set EQ band level", e)
                false
            }
        }

        /**
         * Stage 9: Enable or disable the Equalizer
         */
        Function("setEqualizerEnabled") { enabled: Boolean ->
            try {
                val eq = getOrCreateEqualizer() ?: return@Function false
                eq.enabled = enabled
                Log.d(TAG, "Set Equalizer enabled: $enabled")
                true
            } catch (e: Exception) {
                Log.e(TAG, "Failed to set equalizer enabled", e)
                false
            }
        }

        /**
         * Stage 10: Query active Bluetooth A2DP audio codec (LDAC, aptX, aptX HD, AAC, SBC, or Unknown)
         */
        AsyncFunction("getActiveAudioCodec") { address: String ->
            getAudioCodecByAddress(address)
        }


        /**
         * Stage 7: Start BLE RSSI scanning for "Getting Warmer" proximity meter
         */
        Function("startRssiScan") { address: String ->
            startBleRssiScan(address)
        }

        Function("stopRssiScan") {
            stopBleRssiScan()
        }

        Function("isRssiScanning") {
            isScanningRssi
        }

        /**
         * Stage 6: Set Media Volume (0 - 100%)
         */
        Function("setMediaVolume") { volumePercent: Int ->
            try {
                val am = audioManager ?: return@Function false
                val maxVolume = am.getStreamMaxVolume(AudioManager.STREAM_MUSIC)
                val clamped = volumePercent.coerceIn(0, 100)
                val targetIndex = (clamped * maxVolume) / 100
                am.setStreamVolume(AudioManager.STREAM_MUSIC, targetIndex, 0)
                Log.d(TAG, "Set media volume to $clamped% (index $targetIndex / $maxVolume)")
                true
            } catch (e: Exception) {
                Log.e(TAG, "Failed to set media volume", e)
                false
            }
        }

        Function("getMediaVolume") {
            try {
                val am = audioManager ?: return@Function 50
                val maxVolume = am.getStreamMaxVolume(AudioManager.STREAM_MUSIC)
                if (maxVolume == 0) return@Function 0
                val current = am.getStreamVolume(AudioManager.STREAM_MUSIC)
                (current * 100) / maxVolume
            } catch (e: Exception) {
                Log.e(TAG, "Failed to get media volume", e)
                50
            }
        }

        Function("pauseMedia") {
            try {
                val am = audioManager ?: return@Function false

                val downEvent = KeyEvent(KeyEvent.ACTION_DOWN, KeyEvent.KEYCODE_MEDIA_PAUSE)
                val upEvent = KeyEvent(KeyEvent.ACTION_UP, KeyEvent.KEYCODE_MEDIA_PAUSE)
                am.dispatchMediaKeyEvent(downEvent)
                am.dispatchMediaKeyEvent(upEvent)

                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    val focusRequest = AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT)
                        .setAudioAttributes(
                            AudioAttributes.Builder()
                                .setUsage(AudioAttributes.USAGE_MEDIA)
                                .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                                .build()
                        )
                        .build()
                    am.requestAudioFocus(focusRequest)
                    am.abandonAudioFocusRequest(focusRequest)
                } else {
                    @Suppress("DEPRECATION")
                    am.requestAudioFocus(null, AudioManager.STREAM_MUSIC, AudioManager.AUDIOFOCUS_GAIN_TRANSIENT)
                    @Suppress("DEPRECATION")
                    am.abandonAudioFocus(null)
                }

                Log.d(TAG, "Dispatched pause media events successfully")
                true
            } catch (e: Exception) {
                Log.e(TAG, "Failed to pause media", e)
                false
            }
        }

        Function("launchApp") { packageName: String ->
            try {
                val pm = context.packageManager
                val intent = pm.getLaunchIntentForPackage(packageName)
                if (intent != null) {
                    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                    context.startActivity(intent)
                    Log.d(TAG, "Launched app package: $packageName")
                    true
                } else {
                    Log.w(TAG, "No launch intent for package: $packageName")
                    false
                }
            } catch (e: Exception) {
                Log.e(TAG, "Failed to launch app $packageName", e)
                false
            }
        }

        Function("isDndPermissionGranted") {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                notificationManager?.isNotificationPolicyAccessGranted ?: false
            } else {
                true
            }
        }

        Function("openDndSettings") {
            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    val intent = Intent(Settings.ACTION_NOTIFICATION_POLICY_ACCESS_SETTINGS).apply {
                        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                    }
                    context.startActivity(intent)
                    true
                } else {
                    false
                }
            } catch (e: Exception) {
                Log.e(TAG, "Failed to open DND settings", e)
                false
            }
        }

        Function("setDndEnabled") { enable: Boolean ->
            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    val nm = notificationManager ?: return@Function false
                    if (nm.isNotificationPolicyAccessGranted) {
                        val filter = if (enable) {
                            NotificationManager.INTERRUPTION_FILTER_PRIORITY
                        } else {
                            NotificationManager.INTERRUPTION_FILTER_ALL
                        }
                        nm.setInterruptionFilter(filter)
                        Log.d(TAG, "Set DND filter: enable=$enable")
                        true
                    } else {
                        Log.w(TAG, "DND permission not granted")
                        false
                    }
                } else {
                    false
                }
            } catch (e: Exception) {
                Log.e(TAG, "Failed to set DND filter", e)
                false
            }
        }

        AsyncFunction("getDeviceBatteryLevel") { address: String ->
            getDeviceBattery(address)
        }

        AsyncFunction("getBondedAudioDevices") {
            val result = mutableListOf<Map<String, Any?>>()
            val adapter = bluetoothAdapter ?: return@AsyncFunction result

            if (!hasConnectPermission()) {
                Log.w(TAG, "BLUETOOTH_CONNECT permission not granted")
                return@AsyncFunction result
            }

            try {
                val bonded = adapter.bondedDevices ?: emptySet()
                for (device in bonded) {
                    if (isAudioDevice(device)) {
                        val isConnected = checkDeviceConnected(device)
                        val battery = getBatteryReflection(device) ?: batteryCache[device.address.uppercase()]

                        val deviceType = when (device.type) {
                            BluetoothDevice.DEVICE_TYPE_CLASSIC -> "classic"
                            BluetoothDevice.DEVICE_TYPE_LE -> "le"
                            BluetoothDevice.DEVICE_TYPE_DUAL -> "dual"
                            else -> "unknown"
                        }
                        val btClass = try { device.bluetoothClass } catch (_: SecurityException) { null }

                        result.add(
                            mapOf(
                                "name" to (device.name ?: "Unknown Device"),
                                "address" to device.address,
                                "isConnected" to isConnected,
                                "batteryLevel" to battery,
                                "codec" to (if (isConnected) getAudioCodec(device) else "Unknown"),
                                "type" to deviceType,
                                "majorDeviceClass" to (btClass?.majorDeviceClass ?: 0),
                                "deviceClass" to (btClass?.deviceClass ?: 0)
                            )
                        )
                    }
                }
            } catch (e: SecurityException) {
                Log.e(TAG, "SecurityException reading bonded devices", e)
            } catch (e: Exception) {
                Log.e(TAG, "Exception reading bonded devices", e)
            }

            result
        }
    }

    private fun checkEqualizerSupport(): Boolean {
        if (isEqSupported != null) return isEqSupported!!
        val eq = getOrCreateEqualizer()
        val supported = (eq != null && eq.numberOfBands > 0)
        isEqSupported = supported
        return supported
    }

    private fun getOrCreateEqualizer(): Equalizer? {
        if (nativeEqualizer != null) return nativeEqualizer
        return try {
            val eq = Equalizer(0, 0)
            nativeEqualizer = eq
            isEqSupported = true
            eq
        } catch (e: Exception) {
            Log.w(TAG, "Failed to initialize Equalizer: ${e.message}")
            isEqSupported = false
            null
        }
    }

    private fun releaseEqualizer() {
        try {
            nativeEqualizer?.release()
            nativeEqualizer = null
        } catch (e: Exception) {
            Log.w(TAG, "Error releasing Equalizer: ${e.message}")
        }
    }

    private fun startBleRssiScan(address: String): Boolean {
        val adapter = bluetoothAdapter ?: return false
        if (!hasScanPermissionInternal()) {
            Log.w(TAG, "Scan permission missing for RSSI scan")
            return false
        }

        val scanner = adapter.bluetoothLeScanner ?: return false
        stopBleRssiScan()

        targetScanAddress = address.uppercase()
        val settings = ScanSettings.Builder()
            .setScanMode(ScanSettings.SCAN_MODE_LOW_LATENCY)
            .build()

        try {
            // Pass null filters so all surrounding BLE beacons and devices are captured
            scanner.startScan(null, settings, bleScanCallback)
            isScanningRssi = true
            Log.d(TAG, "Started BLE RSSI scan for $address")
            return true
        } catch (e: Exception) {
            Log.e(TAG, "Failed to start BLE RSSI scan", e)
            isScanningRssi = false
            return false
        }
    }

    private fun stopBleRssiScan(): Boolean {
        val adapter = bluetoothAdapter ?: return false
        val scanner = adapter.bluetoothLeScanner ?: return false

        if (isScanningRssi) {
            try {
                if (hasScanPermissionInternal()) {
                    scanner.stopScan(bleScanCallback)
                }
                isScanningRssi = false
                targetScanAddress = null
                Log.d(TAG, "Stopped BLE RSSI scan")
                return true
            } catch (e: Exception) {
                Log.e(TAG, "Failed to stop BLE RSSI scan", e)
            }
        }
        return false
    }

    /**
     * Stage 10: Query active Bluetooth A2DP audio codec (LDAC, aptX, aptX HD, AAC, SBC, LC3, or Unknown)
     */
    private fun getAudioCodec(device: BluetoothDevice): String {
        try {
            val a2dp = a2dpProfile ?: return "Unknown"

            // Method 1: BluetoothA2dp.getCodecStatus(device)
            val getCodecStatusMethod = a2dp.javaClass.getMethod("getCodecStatus", BluetoothDevice::class.java)
            val codecStatus = getCodecStatusMethod.invoke(a2dp, device) ?: return "Unknown"

            // Method 2: BluetoothCodecStatus.getCodecConfig()
            val getCodecConfigMethod = codecStatus.javaClass.getMethod("getCodecConfig")
            val codecConfig = getCodecConfigMethod.invoke(codecStatus) ?: return "Unknown"

            // Check if getCodecName() exists
            try {
                val getCodecNameMethod = codecConfig.javaClass.getMethod("getCodecName")
                val name = getCodecNameMethod.invoke(codecConfig) as? String
                if (!name.isNullOrBlank()) {
                    return name
                }
            } catch (_: Exception) {}

            // Fallback: getCodecType()
            val getCodecTypeMethod = codecConfig.javaClass.getMethod("getCodecType")
            val type = (getCodecTypeMethod.invoke(codecConfig) as? Int) ?: return "Unknown"

            return when (type) {
                0 -> "SBC"
                1 -> "AAC"
                2 -> "aptX"
                3 -> "aptX HD"
                4 -> "LDAC"
                5 -> "LC3"
                6 -> "Opus"
                else -> "Unknown"
            }
        } catch (e: Exception) {
            Log.d(TAG, "Audio codec detection via reflection not available: ${e.message}")
            return "Unknown"
        }
    }

    private fun getAudioCodecByAddress(address: String): String {
        val adapter = bluetoothAdapter ?: return "Unknown"
        if (!hasConnectPermission()) return "Unknown"
        return try {
            val device = adapter.getRemoteDevice(address) ?: return "Unknown"
            getAudioCodec(device)
        } catch (e: Exception) {
            "Unknown"
        }
    }

    private fun getDeviceBattery(address: String): Int? {
        val adapter = bluetoothAdapter ?: return null
        if (!hasConnectPermission()) return null

        val device = try {
            adapter.getRemoteDevice(address)
        } catch (e: Exception) {
            null
        } ?: return null

        val reflectionLevel = getBatteryReflection(device)
        if (reflectionLevel != null && reflectionLevel in 0..100) {
            Log.d(TAG, "Battery for $address via reflection: $reflectionLevel%")
            batteryCache[address.uppercase()] = reflectionLevel
            return reflectionLevel
        }

        val cached = batteryCache[address.uppercase()]
        if (cached != null && cached in 0..100) {
            Log.d(TAG, "Battery for $address via broadcast cache: $cached%")
            return cached
        }

        Log.d(TAG, "Battery for $address unavailable")
        return null
    }

    private fun getBatteryReflection(device: BluetoothDevice): Int? {
        return try {
            val method = device.javaClass.getMethod("getBatteryLevel")
            val level = method.invoke(device) as? Int
            if (level != null && level >= 0) level else null
        } catch (_: Exception) {
            null
        }
    }

    private fun hasConnectPermission(): Boolean {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            ContextCompat.checkSelfPermission(
                context,
                Manifest.permission.BLUETOOTH_CONNECT
            ) == PackageManager.PERMISSION_GRANTED
        } else {
            ContextCompat.checkSelfPermission(
                context,
                Manifest.permission.BLUETOOTH
            ) == PackageManager.PERMISSION_GRANTED
        }
    }

    private fun hasScanPermissionInternal(): Boolean {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            ContextCompat.checkSelfPermission(
                context,
                Manifest.permission.BLUETOOTH_SCAN
            ) == PackageManager.PERMISSION_GRANTED
        } else {
            ContextCompat.checkSelfPermission(
                context,
                Manifest.permission.ACCESS_FINE_LOCATION
            ) == PackageManager.PERMISSION_GRANTED
        }
    }

    private fun isAudioDevice(device: BluetoothDevice): Boolean {
        val btClass = try {
            if (hasConnectPermission()) device.bluetoothClass else null
        } catch (e: SecurityException) {
            null
        } ?: return true

        val major = btClass.majorDeviceClass
        if (major == BluetoothClass.Device.Major.AUDIO_VIDEO) {
            return true
        }

        return when (btClass.deviceClass) {
            BluetoothClass.Device.AUDIO_VIDEO_HEADPHONES,
            BluetoothClass.Device.AUDIO_VIDEO_WEARABLE_HEADSET,
            BluetoothClass.Device.AUDIO_VIDEO_LOUDSPEAKER,
            BluetoothClass.Device.AUDIO_VIDEO_PORTABLE_AUDIO,
            BluetoothClass.Device.AUDIO_VIDEO_HIFI_AUDIO,
            BluetoothClass.Device.AUDIO_VIDEO_CAR_AUDIO -> true
            BluetoothClass.Device.Major.UNCATEGORIZED -> true
            else -> false
        }
    }

    private fun checkDeviceConnected(device: BluetoothDevice): Boolean {
        try {
            a2dpProfile?.let { a2dp ->
                if (hasConnectPermission()) {
                    val connected = a2dp.connectedDevices
                    if (connected.any { it.address.equals(device.address, ignoreCase = true) }) {
                        return true
                    }
                }
            }
        } catch (_: Exception) {}

        try {
            headsetProfile?.let { headset ->
                if (hasConnectPermission()) {
                    val connected = headset.connectedDevices
                    if (connected.any { it.address.equals(device.address, ignoreCase = true) }) {
                        return true
                    }
                }
            }
        } catch (_: Exception) {}

        try {
            val method = device.javaClass.getMethod("isConnected")
            val isConnected = method.invoke(device) as? Boolean
            if (isConnected == true) {
                return true
            }
        } catch (_: Exception) {}

        return false
    }

    private fun initProfileProxies() {
        val adapter = bluetoothAdapter ?: return
        try {
            adapter.getProfileProxy(context, profileListener, BluetoothProfile.A2DP)
            adapter.getProfileProxy(context, profileListener, BluetoothProfile.HEADSET)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to get Bluetooth profile proxies", e)
        }
    }

    private fun closeProfileProxies() {
        val adapter = bluetoothAdapter ?: return
        try {
            a2dpProfile?.let { adapter.closeProfileProxy(BluetoothProfile.A2DP, it) }
            headsetProfile?.let { adapter.closeProfileProxy(BluetoothProfile.HEADSET, it) }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to close Bluetooth profile proxies", e)
        }
    }

    private fun registerBluetoothReceiver() {
        if (isReceiverRegistered) return
        try {
            val filter = IntentFilter().apply {
                addAction(BluetoothDevice.ACTION_ACL_CONNECTED)
                addAction(BluetoothDevice.ACTION_ACL_DISCONNECTED)
                addAction(BluetoothDevice.ACTION_ACL_DISCONNECT_REQUESTED)
                addAction(BluetoothAdapter.ACTION_STATE_CHANGED)
                addAction(BluetoothDevice.ACTION_BOND_STATE_CHANGED)
                addAction(ACTION_BATTERY_LEVEL_CHANGED)
            }

            ContextCompat.registerReceiver(
                context,
                bluetoothReceiver,
                filter,
                ContextCompat.RECEIVER_EXPORTED
            )
            isReceiverRegistered = true
            Log.d(TAG, "Bluetooth receiver registered in module with battery & RSSI support")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to register Bluetooth receiver", e)
        }
    }

    private fun unregisterBluetoothReceiver() {
        if (!isReceiverRegistered) return
        try {
            context.unregisterReceiver(bluetoothReceiver)
            isReceiverRegistered = false
            Log.d(TAG, "Bluetooth receiver unregistered from module")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to unregister Bluetooth receiver", e)
        }
    }
}
