import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useTheme } from '../../src/theme';
import { useBluetoothDevices } from '../../src/features/devices/useBluetoothDevices';
import { BondedDevice } from '../../modules/earbud-native';

export default function DevicesScreen() {
  const { theme } = useTheme();
  const { colors, borderRadius } = theme;
  const {
    bondedDevices,
    isLoading,
    permissionGranted,
    bluetoothEnabled,
    lastEvent,
    refresh,
    requestPermission,
    openSettings,
  } = useBluetoothDevices();

  if (Platform.OS !== 'android') {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.card, { backgroundColor: colors.surfaceContainer, borderRadius: borderRadius.lg }]}>
          <Text style={styles.emoji}>🍎</Text>
          <Text style={[styles.title, { color: colors.onSurface }]}>iOS Not Supported</Text>
          <Text style={[styles.subtitle, { color: colors.onSurfaceVariant }]}>
            EarbudKit requires Android Bluetooth APIs to discover bonded audio devices and listen for connection events.
          </Text>
        </View>
      </View>
    );
  }

  const renderDevice = ({ item }: { item: BondedDevice }) => {
    return (
      <View
        style={[
          styles.deviceCard,
          {
            backgroundColor: colors.surfaceContainer,
            borderRadius: borderRadius.md,
            borderColor: item.isConnected ? colors.primary : colors.outlineVariant,
            borderWidth: item.isConnected ? 2 : 1,
          },
        ]}
      >
        <View style={styles.deviceRow}>
          <Text style={styles.deviceIcon}>{item.isConnected ? '🎧' : '🔈'}</Text>
          <View style={styles.deviceInfo}>
            <Text style={[styles.deviceName, { color: colors.onSurface }]}>
              {item.name || 'Unnamed Device'}
            </Text>
            <Text style={[styles.deviceAddress, { color: colors.onSurfaceVariant }]}>
              {item.address}
            </Text>
          </View>
          <View
            style={[
              styles.badge,
              {
                backgroundColor: item.isConnected
                  ? colors.primaryContainer
                  : colors.surfaceVariant,
              },
            ]}
          >
            <Text
              style={[
                styles.badgeText,
                {
                  color: item.isConnected
                    ? colors.onPrimaryContainer
                    : colors.onSurfaceVariant,
                },
              ]}
            >
              {item.isConnected ? 'Connected' : 'Disconnected'}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Live Event Banner */}
      {lastEvent && (
        <View
          style={[
            styles.banner,
            {
              backgroundColor: lastEvent.connected
                ? colors.primaryContainer
                : colors.surfaceVariant,
              borderRadius: borderRadius.md,
            },
          ]}
        >
          <Text
            style={[
              styles.bannerText,
              {
                color: lastEvent.connected
                  ? colors.onPrimaryContainer
                  : colors.onSurfaceVariant,
              },
            ]}
          >
            🔔 Live Event: {lastEvent.name || lastEvent.address} is now{' '}
            {lastEvent.connected ? 'CONNECTED' : 'DISCONNECTED'}
          </Text>
        </View>
      )}

      {/* Permission Missing Warning */}
      {!permissionGranted && (
        <View
          style={[
            styles.banner,
            {
              backgroundColor: colors.errorContainer,
              borderRadius: borderRadius.md,
            },
          ]}
        >
          <Text style={[styles.bannerText, { color: colors.onError }]}>
            ⚠️ Bluetooth permission required on Android 12+ to read devices and connection state.
          </Text>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.primary, borderRadius: borderRadius.sm }]}
            onPress={requestPermission}
          >
            <Text style={[styles.actionBtnText, { color: colors.onPrimary }]}>
              Grant Permission
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Bluetooth Disabled Warning */}
      {permissionGranted && !bluetoothEnabled && (
        <View
          style={[
            styles.banner,
            {
              backgroundColor: colors.surfaceVariant,
              borderRadius: borderRadius.md,
            },
          ]}
        >
          <Text style={[styles.bannerText, { color: colors.onSurfaceVariant }]}>
            ℹ️ Bluetooth is currently turned OFF.
          </Text>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.secondary, borderRadius: borderRadius.sm }]}
            onPress={openSettings}
          >
            <Text style={[styles.actionBtnText, { color: colors.onSecondary }]}>
              Open Bluetooth Settings
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Device List Header */}
      <View style={styles.headerRow}>
        <Text style={[styles.headerTitle, { color: colors.onSurface }]}>
          Bonded Audio Devices ({bondedDevices.length})
        </Text>
        <TouchableOpacity
          style={[styles.refreshBtn, { backgroundColor: colors.surfaceVariant, borderRadius: borderRadius.sm }]}
          onPress={refresh}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Text style={[styles.refreshText, { color: colors.primary }]}>🔄 Refresh</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Device List */}
      <FlatList
        data={bondedDevices}
        keyExtractor={(item) => item.address}
        renderItem={renderDevice}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={[styles.emptyCard, { backgroundColor: colors.surfaceContainer, borderRadius: borderRadius.lg }]}>
            <Text style={styles.emoji}>🎧</Text>
            <Text style={[styles.title, { color: colors.onSurface }]}>
              {permissionGranted ? 'No Bonded Audio Devices' : 'Permission Required'}
            </Text>
            <Text style={[styles.subtitle, { color: colors.onSurfaceVariant }]}>
              {permissionGranted
                ? 'Pair your headphones or earbuds in Android Bluetooth settings first, then pull to refresh.'
                : 'Grant Bluetooth permission above to detect paired audio devices.'}
            </Text>
            {permissionGranted && (
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: colors.primary, borderRadius: borderRadius.sm, marginTop: 12 }]}
                onPress={openSettings}
              >
                <Text style={[styles.actionBtnText, { color: colors.onPrimary }]}>
                  Pair in Bluetooth Settings
                </Text>
              </TouchableOpacity>
            )}
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  card: {
    padding: 24,
    alignItems: 'center',
    marginVertical: 16,
  },
  emoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  banner: {
    padding: 14,
    marginBottom: 12,
    gap: 8,
  },
  bannerText: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 18,
  },
  actionBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignSelf: 'flex-start',
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 12,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  refreshBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  refreshText: {
    fontSize: 13,
    fontWeight: '600',
  },
  listContent: {
    paddingBottom: 24,
    gap: 10,
  },
  deviceCard: {
    padding: 14,
    marginBottom: 8,
  },
  deviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deviceIcon: {
    fontSize: 28,
    marginRight: 12,
  },
  deviceInfo: {
    flex: 1,
  },
  deviceName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  deviceAddress: {
    fontSize: 12,
    fontFamily: Platform.OS === 'android' ? 'monospace' : 'Courier',
  },
  badge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  emptyCard: {
    padding: 32,
    alignItems: 'center',
    marginTop: 20,
  },
});
