import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Vibration,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useMutation } from '@tanstack/react-query';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSpring,
  FadeInDown,
} from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { useLocationStore } from '@/stores/locationStore';
import { colors } from '@/theme/colors';
import { GlassCard } from '@/components/ui/GlassCard';

const SAFETY_TIPS = [
  { icon: '🏙️', tip: 'Always meet in well-lit, public places first' },
  { icon: '📍', tip: 'Share your live location with a trusted friend' },
  { icon: '🔋', tip: 'Keep your phone charged before going out' },
  { icon: '🚗', tip: 'Arrange your own transport — don\'t rely on strangers' },
  { icon: '🧠', tip: 'Trust your instincts — leave if you feel unsafe' },
  { icon: '🚨', tip: 'Know the local emergency number (India: 112)' },
];

export default function SafetyScreen() {
  const router = useRouter();
  const { user, updateUser } = useAuthStore();
  const { latitude, longitude } = useLocationStore();
  const [safetyMode, setSafetyMode] = useState(user?.safetyMode || false);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [sosHeld, setSosHeld] = useState(false);
  const sosTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [sosProgress, setSosProgress] = useState(0);
  const progressInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  const ringScale = useSharedValue(1);
  ringScale.value = withRepeat(withTiming(1.3, { duration: 1200 }), -1, true);

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ringScale.value }],
    opacity: 2 - ringScale.value,
  }));

  const sosMutation = useMutation({
    mutationFn: () =>
      api.post('/safety/sos', {
        latitude: latitude || 0,
        longitude: longitude || 0,
        message: 'SOS triggered from VYBEON Safety Center',
      }),
    onSuccess: () => {
      Vibration.vibrate([0, 200, 100, 200]);
      Alert.alert('🆘 SOS Sent', 'Emergency services have been notified. Help is on the way.\n\nStay calm and stay visible.', [{ text: 'OK' }]);
    },
    onError: () => Alert.alert('Error', 'Could not send SOS. Please call emergency services directly: 112'),
  });

  const safetyModeMutation = useMutation({
    mutationFn: (enabled: boolean) => api.patch('/me', { safetyMode: enabled }),
    onSuccess: (_, enabled) => {
      setSafetyMode(enabled);
      updateUser({ safetyMode: enabled });
    },
  });

  const handleSOSPressIn = () => {
    setSosHeld(true);
    setSosProgress(0);
    Vibration.vibrate(100);

    progressInterval.current = setInterval(() => {
      setSosProgress((p) => {
        if (p >= 100) {
          clearInterval(progressInterval.current!);
          return 100;
        }
        return p + 5;
      });
    }, 150);

    sosTimer.current = setTimeout(() => {
      setSosHeld(false);
      sosMutation.mutate();
    }, 3000);
  };

  const handleSOSPressOut = () => {
    setSosHeld(false);
    setSosProgress(0);
    if (sosTimer.current) clearTimeout(sosTimer.current);
    if (progressInterval.current) clearInterval(progressInterval.current);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <Animated.View entering={FadeInDown.delay(50)} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Safety Center 🛡️</Text>
        <View style={{ width: 40 }} />
      </Animated.View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        {/* SOS Button */}
        <Animated.View entering={FadeInDown.delay(100)} style={styles.sosSection}>
          <Text style={styles.sosLabel}>Hold for 3 seconds to send SOS</Text>
          <View style={styles.sosContainer}>
            <Animated.View style={[styles.sosRing, ringStyle]} />
            <TouchableOpacity
              onPressIn={handleSOSPressIn}
              onPressOut={handleSOSPressOut}
              activeOpacity={0.85}
              style={styles.sosButtonWrapper}
            >
              <LinearGradient
                colors={sosHeld ? ['#CC0000', '#880000'] : ['#EF4444', '#DC2626']}
                style={styles.sosButton}
              >
                {sosHeld ? (
                  <View style={styles.sosProgressWrapper}>
                    <View style={[styles.sosProgressFill, { width: `${sosProgress}%` }]} />
                  </View>
                ) : null}
                <Text style={styles.sosEmoji}>🆘</Text>
                <Text style={styles.sosButtonText}>SOS</Text>
                <Text style={styles.sosButtonSub}>{sosHeld ? 'Release to cancel' : 'HOLD 3 SEC'}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Safety Mode Toggle */}
        <Animated.View entering={FadeInDown.delay(150)}>
          <GlassCard style={styles.toggleCard}>
            <View style={styles.toggleRow}>
              <View style={styles.toggleIcon}>
                <Ionicons name="shield-checkmark" size={22} color={colors.success} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.toggleTitle}>Women's Safety Mode</Text>
                <Text style={styles.toggleSubtext}>Only verified users can ping you. Extra privacy controls enabled.</Text>
              </View>
              <Switch
                value={safetyMode}
                onValueChange={(v) => safetyModeMutation.mutate(v)}
                trackColor={{ false: colors.border, true: colors.success }}
                thumbColor="#FFF"
              />
            </View>
          </GlassCard>
        </Animated.View>

        {/* Safety Features Info */}
        <Animated.View entering={FadeInDown.delay(200)}>
          <GlassCard style={styles.featuresCard}>
            <Text style={styles.featuresTitle}>Always-On Protection</Text>
            {[
              { icon: 'location-off-outline', label: 'Exact GPS never shared', desc: 'Only approximate distance shown', color: colors.success },
              { icon: 'hand-left-outline', label: 'Consent-First Messaging', desc: 'Both parties must match first', color: colors.accent },
              { icon: 'eye-off-outline', label: 'AI Content Moderation', desc: 'Messages reviewed for harassment', color: colors.primary },
            ].map(({ icon, label, desc, color }) => (
              <View key={label} style={styles.featureRow}>
                <View style={[styles.featureIconBox, { backgroundColor: `${color}22` }]}>
                  <Ionicons name={icon as any} size={18} color={color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.featureLabel}>{label}</Text>
                  <Text style={styles.featureDesc}>{desc}</Text>
                </View>
                <Ionicons name="checkmark-circle" size={18} color={colors.success} />
              </View>
            ))}
          </GlassCard>
        </Animated.View>

        {/* Blocked Users */}
        <Animated.View entering={FadeInDown.delay(250)}>
          <TouchableOpacity onPress={() => Alert.alert('Blocked Users', 'Manage blocked users in Settings > Privacy')}>
            <GlassCard style={styles.blockCard}>
              <View style={styles.blockRow}>
                <Ionicons name="ban-outline" size={20} color={colors.danger} />
                <Text style={styles.blockText}>Manage Blocked Users</Text>
                <Ionicons name="chevron-forward" size={18} color={colors.subtext} />
              </View>
            </GlassCard>
          </TouchableOpacity>
        </Animated.View>

        {/* Safety Tips */}
        <Animated.View entering={FadeInDown.delay(300)}>
          <Text style={styles.sectionTitle}>Safety Tips</Text>
          {SAFETY_TIPS.map(({ icon, tip }, i) => (
            <GlassCard key={i} style={styles.tipCard}>
              <View style={styles.tipRow}>
                <Text style={styles.tipEmoji}>{icon}</Text>
                <Text style={styles.tipText}>{tip}</Text>
              </View>
            </GlassCard>
          ))}
        </Animated.View>

        {/* Report */}
        <Animated.View entering={FadeInDown.delay(350)}>
          <TouchableOpacity
            onPress={() => Alert.alert('Report', 'To report a user, go to their profile and tap the ⋮ menu.')}
          >
            <GlassCard style={styles.reportCard}>
              <View style={styles.reportRow}>
                <Ionicons name="flag-outline" size={20} color={colors.warning} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.reportTitle}>Report a Problem</Text>
                  <Text style={styles.reportSubtext}>Report harassment, fake profiles, or abuse</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.subtext} />
              </View>
            </GlassCard>
          </TouchableOpacity>
        </Animated.View>

        {/* Emergency Contact */}
        <Animated.View entering={FadeInDown.delay(400)}>
          <GlassCard style={styles.emergencyCard}>
            <View style={styles.emergencyRow}>
              <Ionicons name="call-outline" size={20} color={colors.accent} />
              <View style={{ flex: 1 }}>
                <Text style={styles.emergencyTitle}>Emergency Contacts</Text>
                <Text style={styles.emergencySubtext}>Coming soon — add trusted contacts who get notified on SOS</Text>
              </View>
            </View>
          </GlassCard>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: colors.text, fontSize: 18, fontWeight: '700' },
  sosSection: { alignItems: 'center', paddingVertical: 24, gap: 12 },
  sosLabel: { color: colors.subtext, fontSize: 13 },
  sosContainer: { width: 160, height: 160, alignItems: 'center', justifyContent: 'center' },
  sosRing: { position: 'absolute', width: 160, height: 160, borderRadius: 80, backgroundColor: `${colors.danger}22`, borderWidth: 2, borderColor: `${colors.danger}44` },
  sosButtonWrapper: { width: 130, height: 130, borderRadius: 65, overflow: 'hidden' },
  sosButton: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', gap: 2 },
  sosProgressWrapper: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 4, backgroundColor: 'rgba(255,255,255,0.2)' },
  sosProgressFill: { height: '100%', backgroundColor: '#FFF' },
  sosEmoji: { fontSize: 28 },
  sosButtonText: { color: '#FFF', fontSize: 20, fontWeight: '900', letterSpacing: 2 },
  sosButtonSub: { color: 'rgba(255,255,255,0.7)', fontSize: 10, fontWeight: '600' },
  toggleCard: { marginHorizontal: 16, marginBottom: 12 },
  toggleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  toggleIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: `${colors.success}22`, alignItems: 'center', justifyContent: 'center' },
  toggleTitle: { color: colors.text, fontSize: 15, fontWeight: '600', marginBottom: 2 },
  toggleSubtext: { color: colors.subtext, fontSize: 12, lineHeight: 18 },
  featuresCard: { marginHorizontal: 16, marginBottom: 12, gap: 12 },
  featuresTitle: { color: colors.text, fontSize: 16, fontWeight: '700', marginBottom: 4 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  featureIconBox: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  featureLabel: { color: colors.text, fontSize: 13, fontWeight: '600' },
  featureDesc: { color: colors.subtext, fontSize: 11, marginTop: 1 },
  blockCard: { marginHorizontal: 16, marginBottom: 12 },
  blockRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  blockText: { color: colors.text, fontSize: 15, flex: 1 },
  sectionTitle: { color: colors.text, fontSize: 18, fontWeight: '700', paddingHorizontal: 16, marginBottom: 8 },
  tipCard: { marginHorizontal: 16, marginBottom: 8 },
  tipRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  tipEmoji: { fontSize: 20 },
  tipText: { color: colors.subtext, fontSize: 13, lineHeight: 20, flex: 1 },
  reportCard: { marginHorizontal: 16, marginBottom: 12 },
  reportRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  reportTitle: { color: colors.text, fontSize: 14, fontWeight: '600' },
  reportSubtext: { color: colors.subtext, fontSize: 12, marginTop: 1 },
  emergencyCard: { marginHorizontal: 16, marginBottom: 12 },
  emergencyRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  emergencyTitle: { color: colors.text, fontSize: 14, fontWeight: '600' },
  emergencySubtext: { color: colors.subtext, fontSize: 12, marginTop: 1 },
});
