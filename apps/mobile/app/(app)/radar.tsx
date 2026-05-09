import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  Dimensions,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  Platform,
  Alert,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSpring,
  withSequence,
  interpolate,
  Easing,
  cancelAnimation,
  FadeIn,
  FadeOut,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNearby } from '@/hooks/useNearby';
import { useDiscoveryStore } from '@/stores/discoveryStore';
import { useAuthStore } from '@/stores/authStore';
import { apiFetch } from '@/lib/api';
import { colors } from '@/theme/colors';
import type { NearbyUser, Mode } from '@/types';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const RADAR_SIZE = Math.min(SCREEN_WIDTH * 0.88, 340);
const RADAR_RADIUS = RADAR_SIZE / 2;
const CENTER = { x: RADAR_RADIUS, y: RADAR_RADIUS };

// ─── Types ─────────────────────────────────────────────────────────────────
interface BlipPosition {
  x: number;
  y: number;
  ring: 0 | 1 | 2; // 0=inner, 1=mid, 2=outer
}

// ─── Helpers ──────────────────────────────────────────────────────────────
const RADIUS_OPTIONS = [
  { label: '100m', value: 100 },
  { label: '500m', value: 500 },
  { label: '1km', value: 1000 },
  { label: '2km', value: 2000 },
];

const MODE_CONFIG: Record<
  Mode,
  { emoji: string; label: string; color: string }
> = {
  dating: { emoji: '💕', label: 'Dating', color: colors.modes.dating },
  hook: { emoji: '🔥', label: 'Hook', color: colors.modes.hook },
  'co-travel': { emoji: '✈️', label: 'Travel', color: colors.modes['co-travel'] },
  'night-out': { emoji: '🌙', label: 'Night', color: colors.modes['night-out'] },
  'club-mates': { emoji: '🎵', label: 'Club', color: colors.modes['club-mates'] },
  casual: { emoji: '👋', label: 'Casual', color: colors.modes.casual },
};

/** Deterministic angle from userId string (0–2π) */
function hashAngle(userId: string): number {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = ((hash << 5) - hash + userId.charCodeAt(i)) | 0;
  }
  return Math.abs(hash % 628) / 100; // 0..2π
}

function distanceToRing(distance: NearbyUser['distance']): 0 | 1 | 2 {
  switch (distance) {
    case 'Same venue':
      return 0;
    case 'Within 100m':
      return 1;
    default:
      return 2;
  }
}

function calcBlipPosition(user: NearbyUser, index: number): BlipPosition {
  const ring = distanceToRing(user.distance);
  const ringRadii = [RADAR_RADIUS * 0.27, RADAR_RADIUS * 0.55, RADAR_RADIUS * 0.82];
  const r = ringRadii[ring];
  // Use hash of id for consistent angle + slight offset per index to avoid overlap
  const angle = hashAngle(user.id) + index * 0.3;
  return {
    x: CENTER.x + r * Math.cos(angle),
    y: CENTER.y + r * Math.sin(angle),
    ring,
  };
}

// ─── Sweep Line ───────────────────────────────────────────────────────────
function RadarSweep({ rotation }: { rotation: Animated.SharedValue<number> }) {
  const sweepStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          width: RADAR_RADIUS,
          height: RADAR_RADIUS,
          top: RADAR_RADIUS,
          left: RADAR_RADIUS,
          transformOrigin: '0% 0%',
        },
        sweepStyle,
      ]}
    >
      <LinearGradient
        colors={[colors.primary + 'FF', colors.primary + '44', colors.primary + '00']}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={{
          width: RADAR_RADIUS,
          height: 2,
          marginTop: -1,
        }}
      />
      {/* Sweep cone using overlay */}
      <LinearGradient
        colors={[colors.primary + '30', colors.primary + '08', 'transparent']}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0 }}
        style={{
          position: 'absolute',
          width: RADAR_RADIUS,
          height: RADAR_RADIUS,
          top: -RADAR_RADIUS / 2,
          left: 0,
          borderBottomLeftRadius: RADAR_RADIUS,
        }}
      />
    </Animated.View>
  );
}

