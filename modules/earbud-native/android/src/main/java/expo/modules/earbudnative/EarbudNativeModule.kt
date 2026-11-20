package expo.modules.earbudnative

import android.Manifest
import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothClass
import android.bluetooth.BluetoothDevice
import android.bluetooth.BluetoothManager
import android.bluetooth.BluetoothProfile
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.PackageManager
import android.os.Build
import android.provider.Settings
import android.util.Log
import androidx.core.content.ContextCompat
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

private const val TAG = "EarbudNative"

class EarbudNativeModule : Module() {
    companion object {
        var instance: EarbudNativeModule? = null
            private set
    }

    private val context: Context
        get() = appContext.reactContext ?: throw IllegalStateException("React context is unavailable")

    private val bluetoothManager: BluetoothManager?
        get() = context.getSystemService(Context.BLUETOOTH_SERVICE) as? BluetoothManager

    private val bluetoothAdapter: BluetoothAdapter?
        get() = bluetoothManager?.adapter ?: BluetoothAdapter.getDefaultAdapter()

    private var a2dpProfile: BluetoothProfile? = null
    private var headsetProfile: BluetoothProfile? = null
    private var isReceiverRegistered = false

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

        Log.d(TAG, "Device connection event: $address ($name) connected=$isConnected")

        try {
            sendEvent("onDeviceConnectionChanged", mapOf(
                "address" to address,
                "name" to name,
                "connected" to isConnected
            ))
        } catch (e: Exception) {
            Log.w(TAG, "Could not send event to JS (app may be backgrounded/suspended): ${e.message}")
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

    override fun definition() = ModuleDefinition {
        Name("EarbudNative")

        Events(
            "onDeviceConnectionChanged",
            "onBluetoothStateChanged",
            "onBondStateChanged"
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

        Function("isBluetoothEnabled") {
            bluetoothAdapter?.isEnabled ?: false
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

    private fun isAudioDevice(device: BluetoothDevice): Boolean {
        val btClass = try {
            if (hasConnectPermission()) device.bluetoothClass else null
        } catch (e: SecurityException) {
            null
        } ?: return true // If permission missing or null, don't filter out

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
        // 1. Check A2DP profile connection
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

        // 2. Check Headset profile connection
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

        // 3. Fallback: BluetoothDevice.isConnected() reflection (API 21+)
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
            }

            ContextCompat.registerReceiver(
                context,
                bluetoothReceiver,
                filter,
                ContextCompat.RECEIVER_EXPORTED
            )
            isReceiverRegistered = true
            Log.d(TAG, "Bluetooth receiver registered in module")
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
