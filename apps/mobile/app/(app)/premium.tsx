import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Dimensions, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown, FadeInRight } from 'react-native-reanimated';
import { useAuthStore } from '@/stores/authStore';
import { colors } from '@/theme/colors';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const PLANS = [
  {
    id: 'monthly',
    label: 'Monthly',
    price: '₹299',
    period: '/month',
    total: '₹299/month',
    badge: null,
    productId: 'com.vybeon.app.plus.monthly',
  },
  {
    id: 'quarterly',
    label: '3 Months',
    price: '₹699',
    period: '/3 months',
    total: '₹233/month',
    badge: 'Most Popular',
    productId: 'com.vybeon.app.plus.quarterly',
    savings: 'Save 22%',
  },
  {
    id: 'annual',
    label: 'Annual',
    price: '₹1,999',
    period: '/year',
    total: '₹167/month',
    badge: 'Best Value',
    productId: 'com.vybeon.app.gold.annual',
    savings: 'Save 44%',
  },
];

const FEATURES = [
  { icon: '⚡', label: 'Unlimited Pings' },
  { icon: '❤️', label: 'See who liked you' },
  { icon: '🛡️', label: 'Verified-only filter' },
  { icon: '🔒', label: 'Blur photos (unmatched)' },
  { icon: '🎯', label: 'Priority in radar' },
  { icon: '✓✓', label: 'Read receipts' },
  { icon: '🔍', label: 'Advanced privacy' },
  { icon: '🤖', label: 'AI vibe matching' },
];

