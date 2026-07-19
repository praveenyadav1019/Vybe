import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Switch, StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  FadeInDown, FadeInUp,
  useSharedValue, useAnimatedStyle,
  withRepeat, withTiming, withSequence,
  Easing,
} from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { useStrangerStore, type StrangerMode, type GenderPref } from '../../src/stores/strangerStore';
import { ScreenGradient } from '../../src/components/ui/ScreenGradient';

// ─── Color tokens ─────────────────────────────────────────────────────────────
const bg     = '#F8F8FC';
const ink    = '#1A1A2E';
const muted  = '#6B7280';
const white  = '#FFFFFF';
const brand  = '#7C3AED';
const accent = '#00C2CB';
const border = '#E8E8F0';
const safe   = '#ECFDF5';
const safeTx = '#065F46';

// ─── Pulsing Orb ──────────────────────────────────────────────────────────────
function PulsingOrb({ onlineCount }: { onlineCount: number }) {
  const scale1 = useSharedValue(1);
  const scale2 = useSharedValue(1);
  const scale3 = useSharedValue(1);

  useEffect(() => {
    scale1.value = withRepeat(
      withSequence(
        withTiming(1.18, { duration: 1600, easing: Easing.inOut(Easing.ease) }),
        withTiming(1,    { duration: 1600, easing: Easing.inOut(Easing.ease) }),
      ), -1, false,
    );
    scale2.value = withRepeat(
      withSequence(
        withTiming(1,    { duration: 400 }),
        withTiming(1.22, { duration: 1600, easing: Easing.inOut(Easing.ease) }),
        withTiming(1,    { duration: 1600, easing: Easing.inOut(Easing.ease) }),
      ), -1, false,
    );
    scale3.value = withRepeat(
      withSequence(
        withTiming(1,    { duration: 800 }),
        withTiming(1.28, { duration: 1600, easing: Easing.inOut(Easing.ease) }),
        withTiming(1,    { duration: 1600, easing: Easing.inOut(Easing.ease) }),
      ), -1, false,
    );
  }, []);

  const a1 = useAnimatedStyle(() => ({ transform: [{ scale: scale1.value }] }));
  const a2 = useAnimatedStyle(() => ({ transform: [{ scale: scale2.value }] }));
  const a3 = useAnimatedStyle(() => ({ transform: [{ scale: scale3.value }] }));

  return (
    <View style={orb.container}>
      <Animated.View style={[orb.ring3, a3]} />
      <Animated.View style={[orb.ring2, a2]} />
      <Animated.View style={[orb.ring1, a1]}>
        <LinearGradient
          colors={['#9333EA', accent]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={orb.center}
        >
          <Ionicons name="flash" size={28} color={white} />
        </LinearGradient>
      </Animated.View>
      {/* Online count badge */}
      <View style={orb.badge}>
        <View style={orb.badgeDot} />
        <Text style={orb.badgeText}>{onlineCount.toLocaleString()} online</Text>
      </View>
    </View>
  );
}

// ─── Mode Card ────────────────────────────────────────────────────────────────
function ModeCard({
  mode, icon, label, desc, active, onPress,
}: {
  mode: StrangerMode; icon: string; label: string; desc: string;
  active: boolean; onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[card.wrap, active && card.wrapActive]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {active ? (
        <LinearGradient
          colors={['#7C3AED', '#9333EA']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={card.iconBox}
        >
          <Ionicons name={icon as any} size={20} color={white} />
        </LinearGradient>
      ) : (
        <View style={[card.iconBox, card.iconBoxInactive]}>
          <Ionicons name={icon as any} size={20} color={muted} />
        </View>
      )}
      <Text style={[card.label, active && card.labelActive]}>{label}</Text>
      <Text style={card.desc}>{desc}</Text>
      {active && <View style={card.activeDot} />}
    </TouchableOpacity>
  );
}

// ─── Gender chip ──────────────────────────────────────────────────────────────
function GenderChip({
  label, active, onPress,
}: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      style={[chip.base, active && chip.active]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text style={[chip.label, active && chip.labelActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function MeetScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const {
    preferences, stats,
    setPreferences, joinQueue, fetchStats,
  } = useStrangerStore();

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void fetchStats();
    const t = setInterval(() => void fetchStats(), 30_000);
    return () => clearInterval(t);
  }, []);

  const handleStart = async () => {
    setLoading(true);
    joinQueue();
    router.push('/(app)/stranger/queue' as any);
    setLoading(false);
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#F3ECFF" />

      {/* Ambient glass gradient canvas */}
      <ScreenGradient />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
      >
        {/* ── Header ──────────────────────────────────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(0).duration(350)} style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Meet Strangers</Text>
            <Text style={styles.headerSub}>Anonymous • Safe • Real connections</Text>
          </View>
          <TouchableOpacity
            style={styles.historyBtn}
            onPress={() => router.push('/(app)/stranger/sessions' as any)}
            activeOpacity={0.75}
          >
            <Ionicons name="time-outline" size={20} color={brand} />
          </TouchableOpacity>
        </Animated.View>

        {/* ── Orb hero ────────────────────────────────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(60).duration(400)} style={styles.orbSection}>
          <PulsingOrb onlineCount={stats.onlineCount} />
          <Text style={styles.orbTagline}>You never know who you'll meet</Text>
        </Animated.View>

        {/* ── Chat Mode ────────────────────────────────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(120).duration(350)} style={styles.section}>
          <Text style={styles.sectionLabel}>Chat Mode</Text>
          <View style={styles.modeRow}>
            <ModeCard
              mode="text" icon="chatbubble-ellipses-outline"
              label="Text" desc="Anonymous chat"
              active={preferences.mode === 'text'}
              onPress={() => setPreferences({ mode: 'text' })}
            />
            <ModeCard
              mode="video" icon="videocam-outline"
              label="Video" desc="Face to face"
              active={preferences.mode === 'video'}
              onPress={() => setPreferences({ mode: 'video' })}
            />
            <ModeCard
              mode="audio" icon="mic-outline"
              label="Voice" desc="Voice only"
              active={preferences.mode === 'audio'}
              onPress={() => setPreferences({ mode: 'audio' })}
            />
          </View>
        </Animated.View>

        {/* ── Gender Preference ─────────────────────────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(160).duration(350)} style={styles.section}>
          <Text style={styles.sectionLabel}>Match With</Text>
          <View style={styles.chipRow}>
            {(['everyone', 'male', 'female'] as GenderPref[]).map((g) => (
              <GenderChip
                key={g}
                label={g === 'everyone' ? 'Everyone' : g === 'male' ? 'Men' : 'Women'}
                active={preferences.genderPref === g}
                onPress={() => setPreferences({ genderPref: g })}
              />
            ))}
          </View>
        </Animated.View>

        {/* ── Nearby Only toggle ────────────────────────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(200).duration(350)} style={styles.section}>
          <View style={styles.toggleRow}>
            <View style={styles.toggleLeft}>
              <Ionicons name="location-outline" size={18} color={brand} style={{ marginRight: 8 }} />
              <View>
                <Text style={styles.toggleLabel}>Nearby Only</Text>
                <Text style={styles.toggleSub}>Match with people in your area</Text>
              </View>
            </View>
            <Switch
              value={preferences.nearbyOnly}
              onValueChange={(v) => setPreferences({ nearbyOnly: v })}
              trackColor={{ false: border, true: brand }}
              thumbColor={white}
              ios_backgroundColor={border}
            />
          </View>
        </Animated.View>

        {/* ── Safety note ───────────────────────────────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(240).duration(350)} style={styles.safetyBox}>
          <Ionicons name="shield-checkmark" size={16} color={safeTx} />
          <Text style={styles.safetyText}>
            All sessions are monitored for safety. Tap the flag icon anytime to report.
          </Text>
        </Animated.View>

        {/* ── CTA ───────────────────────────────────────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(280).duration(350)} style={styles.ctaSection}>
          <TouchableOpacity
            onPress={handleStart}
            activeOpacity={0.88}
            disabled={loading}
            style={styles.ctaWrap}
          >
            <LinearGradient
              colors={['#7C3AED', accent]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={styles.ctaBtn}
            >
              <Ionicons name="flash" size={20} color={white} style={{ marginRight: 8 }} />
              <Text style={styles.ctaText}>
                {loading ? 'Starting…' : 'Start Matching'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
          <Text style={styles.ctaHint}>
            Avg wait: ~{Math.max(3, Math.round(30 / Math.max(1, stats.queueSize)))}s
          </Text>
        </Animated.View>

        {/* ── How it works ──────────────────────────────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(320).duration(350)} style={styles.howCard}>
          <Text style={styles.howTitle}>How it works</Text>
          {[
            { icon: 'search-outline',        step: '1', text: 'We find someone anonymous nearby' },
            { icon: 'chatbubbles-outline',    step: '2', text: 'Chat freely — no profile, no pressure' },
            { icon: 'person-add-outline',     step: '3', text: 'Connect on VYBE if the vibe clicks' },
          ].map((s) => (
            <View key={s.step} style={styles.howRow}>
              <LinearGradient
                colors={['#EDE9FE', '#DDD6FE']}
                style={styles.howIcon}
              >
                <Ionicons name={s.icon as any} size={16} color={brand} />
              </LinearGradient>
              <Text style={styles.howText}>{s.text}</Text>
            </View>
          ))}
        </Animated.View>
      </ScrollView>
    </View>
  );
}

// ─── Orb styles ───────────────────────────────────────────────────────────────
const ORB_CORE = 80;
const ORB_R2   = 120;
const ORB_R3   = 164;

const orb = StyleSheet.create({
  container: {
    width: ORB_R3, height: ORB_R3 + 36,
    alignItems: 'center', justifyContent: 'center',
    alignSelf: 'center',
  },
  ring3: {
    position: 'absolute',
    width: ORB_R3, height: ORB_R3, borderRadius: ORB_R3 / 2,
    backgroundColor: 'rgba(124,58,237,0.06)',
  },
  ring2: {
    position: 'absolute',
    width: ORB_R2, height: ORB_R2, borderRadius: ORB_R2 / 2,
    backgroundColor: 'rgba(124,58,237,0.10)',
  },
  ring1: {
    position: 'absolute',
    width: ORB_CORE, height: ORB_CORE, borderRadius: ORB_CORE / 2,
    shadowColor: brand,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 12,
  },
  center: {
    width: ORB_CORE, height: ORB_CORE, borderRadius: ORB_CORE / 2,
    alignItems: 'center', justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    bottom: 0,
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: white,
    paddingHorizontal: 12, paddingVertical: 5,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  badgeDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: '#10B981',
  },
  badgeText: { fontSize: 12, fontWeight: '600', color: ink },
});

// ─── Mode card styles ─────────────────────────────────────────────────────────
const card = StyleSheet.create({
  wrap: {
    flex: 1, alignItems: 'center', gap: 6,
    paddingVertical: 14, paddingHorizontal: 8,
    backgroundColor: 'rgba(255,255,255,0.55)',
    borderRadius: 16,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.8)',
    position: 'relative',
    shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08, shadowRadius: 10, elevation: 2,
  },
  wrapActive: {
    borderColor: brand,
    backgroundColor: 'rgba(255,255,255,0.8)',
    shadowOpacity: 0.2, shadowRadius: 14, elevation: 4,
  },
  iconBox: {
    width: 40, height: 40, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  iconBoxInactive: {
    backgroundColor: '#F3F4F6',
  },
  label: { fontSize: 13, fontWeight: '600', color: muted },
  labelActive: { color: brand },
  desc: { fontSize: 11, color: muted, textAlign: 'center' },
  activeDot: {
    position: 'absolute', top: 8, right: 8,
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: brand,
  },
});

// ─── Chip styles ──────────────────────────────────────────────────────────────
const chip = StyleSheet.create({
  base: {
    flex: 1, paddingVertical: 10,
    alignItems: 'center', justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.8)',
    backgroundColor: 'rgba(255,255,255,0.55)',
  },
  active: {
    borderColor: brand,
    backgroundColor: 'rgba(245,243,255,0.9)',
  },
  label: { fontSize: 13, fontWeight: '600', color: muted },
  labelActive: { color: brand },
});

// ─── Main styles ──────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: bg },
  heroBackdrop: { position: 'absolute', top: 0, left: 0, right: 0, height: 480 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 4,
  },
  headerTitle: { fontSize: 26, fontWeight: '800', color: ink },
  headerSub:   { fontSize: 12, color: muted, marginTop: 2 },
  historyBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#F0EEFF',
    alignItems: 'center', justifyContent: 'center',
  },

  // Orb
  orbSection: { alignItems: 'center', paddingVertical: 28 },
  orbTagline: {
    fontSize: 14, color: muted,
    fontStyle: 'italic',
    marginTop: 8,
  },

  // Sections
  section: { paddingHorizontal: 20, marginBottom: 20 },
  sectionLabel: {
    fontSize: 14, fontWeight: '700', color: ink,
    marginBottom: 12,
  },
  modeRow: { flexDirection: 'row', gap: 10 },
  chipRow: { flexDirection: 'row', gap: 10 },

  // Toggle row
  toggleRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.55)',
    borderRadius: 16,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.8)',
    padding: 16,
  },
  toggleLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  toggleLabel: { fontSize: 14, fontWeight: '600', color: ink },
  toggleSub:   { fontSize: 11, color: muted, marginTop: 1 },

  // Safety
  safetyBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: safe,
    marginHorizontal: 20, marginBottom: 24,
    paddingHorizontal: 14, paddingVertical: 12,
    borderRadius: 12,
  },
  safetyText: { flex: 1, fontSize: 12, color: safeTx, lineHeight: 17 },

  // CTA
  ctaSection: { paddingHorizontal: 20, alignItems: 'center', marginBottom: 8 },
  ctaWrap: { width: '100%' },
  ctaBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    height: 56, borderRadius: 28,
    shadowColor: brand,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35, shadowRadius: 16,
    elevation: 8,
  },
  ctaText: { fontSize: 17, fontWeight: '700', color: white },
  ctaHint: { fontSize: 12, color: muted, marginTop: 10 },

  // How it works
  howCard: {
    marginHorizontal: 20, marginTop: 12,
    backgroundColor: 'rgba(255,255,255,0.55)',
    borderRadius: 16,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.8)',
    padding: 18, gap: 14,
  },
  howTitle: { fontSize: 15, fontWeight: '700', color: ink, marginBottom: 2 },
  howRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  howIcon: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  howText: { flex: 1, fontSize: 13, color: muted, lineHeight: 18 },
});
