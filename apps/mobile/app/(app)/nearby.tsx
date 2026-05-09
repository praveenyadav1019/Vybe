import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Modal,
  Pressable,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useInfiniteQuery } from '@tanstack/react-query';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { Image } from 'expo-image';
import { apiFetch } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { useDiscoveryStore } from '@/stores/discoveryStore';
import { colors } from '@/theme/colors';
import type { NearbyUser, Mode } from '@/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - 16 * 2 - 10) / 2;

// ─── Types ────────────────────────────────────────────────────────────────
interface NearbyPage {
  users: NearbyUser[];
  nextCursor?: string;
  total: number;
}

type SortOption = 'distance' | 'online' | 'mode';

// ─── Config ───────────────────────────────────────────────────────────────
const MODE_CONFIG: Record<Mode, { emoji: string; label: string; color: string }> = {
  dating: { emoji: '💕', label: 'Dating', color: colors.modes.dating },
  hook: { emoji: '🔥', label: 'Hook', color: colors.modes.hook },
  'co-travel': { emoji: '✈️', label: 'Travel', color: colors.modes['co-travel'] },
  'night-out': { emoji: '🌙', label: 'Night Out', color: colors.modes['night-out'] },
  'club-mates': { emoji: '🎵', label: 'Club Mates', color: colors.modes['club-mates'] },
  casual: { emoji: '👋', label: 'Casual', color: colors.modes.casual },
};

const SORT_OPTIONS: { value: SortOption; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: 'distance', label: 'Nearest', icon: 'navigate' },
  { value: 'online', label: 'Online First', icon: 'radio-button-on' },
  { value: 'mode', label: 'Mode Match', icon: 'heart' },
];

function distanceColor(distance: NearbyUser['distance']): string {
  switch (distance) {
    case 'Same venue': return colors.success;
    case 'Within 100m': return colors.accent;
    default: return colors.subtext;
  }
}

// ─── Skeleton Card ────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <View style={[styles.userCard, { width: CARD_WIDTH }]}>
      <View style={styles.skeletonPhoto} />
      <View style={styles.cardInfo}>
        <View style={styles.skeletonLine} />
        <View style={[styles.skeletonLine, { width: '60%', marginTop: 6 }]} />
        <View style={[styles.skeletonLine, { width: '40%', marginTop: 6, height: 18 }]} />
      </View>
    </View>
  );
}

// ─── User Card (Large Grid) ───────────────────────────────────────────────
function NearbyUserCard({
  user,
  onPress,
  index,
}: {
  user: NearbyUser;
  onPress: () => void;
  index: number;
}) {
  const mode = MODE_CONFIG[user.activeMode] || MODE_CONFIG.casual;
  const initials = user.name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <Animated.View entering={FadeInDown.delay(index * 60).duration(400)}>
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.85}
        style={[styles.userCard, { width: CARD_WIDTH }]}
      >
        {/* Photo area */}
        <View style={styles.cardPhotoContainer}>
          {user.photos?.[0] ? (
            <Image
              source={{ uri: user.photos[0] }}
              style={styles.cardPhoto}
              contentFit="cover"
            />
          ) : (
            <LinearGradient
              colors={[mode.color + '40', colors.surface]}
              style={[styles.cardPhoto, { alignItems: 'center', justifyContent: 'center' }]}
            >
              <Text style={styles.cardAvatarInitials}>{initials}</Text>
            </LinearGradient>
          )}

          {/* Online indicator */}
          {user.isOnline && (
            <View style={styles.cardOnlineBadge}>
              <View style={styles.cardOnlineDot} />
              <Text style={styles.cardOnlineText}>Online</Text>
            </View>
          )}

          {/* Verified badge */}
          {user.isVerified && (
            <View style={styles.cardVerifiedBadge}>
              <Ionicons name="checkmark" size={10} color={colors.background} />
            </View>
          )}

          {/* Gradient overlay */}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.7)']}
            style={styles.cardGradientOverlay}
          />

          {/* Name on photo */}
          <View style={styles.cardNameOverlay}>
            <Text style={styles.cardNameOnPhoto} numberOfLines={1}>
              {user.name}, {user.age}
            </Text>
          </View>
        </View>

        {/* Info area */}
        <View style={styles.cardInfo}>
          {/* Distance */}
          <Text style={[styles.cardDistance, { color: distanceColor(user.distance) }]}>
            {user.distance}
          </Text>

          {/* Mode chip */}
          <View style={[styles.cardModeChip, { backgroundColor: mode.color + '20' }]}>
            <Text style={[styles.cardModeText, { color: mode.color }]}>
              {mode.emoji} {mode.label}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── Filter Sheet ─────────────────────────────────────────────────────────
