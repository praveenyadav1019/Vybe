import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  RefreshControl,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Animated, { FadeInDown, FadeInRight, FadeIn } from 'react-native-reanimated';
import { Image } from 'expo-image';
import { colors } from '@/theme/colors';
import { useAuthStore } from '@/stores/authStore';
import { useUserStore } from '@/stores/userStore';
import { apiFetch } from '@/lib/api';
import type { NearbyUser, Place, Mode } from '@/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─── Types ────────────────────────────────────────────────────────────────────
interface DiscoveryFeed {
  users: NearbyUser[];
  nearbyCount: number;
  venueCount: number;
  mutualInterestsCount: number;
}

interface HappeningPlaces {
  places: Place[];
}

// ─── Mode Config ──────────────────────────────────────────────────────────────
const MODE_CONFIG: Record<
  Mode,
  { emoji: string; label: string; color: string; description: string }
> = {
  dating: {
    emoji: '💕',
    label: 'Dating',
    color: colors.modes.dating,
    description: 'Slow burns, explicit consent on every step.',
  },
  hook: {
    emoji: '🔥',
    label: 'Hook',
    color: colors.modes.hook,
    description: 'Verified-only. Strict consent gates.',
  },
  'co-travel': {
    emoji: '✈️',
    label: 'Co-Travel',
    color: colors.modes['co-travel'],
    description: 'Airports, trains, shared adventures.',
  },
  'night-out': {
    emoji: '🌙',
    label: 'Night Out',
    color: colors.modes['night-out'],
    description: 'Crew energy, sober driver prompts.',
  },
  'club-mates': {
    emoji: '🎵',
    label: 'Club Mates',
    color: colors.modes['club-mates'],
    description: 'Groups & couples at the door.',
  },
  casual: {
    emoji: '👋',
    label: 'Casual',
    color: colors.modes.casual,
    description: 'Low pressure, just vibing.',
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getGreeting(name: string): string {
  const hour = new Date().getHours();
  const time = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
  return `Good ${time}, ${name || 'Vybe'} ✨`;
}

function distanceColor(distance: NearbyUser['distance']): string {
  switch (distance) {
    case 'Same venue':
      return colors.success;
    case 'Within 100m':
      return colors.accent;
    default:
      return colors.subtext;
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function PulseDot({ color }: { color: string }) {
  return (
    <View style={{ width: 10, height: 10, alignItems: 'center', justifyContent: 'center' }}>
      <View
        style={{
          width: 8,
          height: 8,
          borderRadius: 4,
          backgroundColor: color,
        }}
      />
    </View>
  );
}

function NearbyUserCard({
  user,
  onPress,
}: {
  user: NearbyUser;
  onPress: () => void;
}) {
  const mode = MODE_CONFIG[user.activeMode] || MODE_CONFIG.casual;
  const initials = user.name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={styles.nearbyCard}>
      <LinearGradient
        colors={['#1E1E2E', '#121212']}
        style={styles.nearbyCardGradient}
      >
        {/* Avatar */}
        <View style={styles.nearbyAvatarContainer}>
          {user.photos?.[0] ? (
            <Image
              source={{ uri: user.photos[0] }}
              style={styles.nearbyAvatar}
              contentFit="cover"
            />
          ) : (
            <View style={[styles.nearbyAvatarFallback, { borderColor: mode.color }]}>
              <Text style={styles.nearbyAvatarInitials}>{initials}</Text>
            </View>
          )}
          {user.isOnline && <View style={styles.onlineDot} />}
          {user.isVerified && (
            <View style={styles.verifiedBadge}>
              <Text style={{ fontSize: 8, color: colors.background, fontWeight: '900' }}>✓</Text>
            </View>
          )}
        </View>

        {/* Info */}
        <Text style={styles.nearbyName} numberOfLines={1}>
          {user.name}, {user.age}
        </Text>

        {/* Mode chip */}
        <View style={[styles.modeChipSmall, { backgroundColor: mode.color + '22' }]}>
          <Text style={[styles.modeChipText, { color: mode.color }]}>
            {mode.emoji} {mode.label}
          </Text>
        </View>

        {/* Distance */}
        <Text style={[styles.nearbyDistance, { color: distanceColor(user.distance) }]}>
          {user.distance}
        </Text>
      </LinearGradient>
    </TouchableOpacity>
  );
}

function PlaceCardCompact({
  place,
  onPress,
}: {
  place: Place;
  onPress: () => void;
}) {
  const vibePercent = Math.round((place.vibeScore || 0) * 100);

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={styles.placeCard}>
      <LinearGradient
        colors={['rgba(124,58,237,0.12)', 'rgba(18,18,18,0.9)']}
        style={styles.placeCardGradient}
      >
        <View style={styles.placeCardLeft}>
          <View style={styles.placeIconContainer}>
            <Ionicons name="flame" size={20} color={colors.modes['night-out']} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.placeName} numberOfLines={1}>
              {place.name}
            </Text>
            <Text style={styles.placeAddress} numberOfLines={1}>
              {place.address || place.type}
            </Text>
          </View>
        </View>
        <View style={styles.placeCardRight}>
          <Text style={styles.vibeScore}>🔥 {vibePercent}%</Text>
          <Text style={styles.activeUsers}>{place.activeUsers} inside</Text>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}

function QuickActionButton({
  icon,
  label,
  color,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  color: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={styles.quickAction}>
      <LinearGradient
        colors={[color + '33', color + '11']}
        style={styles.quickActionGradient}
      >
        <View style={[styles.quickActionIcon, { backgroundColor: color + '22', borderColor: color + '55' }]}>
          <Ionicons name={icon} size={24} color={color} />
        </View>
        <Text style={styles.quickActionLabel}>{label}</Text>
      </LinearGradient>
    </TouchableOpacity>
  );
}

function ModeOption({
  mode,
  isActive,
  onSelect,
}: {
  mode: Mode;
  isActive: boolean;
  onSelect: () => void;
}) {
  const cfg = MODE_CONFIG[mode];
  return (
    <TouchableOpacity
      onPress={onSelect}
      activeOpacity={0.8}
      style={[
        styles.modeOption,
        isActive && { borderColor: cfg.color, backgroundColor: cfg.color + '15' },
      ]}
    >
      <Text style={styles.modeOptionEmoji}>{cfg.emoji}</Text>
      <View style={{ flex: 1 }}>
        <Text style={[styles.modeOptionLabel, isActive && { color: cfg.color }]}>
          {cfg.label}
        </Text>
        <Text style={styles.modeOptionDesc} numberOfLines={1}>
          {cfg.description}
        </Text>
      </View>
      {isActive && (
        <Ionicons name="checkmark-circle" size={20} color={cfg.color} />
      )}
    </TouchableOpacity>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function NearbyCardSkeleton() {
  return (
    <View style={[styles.nearbyCard, { backgroundColor: colors.surface }]}>
      <View style={[styles.nearbyAvatarContainer, { backgroundColor: colors.card, borderRadius: 40 }]} />
      <View style={{ width: 60, height: 10, borderRadius: 5, backgroundColor: colors.card, marginTop: 8 }} />
      <View style={{ width: 50, height: 8, borderRadius: 4, backgroundColor: colors.card, marginTop: 4 }} />
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function HomeDashboard() {
  const router = useRouter();
  const token = useAuthStore((s) => s.token);
  const profile = useUserStore((s) => s.profile);
  const setProfile = useUserStore((s) => s.setProfile);
  const queryClient = useQueryClient();

  const [safetyMode, setSafetyMode] = useState(profile?.womenSafetyMode ?? false);
  const [modeSelectorVisible, setModeSelectorVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const currentMode: Mode = (profile?.activeMode as Mode) || 'casual';
  const modeInfo = MODE_CONFIG[currentMode];

  // ─── Queries ────────────────────────────────────────────────────────────
  const {
    data: feedData,
    isLoading: feedLoading,
  } = useQuery<DiscoveryFeed>({
    queryKey: ['discovery', 'feed'],
    queryFn: () => apiFetch<DiscoveryFeed>('/discovery/feed', { token }),
    staleTime: 30_000,
    enabled: !!token,
    placeholderData: {
      users: [
        { id: 'u1', name: 'Avery', age: 24, photos: [], distance: 'Same venue', activeMode: 'dating', isVerified: true, isOnline: true, interests: ['techno'] },
        { id: 'u2', name: 'Rio', age: 26, photos: [], distance: 'Within 100m', activeMode: 'night-out', isVerified: true, isOnline: true, interests: ['house'] },
        { id: 'u3', name: 'Mina', age: 22, photos: [], distance: 'Nearby', activeMode: 'casual', isVerified: false, isOnline: false, interests: ['photography'] },
        { id: 'u4', name: 'Zara', age: 25, photos: [], distance: 'Same venue', activeMode: 'club-mates', isVerified: true, isOnline: true, interests: ['dnb'] },
      ],
      nearbyCount: 18,
      venueCount: 4,
      mutualInterestsCount: 7,
    },
  });

  const {
    data: placesData,
    isLoading: placesLoading,
  } = useQuery<HappeningPlaces>({
    queryKey: ['places', 'happening'],
    queryFn: () => apiFetch<HappeningPlaces>('/places/happening', { token }),
    staleTime: 60_000,
    enabled: !!token,
    placeholderData: {
      places: [
        { id: 'p1', name: 'Aurora Club', type: 'club', address: 'Sector 18, Noida', vibeScore: 0.86, crowdScore: 0.9, activeUsers: 128, isHappening: true, photos: [], distance: '0.2km', tags: ['techno', 'dark'] },
        { id: 'p2', name: 'Neon Rooftop', type: 'lounge', address: 'Connaught Place', vibeScore: 0.72, crowdScore: 0.65, activeUsers: 64, isHappening: true, photos: [], distance: '1.1km', tags: ['chill', 'cocktails'] },
      ],
    },
  });

  // ─── Handlers ────────────────────────────────────────────────────────────
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['discovery', 'feed'] }),
      queryClient.invalidateQueries({ queryKey: ['places', 'happening'] }),
    ]);
    setRefreshing(false);
  }, [queryClient]);

  const handleModeSelect = useCallback(
    (mode: Mode) => {
      setProfile({ activeMode: mode as any });
      setModeSelectorVisible(false);
    },
    [setProfile]
  );

  const handleSafetyToggle = useCallback(() => {
    const next = !safetyMode;
    setSafetyMode(next);
    setProfile({ womenSafetyMode: next });
  }, [safetyMode, setProfile]);

  const users = feedData?.users ?? [];
  const places = placesData?.places ?? [];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(0).duration(500)} style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.greeting}>{getGreeting(profile?.name ?? '')}</Text>
            <Text style={styles.subGreeting}>Find your vybe tonight</Text>
          </View>
          <View style={styles.headerActions}>
            {/* Safety mode */}
            <TouchableOpacity
              onPress={handleSafetyToggle}
              style={[
                styles.headerBtn,
                safetyMode && { backgroundColor: colors.danger + '22', borderColor: colors.danger + '55' },
              ]}
            >
              <Ionicons
                name="shield-checkmark"
                size={20}
                color={safetyMode ? colors.danger : colors.subtext}
              />
            </TouchableOpacity>

            {/* Notifications */}
            <TouchableOpacity
              onPress={() => router.push('/(app)/notifications')}
              style={styles.headerBtn}
            >
              <Ionicons name="notifications" size={20} color={colors.subtext} />
              <View style={styles.notifBadge}>
                <Text style={styles.notifBadgeText}>3</Text>
              </View>
            </TouchableOpacity>

            {/* Avatar */}
            <TouchableOpacity
              onPress={() => router.push('/(tabs)/profile')}
              activeOpacity={0.8}
              style={styles.avatarBtn}
            >
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarInitials}>
                  {(profile?.name?.[0] ?? 'V').toUpperCase()}
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </Animated.View>

        <View style={styles.content}>
          {/* ── Active Mode Card ────────────────────────────────────────────── */}
          <Animated.View entering={FadeInDown.delay(80).duration(500)}>
            <LinearGradient
              colors={[modeInfo.color + '30', modeInfo.color + '08', '#12121200']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.modeCard}
            >
              <View style={styles.modeCardInner}>
                <View style={[styles.modeIconCircle, { backgroundColor: modeInfo.color + '20', borderColor: modeInfo.color + '40' }]}>
                  <Text style={styles.modeEmoji}>{modeInfo.emoji}</Text>
                </View>
                <View style={{ flex: 1, marginLeft: 14 }}>
                  <Text style={styles.modeLabel}>Current Mode</Text>
                  <Text style={[styles.modeName, { color: modeInfo.color }]}>
                    {modeInfo.label}
                  </Text>
                  <Text style={styles.modeDesc} numberOfLines={1}>
                    {modeInfo.description}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setModeSelectorVisible(true)}
                  activeOpacity={0.8}
                  style={[styles.changeModeBtn, { borderColor: modeInfo.color + '60' }]}
                >
                  <Text style={[styles.changeModeBtnText, { color: modeInfo.color }]}>Change</Text>
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </Animated.View>

          {/* ── Nearby Pulse Stats ──────────────────────────────────────────── */}
          <Animated.View entering={FadeInDown.delay(160).duration(500)} style={styles.pulseRow}>
            <View style={styles.pulseStat}>
              <PulseDot color={colors.success} />
              <Text style={styles.pulseValue}>{feedData?.nearbyCount ?? 0}</Text>
              <Text style={styles.pulseLabel}>nearby</Text>
            </View>
            <View style={styles.pulseDivider} />
            <View style={styles.pulseStat}>
              <PulseDot color={colors.modes['night-out']} />
              <Text style={styles.pulseValue}>{feedData?.venueCount ?? 0}</Text>
              <Text style={styles.pulseLabel}>venues</Text>
            </View>
            <View style={styles.pulseDivider} />
            <View style={styles.pulseStat}>
              <PulseDot color={colors.accent} />
              <Text style={styles.pulseValue}>{feedData?.mutualInterestsCount ?? 0}</Text>
              <Text style={styles.pulseLabel}>interests</Text>
            </View>
          </Animated.View>

          {/* ── Nearby People ───────────────────────────────────────────────── */}
          <Animated.View entering={FadeInDown.delay(240).duration(500)}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>People Near You</Text>
              <TouchableOpacity onPress={() => router.push('/(app)/nearby')}>
                <Text style={styles.seeAll}>See All</Text>
              </TouchableOpacity>
            </View>

            {feedLoading ? (
              <FlatList
                horizontal
                data={[1, 2, 3, 4]}
                keyExtractor={(i) => String(i)}
                renderItem={() => <NearbyCardSkeleton />}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
              />
            ) : users.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="people-outline" size={40} color={colors.border} />
                <Text style={styles.emptyText}>No one nearby right now</Text>
                <Text style={styles.emptySubtext}>Check back soon or expand your radius</Text>
              </View>
            ) : (
              <FlatList
                horizontal
                data={users}
                keyExtractor={(u) => u.id}
                renderItem={({ item }) => (
                  <NearbyUserCard
                    user={item}
                    onPress={() => router.push(`/(app)/user/${item.id}`)}
                  />
                )}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
              />
            )}
          </Animated.View>

          {/* ── Happening Places ────────────────────────────────────────────── */}
          <Animated.View entering={FadeInDown.delay(320).duration(500)}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Happening Now 🔥</Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/places')}>
                <Text style={styles.seeAll}>See All</Text>
              </TouchableOpacity>
            </View>

            <View style={{ paddingHorizontal: 16, gap: 10 }}>
              {placesLoading ? (
                <>
                  <View style={[styles.placeCard, { height: 70, backgroundColor: colors.surface }]} />
                  <View style={[styles.placeCard, { height: 70, backgroundColor: colors.surface }]} />
                </>
              ) : places.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyText}>No happening places nearby</Text>
                </View>
              ) : (
                places.slice(0, 3).map((place) => (
                  <PlaceCardCompact
                    key={place.id}
                    place={place}
                    onPress={() => router.push(`/place/${place.id}`)}
                  />
                ))
              )}
            </View>
          </Animated.View>

          {/* ── Quick Actions ───────────────────────────────────────────────── */}
          <Animated.View entering={FadeInDown.delay(400).duration(500)}>
            <Text style={[styles.sectionTitle, { paddingHorizontal: 16, marginBottom: 12 }]}>
              Quick Actions
            </Text>
            <View style={styles.quickActionsGrid}>
              <QuickActionButton
                icon="radio"
                label="Start Radar"
                color={colors.accent}
                onPress={() => router.push('/(app)/radar')}
              />
              <QuickActionButton
                icon="heart"
                label="Dating Mode"
                color={colors.modes.dating}
                onPress={() => handleModeSelect('dating')}
              />
              <QuickActionButton
                icon="moon"
                label="Night Out"
                color={colors.modes['night-out']}
                onPress={() => handleModeSelect('night-out')}
              />
              <QuickActionButton
                icon="airplane"
                label="Co-Travel"
                color={colors.modes['co-travel']}
                onPress={() => handleModeSelect('co-travel')}
              />
            </View>
          </Animated.View>

          <View style={{ height: 32 }} />
        </View>
      </ScrollView>

      {/* ── Mode Selector Bottom Sheet ─────────────────────────────────────── */}
      <Modal
        visible={modeSelectorVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModeSelectorVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setModeSelectorVisible(false)}
        >
          <Pressable onPress={() => {}} style={styles.bottomSheet}>
            <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />
            <View style={styles.bottomSheetContent}>
              {/* Handle */}
              <View style={styles.sheetHandle} />

              <Text style={styles.sheetTitle}>Choose Your Vybe</Text>
              <Text style={styles.sheetSubtitle}>
                Your mode determines how you appear to others
              </Text>

              <ScrollView showsVerticalScrollIndicator={false} style={{ marginTop: 16 }}>
                {(Object.keys(MODE_CONFIG) as Mode[]).map((mode) => (
                  <ModeOption
                    key={mode}
                    mode={mode}
                    isActive={currentMode === mode}
                    onSelect={() => handleModeSelect(mode)}
                  />
                ))}
                <View style={{ height: 32 }} />
              </ScrollView>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  greeting: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.5,
  },
  subGreeting: {
    fontSize: 13,
    color: colors.subtext,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.background,
  },
  notifBadgeText: {
    fontSize: 9,
    color: colors.text,
    fontWeight: '800',
  },
  avatarBtn: {
    marginLeft: 4,
  },
  avatarPlaceholder: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.primary + '33',
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.primary,
  },
  content: {
    gap: 24,
  },
  // Mode Card
  modeCard: {
    marginHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  modeCardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  modeIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeEmoji: {
    fontSize: 26,
  },
  modeLabel: {
    fontSize: 11,
    color: colors.subtext,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontWeight: '600',
  },
  modeName: {
    fontSize: 20,
    fontWeight: '800',
    marginTop: 2,
  },
  modeDesc: {
    fontSize: 12,
    color: colors.subtext,
    marginTop: 2,
  },
  changeModeBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  changeModeBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  // Pulse stats
  pulseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  pulseStat: {
    flex: 1,
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
  },
  pulseValue: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },
  pulseLabel: {
    fontSize: 12,
    color: colors.subtext,
    fontWeight: '500',
  },
  pulseDivider: {
    width: 1,
    height: 30,
    backgroundColor: colors.border,
  },
  // Section headers
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.3,
  },
  seeAll: {
    fontSize: 13,
    color: colors.accent,
    fontWeight: '600',
  },
  // Nearby user cards
  nearbyCard: {
    width: 120,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  nearbyCardGradient: {
    padding: 12,
    alignItems: 'center',
    gap: 4,
  },
  nearbyAvatarContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    overflow: 'visible',
    position: 'relative',
    marginBottom: 4,
  },
  nearbyAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  nearbyAvatarFallback: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nearbyAvatarInitials: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
  },
  onlineDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.success,
    borderWidth: 2,
    borderColor: colors.card,
  },
  verifiedBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.card,
  },
  nearbyName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  modeChipSmall: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    alignItems: 'center',
  },
  modeChipText: {
    fontSize: 10,
    fontWeight: '700',
  },
  nearbyDistance: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  // Place cards
  placeCard: {
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  placeCardGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  placeCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
  },
  placeIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.modes['night-out'] + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  placeAddress: {
    fontSize: 11,
    color: colors.subtext,
    marginTop: 2,
  },
  placeCardRight: {
    alignItems: 'flex-end',
    gap: 2,
  },
  vibeScore: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.modes.hook,
  },
  activeUsers: {
    fontSize: 11,
    color: colors.subtext,
  },
  // Quick actions
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 10,
  },
  quickAction: {
    width: (SCREEN_WIDTH - 42) / 2,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  quickActionGradient: {
    padding: 16,
    gap: 10,
  },
  quickActionIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  // Empty states
  emptyState: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 32,
    gap: 8,
    marginHorizontal: 16,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.subtext,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 12,
    color: colors.subtext + '88',
    textAlign: 'center',
  },
  // Modal / Bottom sheet
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  bottomSheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
    maxHeight: '80%',
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: colors.border,
  },
  bottomSheetContent: {
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
  sheetTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.5,
  },
  sheetSubtitle: {
    fontSize: 13,
    color: colors.subtext,
    marginTop: 4,
  },
  // Mode options
  modeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    marginBottom: 8,
  },
  modeOptionEmoji: {
    fontSize: 24,
  },
  modeOptionLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  modeOptionDesc: {
    fontSize: 12,
    color: colors.subtext,
    marginTop: 2,
  },
});
