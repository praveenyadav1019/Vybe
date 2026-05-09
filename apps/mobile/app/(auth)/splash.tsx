import React, { useEffect } from 'react';
import { View, Text, Dimensions, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
  withRepeat,
  withSequence,
  runOnJS,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';
import { colors } from '@/theme/colors';
import Constants from 'expo-constants';

const { width, height } = Dimensions.get('window');

const APP_VERSION = Constants.expoConfig?.version ?? '1.0.0';

export default function SplashScreen() {
  const router = useRouter();
  const token = useAuthStore((s) => s.token);
  const hydrated = useAuthStore((s) => s.hydrated);

  // Logo animation values
  const logoScale = useSharedValue(0);
  const logoOpacity = useSharedValue(0);

  // Tagline animation
  const taglineOpacity = useSharedValue(0);
  const taglineTranslateY = useSharedValue(20);

  // Orb animations
  const orb1Scale = useSharedValue(1);
  const orb2Scale = useSharedValue(1);
  const orb3Scale = useSharedValue(1);
  const orb1Opacity = useSharedValue(0.35);
  const orb2Opacity = useSharedValue(0.25);
  const orb3Opacity = useSharedValue(0.3);

  // Version text
  const versionOpacity = useSharedValue(0);

  function navigate() {
    if (token) {
      router.replace('/(tabs)/home');
    } else {
      router.replace('/(auth)/onboarding');
    }
  }

  useEffect(() => {
    // Logo: spring scale-in
    logoScale.value = withSpring(1, {
      damping: 14,
      stiffness: 120,
      mass: 1,
    });
    logoOpacity.value = withTiming(1, { duration: 400 });

    // Tagline: fade in + slide up after 600ms
    taglineOpacity.value = withDelay(600, withTiming(1, { duration: 500 }));
    taglineTranslateY.value = withDelay(600, withTiming(0, { duration: 500 }));

    // Version text
    versionOpacity.value = withDelay(900, withTiming(0.5, { duration: 400 }));

    // Orb pulsing animations - staggered starts
    orb1Scale.value = withRepeat(
      withSequence(
        withTiming(1.25, { duration: 2200 }),
        withTiming(1, { duration: 2200 })
      ),
      -1,
      false
    );
    orb1Opacity.value = withRepeat(
      withSequence(
        withTiming(0.55, { duration: 2200 }),
        withTiming(0.2, { duration: 2200 })
      ),
      -1,
      false
    );

    orb2Scale.value = withDelay(
      700,
      withRepeat(
        withSequence(
          withTiming(1.3, { duration: 2600 }),
          withTiming(0.9, { duration: 2600 })
        ),
        -1,
        false
      )
    );
    orb2Opacity.value = withDelay(
      700,
      withRepeat(
        withSequence(
          withTiming(0.45, { duration: 2600 }),
          withTiming(0.15, { duration: 2600 })
        ),
        -1,
        false
      )
    );

    orb3Scale.value = withDelay(
      1400,
      withRepeat(
        withSequence(
          withTiming(1.2, { duration: 3000 }),
          withTiming(0.85, { duration: 3000 })
        ),
        -1,
        false
      )
    );
    orb3Opacity.value = withDelay(
      1400,
      withRepeat(
        withSequence(
          withTiming(0.5, { duration: 3000 }),
          withTiming(0.18, { duration: 3000 })
        ),
        -1,
        false
      )
    );

    // Navigate after 2.5s (wait for hydration too)
    const timer = setTimeout(() => {
      runOnJS(navigate)();
    }, 2500);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const logoAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: logoScale.value }],
    opacity: logoOpacity.value,
  }));

  const taglineAnimatedStyle = useAnimatedStyle(() => ({
    opacity: taglineOpacity.value,
    transform: [{ translateY: taglineTranslateY.value }],
  }));

  const orb1Style = useAnimatedStyle(() => ({
    transform: [{ scale: orb1Scale.value }],
    opacity: orb1Opacity.value,
  }));

  const orb2Style = useAnimatedStyle(() => ({
    transform: [{ scale: orb2Scale.value }],
    opacity: orb2Opacity.value,
  }));

  const orb3Style = useAnimatedStyle(() => ({
    transform: [{ scale: orb3Scale.value }],
    opacity: orb3Opacity.value,
  }));

  const versionStyle = useAnimatedStyle(() => ({
    opacity: versionOpacity.value,
  }));

  return (
    <View style={styles.container}>
      {/* Ambient orbs */}
      <Animated.View style={[styles.orb, styles.orb1, orb1Style]} />
      <Animated.View style={[styles.orb, styles.orb2, orb2Style]} />
      <Animated.View style={[styles.orb, styles.orb3, orb3Style]} />

      {/* Center content */}
      <View style={styles.centerContent}>
        {/* Logo */}
        <Animated.View style={logoAnimatedStyle}>
          <LinearGradient
            colors={['#7C3AED', '#00E5FF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.logoGradient}
          >
            <Text style={styles.logoText}>VYBEON</Text>
          </LinearGradient>
        </Animated.View>

        {/* Glowing underline accent */}
        <Animated.View style={[styles.logoUnderline, logoAnimatedStyle]} />

        {/* Tagline */}
        <Animated.Text style={[styles.tagline, taglineAnimatedStyle]}>
          Find your vibe, find your people
        </Animated.Text>
      </View>

      {/* Version */}
      <Animated.Text style={[styles.version, versionStyle]}>
        v{APP_VERSION}
      </Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerContent: {
    alignItems: 'center',
    zIndex: 10,
  },
  orb: {
    position: 'absolute',
    borderRadius: 9999,
  },
  orb1: {
    width: 340,
    height: 340,
    backgroundColor: 'rgba(124, 58, 237, 0.18)',
    top: height * 0.08,
    left: -80,
  },
  orb2: {
    width: 280,
    height: 280,
    backgroundColor: 'rgba(0, 229, 255, 0.12)',
    bottom: height * 0.12,
    right: -60,
  },
  orb3: {
    width: 200,
    height: 200,
    backgroundColor: 'rgba(124, 58, 237, 0.1)',
    bottom: height * 0.3,
    left: width * 0.1,
  },
  logoGradient: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  logoText: {
    fontSize: 58,
    fontWeight: '900',
    color: colors.text,
    letterSpacing: -1,
    textShadowColor: 'rgba(124, 58, 237, 0.6)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 24,
  },
  logoUnderline: {
    width: 80,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.accent,
    marginTop: 8,
    shadowColor: colors.accent,
    shadowOpacity: 0.8,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
  tagline: {
    marginTop: 20,
    fontSize: 16,
    color: colors.subtext,
    letterSpacing: 0.5,
    fontWeight: '400',
    textAlign: 'center',
  },
  version: {
    position: 'absolute',
    bottom: 48,
    fontSize: 12,
    color: colors.subtext,
    letterSpacing: 1,
  },
});
