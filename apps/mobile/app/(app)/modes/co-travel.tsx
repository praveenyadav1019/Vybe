import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  FlatList,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation } from '@tanstack/react-query';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { useDiscoveryStore } from '@/stores/discoveryStore';
import type { NearbyUser } from '@/types';
import { colors } from '@/theme/colors';
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import { Avatar } from '@/components/ui/Avatar';

const TRAVEL_STYLES = ['🎒 Backpacker', '🏖️ Leisure', '💼 Business', '🧗 Adventure', '🎭 Cultural'];
const POPULAR_DESTINATIONS = ['🏝️ Goa', '🏔️ Manali', '🕌 Jaipur', '🌊 Kerala', '🏛️ Hampi', '🎋 Coorg', '🌸 Darjeeling', '🏯 Pondicherry'];

export default function CoTravelModeScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { setActiveMode } = useDiscoveryStore();
  const [isActive, setIsActive] = useState(false);
  const [fromDest, setFromDest] = useState('');
  const [toDest, setToDest] = useState('');
  const [travelStyle, setTravelStyle] = useState('');

  const { data: travelers } = useQuery({
    queryKey: ['nearby', 'co-travel'],
    queryFn: () => api.get<{ users: NearbyUser[] }>('/location/nearby?mode=co-travel').then(r => r.data.users),
    enabled: isActive,
    refetchInterval: 60000,
  });

  const saveMutation = useMutation({
    mutationFn: () =>
      api.patch('/me', {
        activeMode: 'co-travel',
        bio: `${user?.bio || ''} | Traveling: ${fromDest} → ${toDest} | Style: ${travelStyle}`.trim(),
      }),
    onSuccess: () => {
      setIsActive(true);
      setActiveMode('co-travel');
      Alert.alert('✈️ Journey Set!', 'Your travel plans are live. Find co-travelers!');
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: () => api.patch('/me', { activeMode: 'casual' }),
    onSuccess: () => { setIsActive(false); setActiveMode('casual'); },
  });

  const pingMutation = useMutation({
    mutationFn: (userId: string) => api.post(`/users/${userId}/ping`),
    onSuccess: () => Alert.alert('✈️ Pinged!', 'Your co-travel request was sent!'),
  });

  const nearbyTravelers = travelers || [];

  return (
    <SafeAreaView style={styles.container}>
      <Animated.View entering={FadeInDown.delay(50)} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Co-Travel ✈️</Text>
        <View style={{ width: 40 }} />
      </Animated.View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Hero */}
        <Animated.View entering={FadeInDown.delay(100)} style={styles.heroWrapper}>
          <LinearGradient colors={['#4CAF50', '#1B5E20']} style={styles.heroGradient}>
            <Text style={styles.heroEmoji}>✈️</Text>
            <Text style={styles.heroTitle}>Co-Travel Mode</Text>
            <Text style={styles.heroSubtitle}>Find your travel companion</Text>
          </LinearGradient>
        </Animated.View>

        {/* Journey Planner */}
        {!isActive && (
          <Animated.View entering={FadeInDown.delay(150)}>
            <GlassCard style={styles.plannerCard}>
              <Text style={styles.plannerTitle}>Where are you headed?</Text>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>From</Text>
                <View style={styles.inputRow}>
                  <Ionicons name="location-outline" size={18} color={colors.subtext} />
                  <TextInput
                    value={fromDest}
                    onChangeText={setFromDest}
                    placeholder="Your starting point"
                    placeholderTextColor={colors.subtext}
                    style={styles.textInput}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>To</Text>
                <View style={styles.inputRow}>
                  <Ionicons name="navigate-outline" size={18} color={colors.accent} />
                  <TextInput
                    value={toDest}
                    onChangeText={setToDest}
                    placeholder="Your destination"
                    placeholderTextColor={colors.subtext}
                    style={styles.textInput}
                  />
                </View>
              </View>

              <Text style={styles.inputLabel}>Travel Style</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {TRAVEL_STYLES.map((style) => (
                    <TouchableOpacity
                      key={style}
                      onPress={() => setTravelStyle(style)}
                      style={[styles.styleChip, travelStyle === style && styles.styleChipActive]}
                    >
                      <Text style={[styles.styleChipText, travelStyle === style && { color: '#FFF' }]}>
                        {style}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>

              <Button
                title="Set My Journey ✈️"
                onPress={() => saveMutation.mutate()}
                loading={saveMutation.isPending}
                disabled={!fromDest || !toDest}
              />
            </GlassCard>
          </Animated.View>
        )}

        {/* Active Journey Status */}
        {isActive && (
          <Animated.View entering={FadeInDown.delay(150)}>
            <GlassCard style={styles.activeCard}>
              <View style={styles.activeRow}>
                <View style={styles.pulsingDot} />
                <Text style={styles.activeLabel}>Journey Active</Text>
                <TouchableOpacity onPress={() => deactivateMutation.mutate()}>
                  <Text style={styles.endBtn}>End Trip</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.journeyText}>{fromDest} → {toDest}</Text>
              {travelStyle ? <Text style={styles.styleText}>{travelStyle}</Text> : null}
            </GlassCard>
          </Animated.View>
        )}

        {/* Popular Destinations */}
        <Animated.View entering={FadeInDown.delay(200)}>
          <Text style={styles.sectionTitle}>Popular Destinations</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ paddingLeft: 16 }}>
            <View style={{ flexDirection: 'row', gap: 8, paddingRight: 16 }}>
              {POPULAR_DESTINATIONS.map((dest) => (
                <TouchableOpacity
                  key={dest}
                  onPress={() => setToDest(dest.split(' ').slice(1).join(' '))}
                  style={styles.destChip}
                >
                  <Text style={styles.destChipText}>{dest}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </Animated.View>

        {/* Co-Travelers Nearby */}
        {isActive && (
          <Animated.View entering={FadeInDown.delay(250)}>
            <Text style={styles.sectionTitle}>Co-Travelers Nearby</Text>
            {nearbyTravelers.length === 0 ? (
              <GlassCard style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>No co-travelers found</Text>
                <Text style={styles.emptySubtext}>Try expanding your radius</Text>
              </GlassCard>
            ) : (
              nearbyTravelers.map((traveler, index) => (
                <Animated.View key={traveler.id} entering={FadeInDown.delay(index * 60)}>
                  <GlassCard style={styles.travelerCard}>
                    <View style={styles.travelerRow}>
                      <Avatar uri={traveler.photos[0]} name={traveler.name} size="md" showOnline isOnline={traveler.isOnline} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.travelerName}>{traveler.name}, {traveler.age}</Text>
                        <Text style={styles.travelerDist}>{traveler.distance}</Text>
                      </View>
                      <Button
                        title="Ping ✈️"
                        onPress={() => pingMutation.mutate(traveler.id)}
                        size="sm"
                        fullWidth={false}
                      />
                    </View>
                  </GlassCard>
                </Animated.View>
              ))
            )}
          </Animated.View>
        )}
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
  plannerCard: { marginHorizontal: 16, marginBottom: 16 },
  plannerTitle: { color: colors.text, fontSize: 18, fontWeight: '700', marginBottom: 16 },
  inputGroup: { marginBottom: 12 },
  inputLabel: { color: colors.subtext, fontSize: 12, fontWeight: '500', marginBottom: 6 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.surface, borderRadius: 12, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 12, height: 48 },
  textInput: { flex: 1, color: colors.text, fontSize: 15 },
  styleChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 100, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  styleChipActive: { backgroundColor: '#4CAF50', borderColor: '#4CAF50' },
  styleChipText: { color: colors.subtext, fontSize: 13, fontWeight: '500' },
  activeCard: { marginHorizontal: 16, marginBottom: 16 },
  activeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  pulsingDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.success },
  activeLabel: { color: colors.success, fontSize: 13, fontWeight: '600', flex: 1 },
  endBtn: { color: colors.danger, fontSize: 13, fontWeight: '600' },
  journeyText: { color: colors.text, fontSize: 16, fontWeight: '600' },
  styleText: { color: colors.subtext, fontSize: 13, marginTop: 2 },
  sectionTitle: { color: colors.text, fontSize: 18, fontWeight: '700', paddingHorizontal: 16, marginTop: 8, marginBottom: 12 },
  destChip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  destChipText: { color: colors.text, fontSize: 13, fontWeight: '500' },
  emptyCard: { marginHorizontal: 16, alignItems: 'center', paddingVertical: 32, gap: 8 },
  emptyTitle: { color: colors.text, fontSize: 16, fontWeight: '600' },
  emptySubtext: { color: colors.subtext, fontSize: 13 },
  travelerCard: { marginHorizontal: 16, marginBottom: 10 },
  travelerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  travelerName: { color: colors.text, fontSize: 15, fontWeight: '600' },
  travelerDist: { color: colors.subtext, fontSize: 12 },
});
