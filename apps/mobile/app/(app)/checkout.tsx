import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  StatusBar, ScrollView, Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useLocalSearchParams, useRouter } from 'expo-router';

// ─── Color tokens (dark gold theme) ──────────────────────────────────────────
const darkBg   = '#12102A';
const darkCard = '#1A1633';
const darkSurf = '#221E40';
const white    = '#FFFFFF';
const gold     = '#C9A84C';
const goldLight = '#F5E3A0';
const inkSec   = 'rgba(255,255,255,0.6)';
const border   = 'rgba(255,255,255,0.1)';
const brand    = '#7C3AED';

const PAYMENT_METHODS = [
  { id: 'apple', icon: 'logo-apple' as const, label: 'Apple Pay' },
  { id: 'card', icon: 'card-outline' as const, label: 'Credit Card' },
];

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function CheckoutScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ eventName?: string }>();

  const eventName = params.eventName ?? 'Starlight Soirée';
  const [selectedPayment, setSelectedPayment] = useState('apple');
  const [loading, setLoading] = useState(false);

  async function handlePurchase() {
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1500));
    setLoading(false);
    Alert.alert('🎉 Purchase Confirmed!', `You're going to ${eventName}!`, [
      { text: 'View Ticket', onPress: () => router.back() },
    ]);
  }

  return (
    <LinearGradient
      colors={['#12102A', '#1A1633', '#12102A']}
      style={[styles.root, { paddingTop: insets.top }]}
    >
      <StatusBar barStyle="light-content" backgroundColor={darkBg} />

      {/* Header */}
      <Animated.View entering={FadeInDown.delay(0).duration(350)} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.8}>
          <Ionicons name="chevron-back" size={22} color={white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Checkout</Text>
        <TouchableOpacity style={styles.lockBtn} activeOpacity={0.8}>
          <Ionicons name="lock-closed-outline" size={18} color="rgba(255,255,255,0.5)" />
        </TouchableOpacity>
      </Animated.View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}>
        {/* Event card */}
        <Animated.View entering={FadeInDown.delay(60).duration(380)} style={styles.eventCard}>
          <View style={styles.eventThumb}>
            <LinearGradient colors={['#C9A84C', '#7C3AED']} style={StyleSheet.absoluteFillObject} />
            <Ionicons name="star" size={28} color={goldLight} />
          </View>
          <View style={styles.eventInfo}>
            <Text style={styles.eventName}>{eventName}</Text>
            <Text style={styles.eventDate}>Sat, Oct 26 · 8:00 PM</Text>
            <Text style={styles.eventVenue}>The Grand Ballroom, NYC</Text>
          </View>
        </Animated.View>

        {/* Order summary */}
        <Animated.View entering={FadeInDown.delay(120).duration(380)} style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Ticket: General Admission (x2)</Text>
          </View>
          <View style={[styles.summaryRow, styles.summaryDivider]}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryValue}>$150.00</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Fees</Text>
            <Text style={styles.summaryValue}>$15.00</Text>
          </View>
          <View style={[styles.summaryRow, styles.summaryDivider, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>$165.00</Text>
          </View>
        </Animated.View>

        {/* Payment method */}
        <Animated.View entering={FadeInDown.delay(180).duration(380)} style={styles.paymentSection}>
          <Text style={styles.paymentTitle}>Payment Method</Text>
          {PAYMENT_METHODS.map((method) => (
            <TouchableOpacity
              key={method.id}
              style={[styles.paymentRow, selectedPayment === method.id && styles.paymentRowActive]}
              onPress={() => setSelectedPayment(method.id)}
              activeOpacity={0.8}
            >
              <Ionicons name={method.icon} size={22} color={white} />
              <Text style={styles.paymentLabel}>{method.label}</Text>
              {selectedPayment === method.id && (
                <Ionicons name="checkmark" size={18} color={gold} style={{ marginLeft: 'auto' }} />
              )}
            </TouchableOpacity>
          ))}
        </Animated.View>
      </ScrollView>

      {/* Confirm button */}
      <Animated.View
        entering={FadeInDown.delay(280).duration(380)}
        style={[styles.confirmWrap, { paddingBottom: insets.bottom + 16 }]}
      >
        <TouchableOpacity onPress={handlePurchase} disabled={loading} activeOpacity={0.88}>
          <LinearGradient
            colors={[gold, goldLight, gold]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={styles.confirmBtn}
          >
            <Text style={styles.confirmBtnText}>{loading ? 'Processing…' : 'Confirm Purchase'}</Text>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    </LinearGradient>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1 },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8,
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: '700', color: white, textAlign: 'center' },
  lockBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },

  eventCard: {
    flexDirection: 'row', gap: 14,
    marginHorizontal: 20, marginTop: 12, marginBottom: 20,
    backgroundColor: darkCard,
    borderRadius: 18, padding: 16,
    borderWidth: 1, borderColor: border,
  },
  eventThumb: {
    width: 64, height: 64, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
  },
  eventInfo: { flex: 1, justifyContent: 'center' },
  eventName: { fontSize: 16, fontWeight: '700', color: white, marginBottom: 4 },
  eventDate: { fontSize: 12, color: inkSec, marginBottom: 2 },
  eventVenue: { fontSize: 12, color: inkSec },

  summaryCard: {
    marginHorizontal: 20, marginBottom: 20,
    backgroundColor: darkCard, borderRadius: 18,
    borderWidth: 1, borderColor: border,
    overflow: 'hidden',
  },
  summaryRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 13,
  },
  summaryDivider: { borderTopWidth: 1, borderTopColor: border },
  summaryLabel: { fontSize: 14, color: inkSec },
  summaryValue: { fontSize: 14, color: white },
  totalRow: {},
  totalLabel: { fontSize: 16, fontWeight: '700', color: white },
  totalValue: { fontSize: 16, fontWeight: '700', color: gold },

  paymentSection: { marginHorizontal: 20 },
  paymentTitle: { fontSize: 15, fontWeight: '700', color: white, marginBottom: 12 },
  paymentRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: darkCard,
    borderRadius: 14, padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: border,
  },
  paymentRowActive: { borderColor: gold },
  paymentLabel: { fontSize: 15, color: white },

  confirmWrap: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 20, paddingTop: 12, backgroundColor: darkBg },
  confirmBtn: {
    height: 54, borderRadius: 9999,
    alignItems: 'center', justifyContent: 'center',
  },
  confirmBtnText: { fontSize: 16, fontWeight: '800', color: '#7A5B10' },
});
