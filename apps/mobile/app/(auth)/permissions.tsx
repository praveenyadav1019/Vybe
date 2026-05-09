import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useUserStore } from '@/stores/userStore';
import { colors } from '@/theme/colors';
import { Button } from '@/components/ui/Button';

type PermissionStatus = 'undetermined' | 'granted' | 'denied';

interface PermissionConfig {
  id: string;
  icon: string;
  iconColor: string;
  title: string;
  description: string;
  required: boolean;
  badge: string;
}

const PERMISSIONS: PermissionConfig[] = [
  {
    id: 'location',
    icon: 'location',
    iconColor: '#00E5FF',
    title: 'Location',
    description: 'Find people and places near you. We show venue-level presence, never your exact location.',
    required: true,
    badge: 'Required',
  },
  {
    id: 'notifications',
    icon: 'notifications',
    iconColor: '#7C3AED',
    title: 'Notifications',
    description: 'Get alerts for matches, messages, and nearby people. Stay in the loop.',
    required: false,
    badge: 'Recommended',
  },
  {
    id: 'camera',
    icon: 'camera',
    iconColor: '#22C55E',
    title: 'Camera',
    description: 'For video calls, verification selfies, and sharing moments.',
    required: false,
    badge: 'Optional',
  },
  {
    id: 'microphone',
    icon: 'mic',
    iconColor: '#F59E0B',
    title: 'Microphone',
    description: 'For audio and video calls with your connections.',
    required: false,
    badge: 'Optional',
  },
];

async function requestLocationPermission(): Promise<PermissionStatus> {
  try {
    const Location = require('expo-location');
    const { status } = await Location.requestForegroundPermissionsAsync();
    return status as PermissionStatus;
  } catch {
    return 'denied';
  }
}

async function requestNotificationPermission(): Promise<PermissionStatus> {
  try {
    const Notifications = require('expo-notifications');
    const { status } = await Notifications.requestPermissionsAsync();
    return status as PermissionStatus;
  } catch {
    return 'denied';
  }
}

async function requestCameraPermission(): Promise<PermissionStatus> {
  try {
    const Camera = require('expo-camera');
    const { status } = await Camera.Camera.requestCameraPermissionsAsync();
    return status as PermissionStatus;
  } catch {
    return 'denied';
  }
}

async function requestMicrophonePermission(): Promise<PermissionStatus> {
  try {
    const Camera = require('expo-camera');
    const { status } = await Camera.Camera.requestMicrophonePermissionsAsync();
    return status as PermissionStatus;
  } catch {
    return 'denied';
  }
}

const REQUEST_FNS: Record<string, () => Promise<PermissionStatus>> = {
  location: requestLocationPermission,
  notifications: requestNotificationPermission,
  camera: requestCameraPermission,
  microphone: requestMicrophonePermission,
};

