import React, { useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, StatusBar, Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue, useAnimatedStyle,
  withSpring, withDelay, withTiming, withSequence, withRepeat,
  FadeIn, type SharedValue,
} from 'react-native-reanimated';
import { useLocalSearchParams, useRouter } from 'expo-router';

const { width: W, height: H } = Dimensions.get('window');

// ─── Confetti particle ────────────────────────────────────────────────────────
function Particle({ x, delay, color }: { x: number; delay: number; color: string }) {
  const y = useSharedValue(-20);
  const opacity = useSharedValue(0);
  const rotate = useSharedValue(0);

  useEffect(() => {
    y.value = withDelay(delay, withTiming(H, { duration: 2400 }));
    opacity.value = withDelay(delay, withSequence(
      withTiming(1, { duration: 200 }),
      withDelay(1800, withTiming(0, { duration: 400 }))
    ));
    rotate.value = withDelay(delay, withRepeat(withTiming(360, { duration: 800 }), -1));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const style = useAnimatedStyle(() => ({
    position: 'absolute',
    left: x,
    top: y.value,
    opacity: opacity.value,
    transform: [{ rotate: `${rotate.value}deg` }],
  }));

  return <Animated.View style={[style, { width: 8, height: 8, borderRadius: 2, backgroundColor: color }]} />;
}

const CONFETTI_COLORS = ['#F5E3A0', '#C9A84C', '#A78BFA', '#C084FC', '#F9A8D4', '#86EFAC'];
const PARTICLES = Array.from({ length: 30 }, (_, i) => ({
  x: Math.random() * W,
  delay: Math.random() * 600,
  color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
}));

// ─── Avatar circle ────────────────────────────────────────────────────────────
function MatchAvatar({ photo, scale }: { photo: string; scale: SharedValue<number> }) {
  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  return (
    <Animated.View style={[styles.avatarRing, style]}>
      <Image source={{ uri: photo }} style={styles.avatar} contentFit="cover" />
    </Animated.View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function MatchCelebrationScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ matchName?: string; matchAge?: string; matchPhoto?: string; myPhoto?: string }>();

  const matchName = params.matchName ?? 'Sophia';
  const matchAge  = params.matchAge  ?? '27';
  const matchPhoto = params.matchPhoto ?? 'https://randomuser.me/api/portraits/women/44.jpg';
  const myPhoto    = params.myPhoto    ?? 'https://randomuser.me/api/portraits/men/32.jpg';

  const scale1 = useSharedValue(0);
  const scale2 = useSharedValue(0);
  const titleOpacity = useSharedValue(0);
  const titleY = useSharedValue(24);
  const btnOpacity = useSharedValue(0);

  useEffect(() => {
    scale1.value = withDelay(200, withSpring(1, { damping: 10, stiffness: 140 }));
    scale2.value = withDelay(350, withSpring(1, { damping: 10, stiffness: 140 }));
    titleOpacity.value = withDelay(600, withTiming(1, { duration: 500 }));
    titleY.value = withDelay(600, withSpring(0, { damping: 14 }));
    btnOpacity.value = withDelay(900, withTiming(1, { duration: 400 }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ translateY: titleY.value }],
  }));

  const btnStyle = useAnimatedStyle(() => ({ opacity: btnOpacity.value }));

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Background gradient */}
      <LinearGradient
        colors={['#1A0A35', '#2D1B69', '#3B1A75', '#1A0A35']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Confetti */}
      {PARTICLES.map((p, i) => (
        <Particle key={i} x={p.x} delay={p.delay} color={p.color} />
      ))}

      <View style={[styles.content, { paddingTop: insets.top + 48, paddingBottom: insets.bottom + 32 }]}>
        {/* Title */}
        <Animated.Text style={[styles.matchTitle, titleStyle]}>
          It's a Match!
        </Animated.Text>

        {/* Avatars */}
        <View style={styles.avatarsRow}>
          <MatchAvatar photo={myPhoto} scale={scale1} />
          <View style={styles.heartIcon}>
            <Ionicons name="heart" size={24} color="#EF4444" />
          </View>
          <MatchAvatar photo={matchPhoto} scale={scale2} />
        </View>

        {/* Names */}
        <Animated.View style={[styles.namesRow, titleStyle]}>
          <Text style={styles.nameText}>Alex, 29</Text>
          <Text style={styles.nameSep}> & </Text>
          <Text style={styles.nameText}>{matchName}, {matchAge}</Text>
        </Animated.View>

        <Animated.Text style={[styles.subText, titleStyle]}>
          You and {matchName} have liked each other!
        </Animated.Text>

        {/* Buttons */}
        <Animated.View style={[styles.buttonsWrap, btnStyle]}>
          <TouchableOpacity
            style={styles.messageBtn}
            onPress={() => router.replace('/(tabs)/meet' as any)}
            activeOpacity={0.88}
          >
            <LinearGradient
              colors={['#C9A84C', '#F5E3A0', '#C9A84C']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={styles.messageBtnGrad}
            >
              <Ionicons name="chatbubble" size={18} color="#7A5B10" />
              <Text style={styles.messageBtnText}>Send a Message</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.exploreBtn}
            onPress={() => router.replace('/(tabs)/home' as any)}
            activeOpacity={0.8}
          >
            <Text style={styles.exploreBtnText}>Keep Exploring</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const AVATAR_SIZE = 110;

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },

  matchTitle: {
    fontSize: 38, fontWeight: '900',
    color: '#F5E3A0',
    textAlign: 'center',
    letterSpacing: -0.5,
    marginBottom: 40,
    textShadowColor: 'rgba(201,168,76,0.4)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },

  avatarsRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  avatarRing: {
    width: AVATAR_SIZE + 6, height: AVATAR_SIZE + 6,
    borderRadius: (AVATAR_SIZE + 6) / 2,
    borderWidth: 3, borderColor: '#F5E3A0',
    overflow: 'hidden',
    backgroundColor: '#1A0A35',
  },
  avatar: { width: AVATAR_SIZE, height: AVATAR_SIZE },
  heartIcon: {
    marginHorizontal: -12, zIndex: 1,
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#1A0A35',
    borderWidth: 2, borderColor: '#F5E3A0',
    alignItems: 'center', justifyContent: 'center',
  },

  namesRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  nameText: { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },
  nameSep: { fontSize: 16, color: 'rgba(255,255,255,0.5)' },
  subText: {
    fontSize: 15, color: 'rgba(255,255,255,0.7)',
    textAlign: 'center', lineHeight: 22, marginBottom: 48,
  },

  buttonsWrap: { width: '100%', gap: 14 },
  messageBtn: { borderRadius: 9999, overflow: 'hidden' },
  messageBtnGrad: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    height: 54, gap: 8,
  },
  messageBtnText: { fontSize: 16, fontWeight: '700', color: '#7A5B10' },
  exploreBtn: {
    height: 54, borderRadius: 9999,
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center', justifyContent: 'center',
  },
  exploreBtnText: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
});
