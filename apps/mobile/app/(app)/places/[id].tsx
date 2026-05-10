import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Dimensions, Alert, ActivityIndicator, StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { useVenueStore, ClubMateBroadcast } from '@/stores/venueStore';
import { useAuthStore } from '@/stores/authStore';
import { light } from '@/theme/lightColors';

const { width: W, height: H } = Dimensions.get('window');

// ─── Helpers ──────────────────────────────────────────────────────────────────

function vibeColor(score: number) {
  if (score >= 90) return light.vibe.fire;
  if (score >= 75) return light.vibe.hype;
  if (score >= 60) return light.vibe.vibe;
  if (score >= 45) return light.vibe.active;
  if (score >= 30) return light.vibe.chill;
  return light.vibe.quiet;
}

function vibeLabel(score: number) {
  if (score >= 90) return '🔥 Fire';
  if (score >= 75) return '🎉 Hype';
  if (score >= 60) return '😎 Vibe';
  if (score >= 45) return '✨ Active';
  if (score >= 30) return '👌 Chill';
  return '😐 Quiet';
}

// ─── Score Gauge ──────────────────────────────────────────────────────────────

function ScoreGauge({ label, value, max = 100 }: { label: string; value: number; max?: number }) {
  const pct = Math.min((value / max) * 100, 100);
  const color = vibeColor(value);
  return (
    <View style={gauge.wrap}>
      <Text style={gauge.label}>{label}</Text>
      <View style={gauge.track}>
        <View style={[gauge.fill, { width: `${pct}%` as any, backgroundColor: color }]} />
      </View>
      <Text style={[gauge.value, { color }]}>{value}</Text>
    </View>
  );
}

const gauge = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', gap: 6 },
  label: { color: light.textTer, fontSize: 11, fontWeight: '600', textAlign: 'center' },
  track: { width: '100%', height: 6, borderRadius: 3, backgroundColor: light.border },
  fill: { height: '100%', borderRadius: 3 },
  value: { fontSize: 20, fontWeight: '800' },
});

// ─── Club Mate Card ───────────────────────────────────────────────────────────