function PermissionRow({
  config,
  status,
  onRequest,
}: {
  config: PermissionConfig;
  status: PermissionStatus;
  onRequest: () => void;
}) {
  const scale = useSharedValue(1);
  const rowStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  function handlePress() {
    if (status === 'granted') return;
    scale.value = withSpring(0.97, { damping: 10 }, () => {
      scale.value = withSpring(1, { damping: 12 });
    });
    onRequest();
  }

  const isGranted = status === 'granted';
  const isDenied = status === 'denied';

  return (
    <Animated.View style={rowStyle}>
      <TouchableOpacity
        style={[styles.permRow, isGranted && styles.permRowGranted]}
        onPress={handlePress}
        activeOpacity={isGranted ? 1 : 0.8}
      >
        {/* Icon */}
        <View style={[styles.permIcon, { backgroundColor: config.iconColor + '15' }]}>
          <Ionicons name={config.icon as any} size={22} color={config.iconColor} />
        </View>

        {/* Text */}
        <View style={styles.permText}>
          <View style={styles.permTitleRow}>
            <Text style={styles.permTitle}>{config.title}</Text>
            <View
              style={[
                styles.permBadge,
                config.required && styles.permBadgeRequired,
              ]}
            >
              <Text
                style={[
                  styles.permBadgeText,
                  config.required && styles.permBadgeTextRequired,
                ]}
              >
                {config.badge}
              </Text>
            </View>
          </View>
          <Text style={styles.permDesc}>{config.description}</Text>
        </View>

        {/* Status indicator */}
        <View style={styles.permStatus}>
          {isGranted ? (
            <View style={styles.statusGranted}>
              <Ionicons name="checkmark" size={14} color={colors.success} />
            </View>
          ) : isDenied ? (
            <View style={styles.statusDenied}>
              <Ionicons name="close" size={14} color={colors.danger} />
            </View>
          ) : (
            <View style={styles.statusPending}>
              <Ionicons name="add" size={14} color={colors.text} />
            </View>
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function PermissionsScreen() {
  const router = useRouter();
  const finishOnboarding = useUserStore((s) => s.finishOnboarding);

  const [statuses, setStatuses] = useState<Record<string, PermissionStatus>>({
    location: 'undetermined',
    notifications: 'undetermined',
    camera: 'undetermined',
    microphone: 'undetermined',
  });
  const [requestingAll, setRequestingAll] = useState(false);

  const locationGranted = statuses.location === 'granted';
  const allGranted = Object.values(statuses).every((s) => s === 'granted');

  async function requestSingle(id: string) {
    const fn = REQUEST_FNS[id];
    if (!fn) return;
    const result = await fn();
    setStatuses((prev) => ({ ...prev, [id]: result }));
    if (id === 'location' && result === 'denied') {
      Alert.alert(
        'Location required',
        'VYBEON needs location access to show you nearby people and places. Please enable it in Settings.',
        [{ text: 'OK' }]
      );
    }
  }

  async function handleAllowAll() {
    setRequestingAll(true);
    for (const perm of PERMISSIONS) {
      const fn = REQUEST_FNS[perm.id];
      if (fn) {
        const result = await fn();
        setStatuses((prev) => ({ ...prev, [perm.id]: result }));
      }
    }
    setRequestingAll(false);
  }

  async function handleContinue() {
    if (!locationGranted) {
      Alert.alert(
        'Location required',
        'Location access is required to use VYBEON. Please grant it to continue.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Allow Location',
            onPress: () => requestSingle('location'),
          },
        ]
      );
      return;
    }
    await finishOnboarding();
    router.replace('/(tabs)/home');
  }

  const grantedCount = Object.values(statuses).filter((s) => s === 'granted').length;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Orbs */}
      <View style={styles.orb1} />
      <View style={styles.orb2} />

      {/* Header */}
      <View style={styles.header}>
        <LinearGradient
          colors={['rgba(124,58,237,0.15)', 'rgba(0,229,255,0.08)']}
          style={styles.headerIcon}
        >
          <Ionicons name="shield" size={28} color={colors.primary} />
        </LinearGradient>
      </View>

      <View style={styles.titleArea}>
        <Text style={styles.headline}>Almost there!</Text>
        <Text style={styles.subtext}>
          Grant a few permissions so VYBEON can deliver the full experience. Location is required.
        </Text>

        {/* Progress pill */}
        <View style={styles.progressPill}>
          <Text style={styles.progressText}>
            {grantedCount}/{PERMISSIONS.length} granted
          </Text>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressBar,
                { width: `${(grantedCount / PERMISSIONS.length) * 100}%` },
              ]}
            />
          </View>
        </View>
      </View>

      {/* Permission list */}
      <View style={styles.permList}>
        {PERMISSIONS.map((perm) => (
          <PermissionRow
            key={perm.id}
            config={perm}
            status={statuses[perm.id]}
            onRequest={() => requestSingle(perm.id)}
          />
        ))}
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        {!allGranted && (
          <Button
            title={requestingAll ? 'Requesting...' : 'Allow All'}
            onPress={handleAllowAll}
            loading={requestingAll}
            variant="outline"
            style={styles.allowAllBtn}
          />
        )}
        <Button
          title="Continue to VYBEON"
          onPress={handleContinue}
          disabled={!locationGranted}
          gradient={locationGranted}
          style={styles.continueBtn}
        />
        {!locationGranted && (
          <Text style={styles.locationWarning}>
            Location is required to continue
          </Text>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  orb1: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(124,58,237,0.08)',
    top: -80,
    right: -80,
  },
  orb2: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(0,229,255,0.05)',
    bottom: 80,
    left: -60,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 8,
    alignItems: 'center',
  },
  headerIcon: {
    width: 72,
    height: 72,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(124,58,237,0.2)',
  },
  titleArea: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 20,
  },
  headline: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.5,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtext: {
    fontSize: 14,
    color: colors.subtext,
    lineHeight: 21,
    textAlign: 'center',
    marginBottom: 16,
  },
  progressPill: {
    alignItems: 'center',
    gap: 8,
  },
  progressText: {
    color: colors.subtext,
    fontSize: 13,
    fontWeight: '600',
  },
  progressTrack: {
    width: '60%',
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 2,
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOpacity: 0.5,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 0 },
    elevation: 3,
  },
  permList: {
    flex: 1,
    paddingHorizontal: 16,
    gap: 10,
  },
  permRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  permRowGranted: {
    borderColor: 'rgba(34,197,94,0.3)',
    backgroundColor: 'rgba(34,197,94,0.05)',
  },
  permIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  permText: {
    flex: 1,
    gap: 4,
  },
  permTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  permTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  permBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: 'rgba(161,161,170,0.15)',
  },
  permBadgeRequired: {
    backgroundColor: 'rgba(239,68,68,0.12)',
  },
  permBadgeText: {
    color: colors.subtext,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  permBadgeTextRequired: {
    color: colors.danger,
  },
  permDesc: {
    color: colors.subtext,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '400',
  },
  permStatus: {
    flexShrink: 0,
  },
  statusGranted: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(34,197,94,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.3)',
  },
  statusDenied: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(239,68,68,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.25)',
  },
  statusPending: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 10,
  },
  allowAllBtn: {
    borderRadius: 16,
  },
  continueBtn: {
    borderRadius: 16,
  },
  locationWarning: {
    textAlign: 'center',
    color: colors.danger,
    fontSize: 12,
    fontWeight: '600',
  },
});
