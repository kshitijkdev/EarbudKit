import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
  Platform,
  Alert,
} from 'react-native';
import { useTheme } from '../../src/theme';
import { useBluetoothDevices } from '../../src/features/devices/useBluetoothDevices';
import {
  useDeviceStore,
  TrackedDevice,
  DeviceIconType,
  deduceDeviceIcon,
} from '../../src/store';
import { BondedDevice } from '../../modules/earbud-native';

export default function DevicesScreen() {
  const { theme } = useTheme();
  const { colors, borderRadius, typography } = theme;

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

  const trackedDevicesMap = useDeviceStore((s) => s.trackedDevices);
  const activeDeviceAddress = useDeviceStore((s) => s.activeDeviceAddress);
  const addTrackedDevice = useDeviceStore((s) => s.addTrackedDevice);
  const removeTrackedDevice = useDeviceStore((s) => s.removeTrackedDevice);
  const updateNickname = useDeviceStore((s) => s.updateNickname);
  const updateIcon = useDeviceStore((s) => s.updateIcon);
  const setActiveDevice = useDeviceStore((s) => s.setActiveDevice);

  const trackedDevices = Object.values(trackedDevicesMap);

  // Edit Modal State
  const [editingDevice, setEditingDevice] = useState<TrackedDevice | null>(null);
  const [editNickname, setEditNickname] = useState('');
  const [editIcon, setEditIcon] = useState<DeviceIconType>('earbuds');

  // Filter bonded devices that are not yet tracked
  const untrackedBonded = bondedDevices.filter(
    (b) => !trackedDevicesMap[b.address.toUpperCase()]
  );

  const openEditModal = (dev: TrackedDevice) => {
    setEditingDevice(dev);
    setEditNickname(dev.nickname);
    setEditIcon(dev.icon);
  };

  const saveEdit = () => {
    if (!editingDevice) return;
    updateNickname(editingDevice.address, editNickname);
    updateIcon(editingDevice.address, editIcon);
    setEditingDevice(null);
  };

  const confirmRemove = (dev: TrackedDevice) => {
    Alert.alert(
      'Remove Device',
      `Remove "${dev.nickname}" from EarbudKit? Settings for this device will be cleared.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => removeTrackedDevice(dev.address),
        },
      ]
    );
  };

  const handleAddTargetDevice = (preset: 'noise' | 'realme') => {
    if (preset === 'noise') {
      addTrackedDevice({
        name: 'Noise Buds Vector',
        address: '20:74:CF:89:12:01',
        nickname: 'Noise Buds Vector',
        icon: 'earbuds',
        isConnected: false,
      });
    } else {
      addTrackedDevice({
        name: 'realme TechLife Studio H1',
        address: 'D8:55:75:A4:77:88',
        nickname: 'realme Studio H1',
        icon: 'headphones',
        isConnected: false,
      });
    }
  };

  if (Platform.OS !== 'android') {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.card, { backgroundColor: colors.surfaceContainer, borderRadius: borderRadius.lg }]}>
          <Text style={styles.largeEmoji}>🍎</Text>
          <Text style={[styles.title, { color: colors.onSurface }]}>iOS Not Supported</Text>
          <Text style={[styles.subtitle, { color: colors.onSurfaceVariant }]}>
            EarbudKit requires Android Bluetooth APIs to discover bonded audio devices and listen for connection events.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.scrollContent}
    >
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
            🔔 Live: {lastEvent.name || lastEvent.address} is{' '}
            {lastEvent.connected ? 'CONNECTED' : 'DISCONNECTED'}
          </Text>
        </View>
      )}

      {/* Permission Warning */}
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
            ⚠️ Bluetooth permission required on Android 12+ to detect bonded devices.
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
              Open Settings
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* SECTION 1: Tracked Devices */}
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>
          Tracked Devices ({trackedDevices.length})
        </Text>
      </View>

      {trackedDevices.length === 0 ? (
        <View style={[styles.emptyCard, { backgroundColor: colors.surfaceContainer, borderRadius: borderRadius.lg }]}>
          <Text style={styles.largeEmoji}>🎧</Text>
          <Text style={[styles.emptyTitle, { color: colors.onSurface }]}>
            No Tracked Devices Yet
          </Text>
          <Text style={[styles.emptyDesc, { color: colors.onSurfaceVariant }]}>
            Add your paired headphones or earbuds below to configure profiles, battery alerts, and EQ.
          </Text>
          <View style={styles.presetButtonsRow}>
            <TouchableOpacity
              style={[styles.presetBtn, { backgroundColor: colors.primaryContainer, borderRadius: borderRadius.sm }]}
              onPress={() => handleAddTargetDevice('noise')}
            >
              <Text style={[styles.presetBtnText, { color: colors.onPrimaryContainer }]}>
                + Noise Buds Vector
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.presetBtn, { backgroundColor: colors.secondaryContainer, borderRadius: borderRadius.sm }]}
              onPress={() => handleAddTargetDevice('realme')}
            >
              <Text style={[styles.presetBtnText, { color: colors.onSecondaryContainer }]}>
                + realme Studio H1
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        trackedDevices.map((dev) => {
          const isActive = dev.address === activeDeviceAddress;
          return (
            <View
              key={dev.address}
              style={[
                styles.deviceCard,
                {
                  backgroundColor: colors.surfaceContainer,
                  borderRadius: borderRadius.lg,
                  borderColor: isActive ? colors.primary : colors.outlineVariant,
                  borderWidth: isActive ? 2 : 1,
                },
              ]}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.deviceIcon}>
                  {dev.icon === 'earbuds' ? '🎧' : '🎧'}
                </Text>
                <View style={styles.cardTitleArea}>
                  <View style={styles.nameRow}>
                    <Text style={[styles.cardTitle, { color: colors.onSurface }]}>
                      {dev.nickname}
                    </Text>
                    {isActive && (
                      <View style={[styles.activePill, { backgroundColor: colors.primaryContainer }]}>
                        <Text style={[styles.activePillText, { color: colors.onPrimaryContainer }]}>
                          ACTIVE
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.cardSubtitle, { color: colors.onSurfaceVariant }]}>
                    {dev.name !== dev.nickname ? `${dev.name} • ` : ''}{dev.address}
                  </Text>
                </View>

                {/* Connection Badge */}
                <View
                  style={[
                    styles.connBadge,
                    {
                      backgroundColor: dev.isConnected
                        ? colors.primaryContainer
                        : colors.surfaceVariant,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.connBadgeText,
                      {
                        color: dev.isConnected
                          ? colors.onPrimaryContainer
                          : colors.onSurfaceVariant,
                      },
                    ]}
                  >
                    {dev.isConnected ? 'Connected' : 'Offline'}
                  </Text>
                </View>
              </View>

              {/* Actions Row */}
              <View style={[styles.cardActions, { borderTopColor: colors.outlineVariant }]}>
                {!isActive && (
                  <TouchableOpacity
                    style={[styles.cardBtn, { backgroundColor: colors.surface }]}
                    onPress={() => setActiveDevice(dev.address)}
                  >
                    <Text style={[styles.cardBtnText, { color: colors.primary }]}>
                      ★ Set Active
                    </Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[styles.cardBtn, { backgroundColor: colors.surface }]}
                  onPress={() => openEditModal(dev)}
                >
                  <Text style={[styles.cardBtnText, { color: colors.onSurface }]}>
                    ✏️ Edit
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.cardBtn, { backgroundColor: colors.surface }]}
                  onPress={() => confirmRemove(dev)}
                >
                  <Text style={[styles.cardBtnText, { color: colors.error }]}>
                    🗑️ Remove
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })
      )}

      {/* SECTION 2: Available Bonded Devices */}
      <View style={[styles.sectionHeader, { marginTop: 24 }]}>
        <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>
          Paired Bluetooth Devices ({bondedDevices.length})
        </Text>
        <TouchableOpacity
          style={[styles.refreshBtn, { backgroundColor: colors.surfaceVariant, borderRadius: borderRadius.sm }]}
          onPress={refresh}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Text style={[styles.refreshText, { color: colors.primary }]}>🔄 Scan</Text>
          )}
        </TouchableOpacity>
      </View>

      {untrackedBonded.length === 0 ? (
        <View style={[styles.miniCard, { backgroundColor: colors.surfaceContainer, borderRadius: borderRadius.md }]}>
          <Text style={[styles.miniCardText, { color: colors.onSurfaceVariant }]}>
            {bondedDevices.length > 0
              ? 'All paired audio devices are currently tracked.'
              : 'No paired Bluetooth audio devices found on phone.'}
          </Text>
          <TouchableOpacity
            style={[styles.smallBtn, { backgroundColor: colors.primary, borderRadius: borderRadius.sm }]}
            onPress={openSettings}
          >
            <Text style={[styles.smallBtnText, { color: colors.onPrimary }]}>
              Pair New Device in Settings
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        untrackedBonded.map((item) => (
          <View
            key={item.address}
            style={[
              styles.bondedCard,
              {
                backgroundColor: colors.surfaceContainer,
                borderRadius: borderRadius.md,
                borderColor: colors.outlineVariant,
              },
            ]}
          >
            <View style={styles.bondedInfo}>
              <Text style={[styles.bondedName, { color: colors.onSurface }]}>
                {item.name || 'Unnamed Device'}
              </Text>
              <Text style={[styles.bondedAddress, { color: colors.onSurfaceVariant }]}>
                {item.address} • {item.isConnected ? 'Connected' : 'Disconnected'}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.trackBtn, { backgroundColor: colors.primary, borderRadius: borderRadius.sm }]}
              onPress={() =>
                addTrackedDevice({
                  name: item.name,
                  address: item.address,
                  isConnected: item.isConnected,
                })
              }
            >
              <Text style={[styles.trackBtnText, { color: colors.onPrimary }]}>
                + Track
              </Text>
            </TouchableOpacity>
          </View>
        ))
      )}

      {/* Quick Add Presets (Noise & realme) */}
      <View style={[styles.presetsSection, { backgroundColor: colors.surfaceContainer, borderRadius: borderRadius.lg }]}>
        <Text style={[styles.presetsTitle, { color: colors.onSurface }]}>
          Target Devices Quick Setup
        </Text>
        <Text style={[styles.presetsDesc, { color: colors.onSurfaceVariant }]}>
          Quickly add target devices to test multi-device profiles and offline settings:
        </Text>
        <View style={styles.presetButtonsRow}>
          <TouchableOpacity
            style={[styles.presetBtn, { backgroundColor: colors.primaryContainer, borderRadius: borderRadius.sm }]}
            onPress={() => handleAddTargetDevice('noise')}
          >
            <Text style={[styles.presetBtnText, { color: colors.onPrimaryContainer }]}>
              + Noise Buds Vector (TWS)
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.presetBtn, { backgroundColor: colors.secondaryContainer, borderRadius: borderRadius.sm }]}
            onPress={() => handleAddTargetDevice('realme')}
          >
            <Text style={[styles.presetBtnText, { color: colors.onSecondaryContainer }]}>
              + realme Studio H1 (Over-Ear)
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Edit Device Modal */}
      <Modal
        visible={editingDevice !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setEditingDevice(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface, borderRadius: borderRadius.xl }]}>
            <Text style={[styles.modalTitle, { color: colors.onSurface }]}>
              Edit Device
            </Text>
            <Text style={[styles.modalSubtitle, { color: colors.onSurfaceVariant }]}>
              {editingDevice?.address}
            </Text>

            {/* Nickname input */}
            <Text style={[styles.inputLabel, { color: colors.onSurface }]}>Nickname</Text>
            <TextInput
              style={[
                styles.textInput,
                {
                  backgroundColor: colors.surfaceContainer,
                  color: colors.onSurface,
                  borderColor: colors.outline,
                  borderRadius: borderRadius.sm,
                },
              ]}
              value={editNickname}
              onChangeText={setEditNickname}
              placeholder="e.g. My Gym Earbuds"
              placeholderTextColor={colors.outline}
            />

            {/* Icon selection */}
            <Text style={[styles.inputLabel, { color: colors.onSurface, marginTop: 16 }]}>
              Device Icon
            </Text>
            <View style={styles.iconSelectionRow}>
              <TouchableOpacity
                style={[
                  styles.iconChoice,
                  {
                    backgroundColor:
                      editIcon === 'earbuds'
                        ? colors.primaryContainer
                        : colors.surfaceContainer,
                    borderColor:
                      editIcon === 'earbuds' ? colors.primary : colors.outlineVariant,
                    borderRadius: borderRadius.md,
                  },
                ]}
                onPress={() => setEditIcon('earbuds')}
              >
                <Text style={styles.iconChoiceEmoji}>🎧</Text>
                <Text
                  style={[
                    styles.iconChoiceLabel,
                    {
                      color:
                        editIcon === 'earbuds'
                          ? colors.onPrimaryContainer
                          : colors.onSurface,
                    },
                  ]}
                >
                  Earbuds
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.iconChoice,
                  {
                    backgroundColor:
                      editIcon === 'headphones'
                        ? colors.primaryContainer
                        : colors.surfaceContainer,
                    borderColor:
                      editIcon === 'headphones' ? colors.primary : colors.outlineVariant,
                    borderRadius: borderRadius.md,
                  },
                ]}
                onPress={() => setEditIcon('headphones')}
              >
                <Text style={styles.iconChoiceEmoji}>🎧</Text>
                <Text
                  style={[
                    styles.iconChoiceLabel,
                    {
                      color:
                        editIcon === 'headphones'
                          ? colors.onPrimaryContainer
                          : colors.onSurface,
                    },
                  ]}
                >
                  Over-Ear
                </Text>
              </TouchableOpacity>
            </View>

            {/* Modal Actions */}
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: colors.surfaceVariant, borderRadius: borderRadius.sm }]}
                onPress={() => setEditingDevice(null)}
              >
                <Text style={[styles.modalBtnText, { color: colors.onSurfaceVariant }]}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: colors.primary, borderRadius: borderRadius.sm }]}
                onPress={saveEdit}
              >
                <Text style={[styles.modalBtnText, { color: colors.onPrimary }]}>
                  Save
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    padding: 24,
    alignItems: 'center',
    marginVertical: 16,
  },
  largeEmoji: {
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  refreshBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  refreshText: {
    fontSize: 13,
    fontWeight: '600',
  },
  emptyCard: {
    padding: 28,
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 6,
  },
  emptyDesc: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  presetButtonsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'center',
  },
  presetBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  presetBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  deviceCard: {
    marginBottom: 12,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  deviceIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  cardTitleArea: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  activePill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  activePillText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  cardSubtitle: {
    fontSize: 12,
  },
  connBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  connBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  cardActions: {
    flexDirection: 'row',
    borderTopWidth: 0.5,
    paddingHorizontal: 8,
    paddingVertical: 6,
    gap: 8,
  },
  cardBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  cardBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  bondedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
  },
  bondedInfo: {
    flex: 1,
  },
  bondedName: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  bondedAddress: {
    fontSize: 12,
  },
  trackBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  trackBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  miniCard: {
    padding: 16,
    alignItems: 'center',
    gap: 10,
  },
  miniCardText: {
    fontSize: 13,
    textAlign: 'center',
  },
  smallBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  smallBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  presetsSection: {
    marginTop: 20,
    padding: 16,
    gap: 8,
  },
  presetsTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  presetsDesc: {
    fontSize: 13,
    lineHeight: 18,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    padding: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 12,
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
  },
  textInput: {
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  iconSelectionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 6,
  },
  iconChoice: {
    flex: 1,
    alignItems: 'center',
    padding: 14,
    borderWidth: 1.5,
  },
  iconChoiceEmoji: {
    fontSize: 28,
    marginBottom: 4,
  },
  iconChoiceLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
    justifyContent: 'flex-end',
  },
  modalBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  modalBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