// ─── Ring ─────────────────────────────────────────────────────────────────
function RadarRing({
  fraction,
  delay,
}: {
  fraction: number;
  delay: number;
}) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0.4);

  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1, { duration: delay }),
        withTiming(1.03, { duration: 1800, easing: Easing.inOut(Easing.sine) }),
        withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.sine) })
      ),
      -1,
      false
    );
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.4, { duration: delay }),
        withTiming(0.7, { duration: 1800, easing: Easing.inOut(Easing.sine) }),
        withTiming(0.3, { duration: 1800, easing: Easing.inOut(Easing.sine) })
      ),
      -1,
      false
    );
  }, []);

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const size = RADAR_SIZE * fraction;
  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: 1,
          borderColor: colors.accent,
          alignSelf: 'center',
        },
        ringStyle,
      ]}
    />
  );
}

// ─── Center Dot ───────────────────────────────────────────────────────────
function CenterDot() {
  const glow = useSharedValue(0.6);

  useEffect(() => {
    glow.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.5, { duration: 800, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, []);

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glow.value,
    transform: [{ scale: interpolate(glow.value, [0.5, 1], [0.9, 1.2]) }],
  }));

  return (
    <View style={styles.centerDotContainer}>
      <Animated.View
        style={[
          {
            width: 28,
            height: 28,
            borderRadius: 14,
            backgroundColor: colors.primary + '40',
            alignItems: 'center',
            justifyContent: 'center',
          },
          glowStyle,
        ]}
      >
        <View style={styles.centerDot} />
      </Animated.View>
    </View>
  );
}

// ─── User Blip ────────────────────────────────────────────────────────────
function UserBlip({
  user,
  position,
  onPress,
}: {
  user: NearbyUser;
  position: BlipPosition;
  onPress: () => void;
}) {
  const scale = useSharedValue(0);
  const mode = MODE_CONFIG[user.activeMode] || MODE_CONFIG.casual;
  const initials = user.name.slice(0, 1).toUpperCase();

  useEffect(() => {
    scale.value = withSpring(1, { damping: 12, stiffness: 100 });
  }, []);

  const blipStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View
      style={[
        styles.blipContainer,
        {
          left: position.x - 20,
          top: position.y - 20,
        },
        blipStyle,
      ]}
    >
      <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={styles.blipTouchable}>
        <View
          style={[
            styles.blipAvatar,
            {
              borderColor: mode.color,
              backgroundColor: mode.color + '22',
            },
          ]}
        >
          <Text style={styles.blipInitials}>{initials}</Text>
        </View>
        {user.isOnline && <View style={styles.blipOnlineDot} />}
      </TouchableOpacity>
      <Text style={styles.blipName} numberOfLines={1}>
        {user.name}
      </Text>
    </Animated.View>
  );
}

