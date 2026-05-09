import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Dimensions, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation } from '@tanstack/react-query';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { api } from '@/lib/api';
import { colors } from '@/theme/colors';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import type { Place, NearbyUser } from '@/types';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

function VibeGauge({ score, label }: { score: number; label: string }) {
  const color = score >= 8 ? colors.success : score >= 6 ? colors.warning : colors.danger;
  return (
    <View style={{ flex: 1, alignItems: 'center', gap: 6 }}>
      <Text style={{ color: colors.subtext, fontSize: 11, fontWeight: '600' }}>{label}</Text>
      <View style={gaugeStyles.track}>
        <View style={[gaugeStyles.fill, { width: `${score * 10}%`, backgroundColor: color }]} />
      </View>
      <Text style={{ color, fontSize: 18, fontWeight: '800' }}>{score.toFixed(1)}</Text>
    </View>
  );
}

const gaugeStyles = StyleSheet.create({
  track: { width: '100%', height: 6, borderRadius: 3, backgroundColor: colors.border },
  fill: { height: '100%', borderRadius: 3 },
});

export default function PlaceDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [checkedIn, setCheckedIn] = useState(false);

  const { data: placeData, isLoading } = useQuery({
    queryKey: ['place', id],
    queryFn: () => api.get<{ place: Place }>(`/places/${id}`).then(r => r.data.place),
  });

  const { data: nearbyData } = useQuery({
    queryKey: ['place-users', id],
    queryFn: () => api.get<{ users: NearbyUser[] }>(`/location/nearby?radius=100`).then(r => r.data.users),
  });

  const checkinMutation = useMutation({
    mutationFn: () => api.post(`/places/${id}/checkin`),
    onSuccess: () => {
      setCheckedIn(true);
      Alert.alert('✅ Checked In!', `You're now checked in at ${place?.name}`);
    },
  });

  const place = placeData;
  const nearbyUsers = nearbyData?.slice(0, 5) || [];

  if (isLoading || !place) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loading}>
          <Text style={{ color: colors.subtext }}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const typeEmoji = { club: '🎵', bar: '🍻', lounge: '🛋️', rooftop: '🌙', restaurant: '🍽️' }[place.type] || '📍';

  return (
    <View style={styles.container}>
      {/* Photo Header */}
      <View style={styles.photoHeader}>
        {place.photos[0] ? (
          <Image source={{ uri: place.photos[0] }} style={StyleSheet.absoluteFillObject} contentFit="cover" />
        ) : (
          <LinearGradient colors={[colors.primary, colors.card]} style={StyleSheet.absoluteFillObject} />
        )}
        <LinearGradient colors={['rgba(0,0,0,0.5)', 'transparent', 'rgba(0,0,0,0.8)']} style={StyleSheet.absoluteFillObject} />

        {/* Back Button */}
        <SafeAreaView style={styles.headerOverlay}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color="#FFF" />
          </TouchableOpacity>
          {place.isHappening && (
            <View style={styles.happeningBadge}>
              <View style={styles.happeningDot} />
              <Text style={styles.happeningText}>HAPPENING NOW</Text>
            </View>
          )}
        </SafeAreaView>

        {/* Place Name Overlay */}
        <View style={styles.nameOverlay}>
          <Text style={styles.placeEmoji}>{typeEmoji}</Text>
          <Text style={styles.placeName}>{place.name}</Text>
          <Text style={styles.placeAddr}>{place.address}</Text>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Scores */}
        <Animated.View entering={FadeInDown.delay(100)}>
          <GlassCard style={styles.scoresCard}>
            <View style={styles.scoresRow}>
              <VibeGauge score={place.vibeScore} label="⚡ Vibe Score" />
              <View style={styles.scoreDivider} />
              <VibeGauge score={place.crowdScore} label="👥 Crowd Level" />
            </View>
            <View style={styles.activeUsersRow}>
              <Ionicons name="people" size={16} color={colors.accent} />
              <Text style={styles.activeUsersText}>{place.activeUsers} VYBEONers here right now</Text>
            </View>
          </GlassCard>
        </Animated.View>

        {/* Distance + Type */}
        <Animated.View entering={FadeInDown.delay(150)}>
          <GlassCard style={styles.infoCard}>
            <View style={styles.infoRow}>
              <View style={styles.infoItem}>
                <Ionicons name="navigate-outline" size={16} color={colors.subtext} />
                <Text style={styles.infoText}>{place.distance}</Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.typeChip}>{place.type.toUpperCase()}</Text>
              </View>
            </View>
            {place.description && <Text style={styles.description}>{place.description}</Text>}
            {place.tags?.length > 0 && (
              <View style={styles.tagsRow}>
                {place.tags.map(tag => (
                  <View key={tag} style={styles.tag}>
                    <Text style={styles.tagText}>{tag}</Text>
                  </View>
                ))}
              </View>
            )}
          </GlassCard>
        </Animated.View>

        {/* VYBEONers Here */}
        {nearbyUsers.length > 0 && (
          <Animated.View entering={FadeInDown.delay(200)}>
            <GlassCard style={styles.usersCard}>
              <Text style={styles.usersTitle}>VYBEONers Nearby 🎉</Text>
              <View style={styles.avatarsRow}>
                {nearbyUsers.map(u => (
                  <TouchableOpacity key={u.id} onPress={() => router.push(`/(app)/user/${u.id}`)}>
                    <Avatar uri={u.photos[0]} name={u.name} size="sm" showOnline isOnline={u.isOnline} />
                  </TouchableOpacity>
                ))}
                {place.activeUsers > 5 && (
                  <View style={styles.moreAvatars}>
                    <Text style={styles.moreText}>+{place.activeUsers - 5}</Text>
                  </View>
                )}
              </View>
            </GlassCard>
          </Animated.View>
        )}

        {/* Address / Map Placeholder */}
        <Animated.View entering={FadeInDown.delay(250)}>
          <GlassCard style={styles.mapCard}>
            <View style={styles.mapPlaceholder}>
              <Ionicons name="map-outline" size={32} color={colors.primary} />
              {/* TODO: Replace with actual react-native-maps MapView */}
              <Text style={styles.mapPlaceholderText}>{place.address}</Text>
              <Text style={styles.mapNote}>Map view coming soon</Text>
            </View>
          </GlassCard>
        </Animated.View>

        {/* Check-in Button */}
        <View style={styles.checkInWrapper}>
          <Button
            title={checkedIn ? '✅ Checked In!' : `Check In at ${place.name}`}
            onPress={() => !checkedIn && checkinMutation.mutate()}
            loading={checkinMutation.isPending}
            disabled={checkedIn}
          />
          <TouchableOpacity onPress={() => router.push('/(app)/modes/club-mates')} style={styles.findMatesBtn}>
            <Ionicons name="people-outline" size={16} color={colors.accent} />
            <Text style={styles.findMatesText}>Find Club Mates Here</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  photoHeader: { height: SCREEN_HEIGHT * 0.38, position: 'relative' },
  headerOverlay: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 8 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' },
  happeningBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  happeningDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.danger },
  happeningText: { color: '#FFF', fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  nameOverlay: { position: 'absolute', bottom: 16, left: 16, right: 16 },
  placeEmoji: { fontSize: 28, marginBottom: 4 },
  placeName: { color: '#FFF', fontSize: 26, fontWeight: '800' },
  placeAddr: { color: 'rgba(255,255,255,0.7)', fontSize: 13, marginTop: 2 },
  content: { flex: 1 },
  scoresCard: { marginHorizontal: 16, marginTop: 16, marginBottom: 10 },
  scoresRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  scoreDivider: { width: 1, height: 60, backgroundColor: colors.border },
  activeUsersRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border },
  activeUsersText: { color: colors.accent, fontSize: 13, fontWeight: '600' },
  infoCard: { marginHorizontal: 16, marginBottom: 10, gap: 10 },
  infoRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  infoItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  infoText: { color: colors.subtext, fontSize: 13 },
  typeChip: { color: colors.primary, fontSize: 11, fontWeight: '700', backgroundColor: `${colors.primary}22`, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  description: { color: colors.subtext, fontSize: 14, lineHeight: 22 },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tag: { backgroundColor: colors.surface, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: colors.border },
  tagText: { color: colors.subtext, fontSize: 12 },
  usersCard: { marginHorizontal: 16, marginBottom: 10 },
  usersTitle: { color: colors.text, fontSize: 15, fontWeight: '700', marginBottom: 10 },
  avatarsRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  moreAvatars: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  moreText: { color: colors.subtext, fontSize: 11, fontWeight: '700' },
  mapCard: { marginHorizontal: 16, marginBottom: 10 },
  mapPlaceholder: { height: 120, alignItems: 'center', justifyContent: 'center', gap: 6 },
  mapPlaceholderText: { color: colors.text, fontSize: 13, textAlign: 'center' },
  mapNote: { color: colors.subtext, fontSize: 11 },
  checkInWrapper: { paddingHorizontal: 16, gap: 12, marginTop: 4 },
  findMatesBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  findMatesText: { color: colors.accent, fontSize: 14, fontWeight: '600' },
});
