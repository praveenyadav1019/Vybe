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
  withRepeat, withTiming, withSequence,
} from 'react-native-reanimated';
import { useDiscoveryStore } from '../../src/stores/discoveryStore';
import { useLocationStore } from '../../src/stores/locationStore';
import type { NearbyUser } from '../../src/types';

const { width: W } = Dimensions.get('window');
const CARD_W = (W - 48) / 2;

// ─── Color tokens ─────────────────────────────────────────────────────────────
const ink     = '#111827';
const inkSec  = '#6B7280';
const muted    = '#9CA3AF';
const white   = '#FFFFFF';
const brand   = '#7C3AED';
const bgSec   = '#F9FAFB';
const border   = '#ECECF1';
const success = '#22C55E';

type Gender = 'all' | 'female' | 'male';

const GENDERS: { key: Gender; label: string }[] = [
  { key: 'all',    label: 'All' },
  { key: 'female', label: 'Female' },
  { key: 'male',   label: 'Male' },
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

// ─── Live pulse dot ─────────────────────────────────────────────────────────────
function PulseDot() {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0.85);
  useEffect(() => {
    scale.value = withRepeat(withSequence(withTiming(1.5, { duration: 700 }), withTiming(1, { duration: 700 })), -1);
    opacity.value = withRepeat(withSequence(withTiming(0.3, { duration: 700 }), withTiming(0.85, { duration: 700 })), -1);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }], opacity: opacity.value }));
  return <Animated.View style={[styles.pulseDot, style]} />;
}

// ─── Person card ──────────────────────────────────────────────────────────────
function PersonCard({ person, index, onPress }: { person: NearbyUser; index: number; onPress: () => void }) {
  const photo = (person as any).photos?.[0];
  return (
    <Animated.View entering={FadeInDown.delay(index * 50).duration(360)} style={{ width: CARD_W }}>
      <TouchableOpacity style={styles.card} activeOpacity={0.88} onPress={onPress}>
        {photo ? (
          <Image source={{ uri: photo }} style={StyleSheet.absoluteFillObject} contentFit="cover" />
        ) : (
          <View style={[StyleSheet.absoluteFillObject, styles.cardFallback]}>
            <Ionicons name="person" size={40} color={brand} />
          </View>
        )}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.72)']}
          locations={[0.4, 1]}
          style={StyleSheet.absoluteFillObject}
        />
        {(person as any).isOnline && (
          <View style={styles.onlineTag}>
            <View style={styles.onlineDot} />
            <Text style={styles.onlineText}>Online</Text>
          </View>
        )}
        <View style={styles.cardInfo}>
          <Text style={styles.cardName} numberOfLines={1}>
            {person.name}{(person as any).age ? `, ${(person as any).age}` : ''}
          </Text>
          <View style={styles.distRow}>
            <Ionicons name="location" size={11} color="rgba(255,255,255,0.85)" />
            <Text style={styles.cardDist}>{(person as any).distance ?? 'Nearby'}</Text>
          </View>
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
  const city = useLocationStore((s) => s.city);

  // Use live data if present, otherwise fall back to mock so the screen is populated.
  const source: any[] = nearbyUsers && nearbyUsers.length > 0 ? nearbyUsers : MOCK;
  const people = source.filter((p) => gender === 'all' || p.gender === gender);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor={white} />

      {/* Header */}
      <Animated.View entering={FadeInDown.delay(0).duration(350)} style={styles.header}>
        <View>
          <View style={styles.titleRow}>
            <PulseDot />
            <Text style={styles.title}>Nearby</Text>
          </View>
          <Text style={styles.subtitle}>
            {people.length} people {city ? `around ${city}` : 'around you'}
          </Text>
        </View>
        <TouchableOpacity style={styles.mapBtn} activeOpacity={0.85} onPress={() => router.push('/(app)/radar' as any)}>
          <Ionicons name="navigate" size={16} color={brand} />
          <Text style={styles.mapBtnText}>Map</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Gender filter */}
      <Animated.View entering={FadeInDown.delay(40).duration(350)}>
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
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{g.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </Animated.View>

      {/* People grid */}
      <FlatList
        data={people}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={[styles.grid, { paddingBottom: insets.bottom + 90 }]}
        showsVerticalScrollIndicator={false}
        renderItem={({ item, index }) => (
          <PersonCard
            person={item}
            index={index}
            onPress={() => router.push(`/(app)/user/${item.id}` as any)}
          />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="people-outline" size={48} color={border} />
            <Text style={styles.emptyText}>No {gender !== 'all' ? `${gender} ` : ''}people nearby</Text>
          </View>
        }
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: white },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 14, paddingBottom: 10,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontSize: 24, fontWeight: '800', color: ink, letterSpacing: -0.4 },
  subtitle: { fontSize: 12, color: inkSec, marginTop: 2 },
  pulseDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: success },

  mapBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999,
    backgroundColor: '#F5F3FF', borderWidth: 1, borderColor: '#E9E2FF',
  },
  mapBtnText: { fontSize: 13, fontWeight: '700', color: brand },

  chipRow: { paddingHorizontal: 20, gap: 8, paddingBottom: 14 },
  chip: {
    paddingHorizontal: 16, paddingVertical: 7, borderRadius: 999,
    backgroundColor: white, borderWidth: 1, borderColor: '#E5E7EB',
  },
  chipActive: { backgroundColor: brand, borderColor: brand },
  chipText: { fontSize: 13, fontWeight: '600', color: inkSec },
  chipTextActive: { color: white },

  grid: { paddingHorizontal: 16, gap: 16 },
  row: { gap: 16 },

  card: {
    height: CARD_W * 1.32,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: bgSec,
  },
  cardFallback: { backgroundColor: '#EDE9FE', alignItems: 'center', justifyContent: 'center' },
  onlineTag: {
    position: 'absolute', top: 10, left: 10,
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999,
  },
  onlineDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: success },
  onlineText: { fontSize: 10, fontWeight: '700', color: white },
  cardInfo: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 12 },
  cardName: { fontSize: 15, fontWeight: '700', color: white },
  distRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 },
  cardDist: { fontSize: 11, color: 'rgba(255,255,255,0.85)' },

  empty: { alignItems: 'center', marginTop: 80, gap: 12 },
  emptyText: { fontSize: 15, color: inkSec },
});
