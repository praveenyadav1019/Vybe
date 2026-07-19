import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation } from '@tanstack/react-query';
import Animated, { FadeInDown, FadeInRight } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { useDiscoveryStore } from '@/stores/discoveryStore';
import type { NearbyUser, Place } from '@/types';
import { colors } from '@/theme/colors';
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import { Avatar } from '@/components/ui/Avatar';

const VIBE_OPTIONS = [
  { label: 'Clubs', emoji: '🎵' },
  { label: 'Bars', emoji: '🍻' },
  { label: 'Rooftop', emoji: '🌙' },
  { label: 'House Party', emoji: '🏠' },
  { label: 'Chill', emoji: '😌' },
];

const SAFETY_TIPS = [
  'Always meet in public places first',
  'Share your location with a trusted friend',
  'Keep your phone charged',
  'Trust your instincts — leave if uncomfortable',
  'Have a backup plan to get home safely',
];

export default function NightOutModeScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { setActiveMode } = useDiscoveryStore();
  const [isActive, setIsActive] = useState(false);
  const [selectedVibe, setSelectedVibe] = useState('');

  const now = new Date();
  const isNightTime = now.getHours() >= 20 || now.getHours() < 6;

  const { data: nightOwls } = useQuery({
    queryKey: ['nearby', 'night-out'],
    queryFn: () => api.get<{ users: NearbyUser[] }>('/location/nearby?mode=night-out').then(r => r.data.users),
    enabled: isActive,
    refetchInterval: 30000,
  });

  const { data: placesData } = useQuery({
    queryKey: ['places', 'happening'],
    queryFn: () => api.get<{ places: Place[] }>('/places/happening').then(r => r.data.places),
    enabled: isActive,
  });

  const activateMutation = useMutation({
    mutationFn: (active: boolean) => api.patch('/me', { activeMode: active ? 'night-out' : 'casual' }),
    onSuccess: (_, active) => {
      setIsActive(active);
      setActiveMode(active ? 'night-out' : 'casual');
    },
  });

  const pingMutation = useMutation({
    mutationFn: (userId: string) => api.post(`/users/${userId}/ping`),
    onSuccess: () => Alert.alert('🌙 Pinged!', 'Night out ping sent!'),
  });

  const nightOwlsList = nightOwls || [];
  const happeningPlaces = placesData?.slice(0, 3) || [];

  return (
    <SafeAreaView style={styles.container}>
      <Animated.View entering={FadeInDown.delay(50)} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Night Out 🌙</Text>
        <View style={{ width: 40 }} />
      </Animated.View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Hero */}
        <Animated.View entering={FadeInDown.delay(100)} style={styles.heroWrapper}>
          <LinearGradient colors={['#4C1D95', '#1A0A3D']} style={styles.heroGradient}>
            <Text style={styles.heroEmoji}>🌙</Text>
            <Text style={styles.heroTitle}>Night Out Mode</Text>
            <Text style={styles.heroSubtitle}>Find your night squad</Text>
            {!isNightTime && (
              <View style={styles.earlyWarning}>
                <Ionicons name="time-outline" size={14} color="#FFF" />
                <Text style={styles.earlyText}>Night Mode activates after 8:00 PM</Text>
              </View>
            )}
            <View style={styles.toggleRow}>
              <Text style={styles.toggleLabel}>{isActive ? '🟢 Active' : '⚫ Inactive'}</Text>
              <TouchableOpacity
                onPress={() => activateMutation.mutate(!isActive)}
                style={[styles.toggleBtn, isActive && styles.toggleBtnActive]}
              >
                <Text style={styles.toggleBtnText}>{isActive ? 'Deactivate' : 'Activate'}</Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* Vibe Selector */}
        <Animated.View entering={FadeInDown.delay(150)}>
          <Text style={styles.sectionTitle}>Tonight's Vibe</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ paddingLeft: 16, marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', gap: 10, paddingRight: 16 }}>
              {VIBE_OPTIONS.map(({ label, emoji }) => (
                <TouchableOpacity
                  key={label}
                  onPress={() => setSelectedVibe(label)}
                  style={[styles.vibeChip, selectedVibe === label && styles.vibeChipActive]}
                >
                  <Text style={styles.vibeEmoji}>{emoji}</Text>
                  <Text style={[styles.vibeLabel, selectedVibe === label && { color: '#FFF' }]}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </Animated.View>

        {/* Active Night Owls */}
        {isActive && (
          <Animated.View entering={FadeInDown.delay(200)}>
            <GlassCard style={styles.countCard}>
              <View style={styles.countRow}>
                <View style={styles.pulsingDot} />
                <Text style={styles.countText}>
                  {nightOwlsList.length > 0
                    ? `${nightOwlsList.length} night owls nearby`
                    : 'Looking for night owls...'}
                </Text>
              </View>
            </GlassCard>
          </Animated.View>
        )}


        {/* Solo Night Owls */}
        {isActive && nightOwlsList.length > 0 && (
          <Animated.View entering={FadeInDown.delay(300)}>
            <Text style={styles.sectionTitle}>Squad Up 🌙</Text>
            {nightOwlsList.slice(0, 5).map((owl, index) => (
              <Animated.View key={owl.id} entering={FadeInRight.delay(index * 60)}>
                <GlassCard style={styles.owlCard}>
                  <View style={styles.owlRow}>
                    <Avatar uri={owl.photos[0]} name={owl.name} size="md" showOnline isOnline={owl.isOnline} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.owlName}>{owl.name}, {owl.age}</Text>
                      <Text style={styles.owlDist}>{owl.distance}</Text>
                    </View>
                    <Button
                      title="Ping 🌙"
                      onPress={() => pingMutation.mutate(owl.id)}
                      size="sm"
                      fullWidth={false}
                    />
                  </View>
                </GlassCard>
              </Animated.View>
            ))}
          </Animated.View>
        )}

        {/* Safety Tips */}
        <Animated.View entering={FadeInDown.delay(350)}>
          <Text style={styles.sectionTitle}>Stay Safe Tonight 🛡️</Text>
          <GlassCard style={{ marginHorizontal: 16 }}>
            {SAFETY_TIPS.map((tip, i) => (
              <View key={i} style={styles.safetyTip}>
                <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                <Text style={styles.safetyTipText}>{tip}</Text>
              </View>
            ))}
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
  heroWrapper: { margin: 16, borderRadius: 20, overflow: 'hidden' },
  heroGradient: { padding: 24, alignItems: 'center', gap: 8 },
  heroEmoji: { fontSize: 48 },
  heroTitle: { color: '#FFF', fontSize: 28, fontWeight: '800' },
  heroSubtitle: { color: 'rgba(255,255,255,0.8)', fontSize: 15 },
  earlyWarning: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  earlyText: { color: '#FFF', fontSize: 12 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8, width: '100%' },
  toggleLabel: { color: '#FFF', fontSize: 15, fontWeight: '600', flex: 1 },
  toggleBtn: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20, paddingHorizontal: 20, paddingVertical: 10 },
  toggleBtnActive: { backgroundColor: colors.primary },
  toggleBtnText: { color: '#FFF', fontSize: 14, fontWeight: '600' },
  sectionTitle: { color: colors.text, fontSize: 18, fontWeight: '700', paddingHorizontal: 16, marginBottom: 12, marginTop: 8 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingRight: 16 },
  seeAll: { color: colors.primary, fontSize: 13, fontWeight: '600' },
  vibeChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 16, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, alignItems: 'center', gap: 4 },
  vibeChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  vibeEmoji: { fontSize: 20 },
  vibeLabel: { color: colors.subtext, fontSize: 12, fontWeight: '500' },
  countCard: { marginHorizontal: 16, marginBottom: 12 },
  countRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pulsingDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.success },
  countText: { color: colors.text, fontSize: 14, fontWeight: '500' },
  placeCard: { marginHorizontal: 16, marginBottom: 10 },
  placeRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  placeIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  placeName: { color: colors.text, fontSize: 15, fontWeight: '600' },
  placeAddr: { color: colors.subtext, fontSize: 12, marginTop: 2 },
  vibeScore: { backgroundColor: `${colors.accent}22`, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  vibeScoreText: { color: colors.accent, fontSize: 13, fontWeight: '700' },
  owlCard: { marginHorizontal: 16, marginBottom: 10 },
  owlRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  owlName: { color: colors.text, fontSize: 15, fontWeight: '600' },
  owlDist: { color: colors.subtext, fontSize: 12, marginTop: 2 },
  safetyTip: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 10 },
  safetyTipText: { color: colors.subtext, fontSize: 13, flex: 1, lineHeight: 20 },
});
