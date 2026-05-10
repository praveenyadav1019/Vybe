import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Dimensions, ScrollView, StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';

const { width: W } = Dimensions.get('window');
const CARD_W = (W - 48) / 2;   // 2-column grid with 16px gap + 16px margins

// ─── Mode definitions ─────────────────────────────────────────────────────────
const MODES = [
  {
    key: 'dating',
    label: 'Dating Mode',
    sub: 'Find your perfect match',
    icon: 'heart' as const,
    iconColor: '#E11D48',
    bgColor: '#FFF0F3',
    ringColor: '#FECDD3',
    route: '/(app)/modes/dating',
  },
  {
    key: 'co-travel',
    label: 'Co-Travel Mode',
    sub: 'Find travel buddies',
    icon: 'globe-outline' as const,
    iconColor: '#2563EB',
    bgColor: '#EFF6FF',
    ringColor: '#BFDBFE',
    route: '/(app)/modes/co-travel',
  },
  {
    key: 'night-out',
    label: 'Night Out Mode',
    sub: 'Find people to party',
    icon: 'moon' as const,
    iconColor: '#D97706',
    bgColor: '#FFFBEB',
    ringColor: '#FDE68A',
    route: '/(app)/modes/night-out',
  },
  {
    key: 'hook',
    label: 'Hook Up Mode',
    sub: 'For casual connections',
    icon: 'infinite-outline' as const,
    iconColor: '#059669',
    bgColor: '#ECFDF5',
    ringColor: '#A7F3D0',
    route: '/(app)/modes/hook',
  },
  {
    key: 'club-mates',
    label: 'Club Mates',
    sub: 'Meet at the same venue',
    icon: 'people-outline' as const,
    iconColor: '#7C3AED',
    bgColor: '#F5F3FF',
    ringColor: '#DDD6FE',
    route: '/(app)/modes/club-mates',
  },
  {
    key: 'casual',
    label: 'Just Vibing',
    sub: 'Keep it chill & casual',
    icon: 'cafe-outline' as const,
    iconColor: '#0891B2',
    bgColor: '#ECFEFF',
    ringColor: '#A5F3FC',
    route: '/(app)/modes/night-out',
  },
] as const;

// ─── Color tokens ─────────────────────────────────────────────────────────────
const ink    = '#1A1A2E';
const inkSec = '#6B7280';
const white  = '#FFFFFF';
const brand  = '#7C3AED';

// ─── Mode card ────────────────────────────────────────────────────────────────
function ModeCard({
  mode, delay, onPress,
}: {
  mode: typeof MODES[number];
  delay: number;
  onPress: () => void;
}) {
  return (
    <Animated.View entering={FadeInDown.delay(delay).duration(380)} style={{ width: CARD_W }}>
      <TouchableOpacity
        style={[styles.card, { backgroundColor: mode.bgColor }]}
        activeOpacity={0.82}
        onPress={onPress}
      >
        {/* Icon circle */}
        <View style={[styles.iconCircle, { backgroundColor: mode.ringColor }]}>
          <Ionicons name={mode.icon} size={32} color={mode.iconColor} />
        </View>

        {/* Text */}
        <Text style={styles.cardTitle}>{mode.label}</Text>
        <Text style={styles.cardSub}>{mode.sub}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function ModeSelectionScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const rows: [typeof MODES[number], typeof MODES[number]][] = [];
  for (let i = 0; i < MODES.length; i += 2) {
    rows.push([MODES[i], MODES[i + 1]]);
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor={white} />

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <Animated.View entering={FadeInDown.delay(0).duration(350)} style={styles.header}>
        <Text style={styles.title}>Choose your mode</Text>
      </Animated.View>

      {/* ── Mode grid ───────────────────────────────────────────────────── */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.grid, { paddingBottom: insets.bottom + 24 }]}
      >
        {rows.map(([left, right], rowIdx) => (
          <View key={rowIdx} style={styles.row}>
            <ModeCard
              mode={left}
              delay={rowIdx * 80 + 60}
              onPress={() => router.push(left.route as any)}
            />
            {right && (
              <ModeCard
                mode={right}
                delay={rowIdx * 80 + 120}
                onPress={() => router.push(right.route as any)}
              />
            )}
          </View>
        ))}

        {/* ── Discover nearby button ──────────────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(560).duration(380)} style={styles.discoverWrap}>
          <TouchableOpacity
            style={styles.discoverBtn}
            activeOpacity={0.85}
            onPress={() => router.push('/(app)/radar' as any)}
          >
            <Ionicons name="navigate-circle-outline" size={20} color={brand} />
            <Text style={styles.discoverText}>Open Radar Map</Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: white },

  header: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: ink,
    letterSpacing: -0.3,
  },

  grid: {
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 16,
  },
  row: {
    flexDirection: 'row',
    gap: 16,
  },

  card: {
    flex: 1,
    borderRadius: 20,
    padding: 20,
    minHeight: 170,
    alignItems: 'flex-start',
    justifyContent: 'flex-end',
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: ink,
    marginBottom: 3,
  },
  cardSub: {
    fontSize: 12,
    color: inkSec,
    lineHeight: 16,
  },

  discoverWrap: {
    alignItems: 'center',
    marginTop: 8,
  },
  discoverBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 9999,
    borderWidth: 1.5,
    borderColor: '#DDD6FE',
    backgroundColor: '#F5F3FF',
  },
  discoverText: {
    fontSize: 14,
    fontWeight: '600',
    color: brand,
  },
});
