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
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../src/theme';
import {
  useDeviceStore,
  TrackedDevice,
  DeviceLocation,
} from '../../src/store';
import {
  startRssiScan,
  stopRssiScan,
  addRssiListener,
  isRssiScanning,
} from '../../modules/earbud-native';
import {
  captureCurrentLocation,
  openGoogleMapsNavigation,
  requestLocationPermissions,
} from '../../src/services/location';

export default function ToolsScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { colors, borderRadius } = theme;

  const trackedDevicesMap = useDeviceStore((s) => s.trackedDevices);
  const activeDeviceAddress = useDeviceStore((s) => s.activeDeviceAddress);
  const trackedDevices = Object.values(trackedDevicesMap);

  const [selectedAddress, setSelectedAddress] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [currentRssi, setCurrentRssi] = useState<number | null>(null);
  const [isCapturingLocation, setIsCapturingLocation] = useState(false);
  const [locationActionFeedback, setLocationActionFeedback] = useState<string | null>(null);

  // Keep a selected device
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

  const setDeviceLocation = useDeviceStore((s) => s.setDeviceLocation);
  const setDisconnectAlert = useDeviceStore((s) => s.setDisconnectAlert);
  const triggerTestDisconnectAlert = useDeviceStore((s) => s.triggerTestDisconnectAlert);

  // Subscribe to live BLE RSSI scan events
  useEffect(() => {
    const rssiSub = addRssiListener((event) => {
      if (
        selectedAddress &&
        event.address.toLowerCase() === selectedAddress.toLowerCase()
      ) {
        setCurrentRssi(event.rssi);
      }
    });

    return () => {
      rssiSub.remove();
      if (isRssiScanning()) {
        stopRssiScan();
      }
    };
  }, [selectedAddress]);

  const handleToggleRssiScan = () => {
    if (Platform.OS !== 'android' || !selectedAddress) return;

    if (isScanning) {
      stopRssiScan();
      setIsScanning(false);
      setCurrentRssi(null);
    } else {
      const started = startRssiScan(selectedAddress);
      setIsScanning(started);
      if (!started) {
        Alert.alert(
          'Scan Notice',
          'Ensure Bluetooth and Location permissions are enabled on your device to search nearby.'
        );
      }
    }
  };

  const handleManualCaptureLocation = async () => {
    if (!selectedAddress) return;
    setIsCapturingLocation(true);
    try {
      const hasPerm = await requestLocationPermissions();
      if (!hasPerm) {
        Alert.alert(
          'Location Permission Needed',
          'EarbudKit needs location access to save where your audio device was last seen.'
        );
        return;
      }

      const loc = await captureCurrentLocation();
      if (loc) {
        setDeviceLocation(selectedAddress, loc);
        setLocationActionFeedback('✓ Current location saved as last-seen point!');
        setTimeout(() => setLocationActionFeedback(null), 4000);
      } else {
        // Fallback demo location for testing if emulator has no GPS fix
        const demoLoc: DeviceLocation = {
          latitude: 37.7749,
          longitude: -122.4194,
          accuracy: 5,
          timestamp: Date.now(),
          addressText: 'Market St & 4th, San Francisco, CA',
        };
        setDeviceLocation(selectedAddress, demoLoc);
        setLocationActionFeedback('✓ Simulated location saved for testing!');
        setTimeout(() => setLocationActionFeedback(null), 4000);
      }
    } finally {
      setIsCapturingLocation(false);
    }
  };

  const handleNavigate = () => {
    if (!selectedDevice?.lastLocation) return;
    const { latitude, longitude } = selectedDevice.lastLocation;
    openGoogleMapsNavigation(latitude, longitude);
  };

  const handleTestDisconnectAlert = async () => {
    if (!selectedAddress) return;
    const sent = await triggerTestDisconnectAlert(selectedAddress);
    if (sent) {
      Alert.alert('Alert Dispatched', 'Disconnect drop notification delivered!');
    }
  };

  // Convert RSSI dBm into proximity meter percentage (0-100) and warmth category
  const calculateProximity = (rssi: number | null) => {
    if (rssi === null) return { percent: 0, label: 'Scanning for signal...', color: colors.outline };
    // Normal BLE RSSI spans roughly -100 dBm (very weak) to -40 dBm (right next to device)
    const clamped = Math.min(Math.max(rssi, -100), -40);
    const percent = Math.round(((clamped - -100) / (-40 - -100)) * 100);

    if (rssi >= -55) {
      return { percent, label: '🔥 HOT! Very Close (Within 1-2m)', color: colors.error };
    } else if (rssi >= -75) {
      return { percent, label: '♨️ WARMER! Approaching Device', color: colors.warning };
    } else {
      return { percent, label: '❄️ COLD. Weak Signal (Far away)', color: colors.primary };
    }
  };

  const proximity = calculateProximity(currentRssi);

  if (Platform.OS !== 'android') {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.card, { backgroundColor: colors.surfaceContainer, borderRadius: borderRadius.lg }]}>
          <Text style={styles.largeEmoji}>🍎</Text>
          <Text style={[styles.title, { color: colors.onSurface }]}>iOS Not Supported</Text>
          <Text style={[styles.subtitle, { color: colors.onSurfaceVariant }]}>
            Find My Device and Bluetooth RSSI proximity scanning require Android Bluetooth and Location APIs.
          </Text>
        </View>
      </View>
    );
  }

  if (trackedDevices.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.card, { backgroundColor: colors.surfaceContainer, borderRadius: borderRadius.lg }]}>
          <Text style={styles.largeEmoji}>📍</Text>
          <Text style={[styles.title, { color: colors.onSurface }]}>No Devices Tracked</Text>
          <Text style={[styles.subtitle, { color: colors.onSurfaceVariant }]}>
            Add a device to view its last known disconnect location on a map and search with the BLE proximity radar.
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
        Select Device:
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
              onPress={() => {
                if (isScanning) {
                  stopRssiScan();
                  setIsScanning(false);
                  setCurrentRssi(null);
                }
                setSelectedAddress(dev.address);
              }}
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
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Action feedback banner */}
      {locationActionFeedback && (
        <View
          style={[
            styles.feedbackBanner,
            {
              backgroundColor: colors.primaryContainer,
              borderRadius: borderRadius.md,
            },
          ]}
        >
          <Text style={[styles.feedbackText, { color: colors.onPrimaryContainer }]}>
            {locationActionFeedback}
          </Text>
        </View>
      )}

      {selectedDevice && (
        <>
          {/* CARD 1: LAST KNOWN LOCATION & MAP */}
          <View
            style={[
              styles.toolCard,
              {
                backgroundColor: colors.surfaceContainer,
                borderRadius: borderRadius.xl,
                borderColor: colors.outlineVariant,
              },
            ]}
          >
            <View style={styles.cardHeader}>
              <View style={styles.headerLeft}>
                <Text style={styles.cardEmoji}>📍</Text>
                <View>
                  <Text style={[styles.cardTitle, { color: colors.onSurface }]}>
                    Last Known Location
                  </Text>
                  <Text style={[styles.cardDesc, { color: colors.onSurfaceVariant }]}>
                    Saved automatically whenever device disconnects
                  </Text>
                </View>
              </View>
            </View>

            {selectedDevice.lastLocation ? (
              <View style={styles.locationBody}>
                {/* Visual Map Representation Card */}
                <View
                  style={[
                    styles.mapMockCard,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.outlineVariant,
                      borderRadius: borderRadius.lg,
                    },
                  ]}
                >
                  <View style={styles.mapPinRow}>
                    <Text style={styles.bigPinEmoji}>📌</Text>
                    <View style={styles.mapPinDetails}>
                      <Text
                        style={[
                          styles.locationAddressText,
                          { color: colors.onSurface },
                        ]}
                      >
                        {selectedDevice.lastLocation.addressText ||
                          'Coordinates Recorded'}
                      </Text>
                      <Text
                        style={[
                          styles.locationCoordsText,
                          { color: colors.onSurfaceVariant },
                        ]}
                      >
                        {selectedDevice.lastLocation.latitude.toFixed(6)}° N,{' '}
                        {selectedDevice.lastLocation.longitude.toFixed(6)}° E
                      </Text>
                      <Text
                        style={[
                          styles.locationAccuracyText,
                          { color: colors.onSurfaceVariant },
                        ]}
                      >
                        Accuracy: ±
                        {Math.round(
                          selectedDevice.lastLocation.accuracy ?? 10
                        )}
                        m •{' '}
                        {new Date(
                          selectedDevice.lastLocation.timestamp
                        ).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Navigate Button */}
                <TouchableOpacity
                  style={[
                    styles.navigateBtn,
                    {
                      backgroundColor: colors.primary,
                      borderRadius: borderRadius.md,
                    },
                  ]}
                  onPress={handleNavigate}
                >
                  <Text
                    style={[styles.navigateBtnText, { color: colors.onPrimary }]}
                  >
                    🧭 Navigate in Google Maps
                  </Text>
                </TouchableOpacity>

                {/* Simulate / Update Location Button */}
                <TouchableOpacity
                  style={[
                    styles.secondaryBtn,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.outlineVariant,
                      borderRadius: borderRadius.md,
                    },
                  ]}
                  onPress={handleManualCaptureLocation}
                  disabled={isCapturingLocation}
                >
                  {isCapturingLocation ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <Text
                      style={[
                        styles.secondaryBtnText,
                        { color: colors.onSurface },
                      ]}
                    >
                      📍 Update Location Now
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.noLocationContainer}>
                <Text style={styles.dimEmoji}>🗺️</Text>
                <Text
                  style={[styles.noLocationTitle, { color: colors.onSurface }]}
                >
                  No Location Saved Yet
                </Text>
                <Text
                  style={[
                    styles.noLocationDesc,
                    { color: colors.onSurfaceVariant },
                  ]}
                >
                  Disconnect coordinates will be captured when your device disconnects. You can also save your current location now.
                </Text>
                <TouchableOpacity
                  style={[
                    styles.primaryBtn,
                    {
                      backgroundColor: colors.primary,
                      borderRadius: borderRadius.sm,
                      marginTop: 10,
                    },
                  ]}
                  onPress={handleManualCaptureLocation}
                  disabled={isCapturingLocation}
                >
                  {isCapturingLocation ? (
                    <ActivityIndicator size="small" color={colors.onPrimary} />
                  ) : (
                    <Text
                      style={[
                        styles.primaryBtnText,
                        { color: colors.onPrimary },
                      ]}
                    >
                      📍 Record Current Location
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* CARD 2: "GETTING WARMER" BLE RSSI RADAR METER */}
          <View
            style={[
              styles.toolCard,
              {
                backgroundColor: colors.surfaceContainer,
                borderRadius: borderRadius.xl,
                borderColor: colors.outlineVariant,
              },
            ]}
          >
            <View style={styles.cardHeader}>
              <View style={styles.headerLeft}>
                <Text style={styles.cardEmoji}>📡</Text>
                <View>
                  <Text style={[styles.cardTitle, { color: colors.onSurface }]}>
                    Proximity Radar
                  </Text>
                  <Text style={[styles.cardDesc, { color: colors.onSurfaceVariant }]}>
                    BLE RSSI "getting warmer" meter to find nearby lost earbuds
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.radarBody}>
              {/* Radar Status Bar */}
              <View style={styles.radarHeaderRow}>
                <Text style={[styles.proximityCategory, { color: proximity.color }]}>
                  {proximity.label}
                </Text>
                <Text
                  style={[
                    styles.rssiValueText,
                    { color: colors.onSurfaceVariant },
                  ]}
                >
                  {currentRssi !== null ? `${currentRssi} dBm` : '-- dBm'}
                </Text>
              </View>

              {/* Meter Gauge Bar */}
              <View
                style={[
                  styles.meterTrack,
                  {
                    backgroundColor: colors.surfaceVariant,
                    borderRadius: borderRadius.full,
                  },
                ]}
              >
                <View
                  style={[
                    styles.meterFill,
                    {
                      width: `${proximity.percent}%`,
                      backgroundColor: proximity.color,
                      borderRadius: borderRadius.full,
                    },
                  ]}
                />
              </View>

              <Text
                style={[styles.meterHint, { color: colors.onSurfaceVariant }]}
              >
                Walk around the room slowly while scanning. As the meter fills and turns red, you are getting closer!
              </Text>

              {/* Start / Stop Scan Button */}
              <TouchableOpacity
                style={[
                  styles.scanBtn,
                  {
                    backgroundColor: isScanning
                      ? colors.error
                      : colors.primary,
                    borderRadius: borderRadius.md,
                  },
                ]}
                onPress={handleToggleRssiScan}
              >
                <Text style={[styles.scanBtnText, { color: colors.onPrimary }]}>
                  {isScanning
                    ? '⏹️ Stop Searching'
                    : '🔍 Start Proximity Search'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* CARD 3: DISCONNECT DROP ALERT */}
          <View
            style={[
              styles.toolCard,
              {
                backgroundColor: colors.surfaceContainer,
                borderRadius: borderRadius.xl,
                borderColor: colors.outlineVariant,
              },
            ]}
          >
            <View style={styles.cardHeader}>
              <View style={styles.headerLeft}>
                <Text style={styles.cardEmoji}>🔔</Text>
                <View>
                  <Text style={[styles.cardTitle, { color: colors.onSurface }]}>
                    Disconnect Alert
                  </Text>
                  <Text style={[styles.cardDesc, { color: colors.onSurfaceVariant }]}>
                    Notify immediately if audio drops while phone is in active use
                  </Text>
                </View>
              </View>

              <Switch
                value={selectedDevice.disconnectAlertEnabled}
                onValueChange={(val) => {
                  if (selectedAddress) {
                    setDisconnectAlert(selectedAddress, val);
                  }
                }}
                thumbColor={
                  selectedDevice.disconnectAlertEnabled
                    ? colors.primary
                    : colors.outline
                }
                trackColor={{
                  false: colors.surfaceVariant,
                  true: colors.primaryContainer,
                }}
              />
            </View>

            <View style={styles.alertCardBody}>
              <Text
                style={[styles.alertNotice, { color: colors.onSurfaceVariant }]}
              >
                Prevents leaving your earbuds behind in a cafe or gym. If connection drops while your phone screen is active, EarbudKit rings an instant alert.
              </Text>
              <TouchableOpacity
                style={[
                  styles.secondaryBtn,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.outlineVariant,
                    borderRadius: borderRadius.sm,
                    marginTop: 8,
                  },
                ]}
                onPress={handleTestDisconnectAlert}
              >
                <Text
                  style={[styles.secondaryBtnText, { color: colors.primary }]}
                >
                  🔔 Test Disconnect Alert
                </Text>
              </TouchableOpacity>
            </View>
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
  feedbackBanner: {
    padding: 12,
    marginBottom: 14,
  },
  feedbackText: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  toolCard: {
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
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  cardEmoji: {
    fontSize: 26,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  cardDesc: {
    fontSize: 12,
    marginTop: 2,
  },
  locationBody: {
    paddingHorizontal: 18,
    paddingBottom: 18,
    gap: 12,
  },
  mapMockCard: {
    padding: 16,
    borderWidth: 1,
  },
  mapPinRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  bigPinEmoji: {
    fontSize: 34,
  },
  mapPinDetails: {
    flex: 1,
  },
  locationAddressText: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  locationCoordsText: {
    fontSize: 12,
    marginBottom: 2,
  },
  locationAccuracyText: {
    fontSize: 11,
  },
  navigateBtn: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  navigateBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  secondaryBtn: {
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
  },
  secondaryBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  noLocationContainer: {
    padding: 24,
    alignItems: 'center',
    gap: 8,
  },
  dimEmoji: {
    fontSize: 40,
    opacity: 0.6,
  },
  noLocationTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  noLocationDesc: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  radarBody: {
    paddingHorizontal: 18,
    paddingBottom: 18,
    gap: 12,
  },
  radarHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  proximityCategory: {
    fontSize: 14,
    fontWeight: '700',
  },
  rssiValueText: {
    fontSize: 13,
    fontWeight: '600',
  },
  meterTrack: {
    height: 14,
    overflow: 'hidden',
  },
  meterFill: {
    height: '100%',
  },
  meterHint: {
    fontSize: 12,
    lineHeight: 16,
  },
  scanBtn: {
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  scanBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  alertCardBody: {
    paddingHorizontal: 18,
    paddingBottom: 18,
    gap: 10,
  },
  alertNotice: {
    fontSize: 13,
    lineHeight: 18,
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
    marginBottom: 16,
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
