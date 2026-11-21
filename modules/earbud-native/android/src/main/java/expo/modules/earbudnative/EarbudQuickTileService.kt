package expo.modules.earbudnative

import android.app.PendingIntent
import android.content.Intent
import android.os.Build
import android.service.quicksettings.Tile
import android.service.quicksettings.TileService
import android.util.Log

/**
 * Stage 10: Quick Settings Tile for EarbudKit
 * Allows quick app opening and viewing connection status directly from Android notification shade.
 */
class EarbudQuickTileService : TileService() {

    companion object {
        private const val TAG = "EarbudQuickTile"
    }

    override fun onStartListening() {
        super.onStartListening()
        updateTileState()
    }

    override fun onClick() {
        super.onClick()
        if (BuildConfig.DEBUG) Log.d(TAG, "Quick Settings tile clicked")

        try {
            val launchIntent = packageManager.getLaunchIntentForPackage(packageName)
            if (launchIntent != null) {
                launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) { // Android 14+
                    val pendingIntent = PendingIntent.getActivity(
                        this,
                        0,
                        launchIntent,
                        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                    )
                    startActivityAndCollapse(pendingIntent)
                } else {
                    @Suppress("DEPRECATION")
                    startActivityAndCollapse(launchIntent)
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to launch app from tile", e)
        }

        updateTileState()
    }

    private fun updateTileState() {
        try {
            val tile = qsTile ?: return
            tile.label = "EarbudKit"
            tile.state = Tile.STATE_ACTIVE
            tile.updateTile()
        } catch (e: Exception) {
            Log.w(TAG, "Error updating QS tile: ${e.message}")
        }
    }
}
