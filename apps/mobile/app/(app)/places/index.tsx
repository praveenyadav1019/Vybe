import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, ScrollView, StyleSheet,
  Dimensions, RefreshControl, ActivityIndicator, StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useFocusEffect } from '@react-navigation/native';
import Animated, {
  FadeInDown, useSharedValue, useAnimatedStyle,
  withRepeat, withSequence, withTiming,
} from 'react-native-reanimated';
import { useVenueStore, Venue } from '@/stores/venueStore';
import { useLocationStore } from '@/stores/locationStore';
import { light } from '@/theme/lightColors';

const { width: W } = Dimensions.get('window');

// ─── Helpers ──────────────────────────────────────────────────────────────────

function vibeColor(score: number): string {
  if (score >= 90) return light.vibe.fire;
  if (score >= 75) return light.vibe.hype;
  if (score >= 60) return light.vibe.vibe;
  if (score >= 45) return light.vibe.active;
  if (score >= 30) return light.vibe.chill;
  return light.vibe.quiet;
}

function vibeLabel(score: number): string {
  if (score >= 90) return '🔥 Fire';
  if (score >= 75) return '🎉 Hype';
  if (score >= 60) return '😎 Vibe';
  if (score >= 45) return '✨ Active';
  if (score >= 30) return '👌 Chill';
  return '😐 Quiet';
}

// ─── Live Dot (separate component — no hooks in map) ─────────────────────────

function LiveDot() {
  const scale = useSharedValue(1);

  useEffect(() => {
    scale.value = withRepeat(
      withSequence(withTiming(1.5, { duration: 600 }), withTiming(1, { duration: 600 })),
      -1,
    );
  }, []);

  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View style={[liveStyles.dot, style]} />
  );
}

const liveStyles = StyleSheet.create({
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: light.danger },
});

// ─── Filter chips ─────────────────────────────────────────────────────────────

type Filter = 'All' | 'Clubs' | 'Bars' | 'Restaurants' | 'Lounges';
const FILTERS: Filter[] = ['All', 'Clubs', 'Bars', 'Restaurants', 'Lounges'];
const FILTER_CATS: Record<Filter, string | null> = {
  All: null, Clubs: 'nightclub', Bars: 'bar', Restaurants: 'restaurant', Lounges: 'lounge',
};

// ─── Featured Card ────────────────────────────────────────────────────────────

