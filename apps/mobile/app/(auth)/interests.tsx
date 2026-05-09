import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { useUserStore } from '@/stores/userStore';
import { colors } from '@/theme/colors';
import { Button } from '@/components/ui/Button';

const MIN_INTERESTS = 3;
const MAX_INTERESTS = 15;

interface InterestItem {
  emoji: string;
  label: string;
  category: string;
}

const INTERESTS: InterestItem[] = [
  { emoji: '🎵', label: 'Music', category: 'Arts' },
  { emoji: '✈️', label: 'Travel', category: 'Lifestyle' },
  { emoji: '🍜', label: 'Food', category: 'Lifestyle' },
  { emoji: '⚽', label: 'Sports', category: 'Active' },
  { emoji: '🎮', label: 'Gaming', category: 'Tech' },
  { emoji: '🎨', label: 'Art', category: 'Arts' },
  { emoji: '👗', label: 'Fashion', category: 'Lifestyle' },
  { emoji: '💻', label: 'Tech', category: 'Tech' },
  { emoji: '🌿', label: 'Nature', category: 'Outdoors' },
  { emoji: '📚', label: 'Reading', category: 'Arts' },
  { emoji: '🎬', label: 'Movies', category: 'Arts' },
  { emoji: '💃', label: 'Dance', category: 'Arts' },
  { emoji: '🏋️', label: 'Fitness', category: 'Active' },
  { emoji: '🧘', label: 'Yoga', category: 'Active' },
  { emoji: '☕', label: 'Coffee', category: 'Lifestyle' },
  { emoji: '🌙', label: 'Nightlife', category: 'Social' },
  { emoji: '🍳', label: 'Cooking', category: 'Lifestyle' },
  { emoji: '📸', label: 'Photography', category: 'Arts' },
  { emoji: '🚗', label: 'Cars', category: 'Lifestyle' },
  { emoji: '🏍️', label: 'Bikes', category: 'Active' },
  { emoji: '🐾', label: 'Pets', category: 'Lifestyle' },
  { emoji: '🕉️', label: 'Spirituality', category: 'Wellness' },
  { emoji: '🏏', label: 'Cricket', category: 'Sports' },
  { emoji: '⚽', label: 'Football', category: 'Sports' },
  { emoji: '🎸', label: 'Guitar', category: 'Arts' },
  { emoji: '🎭', label: 'Theatre', category: 'Arts' },
  { emoji: '🏖️', label: 'Beaches', category: 'Outdoors' },
  { emoji: '🧗', label: 'Hiking', category: 'Outdoors' },
  { emoji: '🍺', label: 'Craft Beer', category: 'Social' },
  { emoji: '🎪', label: 'Events', category: 'Social' },
];

function InterestChip({
  item,
  selected,
  onPress,
  disabled,
}: {
  item: InterestItem;
  selected: boolean;
  onPress: () => void;
  disabled: boolean;
}) {
  const scale = useSharedValue(1);
  const chipStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  function handlePress() {
    scale.value = withSpring(0.92, { damping: 10, stiffness: 300 }, () => {
      scale.value = withSpring(1, { damping: 12, stiffness: 200 });
    });
    onPress();
  }

  return (
    <Animated.View style={chipStyle}>
      <TouchableOpacity
        style={[
          styles.chip,
          selected && styles.chipSelected,
          disabled && !selected && styles.chipDisabled,
        ]}
        onPress={handlePress}
        activeOpacity={0.8}
        disabled={disabled && !selected}
      >
        <Text style={styles.chipEmoji}>{item.emoji}</Text>
        <Text style={[styles.chipLabel, selected && styles.chipLabelSelected]}>
          {item.label}
        </Text>
        {selected && (
          <Ionicons name="checkmark-circle" size={14} color={colors.primary} style={styles.chipCheck} />
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function InterestsScreen() {
  const router = useRouter();
  const token = useAuthStore((s) => s.token);
  const setProfile = useUserStore((s) => s.setProfile);

  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const count = selected.length;
  const isAtMax = count >= MAX_INTERESTS;
  const canContinue = count >= MIN_INTERESTS;

  function toggleInterest(label: string) {
    setSelected((prev) => {
      if (prev.includes(label)) {
        return prev.filter((i) => i !== label);
      }
      if (prev.length >= MAX_INTERESTS) return prev;
      return [...prev, label];
    });
  }

  async function handleContinue() {
    if (!canContinue) return;
    setLoading(true);
    try {
      await api.patch('/me', { interests: selected });
      setProfile({ interests: selected });
      router.replace('/(auth)/face-verify');
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to save interests.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Orbs */}
      <View style={styles.orb1} />
      <View style={styles.orb2} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </TouchableOpacity>
      </View>

      {/* Title */}
      <View style={styles.titleArea}>
        <Text style={styles.headline}>Pick your interests</Text>
        <Text style={styles.subtext}>
          Help us find your kind of people. Select at least 3.
        </Text>

        {/* Count pill */}
        <View style={[styles.countPill, canContinue && styles.countPillActive]}>
          <Text style={[styles.countText, canContinue && styles.countTextActive]}>
            {count}/{MAX_INTERESTS} selected
          </Text>
          {canContinue && (
            <Ionicons name="checkmark-circle" size={14} color={colors.success} />
          )}
        </View>
      </View>

      {/* Chips */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.chipsContainer}
        showsVerticalScrollIndicator={false}
      >
        {INTERESTS.map((item) => (
          <InterestChip
            key={item.label}
            item={item}
            selected={selected.includes(item.label)}
            onPress={() => toggleInterest(item.label)}
            disabled={isAtMax}
          />
        ))}
        {/* Bottom padding for the footer */}
        <View style={{ height: 24 }} />
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        {!canContinue && (
          <Text style={styles.footerHint}>
            Select {MIN_INTERESTS - count} more to continue
          </Text>
        )}
        <Button
          title={loading ? 'Saving...' : 'Continue'}
          onPress={handleContinue}
          disabled={!canContinue}
          loading={loading}
          gradient={canContinue}
          style={styles.continueBtn}
        />
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
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(124,58,237,0.09)',
    top: -60,
    right: -60,
  },
  orb2: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(0,229,255,0.06)',
    bottom: 100,
    left: -50,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleArea: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  headline: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  subtext: {
    fontSize: 14,
    color: colors.subtext,
    lineHeight: 21,
    marginBottom: 14,
  },
  countPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  countPillActive: {
    borderColor: colors.success,
    backgroundColor: 'rgba(34,197,94,0.08)',
  },
  countText: {
    color: colors.subtext,
    fontSize: 13,
    fontWeight: '600',
  },
  countTextActive: {
    color: colors.success,
  },
  scroll: {
    flex: 1,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 10,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  chipSelected: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(124,58,237,0.12)',
    shadowColor: colors.primary,
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
    elevation: 4,
  },
  chipDisabled: {
    opacity: 0.4,
  },
  chipEmoji: {
    fontSize: 16,
  },
  chipLabel: {
    color: colors.subtext,
    fontSize: 14,
    fontWeight: '600',
  },
  chipLabelSelected: {
    color: colors.text,
  },
  chipCheck: {
    marginLeft: 2,
  },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    paddingTop: 12,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 10,
  },
  footerHint: {
    textAlign: 'center',
    color: colors.subtext,
    fontSize: 13,
    fontWeight: '500',
  },
  continueBtn: {
    borderRadius: 16,
  },
});
