import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Dimensions,
  StyleSheet,
  TouchableOpacity,
  ListRenderItemInfo,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/theme/colors';
import { Button } from '@/components/ui/Button';

const { width } = Dimensions.get('window');

interface OnboardingPage {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  gradientColors: [string, string];
  headline: string;
  subtitle: string;
  accentOrbs: [string, string];
}

const PAGES: OnboardingPage[] = [
  {
    id: 'discover',
    icon: 'radio',
    iconColor: '#2563EB',
    gradientColors: ['#EEF4FF', '#F6F2FF'],
    headline: 'Discover Nearby Vibes',
    subtitle:
      'Find people who are living their best moments right now — at rooftop bars, underground clubs, late-night spots, and hidden gems near you.',
    accentOrbs: ['rgba(37,99,235,0.10)', 'rgba(124,58,237,0.08)'],
  },
  {
    id: 'connect',
    icon: 'chatbubbles',
    iconColor: '#7C3AED',
    gradientColors: ['#F4F0FF', '#EFF4FF'],
    headline: 'Connect Instantly',
    subtitle:
      'Chat with people nearby or anywhere in the world. Real conversations, real connections — start vibing the moment you match.',
    accentOrbs: ['rgba(124,58,237,0.10)', 'rgba(37,99,235,0.07)'],
  },
  {
    id: 'safety',
    icon: 'shield-checkmark',
    iconColor: '#16A34A',
    gradientColors: ['#ECFDF3', '#F4FFF8'],
    headline: 'Safety First, Always',
    subtitle:
      'Every profile is verified. Consent is built into every interaction. Our women-safety mode and real-time reporting keep you protected 24/7.',
    accentOrbs: ['rgba(34,197,94,0.10)', 'rgba(124,58,237,0.07)'],
  },
];

const SafetyFeatures = () => (
  <View style={styles.safetyList}>
    {[
      { icon: 'checkmark-circle', text: 'Verified profiles only' },
      { icon: 'hand-left', text: 'Consent-first interactions' },
      { icon: 'shield', text: "Women's safety mode" },
      { icon: 'flag', text: 'Real-time reporting' },
    ].map((item) => (
      <View key={item.text} style={styles.safetyItem}>
        <Ionicons name={item.icon as keyof typeof Ionicons.glyphMap} size={18} color={colors.success} />
        <Text style={styles.safetyText}>{item.text}</Text>
      </View>
    ))}
  </View>
);

function OnboardingSlide({ item, index }: { item: OnboardingPage; index: number }) {
  return (
    <View style={styles.slide}>
      {/* Background gradient */}
      <LinearGradient colors={item.gradientColors} style={StyleSheet.absoluteFill} />

      {/* Ambient orbs */}
      <View style={[styles.slideOrb1, { backgroundColor: item.accentOrbs[0] }]} />
      <View style={[styles.slideOrb2, { backgroundColor: item.accentOrbs[1] }]} />

      {/* Icon illustration */}
      <View style={styles.iconContainer}>
        <View style={[styles.iconRing, { borderColor: item.iconColor + '40' }]}>
          <View style={[styles.iconInner, { backgroundColor: item.iconColor + '15' }]}>
            <Ionicons name={item.icon} size={56} color={item.iconColor} />
          </View>
        </View>

        {/* Extra content per slide */}
        {index === 2 && <SafetyFeatures />}
      </View>

      {/* Text */}
      <View style={styles.textBlock}>
        <Text style={[styles.headline, { textShadowColor: item.iconColor + '40' }]}>
          {item.headline}
        </Text>
        <Text style={styles.subtitle}>{item.subtitle}</Text>
      </View>
    </View>
  );
}

export default function OnboardingScreen() {
  const router = useRouter();
  const flatListRef = useRef<FlatList<OnboardingPage>>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollX = useSharedValue(0);

  function handleNext() {
    if (currentIndex < PAGES.length - 1) {
      const next = currentIndex + 1;
      flatListRef.current?.scrollToIndex({ index: next, animated: true });
      setCurrentIndex(next);
    } else {
      router.replace('/(auth)/login');
    }
  }

  function handleSkip() {
    router.replace('/(auth)/login');
  }

  function onMomentumScrollEnd(e: { nativeEvent: { contentOffset: { x: number } } }) {
    const idx = Math.round(e.nativeEvent.contentOffset.x / width);
    setCurrentIndex(idx);
    scrollX.value = e.nativeEvent.contentOffset.x;
  }

  const isLast = currentIndex === PAGES.length - 1;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Skip button */}
      {!isLast && (
        <TouchableOpacity style={styles.skipBtn} onPress={handleSkip}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      )}

      {/* Slides */}
      <FlatList
        ref={flatListRef}
        data={PAGES}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        onMomentumScrollEnd={onMomentumScrollEnd}
        renderItem={({ item, index }: ListRenderItemInfo<OnboardingPage>) => (
          <OnboardingSlide item={item} index={index} />
        )}
      />

      {/* Bottom area */}
      <View style={styles.bottomArea}>
        {/* Dot indicators */}
        <View style={styles.dots}>
          {PAGES.map((_, i) => (
            <DotIndicator key={i} index={i} currentIndex={currentIndex} />
          ))}
        </View>

        {/* CTA button */}
        <View style={styles.btnContainer}>
          <Button
            title={isLast ? 'Get Started' : 'Next'}
            onPress={handleNext}
            gradient
            style={styles.nextBtn}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

function DotIndicator({ index, currentIndex }: { index: number; currentIndex: number }) {
  const isActive = index === currentIndex;
  return (
    <View
      style={[
        styles.dot,
        isActive ? styles.dotActive : styles.dotInactive,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  skipBtn: {
    position: 'absolute',
    top: 56,
    right: 24,
    zIndex: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
  },
  skipText: {
    color: colors.subtext,
    fontSize: 14,
    fontWeight: '600',
  },
  slide: {
    width,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    overflow: 'hidden',
  },
  slideOrb1: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    top: -60,
    right: -80,
  },
  slideOrb2: {
    position: 'absolute',
    width: 250,
    height: 250,
    borderRadius: 125,
    bottom: 80,
    left: -60,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  iconRing: {
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
  },
  iconInner: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
    marginTop: 4,
  },
  modeItem: {
    alignItems: 'center',
    gap: 6,
  },
  modeIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  modeLabel: {
    color: colors.subtext,
    fontSize: 11,
    fontWeight: '500',
  },
  safetyList: {
    gap: 10,
    alignSelf: 'stretch',
    marginTop: 4,
  },
  safetyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(34,197,94,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.15)',
  },
  safetyText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '500',
  },
  textBlock: {
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  headline: {
    fontSize: 30,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
    letterSpacing: -0.5,
    marginBottom: 16,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
  subtitle: {
    fontSize: 15,
    color: colors.subtext,
    textAlign: 'center',
    lineHeight: 24,
    fontWeight: '400',
  },
  bottomArea: {
    paddingBottom: 24,
    paddingHorizontal: 24,
    backgroundColor: colors.background,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 20,
    paddingTop: 12,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  dotActive: {
    width: 28,
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOpacity: 0.6,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
    elevation: 4,
  },
  dotInactive: {
    width: 8,
    backgroundColor: colors.border,
  },
  btnContainer: {
    gap: 12,
  },
  nextBtn: {
    borderRadius: 16,
  },
});