// ─── Mini Profile Popup ────────────────────────────────────────────────────
function MiniProfile({
  user,
  onClose,
  onPing,
  pinging,
  pinged,
}: {
  user: NearbyUser;
  onClose: () => void;
  onPing: () => void;
  pinging: boolean;
  pinged: boolean;
}) {
  const mode = MODE_CONFIG[user.activeMode] || MODE_CONFIG.casual;
  const initials = user.name.slice(0, 2).toUpperCase();

  return (
    <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(150)} style={styles.miniProfile}>
      <BlurView intensity={90} tint="dark" style={StyleSheet.absoluteFill} />
      <View style={styles.miniProfileContent}>
        {/* Avatar */}
        <View style={[styles.miniAvatar, { borderColor: mode.color }]}>
          <Text style={styles.miniAvatarText}>{initials}</Text>
        </View>

        {/* Info */}
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={styles.miniName}>{user.name}, {user.age}</Text>
            {user.isVerified && (
              <View style={styles.miniVerified}>
                <Text style={{ fontSize: 9, color: colors.background, fontWeight: '900' }}>✓</Text>
              </View>
            )}
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
            <View style={[styles.miniModeChip, { backgroundColor: mode.color + '22' }]}>
              <Text style={[styles.miniModeText, { color: mode.color }]}>
                {mode.emoji} {mode.label}
              </Text>
            </View>
            <Text style={styles.miniDistance}>{user.distance}</Text>
          </View>
        </View>

        {/* Close */}
        <TouchableOpacity onPress={onClose} style={styles.miniClose}>
          <Ionicons name="close" size={18} color={colors.subtext} />
        </TouchableOpacity>
      </View>

      {/* Ping button */}
      <TouchableOpacity
        onPress={onPing}
        disabled={pinging || pinged}
        activeOpacity={0.8}
        style={styles.miniPingBtn}
      >
        <LinearGradient
          colors={pinged ? [colors.success, colors.success + 'CC'] : colors.gradients.primary as [string, string]}
          style={styles.miniPingGradient}
        >
          <Ionicons name={pinged ? 'checkmark-circle' : 'radio'} size={16} color={colors.text} />
          <Text style={styles.miniPingText}>
            {pinging ? 'Pinging...' : pinged ? 'Pinged!' : 'Ping'}
          </Text>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────
export default function RadarScreen() {
  const router = useRouter();
  const token = useAuthStore((s) => s.token);
  const { radiusM, setRadius } = useDiscoveryStore();

  const { data, isLoading } = useNearby(radiusM);
  const users = data?.users ?? [];

  const rotation = useSharedValue(0);
  const [selectedUser, setSelectedUser] = useState<NearbyUser | null>(null);
  const [pingSuccessId, setPingSuccessId] = useState<string | null>(null);
  const [filterVisible, setFilterVisible] = useState(false);
  const [activeMode, setActiveMode] = useState<Mode | 'all'>('all');

  // Start radar sweep
  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, { duration: 3000, easing: Easing.linear }),
      -1,
      false
    );
    return () => cancelAnimation(rotation);
  }, []);

  // Ping mutation
  const pingMutation = useMutation({
    mutationFn: async (userId: string) => {
      return apiFetch<{ success: boolean }>(`/users/${userId}/ping`, {
        method: 'POST',
        token,
      });
    },
    onSuccess: (_, userId) => {
      setPingSuccessId(userId);
      setTimeout(() => setPingSuccessId(null), 3000);
    },
    onError: () => {
      Alert.alert('Ping failed', 'Could not send ping. Try again.');
    },
  });

  const handlePing = useCallback(() => {
    if (!selectedUser) return;
    pingMutation.mutate(selectedUser.id);
  }, [selectedUser, pingMutation]);

  // Filter users by mode
  const filteredUsers = activeMode === 'all'
    ? users
    : users.filter((u) => u.activeMode === activeMode);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Radar</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={styles.liveIndicator}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>Live</Text>
          </View>
          <TouchableOpacity onPress={() => setFilterVisible(true)} style={styles.filterBtn}>
            <Ionicons name="options" size={20} color={colors.accent} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Count bar */}
      <View style={styles.countBar}>
        <Text style={styles.countText}>
          <Text style={{ color: colors.accent, fontWeight: '800' }}>{filteredUsers.length}</Text>
          {' '}people in range · {radiusM >= 1000 ? `${radiusM / 1000}km` : `${radiusM}m`} radius
        </Text>
      </View>

      {/* Radar visualization */}
      <View style={styles.radarWrapper}>
        <View style={styles.radarCircle}>
          {/* Background grid */}
          <LinearGradient
            colors={['#0D0D1E', '#0A0A14', '#060610']}
            style={StyleSheet.absoluteFill}
          />

          {/* Rings */}
          <RadarRing fraction={0.33} delay={0} />
          <RadarRing fraction={0.66} delay={200} />
          <RadarRing fraction={1.0} delay={400} />

          {/* Grid lines */}
          <View style={styles.gridLineH} />
          <View style={styles.gridLineV} />

          {/* Sweep */}
          <RadarSweep rotation={rotation} />

          {/* Center dot */}
          <CenterDot />

          {/* User blips */}
          {filteredUsers.map((user, index) => {
            const position = calcBlipPosition(user, index);
            return (
              <UserBlip
                key={user.id}
                user={user}
                position={position}
                onPress={() => setSelectedUser(user)}
              />
            );
          })}

          {/* Loading overlay */}
          {isLoading && (
            <View style={styles.loadingOverlay}>
              <Text style={styles.loadingText}>Scanning...</Text>
            </View>
          )}
        </View>

        {/* Mini profile popup */}
        {selectedUser && (
          <MiniProfile
            user={selectedUser}
            onClose={() => setSelectedUser(null)}
            onPing={handlePing}
            pinging={pingMutation.isPending}
            pinged={pingSuccessId === selectedUser.id}
          />
        )}
      </View>

      {/* Mode filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.modeChipsRow}
      >
        <TouchableOpacity
          onPress={() => setActiveMode('all')}
          style={[
            styles.modeChip,
            activeMode === 'all' && { backgroundColor: colors.primary + '30', borderColor: colors.primary },
          ]}
        >
          <Text style={[styles.modeChipText, activeMode === 'all' && { color: colors.primary }]}>
            All
          </Text>
        </TouchableOpacity>
        {(Object.entries(MODE_CONFIG) as [Mode, typeof MODE_CONFIG[Mode]][]).map(([mode, cfg]) => (
          <TouchableOpacity
            key={mode}
            onPress={() => setActiveMode(mode)}
            style={[
              styles.modeChip,
              activeMode === mode && { backgroundColor: cfg.color + '30', borderColor: cfg.color },
            ]}
          >
            <Text style={styles.modeChipEmoji}>{cfg.emoji}</Text>
            <Text style={[styles.modeChipText, activeMode === mode && { color: cfg.color }]}>
              {cfg.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Radius selector */}
      <View style={styles.radiusRow}>
        {RADIUS_OPTIONS.map((opt) => (
          <TouchableOpacity
            key={opt.value}
            onPress={() => setRadius(opt.value)}
            style={[
              styles.radiusBtn,
              radiusM === opt.value && styles.radiusBtnActive,
            ]}
          >
            <Text
              style={[
                styles.radiusBtnText,
                radiusM === opt.value && { color: colors.accent },
              ]}
            >
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Bottom actions */}
      <View style={styles.bottomActions}>
        <TouchableOpacity
          onPress={() => router.push('/(app)/nearby')}
          style={styles.listViewBtn}
        >
          <Ionicons name="list" size={18} color={colors.text} />
          <Text style={styles.listViewText}>List View</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => router.push('/(tabs)/places')}
          style={styles.happeningBtn}
        >
          <LinearGradient
            colors={colors.gradients.neon as [string, string]}
            style={styles.happeningGradient}
          >
            <Ionicons name="flame" size={18} color={colors.text} />
            <Text style={styles.happeningText}>Happening</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Filter Modal */}
      <Modal
        visible={filterVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setFilterVisible(false)}
      >
        <View style={styles.filterOverlay}>
          <View style={styles.filterSheet}>
            <BlurView intensity={90} tint="dark" style={StyleSheet.absoluteFill} />
            <View style={styles.filterContent}>
              <View style={styles.sheetHandle} />
              <Text style={styles.filterTitle}>Filter Radar</Text>
              <Text style={styles.filterSubtitle}>Adjust who appears on your radar</Text>

              <Text style={styles.filterSectionLabel}>Mode</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
                <TouchableOpacity
                  onPress={() => setActiveMode('all')}
                  style={[styles.filterChip, activeMode === 'all' && { backgroundColor: colors.primary + '30', borderColor: colors.primary }]}
                >
                  <Text style={[styles.filterChipText, activeMode === 'all' && { color: colors.primary }]}>All</Text>
                </TouchableOpacity>
                {(Object.entries(MODE_CONFIG) as [Mode, typeof MODE_CONFIG[Mode]][]).map(([mode, cfg]) => (
                  <TouchableOpacity
                    key={mode}
                    onPress={() => setActiveMode(mode)}
                    style={[styles.filterChip, activeMode === mode && { backgroundColor: cfg.color + '30', borderColor: cfg.color }]}
                  >
                    <Text style={{ marginRight: 4 }}>{cfg.emoji}</Text>
                    <Text style={[styles.filterChipText, activeMode === mode && { color: cfg.color }]}>{cfg.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.filterSectionLabel}>Radius</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 24 }}>
                {RADIUS_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt.value}
                    onPress={() => setRadius(opt.value)}
                    style={[styles.filterChip, radiusM === opt.value && { backgroundColor: colors.accent + '30', borderColor: colors.accent }]}
                  >
                    <Text style={[styles.filterChipText, radiusM === opt.value && { color: colors.accent }]}>{opt.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity onPress={() => setFilterVisible(false)} style={styles.applyBtn}>
                <LinearGradient colors={colors.gradients.primary as [string, string]} style={styles.applyGradient}>
                  <Text style={styles.applyText}>Apply Filters</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.success + '20',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.success + '40',
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.success,
  },
  liveText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.success,
  },
  filterBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.accent + '40',
    alignItems: 'center',
    justifyContent: 'center',
  },
  countBar: {
    alignItems: 'center',
    paddingBottom: 8,
  },
  countText: {
    fontSize: 13,
    color: colors.subtext,
    fontWeight: '500',
  },
  // Radar
  radarWrapper: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  radarCircle: {
    width: RADAR_SIZE,
    height: RADAR_SIZE,
    borderRadius: RADAR_RADIUS,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: colors.accent + '40',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  gridLineH: {
    position: 'absolute',
    width: '100%',
    height: 1,
    backgroundColor: colors.accent + '15',
  },
  gridLineV: {
    position: 'absolute',
    width: 1,
    height: '100%',
    backgroundColor: colors.accent + '15',
  },
  centerDotContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 8,
  },
  // Blips
  blipContainer: {
    position: 'absolute',
    alignItems: 'center',
    width: 40,
  },
  blipTouchable: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  blipAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  blipInitials: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.text,
  },
  blipOnlineDot: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.success,
    borderWidth: 1.5,
    borderColor: colors.background,
  },
  blipName: {
    fontSize: 8,
    color: colors.text,
    fontWeight: '600',
    marginTop: 2,
    textAlign: 'center',
  },
  // Loading
  loadingOverlay: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(6,6,16,0.7)',
    ...StyleSheet.absoluteFillObject,
  },
  loadingText: {
    fontSize: 14,
    color: colors.accent,
    fontWeight: '700',
    letterSpacing: 2,
  },
  // Mini profile
  miniProfile: {
    marginTop: 12,
    width: RADAR_SIZE,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  miniProfileContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  miniAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniAvatarText: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },
  miniName: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
  },
  miniVerified: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniModeChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  miniModeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  miniDistance: {
    fontSize: 11,
    color: colors.subtext,
  },
  miniClose: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniPingBtn: {
    marginHorizontal: 14,
    marginBottom: 14,
    borderRadius: 12,
    overflow: 'hidden',
  },
  miniPingGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  miniPingText: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
  },
  // Mode chips row
  modeChipsRow: {
    paddingHorizontal: 16,
    gap: 8,
    paddingVertical: 10,
  },
  modeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  modeChipEmoji: {
    fontSize: 13,
  },
  modeChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.subtext,
  },
  // Radius selector
  radiusRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  radiusBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
  },
  radiusBtnActive: {
    borderColor: colors.accent + '80',
    backgroundColor: colors.accent + '15',
  },
  radiusBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.subtext,
  },
  // Bottom actions
  bottomActions: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  listViewBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  listViewText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  happeningBtn: {
    flex: 1,
    borderRadius: 14,
    overflow: 'hidden',
  },
  happeningGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
  },
  happeningText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.text,
  },
  // Filter modal
  filterOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  filterSheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: colors.border,
  },
  filterContent: {
    padding: 20,
    paddingTop: 12,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginBottom: 16,
  },
  filterTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 4,
  },
  filterSubtitle: {
    fontSize: 13,
    color: colors.subtext,
    marginBottom: 20,
  },
  filterSectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.subtext,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 10,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.subtext,
  },
  applyBtn: {
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 8,
  },
  applyGradient: {
    paddingVertical: 15,
    alignItems: 'center',
  },
  applyText: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
  },
});