function ClubMateCard({
  broadcast,
  onJoin,
  isJoining,
}: {
  broadcast: ClubMateBroadcast;
  onJoin: () => void;
  isJoining: boolean;
}) {
  const typeLabels: Record<ClubMateBroadcast['type'], string> = {
    female: '👩 Female', male: '👨 Male', couple: '💑 Couple',
    group: '👥 Group', any: '🌍 Anyone',
  };

  return (
    <View style={cmCard.wrap}>
      <View style={cmCard.av}>
        {broadcast.fromUser.photoUrl ? (
          <Image source={{ uri: broadcast.fromUser.photoUrl }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
        ) : (
          <Text style={{ color: light.primary, fontWeight: '700', fontSize: 16 }}>
            {broadcast.fromUser.name.charAt(0)}
          </Text>
        )}
      </View>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={cmCard.name}>{broadcast.fromUser.name}, {broadcast.fromUser.age}</Text>
          {broadcast.fromUser.verified && (
            <Ionicons name="checkmark-circle" size={14} color={light.primary} />
          )}
        </View>
        <Text style={cmCard.type}>{typeLabels[broadcast.type]}</Text>
        {broadcast.message ? <Text style={cmCard.msg} numberOfLines={2}>{broadcast.message}</Text> : null}
        {broadcast.goingAt ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
            <Ionicons name="time-outline" size={11} color={light.textTer} />
            <Text style={cmCard.time}>Going at {broadcast.goingAt}</Text>
          </View>
        ) : null}
      </View>
      <TouchableOpacity
        onPress={onJoin}
        style={[cmCard.joinBtn, isJoining && { opacity: 0.6 }]}
        disabled={isJoining}
      >
        {isJoining ? (
          <ActivityIndicator size="small" color="#FFF" />
        ) : (
          <Text style={cmCard.joinText}>Join</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const cmCard = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: light.border },
  av: { width: 46, height: 46, borderRadius: 23, backgroundColor: light.primaryLight, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  name: { color: light.text, fontSize: 14, fontWeight: '700' },
  type: { color: light.textTer, fontSize: 12, marginTop: 1 },
  msg: { color: light.textSec, fontSize: 12, marginTop: 2 },
  time: { color: light.textTer, fontSize: 11 },
  joinBtn: { backgroundColor: light.primary, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8 },
  joinText: { color: '#FFF', fontSize: 13, fontWeight: '700' },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function VenueDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const {
    selectedVenue, clubMatesBroadcasts, checkedInVenueId,
    fetchVenueDetail, checkIn, checkOut, fetchClubMates, joinClubMate,
  } = useVenueStore();

  const [loading, setLoading] = useState(true);
  const [checkingIn, setCheckingIn] = useState(false);
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [photoIndex, setPhotoIndex] = useState(0);

  const venue = selectedVenue?.id === id ? selectedVenue : null;
  const isCheckedIn = checkedInVenueId === id;

  useEffect(() => {
    async function load() {
      setLoading(true);
      await fetchVenueDetail(id);
      await fetchClubMates(id);
      setLoading(false);
    }
    void load();
  }, [id]);

  const handleCheckIn = useCallback(async () => {
    if (isCheckedIn) {
      Alert.alert(
        'Check Out?',
        `Leave ${venue?.name}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Check Out', style: 'destructive', onPress: async () => {
            await checkOut(id);
          }},
        ]
      );
      return;
    }
    setCheckingIn(true);
    const ok = await checkIn(id);
    setCheckingIn(false);
    if (ok) Alert.alert('Checked in! 🎉', `You're at ${venue?.name}`);
  }, [isCheckedIn, id, venue?.name]);

  const handleJoin = useCallback(async (broadcastId: string) => {
    setJoiningId(broadcastId);
    const ok = await joinClubMate(broadcastId);
    setJoiningId(null);
    if (ok) Alert.alert('Request sent!', 'They\'ll get a notification.');
  }, []);

  if (loading || !venue) {
    return (
      <View style={[s.root, { justifyContent: 'center', alignItems: 'center' }]}>
        <StatusBar barStyle="light-content" />
        <ActivityIndicator color={light.primary} size="large" />
      </View>
    );
  }

  const color = vibeColor(venue.vibeScore);
  const label = vibeLabel(venue.vibeScore);
  const photo = venue.photos?.[photoIndex];

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" />

      {/* Hero */}
      <View style={s.hero}>
        {photo ? (
          <Image source={{ uri: photo }} style={StyleSheet.absoluteFillObject} contentFit="cover" />
        ) : (
          <LinearGradient colors={[light.primary, light.pink]} style={StyleSheet.absoluteFillObject} />
        )}
        <LinearGradient
          colors={['rgba(0,0,0,0.55)', 'transparent', 'rgba(0,0,0,0.72)']}
          style={StyleSheet.absoluteFillObject}
          locations={[0, 0.4, 1]}
        />

        {/* Back + Live badge */}
        <View style={[s.heroTop, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <Ionicons name="arrow-back" size={22} color="#FFF" />
          </TouchableOpacity>
          {venue.isHappening && (
            <View style={s.liveBadge}>
              <View style={s.liveDot} />
              <Text style={s.liveText}>LIVE NOW</Text>
            </View>
          )}
        </View>

        {/* Photo dots */}
        {venue.photos.length > 1 && (
          <View style={s.photoDots}>
            {venue.photos.slice(0, 5).map((_, i) => (
              <TouchableOpacity key={i} onPress={() => setPhotoIndex(i)}>
                <View style={[s.photoDot, i === photoIndex && s.photoDotActive]} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Name overlay */}
        <View style={s.heroBottom}>
          <Text style={s.venueName}>{venue.name}</Text>
          <Text style={s.venueCategory}>{venue.category}</Text>
          <View style={s.heroMeta}>
            <View style={s.heroBadge}>
              <Text style={[s.heroBadgeText, { color }]}>{label}</Text>
            </View>
            {venue.rating != null && (
              <View style={s.ratingRow}>
                <Ionicons name="star" size={13} color={light.amber} />
                <Text style={s.ratingText}>{venue.rating.toFixed(1)}</Text>
              </View>
            )}
            <Text style={s.heroMetaText}>
              <Ionicons name="location-outline" size={12} color="rgba(255,255,255,0.7)" /> {venue.distance}
            </Text>
          </View>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1, backgroundColor: light.bg }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
      >
        {/* Score cards */}
        <Animated.View entering={FadeInDown.delay(60)} style={s.scoreCard}>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <ScoreGauge label="⚡ Vibe Score" value={venue.vibeScore} />
            <View style={{ width: 1, backgroundColor: light.border }} />
            <ScoreGauge label="👥 Crowd" value={venue.crowdScore} />
          </View>
          <View style={s.activeRow}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: light.success }} />
            <Text style={s.activeText}>{venue.activeUsers} people here right now</Text>
          </View>
        </Animated.View>

        {/* Check In button */}
        <Animated.View entering={FadeInDown.delay(100)} style={{ paddingHorizontal: 16, marginBottom: 12 }}>
          <TouchableOpacity
            onPress={handleCheckIn}
            style={[s.checkInBtn, isCheckedIn && { backgroundColor: light.success }]}
            disabled={checkingIn}
          >
            {checkingIn ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <>
                <Ionicons name={isCheckedIn ? 'checkmark-circle' : 'location'} size={18} color="#FFF" />
                <Text style={s.checkInText}>
                  {isCheckedIn ? 'Checked In — Tap to Leave' : `Check In at ${venue.name}`}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </Animated.View>

        {/* Venue info */}
        {(venue.description || venue.tags.length > 0 || venue.address) ? (
          <Animated.View entering={FadeInDown.delay(130)} style={s.infoCard}>
            {venue.address ? (
              <View style={s.addressRow}>
                <Ionicons name="location-outline" size={15} color={light.textTer} />
                <Text style={s.addressText}>{venue.address}</Text>
              </View>
            ) : null}
            {venue.description ? (
              <Text style={s.descText}>{venue.description}</Text>
            ) : null}
            {venue.tags.length > 0 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 4 }}>
                {venue.tags.map((t) => (
                  <View key={t} style={s.tag}>
                    <Text style={s.tagText}>{t}</Text>
                  </View>
                ))}
              </ScrollView>
            ) : null}
            {venue.peakTime ? (
              <View style={s.peakRow}>
                <Ionicons name="time-outline" size={14} color={light.amber} />
                <Text style={s.peakText}>Peak time: {venue.peakTime}</Text>
              </View>
            ) : null}
          </Animated.View>
        ) : null}

        {/* Club Mates section */}
        <Animated.View entering={FadeInDown.delay(160)} style={s.sectionCard}>
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>Club Mates</Text>
            <Text style={s.sectionSub}>{clubMatesBroadcasts.length} looking to connect</Text>
          </View>

          {clubMatesBroadcasts.length === 0 ? (
            <View style={s.emptyMates}>
              <Text style={{ fontSize: 32 }}>🎉</Text>
              <Text style={s.emptyMatesText}>Be the first to broadcast here!</Text>
              <TouchableOpacity
                style={s.broadcastBtn}
                onPress={() => router.push('/(app)/modes/club-mates' as any)}
              >
                <Ionicons name="radio-outline" size={16} color={light.primary} />
                <Text style={s.broadcastBtnText}>Broadcast Yourself</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {clubMatesBroadcasts.map((b) => (
                <ClubMateCard
                  key={b.id}
                  broadcast={b}
                  onJoin={() => handleJoin(b.id)}
                  isJoining={joiningId === b.id}
                />
              ))}
              <TouchableOpacity
                style={[s.broadcastBtn, { alignSelf: 'flex-start', marginTop: 12 }]}
                onPress={() => router.push('/(app)/modes/club-mates' as any)}
              >
                <Ionicons name="add-circle-outline" size={16} color={light.primary} />
                <Text style={s.broadcastBtnText}>Add My Broadcast</Text>
              </TouchableOpacity>
            </>
          )}
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: light.bg },
  hero: { height: H * 0.38, position: 'relative' },
  heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' },
  liveBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(239,68,68,0.2)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.5)', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 },
  liveDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: light.danger },
  liveText: { color: light.danger, fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  photoDots: { position: 'absolute', top: 10, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 5 },
  photoDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.4)' },
  photoDotActive: { backgroundColor: '#FFF', width: 16 },
  heroBottom: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 18, gap: 4 },
  venueName: { color: '#FFF', fontSize: 24, fontWeight: '800', letterSpacing: -0.4 },
  venueCategory: { color: 'rgba(255,255,255,0.7)', fontSize: 13 },
  heroMeta: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 },
  heroBadge: { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 8, paddingHorizontal: 9, paddingVertical: 4 },
  heroBadgeText: { fontSize: 12, fontWeight: '700' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  ratingText: { color: '#FFF', fontSize: 13, fontWeight: '600' },
  heroMetaText: { color: 'rgba(255,255,255,0.75)', fontSize: 12 },

  scoreCard: { margin: 16, backgroundColor: light.card, borderRadius: 20, padding: 16, gap: 12, borderWidth: 1, borderColor: light.border, shadowColor: '#000', shadowOpacity: 0.07, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 3 },
  activeRow: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingTop: 10, borderTopWidth: 1, borderTopColor: light.border },
  activeText: { color: light.success, fontSize: 13, fontWeight: '600' },

  checkInBtn: { backgroundColor: light.primary, borderRadius: 16, paddingVertical: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, shadowColor: light.primary, shadowOpacity: 0.35, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 5 },
  checkInText: { color: '#FFF', fontSize: 16, fontWeight: '700' },

  infoCard: { marginHorizontal: 16, backgroundColor: light.card, borderRadius: 20, padding: 16, gap: 8, borderWidth: 1, borderColor: light.border, marginBottom: 12 },
  addressRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  addressText: { color: light.textSec, fontSize: 13, flex: 1 },
  descText: { color: light.textSec, fontSize: 14, lineHeight: 22 },
  tag: { backgroundColor: light.surface, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, marginRight: 6, borderWidth: 1, borderColor: light.border },
  tagText: { color: light.textTer, fontSize: 12 },
  peakRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  peakText: { color: light.amber, fontSize: 13, fontWeight: '600' },

  sectionCard: { marginHorizontal: 16, backgroundColor: light.card, borderRadius: 20, padding: 16, borderWidth: 1, borderColor: light.border, marginBottom: 12 },
  sectionHeader: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 4 },
  sectionTitle: { color: light.text, fontSize: 17, fontWeight: '800' },
  sectionSub: { color: light.textTer, fontSize: 12 },
  emptyMates: { alignItems: 'center', gap: 8, paddingVertical: 20 },
  emptyMatesText: { color: light.textTer, fontSize: 14 },
  broadcastBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: light.primaryLight, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 9 },
  broadcastBtnText: { color: light.primary, fontSize: 13, fontWeight: '700' },
});
