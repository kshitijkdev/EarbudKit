import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Platform,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/theme';
import { useBluetoothDevices } from '../../src/features/devices/useBluetoothDevices';
import {
  useDeviceStore,
  TrackedDevice,
  DeviceIconType,
} from '../../src/store';
import { FeedbackToast } from '../../src/components/FeedbackToast';
import {
  GlassCard,
  PillButton,
  StatusChip,
  ButtonRow,
  EmptyState,
} from '../../src/components/ui';

export default function DevicesScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { colors, fonts, borderRadius } = theme;

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => setToastMessage(msg);

  const {
    bondedDevices,
    isLoading,
    permissionGranted,
    bluetoothEnabled,
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
  const setLowBatteryThreshold = useDeviceStore((s) => s.setLowBatteryThreshold);
  const triggerTestLowBatteryAlert = useDeviceStore((s) => s.triggerTestLowBatteryAlert);

  const trackedDevices = Object.values(trackedDevicesMap);

  // Edit Modal State
  const [editingDevice, setEditingDevice] = useState<TrackedDevice | null>(null);
  const [editNickname, setEditNickname] = useState('');
  const [editIcon, setEditIcon] = useState<DeviceIconType>('earbuds');
  const [editThreshold, setEditThreshold] = useState(20);
  const [isTestingAlert, setIsTestingAlert] = useState(false);

  // Filter bonded devices that are not yet tracked
  const untrackedBonded = bondedDevices.filter(
    (b) => !trackedDevicesMap[b.address.toUpperCase()]
  );

  const openEditModal = (dev: TrackedDevice) => {
    setEditingDevice(dev);
    setEditNickname(dev.nickname);
    setEditIcon(dev.icon);
    setEditThreshold(dev.lowBatteryThreshold || 20);
  };

  const saveEdit = () => {
    if (!editingDevice) return;
    updateNickname(editingDevice.address, editNickname);
    updateIcon(editingDevice.address, editIcon);
    setLowBatteryThreshold(editingDevice.address, editThreshold);
    showToast(`Saved settings for ${editNickname || editingDevice.nickname}`);
    setEditingDevice(null);
  };

  const handleTestAlert = async () => {
    if (!editingDevice) return;
    setIsTestingAlert(true);
    try {
      const sent = await triggerTestLowBatteryAlert(editingDevice.address);
      if (sent) {
        Alert.alert('Alert Sent', `Test low battery alert dispatched for ${editingDevice.nickname}!`);
      } else {
        Alert.alert('Notice', 'Ensure notification permission is granted in Android system settings.');
      }
    } finally {
      setIsTestingAlert(false);
    }
  };

  const confirmRemove = (dev: TrackedDevice) => {
    Alert.alert(
      'Remove Device',
      `Remove "${dev.nickname}" from EarbudKit? Profiles and settings will be deleted.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            removeTrackedDevice(dev.address);
            showToast(`Removed ${dev.nickname}`);
          },
        },
      ]
    );
  };



  if (Platform.OS !== 'android') {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, padding: 16 }]}>
        <GlassCard style={{ padding: 24, alignItems: 'center' }}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.primary} />
          <Text style={[styles.emptyTitle, { color: colors.onSurface, fontFamily: fonts.headline }]}>
            Not supported on iOS
          </Text>
          <Text style={[styles.emptySubtitle, { color: colors.onSurfaceVariant, fontFamily: fonts.body }]}>
            Bluetooth management is designed for Android using standard APIs.
          </Text>
        </GlassCard>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FeedbackToast message={toastMessage} onDismiss={() => setToastMessage(null)} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: insets.top + 12,
            paddingBottom: insets.bottom + 90,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Editorial Section Title with Live Count Badge */}
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <Text style={[styles.screenTitle, { color: colors.onSurface, fontFamily: fonts.display }]}>
              Devices
            </Text>
            <View
              style={[
                styles.countBadge,
                {
                  backgroundColor: colors.surfaceContainerHighest,
                },
              ]}
            >
              <Text style={[styles.countBadgeText, { color: colors.onSurfaceVariant, fontFamily: fonts.label }]}>
                {trackedDevices.length} Saved
              </Text>
            </View>
          </View>

          <View style={styles.headerActions}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={refresh}
              style={[
                styles.iconBtn,
                {
                  backgroundColor: colors.surfaceContainerHigh,
                  borderColor: colors.hairline,
                },
              ]}
            >
              <Ionicons name="sync" size={18} color={colors.onSurface} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Contextual Android 12+ Permission Banner */}
        {!permissionGranted && (
          <View
            style={[
              styles.permissionCard,
              {
                backgroundColor: colors.primaryContainer,
                borderColor: colors.hairline,
                borderRadius: borderRadius.lg,
              },
            ]}
          >
            <View style={styles.permissionContent}>
              <View
                style={[
                  styles.permissionIconBadge,
                  {
                    backgroundColor: colors.surfaceContainerHigh,
                  },
                ]}
              >
                <Ionicons name="bluetooth" size={22} color={colors.primary} />
              </View>

              <View style={styles.permissionTextCol}>
                <View style={styles.permissionTitleRow}>
                  <Text style={[styles.permissionTitle, { color: colors.onSurface, fontFamily: fonts.headline }]}>
                    Nearby Devices Permission
                  </Text>
                  <View style={[styles.requiredBadge, { backgroundColor: 'rgba(250, 45, 72, 0.15)' }]}>
                    <Text style={[styles.permissionReqText, { color: colors.primary, fontFamily: fonts.label }]}>
                      REQUIRED
                    </Text>
                  </View>
                </View>
                <Text style={[styles.permissionBody, { color: colors.onSurfaceVariant, fontFamily: fonts.body }]}>
                  Android requires active scanning permissions to read live battery levels and acoustic telemetry directly from bonded accessories.
                </Text>
              </View>
            </View>

            <ButtonRow gap={10} align="start" style={{ marginTop: 14 }}>
              <PillButton
                label="Grant Bluetooth Access"
                onPress={requestPermission}
                size="sm"
                variant="primary"
              />
              <PillButton
                label="App Settings"
                onPress={openSettings}
                size="sm"
                variant="secondary"
              />
            </ButtonRow>
          </View>
        )}

        {/* Tracked Hardware List */}
        <View style={styles.sectionBlock}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionCaption, { color: colors.onSurfaceVariant, fontFamily: fonts.label }]}>
              TRACKED HARDWARE
            </Text>
            <Text style={[styles.autoSyncText, { color: colors.primary, fontFamily: fonts.label }]}>
              Auto-Sync On
            </Text>
          </View>

          <View
            style={[
              styles.groupedCard,
              {
                backgroundColor: colors.surfaceContainer,
                borderColor: colors.hairline,
                borderRadius: borderRadius.lg,
              },
            ]}
          >
            {trackedDevices.length === 0 ? (
              <EmptyState
                icon={<Ionicons name="headset-outline" size={44} color={colors.outline} />}
                title="No Tracked Devices Yet"
                description="Scan paired Bluetooth devices below or connect an audio accessory."
                actionPrimary={
                  <PillButton
                    label="Scan Devices"
                    size="sm"
                    variant="primary"
                    onPress={refresh}
                  />
                }
                actionSecondary={
                  <PillButton
                    label="Bluetooth Settings"
                    size="sm"
                    variant="secondary"
                    onPress={openSettings}
                  />
                }
              />
            ) : (
              trackedDevices.map((dev, idx) => {
                const isSelected = dev.address === activeDeviceAddress;
                const isLast = idx === trackedDevices.length - 1;

                return (
                  <View key={dev.address}>
                    <TouchableOpacity
                      activeOpacity={0.75}
                      onPress={() => {
                        setActiveDevice(dev.address);
                        showToast(`Active device set to ${dev.nickname}`);
                      }}
                      style={[
                        styles.deviceRow,
                        {
                          backgroundColor: isSelected ? colors.primaryContainer : 'transparent',
                        },
                      ]}
                    >
                      <View style={styles.deviceRowLeft}>
                        {/* Device Avatar */}
                        <View
                          style={[
                            styles.deviceAvatar,
                            {
                              backgroundColor: colors.surfaceContainerHigh,
                              borderColor: colors.hairline,
                            },
                          ]}
                        >
                          <Ionicons
                            name={dev.icon === 'headphones' ? 'headset' : 'headset-outline'}
                            size={26}
                            color={isSelected ? colors.primary : colors.onSurface}
                          />
                          {dev.isConnected && <View style={styles.activeDot} />}
                        </View>

                        <View style={styles.deviceInfoCol}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Text
                              numberOfLines={1}
                              style={[styles.deviceName, { color: colors.onSurface, fontFamily: fonts.headline }]}
                            >
                              {dev.nickname}
                            </Text>
                            <View
                              style={[
                                styles.statusPill,
                                {
                                  backgroundColor: dev.isConnected
                                    ? 'rgba(52, 199, 89, 0.16)'
                                    : colors.surfaceContainerHighest,
                                },
                              ]}
                            >
                              <Text
                                numberOfLines={1}
                                style={[
                                  styles.statusPillText,
                                  {
                                    color: dev.isConnected ? '#34C759' : colors.onSurfaceVariant,
                                    fontFamily: fonts.label,
                                  },
                                ]}
                              >
                                {dev.isConnected ? 'Active' : 'Standby'}
                              </Text>
                            </View>
                          </View>

                          <Text numberOfLines={1} style={[styles.deviceMac, { color: colors.onSurfaceVariant, fontFamily: fonts.body }]}>
                            {dev.address}
                          </Text>

                          {/* Battery Bar Readout */}
                          <View style={styles.batteryProgressRow}>
                            <View
                              style={[
                                styles.batteryTrack,
                                {
                                  backgroundColor: colors.surfaceContainerHighest,
                                },
                              ]}
                            >
                              <View
                                style={[
                                  styles.batteryFill,
                                  {
                                    width: `${dev.batteryLevel !== null ? Math.min(dev.batteryLevel, 100) : 0}%`,
                                    backgroundColor:
                                      dev.batteryLevel !== null && dev.batteryLevel <= dev.lowBatteryThreshold
                                        ? colors.error
                                        : '#34C759',
                                  },
                                ]}
                              />
                            </View>
                            <Text numberOfLines={1} style={[styles.batteryPercentText, { color: colors.onSurface, fontFamily: fonts.label }]}>
                              {dev.batteryLevel !== null ? `${dev.batteryLevel}%` : 'Unavailable'}
                            </Text>
                          </View>
                        </View>
                      </View>

                      {/* Row Action Buttons */}
                      <View style={styles.deviceRowActions}>
                        <TouchableOpacity
                          activeOpacity={0.7}
                          onPress={() => openEditModal(dev)}
                          style={[
                            styles.rowActionBtn,
                            {
                              backgroundColor: colors.surfaceContainerHigh,
                              borderColor: colors.hairline,
                            },
                          ]}
                        >
                          <Ionicons name="pencil-outline" size={16} color={colors.onSurface} />
                        </TouchableOpacity>

                        <TouchableOpacity
                          activeOpacity={0.7}
                          onPress={() => confirmRemove(dev)}
                          style={[
                            styles.rowActionBtn,
                            {
                              backgroundColor: colors.surfaceContainerHigh,
                              borderColor: colors.hairline,
                            },
                          ]}
                        >
                          <Ionicons name="trash-outline" size={16} color={colors.error} />
                        </TouchableOpacity>
                      </View>
                    </TouchableOpacity>

                    {!isLast && (
                      <View
                        style={[
                          styles.divider,
                          {
                            backgroundColor: colors.hairline,
                          },
                        ]}
                      />
                    )}
                  </View>
                );
              })
            )}
          </View>
        </View>

        {/* Radar Scanning Module */}
        <View
          style={[
            styles.radarCard,
            {
              backgroundColor: colors.surfaceContainer,
              borderColor: colors.hairline,
              borderRadius: borderRadius.lg,
            },
          ]}
        >
          <View style={styles.radarCardTop}>
            <View style={styles.radarLeft}>
              <View
                style={[
                  styles.radarIconCircle,
                  {
                    backgroundColor: colors.primaryContainer,
                  },
                ]}
              >
                <Ionicons name="scan-outline" size={22} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.radarTitle, { color: colors.onSurface, fontFamily: fonts.headline }]}>
                  Scanning for hardware...
                </Text>
                <Text style={[styles.radarSubtitle, { color: colors.onSurfaceVariant, fontFamily: fonts.body }]}>
                  {bluetoothEnabled ? 'Discovering paired Bluetooth accessories' : 'Bluetooth radio disabled'}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={refresh}
              style={[
                styles.refreshBtn,
                {
                  backgroundColor: colors.surfaceContainerHigh,
                  borderColor: colors.hairline,
                },
              ]}
            >
              <Text numberOfLines={1} style={[styles.refreshBtnText, { color: colors.primary, fontFamily: fonts.label }]}>
                Refresh
              </Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.radarDivider, { backgroundColor: colors.hairline }]} />

          <View style={styles.radarCardBottom}>
            <Text style={[styles.unbondedText, { color: colors.onSurfaceVariant, fontFamily: fonts.body }]}>
              Need to pair a new device?
            </Text>
            <TouchableOpacity activeOpacity={0.7} onPress={openSettings} style={styles.settingsLink}>
              <Text numberOfLines={1} style={[styles.settingsLinkText, { color: colors.primary, fontFamily: fonts.label }]}>
                Bluetooth Settings
              </Text>
              <Ionicons name="arrow-forward" size={14} color={colors.primary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Discovered Paired Devices List */}
        {untrackedBonded.length > 0 && (
          <View style={styles.sectionBlock}>
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.sectionCaption, { color: colors.onSurfaceVariant, fontFamily: fonts.label }]}>
                DISCOVERED NEARBY HARDWARE
              </Text>
              <Text style={[styles.autoSyncText, { color: colors.onSurfaceVariant, fontFamily: fonts.label }]}>
                {untrackedBonded.length} Detected
              </Text>
            </View>

            <View
              style={[
                styles.groupedCard,
                {
                  backgroundColor: colors.surfaceContainer,
                  borderColor: colors.hairline,
                  borderRadius: borderRadius.lg,
                },
              ]}
            >
              {untrackedBonded.map((b, idx) => {
                const isLast = idx === untrackedBonded.length - 1;
                return (
                  <View key={b.address}>
                    <View style={styles.discoveredRow}>
                      <View style={styles.discoveredInfo}>
                        <View
                          style={[
                            styles.discoveredAvatar,
                            {
                              backgroundColor: colors.surfaceContainerHigh,
                              borderColor: colors.hairline,
                            },
                          ]}
                        >
                          <Ionicons name="headset-outline" size={20} color={colors.onSurface} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text
                            numberOfLines={1}
                            style={[styles.discoveredName, { color: colors.onSurface, fontFamily: fonts.headline }]}
                          >
                            {b.name || 'Unknown Audio'}
                          </Text>
                          <Text style={[styles.discoveredMac, { color: colors.onSurfaceVariant, fontFamily: fonts.body }]}>
                            {b.address}
                          </Text>
                        </View>
                      </View>

                      <TouchableOpacity
                        activeOpacity={0.85}
                        onPress={() => {
                          addTrackedDevice({
                            name: b.name || 'Bluetooth Device',
                            address: b.address,
                            nickname: b.name || 'Bluetooth Device',
                            icon: 'earbuds',
                            isConnected: b.isConnected,
                            batteryLevel: b.batteryLevel,
                          });
                          showToast(`Tracked ${b.name}`);
                        }}
                        style={[
                          styles.trackBtn,
                          {
                            backgroundColor: colors.primary,
                          },
                        ]}
                      >
                        <Ionicons name="add" size={16} color={colors.onPrimary} style={{ marginRight: 2 }} />
                        <Text numberOfLines={1} style={[styles.trackBtnText, { color: colors.onPrimary, fontFamily: fonts.label }]}>
                          Track
                        </Text>
                      </TouchableOpacity>
                    </View>
                    {!isLast && <View style={[styles.divider, { backgroundColor: colors.hairline }]} />}
                  </View>
                );
              })}
            </View>
          </View>
        )}


      </ScrollView>

      {/* Edit Modal Sheet */}
      <Modal
        visible={editingDevice !== null}
        animationType="slide"
        transparent
        onRequestClose={() => setEditingDevice(null)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalSheet,
              {
                backgroundColor: colors.surfaceContainer,
                borderColor: colors.hairline,
                borderRadius: borderRadius.lg,
                paddingBottom: insets.bottom + 20,
              },
            ]}
          >
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="options-outline" size={20} color={colors.primary} />
                <Text style={[styles.modalTitle, { color: colors.onSurface, fontFamily: fonts.headline }]}>
                  Configure Hardware Profile
                </Text>
              </View>
              <TouchableOpacity activeOpacity={0.7} onPress={() => setEditingDevice(null)}>
                <Ionicons name="close" size={22} color={colors.onSurfaceVariant} />
              </TouchableOpacity>
            </View>

            {/* Field 1: Nickname Input */}
            <View style={styles.modalField}>
              <Text style={[styles.fieldLabel, { color: colors.onSurfaceVariant, fontFamily: fonts.label }]}>
                DEVICE NICKNAME
              </Text>
              <View
                style={[
                  styles.inputContainer,
                  {
                    backgroundColor: colors.surfaceContainerHigh,
                    borderColor: colors.hairline,
                  },
                ]}
              >
                <TextInput
                  value={editNickname}
                  onChangeText={setEditNickname}
                  placeholder="Enter device nickname"
                  placeholderTextColor={colors.outline}
                  style={[styles.textInput, { color: colors.onSurface, fontFamily: fonts.body }]}
                />
                <Ionicons name="pencil-outline" size={18} color={colors.onSurfaceVariant} />
              </View>
            </View>

            {/* Field 2: Segmented Form Factor Glyph Picker */}
            <View style={styles.modalField}>
              <Text style={[styles.fieldLabel, { color: colors.onSurfaceVariant, fontFamily: fonts.label }]}>
                FORM FACTOR GLYPH
              </Text>
              <View
                style={[
                  styles.segmentedWell,
                  {
                    backgroundColor: colors.surfaceContainerHigh,
                    borderColor: colors.hairline,
                  },
                ]}
              >
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => setEditIcon('earbuds')}
                  style={[
                    styles.segmentBtn,
                    {
                      backgroundColor: editIcon === 'earbuds' ? colors.primaryContainer : 'transparent',
                    },
                  ]}
                >
                  <Ionicons
                    name="headset-outline"
                    size={18}
                    color={editIcon === 'earbuds' ? colors.primary : colors.onSurfaceVariant}
                    style={{ marginRight: 6 }}
                  />
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.segmentText,
                      {
                        color: editIcon === 'earbuds' ? colors.primary : colors.onSurfaceVariant,
                        fontFamily: fonts.label,
                      },
                    ]}
                  >
                    Earbuds
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => setEditIcon('headphones')}
                  style={[
                    styles.segmentBtn,
                    {
                      backgroundColor: editIcon === 'headphones' ? colors.primaryContainer : 'transparent',
                    },
                  ]}
                >
                  <Ionicons
                    name="headset"
                    size={18}
                    color={editIcon === 'headphones' ? colors.primary : colors.onSurfaceVariant}
                    style={{ marginRight: 6 }}
                  />
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.segmentText,
                      {
                        color: editIcon === 'headphones' ? colors.primary : colors.onSurfaceVariant,
                        fontFamily: fonts.label,
                      },
                    ]}
                  >
                    Headphones
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Field 3: Low-battery Threshold Selector */}
            <View style={styles.modalField}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                <Text style={[styles.fieldLabel, { color: colors.onSurfaceVariant, fontFamily: fonts.label }]}>
                  LOW BATTERY ALERT THRESHOLD
                </Text>
                <Text style={[styles.thresholdValText, { color: colors.primary, fontFamily: fonts.label }]}>
                  {editThreshold}% Threshold
                </Text>
              </View>
              <View style={styles.thresholdGrid}>
                {[10, 20, 30].map((val) => (
                  <TouchableOpacity
                    key={val}
                    activeOpacity={0.8}
                    onPress={() => setEditThreshold(val)}
                    style={[
                      styles.threshBtn,
                      {
                        backgroundColor: editThreshold === val ? colors.primary : colors.surfaceContainerHigh,
                        borderColor: colors.hairline,
                      },
                    ]}
                  >
                    <Text
                      numberOfLines={1}
                      style={[
                        styles.threshBtnText,
                        {
                          color: editThreshold === val ? colors.onPrimary : colors.onSurface,
                          fontFamily: fonts.label,
                        },
                      ]}
                    >
                      {val}% {val === 20 ? '(Default)' : ''}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Test Alert Button */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleTestAlert}
              disabled={isTestingAlert}
              style={[
                styles.testAlertBtn,
                {
                  backgroundColor: colors.surfaceContainerHigh,
                  borderColor: colors.hairline,
                },
              ]}
            >
              <Ionicons name="notifications-outline" size={18} color={colors.primary} style={{ marginRight: 6 }} />
              <Text numberOfLines={1} style={[styles.testAlertText, { color: colors.onSurface, fontFamily: fonts.label }]}>
                {isTestingAlert ? 'Sending Alert...' : 'Test Low Battery Notification'}
              </Text>
            </TouchableOpacity>

            {/* Modal Actions */}
            <ButtonRow gap={10} equal style={{ marginTop: 20 }}>
              <PillButton
                label="Discard"
                variant="secondary"
                onPress={() => setEditingDevice(null)}
              />
              <PillButton
                label="Save Changes"
                variant="primary"
                onPress={saveEdit}
              />
            </ButtonRow>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  screenTitle: {
    fontSize: 34,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  countBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 9999,
  },
  countBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  headerActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  iconBtn: {
    minWidth: 48,
    minHeight: 48,
    borderRadius: 24,
    borderWidth: 0.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  permissionCard: {
    padding: 16,
    borderWidth: 0.5,
    marginBottom: 20,
  },
  permissionContent: {
    flexDirection: 'row',
    gap: 12,
  },
  permissionIconBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  permissionTextCol: {
    flex: 1,
  },
  permissionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 6,
  },
  permissionTitle: {
    fontSize: 16,
    fontWeight: '700',
    flexShrink: 1,
  },
  requiredBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 6,
  },
  permissionReqText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  permissionBody: {
    fontSize: 13,
    lineHeight: 18,
  },
  permissionActionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 14,
  },
  grantBtn: {
    height: 40,
    paddingHorizontal: 16,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  grantBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  settingsBtn: {
    height: 40,
    paddingHorizontal: 16,
    borderRadius: 9999,
    borderWidth: 0.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  sectionBlock: {
    marginBottom: 20,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  sectionCaption: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  autoSyncText: {
    fontSize: 12,
    fontWeight: '600',
  },
  groupedCard: {
    borderWidth: 0.5,
    overflow: 'hidden',
  },
  deviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
  },
  deviceRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  deviceAvatar: {
    width: 48,
    height: 48,
    borderRadius: 14,
    borderWidth: 0.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    position: 'relative',
  },
  activeDot: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#34C759',
  },
  deviceInfoCol: {
    flex: 1,
  },
  deviceName: {
    fontSize: 16,
    fontWeight: '600',
    maxWidth: 140,
  },
  statusPill: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 9999,
  },
  statusPillText: {
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  deviceMac: {
    fontSize: 12,
    marginTop: 1,
  },
  batteryProgressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 8,
  },
  batteryTrack: {
    flex: 1,
    maxWidth: 90,
    height: 5,
    borderRadius: 9999,
    overflow: 'hidden',
  },
  batteryFill: {
    height: '100%',
    borderRadius: 9999,
  },
  batteryPercentText: {
    fontSize: 11,
    fontWeight: '600',
  },
  deviceRowActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  rowActionBtn: {
    minWidth: 48,
    minHeight: 48,
    borderRadius: 24,
    borderWidth: 0.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: {
    height: 0.5,
    marginLeft: 74,
  },
  radarCard: {
    padding: 16,
    borderWidth: 0.5,
    marginBottom: 20,
  },
  radarCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  radarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  radarIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  radarTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  radarSubtitle: {
    fontSize: 12,
    marginTop: 1,
  },
  refreshBtn: {
    minHeight: 48,
    paddingHorizontal: 16,
    borderRadius: 9999,
    borderWidth: 0.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  refreshBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  radarDivider: {
    height: 0.5,
    marginVertical: 12,
  },
  radarCardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  unbondedText: {
    fontSize: 12,
  },
  settingsLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  settingsLinkText: {
    fontSize: 12,
    fontWeight: '600',
  },
  discoveredRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
  },
  discoveredInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  discoveredAvatar: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 0.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  discoveredName: {
    fontSize: 15,
    fontWeight: '600',
  },
  discoveredMac: {
    fontSize: 12,
    marginTop: 1,
  },
  trackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48,
    paddingHorizontal: 16,
    borderRadius: 9999,
  },
  trackBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  presetsShelf: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingVertical: 2,
  },
  presetPill: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 38,
    paddingHorizontal: 14,
    borderRadius: 9999,
    borderWidth: 0.5,
  },
  presetText: {
    fontSize: 13,
    fontWeight: '600',
  },
  emptyContainer: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyGroupTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 8,
  },
  emptyGroupSubtitle: {
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 0.5,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  modalField: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    borderRadius: 9999,
    borderWidth: 0.5,
    paddingHorizontal: 16,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
  },
  segmentedWell: {
    flexDirection: 'row',
    minHeight: 48,
    borderRadius: 9999,
    borderWidth: 0.5,
    padding: 3,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    borderRadius: 9999,
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '600',
  },
  thresholdValText: {
    fontSize: 12,
    fontWeight: '700',
  },
  thresholdGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  threshBtn: {
    flex: 1,
    minHeight: 48,
    borderRadius: 9999,
    borderWidth: 0.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  threshBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  testAlertBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    borderRadius: 9999,
    borderWidth: 0.5,
    marginVertical: 8,
  },
  testAlertText: {
    fontSize: 13,
    fontWeight: '600',
  },
  modalActionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 12,
  },
  modalSecondaryBtn: {
    flex: 1,
    height: 48,
    borderRadius: 9999,
    borderWidth: 0.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalPrimaryBtn: {
    flex: 1,
    height: 48,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalActionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  emptySubtitle: {
    fontSize: 13,
    marginTop: 6,
  },
});
