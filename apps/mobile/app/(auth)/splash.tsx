import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions, StatusBar } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';
import { VLogo } from '@/components/ui/VLogo';
import { C, T, ANIM } from '@/design/tokens';

const { width } = Dimensions.get('window');

export default function SplashScreen() {
  const router   = useRouter();
  const token    = useAuthStore((s) => s.token);
  const hydrated = useAuthStore((s) => s.hydrated);

  // ─── Animation values ────────────────────────────────────────────────────
  const logoScale   = useSharedValue(0.72);
  const logoOpacity = useSharedValue(0);

  const wordOpacity    = useSharedValue(0);
  const wordTranslateY = useSharedValue(12);

  const taglineOpacity    = useSharedValue(0);
  const taglineTranslateY = useSharedValue(10);

  const barOpacity = useSharedValue(0);
  const barScaleX  = useSharedValue(0);

  // ─── Navigate ─────────────────────────────────────────────────────────────
  function navigate() {
    if (token) {
      router.replace('/(tabs)/home');
    } else {
      router.replace('/(auth)/login');
    }
  }

  useEffect(() => {
    // Logo springs in
    logoScale.value   = withSpring(1, ANIM.spring.logo);
    logoOpacity.value = withTiming(1, { duration: 350 });

    // "VYBEON" text fades + rises — 300ms after logo
    wordOpacity.value    = withDelay(300, withTiming(1, { duration: 380 }));
    wordTranslateY.value = withDelay(300,
      withTiming(0, { duration: 380, easing: Easing.out(Easing.cubic) })
    );

    // Tagline — 500ms after logo
    taglineOpacity.value    = withDelay(500, withTiming(1, { duration: 380 }));
    taglineTranslateY.value = withDelay(500,
      withTiming(0, { duration: 380, easing: Easing.out(Easing.cubic) })
    );

    // Bottom gradient bar — 800ms in
    barOpacity.value = withDelay(800, withTiming(1, { duration: 300 }));
    barScaleX.value  = withDelay(800,
      withTiming(1, { duration: 500, easing: Easing.out(Easing.cubic) })
    );

    // Navigate at 2 500ms
    const t = setTimeout(() => runOnJS(navigate)(), 2500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const logoStyle = useAnimatedStyle(() => ({
    transform: [{ scale: logoScale.value }],
    opacity:   logoOpacity.value,
  }));

  const wordStyle = useAnimatedStyle(() => ({
    opacity:   wordOpacity.value,
    transform: [{ translateY: wordTranslateY.value }],
  }));

  const taglineStyle = useAnimatedStyle(() => ({
    opacity:   taglineOpacity.value,
    transform: [{ translateY: taglineTranslateY.value }],
  }));

  const barStyle = useAnimatedStyle(() => ({
    opacity:   barOpacity.value,
    transform: [{ scaleX: barScaleX.value }],
  }));

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bgSplash} />

      {/* ── Center stack ─────────────────────────────────────────────────── */}
      <View style={styles.center}>

        {/* V logo */}
        <Animated.View style={[styles.logoWrap, logoStyle]}>
          <VLogo size={96} />
        </Animated.View>

        {/* VYBEON wordmark */}
        <Animated.Text style={[styles.wordmark, wordStyle]}>
          VYBEON
        </Animated.Text>

        {/* Tagline */}
        <Animated.Text style={[styles.tagline, taglineStyle]}>
          Meet. Connect. Vibe.
        </Animated.Text>
      </View>

      {/* ── Bottom gradient bar ───────────────────────────────────────────── */}
      <Animated.View style={[styles.barWrap, barStyle]}>
        <LinearGradient
          colors={[C.logoFrom, C.logoTo]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.bar}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FAFAFA',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Center block ────────────────────────────────────────────────────────
  center: {
    alignItems: 'center',
    // Slightly above vertical center (matches reference)
    marginTop: -32,
  },

  logoWrap: {
    marginBottom: 22,
    // subtle drop shadow behind the SVG to give depth
    shadowColor: '#9333EA',
    shadowOpacity: 0.22,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
  },

  wordmark: {
    fontSize: 26,
    fontWeight: T.weight.black,
    color: '#111827',
    letterSpacing: T.tracking.widest,
    marginBottom: 8,
  },

  tagline: {
    fontSize: T.size.base,              // 13px
    fontWeight: T.weight.regular,
    color: '#9CA3AF',
    letterSpacing: 0.3,
  },

  // ── Bottom bar ──────────────────────────────────────────────────────────
  barWrap: {
    position: 'absolute',
    bottom: 52,
    alignItems: 'center',
  },
  bar: {
    width: 88,
    height: 3,
    borderRadius: 9999,
  },
});