function FilterSheet({
  visible,
  onClose,
  activeMode,
  onModeChange,
  sortBy,
  onSortChange,
  verifiedOnly,
  onVerifiedChange,
  genderFilter,
  onGenderChange,
}: {
  visible: boolean;
  onClose: () => void;
  activeMode: Mode | 'all';
  onModeChange: (m: Mode | 'all') => void;
  sortBy: SortOption;
  onSortChange: (s: SortOption) => void;
  verifiedOnly: boolean;
  onVerifiedChange: (v: boolean) => void;
  genderFilter: string;
  onGenderChange: (g: string) => void;
}) {
  const genderOptions = ['all', 'male', 'female', 'non-binary'];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.filterOverlay} onPress={onClose}>
        <Pressable onPress={() => {}} style={styles.filterSheet}>
          <BlurView intensity={85} tint="dark" style={StyleSheet.absoluteFill} />
          <ScrollView style={styles.filterContent} showsVerticalScrollIndicator={false}>
            <View style={styles.sheetHandle} />
            <Text style={styles.filterTitle}>Filter & Sort</Text>

            {/* Sort */}
            <Text style={styles.filterLabel}>Sort By</Text>
            <View style={styles.filterRow}>
              {SORT_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  onPress={() => onSortChange(opt.value)}
                  style={[
                    styles.filterOption,
                    sortBy === opt.value && { backgroundColor: colors.primary + '25', borderColor: colors.primary + '80' },
                  ]}
                >
                  <Ionicons
                    name={opt.icon}
                    size={14}
                    color={sortBy === opt.value ? colors.primary : colors.subtext}
                  />
                  <Text style={[styles.filterOptionText, sortBy === opt.value && { color: colors.primary }]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Mode */}
            <Text style={styles.filterLabel}>Mode</Text>
            <View style={styles.filterRow}>
              <TouchableOpacity
                onPress={() => onModeChange('all')}
                style={[styles.filterOption, activeMode === 'all' && { backgroundColor: colors.accent + '20', borderColor: colors.accent + '60' }]}
              >
                <Text style={[styles.filterOptionText, activeMode === 'all' && { color: colors.accent }]}>All</Text>
              </TouchableOpacity>
              {(Object.entries(MODE_CONFIG) as [Mode, typeof MODE_CONFIG[Mode]][]).map(([mode, cfg]) => (
                <TouchableOpacity
                  key={mode}
                  onPress={() => onModeChange(mode)}
                  style={[styles.filterOption, activeMode === mode && { backgroundColor: cfg.color + '20', borderColor: cfg.color + '60' }]}
                >
                  <Text>{cfg.emoji}</Text>
                  <Text style={[styles.filterOptionText, activeMode === mode && { color: cfg.color }]}>{cfg.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Gender */}
            <Text style={styles.filterLabel}>Gender</Text>
            <View style={styles.filterRow}>
              {genderOptions.map((g) => (
                <TouchableOpacity
                  key={g}
                  onPress={() => onGenderChange(g)}
                  style={[styles.filterOption, genderFilter === g && { backgroundColor: colors.primary + '25', borderColor: colors.primary + '80' }]}
                >
                  <Text style={[styles.filterOptionText, genderFilter === g && { color: colors.primary }]}>
                    {g === 'all' ? 'All' : g.charAt(0).toUpperCase() + g.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Verified Only */}
            <TouchableOpacity
              onPress={() => onVerifiedChange(!verifiedOnly)}
              style={styles.verifiedToggle}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.verifiedLabel}>Verified Only</Text>
                <Text style={styles.verifiedSubLabel}>Show only face-verified users</Text>
              </View>
              <View style={[styles.toggle, verifiedOnly && styles.toggleActive]}>
                <View style={[styles.toggleThumb, verifiedOnly && styles.toggleThumbActive]} />
              </View>
            </TouchableOpacity>

            <TouchableOpacity onPress={onClose} style={styles.applyBtn}>
              <LinearGradient colors={colors.gradients.primary as [string, string]} style={styles.applyGradient}>
                <Text style={styles.applyText}>Apply Filters</Text>
              </LinearGradient>
            </TouchableOpacity>
            <View style={{ height: 32 }} />
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────
export default function NearbyScreen() {
  const router = useRouter();
  const token = useAuthStore((s) => s.token);
  const {
    activeFilter,
    setFilter,
    sortBy,
    setSortBy,
    genderFilter,
    setGenderFilter,
    verifiedOnly,
    setVerifiedOnly,
  } = useDiscoveryStore();

  const [filterVisible, setFilterVisible] = useState(false);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    refetch,
    isRefetching,
  } = useInfiniteQuery<NearbyPage>({
    queryKey: ['nearby-list', activeFilter, sortBy, genderFilter, verifiedOnly],
    queryFn: async ({ pageParam = undefined }) => {
      const params = new URLSearchParams({
        sort: sortBy,
        ...(activeFilter !== 'all' && { mode: activeFilter }),
        ...(genderFilter !== 'all' && { gender: genderFilter }),
        ...(verifiedOnly && { verified: 'true' }),
        ...(pageParam ? { cursor: pageParam as string } : {}),
        limit: '20',
      });
      return apiFetch<NearbyPage>(`/discovery/nearby?${params}`, { token });
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor,
    // Placeholder while API is unavailable
    placeholderData: {
      pages: [
        {
          users: [
            { id: 'u1', name: 'Avery', age: 24, photos: [], distance: 'Same venue', activeMode: 'dating', isVerified: true, isOnline: true, interests: ['techno'] },
            { id: 'u2', name: 'Rio', age: 26, photos: [], distance: 'Within 100m', activeMode: 'night-out', isVerified: true, isOnline: true, interests: ['house'] },
            { id: 'u3', name: 'Mina', age: 22, photos: [], distance: 'Nearby', activeMode: 'casual', isVerified: false, isOnline: false, interests: ['photography'] },
            { id: 'u4', name: 'Zara', age: 25, photos: [], distance: 'Same venue', activeMode: 'club-mates', isVerified: true, isOnline: true, interests: ['dnb'] },
            { id: 'u5', name: 'Kai', age: 28, photos: [], distance: 'Within 100m', activeMode: 'co-travel', isVerified: false, isOnline: true, interests: ['backpacking'] },
            { id: 'u6', name: 'Luna', age: 23, photos: [], distance: 'Nearby', activeMode: 'hook', isVerified: true, isOnline: false, interests: ['dark-techno'] },
          ],
          total: 18,
        },
      ],
      pageParams: [undefined],
    },
    staleTime: 30_000,
  });

  const allUsers = data?.pages.flatMap((p) => p.users) ?? [];
  const total = data?.pages[0]?.total ?? 0;

  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const renderItem = useCallback(
    ({ item, index }: { item: NearbyUser; index: number }) => (
      <NearbyUserCard
        user={item}
        onPress={() => router.push(`/(app)/user/${item.id}`)}
        index={index}
      />
    ),
    [router]
  );

  const renderFooter = useCallback(() => {
    if (!isFetchingNextPage) return null;
    return (
      <View style={styles.footer}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }, [isFetchingNextPage]);

  const renderEmpty = useCallback(() => {
    if (isLoading) return null;
    return (
      <Animated.View entering={FadeIn.duration(400)} style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>👀</Text>
        <Text style={styles.emptyTitle}>No one nearby</Text>
        <Text style={styles.emptySubtitle}>
          Try expanding your radius or changing filters
        </Text>
        <TouchableOpacity onPress={() => setFilter('all')} style={styles.resetBtn}>
          <Text style={styles.resetBtnText}>Reset Filters</Text>
        </TouchableOpacity>
      </Animated.View>
    );
  }, [isLoading, setFilter]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>Nearby</Text>
          <Text style={styles.headerSubtitle}>{total} people in range</Text>
        </View>
        <TouchableOpacity
          onPress={() => setFilterVisible(true)}
          style={styles.filterIconBtn}
        >
          <Ionicons name="options" size={22} color={colors.accent} />
          {(activeFilter !== 'all' || verifiedOnly || genderFilter !== 'all') && (
            <View style={styles.filterDot} />
          )}
        </TouchableOpacity>
      </View>

      {/* Mode filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.modeChipsRow}
      >
        <TouchableOpacity
          onPress={() => setFilter('all')}
          style={[styles.modeChip, activeFilter === 'all' && styles.modeChipActive]}
        >
          <Text style={[styles.modeChipText, activeFilter === 'all' && styles.modeChipTextActive]}>
            All
          </Text>
        </TouchableOpacity>
        {(Object.entries(MODE_CONFIG) as [Mode, typeof MODE_CONFIG[Mode]][]).map(([mode, cfg]) => (
          <TouchableOpacity
            key={mode}
            onPress={() => setFilter(mode)}
            style={[
              styles.modeChip,
              activeFilter === mode && {
                backgroundColor: cfg.color + '25',
                borderColor: cfg.color + '70',
              },
            ]}
          >
            <Text style={styles.modeChipEmoji}>{cfg.emoji}</Text>
            <Text style={[styles.modeChipText, activeFilter === mode && { color: cfg.color }]}>
              {cfg.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Sort indicator */}
      <View style={styles.sortBar}>
        <Ionicons name="swap-vertical" size={14} color={colors.subtext} />
        <Text style={styles.sortText}>
          Sorted by {SORT_OPTIONS.find((s) => s.value === sortBy)?.label}
        </Text>
      </View>

      {/* User Grid */}
      {isLoading ? (
        <FlatList
          data={[1, 2, 3, 4]}
          numColumns={2}
          keyExtractor={(i) => String(i)}
          renderItem={() => <SkeletonCard />}
          columnWrapperStyle={styles.columnWrapper}
          contentContainerStyle={styles.listContent}
        />
      ) : (
        <FlatList
          data={allUsers}
          numColumns={2}
          keyExtractor={(u) => u.id}
          renderItem={renderItem}
          columnWrapperStyle={styles.columnWrapper}
          contentContainerStyle={styles.listContent}
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.4}
          ListFooterComponent={renderFooter}
          ListEmptyComponent={renderEmpty}
          refreshing={isRefetching}
          onRefresh={refetch}
          showsVerticalScrollIndicator={false}
        />
      )}

      <FilterSheet
        visible={filterVisible}
        onClose={() => setFilterVisible(false)}
        activeMode={activeFilter}
        onModeChange={setFilter}
        sortBy={sortBy}
        onSortChange={setSortBy}
        verifiedOnly={verifiedOnly}
        onVerifiedChange={setVerifiedOnly}
        genderFilter={genderFilter}
        onGenderChange={setGenderFilter as any}
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 12,
    color: colors.subtext,
    textAlign: 'center',
    marginTop: 2,
  },
  filterIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.accent + '40',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.danger,
    borderWidth: 1.5,
    borderColor: colors.background,
  },
  modeChipsRow: {
    paddingHorizontal: 16,
    gap: 8,
    paddingBottom: 10,
  },
  modeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  modeChipActive: {
    backgroundColor: colors.primary + '25',
    borderColor: colors.primary + '70',
  },
  modeChipEmoji: {
    fontSize: 13,
  },
  modeChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.subtext,
  },
  modeChipTextActive: {
    color: colors.primary,
  },
  sortBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  sortText: {
    fontSize: 12,
    color: colors.subtext,
  },
  // Grid
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  // User card
  userCard: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardPhotoContainer: {
    width: '100%',
    height: CARD_WIDTH * 1.25,
    position: 'relative',
  },
  cardPhoto: {
    width: '100%',
    height: '100%',
  },
  cardAvatarInitials: {
    fontSize: 40,
    fontWeight: '800',
    color: colors.text,
    opacity: 0.8,
  },
  cardOnlineBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  cardOnlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.success,
  },
  cardOnlineText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.success,
  },
  cardVerifiedBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardGradientOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
  },
  cardNameOverlay: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    right: 8,
  },
  cardNameOnPhoto: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.text,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  cardInfo: {
    padding: 10,
    gap: 6,
  },
  cardDistance: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cardModeChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  cardModeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  // Skeleton
  skeletonPhoto: {
    width: '100%',
    height: CARD_WIDTH * 1.25,
    backgroundColor: colors.surface,
  },
  skeletonLine: {
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.surface,
    width: '80%',
  },
  // Footer
  footer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  // Empty state
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
    gap: 12,
  },
  emptyIcon: {
    fontSize: 56,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.subtext,
    textAlign: 'center',
    lineHeight: 22,
  },
  resetBtn: {
    marginTop: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.primary + '60',
    backgroundColor: colors.primary + '15',
  },
  resetBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
  // Filter sheet
  filterOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  filterSheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
    maxHeight: '85%',
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: colors.border,
  },
  filterContent: {
    padding: 20,
    paddingTop: 12,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginBottom: 16,
  },
  filterTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 20,
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.subtext,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 10,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  filterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  filterOptionText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.subtext,
  },
  verifiedToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 20,
  },
  verifiedLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  verifiedSubLabel: {
    fontSize: 12,
    color: colors.subtext,
    marginTop: 2,
  },
  toggle: {
    width: 46,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.border,
    padding: 2,
    justifyContent: 'center',
  },
  toggleActive: {
    backgroundColor: colors.primary,
  },
  toggleThumb: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.subtext,
  },
  toggleThumbActive: {
    backgroundColor: colors.text,
    transform: [{ translateX: 20 }],
  },
  applyBtn: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  applyGradient: {
    paddingVertical: 15,
    alignItems: 'center',
  },
  applyText: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
  },
});
