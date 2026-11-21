package expo.modules.earbudnative

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothDevice
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.IBinder
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat

private const val TAG = "EarbudService"
const val CHANNEL_ID = "earbudkit_device_monitor_channel"
const val NOTIFICATION_ID = 1001

class EarbudForegroundService : Service() {
    companion object {
        var isServiceRunning = false
            private set

        fun start(context: Context) {
            val intent = Intent(context, EarbudForegroundService::class.java)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent)
            } else {
                context.startService(intent)
            }
        }

        fun stop(context: Context) {
            val intent = Intent(context, EarbudForegroundService::class.java)
            context.stopService(intent)
        }
    }

    private var isReceiverRegistered = false
    private val connectedDevices = mutableSetOf<String>()

    private val serviceReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            intent ?: return
            val action = intent.action ?: return
            if (!EarbudSecurityUtils.ALLOWED_BROADCAST_ACTIONS.contains(action)) {
                return
            }

            if (action == BluetoothDevice.ACTION_ACL_CONNECTED || action == BluetoothDevice.ACTION_ACL_DISCONNECTED) {
                val device: BluetoothDevice? = try {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                        intent.getParcelableExtra(BluetoothDevice.EXTRA_DEVICE, BluetoothDevice::class.java)
                    } else {
                        @Suppress("DEPRECATION")
                        intent.getParcelableExtra(BluetoothDevice.EXTRA_DEVICE)
                    }
                } catch (e: Exception) {
                    null
                }

                val cleanAddress = EarbudSecurityUtils.sanitizeMacAddress(device?.address)
                if (device != null && cleanAddress != null) {
                    val isConnected = (action == BluetoothDevice.ACTION_ACL_CONNECTED)

                    if (isConnected) {
                        connectedDevices.add(cleanAddress)
                    } else {
                        connectedDevices.remove(cleanAddress)
                    }

                    if (BuildConfig.DEBUG) {
                        val masked = EarbudSecurityUtils.maskMacAddress(cleanAddress)
                        Log.d(TAG, "Background ACL event: $masked connected=$isConnected (total connected: ${connectedDevices.size})")
                    }

                    // Update persistent notification text
                    updateNotification()

                    // Forward to EarbudNativeModule for JS bridge
                    EarbudNativeModule.instance?.handleDeviceConnectionEvent(device, isConnected)
                }
            } else if (action == BluetoothAdapter.ACTION_STATE_CHANGED) {
                val state = intent.getIntExtra(BluetoothAdapter.EXTRA_STATE, BluetoothAdapter.ERROR)
                val isEnabled = (state == BluetoothAdapter.STATE_ON)
                if (!isEnabled) {
                    connectedDevices.clear()
                    updateNotification()
                }
                EarbudNativeModule.instance?.handleBluetoothStateEvent(isEnabled)
            } else if (action == ACTION_BATTERY_LEVEL_CHANGED) {
                val device: BluetoothDevice? = try {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                        intent.getParcelableExtra(BluetoothDevice.EXTRA_DEVICE, BluetoothDevice::class.java)
                    } else {
                        @Suppress("DEPRECATION")
                        intent.getParcelableExtra(BluetoothDevice.EXTRA_DEVICE)
                    }
                } catch (e: Exception) {
                    null
                }
                val cleanAddress = EarbudSecurityUtils.sanitizeMacAddress(device?.address)
                val rawLevel = intent.getIntExtra(EXTRA_BATTERY_LEVEL, -1)
                val level = EarbudSecurityUtils.clampBattery(rawLevel)

                if (cleanAddress != null && level != null) {
                    EarbudNativeModule.batteryCache[cleanAddress] = level
                    EarbudNativeModule.instance?.handleBatteryLevelEvent(cleanAddress, level)
                }
            }
        }
    }

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
        registerServiceReceiver()
        isServiceRunning = true
        if (BuildConfig.DEBUG) Log.d(TAG, "EarbudForegroundService created")
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val notification = buildNotification()

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) { // Android 14+
            startForeground(
                NOTIFICATION_ID,
                notification,
                ServiceInfo.FOREGROUND_SERVICE_TYPE_CONNECTED_DEVICE
            )
        } else {
            startForeground(NOTIFICATION_ID, notification)
        }

        if (BuildConfig.DEBUG) Log.d(TAG, "EarbudForegroundService started in foreground")
        return START_STICKY
    }

    override fun onDestroy() {
        unregisterServiceReceiver()
        isServiceRunning = false
        if (BuildConfig.DEBUG) Log.d(TAG, "EarbudForegroundService destroyed")
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val name = "EarbudKit Device Monitor"
            val descriptionText = "Monitors Bluetooth audio devices in background"
            val importance = NotificationManager.IMPORTANCE_LOW
            val channel = NotificationChannel(CHANNEL_ID, name, importance).apply {
                description = descriptionText
                setShowBadge(false)
            }
            val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            notificationManager.createNotificationChannel(channel)
        }
    }

    private fun buildNotification(): Notification {
        val launchIntent = packageManager.getLaunchIntentForPackage(packageName)
        val pendingIntent = launchIntent?.let {
            val flags = PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            PendingIntent.getActivity(this, 0, it, flags)
        }

        val contentText = if (connectedDevices.isEmpty()) {
            "EarbudKit is watching your devices"
        } else {
            "EarbudKit: ${connectedDevices.size} audio device(s) connected"
        }

        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("EarbudKit")
            .setContentText(contentText)
            .setSmallIcon(android.R.drawable.stat_sys_data_bluetooth)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setContentIntent(pendingIntent)
            .build()
    }

    private fun updateNotification() {
        val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        notificationManager.notify(NOTIFICATION_ID, buildNotification())
    }

    private fun registerServiceReceiver() {
        if (isReceiverRegistered) return
        try {
            val filter = IntentFilter().apply {
                addAction(BluetoothDevice.ACTION_ACL_CONNECTED)
                addAction(BluetoothDevice.ACTION_ACL_DISCONNECTED)
                addAction(BluetoothAdapter.ACTION_STATE_CHANGED)
                addAction(ACTION_BATTERY_LEVEL_CHANGED)
            }

            ContextCompat.registerReceiver(
                this,
                serviceReceiver,
                filter,
                ContextCompat.RECEIVER_EXPORTED
            )
            isReceiverRegistered = true
            if (BuildConfig.DEBUG) Log.d(TAG, "Service background receiver registered")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to register service receiver", e)
        }
    }

    private fun unregisterServiceReceiver() {
        if (!isReceiverRegistered) return
        try {
            unregisterReceiver(serviceReceiver)
            isReceiverRegistered = false
        } catch (e: Exception) {
            Log.e(TAG, "Failed to unregister service receiver", e)
        }
    }
}
