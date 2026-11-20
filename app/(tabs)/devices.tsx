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
  SectionHeader,
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
    showToast(`✓ Saved settings for ${editNickname || editingDevice.nickname}`);
    setEditingDevice(null);
  };

  const handleTestAlert = async () => {
    if (!editingDevice) return;
    setIsTestingAlert(true);
    try {
      const sent = await triggerTestLowBatteryAlert(editingDevice.address);
      if (sent) {
        Alert.alert('Alert Sent', `Test notification dispatched for ${editingDevice.nickname}!`);
      } else {
        Alert.alert('Notice', 'Ensure notification permission is granted in Android settings.');
      }
    } finally {
      setIsTestingAlert(false);
    }
  };

  const confirmRemove = (dev: TrackedDevice) => {
    Alert.alert(
      'Remove Device',
      `Remove "${dev.nickname}" from EarbudKit? Profiles and settings will be removed.`,
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

  const handleAddPreset = (type: 'noise' | 'realme' | 'generic') => {
    if (type === 'noise') {
      addTrackedDevice({
        name: 'Noise Buds Vector',
        address: '20:74:CF:89:12:01',
        nickname: 'Noise Buds Vector',
        icon: 'earbuds',
        isConnected: true,
        batteryLevel: 85,
        audioCodec: 'LDAC',
      });
      showToast('✓ Added Noise Buds Vector (85%)');
    } else if (type === 'realme') {
      addTrackedDevice({
        name: 'realme TechLife Studio H1',
        address: 'D8:55:75:A4:77:88',
        nickname: 'realme Studio H1',
        icon: 'headphones',
        isConnected: true,
        batteryLevel: null,
        audioCodec: 'AAC',
      });
      showToast('✓ Added realme Studio H1');
    } else {
      addTrackedDevice({
        name: 'Generic BLE Audio',
        address: 'F4:BC:12:44:A8:90',
        nickname: 'Audio Gear',
        icon: 'earbuds',
        isConnected: false,
        batteryLevel: null,
      });
      showToast('✓ Added Generic BLE Audio');
    }
  };

  if (Platform.OS !== 'android') {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + 24 }]}>
        <GlassCard style={styles.platformCard}>
          <Text style={styles.largeEmoji}>🍎</Text>
          <Text style={[styles.headerTitle, { color: colors.onSurface }]}>iOS Not Supported</Text>
          <Text style={[styles.bodyText, { color: colors.onSurfaceVariant, textAlign: 'center', marginTop: 8 }]}>
            EarbudKit requires Android Bluetooth APIs to discover bonded audio devices and listen for connection events.
          </Text>
        </GlassCard>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FeedbackToast message={toastMessage} onDismiss={() => setToastMessage(null)} />

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: insets.top + 16,
            paddingBottom: insets.bottom + 100,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Row */}
        <View style={styles.headerRow}>
          <View>
            <View style={styles.titleWithBadge}>
              <Text style={[styles.headerTitle, { color: colors.onSurface }]}>Tracked Devices</Text>
              <View style={[styles.countBadge, { backgroundColor: colors.surfaceContainerHigh }]}>
                <Text style={[styles.countBadgeText, { color: colors.primary }]}>
                  {trackedDevices.length} Saved
                </Text>
              </View>
            </View>
            <Text style={[styles.headerSubtitle, { color: colors.onSurfaceVariant }]}>
              Live telemetry, background introspection & acoustic presets.
            </Text>
          </View>

          <StatusChip
            label={bluetoothEnabled ? 'RADIO ACTIVE' : 'RADIO OFF'}
            dotColor={bluetoothEnabled ? 'lime' : 'grey'}
            pulse={bluetoothEnabled}
          />
        </View>

        {/* Live Event Banner */}
        {lastEvent && (
          <GlassCard style={styles.eventBanner}>
            <View style={styles.eventBannerContent}>
              <Text style={styles.eventBannerIcon}>🔔</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.eventBannerTitle, { color: colors.onSurface }]}>
                  Live Event Detected
                </Text>
                <Text style={[styles.eventBannerText, { color: colors.onSurfaceVariant }]}>
                  {lastEvent.name || lastEvent.address} is{' '}
                  <Text
                    style={{
                      color: lastEvent.connected ? colors.tertiary : colors.secondary,
                      fontWeight: '700',
                    }}
                  >
                    {lastEvent.connected ? 'CONNECTED' : 'DISCONNECTED'}
                  </Text>
                </Text>
              </View>
            </View>
          </GlassCard>
        )}

        {/* Permission Required Banner */}
        {!permissionGranted && (
          <GlassCard style={[styles.permissionBanner, { borderColor: colors.primary }]}>
            <View style={styles.permissionContent}>
              <View style={[styles.permissionIconBox, { backgroundColor: colors.surfaceContainerHigh }]}>
                <Text style={{ fontSize: 22 }}>🛡️</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.permissionTitle, { color: colors.onSurface }]}>
                  Nearby Bluetooth Access Required
                </Text>
                <Text style={[styles.permissionDesc, { color: colors.onSurfaceVariant }]}>
                  Android 12+ requires nearby device permission to discover paired audio headsets and read battery levels.
                </Text>
                <View style={{ marginTop: 12 }}>
                  <PillButton
                    variant="primary"
                    size="sm"
                    label="Grant Permission"
                    onPress={requestPermission}
                  />
                </View>
              </View>
            </View>
          </GlassCard>
        )}

        {/* Bluetooth Turned Off Banner */}
        {permissionGranted && !bluetoothEnabled && (
          <GlassCard style={styles.permissionBanner}>
            <View style={styles.permissionContent}>
              <View style={[styles.permissionIconBox, { backgroundColor: colors.surfaceContainerHigh }]}>
                <Text style={{ fontSize: 22 }}>⚡</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.permissionTitle, { color: colors.onSurface }]}>
                  Bluetooth is Disabled
                </Text>
                <Text style={[styles.permissionDesc, { color: colors.onSurfaceVariant }]}>
                  Turn on Bluetooth in system settings to connect to your audio fleet.
                </Text>
                <View style={{ marginTop: 12 }}>
                  <PillButton
                    variant="secondary"
                    size="sm"
                    label="Open Settings"
                    onPress={openSettings}
                  />
                </View>
              </View>
            </View>
          </GlassCard>
        )}

        {/* Background Access Active Telemetry Banner */}
        <GlassCard style={styles.telemetryBanner}>
          <View style={styles.telemetryRow}>
            <View style={[styles.telemetryIconBox, { backgroundColor: colors.tertiary + '20' }]}>
              <Text style={{ fontSize: 18, color: colors.tertiary }}>⚡</Text>
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.telemetryHeader}>
                <Text style={[styles.telemetryTitle, { color: colors.onSurface }]}>
                  Background Access Active
                </Text>
                <View style={[styles.microDot, { backgroundColor: colors.tertiary }]} />
              </View>
              <Text style={[styles.telemetryDesc, { color: colors.onSurfaceVariant }]}>
                Always monitoring battery telemetry and auto-reconnect routines across physical ports.
              </Text>
            </View>
          </View>
        </GlassCard>

        {/* SECTION 1: Tracked Devices (Wallet-Style Cards) */}
        <SectionHeader
          title="Tracked Fleet"
          subtitle="Managed headphones & earbuds"
        />

        {trackedDevices.length === 0 ? (
          <GlassCard style={styles.emptyCard}>
            <Text style={styles.largeEmoji}>🎧</Text>
            <Text style={[styles.emptyTitle, { color: colors.onSurface }]}>
              No Tracked Devices Yet
            </Text>
            <Text style={[styles.emptyDesc, { color: colors.onSurfaceVariant }]}>
              Add your paired headphones or earbuds below to configure profiles, battery alerts, and EQ.
            </Text>
            <View style={styles.emptyPresetsRow}>
              <PillButton
                variant="primary"
                size="sm"
                label="+ Noise Buds Vector"
                onPress={() => handleAddPreset('noise')}
              />
              <PillButton
                variant="secondary"
                size="sm"
                label="+ realme Studio H1"
                onPress={() => handleAddPreset('realme')}
              />
            </View>
          </GlassCard>
        ) : (
          <View style={styles.cardsStack}>
            {trackedDevices.map((dev) => {
              const isActive = dev.address === activeDeviceAddress;
              const hasBattery = dev.batteryLevel !== null && dev.batteryLevel !== undefined;
              const batteryVal = hasBattery ? dev.batteryLevel! : 0;
              const isLowBattery = hasBattery && batteryVal <= (dev.lowBatteryThreshold || 20);

              return (
                <GlassCard
                  key={dev.address}
                  glow={isActive}
                  style={[
                    styles.deviceCard,
                    isActive && {
                      borderColor: colors.primary,
                      borderWidth: 1.5,
                    },
                  ]}
                >
                  {/* Card Header */}
                  <View style={styles.cardHeader}>
                    <View style={styles.deviceInfoGroup}>
                      <View
                        style={[
                          styles.deviceAvatar,
                          {
                            backgroundColor: isActive
                              ? colors.primary + '25'
                              : colors.surfaceContainerHigh,
                          },
                        ]}
                      >
                        <Text style={{ fontSize: 24 }}>
                          {dev.icon === 'headphones' ? '🎧' : '🎧'}
                        </Text>
                      </View>

                      <View style={{ flex: 1 }}>
                        <View style={styles.titleRow}>
                          <Text
                            style={[styles.deviceNickname, { color: colors.onSurface }]}
                            numberOfLines={1}
                          >
                            {dev.nickname}
                          </Text>
                          {isActive && (
                            <View style={[styles.activeTag, { backgroundColor: colors.primary + '30' }]}>
                              <Text style={[styles.activeTagText, { color: colors.primary }]}>
                                TARGET
                              </Text>
                            </View>
                          )}
                        </View>

                        <View style={styles.metaRow}>
                          <Text style={[styles.macText, { color: colors.outline }]}>
                            {dev.address}
                          </Text>
                          <View style={styles.metaDivider} />
                          <StatusChip
                            label={dev.isConnected ? 'Connected' : 'Offline'}
                            dotColor={dev.isConnected ? 'lime' : 'grey'}
                            pulse={dev.isConnected}
                          />
                        </View>
                      </View>
                    </View>
                  </View>

                  {/* Battery Telemetry Section */}
                  <View style={[styles.telemetryPod, { backgroundColor: colors.surfaceContainerLowest + '80' }]}>
                    <View style={styles.batteryRow}>
                      <View style={styles.batteryLabelBox}>
                        <Text style={{ fontSize: 16 }}>🔋</Text>
                        <Text style={[styles.batteryLabel, { color: colors.onSurface }]}>
                          Battery Life
                        </Text>
                      </View>
                      <Text
                        style={[
                          styles.batteryPercent,
                          {
                            color: !hasBattery
                              ? colors.outline
                              : isLowBattery
                              ? colors.error
                              : colors.tertiary,
                          },
                        ]}
                      >
                        {hasBattery ? `${batteryVal}%` : 'Unavailable'}
                      </Text>
                    </View>

                    {hasBattery ? (
                      <View style={[styles.batteryTrack, { backgroundColor: colors.surfaceContainerHigh }]}>
                        <View
                          style={[
                            styles.batteryBarFill,
                            {
                              width: `${Math.min(100, Math.max(0, batteryVal))}%`,
                              backgroundColor: isLowBattery ? colors.error : colors.tertiary,
                            },
                          ]}
                        />
                      </View>
                    ) : (
                      <Text style={[styles.unavailableNote, { color: colors.onSurfaceVariant }]}>
                        Standard Android Bluetooth driver restriction
                      </Text>
                    )}
                  </View>

                  {/* Badges & Meta Row */}
                  <View style={styles.tagsRow}>
                    <View style={[styles.tagPill, { backgroundColor: colors.surfaceContainerHigh }]}>
                      <Text style={[styles.tagPillText, { color: colors.onSurfaceVariant }]}>
                        Alert: {dev.lowBatteryThreshold || 20}%
                      </Text>
                    </View>
                    {dev.audioCodec && (
                      <View style={[styles.tagPill, { backgroundColor: colors.surfaceContainerHigh }]}>
                        <Text style={[styles.tagPillText, { color: colors.primary }]}>
                          {dev.audioCodec}
                        </Text>
                      </View>
                    )}
                    {!dev.isConnected && dev.lastLocation?.addressText && (
                      <View style={[styles.tagPill, { backgroundColor: colors.surfaceContainerHigh, flex: 1 }]}>
                        <Text
                          style={[styles.tagPillText, { color: colors.outline }]}
                          numberOfLines={1}
                        >
                          📍 {dev.lastLocation.addressText}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Card Actions */}
                  <View style={styles.cardActionsRow}>
                    {!isActive && (
                      <PillButton
                        variant="ghost"
                        size="sm"
                        label="★ Set Active"
                        onPress={() => {
                          setActiveDevice(dev.address);
                          showToast(`✓ ${dev.nickname} set as Active Target`);
                        }}
                      />
                    )}
                    <PillButton
                      variant="secondary"
                      size="sm"
                      label="✏️ Edit"
                      onPress={() => openEditModal(dev)}
                    />
                    <PillButton
                      variant="danger"
                      size="sm"
                      label="🗑️ Remove"
                      onPress={() => confirmRemove(dev)}
                    />
                  </View>
                </GlassCard>
              );
            })}
          </View>
        )}

        {/* SECTION 2: Pair New Bluetooth Device Interactive Bento Tile */}
        <GlassCard style={styles.pairBentoTile}>
          <View style={styles.radarAura}>
            <View style={[styles.radarCircleOuter, { borderColor: colors.primary + '30' }]} />
            <TouchableOpacity
              style={[styles.radarButton, { backgroundColor: colors.primary }]}
              activeOpacity={0.85}
              onPress={refresh}
            >
              <Text style={{ fontSize: 26, color: colors.onPrimary, fontWeight: '700' }}>+</Text>
            </TouchableOpacity>
          </View>

          <Text style={[styles.pairBentoTitle, { color: colors.onSurface }]}>
            Pair New Bluetooth Device
          </Text>
          <Text style={[styles.pairBentoSubtitle, { color: colors.onSurfaceVariant }]}>
            Detects unbranded & third-party gear instantly with deep protocol introspection
          </Text>

          <View style={styles.scanIndicatorRow}>
            <View style={[styles.scanDot, { backgroundColor: colors.tertiary }]} />
            <Text style={[styles.scanIndicatorText, { color: colors.onSurfaceVariant }]}>
              {isLoading ? 'SCANNING SYSTEM BLUETOOTH...' : 'STANDBY • BLE BEACON 2.4GHZ'}
            </Text>
          </View>

          <View style={styles.pairActionButtons}>
            <PillButton
              variant="primary"
              size="sm"
              label={isLoading ? 'Scanning...' : '🔄 Scan Paired Devices'}
              onPress={() => { refresh(); }}
              loading={isLoading}
            />
            <PillButton
              variant="secondary"
              size="sm"
              label="⚙️ Phone BT Settings"
              onPress={() => { openSettings(); }}
            />
          </View>
        </GlassCard>

        {/* SECTION 3: Available Paired Bluetooth Devices on Phone */}
        <SectionHeader
          title="Paired Bluetooth Devices"
          subtitle="Discovered on phone system"
          actionText="Rescan"
          onActionPress={() => { refresh(); }}
        />

        {untrackedBonded.length === 0 ? (
          <GlassCard style={styles.emptyBondedCard}>
            <Text style={[styles.emptyBondedText, { color: colors.onSurfaceVariant }]}>
              {bondedDevices.length > 0
                ? '✓ All paired Bluetooth audio devices are currently tracked.'
                : 'No paired Bluetooth audio devices found on phone.'}
            </Text>
            <View style={{ marginTop: 12 }}>
              <PillButton
                variant="secondary"
                size="sm"
                label="Pair in Android Settings"
                onPress={openSettings}
              />
            </View>
          </GlassCard>
        ) : (
          <View style={styles.cardsStack}>
            {untrackedBonded.map((item) => (
              <GlassCard key={item.address} style={styles.untrackedCard}>
                <View style={styles.untrackedInfo}>
                  <Text style={[styles.untrackedName, { color: colors.onSurface }]}>
                    {item.name || 'Unnamed Audio Device'}
                  </Text>
                  <Text style={[styles.untrackedAddress, { color: colors.outline }]}>
                    {item.address} • {item.isConnected ? 'Connected' : 'Disconnected'}
                  </Text>
                </View>
                <PillButton
                  variant="primary"
                  size="sm"
                  label="+ Track"
                  onPress={() => {
                    addTrackedDevice({
                      name: item.name,
                      address: item.address,
                      isConnected: item.isConnected,
                    });
                    showToast(`✓ Tracking ${item.name || item.address}`);
                  }}
                />
              </GlassCard>
            ))}
          </View>
        )}

        {/* SECTION 4: Quick-Add Preset Chips */}
        <View style={styles.presetSection}>
          <Text style={[styles.presetSectionLabel, { color: colors.outline }]}>
            TARGET PRESETS
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.presetsScroll}
          >
            <TouchableOpacity
              style={[styles.presetChip, { backgroundColor: colors.surfaceContainerHigh }]}
              activeOpacity={0.8}
              onPress={() => handleAddPreset('noise')}
            >
              <Text style={{ fontSize: 16 }}>🎧</Text>
              <Text style={[styles.presetChipText, { color: colors.onSurface }]}>
                Noise Buds Vector
              </Text>
              <View style={[styles.plusBadge, { backgroundColor: colors.surfaceContainer }]}>
                <Text style={[styles.plusBadgeText, { color: colors.primary }]}>+</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.presetChip, { backgroundColor: colors.surfaceContainerHigh }]}
              activeOpacity={0.8}
              onPress={() => handleAddPreset('realme')}
            >
              <Text style={{ fontSize: 16 }}>🎧</Text>
              <Text style={[styles.presetChipText, { color: colors.onSurface }]}>
                realme Studio H1
              </Text>
              <View style={[styles.plusBadge, { backgroundColor: colors.surfaceContainer }]}>
                <Text style={[styles.plusBadgeText, { color: colors.tertiary }]}>+</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.presetChip, { backgroundColor: colors.surfaceContainerHigh }]}
              activeOpacity={0.8}
              onPress={() => handleAddPreset('generic')}
            >
              <Text style={{ fontSize: 16 }}>📡</Text>
              <Text style={[styles.presetChipText, { color: colors.onSurface }]}>
                Generic BLE Audio
              </Text>
              <View style={[styles.plusBadge, { backgroundColor: colors.surfaceContainer }]}>
                <Text style={[styles.plusBadgeText, { color: colors.secondary }]}>+</Text>
              </View>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </ScrollView>

      {/* RESTYLED EDIT DEVICE MODAL */}
      <Modal
        visible={editingDevice !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setEditingDevice(null)}
      >
        <View style={styles.modalBackdrop}>
          <GlassCard style={styles.modalCard} glow>
            <Text style={[styles.modalTitle, { color: colors.onSurface }]}>
              Edit Device
            </Text>
            <Text style={[styles.modalSubtitle, { color: colors.outline }]}>
              {editingDevice?.address}
            </Text>

            {/* Nickname Field */}
            <Text style={[styles.fieldLabel, { color: colors.onSurface }]}>
              Device Nickname
            </Text>
            <TextInput
              style={[
                styles.textInput,
                {
                  backgroundColor: colors.surfaceContainerLowest,
                  color: colors.onSurface,
                  borderColor: colors.outlineVariant,
                },
              ]}
              value={editNickname}
              onChangeText={setEditNickname}
              placeholder="e.g. My Daily Driver"
              placeholderTextColor={colors.outline}
            />

            {/* Icon Selector */}
            <Text style={[styles.fieldLabel, { color: colors.onSurface, marginTop: 16 }]}>
              Device Icon
            </Text>
            <View style={styles.iconSelectionRow}>
              <TouchableOpacity
                style={[
                  styles.iconChoicePill,
                  {
                    backgroundColor:
                      editIcon === 'earbuds'
                        ? colors.primary + '25'
                        : colors.surfaceContainerHigh,
                    borderColor:
                      editIcon === 'earbuds' ? colors.primary : 'transparent',
                  },
                ]}
                onPress={() => setEditIcon('earbuds')}
              >
                <Text style={{ fontSize: 18 }}>🎧</Text>
                <Text
                  style={[
                    styles.iconChoiceText,
                    {
                      color:
                        editIcon === 'earbuds' ? colors.primary : colors.onSurface,
                    },
                  ]}
                >
                  Earbuds
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.iconChoicePill,
                  {
                    backgroundColor:
                      editIcon === 'headphones'
                        ? colors.primary + '25'
                        : colors.surfaceContainerHigh,
                    borderColor:
                      editIcon === 'headphones' ? colors.primary : 'transparent',
                  },
                ]}
                onPress={() => setEditIcon('headphones')}
              >
                <Text style={{ fontSize: 18 }}>🎧</Text>
                <Text
                  style={[
                    styles.iconChoiceText,
                    {
                      color:
                        editIcon === 'headphones'
                          ? colors.primary
                          : colors.onSurface,
                    },
                  ]}
                >
                  Over-Ear
                </Text>
              </TouchableOpacity>
            </View>

            {/* Low Battery Threshold */}
            <Text style={[styles.fieldLabel, { color: colors.onSurface, marginTop: 16 }]}>
              Low Battery Alert ({editThreshold}%)
            </Text>
            <View style={styles.thresholdRow}>
              {[10, 15, 20, 25, 30].map((val) => (
                <TouchableOpacity
                  key={val}
                  style={[
                    styles.thresholdPill,
                    {
                      backgroundColor:
                        editThreshold === val
                          ? colors.tertiary + '30'
                          : colors.surfaceContainerHigh,
                      borderColor:
                        editThreshold === val ? colors.tertiary : 'transparent',
                    },
                  ]}
                  onPress={() => setEditThreshold(val)}
                >
                  <Text
                    style={[
                      styles.thresholdPillText,
                      {
                        color:
                          editThreshold === val
                            ? colors.tertiary
                            : colors.onSurface,
                      },
                    ]}
                  >
                    {val}%
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Test Alert Button */}
            <View style={{ marginTop: 16 }}>
              <PillButton
                variant="ghost"
                size="sm"
                label={isTestingAlert ? 'Sending Alert...' : '🔔 Test Notification'}
                onPress={() => { handleTestAlert(); }}
                loading={isTestingAlert}
              />
            </View>

            {/* Modal Buttons */}
            <View style={styles.modalButtonsRow}>
              <PillButton
                variant="secondary"
                size="md"
                label="Cancel"
                onPress={() => setEditingDevice(null)}
                style={{ flex: 1 }}
              />
              <PillButton
                variant="primary"
                size="md"
                label="Save Changes"
                onPress={saveEdit}
                style={{ flex: 1 }}
              />
            </View>
          </GlassCard>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  titleWithBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 22,
    letterSpacing: -0.5,
  },
  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 9999,
  },
  countBadgeText: {
    fontFamily: 'SpaceGrotesk-SemiBold',
    fontSize: 12,
  },
  headerSubtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    marginTop: 4,
    lineHeight: 18,
  },
  platformCard: {
    padding: 24,
    alignItems: 'center',
    marginHorizontal: 16,
  },
  largeEmoji: {
    fontSize: 44,
    marginBottom: 8,
  },
  bodyText: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    lineHeight: 20,
  },
  eventBanner: {
    padding: 14,
  },
  eventBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  eventBannerIcon: {
    fontSize: 22,
  },
  eventBannerTitle: {
    fontFamily: 'SpaceGrotesk-SemiBold',
    fontSize: 13,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  eventBannerText: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    marginTop: 2,
  },
  permissionBanner: {
    padding: 16,
  },
  permissionContent: {
    flexDirection: 'row',
    gap: 14,
    alignItems: 'flex-start',
  },
  permissionIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  permissionTitle: {
    fontFamily: 'SpaceGrotesk-SemiBold',
    fontSize: 15,
  },
  permissionDesc: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
  telemetryBanner: {
    padding: 14,
  },
  telemetryRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  telemetryIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  telemetryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  telemetryTitle: {
    fontFamily: 'SpaceGrotesk-SemiBold',
    fontSize: 14,
  },
  microDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  telemetryDesc: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    lineHeight: 16,
    marginTop: 2,
  },
  cardsStack: {
    gap: 14,
  },
  deviceCard: {
    padding: 18,
    gap: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  deviceInfoGroup: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    flex: 1,
  },
  deviceAvatar: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  deviceNickname: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 17,
    letterSpacing: -0.3,
  },
  activeTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  activeTagText: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 9,
    letterSpacing: 0.8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 3,
  },
  macText: {
    fontFamily: 'SpaceGrotesk-Regular',
    fontSize: 12,
  },
  metaDivider: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#666',
  },
  telemetryPod: {
    padding: 12,
    borderRadius: 16,
    gap: 8,
  },
  batteryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  batteryLabelBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  batteryLabel: {
    fontFamily: 'SpaceGrotesk-Medium',
    fontSize: 13,
  },
  batteryPercent: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 15,
  },
  batteryTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  batteryBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  unavailableNote: {
    fontFamily: 'Inter-Regular',
    fontSize: 11,
    fontStyle: 'italic',
  },
  tagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  tagPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  tagPillText: {
    fontFamily: 'SpaceGrotesk-Medium',
    fontSize: 11,
  },
  cardActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 8,
    paddingTop: 4,
  },
  emptyCard: {
    padding: 24,
    alignItems: 'center',
    gap: 8,
  },
  emptyTitle: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 18,
  },
  emptyDesc: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 8,
  },
  emptyPresetsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  pairBentoTile: {
    padding: 22,
    alignItems: 'center',
    gap: 8,
  },
  radarAura: {
    width: 68,
    height: 68,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginBottom: 4,
  },
  radarCircleOuter: {
    position: 'absolute',
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 1.5,
  },
  radarButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pairBentoTitle: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 17,
    letterSpacing: -0.3,
  },
  pairBentoSubtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 16,
    maxWidth: 280,
  },
  scanIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginVertical: 4,
  },
  scanDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  scanIndicatorText: {
    fontFamily: 'SpaceGrotesk-SemiBold',
    fontSize: 10,
    letterSpacing: 1,
  },
  pairActionButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  emptyBondedCard: {
    padding: 16,
    alignItems: 'center',
  },
  emptyBondedText: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    textAlign: 'center',
  },
  untrackedCard: {
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  untrackedInfo: {
    flex: 1,
    marginRight: 12,
  },
  untrackedName: {
    fontFamily: 'SpaceGrotesk-SemiBold',
    fontSize: 14,
  },
  untrackedAddress: {
    fontFamily: 'SpaceGrotesk-Regular',
    fontSize: 11,
    marginTop: 2,
  },
  presetSection: {
    gap: 8,
    marginTop: 4,
  },
  presetSectionLabel: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 11,
    letterSpacing: 1.2,
  },
  presetsScroll: {
    gap: 10,
  },
  presetChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 9999,
  },
  presetChipText: {
    fontFamily: 'SpaceGrotesk-Medium',
    fontSize: 13,
  },
  plusBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plusBadgeText: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 16,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    padding: 22,
  },
  modalTitle: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 20,
  },
  modalSubtitle: {
    fontFamily: 'SpaceGrotesk-Regular',
    fontSize: 12,
    marginTop: 2,
    marginBottom: 16,
  },
  fieldLabel: {
    fontFamily: 'SpaceGrotesk-SemiBold',
    fontSize: 13,
    marginBottom: 6,
  },
  textInput: {
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontFamily: 'SpaceGrotesk-Medium',
    fontSize: 14,
  },
  iconSelectionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  iconChoicePill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  iconChoiceText: {
    fontFamily: 'SpaceGrotesk-SemiBold',
    fontSize: 13,
  },
  thresholdRow: {
    flexDirection: 'row',
    gap: 6,
  },
  thresholdPill: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thresholdPillText: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 12,
  },
  modalButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
});
