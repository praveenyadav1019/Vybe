import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Dimensions, FlatList, StatusBar,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  FadeInDown,
  useSharedValue, useAnimatedStyle,
  withTiming, withSpring, withRepeat, withSequence,
  Easing,
} from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { useLocationStore } from '@/stores/locationStore';

const { width: W, height: H } = Dimensions.get('window');
const RADAR_SIZE = Math.min(W, H * 0.52);
const SHEET_PEEK = 220;
const SHEET_FULL = H * 0.55;

// ─── Color tokens ─────────────────────────────────────────────────────────────
const ink     = '#1A1A2E';
const inkSec  = '#6B7280';
const white   = '#FFFFFF';
const brand   = '#7C3AED';
const brandSoft = 'rgba(124,58,237,0.15)';
const success = '#10B981';
const bgSec   = '#F9FAFB';

// ─── Mock nearby users ────────────────────────────────────────────────────────
// (angle in degrees, radius 0-1 relative to radar)
const MOCK_USERS = [
  { id: '1', name: 'Mia L.',   distance: '~200m', photo: 'https://randomuser.me/api/portraits/women/44.jpg', angle: 40,  r: 0.28, status: 'Active Now' },
  { id: '2', name: 'Alex K.',  distance: '~350m', photo: 'https://randomuser.me/api/portraits/men/32.jpg',   angle: 130, r: 0.48, status: 'Active Now' },
  { id: '3', name: 'David B.', distance: '~480m', photo: 'https://randomuser.me/api/portraits/men/33.jpg',   angle: 220, r: 0.62, status: 'Recently Active' },
  { id: '4', name: 'Sofia R.', distance: '~420m', photo: 'https://randomuser.me/api/portraits/women/45.jpg', angle: 310, r: 0.55, status: 'Active Now' },
  { id: '5', name: 'James T.', distance: '~180m', photo: 'https://randomuser.me/api/portraits/men/34.jpg',   angle: 80,  r: 0.22, status: 'Active Now' },
];

