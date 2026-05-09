import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  TextInput,
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
import type { NearbyUser, Place } from '@/types';
import { colors } from '@/theme/colors';
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import { Avatar } from '@/components/ui/Avatar';

const GENRES = ['🎵 House', '🎧 Techno', '🎤 Hip-Hop', '🎸 R&B', '🎺 Jazz', '🎻 EDM', '🎶 Pop', '🎼 Afrobeats'];
const ACTIVITIES = ['💃 Dance Partner', '🍻 Drinking Buddy', '😌 Just Vibing', '🎮 VIP Table', '📸 Photo Buddy'];

export default function ClubMatesScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { setActiveMode } = useDiscoveryStore();
  const [isActive, setIsActive] = useState(false);
  const [selectedVenue, setSelectedVenue] = useState<Place | null>(null);
  const [selectedGenre, setSelectedGenre] = useState('');
  const [selectedActivity, setSelectedActivity] = useState('');
  const [venueSearch, setVenueSearch] = useState('');

  const { data: placesData } = useQuery({
    queryKey: ['places', 'happening'],
    queryFn: () => api.get<{ places: Place[] }>('/places/happening').then(r => r.data.places),
  });

  const { data: matesData } = useQuery({
    queryKey: ['nearby', 'club-mates'],
    queryFn: () => api.get<{ users: NearbyUser[] }>('/location/nearby?mode=club-mates').then(r => r.data.users),
    enabled: isActive,
    refetchInterval: 30000,
  });

  const activateMutation = useMutation({
    mutationFn: async (active: boolean) => {
      await api.patch('/me', { activeMode: active ? 'club-mates' : 'casual' });
      if (active && selectedVenue) {
        await api.post(`/places/${selectedVenue.id}/checkin`);
      }
    },
    onSuccess: (_, active) => {
      setIsActive(active);
      setActiveMode(active ? 'club-mates' : 'casual');
    },
  });

  const pingMutation = useMutation({
    mutationFn: (userId: string) => api.post(`/users/${userId}/ping`),
    onSuccess: () => Alert.alert('🎵 Pinged!', 'Club mate request sent!'),
  });

  const venues = placesData?.filter(p => p.type === 'club' || p.type === 'bar') || [];
  const clubMates = matesData || [];

  return (
    <SafeAreaView style={styles.container}>
      <Animated.View entering={FadeInDown.delay(50)} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Club Mates 🎵</Text>
        <View style={{ width: 40 }} />
      </Animated.View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Hero */}
        <Animated.View entering={FadeInDown.delay(100)} style={styles.heroWrapper}>
          <LinearGradient colors={['#006064', '#00BCD4']} style={styles.heroGradient}>
            <Text style={styles.heroEmoji}>🎵</Text>
            <Text style={styles.heroTitle}>Club Mates</Text>
            <Text style={styles.heroSubtitle}>Find your vibe at the venue</Text>
          </LinearGradient>
        </Animated.View>

        {/* Venue Selection */}
        {!isActive && (
          <Animated.View entering={FadeInDown.delay(150)}>
            <GlassCard style={styles.venueCard}>
              <Text style={styles.cardTitle}>Which venue are you at?</Text>
              <View style={styles.searchRow}>
                <Ionicons name="search" size={18} color={colors.subtext} />
                <TextInput
                  value={venueSearch}
                  onChangeText={setVenueSearch}
                  placeholder="Search venues..."
                  placeholderTextColor={colors.subtext}
                  style={styles.searchInput}
                />
              </View>
              {venues.filter(v => !venueSearch || v.name.toLowerCase().includes(venueSearch.toLowerCase())).map((venue) => (
                <TouchableOpacity
                  key={venue.id}
                  onPress={() => setSelectedVenue(venue)}
                  style={[styles.venueRow, selectedVenue?.id === venue.id && styles.venueRowActive]}
                >
                  <View style={styles.venueIcon}>
                    <Text style={{ fontSize: 20 }}>🎵</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.venueName}>{venue.name}</Text>
                    <Text style={styles.venueAddr}>{venue.address}</Text>
                  </View>
                  <View style={styles.venueCrowd}>
                    <Text style={styles.venueCrowdText}>👥 {venue.activeUsers}</Text>
                  </View>
                  {selectedVenue?.id === venue.id && (
                    <Ionicons name="checkmark-circle" size={20} color={colors.accent} />
                  )}
                </TouchableOpacity>
              ))}
            </GlassCard>
          </Animated.View>
        )}

        {/* Music Genre */}
        <Animated.View entering={FadeInDown.delay(200)}>
          <Text style={styles.sectionTitle}>Music Vibe</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ paddingLeft: 16, marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', gap: 8, paddingRight: 16 }}>
              {GENRES.map((genre) => (
                <TouchableOpacity
                  key={genre}
                  onPress={() => setSelectedGenre(genre)}
                  style={[styles.chip, selectedGenre === genre && styles.chipActive]}
                >
                  <Text style={[styles.chipText, selectedGenre === genre && { color: '#FFF' }]}>{genre}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </Animated.View>

        {/* Activity */}
        <Animated.View entering={FadeInDown.delay(250)}>
          <Text style={styles.sectionTitle}>I'm looking for</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ paddingLeft: 16, marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', gap: 8, paddingRight: 16 }}>
              {ACTIVITIES.map((act) => (
                <TouchableOpacity
                  key={act}
                  onPress={() => setSelectedActivity(act)}
                  style={[styles.chip, selectedActivity === act && styles.chipActive]}
                >
                  <Text style={[styles.chipText, selectedActivity === act && { color: '#FFF' }]}>{act}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </Animated.View>

        {/* Check-in Button */}
        {!isActive && (
          <Animated.View entering={FadeInDown.delay(300)} style={{ paddingHorizontal: 16, marginBottom: 16 }}>
            <Button
              title="Check In & Find Mates 🎵"
              onPress={() => {
                if (!selectedVenue) {
                  Alert.alert('Select a venue', 'Please select which venue you are at.');
                  return;
                }
                activateMutation.mutate(true);
              }}
              loading={activateMutation.isPending}
            />
          </Animated.View>
        )}

        {/* Active Status */}
        {isActive && selectedVenue && (
          <Animated.View entering={FadeInDown.delay(150)}>
            <GlassCard style={styles.activeCard}>
              <View style={styles.activeRow}>
                <View style={styles.pulsingDot} />
                <Text style={styles.activeText}>Checked in at {selectedVenue.name}</Text>
                <TouchableOpacity onPress={() => activateMutation.mutate(false)}>
                  <Text style={styles.leaveText}>Leave</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.crowdBar}>
                <View style={[styles.crowdFill, { width: `${selectedVenue.crowdScore * 10}%` }]} />
              </View>
              <Text style={styles.crowdLabel}>Crowd: {selectedVenue.crowdScore.toFixed(1)}/10</Text>
            </GlassCard>
          </Animated.View>
        )}

        {/* Club Mates at Venue */}
        {isActive && (
          <Animated.View entering={FadeInDown.delay(200)}>
            <Text style={styles.sectionTitle}>
              {clubMates.length > 0 ? `${clubMates.length} Club Mates Here 🎵` : 'Looking for club mates...'}
            </Text>
            {clubMates.map((mate, index) => (
              <Animated.View key={mate.id} entering={FadeInDown.delay(index * 60)}>
                <GlassCard style={styles.mateCard}>
                  <View style={styles.mateRow}>
                    <Avatar uri={mate.photos[0]} name={mate.name} size="md" showOnline isOnline={mate.isOnline} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.mateName}>{mate.name}, {mate.age}</Text>
                      <Text style={styles.mateDist}>{mate.distance}</Text>
                    </View>
                    <Button
                      title="Ping 🎵"
                      onPress={() => pingMutation.mutate(mate.id)}
                      size="sm"
                      fullWidth={false}
                    />
                  </View>
                </GlassCard>
              </Animated.View>
            ))}
            {clubMates.length === 0 && (
              <GlassCard style={styles.emptyCard}>
                <Ionicons name="musical-notes-outline" size={48} color={colors.accent} />
                <Text style={styles.emptyTitle}>No one nearby yet</Text>
                <Text style={styles.emptySubtext}>Be the first to check in!</Text>
              </GlassCard>
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
  venueCard: { marginHorizontal: 16, marginBottom: 16 },
  cardTitle: { color: colors.text, fontSize: 16, fontWeight: '700', marginBottom: 12 },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.surface, borderRadius: 12, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 12, height: 44, marginBottom: 12 },
  searchInput: { flex: 1, color: colors.text, fontSize: 14 },
  venueRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderRadius: 12, paddingHorizontal: 8 },
  venueRowActive: { backgroundColor: `${colors.accent}11`, borderWidth: 1, borderColor: `${colors.accent}44` },
  venueIcon: { width: 40, height: 40, borderRadius: 10, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  venueName: { color: colors.text, fontSize: 14, fontWeight: '600' },
  venueAddr: { color: colors.subtext, fontSize: 12, marginTop: 2 },
  venueCrowd: { backgroundColor: `${colors.primary}22`, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  venueCrowdText: { color: colors.primary, fontSize: 12, fontWeight: '600' },
  sectionTitle: { color: colors.text, fontSize: 18, fontWeight: '700', paddingHorizontal: 16, marginBottom: 12 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 100, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  chipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipText: { color: colors.subtext, fontSize: 13, fontWeight: '500' },
  activeCard: { marginHorizontal: 16, marginBottom: 16 },
  activeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  pulsingDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.success },
  activeText: { color: colors.text, fontSize: 14, fontWeight: '600', flex: 1 },
  leaveText: { color: colors.danger, fontSize: 13, fontWeight: '600' },
  crowdBar: { height: 4, borderRadius: 2, backgroundColor: colors.border, marginBottom: 4 },
  crowdFill: { height: '100%', borderRadius: 2, backgroundColor: colors.accent },
  crowdLabel: { color: colors.subtext, fontSize: 12 },
  mateCard: { marginHorizontal: 16, marginBottom: 10 },
  mateRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  mateName: { color: colors.text, fontSize: 15, fontWeight: '600' },
  mateDist: { color: colors.subtext, fontSize: 12, marginTop: 2 },
  emptyCard: { marginHorizontal: 16, alignItems: 'center', paddingVertical: 32, gap: 8 },
  emptyTitle: { color: colors.text, fontSize: 16, fontWeight: '600' },
  emptySubtext: { color: colors.subtext, fontSize: 13 },
});