export default function PremiumScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [selectedPlan, setSelectedPlan] = useState('quarterly');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubscribe = async () => {
    setIsLoading(true);
    // TODO: implement expo-in-app-purchases
    // const products = await getProductsAsync([selectedPlanData.productId]);
    // const purchase = await purchaseItemAsync(selectedPlanData.productId);
    setTimeout(() => {
      setIsLoading(false);
      Alert.alert(
        'Coming Soon',
        'In-app purchases will be available in the next update. Thank you for your interest in VYBEON+!',
        [{ text: 'OK' }]
      );
    }, 1000);
  };

  const selectedPlanData = PLANS.find(p => p.id === selectedPlan)!;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <Animated.View entering={FadeInDown.delay(50)} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
          <Ionicons name="close" size={22} color={colors.text} />
        </TouchableOpacity>
        <View />
        <View style={{ width: 40 }} />
      </Animated.View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Hero */}
        <Animated.View entering={FadeInDown.delay(100)} style={styles.heroSection}>
          <LinearGradient colors={['#7C3AED', '#C084FC', '#00E5FF']} style={styles.crownCircle}>
            <Text style={styles.crownEmoji}>👑</Text>
          </LinearGradient>
          <Text style={styles.heroTitle}>VYBEON+</Text>
          <Text style={styles.heroSubtitle}>Unlock your full VYBE potential</Text>

          {user?.isPremium && (
            <View style={styles.currentPlanBadge}>
              <Ionicons name="star" size={14} color="#FFD700" />
              <Text style={styles.currentPlanText}>You're on VYBEON+</Text>
            </View>
          )}
        </Animated.View>

        {/* Features Grid */}
        <Animated.View entering={FadeInDown.delay(150)}>
          <View style={styles.featuresGrid}>
            {FEATURES.map(({ icon, label }, i) => (
              <Animated.View key={label} entering={FadeInRight.delay(i * 50)}>
                <GlassCard style={styles.featureItem}>
                  <Text style={styles.featureIcon}>{icon}</Text>
                  <Text style={styles.featureLabel}>{label}</Text>
                </GlassCard>
              </Animated.View>
            ))}
          </View>
        </Animated.View>

        {/* Plans */}
        <Animated.View entering={FadeInDown.delay(200)}>
          <Text style={styles.plansTitle}>Choose Your Plan</Text>
          {PLANS.map((plan) => (
            <TouchableOpacity
              key={plan.id}
              onPress={() => setSelectedPlan(plan.id)}
              activeOpacity={0.85}
              style={styles.planCardWrapper}
            >
              {selectedPlan === plan.id ? (
                <LinearGradient colors={['#7C3AED', '#00E5FF']} style={styles.planCardGradient}>
                  <BlurView intensity={20} style={StyleSheet.absoluteFill} />
                  <PlanContent plan={plan} isSelected />
                </LinearGradient>
              ) : (
                <GlassCard style={styles.planCard} noPadding>
                  <PlanContent plan={plan} isSelected={false} />
                </GlassCard>
              )}
            </TouchableOpacity>
          ))}
        </Animated.View>

        {/* Subscribe Button */}
        <Animated.View entering={FadeInDown.delay(300)} style={styles.subscribeSection}>
          <TouchableOpacity
            onPress={handleSubscribe}
            disabled={isLoading}
            activeOpacity={0.9}
            style={{ borderRadius: 16, overflow: 'hidden' }}
          >
            <LinearGradient colors={['#FFD700', '#FF8C00']} style={styles.subscribeBtn}>
              {isLoading ? (
                <Text style={styles.subscribeBtnText}>Processing...</Text>
              ) : (
                <>
                  <Ionicons name="star" size={20} color="#000" />
                  <Text style={styles.subscribeBtnText}>Start 7-Day Free Trial</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
          <Text style={styles.subscribeNote}>
            {selectedPlanData.total} after free trial · Cancel anytime
          </Text>
          <View style={styles.legalRow}>
            <TouchableOpacity onPress={() => Alert.alert('Terms', 'Visit vybeon.com/terms')}>
              <Text style={styles.legalLink}>Terms</Text>
            </TouchableOpacity>
            <Text style={styles.legalDot}>·</Text>
            <TouchableOpacity onPress={() => Alert.alert('Privacy', 'Visit vybeon.com/privacy')}>
              <Text style={styles.legalLink}>Privacy Policy</Text>
            </TouchableOpacity>
            <Text style={styles.legalDot}>·</Text>
            <TouchableOpacity onPress={() => Alert.alert('Restore', 'If you have an existing subscription, sign in with the same account.')}>
              <Text style={styles.legalLink}>Restore Purchase</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

function PlanContent({ plan, isSelected }: { plan: typeof PLANS[0]; isSelected: boolean }) {
  return (
    <View style={styles.planContent}>
      {plan.badge && (
        <View style={[styles.planBadge, { backgroundColor: isSelected ? 'rgba(255,255,255,0.2)' : `${colors.primary}33` }]}>
          <Text style={[styles.planBadgeText, { color: isSelected ? '#FFF' : colors.primary }]}>{plan.badge}</Text>
        </View>
      )}
      <View style={styles.planMainRow}>
        <View>
          <Text style={[styles.planLabel, { color: isSelected ? '#FFF' : colors.text }]}>{plan.label}</Text>
          {plan.savings && (
            <Text style={[styles.planSavings, { color: isSelected ? 'rgba(255,255,255,0.8)' : colors.success }]}>{plan.savings}</Text>
          )}
        </View>
        <View style={styles.planPriceBlock}>
          <Text style={[styles.planPrice, { color: isSelected ? '#FFF' : colors.text }]}>{plan.price}</Text>
          <Text style={[styles.planPeriod, { color: isSelected ? 'rgba(255,255,255,0.7)' : colors.subtext }]}>{plan.period}</Text>
        </View>
      </View>
      <Text style={[styles.planPerMonth, { color: isSelected ? 'rgba(255,255,255,0.7)' : colors.subtext }]}>
        {plan.total}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  closeBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  heroSection: { alignItems: 'center', paddingVertical: 24, gap: 8 },
  crownCircle: { width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center' },
  crownEmoji: { fontSize: 44 },
  heroTitle: { color: colors.text, fontSize: 36, fontWeight: '900', letterSpacing: -1 },
  heroSubtitle: { color: colors.subtext, fontSize: 15 },
  currentPlanBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: `${colors.primary}22`, borderRadius: 100, paddingHorizontal: 14, paddingVertical: 6, marginTop: 4 },
  currentPlanText: { color: colors.primary, fontSize: 13, fontWeight: '600' },
  featuresGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, gap: 10, marginBottom: 16 },
  featureItem: { width: (SCREEN_WIDTH - 52) / 2, flexDirection: 'row', alignItems: 'center', gap: 8 },
  featureIcon: { fontSize: 18 },
  featureLabel: { color: colors.text, fontSize: 13, fontWeight: '500', flex: 1 },
  plansTitle: { color: colors.text, fontSize: 18, fontWeight: '700', paddingHorizontal: 16, marginBottom: 12 },
  planCardWrapper: { marginHorizontal: 16, marginBottom: 10, borderRadius: 16, overflow: 'hidden' },
  planCardGradient: { borderRadius: 16, overflow: 'hidden' },
  planCard: {},
  planContent: { padding: 16 },
  planBadge: { alignSelf: 'flex-start', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 3, marginBottom: 8 },
  planBadgeText: { fontSize: 11, fontWeight: '700' },
  planMainRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  planLabel: { fontSize: 17, fontWeight: '700' },
  planSavings: { fontSize: 12, fontWeight: '600', marginTop: 2 },
  planPriceBlock: { alignItems: 'flex-end' },
  planPrice: { fontSize: 22, fontWeight: '800' },
  planPeriod: { fontSize: 12 },
  planPerMonth: { fontSize: 12, marginTop: 4 },
  subscribeSection: { paddingHorizontal: 16, gap: 10 },
  subscribeBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 56, borderRadius: 16 },
  subscribeBtnText: { color: '#000', fontSize: 17, fontWeight: '800' },
  subscribeNote: { color: colors.subtext, fontSize: 12, textAlign: 'center' },
  legalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  legalLink: { color: colors.subtext, fontSize: 11, textDecorationLine: 'underline' },
  legalDot: { color: colors.subtext, fontSize: 11 },
});
