import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Dimensions, FlatList, StatusBar, ScrollView,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Animated, {
  FadeInDown, useSharedValue, useAnimatedStyle,
  withRepeat, withTiming, withSequence, Easing, interpolate,
} from 'react-native-reanimated';
import { useDiscoveryStore } from '../../src/stores/discoveryStore';
import { photoUri } from '../../src/lib/photo';
import { ScreenGradient } from '../../src/components/ui/ScreenGradient';
import type { NearbyUser } from '../../src/types';

const { width: W } = Dimensions.get('window');
const CARD_W = (W - 48) / 2;

// ─── Color tokens ─────────────────────────────────────────────────────────────
const ink     = '#111827';
const inkSec  = '#6B7280';
const white   = '#FFFFFF';
const brand   = '#7C3AED';
const brand2  = '#9333EA';
const bgSec   = '#F9FAFB';
const success = '#22C55E';

type Gender = 'all' | 'female' | 'male';

const GENDERS: { key: Gender; label: string; icon: string }[] = [
  { key: 'all',    label: 'Everyone', icon: 'people-outline' },
  { key: 'female', label: 'Women',    icon: 'female-outline' },
  { key: 'male',   label: 'Men',      icon: 'male-outline' },
];

// ─── Fallback mock people (shown when backend isn't connected) ─────────────────
const MOCK: (NearbyUser & { gender: Exclude<Gender, 'all'> })[] = [
  { id: 'm1', name: 'Aisha', age: 24, distance: '450 m', isOnline: true,  photos: ['https://randomuser.me/api/portraits/women/65.jpg'], gender: 'female' } as any,
  { id: 'm2', name: 'Rohan', age: 27, distance: '1.1 km', isOnline: true,  photos: ['https://randomuser.me/api/portraits/men/22.jpg'],   gender: 'male' } as any,
  { id: 'm3', name: 'Maya',  age: 23, distance: '1.8 km', isOnline: false, photos: ['https://randomuser.me/api/portraits/women/12.jpg'], gender: 'female' } as any,
  { id: 'm4', name: 'Kabir', age: 29, distance: '2.3 km', isOnline: true,  photos: ['https://randomuser.me/api/portraits/men/45.jpg'],   gender: 'male' } as any,
  { id: 'm5', name: 'Riya',  age: 25, distance: '3.0 km', isOnline: false, photos: ['https://randomuser.me/api/portraits/women/33.jpg'], gender: 'female' } as any,
  { id: 'm6', name: 'Dev',   age: 26, distance: '3.6 km', isOnline: true,  photos: ['https://randomuser.me/api/portraits/men/57.jpg'],   gender: 'male' } as any,
];

// ─── Animated radar scope ───────────────────────────────────────────────────────
const SCOPE = Math.min(W - 80, 300);
// Fixed orbit slots (angle in deg, radius fraction) for up to 6 nearby avatars.
const SLOTS = [
  { a: -30, r: 0.32 }, { a: 60, r: 0.42 }, { a: 150, r: 0.30 },
  { a: -110, r: 0.40 }, { a: 20, r: 0.20 }, { a: -160, r: 0.22 },
];

