import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/theme';
import {
  useDeviceStore,
  useAutoStore,
  MEDIA_APP_OPTIONS,
  TrackedDevice,
} from '../../src/store';
import {
  isDndPermissionGranted,
  openDndSettings,
} from '../../modules/earbud-native';
import { FeedbackToast } from '../../src/components/FeedbackToast';
import {
  GlassCard,
  PillButton,
  Toggle,
  NeonSlider,
} from '../../src/components/ui';

export default function AutoScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { colors, fonts, borderRadius } = theme;

  const trackedDevicesMap = useDeviceStore((s) => s.trackedDevices);
  const activeDeviceAddress = useDeviceStore((s) => s.activeDeviceAddress);
  const trackedDevices = Object.values(trackedDevicesMap);

  // Selected device for auto-actions
  const [selectedAddress, setSelectedAddress] = useState<string | null>(null);
  const [hasDndPermission, setHasDndPermission] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
  }, []);

  useEffect(() => {
    if (Platform.OS === 'android') {
      setHasDndPermission(isDndPermissionGranted());
    }
  }, []);

  // Ensure a valid selected address
  useEffect(() => {
    if (trackedDevices.length > 0) {
      if (!selectedAddress || !trackedDevicesMap[selectedAddress]) {
        setSelectedAddress(activeDeviceAddress || trackedDevices[0].address);
      }
    } else {
      setSelectedAddress(null);
    }
  }, [trackedDevices, selectedAddress, activeDeviceAddress, trackedDevicesMap]);

  const selectedDevice: TrackedDevice | undefined = selectedAddress
    ? trackedDevicesMap[selectedAddress]
    : undefined;

  // Reactively subscribe to profiles from store
  const profiles = useAutoStore((s) => s.profiles);
  const getProfile = useAutoStore((s) => s.getProfile);
  const updateConnectAction = useAutoStore((s) => s.updateConnectAction);
  const updateDisconnectAction = useAutoStore((s) => s.updateDisconnectAction);
  const executeConnectProfile = useAutoStore((s) => s.executeConnectProfile);
  const executeDisconnectProfile = useAutoStore((s) => s.executeDisconnectProfile);

  const selectedUpper = selectedAddress ? selectedAddress.toUpperCase() : null;
  const currentProfile = selectedUpper
    ? (profiles[selectedUpper] ?? getProfile(selectedUpper, selectedDevice?.name))
    : null;

  const handleTestConnect = async () => {
    if (!selectedAddress) return;
    setTestResult('Running Connect Profile...');
    const res = await executeConnectProfile(selectedAddress);
    const msgs: string[] = [];
    if (res.appLaunched) msgs.push('Launched App');
    if (res.volumeSet) msgs.push('Set Volume');
    if (res.dndSet) msgs.push('Enabled DND');
    const summary = msgs.length > 0 ? msgs.join(' • ') : 'Connect profile executed';
    setTestResult(`Connect Profile Executed: ${summary}`);
    showToast(`Tested Connect: ${summary}`);
    setTimeout(() => setTestResult(null), 4000);
  };

  const handleTestDisconnect = async () => {
    if (!selectedAddress) return;
    setTestResult('Running Disconnect Profile...');
    const res = await executeDisconnectProfile(selectedAddress);
    const msgs: string[] = [];
    if (res.mediaPaused) msgs.push('Media Paused');
    if (res.volumeReset) msgs.push('Volume Reset');
    if (res.dndReset) msgs.push('Disabled DND');
    const summary = msgs.length > 0 ? msgs.join(' • ') : 'Disconnect profile executed';
    setTestResult(`Disconnect Profile Executed: ${summary}`);
    showToast(`Tested Disconnect: ${summary}`);
    setTimeout(() => setTestResult(null), 4000);
  };

  const handleRequestDnd = () => {
    Alert.alert(
      'Do Not Disturb Permission',
      'EarbudKit requires Notification Policy access to automatically enable or disable Do Not Disturb when your device connects.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Open DND Settings',
          onPress: () => {
            openDndSettings();
            setTimeout(() => {
              setHasDndPermission(isDndPermissionGranted());
            }, 1500);
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
            Auto-actions require Android system audio and intent routing APIs.
          </Text>
        </GlassCard>
      </View>
    );
  }

  if (trackedDevices.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, padding: 16 }]}>
        <GlassCard style={{ padding: 24, alignItems: 'center' }}>
          <Ionicons name="flash-outline" size={48} color={colors.primary} />
          <Text style={[styles.emptyTitle, { color: colors.onSurface, fontFamily: fonts.headline, marginTop: 12 }]}>
            No Devices Tracked
          </Text>
          <Text
            style={[
              styles.emptySubtitle,
              { color: colors.onSurfaceVariant, fontFamily: fonts.body, textAlign: 'center', marginBottom: 20 },
            ]}
          >
            Add a device first to set up auto-launching apps, volume presets, and disconnect pausing.
          </Text>
          <PillButton label="Go to Devices" onPress={() => router.push('/(tabs)/devices')} />
        </GlassCard>
      </View>
    );
  }

  const isProfileActive = Boolean(currentProfile?.onConnect.enabled);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FeedbackToast message={toastMessage} onDismiss={() => setToastMessage(null)} />

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: insets.top + 12,
            paddingBottom: insets.bottom + 90,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Title Block */}
        <View style={styles.headerBlock}>
          <View style={styles.headerTitleRow}>
            <Text style={[styles.screenTitle, { color: colors.onSurface, fontFamily: fonts.display }]}>
              Auto-Actions
            </Text>
            <View
              style={[
                styles.engineBadge,
                {
                  backgroundColor: colors.surfaceContainerHigh,
                  borderColor: colors.hairline,
                },
              ]}
            >
              <View style={[styles.pulseDot, { backgroundColor: colors.primary }]} />
              <Text style={[styles.engineText, { color: colors.primary, fontFamily: fonts.label }]}>
                Engine Active
              </Text>
            </View>
          </View>
          <Text style={[styles.screenSubtitle, { color: colors.onSurfaceVariant, fontFamily: fonts.body }]}>
            Acoustic automation based on physical hardware states.
          </Text>
        </View>

        {/* Device Selector Chips (Scrollable row) */}
        <View style={styles.deviceChipsContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.deviceChipsRow}>
            {trackedDevices.map((dev) => {
              const isSelected = dev.address === selectedAddress;
              return (
                <TouchableOpacity
                  key={dev.address}
                  activeOpacity={0.8}
                  onPress={() => setSelectedAddress(dev.address)}
                  style={[
                    styles.deviceChip,
                    {
                      backgroundColor: isSelected ? colors.primary : colors.surfaceContainerHigh,
                      borderColor: isSelected ? colors.primary : colors.hairline,
                    },
                  ]}
                >
                  <Ionicons
                    name={dev.icon === 'headphones' ? 'headset' : 'headset-outline'}
                    size={16}
                    color={isSelected ? colors.onPrimary : colors.onSurfaceVariant}
                    style={{ marginRight: 6 }}
                  />
                  <Text
                    style={[
                      styles.deviceChipText,
                      {
                        color: isSelected ? colors.onPrimary : colors.onSurface,
                        fontFamily: fonts.label,
                      },
                    ]}
                  >
                    {dev.nickname}
                  </Text>
                  {isSelected && (
                    <Ionicons
                      name="checkmark"
                      size={14}
                      color={colors.onPrimary}
                      style={{ marginLeft: 6 }}
                    />
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Master Automation Switch Card */}
        <View
          style={[
            styles.masterCard,
            {
              backgroundColor: colors.surfaceContainer,
              borderColor: colors.hairline,
              borderRadius: borderRadius.lg,
            },
          ]}
        >
          <View style={styles.masterLeft}>
            <View
              style={[
                styles.masterIconCircle,
                {
                  backgroundColor: colors.primaryContainer,
                },
              ]}
            >
              <Ionicons name="hardware-chip-outline" size={22} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.masterTitle, { color: colors.onSurface, fontFamily: fonts.headline }]}>
                Enable Smart Handshake
              </Text>
              <Text style={[styles.masterDesc, { color: colors.onSurfaceVariant, fontFamily: fonts.body }]}>
                Trigger precision routines immediately as Bluetooth protocol links.
              </Text>
            </View>
          </View>
          <Toggle
            value={isProfileActive}
            onValueChange={(val) => {
              if (selectedAddress) {
                updateConnectAction(selectedAddress, { enabled: val });
                updateDisconnectAction(selectedAddress, { enabled: val });
                showToast(val ? 'Smart Handshake enabled' : 'Smart Handshake paused');
              }
            }}
          />
        </View>

        {/* Section 1: When Hardware Links */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeadingRow}>
            <Ionicons name="bluetooth" size={18} color={colors.primary} style={{ marginRight: 6 }} />
            <Text style={[styles.sectionHeading, { color: colors.onSurface, fontFamily: fonts.headline }]}>
              When Hardware Links
            </Text>
          </View>

          <View
            style={[
              styles.sectionCard,
              {
                backgroundColor: colors.surfaceContainer,
                borderColor: colors.hairline,
                borderRadius: borderRadius.lg,
              },
            ]}
          >
            {/* Sub-row: Auto-Launch App Header & Toggle */}
            <View style={styles.subRow}>
              <View style={{ flex: 1, marginRight: 10 }}>
                <Text style={[styles.rowTitle, { color: colors.onSurface, fontFamily: fonts.headline }]}>
                  Auto-Launch Media Source
                </Text>
                <Text style={[styles.rowSubtitle, { color: colors.onSurfaceVariant, fontFamily: fonts.body }]}>
                  Bring primary audio workspace to focus
                </Text>
              </View>
              <Toggle
                value={Boolean(currentProfile?.onConnect.launchAppPackage)}
                onValueChange={(val) => {
                  if (selectedAddress) {
                    if (val) {
                      updateConnectAction(selectedAddress, {
                        launchAppPackage: 'com.spotify.music',
                        launchAppLabel: 'Spotify',
                      });
                    } else {
                      updateConnectAction(selectedAddress, {
                        launchAppPackage: null,
                        launchAppLabel: null,
                      });
                    }
                  }
                }}
              />
            </View>

            {/* App Launcher Grid (8 Popular Audio Apps) */}
            {Boolean(currentProfile?.onConnect.launchAppPackage) && (
              <View style={styles.appGrid}>
                {MEDIA_APP_OPTIONS.map((app) => {
                  const isSelected = currentProfile?.onConnect.launchAppPackage === app.packageName;
                  const glyph = (app.icon as keyof typeof Ionicons.glyphMap) || 'musical-notes';

                  return (
                    <TouchableOpacity
                      key={app.packageName}
                      activeOpacity={0.8}
                      onPress={() => {
                        if (selectedAddress) {
                          updateConnectAction(selectedAddress, {
                            launchAppPackage: app.packageName,
                            launchAppLabel: app.label,
                          });
                          showToast(`Selected ${app.label}`);
                        }
                      }}
                      style={[
                        styles.appCard,
                        {
                          backgroundColor: isSelected ? colors.primaryContainer : colors.surfaceContainerHigh,
                          borderColor: isSelected ? colors.primary : colors.hairline,
                        },
                      ]}
                    >
                      {isSelected && (
                        <View style={[styles.selectedCheckCircle, { backgroundColor: colors.primary }]}>
                          <Ionicons name="checkmark" size={10} color={colors.onPrimary} />
                        </View>
                      )}
                      <View
                        style={[
                          styles.appIconCircle,
                          {
                            backgroundColor: colors.surfaceContainerLowest,
                          },
                        ]}
                      >
                        <Ionicons
                          name={glyph}
                          size={22}
                          color={isSelected ? colors.primary : colors.onSurface}
                        />
                      </View>
                      <Text
                        numberOfLines={1}
                        style={[
                          styles.appLabel,
                          {
                            color: isSelected ? colors.primary : colors.onSurface,
                            fontFamily: fonts.label,
                          },
                        ]}
                      >
                        {app.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            <View style={[styles.cardDivider, { backgroundColor: colors.hairline }]} />

            {/* Row 2: Target Media Volume Slider */}
            <View style={styles.volumeBlock}>
              <View style={styles.volumeHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="volume-high-outline" size={18} color={colors.onSurfaceVariant} />
                  <Text style={[styles.rowTitle, { color: colors.onSurface, fontFamily: fonts.headline }]}>
                    Target Audio Gain
                  </Text>
                </View>
                <Text style={[styles.volumeReadout, { color: colors.primary, fontFamily: fonts.headline }]}>
                  {currentProfile?.onConnect.setVolume !== null ? `${currentProfile?.onConnect.setVolume}%` : 'Off'}
                </Text>
              </View>

              <NeonSlider
                value={currentProfile?.onConnect.setVolume ?? 65}
                min={0}
                max={100}
                step={5}
                formatValue={(v) => `${v}%`}
                onValueChange={(val) => {
                  if (selectedAddress) {
                    updateConnectAction(selectedAddress, { setVolume: val });
                  }
                }}
              />

              {/* Volume Preset Chips */}
              <View style={styles.presetChipsRow}>
                {[30, 50, 65, 85, 100].map((pct) => {
                  const isCur = currentProfile?.onConnect.setVolume === pct;
                  return (
                    <TouchableOpacity
                      key={pct}
                      activeOpacity={0.8}
                      onPress={() => {
                        if (selectedAddress) {
                          updateConnectAction(selectedAddress, { setVolume: pct });
                        }
                      }}
                      style={[
                        styles.volPresetChip,
                        {
                          backgroundColor: isCur ? colors.primary : colors.surfaceContainerHigh,
                          borderColor: colors.hairline,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.volPresetText,
                          {
                            color: isCur ? colors.onPrimary : colors.onSurface,
                            fontFamily: fonts.label,
                          },
                        ]}
                      >
                        {pct === 100 ? 'Max' : `${pct}%`}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={[styles.cardDivider, { backgroundColor: colors.hairline }]} />

            {/* Row 3: Do Not Disturb */}
            <View style={styles.subRow}>
              <View style={{ flex: 1, marginRight: 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="notifications-off-outline" size={18} color={colors.onSurfaceVariant} />
                  <Text style={[styles.rowTitle, { color: colors.onSurface, fontFamily: fonts.headline }]}>
                    Enable Acoustic Isolation
                  </Text>
                </View>
                <Text style={[styles.rowSubtitle, { color: colors.onSurfaceVariant, fontFamily: fonts.body }]}>
                  Suppress system notifications & calls (DND)
                </Text>
              </View>
              <Toggle
                value={Boolean(currentProfile?.onConnect.enableDnd)}
                onValueChange={(val) => {
                  if (selectedAddress) {
                    if (val && !hasDndPermission) {
                      handleRequestDnd();
                    }
                    updateConnectAction(selectedAddress, { enableDnd: val });
                  }
                }}
              />
            </View>

            {/* Quiet Action: Test Connect */}
            <View style={styles.quietActionRow}>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={handleTestConnect}
                style={[
                  styles.quietBtn,
                  {
                    backgroundColor: colors.surfaceContainerHigh,
                    borderColor: colors.hairline,
                  },
                ]}
              >
                <Ionicons name="play" size={14} color={colors.primary} style={{ marginRight: 4 }} />
                <Text style={[styles.quietBtnText, { color: colors.primary, fontFamily: fonts.label }]}>
                  Simulate Connect Handshake
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Section 2: When Disconnected */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeadingRow}>
            <Ionicons name="power-outline" size={18} color={colors.onSurfaceVariant} style={{ marginRight: 6 }} />
            <Text style={[styles.sectionHeading, { color: colors.onSurface, fontFamily: fonts.headline }]}>
              When Disconnected
            </Text>
          </View>

          <View
            style={[
              styles.sectionCard,
              {
                backgroundColor: colors.surfaceContainer,
                borderColor: colors.hairline,
                borderRadius: borderRadius.lg,
              },
            ]}
          >
            {/* Row 1: Pause Media Instantly */}
            <View style={styles.subRow}>
              <View style={{ flex: 1, marginRight: 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="pause-circle-outline" size={18} color={colors.onSurfaceVariant} />
                  <Text style={[styles.rowTitle, { color: colors.onSurface, fontFamily: fonts.headline }]}>
                    Halt Playback Instantly
                  </Text>
                </View>
                <Text style={[styles.rowSubtitle, { color: colors.onSurfaceVariant, fontFamily: fonts.body }]}>
                  Avoid sudden open-speaker audio bleed
                </Text>
              </View>
              <Toggle
                value={Boolean(currentProfile?.onDisconnect.pauseMedia)}
                onValueChange={(val) => {
                  if (selectedAddress) {
                    updateDisconnectAction(selectedAddress, { pauseMedia: val });
                  }
                }}
              />
            </View>

            <View style={[styles.cardDivider, { backgroundColor: colors.hairline }]} />

            {/* Row 2: Reset Volume Fallback */}
            <View style={styles.volumeBlock}>
              <View style={styles.volumeHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="phone-portrait-outline" size={18} color={colors.onSurfaceVariant} />
                  <Text style={[styles.rowTitle, { color: colors.onSurface, fontFamily: fonts.headline }]}>
                    Reset Speaker Volume
                  </Text>
                </View>
                <Text style={[styles.volumeReadout, { color: colors.onSurfaceVariant, fontFamily: fonts.headline }]}>
                  {currentProfile?.onDisconnect.setVolume !== null ? `${currentProfile?.onDisconnect.setVolume}%` : 'Off'}
                </Text>
              </View>

              <NeonSlider
                value={currentProfile?.onDisconnect.setVolume ?? 20}
                min={0}
                max={100}
                step={5}
                formatValue={(v) => `${v}%`}
                onValueChange={(val) => {
                  if (selectedAddress) {
                    updateDisconnectAction(selectedAddress, { setVolume: val });
                  }
                }}
              />

              {/* Disconnect Preset Chips */}
              <View style={styles.presetChipsRow}>
                {[0, 20, 40].map((pct) => {
                  const isCur = currentProfile?.onDisconnect.setVolume === pct;
                  return (
                    <TouchableOpacity
                      key={pct}
                      activeOpacity={0.8}
                      onPress={() => {
                        if (selectedAddress) {
                          updateDisconnectAction(selectedAddress, { setVolume: pct });
                        }
                      }}
                      style={[
                        styles.volPresetChip,
                        {
                          backgroundColor: isCur ? colors.primary : colors.surfaceContainerHigh,
                          borderColor: colors.hairline,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.volPresetText,
                          {
                            color: isCur ? colors.onPrimary : colors.onSurface,
                            fontFamily: fonts.label,
                          },
                        ]}
                      >
                        {pct === 0 ? 'Mute' : `${pct}%`}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={[styles.cardDivider, { backgroundColor: colors.hairline }]} />

            {/* Row 3: Restore Ringer / Disable DND */}
            <View style={styles.subRow}>
              <View style={{ flex: 1, marginRight: 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="notifications-outline" size={18} color={colors.onSurfaceVariant} />
                  <Text style={[styles.rowTitle, { color: colors.onSurface, fontFamily: fonts.headline }]}>
                    Restore Phone Ringer
                  </Text>
                </View>
                <Text style={[styles.rowSubtitle, { color: colors.onSurfaceVariant, fontFamily: fonts.body }]}>
                  Deactivate DND and return to standard ring mode
                </Text>
              </View>
              <Toggle
                value={Boolean(currentProfile?.onDisconnect.disableDnd)}
                onValueChange={(val) => {
                  if (selectedAddress) {
                    updateDisconnectAction(selectedAddress, { disableDnd: val });
                  }
                }}
              />
            </View>

            {/* Quiet Action: Test Disconnect */}
            <View style={styles.quietActionRow}>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={handleTestDisconnect}
                style={[
                  styles.quietBtn,
                  {
                    backgroundColor: colors.surfaceContainerHigh,
                    borderColor: colors.hairline,
                  },
                ]}
              >
                <Ionicons name="refresh" size={14} color={colors.onSurfaceVariant} style={{ marginRight: 4 }} />
                <Text style={[styles.quietBtnText, { color: colors.onSurfaceVariant, fontFamily: fonts.label }]}>
                  Simulate Disconnect Flow
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
  },
  headerBlock: {
    marginBottom: 16,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  screenTitle: {
    fontSize: 34,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  engineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 9999,
    borderWidth: 0.5,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  engineText: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  screenSubtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  deviceChipsContainer: {
    marginBottom: 16,
  },
  deviceChipsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 2,
  },
  deviceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 38,
    paddingHorizontal: 14,
    borderRadius: 9999,
    borderWidth: 0.5,
  },
  deviceChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  masterCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderWidth: 0.5,
    marginBottom: 20,
  },
  masterLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  masterIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  masterTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  masterDesc: {
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  sectionContainer: {
    marginBottom: 20,
  },
  sectionHeadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  sectionHeading: {
    fontSize: 18,
    fontWeight: '700',
  },
  sectionCard: {
    padding: 16,
    borderWidth: 0.5,
  },
  subRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  rowSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  appGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 14,
  },
  appCard: {
    width: '23%',
    aspectRatio: 0.95,
    borderRadius: 14,
    borderWidth: 0.5,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 6,
    position: 'relative',
  },
  selectedCheckCircle: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 14,
    height: 14,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  appLabel: {
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
  },
  cardDivider: {
    height: 0.5,
    marginVertical: 16,
  },
  volumeBlock: {
    marginTop: 4,
  },
  volumeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  volumeReadout: {
    fontSize: 17,
    fontWeight: '700',
  },
  presetChipsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  volPresetChip: {
    flex: 1,
    height: 34,
    borderRadius: 9999,
    borderWidth: 0.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  volPresetText: {
    fontSize: 12,
    fontWeight: '600',
  },
  quietActionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 14,
  },
  quietBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 34,
    paddingHorizontal: 14,
    borderRadius: 9999,
    borderWidth: 0.5,
  },
  quietBtnText: {
    fontSize: 12,
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
