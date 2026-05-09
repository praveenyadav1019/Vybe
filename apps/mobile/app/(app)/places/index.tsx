import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Dimensions,
  Animated,
  RefreshControl,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { api } from '@/lib/api';
import { colors } from '@/theme/colors';
import type { Place, PlaceType } from '@/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─── Vibe score color ─────────────────────────────────────────────────────────
function vibeColor(score: number): string {
  if (score >= 8) return colors.success;
  if (score >= 7) return '#EAB308';
  if (score >= 5) return '#F97316';
  return colors.danger;
}

// ─── Pulsing dot ─────────────────────────────────────────────────────────────
function PulsingDot({ color = colors.danger }: { color?: string }) {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    const anim = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(scale, { toValue: 1.6, duration: 700, useNativeDriver: true }),
          Animated.timing(scale, { toValue: 1, duration: 700, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(opacity, { toValue: 0.3, duration: 700, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        ]),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [scale, opacity]);

  return (
    <View style={{ width: 10, height: 10 }}>
      <Animated.View
        style={{
          width: 10,
          height: 10,
          borderRadius: 5,
          backgroundColor: color,
          transform: [{ scale }],
          opacity,
        }}
      />
    </View>
  );
}

// ─── Vibe Score Bar ───────────────────────────────────────────────────────────
function VibeBar({ score }: { score: number }) {
  const pct = (score / 10) * 100;
  const color = vibeColor(score);
  return (
    <View style={styles.vibeBarTrack}>
      <View
        style={[
          styles.vibeBarFill,
          { width: `${pct}%` as any, backgroundColor: color },
        ]}
      />
    </View>
  );
}

// ─── Filter Chips ─────────────────────────────────────────────────────────────
type FilterType = 'All' | 'Clubs' | 'Bars' | 'Lounges' | 'Rooftops';
const FILTERS: FilterType[] = ['All', 'Clubs', 'Bars', 'Lounges', 'Rooftops'];
const filterToType: Record<FilterType, PlaceType | null> = {
  All: null,
  Clubs: 'club',
  Bars: 'bar',
  Lounges: 'lounge',
  Rooftops: 'rooftop',
};

function FilterChips({
  active,
  onChange,
}: {
  active: FilterType;
  onChange: (f: FilterType) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.filtersRow}
    >
      {FILTERS.map((f) => {
        const isActive = f === active;
        return (
          <Pressable
            key={f}
            onPress={() => onChange(f)}
            style={[styles.filterChip, isActive && styles.filterChipActive]}
          >
            <Text
              style={[styles.filterChipText, isActive && styles.filterChipTextActive]}
            >
              {f}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

// ─── Featured Card ────────────────────────────────────────────────────────────
function FeaturedCard({
  place,
  onPress,
}: {
  place: Place;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.featuredCard}>
      <LinearGradient
        colors={['rgba(124,58,237,0.3)', 'rgba(0,0,0,0.85)']}
        style={styles.featuredGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      >
        {/* Happening badge */}
        {place.isHappening && (
          <View style={styles.happeningBadge}>
            <PulsingDot color={colors.danger} />
            <Text style={styles.happeningText}>HAPPENING NOW</Text>
          </View>
        )}

        <View style={styles.featuredBottom}>
          <View style={styles.featuredTitleRow}>
            <Text style={styles.featuredName}>{place.name}</Text>
            <View
              style={[
                styles.typeBadge,
                { borderColor: vibeColor(place.vibeScore) },
              ]}
            >
              <Text
                style={[styles.typeBadgeText, { color: vibeColor(place.vibeScore) }]}
              >
                {place.type.toUpperCase()}
              </Text>
            </View>
          </View>

          <View style={styles.featuredMeta}>
            <View style={styles.vibeScoreRow}>
              <Text style={styles.vibeLabel}>⚡</Text>
              <Text
                style={[
                  styles.vibeScoreText,
                  { color: vibeColor(place.vibeScore) },
                ]}
              >
                {place.vibeScore.toFixed(1)}/10
              </Text>
            </View>
            <View style={styles.dot} />
            <Ionicons name="people" size={13} color={colors.subtext} />
            <Text style={styles.featuredMetaText}>
              {place.activeUsers} vibing
            </Text>
            <View style={styles.dot} />
            <Ionicons name="location-outline" size={13} color={colors.subtext} />
            <Text style={styles.featuredMetaText}>{place.distance}</Text>
          </View>

          <VibeBar score={place.vibeScore} />
        </View>
      </LinearGradient>
    </Pressable>
  );
}

// ─── Place Row Card ───────────────────────────────────────────────────────────
function PlaceCard({
  place,
  index,
  onPress,
}: {
  place: Place;
  index: number;
  onPress: () => void;
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () =>
    Animated.spring(scaleAnim, { toValue: 0.97, useNativeDriver: true, tension: 150, friction: 8 }).start();
  const handlePressOut = () =>
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 150, friction: 8 }).start();

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={styles.placeCard}
      >
        {/* Left: image placeholder */}
        <View style={styles.placeImageWrap}>
          <LinearGradient
            colors={['#2A1050', '#1A0533']}
            style={styles.placeImagePlaceholder}
          >
            <Ionicons name="business" size={28} color={colors.primary} />
          </LinearGradient>
          {place.isHappening && (
            <View style={styles.placeHappeningDot}>
              <PulsingDot color={colors.danger} />
            </View>
          )}
        </View>

        {/* Right: info */}
        <View style={styles.placeInfo}>
          <View style={styles.placeTopRow}>
            <Text style={styles.placeName} numberOfLines={1}>
              {place.name}
            </Text>
            <View
              style={[
                styles.typeSmallBadge,
                { backgroundColor: `${vibeColor(place.vibeScore)}20` },
              ]}
            >
              <Text
                style={[
                  styles.typeSmallBadgeText,
                  { color: vibeColor(place.vibeScore) },
                ]}
              >
                {place.type}
              </Text>
            </View>
          </View>

          <View style={styles.placeScoresRow}>
            <View style={styles.scoreItem}>
              <Text style={styles.scoreIcon}>⚡</Text>
              <Text
                style={[styles.scoreValue, { color: vibeColor(place.vibeScore) }]}
              >
                {place.vibeScore.toFixed(1)}
              </Text>
              <Text style={styles.scoreMax}>/10</Text>
            </View>
            <View style={styles.scoreDivider} />
            <View style={styles.scoreItem}>
              <Text style={styles.scoreIcon}>👥</Text>
              <Text style={styles.scoreValue}>{place.crowdScore.toFixed(1)}</Text>
              <Text style={styles.scoreMax}>/10</Text>
            </View>
            <View style={styles.scoreDivider} />
            <View style={styles.scoreItem}>
              <Ionicons name="people-outline" size={12} color={colors.subtext} />
              <Text style={styles.scoreValue}>{place.activeUsers}</Text>
              <Text style={styles.scoreMax}> here</Text>
            </View>
          </View>

          <VibeBar score={place.vibeScore} />

          <View style={styles.placeBottomRow}>
            <View style={styles.distanceRow}>
              <Ionicons name="navigate-outline" size={11} color={colors.subtext} />
              <Text style={styles.distanceText}>{place.distance}</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {place.tags.slice(0, 3).map((tag) => (
                <View key={tag} style={styles.tag}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────
function EmptyState() {
  return (
    <View style={styles.emptyWrap}>
      <Text style={styles.emptyIcon}>🏙️</Text>
      <Text style={styles.emptyTitle}>Nothing happening nearby</Text>
      <Text style={styles.emptySub}>
        Check back later or expand your search radius.
      </Text>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function PlacesScreen() {
  const router = useRouter();
  const [activeFilter, setActiveFilter] = useState<FilterType>('All');
  const [refreshing, setRefreshing] = useState(false);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['places/happening'],
    queryFn: async () => {
      const res = await api.get<{ places: Place[] }>('/places/happening');
      return res.data;
    },
    staleTime: 60_000,
  });

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const places = data?.places ?? [];

  const filtered = React.useMemo(() => {
    const typeFilter = filterToType[activeFilter];
    if (!typeFilter) return places;
    return places.filter((p) => p.type === typeFilter);
  }, [places, activeFilter]);

  const featured = filtered[0];
  const rest = filtered.slice(1);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Happening Now 🔥</Text>
          <Text style={styles.headerSub}>Real vibes. Real people. Right now.</Text>
        </View>
        <Pressable style={styles.locationBtn}>
          <Ionicons name="location" size={20} color={colors.accent} />
        </Pressable>
      </View>

      {/* Filter chips */}
      <FilterChips active={activeFilter} onChange={setActiveFilter} />

      {/* Content */}
      {isLoading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Finding hot spots...</Text>
        </View>
      ) : isError ? (
        <View style={styles.errorWrap}>
          <Ionicons name="wifi-outline" size={40} color={colors.subtext} />
          <Text style={styles.errorText}>Couldn't load places</Text>
          <Pressable onPress={() => refetch()} style={styles.retryBtn}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={rest}
          keyExtractor={(p) => p.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            featured ? (
              <View style={{ marginBottom: 20 }}>
                <FeaturedCard
                  place={featured}
                  onPress={() =>
                    router.push(`/(app)/places/${featured.id}`)
                  }
                />
              </View>
            ) : null
          }
          ListEmptyComponent={
            filtered.length === 0 ? <EmptyState /> : null
          }
          ItemSeparatorComponent={() => <View style={styles.itemSeparator} />}
          renderItem={({ item, index }) => (
            <PlaceCard
              place={item}
              index={index}
              onPress={() => router.push(`/(app)/places/${item.id}`)}
            />
          )}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.5,
  },
  headerSub: {
    fontSize: 12,
    color: colors.subtext,
    marginTop: 2,
  },
  locationBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: 2,
  },

  // Filters
  filtersRow: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    shadowColor: colors.primary,
    shadowOpacity: 0.4,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  filterChipText: {
    color: colors.subtext,
    fontSize: 13,
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: colors.text,
  },

  // List
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  itemSeparator: {
    height: 12,
  },

  // Featured card
  featuredCard: {
    height: 220,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  featuredGradient: {
    flex: 1,
    justifyContent: 'space-between',
    padding: 16,
  },
  happeningBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(239,68,68,0.2)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: colors.danger,
  },
  happeningText: {
    color: colors.danger,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  featuredBottom: {
    gap: 8,
  },
  featuredTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  featuredName: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
    flex: 1,
  },
  typeBadge: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  featuredMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  vibeLabel: {
    fontSize: 12,
  },
  vibeScoreText: {
    fontSize: 13,
    fontWeight: '700',
  },
  featuredMetaText: {
    fontSize: 12,
    color: colors.subtext,
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: colors.subtext,
  },

  // Vibe bar
  vibeBarTrack: {
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  vibeBarFill: {
    height: 4,
    borderRadius: 2,
  },

  // Place card
  placeCard: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 14,
  },
  placeImageWrap: {
    position: 'relative',
  },
  placeImagePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeHappeningDot: {
    position: 'absolute',
    top: 4,
    right: 4,
  },
  placeInfo: {
    flex: 1,
    gap: 6,
  },
  placeTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  placeName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
  },
  typeSmallBadge: {
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  typeSmallBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  placeScoresRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  scoreItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  scoreIcon: {
    fontSize: 11,
  },
  scoreValue: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
  },
  scoreMax: {
    fontSize: 10,
    color: colors.subtext,
  },
  scoreDivider: {
    width: 1,
    height: 12,
    backgroundColor: colors.border,
  },
  placeBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  distanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  distanceText: {
    fontSize: 11,
    color: colors.subtext,
  },
  tag: {
    backgroundColor: colors.surface,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginRight: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tagText: {
    fontSize: 10,
    color: colors.subtext,
    fontWeight: '500',
  },

  // Vibe score row (inside featured)
  vibeScoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },

  // Loading/Error
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    color: colors.subtext,
    fontSize: 14,
  },
  errorWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  errorText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  retryBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 12,
  },
  retryText: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 14,
  },

  // Empty
  emptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
    gap: 12,
  },
  emptyIcon: {
    fontSize: 48,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  emptySub: {
    fontSize: 13,
    color: colors.subtext,
    textAlign: 'center',
  },
});
