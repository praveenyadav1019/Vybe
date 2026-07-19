import React, { useEffect } from 'react';
import { View, Text, StyleSheet, StatusBar } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, withDelay,
  withRepeat, withSequence, Easing,
} from 'react-native-reanimated';
import { VLogo } from './ui/VLogo';

/**
 * Full-screen branded splash / loading screen shown on cold app open while the
 * auth + onboarding stores hydrate. Bold brand gradient with an animated logo
 * badge and a pulsing dot loader — the "opening" experience for the app.
 */
function LoaderDot({ delay }: { delay: number }) {
  const v = useSharedValue(0);
  useEffect(() => {
    v.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 480, easing: Easing.out(Easing.ease) }),
          withTiming(0.25, { duration: 480, easing: Easing.in(Easing.ease) }),
        ),
        -1,
        false,
      ),
    );
  }, []);
  const style = useAnimatedStyle(() => ({
    opacity: 0.35 + v.value * 0.65,
    transform: [{ scale: 0.8 + v.value * 0.5 }],
  }));
  return <Animated.View style={[styles.dot, style]} />;
}

export function BrandSplash() {
  const badgeScale = useSharedValue(0.7);
  const badgeOpacity = useSharedValue(0);
  const wordOpacity = useSharedValue(0);
  const wordY = useSharedValue(14);
  const tagOpacity = useSharedValue(0);

  useEffect(() => {
    badgeScale.value = withTiming(1, { duration: 520, easing: Easing.out(Easing.back(1.6)) });
    badgeOpacity.value = withTiming(1, { duration: 380 });
    wordOpacity.value = withDelay(280, withTiming(1, { duration: 420 }));
    wordY.value = withDelay(280, withTiming(0, { duration: 420, easing: Easing.out(Easing.cubic) }));
    tagOpacity.value = withDelay(460, withTiming(1, { duration: 420 }));
  }, []);

  const badgeStyle = useAnimatedStyle(() => ({
    opacity: badgeOpacity.value,
    transform: [{ scale: badgeScale.value }],
  }));
  const wordStyle = useAnimatedStyle(() => ({
    opacity: wordOpacity.value,
    transform: [{ translateY: wordY.value }],
  }));
  const tagStyle = useAnimatedStyle(() => ({ opacity: tagOpacity.value }));

  return (
    <LinearGradient
      colors={['#8B3DF5', '#6D28D9', '#4C1D95']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.root}
    >
      <StatusBar barStyle="light-content" backgroundColor="#6D28D9" />

      {/* soft ambient orbs */}
      <View style={styles.orb1} />
      <View style={styles.orb2} />

      <View style={styles.center}>
        <Animated.View style={[styles.badge, badgeStyle]}>
          <VLogo size={64} />
        </Animated.View>
        <Animated.Text style={[styles.word, wordStyle]}>VYBEON</Animated.Text>
        <Animated.Text style={[styles.tag, tagStyle]}>Meet. Connect. Vibe.</Animated.Text>
      </View>

      <View style={styles.loader}>
        <LoaderDot delay={0} />
        <LoaderDot delay={160} />
        <LoaderDot delay={320} />
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  orb1: {
    position: 'absolute', width: 320, height: 320, borderRadius: 160,
    backgroundColor: 'rgba(255,255,255,0.08)', top: -80, right: -90,
  },
  orb2: {
    position: 'absolute', width: 240, height: 240, borderRadius: 120,
    backgroundColor: 'rgba(255,255,255,0.06)', bottom: 40, left: -70,
  },
  center: { alignItems: 'center', marginTop: -20 },
  badge: {
    width: 116, height: 116, borderRadius: 32,
    backgroundColor: '#FFFFFF',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 26,
    shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 24, shadowOffset: { width: 0, height: 12 },
    elevation: 12,
  },
  word: {
    fontSize: 30, fontWeight: '900', color: '#FFFFFF',
    letterSpacing: 6, marginBottom: 10,
  },
  tag: { fontSize: 14, color: 'rgba(255,255,255,0.8)', letterSpacing: 0.4 },
  loader: {
    position: 'absolute', bottom: 72,
    flexDirection: 'row', gap: 10, alignItems: 'center',
  },
  dot: { width: 9, height: 9, borderRadius: 5, backgroundColor: '#FFFFFF' },
});
