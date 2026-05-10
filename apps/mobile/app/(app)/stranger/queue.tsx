import React, { useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  FadeIn, FadeInDown,
  useSharedValue, useAnimatedStyle,
  withRepeat, withSequence, withTiming, withSpring,
  Easing, runOnJS,
} from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { useStrangerStore } from '../../../src/stores/strangerStore';

// ─── Color tokens ─────────────────────────────────────────────────────────────
const bg    = '#F8F8FC';
const ink   = '#1A1A2E';
const muted = '#6B7280';
const white = '#FFFFFF';
const brand = '#7C3AED';
const accent = '#00C2CB';

// ─── Dot loader ───────────────────────────────────────────────────────────────
function SearchingDot({ delay }: { delay: number }) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1, { duration: delay }),
        withTiming(1.4, { duration: 300, easing: Easing.out(Easing.ease) }),
        withTiming(1, { duration: 300, easing: Easing.in(Easing.ease) }),
      ), -1, false,
    );
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.3, { duration: delay }),
        withTiming(1, { duration: 300 }),
        withTiming(0.3, { duration: 300 }),
      ), -1, false,
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return <Animated.View style={[styles.dot, style]} />;
}

// ─── Match found overlay ──────────────────────────────────────────────────────
function MatchFoundCard({ onContinue }: { onContinue: () => void }) {
  const scale = useSharedValue(0.6);
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 250 });
    scale.value = withSpring(1, { damping: 12, stiffness: 180 });
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <View style={overlay.bg}>
      <Animated.View style={[overlay.card, style]}>
        <LinearGradient
          colors={['#7C3AED', accent]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={overlay.iconCircle}
        >
          <Ionicons name="flash" size={32} color={white} />
        </LinearGradient>
        <Text style={overlay.title}>Match Found!</Text>
        <Text style={overlay.sub}>Someone is ready to chat with you</Text>
        <TouchableOpacity onPress={onContinue} activeOpacity={0.85}>
          <LinearGradient
            colors={['#7C3AED', accent]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={overlay.btn}
          >
            <Text style={overlay.btnText}>Start Chatting</Text>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function StrangerQueueScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { status, queuePosition, session, preferences, leaveQueue } = useStrangerStore();

  // Navigate into the chat screen once matched + user taps "Start Chatting"
  const handleContinue = () => {
    if (preferences.mode === 'text') {
      router.replace('/(app)/stranger/chat' as any);
    } else {
      router.replace('/(app)/stranger/video' as any);
    }
  };

  // If they backed out before matching, leave queue
  const handleCancel = () => {
    leaveQueue();
    router.back();
  };

  // Elapsed timer
  const [elapsed, setElapsed] = React.useState(0);
  useEffect(() => {
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, []);
  const mm = String(Math.floor(elapsed / 60)).padStart(2, '0');
  const ss = String(elapsed % 60).padStart(2, '0');

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor={bg} />

      {/* Cancel button */}
      <Animated.View entering={FadeIn.duration(300)} style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={handleCancel} style={styles.cancelBtn} activeOpacity={0.75}>
          <Ionicons name="close" size={22} color={ink} />
        </TouchableOpacity>
      </Animated.View>

      <View style={styles.center}>
        {/* Animated searching visual */}
        <Animated.View entering={FadeInDown.delay(60).duration(400)} style={styles.orbWrap}>
          <LinearGradient
            colors={['rgba(124,58,237,0.10)', 'rgba(0,194,203,0.10)']}
            style={styles.orbOuter}
          >
            <LinearGradient
              colors={['rgba(124,58,237,0.18)', 'rgba(0,194,203,0.18)']}
              style={styles.orbInner}
            >
              <LinearGradient
                colors={['#7C3AED', accent]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={styles.orbCore}
              >
                <Ionicons name="search" size={26} color={white} />
              </LinearGradient>
            </LinearGradient>
          </LinearGradient>

          {/* Dots */}
          <View style={styles.dotsRow}>
            <SearchingDot delay={0} />
            <SearchingDot delay={200} />
            <SearchingDot delay={400} />
          </View>
        </Animated.View>

        {/* Labels */}
        <Animated.View entering={FadeInDown.delay(140).duration(350)} style={styles.labels}>
          <Text style={styles.mainLabel}>Finding your match…</Text>
          <Text style={styles.timerText}>{mm}:{ss}</Text>
          {queuePosition > 0 && (
            <Text style={styles.positionText}>
              Position in queue: #{queuePosition}
            </Text>
          )}
          <Text style={styles.modeText}>
            {preferences.mode === 'text' ? 'Text chat' : preferences.mode === 'video' ? 'Video chat' : 'Voice chat'}
            {' · '}
            {preferences.genderPref === 'everyone' ? 'Everyone' : preferences.genderPref === 'male' ? 'Men' : 'Women'}
            {preferences.nearbyOnly ? ' · Nearby' : ''}
          </Text>
        </Animated.View>

        {/* Tips */}
        <Animated.View entering={FadeInDown.delay(220).duration(350)} style={styles.tipsCard}>
          <Text style={styles.tipsTitle}>While you wait</Text>
          <View style={styles.tipRow}>
            <Ionicons name="hand-left-outline" size={15} color={brand} />
            <Text style={styles.tipText}>Be respectful and kind</Text>
          </View>
          <View style={styles.tipRow}>
            <Ionicons name="eye-off-outline" size={15} color={brand} />
            <Text style={styles.tipText}>Your identity stays anonymous</Text>
          </View>
          <View style={styles.tipRow}>
            <Ionicons name="flag-outline" size={15} color={brand} />
            <Text style={styles.tipText}>Report any inappropriate behavior</Text>
          </View>
        </Animated.View>
      </View>

      {/* Match found overlay */}
      {status === 'matched' && session && (
        <MatchFoundCard onContinue={handleContinue} />
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const ORB_CORE = 72;
const ORB_IN   = 112;
const ORB_OUT  = 156;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: bg },
  topBar: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10,
    paddingHorizontal: 20, paddingTop: 8,
  },
  cancelBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: white,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 6, elevation: 3,
  },
  center: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 28,
  },
  orbWrap: { alignItems: 'center', marginBottom: 36 },
  orbOuter: {
    width: ORB_OUT, height: ORB_OUT, borderRadius: ORB_OUT / 2,
    alignItems: 'center', justifyContent: 'center',
  },
  orbInner: {
    width: ORB_IN, height: ORB_IN, borderRadius: ORB_IN / 2,
    alignItems: 'center', justifyContent: 'center',
  },
  orbCore: {
    width: ORB_CORE, height: ORB_CORE, borderRadius: ORB_CORE / 2,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: brand,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4, shadowRadius: 16, elevation: 10,
  },
  dotsRow: {
    flexDirection: 'row', gap: 8, marginTop: 20,
  },
  dot: {
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: brand,
  },
  labels: { alignItems: 'center', gap: 6, marginBottom: 32 },
  mainLabel: { fontSize: 22, fontWeight: '700', color: ink },
  timerText: { fontSize: 28, fontWeight: '800', color: brand, letterSpacing: 2 },
  positionText: { fontSize: 13, color: muted },
  modeText: { fontSize: 13, color: muted },
  tipsCard: {
    width: '100%', backgroundColor: white,
    borderRadius: 16, padding: 18, gap: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  tipsTitle: { fontSize: 14, fontWeight: '700', color: ink, marginBottom: 4 },
  tipRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  tipText: { fontSize: 13, color: muted },
});

const overlay = StyleSheet.create({
  bg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center', justifyContent: 'center',
    zIndex: 20,
  },
  card: {
    width: 300, backgroundColor: white,
    borderRadius: 24, padding: 28,
    alignItems: 'center', gap: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2, shadowRadius: 24, elevation: 16,
  },
  iconCircle: {
    width: 72, height: 72, borderRadius: 36,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 4,
  },
  title: { fontSize: 22, fontWeight: '800', color: ink },
  sub:   { fontSize: 14, color: muted, textAlign: 'center' },
  btn: {
    marginTop: 8, height: 50, width: 220,
    borderRadius: 25,
    alignItems: 'center', justifyContent: 'center',
  },
  btnText: { fontSize: 16, fontWeight: '700', color: white },
});
