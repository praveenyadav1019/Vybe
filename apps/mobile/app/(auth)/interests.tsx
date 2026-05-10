import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  StyleSheet, StatusBar, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';

// ─── Interests list ───────────────────────────────────────────────────────────
const INTERESTS = [
  'Techno', 'Yoga', 'Wine Tasting', 'Fine Dining', 'Photography',
  'Film Festivals', 'Culinary Classes', 'Live Music', 'Art Galleries',
  'Hiking', 'Startups', 'Travel', 'Fashion', 'Nightlife', 'Cocktail Bars',
  'Gaming', 'Fitness', 'Reading', 'Cooking', 'Sports', 'Dancing', 'Movies',
];

const MIN_SELECT = 3;

// ─── Color tokens ─────────────────────────────────────────────────────────────
const ink    = '#1A1A2E';
const inkSec = '#6B7280';
const white  = '#FFFFFF';
const brand  = '#7C3AED';
const brandSoft = '#EDE9FE';

// ─── Chip component ───────────────────────────────────────────────────────────
function InterestChip({
  label, selected, onPress,
}: { label: string; selected: boolean; onPress: () => void }) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  function handlePress() {
    scale.value = withSpring(0.92, { damping: 10 }, () => {
      scale.value = withSpring(1, { damping: 10 });
    });
    onPress();
  }

  if (selected) {
    return (
      <Animated.View style={animStyle}>
        <TouchableOpacity onPress={handlePress} activeOpacity={0.9}>
          <LinearGradient
            colors={['#9333EA', '#7C3AED']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={styles.chipSelected}
          >
            <Text style={styles.chipTextSelected}>{label}</Text>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={animStyle}>
      <TouchableOpacity style={styles.chip} onPress={handlePress} activeOpacity={0.8}>
        <Text style={styles.chipText}>{label}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function InterestsScreen() {
  const insets  = useSafeAreaInsets();
  const router  = useRouter();
  const updateUser = useAuthStore((s) => s.updateUser);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  function toggle(interest: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(interest)) {
        next.delete(interest);
      } else {
        next.add(interest);
      }
      return next;
    });
  }

  async function handleContinue() {
    if (selected.size < MIN_SELECT) {
      Alert.alert('Select at least 3', 'Choose at least 3 interests to continue.');
      return;
    }
    setLoading(true);
    try {
      await api.patch('/users/me', { interests: [...selected] });
    } catch {
      // Non-fatal — proceed anyway
    } finally {
      setLoading(false);
    }
    router.replace('/(tabs)/home' as any);
  }

  const canContinue = selected.size >= MIN_SELECT;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor={white} />

      {/* ── Progress dots ────────────────────────────────────────────── */}
      <Animated.View entering={FadeInDown.delay(0).duration(350)} style={styles.dotsRow}>
        {[0, 1, 2].map((i) => (
          <View key={i} style={[styles.dot, i === 1 && styles.dotActive]} />
        ))}
      </Animated.View>

      {/* ── Header ──────────────────────────────────────────────────── */}
      <Animated.View entering={FadeInDown.delay(60).duration(350)} style={styles.header}>
        <Text style={styles.title}>Select Your Interests</Text>
        <Text style={styles.subtitle}>Tailor your social discovery experience.</Text>
      </Animated.View>

      {/* ── Interest chips ───────────────────────────────────────────── */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.chipsContainer}
      >
        <Animated.View entering={FadeInDown.delay(120).duration(380)} style={styles.chipsWrap}>
          {INTERESTS.map((interest) => (
            <InterestChip
              key={interest}
              label={interest}
              selected={selected.has(interest)}
              onPress={() => toggle(interest)}
            />
          ))}
        </Animated.View>
      </ScrollView>

      {/* ── Footer ──────────────────────────────────────────────────── */}
      <Animated.View
        entering={FadeInDown.delay(200).duration(380)}
        style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}
      >
        <TouchableOpacity
          onPress={handleContinue}
          disabled={!canContinue || loading}
          activeOpacity={0.88}
          style={{ width: '100%' }}
        >
          <LinearGradient
            colors={canContinue ? ['#9333EA', '#7C3AED'] : ['#D1D5DB', '#D1D5DB']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={styles.continueBtn}
          >
            <Text style={[styles.continueBtnText, !canContinue && { color: '#9CA3AF' }]}>
              {loading ? 'Saving…' : 'Continue'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.replace('/(tabs)/home' as any)}
          activeOpacity={0.7}
          style={{ marginTop: 14 }}
        >
          <Text style={styles.skipText}>Skip for now</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: white },

  // ── Progress ────────────────────────────────────────────────────────────────
  dotsRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingTop: 12, paddingBottom: 4,
  },
  dot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: '#E5E7EB',
  },
  dotActive: { backgroundColor: '#7C3AED', width: 24 },

  // ── Header ─────────────────────────────────────────────────────────────────
  header: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 12, alignItems: 'center' },
  title: { fontSize: 26, fontWeight: '800', color: '#1A1A2E', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 20 },

  // ── Chips ──────────────────────────────────────────────────────────────────
  chipsContainer: { paddingHorizontal: 20, paddingBottom: 8 },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' },
  chip: {
    paddingHorizontal: 18, paddingVertical: 10,
    borderRadius: 9999,
    borderWidth: 1.5, borderColor: '#E5E7EB',
    backgroundColor: white,
  },
  chipText: { fontSize: 14, color: '#1A1A2E', fontWeight: '500' },
  chipSelected: {
    paddingHorizontal: 18, paddingVertical: 10,
    borderRadius: 9999,
  },
  chipTextSelected: { fontSize: 14, color: white, fontWeight: '600' },

  // ── Footer ─────────────────────────────────────────────────────────────────
  footer: {
    paddingHorizontal: 24, paddingTop: 12,
    alignItems: 'center',
    borderTopWidth: 1, borderTopColor: '#F3F4F6',
    backgroundColor: white,
  },
  continueBtn: {
    height: 52, borderRadius: 9999,
    alignItems: 'center', justifyContent: 'center',
  },
  continueBtnText: { fontSize: 16, fontWeight: '700', color: white },
  skipText: { fontSize: 14, color: '#9CA3AF', fontWeight: '500' },
});