// ─── Radar sweep animation ────────────────────────────────────────────────────
function RadarSweep() {
  const rotate = useSharedValue(0);
  useEffect(() => {
    rotate.value = withRepeat(
      withTiming(360, { duration: 3000, easing: Easing.linear }),
      -1,
    );
  }, []);
  const style = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotate.value}deg` }],
  }));

  const R = RADAR_SIZE / 2;
  return (
    <Animated.View
      style={[StyleSheet.absoluteFillObject, { borderRadius: R }, style]}
      pointerEvents="none"
    >
      {/* Sweep gradient triangle */}
      <View style={StyleSheet.absoluteFillObject}>
        <LinearGradient
          colors={['rgba(124,58,237,0.0)', 'rgba(124,58,237,0.28)']}
          start={{ x: 0.5, y: 0.5 }}
          end={{ x: 1, y: 0 }}
          style={[StyleSheet.absoluteFillObject, { borderRadius: R }]}
        />
      </View>
    </Animated.View>
  );
}

// ─── Pulse ring ───────────────────────────────────────────────────────────────
function PulseRing({ delay }: { delay: number }) {
  const scale = useSharedValue(0.3);
  const opacity = useSharedValue(0.6);
  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2200, easing: Easing.out(Easing.ease) }),
        withTiming(0.3, { duration: 0 }),
      ),
      -1,
    );
    opacity.value = withRepeat(
      withSequence(
        withTiming(0, { duration: 2200, easing: Easing.out(Easing.ease) }),
        withTiming(0.6, { duration: 0 }),
      ),
      -1,
    );
  }, []);
  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));
  // Delay is achieved by starting the animation offset
  return (
    <Animated.View
      style={[StyleSheet.absoluteFillObject, styles.pulseRing, style]}
      pointerEvents="none"
    />
  );
}

// ─── User blip on radar ────────────────────────────────────────────────────────
function UserBlip({ user, onPress }: { user: typeof MOCK_USERS[0]; onPress: () => void }) {
  const R = RADAR_SIZE / 2;
  const angleRad = (user.angle - 90) * (Math.PI / 180);
  const dist = user.r * (R - 24);
  const x = R + dist * Math.cos(angleRad);
  const y = R + dist * Math.sin(angleRad);

  const scale = useSharedValue(0);
  useEffect(() => {
    scale.value = withSpring(1, { damping: 12, stiffness: 120 });
  }, []);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const isActive = user.status === 'Active Now';
  return (
    <Animated.View style={[styles.blipWrap, { left: x - 22, top: y - 22 }, style]}>
      <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
        <View style={[styles.blipRing, isActive && styles.blipRingActive]}>
          <Image source={{ uri: user.photo }} style={styles.blipAvatar} contentFit="cover" />
        </View>
        {isActive && <View style={styles.blipActiveDot} />}
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── People list row ──────────────────────────────────────────────────────────
function PersonRow({ user, onPress }: { user: typeof MOCK_USERS[0]; onPress: () => void }) {
  const isActive = user.status === 'Active Now';
  return (
    <TouchableOpacity style={styles.personRow} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.personAvatarWrap}>
        <Image source={{ uri: user.photo }} style={styles.personAvatar} contentFit="cover" />
        {isActive && <View style={styles.activeDot} />}
      </View>
      <View style={styles.personInfo}>
        <Text style={styles.personName}>{user.name}</Text>
        <Text style={[styles.personStatus, isActive && { color: success }]}>{user.status}</Text>
      </View>
      <Text style={styles.personDist}>{user.distance}</Text>
    </TouchableOpacity>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function RadarMapScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const lat = useLocationStore((s) => s.latitude);

  const [sheetExpanded, setSheetExpanded] = useState(false);
  const sheetH = useSharedValue(SHEET_PEEK);
  const sheetStyle = useAnimatedStyle(() => ({ height: sheetH.value }));

  function toggleSheet() {
    const next = !sheetExpanded;
    sheetH.value = withSpring(next ? SHEET_FULL : SHEET_PEEK, { damping: 18, stiffness: 180 });
    setSheetExpanded(next);
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={white} />

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <Animated.View
        entering={FadeInDown.delay(0).duration(300)}
        style={[styles.header, { paddingTop: insets.top + 8 }]}
      >
        <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()} activeOpacity={0.8}>
          <Ionicons name="chevron-back" size={22} color={ink} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Radar</Text>
        <TouchableOpacity
          style={styles.headerBtn}
          onPress={() => router.push('/(app)/filters' as any)}
          activeOpacity={0.8}
        >
          <Ionicons name="options-outline" size={20} color={ink} />
        </TouchableOpacity>
      </Animated.View>

      {/* ── Radar canvas ─────────────────────────────────────────────────── */}
      <Animated.View entering={FadeInDown.delay(80).duration(400)} style={styles.radarSection}>
        <View style={styles.radarOuter}>

          {/* Concentric rings */}
          <View style={[styles.radarRing, { width: RADAR_SIZE, height: RADAR_SIZE, borderRadius: RADAR_SIZE / 2, borderColor: 'rgba(124,58,237,0.18)' }]} />
          <View style={[styles.radarRing, { width: RADAR_SIZE * 0.68, height: RADAR_SIZE * 0.68, borderRadius: RADAR_SIZE / 2, borderColor: 'rgba(124,58,237,0.22)', top: RADAR_SIZE * 0.16, left: RADAR_SIZE * 0.16 }]} />
          <View style={[styles.radarRing, { width: RADAR_SIZE * 0.38, height: RADAR_SIZE * 0.38, borderRadius: RADAR_SIZE / 2, borderColor: 'rgba(124,58,237,0.28)', top: RADAR_SIZE * 0.31, left: RADAR_SIZE * 0.31 }]} />

          {/* Cross-hairs */}
          <View style={[styles.crossH, { width: RADAR_SIZE }]} />
          <View style={[styles.crossV, { height: RADAR_SIZE }]} />

          {/* Sweep */}
          <View style={[styles.sweepClip, { width: RADAR_SIZE, height: RADAR_SIZE, borderRadius: RADAR_SIZE / 2 }]}>
            <RadarSweep />
          </View>

          {/* You (center dot) */}
          <View style={styles.centerDot}>
            <View style={styles.centerDotInner} />
          </View>
          <PulseRing delay={0} />

          {/* User blips */}
          {MOCK_USERS.map((u) => (
            <UserBlip
              key={u.id}
              user={u}
              onPress={() => router.push(`/(app)/user/${u.id}` as any)}
            />
          ))}
        </View>

        {/* Range label */}
        <Text style={styles.rangeLabel}>~500m radius · {MOCK_USERS.length} people nearby</Text>
      </Animated.View>

      {/* ── Bottom sheet ────────────────────────────────────────────────── */}
      <Animated.View style={[styles.sheet, sheetStyle]}>
        <TouchableOpacity style={styles.sheetHandle} onPress={toggleSheet} activeOpacity={0.9}>
          <View style={styles.handle} />
          <View style={styles.sheetHeaderRow}>
            <Text style={styles.sheetTitle}>People nearby</Text>
            <Ionicons
              name={sheetExpanded ? 'chevron-down' : 'chevron-up'}
              size={18}
              color={inkSec}
            />
          </View>
        </TouchableOpacity>

        <FlatList
          data={MOCK_USERS}
          keyExtractor={(u) => u.id}
          showsVerticalScrollIndicator={false}
          scrollEnabled={sheetExpanded}
          renderItem={({ item }) => (
            <PersonRow
              user={item}
              onPress={() => router.push(`/(app)/user/${item.id}` as any)}
            />
          )}
          ItemSeparatorComponent={() => <View style={styles.rowDivider} />}
          contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
        />
      </Animated.View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: white },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 12,
    backgroundColor: white,
    borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
    zIndex: 10,
  },
  headerBtn: {
    width: 38, height: 38, borderRadius: 19,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#F9FAFB',
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: ink },

  // ── Radar ──────────────────────────────────────────────────────────────────
  radarSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: SHEET_PEEK + 8,
  },
  radarOuter: {
    width: RADAR_SIZE, height: RADAR_SIZE,
    position: 'relative',
    backgroundColor: 'rgba(247,245,255,0.9)',
    borderRadius: RADAR_SIZE / 2,
    shadowColor: brand,
    shadowOpacity: 0.12,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  radarRing: {
    position: 'absolute',
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  crossH: {
    position: 'absolute',
    top: RADAR_SIZE / 2 - 0.5,
    left: 0,
    height: 1,
    backgroundColor: 'rgba(124,58,237,0.1)',
  },
  crossV: {
    position: 'absolute',
    top: 0,
    left: RADAR_SIZE / 2 - 0.5,
    width: 1,
    backgroundColor: 'rgba(124,58,237,0.1)',
  },
  sweepClip: {
    position: 'absolute', top: 0, left: 0,
    overflow: 'hidden',
  },
  pulseRing: {
    borderWidth: 2,
    borderColor: brand,
    borderRadius: RADAR_SIZE / 2,
    width: RADAR_SIZE, height: RADAR_SIZE,
    position: 'absolute', top: 0, left: 0,
    backgroundColor: 'transparent',
  },
  centerDot: {
    position: 'absolute',
    top: RADAR_SIZE / 2 - 10,
    left: RADAR_SIZE / 2 - 10,
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: 'rgba(124,58,237,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  centerDotInner: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: brand,
  },

  // ── User blip ──────────────────────────────────────────────────────────────
  blipWrap: { position: 'absolute', width: 44, height: 44 },
  blipRing: {
    width: 44, height: 44, borderRadius: 22,
    borderWidth: 2.5, borderColor: 'rgba(124,58,237,0.3)',
    overflow: 'hidden',
    backgroundColor: bgSec,
  },
  blipRingActive: { borderColor: brand },
  blipAvatar: { width: 40, height: 40 },
  blipActiveDot: {
    position: 'absolute', bottom: 1, right: 1,
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: success, borderWidth: 1.5, borderColor: white,
  },

  rangeLabel: {
    marginTop: 14,
    fontSize: 12, color: inkSec, fontWeight: '500',
    textAlign: 'center',
  },

  // ── Bottom sheet ──────────────────────────────────────────────────────────
  sheet: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    backgroundColor: white,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    shadowColor: '#000', shadowOpacity: 0.08,
    shadowRadius: 20, shadowOffset: { width: 0, height: -4 },
    elevation: 12,
    overflow: 'hidden',
  },
  sheetHandle: { paddingTop: 12, paddingHorizontal: 20, paddingBottom: 4 },
  handle: {
    alignSelf: 'center',
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: '#D1D5DB', marginBottom: 12,
  },
  sheetHeaderRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingBottom: 4,
  },
  sheetTitle: { fontSize: 15, fontWeight: '700', color: ink },

  // ── People list ───────────────────────────────────────────────────────────
  personRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 10, gap: 12,
  },
  personAvatarWrap: { position: 'relative' },
  personAvatar: {
    width: 46, height: 46, borderRadius: 23, backgroundColor: bgSec,
  },
  activeDot: {
    position: 'absolute', bottom: 1, right: 1,
    width: 11, height: 11, borderRadius: 6,
    backgroundColor: success, borderWidth: 2, borderColor: white,
  },
  personInfo: { flex: 1 },
  personName: { fontSize: 14, fontWeight: '600', color: ink },
  personStatus: { fontSize: 12, color: inkSec, marginTop: 1 },
  personDist: { fontSize: 12, color: inkSec },
  rowDivider: { height: 1, backgroundColor: '#F3F4F6', marginLeft: 78 },
});