function RadarScope({ people }: { people: any[] }) {
  const sweep = useSharedValue(0);
  const pulse = useSharedValue(0);

  useEffect(() => {
    sweep.value = withRepeat(withTiming(1, { duration: 3200, easing: Easing.linear }), -1, false);
    pulse.value = withRepeat(withSequence(
      withTiming(1, { duration: 1600, easing: Easing.out(Easing.ease) }),
      withTiming(0, { duration: 0 }),
    ), -1, false);
  }, []);

  const sweepStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${sweep.value * 360}deg` }],
  }));
  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(pulse.value, [0, 1], [0.3, 1]) }],
    opacity: interpolate(pulse.value, [0, 0.15, 1], [0, 0.5, 0]),
  }));

  return (
    <View style={scope.wrap}>
      {/* concentric rings */}
      <View style={[scope.ring, { width: SCOPE, height: SCOPE, borderRadius: SCOPE / 2 }]} />
      <View style={[scope.ring, { width: SCOPE * 0.68, height: SCOPE * 0.68, borderRadius: SCOPE * 0.34 }]} />
      <View style={[scope.ring, { width: SCOPE * 0.36, height: SCOPE * 0.36, borderRadius: SCOPE * 0.18 }]} />

      {/* expanding pulse */}
      <Animated.View style={[scope.pulse, { width: SCOPE, height: SCOPE, borderRadius: SCOPE / 2 }, pulseStyle]} />

      {/* rotating sweep beam */}
      <Animated.View style={[scope.sweepBox, { width: SCOPE, height: SCOPE }, sweepStyle]}>
        <LinearGradient
          colors={['rgba(124,58,237,0.45)', 'rgba(124,58,237,0)']}
          start={{ x: 0.5, y: 0.5 }} end={{ x: 1, y: 0 }}
          style={{ width: SCOPE / 2, height: SCOPE / 2, position: 'absolute', top: 0, left: SCOPE / 2 }}
        />
      </Animated.View>

      {/* orbiting nearby avatars */}
      {people.slice(0, SLOTS.length).map((p, i) => {
        const slot = SLOTS[i];
        const rad = (slot.a * Math.PI) / 180;
        const dist = (SCOPE / 2) * slot.r;
        const x = SCOPE / 2 + dist * Math.cos(rad) - 18;
        const y = SCOPE / 2 + dist * Math.sin(rad) - 18;
        const photo = photoUri(p.photos?.[0] ?? p.photoUrl, { size: 40 });
        return (
          <View key={p.id ?? i} style={[scope.blip, { left: x, top: y }]}>
            {photo ? (
              <Image source={{ uri: photo }} style={scope.blipImg} contentFit="cover" />
            ) : (
              <View style={[scope.blipImg, scope.blipFallback]}><Ionicons name="person" size={16} color={brand} /></View>
            )}
            {p.isOnline && <View style={scope.blipDot} />}
          </View>
        );
      })}

      {/* center = you */}
      <LinearGradient colors={[brand, brand2]} style={scope.center}>
        <Ionicons name="navigate" size={20} color={white} />
      </LinearGradient>
    </View>
  );
}

// ─── Person card ──────────────────────────────────────────────────────────────
function PersonCard({ person, index, onPress }: { person: NearbyUser; index: number; onPress: () => void }) {
  const p = person as any;
  const photo = photoUri(p.photos?.[0] ?? p.photoUrl, { w: 700, h: 900 });
  return (
    <Animated.View entering={FadeInDown.delay(index * 55).duration(380)} style={{ width: CARD_W }}>
      <TouchableOpacity style={styles.card} activeOpacity={0.9} onPress={onPress}>
        {photo ? (
          <Image source={{ uri: photo }} style={StyleSheet.absoluteFillObject} contentFit="cover" transition={150} />
        ) : (
          <View style={[StyleSheet.absoluteFillObject, styles.cardFallback]}>
            <Ionicons name="person" size={40} color={brand} />
          </View>
        )}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.05)', 'rgba(0,0,0,0.78)']}
          locations={[0.35, 0.55, 1]}
          style={StyleSheet.absoluteFillObject}
        />
        {p.isOnline && (
          <View style={styles.onlineTag}>
            <View style={styles.onlineDot} />
            <Text style={styles.onlineText}>Online</Text>
          </View>
        )}
        <View style={styles.distChip}>
          <Ionicons name="location" size={10} color={white} />
          <Text style={styles.distChipText}>{p.distance ?? 'Nearby'}</Text>
        </View>
        <View style={styles.cardInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.cardName} numberOfLines={1}>
              {person.name}{p.age ? `, ${p.age}` : ''}
            </Text>
            {p.verified && <Ionicons name="checkmark-circle" size={15} color="#4FC3F7" />}
          </View>
          {p.interests?.length > 0 && (
            <Text style={styles.cardTags} numberOfLines={1}>{p.interests.slice(0, 2).join(' · ')}</Text>
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function RadarScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [gender, setGender] = useState<Gender>('all');

  const nearbyUsers = useDiscoveryStore((s) => s.nearbyUsers);

  const source: any[] = nearbyUsers && nearbyUsers.length > 0 ? nearbyUsers : MOCK;
  const people = source.filter((p) => gender === 'all' || p.gender === gender);
  const onlineCount = people.filter((p) => p.isOnline).length;

  const Header = (
    <View>
      {/* Hero */}
      <LinearGradient
        colors={['rgba(243,236,255,0.9)', 'rgba(251,246,255,0.4)', 'transparent']}
        style={[styles.hero, { paddingTop: insets.top + 14 }]}
      >
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>Radar</Text>
            <Text style={styles.subtitle}>Discover people around you</Text>
          </View>
          <TouchableOpacity style={styles.mapBtn} activeOpacity={0.85} onPress={() => router.push('/(app)/radar' as any)}>
            <Ionicons name="map-outline" size={16} color={brand} />
            <Text style={styles.mapBtnText}>Map</Text>
          </TouchableOpacity>
        </View>

        <RadarScope people={people} />

        <View style={styles.statPill}>
          <View style={styles.livePulse} />
          <Text style={styles.statText}>
            <Text style={styles.statNum}>{people.length}</Text> nearby · {onlineCount} online now
          </Text>
        </View>
      </LinearGradient>

      {/* Gender filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
        {GENDERS.map((g) => {
          const active = gender === g.key;
          return (
            <TouchableOpacity
              key={g.key}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => setGender(g.key)}
              activeOpacity={0.85}
            >
              <Ionicons name={g.icon as any} size={14} color={active ? white : inkSec} />
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{g.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <Text style={styles.sectionLabel}>People near you</Text>
    </View>
  );

  return (
    <View style={styles.root}>
      <ScreenGradient />
      <StatusBar barStyle="dark-content" backgroundColor="#F3ECFF" />
      <FlatList
        data={people}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.row}
        ListHeaderComponent={Header}
        contentContainerStyle={[styles.grid, { paddingBottom: insets.bottom + 90 }]}
        showsVerticalScrollIndicator={false}
        renderItem={({ item, index }) => (
          <PersonCard person={item} index={index} onPress={() => router.push(`/(app)/user/${item.id}` as any)} />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="planet-outline" size={48} color="#D6D3E0" />
            <Text style={styles.emptyText}>No {gender !== 'all' ? `${gender} ` : ''}people nearby yet</Text>
          </View>
        }
      />
    </View>
  );
}

// ─── Scope styles ───────────────────────────────────────────────────────────────
const scope = StyleSheet.create({
  wrap: { width: SCOPE, height: SCOPE, alignSelf: 'center', alignItems: 'center', justifyContent: 'center', marginVertical: 8 },
  ring: { position: 'absolute', borderWidth: 1, borderColor: 'rgba(124,58,237,0.18)' },
  pulse: { position: 'absolute', backgroundColor: 'rgba(124,58,237,0.16)' },
  sweepBox: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  center: {
    width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center',
    shadowColor: brand, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 10, elevation: 8,
  },
  blip: { position: 'absolute', width: 36, height: 36 },
  blipImg: { width: 36, height: 36, borderRadius: 18, borderWidth: 2, borderColor: white },
  blipFallback: { backgroundColor: '#EDE9FE', alignItems: 'center', justifyContent: 'center' },
  blipDot: {
    position: 'absolute', bottom: 0, right: 0, width: 11, height: 11, borderRadius: 6,
    backgroundColor: success, borderWidth: 2, borderColor: white,
  },
});

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F7F2FF' },

  hero: { paddingHorizontal: 20, paddingBottom: 18 },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  title: { fontSize: 28, fontWeight: '900', color: ink, letterSpacing: -0.6 },
  subtitle: { fontSize: 13, color: inkSec, marginTop: 2 },

  mapBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.6)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.85)',
    shadowColor: brand, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 6, elevation: 2,
  },
  mapBtnText: { fontSize: 13, fontWeight: '700', color: brand },

  statPill: {
    alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(255,255,255,0.65)', paddingHorizontal: 16, paddingVertical: 9, borderRadius: 999,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.85)',
    shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 10, elevation: 3,
  },
  livePulse: { width: 8, height: 8, borderRadius: 4, backgroundColor: success },
  statText: { fontSize: 13, color: inkSec, fontWeight: '500' },
  statNum: { fontWeight: '800', color: ink },

  chipRow: { paddingHorizontal: 20, gap: 8, paddingTop: 16, paddingBottom: 4 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 15, paddingVertical: 9, borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.55)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.85)',
  },
  chipActive: { backgroundColor: brand, borderColor: brand },
  chipText: { fontSize: 13, fontWeight: '600', color: inkSec },
  chipTextActive: { color: white },

  sectionLabel: { fontSize: 15, fontWeight: '800', color: ink, paddingHorizontal: 20, paddingTop: 18, paddingBottom: 4 },

  grid: { paddingHorizontal: 16, gap: 16 },
  row: { gap: 16, paddingHorizontal: 0 },

  card: {
    height: CARD_W * 1.34, borderRadius: 22, overflow: 'hidden', backgroundColor: bgSec,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 4,
  },
  cardFallback: { backgroundColor: '#EDE9FE', alignItems: 'center', justifyContent: 'center' },
  onlineTag: {
    position: 'absolute', top: 10, left: 10,
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(0,0,0,0.45)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999,
  },
  onlineDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: success },
  onlineText: { fontSize: 10, fontWeight: '700', color: white },
  distChip: {
    position: 'absolute', top: 10, right: 10,
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: 'rgba(0,0,0,0.4)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999,
  },
  distChipText: { fontSize: 10, fontWeight: '600', color: white },
  cardInfo: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 12 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  cardName: { fontSize: 16, fontWeight: '800', color: white },
  cardTags: { fontSize: 11, color: 'rgba(255,255,255,0.85)', marginTop: 2 },

  empty: { alignItems: 'center', marginTop: 60, gap: 12 },
  emptyText: { fontSize: 15, color: inkSec },
});
