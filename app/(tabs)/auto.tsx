import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Platform,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../src/theme';
import {
  useDeviceStore,
  useAutoStore,
  MEDIA_APP_OPTIONS,
  AppOption,
  TrackedDevice,
} from '../../src/store';
import {
  isDndPermissionGranted,
  openDndSettings,
} from '../../modules/earbud-native';

export default function AutoScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { colors, borderRadius } = theme;

  const trackedDevicesMap = useDeviceStore((s) => s.trackedDevices);
  const activeDeviceAddress = useDeviceStore((s) => s.activeDeviceAddress);
  const trackedDevices = Object.values(trackedDevicesMap);

  // Selected device for auto-actions
  const [selectedAddress, setSelectedAddress] = useState<string | null>(null);
  const [hasDndPermission, setHasDndPermission] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

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

  const getProfile = useAutoStore((s) => s.getProfile);
  const updateConnectAction = useAutoStore((s) => s.updateConnectAction);
  const updateDisconnectAction = useAutoStore((s) => s.updateDisconnectAction);
  const executeConnectProfile = useAutoStore((s) => s.executeConnectProfile);
  const executeDisconnectProfile = useAutoStore((s) => s.executeDisconnectProfile);

  const currentProfile = selectedAddress
    ? getProfile(selectedAddress, selectedDevice?.name)
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
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.emptyCard, { backgroundColor: colors.surfaceContainer, borderRadius: borderRadius.lg }]}>
          <Text style={styles.largeEmoji}>🍎</Text>
          <Text style={[styles.title, { color: colors.onSurface }]}>iOS Not Supported</Text>
          <Text style={[styles.subtitle, { color: colors.onSurfaceVariant }]}>
            Auto-actions (app launching, volume adjustments, and media pausing) require Android system APIs.
          </Text>
        </View>
      </View>
    );
  }

  if (trackedDevices.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.emptyCard, { backgroundColor: colors.surfaceContainer, borderRadius: borderRadius.lg }]}>
          <Text style={styles.largeEmoji}>⚡</Text>
          <Text style={[styles.title, { color: colors.onSurface }]}>No Devices Tracked</Text>
          <Text style={[styles.subtitle, { color: colors.onSurfaceVariant }]}>
            Add a device first to set up auto-launching apps, volume presets, and disconnect pausing.
          </Text>
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: colors.primary, borderRadius: borderRadius.sm }]}
            onPress={() => router.push('/devices')}
          >
            <Text style={[styles.primaryBtnText, { color: colors.onPrimary }]}>
              Go to Devices Screen
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.scrollContent}
    >
      {/* Device Selector Pill Bar */}
      <Text style={[styles.sectionLabel, { color: colors.onSurfaceVariant }]}>
        Configure Profile For:
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
                    ? colors.primaryContainer
                    : colors.surfaceContainer,
                  borderColor: isSelected ? colors.primary : colors.outlineVariant,
                  borderRadius: borderRadius.full,
                },
              ]}
              onPress={() => setSelectedAddress(dev.address)}
            >
              <Text style={styles.pillEmoji}>
                {dev.icon === 'earbuds' ? '🎧' : '🎧'}
              </Text>
              <Text
                style={[
                  styles.pillText,
                  {
                    color: isSelected
                      ? colors.onPrimaryContainer
                      : colors.onSurface,
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
                    { backgroundColor: colors.primary },
                  ]}
                />
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Test Execution Result Banner */}
      {testResult && (
        <View
          style={[
            styles.resultBanner,
            {
              backgroundColor: colors.primaryContainer,
              borderRadius: borderRadius.md,
            },
          ]}
        >
          <Text
            style={[
              styles.resultText,
              { color: colors.onPrimaryContainer },
            ]}
          >
            {testResult}
          </Text>
        </View>
      )}

      {currentProfile && (
        <>
          {/* CARD 1: ON-CONNECT PROFILE */}
          <View
            style={[
              styles.profileCard,
              {
                backgroundColor: colors.surfaceContainer,
                borderRadius: borderRadius.xl,
                borderColor: colors.outlineVariant,
              },
            ]}
          >
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderTitleGroup}>
                <Text style={styles.headerEmoji}>⚡</Text>
                <View>
                  <Text style={[styles.cardTitle, { color: colors.onSurface }]}>
                    On Connect
                  </Text>
                  <Text
                    style={[
                      styles.cardDesc,
                      { color: colors.onSurfaceVariant },
                    ]}
                  >
                    Triggered when {selectedDevice?.nickname} connects
                  </Text>
                </View>
              </View>

              <Switch
                value={currentProfile.onConnect.enabled}
                onValueChange={(val) => {
                  if (selectedAddress) {
                    updateConnectAction(selectedAddress, { enabled: val });
                  }
                }}
                thumbColor={
                  currentProfile.onConnect.enabled
                    ? colors.primary
                    : colors.outline
                }
                trackColor={{
                  false: colors.surfaceVariant,
                  true: colors.primaryContainer,
                }}
              />
            </View>

            {currentProfile.onConnect.enabled && (
              <View style={styles.cardBody}>
                {/* 1. App Launch Selection */}
                <Text
                  style={[styles.inputHeading, { color: colors.onSurface }]}
                >
                  🚀 Launch App on Connect
                </Text>
                <View style={styles.appGrid}>
                  {MEDIA_APP_OPTIONS.map((app) => {
                    const isPicked =
                      currentProfile.onConnect.launchAppPackage ===
                      app.packageName;
                    return (
                      <TouchableOpacity
                        key={app.packageName}
                        style={[
                          styles.appChip,
                          {
                            backgroundColor: isPicked
                              ? colors.primaryContainer
                              : colors.surface,
                            borderColor: isPicked
                              ? colors.primary
                              : colors.outlineVariant,
                            borderRadius: borderRadius.md,
                          },
                        ]}
                        onPress={() =>
                          selectedAddress &&
                          updateConnectAction(selectedAddress, {
                            launchAppPackage: isPicked ? null : app.packageName,
                            launchAppLabel: isPicked ? null : app.label,
                          })
                        }
                      >
                        <Text style={styles.appChipEmoji}>{app.icon}</Text>
                        <Text
                          style={[
                            styles.appChipText,
                            {
                              color: isPicked
                                ? colors.onPrimaryContainer
                                : colors.onSurface,
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

                {/* 2. Media Volume Preset */}
                <Text
                  style={[
                    styles.inputHeading,
                    { color: colors.onSurface, marginTop: 16 },
                  ]}
                >
                  🔊 Set Media Volume
                </Text>
                <View style={styles.volumeRow}>
                  {[null, 30, 50, 70, 85, 100].map((vol) => {
                    const isPicked =
                      currentProfile.onConnect.setVolume === vol;
                    return (
                      <TouchableOpacity
                        key={String(vol)}
                        style={[
                          styles.volumeBtn,
                          {
                            backgroundColor: isPicked
                              ? colors.primaryContainer
                              : colors.surface,
                            borderColor: isPicked
                              ? colors.primary
                              : colors.outlineVariant,
                            borderRadius: borderRadius.sm,
                          },
                        ]}
                        onPress={() =>
                          selectedAddress &&
                          updateConnectAction(selectedAddress, {
                            setVolume: vol,
                          })
                        }
                      >
                        <Text
                          style={[
                            styles.volumeBtnText,
                            {
                              color: isPicked
                                ? colors.onPrimaryContainer
                                : colors.onSurface,
                              fontWeight: isPicked ? '700' : '500',
                            },
                          ]}
                        >
                          {vol === null ? 'None' : `${vol}%`}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* 3. Do Not Disturb Option */}
                <View
                  style={[
                    styles.dndRow,
                    { borderTopColor: colors.outlineVariant },
                  ]}
                >
                  <View style={styles.dndTextGroup}>
                    <Text style={[styles.dndTitle, { color: colors.onSurface }]}>
                      🌙 Turn on Do Not Disturb
                    </Text>
                    <Text
                      style={[
                        styles.dndSubtitle,
                        { color: colors.onSurfaceVariant },
                      ]}
                    >
                      Mute calls & notifications while listening
                    </Text>
                  </View>
                  <Switch
                    value={currentProfile.onConnect.enableDnd}
                    onValueChange={(val) => {
                      if (val && !hasDndPermission) {
                        handleRequestDnd();
                      } else if (selectedAddress) {
                        updateConnectAction(selectedAddress, { enableDnd: val });
                      }
                    }}
                    thumbColor={
                      currentProfile.onConnect.enableDnd
                        ? colors.primary
                        : colors.outline
                    }
                    trackColor={{
                      false: colors.surfaceVariant,
                      true: colors.primaryContainer,
                    }}
                  />
                </View>

                {/* Test Connect Button */}
                <TouchableOpacity
                  style={[
                    styles.testActionBtn,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.outlineVariant,
                      borderRadius: borderRadius.sm,
                    },
                  ]}
                  onPress={handleTestConnect}
                >
                  <Text
                    style={[styles.testActionText, { color: colors.primary }]}
                  >
                    ▶ Test Connect Profile
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* CARD 2: ON-DISCONNECT PROFILE */}
          <View
            style={[
              styles.profileCard,
              {
                backgroundColor: colors.surfaceContainer,
                borderRadius: borderRadius.xl,
                borderColor: colors.outlineVariant,
              },
            ]}
          >
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderTitleGroup}>
                <Text style={styles.headerEmoji}>⏹️</Text>
                <View>
                  <Text style={[styles.cardTitle, { color: colors.onSurface }]}>
                    On Disconnect
                  </Text>
                  <Text
                    style={[
                      styles.cardDesc,
                      { color: colors.onSurfaceVariant },
                    ]}
                  >
                    Triggered when {selectedDevice?.nickname} disconnects
                  </Text>
                </View>
              </View>

              <Switch
                value={currentProfile.onDisconnect.enabled}
                onValueChange={(val) => {
                  if (selectedAddress) {
                    updateDisconnectAction(selectedAddress, { enabled: val });
                  }
                }}
                thumbColor={
                  currentProfile.onDisconnect.enabled
                    ? colors.primary
                    : colors.outline
                }
                trackColor={{
                  false: colors.surfaceVariant,
                  true: colors.primaryContainer,
                }}
              />
            </View>

            {currentProfile.onDisconnect.enabled && (
              <View style={styles.cardBody}>
                {/* 1. Pause Media Switch */}
                <View style={styles.switchRow}>
                  <View style={styles.dndTextGroup}>
                    <Text
                      style={[styles.dndTitle, { color: colors.onSurface }]}
                    >
                      ⏸️ Pause Media Playback
                    </Text>
                    <Text
                      style={[
                        styles.dndSubtitle,
                        { color: colors.onSurfaceVariant },
                      ]}
                    >
                      Immediately pause Spotify, podcasts, YouTube, or music
                    </Text>
                  </View>
                  <Switch
                    value={currentProfile.onDisconnect.pauseMedia}
                    onValueChange={(val) => {
                      if (selectedAddress) {
                        updateDisconnectAction(selectedAddress, {
                          pauseMedia: val,
                        });
                      }
                    }}
                    thumbColor={
                      currentProfile.onDisconnect.pauseMedia
                        ? colors.primary
                        : colors.outline
                    }
                    trackColor={{
                      false: colors.surfaceVariant,
                      true: colors.primaryContainer,
                    }}
                  />
                </View>

                {/* 2. Reset Volume Option */}
                <Text
                  style={[
                    styles.inputHeading,
                    { color: colors.onSurface, marginTop: 16 },
                  ]}
                >
                  🔉 Reset Media Volume on Disconnect
                </Text>
                <View style={styles.volumeRow}>
                  {[null, 15, 30, 50].map((vol) => {
                    const isPicked =
                      currentProfile.onDisconnect.setVolume === vol;
                    return (
                      <TouchableOpacity
                        key={String(vol)}
                        style={[
                          styles.volumeBtn,
                          {
                            backgroundColor: isPicked
                              ? colors.primaryContainer
                              : colors.surface,
                            borderColor: isPicked
                              ? colors.primary
                              : colors.outlineVariant,
                            borderRadius: borderRadius.sm,
                          },
                        ]}
                        onPress={() =>
                          selectedAddress &&
                          updateDisconnectAction(selectedAddress, {
                            setVolume: vol,
                          })
                        }
                      >
                        <Text
                          style={[
                            styles.volumeBtnText,
                            {
                              color: isPicked
                                ? colors.onPrimaryContainer
                                : colors.onSurface,
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

                {/* 3. Turn off DND Switch */}
                <View
                  style={[
                    styles.switchRow,
                    { borderTopColor: colors.outlineVariant, marginTop: 14 },
                  ]}
                >
                  <View style={styles.dndTextGroup}>
                    <Text
                      style={[styles.dndTitle, { color: colors.onSurface }]}
                    >
                      ☀️ Turn off Do Not Disturb
                    </Text>
                    <Text
                      style={[
                        styles.dndSubtitle,
                        { color: colors.onSurfaceVariant },
                      ]}
                    >
                      Restore normal notification volume on disconnect
                    </Text>
                  </View>
                  <Switch
                    value={currentProfile.onDisconnect.disableDnd}
                    onValueChange={(val) => {
                      if (selectedAddress) {
                        updateDisconnectAction(selectedAddress, {
                          disableDnd: val,
                        });
                      }
                    }}
                    thumbColor={
                      currentProfile.onDisconnect.disableDnd
                        ? colors.primary
                        : colors.outline
                    }
                    trackColor={{
                      false: colors.surfaceVariant,
                      true: colors.primaryContainer,
                    }}
                  />
                </View>

                {/* Test Disconnect Button */}
                <TouchableOpacity
                  style={[
                    styles.testActionBtn,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.outlineVariant,
                      borderRadius: borderRadius.sm,
                    },
                  ]}
                  onPress={handleTestDisconnect}
                >
                  <Text
                    style={[styles.testActionText, { color: colors.primary }]}
                  >
                    ▶ Test Disconnect Profile
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </>
      )}
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
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  devicePillsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
    paddingVertical: 2,
  },
  devicePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderWidth: 1.5,
    gap: 8,
  },
  pillEmoji: {
    fontSize: 18,
  },
  pillText: {
    fontSize: 14,
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  resultBanner: {
    padding: 12,
    marginBottom: 14,
  },
  resultText: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  profileCard: {
    borderWidth: 1,
    marginBottom: 16,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 18,
  },
  cardHeaderTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  headerEmoji: {
    fontSize: 26,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  cardDesc: {
    fontSize: 12,
    marginTop: 1,
  },
  cardBody: {
    paddingHorizontal: 18,
    paddingBottom: 18,
    gap: 10,
  },
  inputHeading: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
  },
  appGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  appChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    gap: 6,
  },
  appChipEmoji: {
    fontSize: 16,
  },
  appChipText: {
    fontSize: 13,
  },
  volumeRow: {
    flexDirection: 'row',
    gap: 6,
  },
  volumeBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderWidth: 1,
  },
  volumeBtnText: {
    fontSize: 12,
  },
  dndRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 0.5,
    paddingTop: 12,
    marginTop: 8,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 6,
  },
  dndTextGroup: {
    flex: 1,
    paddingRight: 12,
  },
  dndTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  dndSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  testActionBtn: {
    marginTop: 14,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
  },
  testActionText: {
    fontSize: 13,
    fontWeight: '700',
  },
  emptyCard: {
    padding: 32,
    alignItems: 'center',
    marginTop: 30,
  },
  largeEmoji: {
    fontSize: 50,
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  primaryBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  primaryBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
