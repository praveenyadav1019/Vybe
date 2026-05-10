import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  StatusBar, Alert, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useRouter } from 'expo-router';

// ─── Color tokens ─────────────────────────────────────────────────────────────
const ink    = '#1A1A2E';
const inkSec = '#6B7280';
const white  = '#FFFFFF';
const brand  = '#7C3AED';
const bgSec  = '#F9FAFB';
const border = '#E5E7EB';

// ─── Option cards ─────────────────────────────────────────────────────────────
const OPTIONS = [
  {
    icon: 'flag-outline' as const,
    title: 'Report a Profile',
    desc: 'For fake, impersonating, or suspicious profiles.',
    delay: 120,
  },
  {
    icon: 'chatbubble-ellipses-outline' as const,
    title: 'Report Inappropriate Content',
    desc: 'For offensive, harassing, or harmful messages or media.',
    delay: 180,
  },
  {
    icon: 'person-remove-outline' as const,
    title: 'Block User',
    desc: 'To prevent them from contacting you.',
    delay: 240,
  },
];

function OptionCard({
  icon, title, desc, delay, onPress,
}: {
  icon: (typeof OPTIONS)[0]['icon'];
  title: string;
  desc: string;
  delay: number;
  onPress: () => void;
}) {
  return (
    <Animated.View entering={FadeInDown.delay(delay).duration(380)}>
      <TouchableOpacity style={styles.optionCard} onPress={onPress} activeOpacity={0.82}>
        <View style={styles.optionIcon}>
          <Ionicons name={icon} size={22} color={brand} />
        </View>
        <View style={styles.optionText}>
          <Text style={styles.optionTitle}>{title}</Text>
          <Text style={styles.optionDesc}>{desc}</Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color="#D1D5DB" />
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function SafetyReportingScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor={white} />

      {/* Header */}
      <Animated.View entering={FadeInDown.delay(0).duration(350)} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.8} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={ink} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Safety and Reporting Center</Text>
        <View style={{ width: 36 }} />
      </Animated.View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}>
        {/* Hero text */}
        <Animated.View entering={FadeInDown.delay(60).duration(380)} style={styles.hero}>
          <Text style={styles.heroTitle}>We're here to help.</Text>
          <Text style={styles.heroSub}>
            Let's make this community safe together.{'\n'}Select an option below to get started.
          </Text>
        </Animated.View>

        {/* Option cards */}
        <View style={styles.cards}>
          {OPTIONS.map((opt) => (
            <OptionCard
              key={opt.title}
              icon={opt.icon}
              title={opt.title}
              desc={opt.desc}
              delay={opt.delay}
              onPress={() => Alert.alert(opt.title, 'Submitting your report...')}
            />
          ))}
        </View>

        {/* Community Guidelines */}
        <Animated.View entering={FadeInDown.delay(320).duration(380)} style={styles.guidelines}>
          <Text style={styles.guidelinesTitle}>Community Guidelines</Text>
          <Text style={styles.guidelinesBody}>
            Learn more about our commitment to safety and respectful interactions.
          </Text>
          <TouchableOpacity activeOpacity={0.7} onPress={() => Alert.alert('Safety Tips', 'Opening guidelines...')}>
            <Text style={styles.guidelinesLink}>View Safety Tips &amp; Guidelines</Text>
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
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4,
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, fontSize: 15, fontWeight: '700', color: ink, textAlign: 'center' },

  hero: { paddingHorizontal: 28, paddingTop: 32, paddingBottom: 24, alignItems: 'center' },
  heroTitle: { fontSize: 24, fontWeight: '800', color: ink, textAlign: 'center', marginBottom: 10 },
  heroSub: { fontSize: 14, color: inkSec, textAlign: 'center', lineHeight: 22 },

  cards: { paddingHorizontal: 20, gap: 12 },
  optionCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: bgSec,
    borderRadius: 16,
    padding: 18,
    gap: 14,
    borderWidth: 1, borderColor: border,
  },
  optionIcon: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#EDE9FE',
    alignItems: 'center', justifyContent: 'center',
  },
  optionText: { flex: 1 },
  optionTitle: { fontSize: 15, fontWeight: '700', color: ink, marginBottom: 3 },
  optionDesc: { fontSize: 13, color: inkSec, lineHeight: 18 },

  guidelines: {
    marginHorizontal: 20, marginTop: 28, padding: 20,
    backgroundColor: bgSec, borderRadius: 16, borderWidth: 1, borderColor: border,
  },
  guidelinesTitle: { fontSize: 15, fontWeight: '700', color: ink, marginBottom: 6 },
  guidelinesBody: { fontSize: 13, color: inkSec, lineHeight: 19, marginBottom: 10 },
  guidelinesLink: { fontSize: 13, fontWeight: '600', color: brand },
});