function FeaturedCard({ venue, onPress }: { venue: Venue; onPress: () => void }) {
  const color = vibeColor(venue.vibeScore);
  const label = vibeLabel(venue.vibeScore);
  const photo = venue.photos?.[0];

  return (
    <TouchableOpacity onPress={onPress} style={featStyles.wrap} activeOpacity={0.9}>
      <View style={featStyles.inner}>
        {photo ? (
          <Image source={{ uri: photo }} style={StyleSheet.absoluteFillObject} contentFit="cover" />
        ) : (
          <LinearGradient colors={[light.primary + '44', light.pink + '22']} style={StyleSheet.absoluteFillObject} />
        )}
        <LinearGradient
          colors={['transparent', 'rgba(10,10,26,0.85)']}
          style={StyleSheet.absoluteFillObject}
          locations={[0.35, 1]}
        />

        {venue.isHappening && (
          <View style={featStyles.liveBadge}>
            <LiveDot />
            <Text style={featStyles.liveText}>LIVE</Text>
          </View>
        )}
        {venue.trending && (
          <View style={featStyles.trendBadge}>
            <Text style={featStyles.trendText}>📈 Trending</Text>
          </View>
        )}

        <View style={featStyles.bottom}>
          <View style={featStyles.titleRow}>
            <Text style={featStyles.name} numberOfLines={1}>{venue.name}</Text>
            <View style={[featStyles.vibeChip, { backgroundColor: color + '22', borderColor: color + '55' }]}>
              <Text style={[featStyles.vibeChipText, { color }]}>{label}</Text>
            </View>
          </View>
          <View style={featStyles.metaRow}>
            <Ionicons name="location-outline" size={12} color="rgba(255,255,255,0.7)" />
            <Text style={featStyles.meta}>{venue.distance}</Text>
            <Text style={featStyles.sep}>·</Text>
            <Ionicons name="people-outline" size={12} color="rgba(255,255,255,0.7)" />
            <Text style={featStyles.meta}>{venue.activeUsers} here</Text>
          </View>
          <View style={featStyles.barTrack}>
            <View style={[featStyles.barFill, { width: `${venue.vibeScore}%` as any, backgroundColor: color }]} />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const featStyles = StyleSheet.create({
  wrap: { marginHorizontal: 16, borderRadius: 24, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 8, marginBottom: 20 },
  inner: { height: 220, borderRadius: 24, overflow: 'hidden', backgroundColor: light.surface },
  liveBadge: { position: 'absolute', top: 14, left: 14, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(239,68,68,0.18)', borderWidth: 1, borderColor: light.danger + '66', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 },
  liveText: { color: light.danger, fontSize: 10, fontWeight: '800', letterSpacing: 1.2 },
  trendBadge: { position: 'absolute', top: 14, right: 14, backgroundColor: 'rgba(245,158,11,0.2)', borderWidth: 1, borderColor: light.amber + '55', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 },
  trendText: { color: light.amber, fontSize: 10, fontWeight: '700' },
  bottom: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, gap: 6 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { color: '#FFF', fontSize: 20, fontWeight: '800', flex: 1, letterSpacing: -0.3 },
  vibeChip: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  vibeChipText: { fontSize: 11, fontWeight: '700' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  meta: { color: 'rgba(255,255,255,0.75)', fontSize: 12 },
  sep: { color: 'rgba(255,255,255,0.4)', fontSize: 12 },
  barTrack: { height: 3, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 2, overflow: 'hidden' },
  barFill: { height: 3, borderRadius: 2 },
});

// ─── Venue Row Card ───────────────────────────────────────────────────────────

function VenueCard({ venue, onPress }: { venue: Venue; onPress: () => void }) {
  const color = vibeColor(venue.vibeScore);
  const label = vibeLabel(venue.vibeScore);
  const photo = venue.photos?.[0];

  return (
    <TouchableOpacity onPress={onPress} style={vcStyles.wrap} activeOpacity={0.85}>
      <View style={vcStyles.photoWrap}>
        {photo ? (
          <Image source={{ uri: photo }} style={vcStyles.photo} contentFit="cover" />
        ) : (
          <LinearGradient colors={[light.primaryLight, light.surface]} style={vcStyles.photo}>
            <Ionicons name="business" size={28} color={light.primary} />
          </LinearGradient>
        )}
        {venue.isHappening && (
          <View style={vcStyles.livePill}>
            <LiveDot />
          </View>
        )}
        {venue.isOpen === false && (
          <View style={vcStyles.closedPill}>
            <Text style={vcStyles.closedText}>Closed</Text>
          </View>
        )}
      </View>

      <View style={vcStyles.info}>
        <View style={vcStyles.topRow}>
          <Text style={vcStyles.name} numberOfLines={1}>{venue.name}</Text>
          {venue.rating != null && (
            <View style={vcStyles.ratingRow}>
              <Ionicons name="star" size={11} color={light.amber} />
              <Text style={vcStyles.ratingText}>{venue.rating.toFixed(1)}</Text>
            </View>
          )}
        </View>
        <Text style={vcStyles.category} numberOfLines={1}>{venue.category}</Text>

        <View style={vcStyles.scoresRow}>
          <View style={[vcStyles.scorePill, { backgroundColor: color + '18' }]}>
            <Text style={[vcStyles.scoreLabel, { color }]}>{label}</Text>
          </View>
          <View style={vcStyles.scoreItem}>
            <Ionicons name="people-outline" size={12} color={light.textTer} />
            <Text style={vcStyles.scoreText}>{venue.activeUsers}</Text>
          </View>
          <View style={vcStyles.scoreItem}>
            <Ionicons name="navigate-outline" size={12} color={light.textTer} />
            <Text style={vcStyles.scoreText}>{venue.distance}</Text>
          </View>
        </View>

        <View style={vcStyles.barTrack}>
          <View style={[vcStyles.barFill, { width: `${venue.vibeScore}%` as any, backgroundColor: color }]} />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 2 }}>
          {venue.tags.slice(0, 4).map((t) => (
            <View key={t} style={vcStyles.tag}>
              <Text style={vcStyles.tagText}>{t}</Text>
            </View>
          ))}
        </ScrollView>
      </View>
    </TouchableOpacity>
  );
}

const vcStyles = StyleSheet.create({
  wrap: { flexDirection: 'row', backgroundColor: light.card, borderRadius: 20, padding: 12, gap: 12, borderWidth: 1, borderColor: light.border, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  photoWrap: { position: 'relative' },
  photo: { width: 82, height: 82, borderRadius: 14, backgroundColor: light.surface, alignItems: 'center', justifyContent: 'center' },
  livePill: { position: 'absolute', top: 6, right: 6, backgroundColor: 'rgba(239,68,68,0.15)', borderRadius: 6, padding: 3, borderWidth: 1, borderColor: light.danger + '55' },
  closedPill: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.55)', borderBottomLeftRadius: 14, borderBottomRightRadius: 14, alignItems: 'center', paddingVertical: 3 },
  closedText: { color: '#FFF', fontSize: 9, fontWeight: '700' },
  info: { flex: 1, gap: 4 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { color: light.text, fontSize: 15, fontWeight: '700', flex: 1 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  ratingText: { color: light.textSec, fontSize: 12, fontWeight: '600' },
  category: { color: light.textTer, fontSize: 12 },
  scoresRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  scorePill: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  scoreLabel: { fontSize: 11, fontWeight: '700' },
  scoreItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  scoreText: { color: light.textTer, fontSize: 12 },
  barTrack: { height: 3, backgroundColor: light.border, borderRadius: 2, overflow: 'hidden' },
  barFill: { height: 3, borderRadius: 2 },
  tag: { backgroundColor: light.surface, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, marginRight: 5, borderWidth: 1, borderColor: light.border },
  tagText: { color: light.textTer, fontSize: 10, fontWeight: '500' },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function PlacesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { happeningVenues, isLoading, fetchHappening } = useVenueStore();
  const lat = useLocationStore((s) => s.latitude);
  const lng = useLocationStore((s) => s.longitude);
  const [filter, setFilter] = useState<Filter>('All');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(() => {
    void fetchHappening(lat ?? undefined, lng ?? undefined);
  }, [lat, lng]);

  useEffect(() => { load(); }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchHappening(lat ?? undefined, lng ?? undefined);
    setRefreshing(false);
  }, [lat, lng]);

  const filtered = React.useMemo(() => {
    const cat = FILTER_CATS[filter];
    if (!cat) return happeningVenues;
    return happeningVenues.filter((v) => v.category?.toLowerCase().includes(cat));
  }, [happeningVenues, filter]);

  const featured = filtered[0];
  const rest = filtered.slice(1);

  return (
    <View style={[ps.root, { backgroundColor: light.bg }]}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={[ps.header, { paddingTop: insets.top + 8 }]}>
        <View>
          <Text style={ps.title}>Happening Now</Text>
          <Text style={ps.sub}>Real vibes · Real people · Right now</Text>
        </View>
        <TouchableOpacity style={ps.iconBtn} onPress={load}>
          <Ionicons name="refresh" size={20} color={light.primary} />
        </TouchableOpacity>
      </View>

      {/* Filters */}
      <ScrollView
        horizontal showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 8, paddingVertical: 10 }}
      >
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f}
            onPress={() => setFilter(f)}
            style={[ps.chip, filter === f && ps.chipActive]}
          >
            <Text style={[ps.chipText, filter === f && ps.chipTextActive]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Content */}
      {isLoading && !refreshing ? (
        <View style={ps.center}>
          <ActivityIndicator color={light.primary} size="large" />
          <Text style={ps.loadText}>Finding hot spots near you...</Text>
        </View>
      ) : (
        <FlatList
          data={rest}
          keyExtractor={(v) => v.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: insets.bottom + 90 }}
          ItemSeparatorComponent={() => <View style={{ height: 10, marginHorizontal: 16 }} />}
          ListHeaderComponent={
            featured ? (
              <Animated.View entering={FadeInDown.delay(60)}>
                <FeaturedCard venue={featured} onPress={() => router.push(`/(app)/places/${featured.id}` as any)} />
              </Animated.View>
            ) : null
          }
          ListEmptyComponent={
            <View style={ps.emptyWrap}>
              <Text style={{ fontSize: 44 }}>🏙️</Text>
              <Text style={ps.emptyTitle}>Nothing happening nearby</Text>
              <Text style={ps.emptySub}>Check back later or expand your radius.</Text>
            </View>
          }
          renderItem={({ item, index }) => (
            <Animated.View entering={FadeInDown.delay(80 + index * 50)} style={{ paddingHorizontal: 16 }}>
              <VenueCard venue={item} onPress={() => router.push(`/(app)/places/${item.id}` as any)} />
            </Animated.View>
          )}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={light.primary} />
          }
        />
      )}
    </View>
  );
}

const ps = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 2 },
  title: { color: light.text, fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
  sub: { color: light.textTer, fontSize: 12, marginTop: 3 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: light.primaryLight, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  chip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: light.surface, borderWidth: 1, borderColor: light.border },
  chipActive: { backgroundColor: light.primary, borderColor: light.primary },
  chipText: { color: light.textSec, fontSize: 13, fontWeight: '600' },
  chipTextActive: { color: '#FFF' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadText: { color: light.textTer, fontSize: 14 },
  emptyWrap: { alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyTitle: { color: light.text, fontSize: 18, fontWeight: '700' },
  emptySub: { color: light.textTer, fontSize: 13, textAlign: 'center', paddingHorizontal: 32 },
});
