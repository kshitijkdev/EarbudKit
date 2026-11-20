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
  StatusChip,
  Toggle,
  NeonSlider,
  SectionHeader,
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
    const summary = msgs.length > 0 ? msgs.join(' • ') : 'Connect actions executed';
    setTestResult(`✓ Connect Profile Executed: ${summary}`);
    showToast(`✓ Tested Connect: ${summary}`);
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
    const summary = msgs.length > 0 ? msgs.join(' • ') : 'Disconnect actions executed';
    setTestResult(`✓ Disconnect Profile Executed: ${summary}`);
    showToast(`✓ Tested Disconnect: ${summary}`);
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
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + 24 }]}>
        <GlassCard style={styles.platformCard}>
          <Text style={styles.largeEmoji}>🍎</Text>
          <Text style={[styles.headerTitle, { color: colors.onSurface }]}>iOS Not Supported</Text>
          <Text style={[styles.bodyText, { color: colors.onSurfaceVariant, textAlign: 'center', marginTop: 8 }]}>
            Auto-actions (app launching, volume adjustments, and media pausing) require Android system APIs.
          </Text>
        </GlassCard>
      </View>
    );
  }

  if (trackedDevices.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + 24 }]}>
        <GlassCard style={styles.platformCard}>
          <Text style={styles.largeEmoji}>⚡</Text>
          <Text style={[styles.headerTitle, { color: colors.onSurface }]}>No Devices Tracked</Text>
          <Text style={[styles.bodyText, { color: colors.onSurfaceVariant, textAlign: 'center', marginTop: 8 }]}>
            Add a device first to set up auto-launching apps, volume presets, and disconnect pausing.
          </Text>
          <View style={{ marginTop: 20 }}>
            <PillButton
              variant="primary"
              size="md"
              label="Go to Devices Screen"
              onPress={() => router.push('/devices')}
            />
          </View>
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
        {/* Title / Context Framing */}
        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.headerTitle, { color: colors.onSurface }]}>Auto Actions</Text>
            <Text style={[styles.headerSubtitle, { color: colors.onSurfaceVariant }]}>
              Context triggers executed on hardware handshake.
            </Text>
          </View>

          <StatusChip
            label="ENGINE LIVE"
            dotColor="lime"
            pulse
          />
        </View>

        {/* Device Selector Pill Tabs */}
        <View style={styles.selectorSection}>
          <Text style={[styles.sectionLabel, { color: colors.outline }]}>
            CONFIGURE PROFILE FOR:
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.devicePillsRow}
          >
            {trackedDevices.map((dev) => {
              const isSelected = dev.address === selectedAddress;
              return (
                <TouchableOpacity
                  key={dev.address}
                  style={[
                    styles.devicePill,
                    {
                      backgroundColor: isSelected
                        ? colors.primary
                        : colors.surfaceContainerHigh,
                      borderColor: isSelected ? colors.primary : 'transparent',
                    },
                  ]}
                  onPress={() => {
                    setSelectedAddress(dev.address);
                    showToast(`✓ Selected: ${dev.nickname}`);
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={{ fontSize: 16 }}>
                    {dev.icon === 'headphones' ? '🎧' : '🎧'}
                  </Text>
                  <Text
                    style={[
                      styles.devicePillText,
                      {
                        color: isSelected ? colors.onPrimary : colors.onSurface,
                        fontWeight: isSelected ? '700' : '500',
                      },
                    ]}
                  >
                    {dev.nickname}
                  </Text>
                  {dev.isConnected && (
                    <View
                      style={[
                        styles.onlineDot,
                        { backgroundColor: isSelected ? colors.tertiary : colors.tertiary },
                      ]}
                    />
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Test Result Execution Banner */}
        {testResult && (
          <GlassCard style={styles.testResultCard} glow>
            <Text style={[styles.testResultText, { color: colors.tertiary }]}>
              {testResult}
            </Text>
          </GlassCard>
        )}

        {currentProfile && (
          <>
            {/* CARD 1: WHEN IT CONNECTS CARD */}
            <GlassCard
              glow={currentProfile.onConnect.enabled}
              style={[
                styles.profileCard,
                currentProfile.onConnect.enabled && {
                  borderColor: colors.primary,
                  borderWidth: 1.5,
                },
              ]}
            >
              {/* Card Header */}
              <View style={styles.cardHeader}>
                <View style={styles.cardTitleGroup}>
                  <View style={[styles.iconCircle, { backgroundColor: colors.primary + '25' }]}>
                    <Text style={{ fontSize: 20 }}>⚡</Text>
                  </View>
                  <View>
                    <Text style={[styles.cardTitle, { color: colors.onSurface }]}>
                      When Hardware Links
                    </Text>
                    <Text style={[styles.cardSublabel, { color: colors.tertiary }]}>
                      HANDSHAKE SEQUENCE
                    </Text>
                  </View>
                </View>

                <Toggle
                  value={currentProfile.onConnect.enabled}
                  onValueChange={(val) => {
                    if (selectedAddress) {
                      updateConnectAction(selectedAddress, { enabled: val });
                      showToast(val ? '✓ Auto-actions enabled on connect' : 'Auto-actions disabled on connect');
                    }
                  }}
                />
              </View>

              {currentProfile.onConnect.enabled && (
                <View style={styles.cardContent}>
                  {/* Sub-section 1: Auto-Launch Target */}
                  <View style={styles.subSection}>
                    <View style={styles.subSectionHeader}>
                      <Text style={[styles.subSectionTitle, { color: colors.onSurface }]}>
                        🚀 Auto-Launch Target
                      </Text>
                      <Text style={[styles.subSectionMeta, { color: colors.outline }]}>
                        SELECT ONE
                      </Text>
                    </View>

                    {/* App Grid */}
                    <View style={styles.appGrid}>
                      {MEDIA_APP_OPTIONS.map((app) => {
                        const isPicked =
                          currentProfile.onConnect.launchAppPackage ===
                          app.packageName;
                        return (
                          <TouchableOpacity
                            key={app.packageName}
                            style={[
                              styles.appTile,
                              {
                                backgroundColor: isPicked
                                  ? colors.primary + '25'
                                  : colors.surfaceContainerLowest,
                                borderColor: isPicked
                                  ? colors.primary
                                  : colors.outlineVariant,
                                borderWidth: isPicked ? 2 : 1,
                              },
                            ]}
                            onPress={() => {
                              if (selectedAddress) {
                                const newPackage = isPicked ? null : app.packageName;
                                const newLabel = isPicked ? null : app.label;
                                updateConnectAction(selectedAddress, {
                                  launchAppPackage: newPackage,
                                  launchAppLabel: newLabel,
                                });
                                showToast(
                                  isPicked
                                    ? 'Auto-launch removed'
                                    : `✓ Auto-launch: ${app.label}`
                                );
                              }
                            }}
                            activeOpacity={0.8}
                          >
                            {isPicked && (
                              <View style={[styles.pickedCheckBadge, { backgroundColor: colors.tertiary }]}>
                                <Text style={styles.pickedCheckText}>✓</Text>
                              </View>
                            )}
                            <Text style={styles.appIconEmoji}>{app.icon}</Text>
                            <Text
                              style={[
                                styles.appLabel,
                                {
                                  color: isPicked ? colors.primary : colors.onSurface,
                                  fontWeight: isPicked ? '700' : '500',
                                },
                              ]}
                              numberOfLines={1}
                            >
                              {app.label}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>

                  {/* Sub-section 2: Auto-Set Media Gain */}
                  <View style={[styles.volumeSection, { backgroundColor: colors.surfaceContainerLowest + '80' }]}>
                    <View style={styles.volumeHeader}>
                      <View>
                        <Text style={[styles.subSectionTitle, { color: colors.onSurface }]}>
                          🔊 Auto-Set Media Gain
                        </Text>
                        <Text style={[styles.volumeSubtitle, { color: colors.onSurfaceVariant }]}>
                          Smooth gain preset upon driver init
                        </Text>
                      </View>
                      <Text style={[styles.volumeHeroNumber, { color: colors.secondary }]}>
                        {currentProfile.onConnect.setVolume !== null
                          ? `${currentProfile.onConnect.setVolume}%`
                          : 'Off'}
                      </Text>
                    </View>

                    {/* Volume NeonSlider */}
                    {currentProfile.onConnect.setVolume !== null && (
                      <View style={{ marginVertical: 8 }}>
                        <NeonSlider
                          value={currentProfile.onConnect.setVolume}
                          min={0}
                          max={100}
                          step={5}
                          onValueChange={(val) => {
                            if (selectedAddress) {
                              updateConnectAction(selectedAddress, { setVolume: val });
                            }
                          }}
                          formatValue={(v) => `${v}%`}
                          showSteppers={false}
                        />
                      </View>
                    )}

                    {/* Quick Preset Volume Pills */}
                    <View style={styles.volumePresetsRow}>
                      {[null, 30, 50, 75, 85, 100].map((vol) => {
                        const isPicked =
                          currentProfile.onConnect.setVolume === vol;
                        return (
                          <TouchableOpacity
                            key={String(vol)}
                            style={[
                              styles.volumePresetPill,
                              {
                                backgroundColor: isPicked
                                  ? colors.secondary + '30'
                                  : colors.surfaceContainerHigh,
                                borderColor: isPicked
                                  ? colors.secondary
                                  : 'transparent',
                              },
                            ]}
                            onPress={() => {
                              if (selectedAddress) {
                                updateConnectAction(selectedAddress, { setVolume: vol });
                                showToast(
                                  vol === null
                                    ? 'Volume automation disabled'
                                    : `✓ On-connect volume: ${vol}%`
                                );
                              }
                            }}
                          >
                            <Text
                              style={[
                                styles.volumePresetText,
                                {
                                  color: isPicked
                                    ? colors.secondary
                                    : colors.onSurface,
                                  fontWeight: isPicked ? '700' : '500',
                                },
                              ]}
                            >
                              {vol === null ? 'Off' : `${vol}%`}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>

                  {/* Sub-section 3: Do Not Disturb Mode */}
                  <View style={[styles.dndSection, { backgroundColor: colors.surfaceContainerLowest + '80' }]}>
                    <View style={styles.dndInfoGroup}>
                      <View style={[styles.iconBoxSmall, { backgroundColor: colors.secondary + '20' }]}>
                        <Text style={{ fontSize: 16 }}>🌙</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.dndTitle, { color: colors.onSurface }]}>
                          Enable Do Not Disturb
                        </Text>
                        <Text style={[styles.dndSubtitle, { color: colors.onSurfaceVariant }]}>
                          Silence calls & alerts during active session
                        </Text>
                      </View>
                    </View>

                    <Toggle
                      value={currentProfile.onConnect.enableDnd}
                      onValueChange={(val) => {
                        if (val && !hasDndPermission) {
                          handleRequestDnd();
                        } else if (selectedAddress) {
                          updateConnectAction(selectedAddress, { enableDnd: val });
                          showToast(
                            val
                              ? '✓ Do Not Disturb enabled on connect'
                              : 'Do Not Disturb disabled'
                          );
                        }
                      }}
                    />
                  </View>

                  {/* Test Connect Profile Button */}
                  <View style={styles.testButtonWrapper}>
                    <PillButton
                      variant="ghost"
                      size="sm"
                      label="▶ Test Connect Profile"
                      onPress={() => { handleTestConnect(); }}
                    />
                  </View>
                </View>
              )}
            </GlassCard>

            {/* CARD 2: WHEN DISCONNECTED CARD */}
            <GlassCard
              glow={currentProfile.onDisconnect.enabled}
              style={[
                styles.profileCard,
                currentProfile.onDisconnect.enabled && {
                  borderColor: colors.tertiary,
                  borderWidth: 1.5,
                },
              ]}
            >
              {/* Card Header */}
              <View style={styles.cardHeader}>
                <View style={styles.cardTitleGroup}>
                  <View style={[styles.iconCircle, { backgroundColor: colors.tertiary + '25' }]}>
                    <Text style={{ fontSize: 20 }}>⏹️</Text>
                  </View>
                  <View>
                    <Text style={[styles.cardTitle, { color: colors.onSurface }]}>
                      When Disconnected
                    </Text>
                    <Text style={[styles.cardSublabel, { color: colors.outline }]}>
                      FAILSAFE ROUTINES
                    </Text>
                  </View>
                </View>

                <Toggle
                  value={currentProfile.onDisconnect.enabled}
                  onValueChange={(val) => {
                    if (selectedAddress) {
                      updateDisconnectAction(selectedAddress, { enabled: val });
                      showToast(
                        val
                          ? '✓ Auto-actions enabled on disconnect'
                          : 'Auto-actions disabled on disconnect'
                      );
                    }
                  }}
                />
              </View>

              {currentProfile.onDisconnect.enabled && (
                <View style={styles.cardContent}>
                  {/* Failsafe 1: Pause Media Playback */}
                  <View style={[styles.failsafeRow, { backgroundColor: colors.surfaceContainerLowest + '80' }]}>
                    <View style={styles.failsafeInfo}>
                      <View style={[styles.iconBoxSmall, { backgroundColor: colors.tertiary + '20' }]}>
                        <Text style={{ fontSize: 16 }}>⏸️</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.dndTitle, { color: colors.onSurface }]}>
                          Halt media playback instantly
                        </Text>
                        <Text style={[styles.dndSubtitle, { color: colors.onSurfaceVariant }]}>
                          Prevents accidental phone speaker broadcast
                        </Text>
                      </View>
                    </View>

                    <Toggle
                      value={currentProfile.onDisconnect.pauseMedia}
                      onValueChange={(val) => {
                        if (selectedAddress) {
                          updateDisconnectAction(selectedAddress, { pauseMedia: val });
                          showToast(
                            val
                              ? '✓ Auto-pause playback enabled'
                              : 'Auto-pause playback disabled'
                          );
                        }
                      }}
                    />
                  </View>

                  {/* Failsafe 2: Reset Volume Option */}
                  <View style={[styles.volumeSection, { backgroundColor: colors.surfaceContainerLowest + '80' }]}>
                    <View style={styles.volumeHeader}>
                      <View>
                        <Text style={[styles.subSectionTitle, { color: colors.onSurface }]}>
                          🔉 Reset Media Volume
                        </Text>
                        <Text style={[styles.volumeSubtitle, { color: colors.onSurfaceVariant }]}>
                          Standardized device fallback
                        </Text>
                      </View>
                      <Text style={[styles.volumeHeroNumber, { color: colors.primary }]}>
                        {currentProfile.onDisconnect.setVolume !== null
                          ? `${currentProfile.onDisconnect.setVolume}%`
                          : 'Keep'}
                      </Text>
                    </View>

                    <View style={styles.volumePresetsRow}>
                      {[null, 15, 30, 50].map((vol) => {
                        const isPicked =
                          currentProfile.onDisconnect.setVolume === vol;
                        return (
                          <TouchableOpacity
                            key={String(vol)}
                            style={[
                              styles.volumePresetPill,
                              {
                                backgroundColor: isPicked
                                  ? colors.primary + '30'
                                  : colors.surfaceContainerHigh,
                                borderColor: isPicked
                                  ? colors.primary
                                  : 'transparent',
                              },
                            ]}
                            onPress={() => {
                              if (selectedAddress) {
                                updateDisconnectAction(selectedAddress, { setVolume: vol });
                                showToast(
                                  vol === null
                                    ? 'Reset volume disabled'
                                    : `✓ On-disconnect volume: ${vol}%`
                                );
                              }
                            }}
                          >
                            <Text
                              style={[
                                styles.volumePresetText,
                                {
                                  color: isPicked ? colors.primary : colors.onSurface,
                                  fontWeight: isPicked ? '700' : '500',
                                },
                              ]}
                            >
                              {vol === null ? 'Keep' : `${vol}%`}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>

                  {/* Failsafe 3: Disable DND */}
                  <View style={[styles.failsafeRow, { backgroundColor: colors.surfaceContainerLowest + '80' }]}>
                    <View style={styles.failsafeInfo}>
                      <View style={[styles.iconBoxSmall, { backgroundColor: colors.secondary + '20' }]}>
                        <Text style={{ fontSize: 16 }}>☀️</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.dndTitle, { color: colors.onSurface }]}>
                          Turn off Do Not Disturb
                        </Text>
                        <Text style={[styles.dndSubtitle, { color: colors.onSurfaceVariant }]}>
                          Restore system ringer & notifications
                        </Text>
                      </View>
                    </View>

                    <Toggle
                      value={currentProfile.onDisconnect.disableDnd}
                      onValueChange={(val) => {
                        if (selectedAddress) {
                          updateDisconnectAction(selectedAddress, { disableDnd: val });
                          showToast(
                            val
                              ? '✓ Disable DND on disconnect enabled'
                              : 'Disable DND disabled'
                          );
                        }
                      }}
                    />
                  </View>

                  {/* Test Disconnect Profile Button */}
                  <View style={styles.testButtonWrapper}>
                    <PillButton
                      variant="ghost"
                      size="sm"
                      label="▶ Test Disconnect Profile"
                      onPress={() => { handleTestDisconnect(); }}
                    />
                  </View>
                </View>
              )}
            </GlassCard>

            {/* Bottom Master CTA Button */}
            <View style={{ marginTop: 8 }}>
              <PillButton
                variant="primary"
                size="lg"
                label="⚡ Test Full Automation Flow"
                onPress={() => { handleTestConnect(); }}
              />
            </View>
          </>
        )}
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
    gap: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 22,
    letterSpacing: -0.5,
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
  selectorSection: {
    gap: 8,
  },
  sectionLabel: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 11,
    letterSpacing: 1.2,
  },
  devicePillsRow: {
    gap: 8,
  },
  devicePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 9999,
    borderWidth: 1,
  },
  devicePillText: {
    fontFamily: 'SpaceGrotesk-SemiBold',
    fontSize: 13,
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  testResultCard: {
    padding: 14,
  },
  testResultText: {
    fontFamily: 'SpaceGrotesk-SemiBold',
    fontSize: 13,
    textAlign: 'center',
  },
  profileCard: {
    padding: 18,
    gap: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 17,
    letterSpacing: -0.3,
  },
  cardSublabel: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 10,
    letterSpacing: 1,
    marginTop: 1,
  },
  cardContent: {
    gap: 16,
  },
  subSection: {
    gap: 10,
  },
  subSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  subSectionTitle: {
    fontFamily: 'SpaceGrotesk-SemiBold',
    fontSize: 14,
  },
  subSectionMeta: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 10,
    letterSpacing: 1,
  },
  appGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  appTile: {
    width: '31%',
    flexGrow: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    minHeight: 72,
  },
  pickedCheckBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickedCheckText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#000',
  },
  appIconEmoji: {
    fontSize: 22,
    marginBottom: 4,
  },
  appLabel: {
    fontFamily: 'SpaceGrotesk-Medium',
    fontSize: 12,
    textAlign: 'center',
  },
  volumeSection: {
    padding: 14,
    borderRadius: 16,
    gap: 10,
  },
  volumeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  volumeSubtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    marginTop: 2,
  },
  volumeHeroNumber: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 26,
    letterSpacing: -0.5,
  },
  volumePresetsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  volumePresetPill: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  volumePresetText: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 12,
  },
  dndSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 16,
  },
  dndInfoGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  iconBoxSmall: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dndTitle: {
    fontFamily: 'SpaceGrotesk-SemiBold',
    fontSize: 13,
  },
  dndSubtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 11,
    marginTop: 1,
  },
  testButtonWrapper: {
    alignItems: 'flex-end',
    paddingTop: 4,
  },
  failsafeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 16,
  },
  failsafeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
});
