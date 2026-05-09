import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ScrollView,
  Switch,
  StyleSheet,
  Dimensions,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Animated, {
  FadeInDown,
  FadeInRight,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { useDiscoveryStore } from '@/stores/discoveryStore';
import type { NearbyUser, MatchRequest } from '@/types';
import { colors } from '@/theme/colors';
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import { UserCard } from '@/components/user/UserCard';
import { Avatar } from '@/components/ui/Avatar';

const { width: SCREEN_W } = Dimensions.get('window');

const GENDER_OPTIONS = ['Everyone', 'Women', 'Men', 'Non-binary'];
const INTEREST_OPTIONS = ['Music', 'Travel', 'Fitness', 'Art', 'Food', 'Gaming'];
const MIN_AGE = 18;
const MAX_AGE = 45;

interface DatingFeedResponse {
  users: NearbyUser[];
  matchRequests: MatchRequest[];
}

export default function DatingModeScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, updateUser } = useAuthStore();
  const { setActiveMode } = useDiscoveryStore();

  const [modeActive, setModeActive] = useState(user?.activeMode === 'dating');
  const [ageRange, setAgeRange] = useState<[number, number]>([18, 35]);
  const [selectedGender, setSelectedGender] = useState('Everyone');
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [maxDistance, setMaxDistance] = useState(2);
  const [skippedIds, setSkippedIds] = useState<Set<string>>(new Set());

  // Fetch dating feed
  const { data, isLoading, refetch } = useQuery<DatingFeedResponse>({
    queryKey: ['discovery-feed', 'dating', ageRange, selectedGender, maxDistance],
    queryFn: async () => {
      const res = await api.get<DatingFeedResponse>('/discovery/feed', {
        mode: 'dating',
        minAge: ageRange[0],
        maxAge: ageRange[1],
        gender: selectedGender === 'Everyone' ? undefined : selectedGender.toLowerCase(),
        maxDistanceKm: maxDistance,
      });
      return res.data;
    },
    enabled: modeActive,
  });

  // Toggle dating mode
  const toggleModeMutation = useMutation({
    mutationFn: async (active: boolean) => {
      const res = await api.patch<{ user: typeof user }>('/me', {
        activeMode: active ? 'dating' : 'casual',
      });
      return res.data;
    },
    onSuccess: (data, active) => {
      if (data.user) updateUser(data.user);
      setActiveMode(active ? 'dating' : 'casual');
      if (active) refetch();
    },
  });

  // Send ping
  const pingMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await api.post(`/users/${userId}/ping`, { mode: 'dating' });
      return res.data;
    },
    onSuccess: () => {
      Alert.alert('Ping sent! 💕', 'They will see your interest.');
    },
    onError: () => {
      Alert.alert('Could not send ping', 'Try again shortly.');
    },
  });

  const handleToggleMode = useCallback(
    (val: boolean) => {
      setModeActive(val);
      toggleModeMutation.mutate(val);
    },
    [toggleModeMutation]
  );

  const handleSkip = useCallback((u: NearbyUser) => {
    setSkippedIds((prev) => new Set([...prev, u.id]));
  }, []);

  const handlePing = useCallback(
    (u: NearbyUser) => {
      pingMutation.mutate(u.id);
    },
    [pingMutation]
  );

  const filteredUsers = (data?.users ?? []).filter((u) => !skippedIds.has(u.id));
  const matchRequests = data?.matchRequests ?? [];
  const isPremium = user?.isPremium ?? false;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Animated.View entering={FadeInDown.springify()} style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </TouchableOpacity>
          <LinearGradient
            colors={['#FF4D6D', '#C2185B']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.titleGradient}
          >
            <Text style={styles.titleText}>Dating Mode 💕</Text>
          </LinearGradient>
          <Switch
            value={modeActive}
            onValueChange={handleToggleMode}
            trackColor={{ false: colors.border, true: '#FF4D6D55' }}
            thumbColor={modeActive ? '#FF4D6D' : colors.subtext}
          />
        </Animated.View>

        <Animated.Text entering={FadeInDown.delay(60).springify()} style={styles.description}>
          Discover people looking for romance nearby
        </Animated.Text>

        {/* Compatibility Filters */}
        <Animated.View entering={FadeInDown.delay(120).springify()}>
          <GlassCard style={styles.filtersCard}>
            <Text style={styles.sectionLabel}>Filters</Text>

            {/* Age range */}
            <View style={styles.filterRow}>
              <Text style={styles.filterLabel}>Age Range</Text>
              <View style={styles.ageButtons}>
                <TouchableOpacity
                  onPress={() => setAgeRange(([min, max]) => [Math.max(MIN_AGE, min - 1), max])}
                  style={styles.ageBtn}
                >
                  <Ionicons name="remove" size={14} color={colors.text} />
                </TouchableOpacity>
                <Text style={styles.ageValue}>
                  {ageRange[0]}–{ageRange[1]}
                </Text>
                <TouchableOpacity
                  onPress={() => setAgeRange(([min, max]) => [min, Math.min(MAX_AGE, max + 1)])}
                  style={styles.ageBtn}
                >
                  <Ionicons name="add" size={14} color={colors.text} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Gender preference */}
            <View style={styles.filterRow}>
              <Text style={styles.filterLabel}>Interested in</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
              {GENDER_OPTIONS.map((g) => (
                <TouchableOpacity
                  key={g}
                  onPress={() => setSelectedGender(g)}
                  style={[
                    styles.filterChip,
                    selectedGender === g && styles.filterChipActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      selectedGender === g && styles.filterChipTextActive,
                    ]}
                  >
                    {g}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Distance */}
            <View style={[styles.filterRow, { marginTop: 12 }]}>
              <Text style={styles.filterLabel}>Max Distance</Text>
              <View style={styles.ageButtons}>
                <TouchableOpacity
                  onPress={() => setMaxDistance((d) => Math.max(0.5, d - 0.5))}
                  style={styles.ageBtn}
                >
                  <Ionicons name="remove" size={14} color={colors.text} />
                </TouchableOpacity>
                <Text style={styles.ageValue}>{maxDistance} km</Text>
                <TouchableOpacity
                  onPress={() => setMaxDistance((d) => Math.min(10, d + 0.5))}
                  style={styles.ageBtn}
                >
                  <Ionicons name="add" size={14} color={colors.text} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Interest filter */}
            <View style={[styles.filterRow, { marginTop: 12 }]}>
              <Text style={styles.filterLabel}>Common Interests</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
              {INTEREST_OPTIONS.map((interest) => {
                const active = selectedInterests.includes(interest);
                return (
                  <TouchableOpacity
                    key={interest}
                    onPress={() =>
                      setSelectedInterests((prev) =>
                        active ? prev.filter((i) => i !== interest) : [...prev, interest]
                      )
                    }
                    style={[styles.filterChip, active && styles.filterChipActive]}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        active && styles.filterChipTextActive,
                      ]}
                    >
                      {interest}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </GlassCard>
        </Animated.View>

        {/* Match Requests */}
        {matchRequests.length > 0 && (
          <Animated.View entering={FadeInDown.delay(180).springify()}>
            <GlassCard style={styles.matchCard}>
              <View style={styles.matchHeader}>
                <Text style={styles.matchTitle}>Waiting for you 💌</Text>
                <View style={styles.countBadge}>
                  <Text style={styles.countText}>{matchRequests.length}</Text>
                </View>
              </View>
              <Text style={styles.matchSub}>People who pinged you in Dating Mode</Text>
              <View style={styles.avatarStack}>
                {matchRequests.slice(0, 5).map((req, i) => (
                  <View
                    key={req.id}
                    style={[styles.stackedAvatar, { marginLeft: i === 0 ? 0 : -12, zIndex: 10 - i }]}
                  >
                    <Avatar
                      uri={req.fromUser.photos?.[0]}
                      name={req.fromUser.name}
                      size="md"
                      showOnline
                      isOnline
                    />
                  </View>
                ))}
                {matchRequests.length > 5 && (
                  <View style={styles.moreAvatars}>
                    <Text style={styles.moreAvatarsText}>+{matchRequests.length - 5}</Text>
                  </View>
                )}
              </View>
              <Button
                title="View all requests"
                variant="outline"
                style={{ marginTop: 12 }}
                onPress={() => router.push('/notifications')}
              />
            </GlassCard>
          </Animated.View>
        )}

        {/* Premium upsell */}
        {!isPremium && (
          <Animated.View entering={FadeInDown.delay(220).springify()}>
            <LinearGradient
              colors={['#FF4D6D22', '#7C3AED22']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.premiumCard}
            >
              <View style={styles.premiumRow}>
                <Ionicons name="lock-closed" size={18} color="#FFD700" />
                <Text style={styles.premiumTitle}>Unlock with VYBEON+</Text>
              </View>
              <Text style={styles.premiumDesc}>
                See who liked you • Unlimited pings • Verified-only filter
              </Text>
              <TouchableOpacity
                style={styles.premiumBtn}
                onPress={() => router.push('/(app)/premium')}
                activeOpacity={0.8}
              >
                <Text style={styles.premiumBtnText}>Upgrade now</Text>
              </TouchableOpacity>
            </LinearGradient>
          </Animated.View>
        )}

        {/* People Feed */}
        <Animated.View entering={FadeInDown.delay(260).springify()}>
          <View style={styles.feedHeader}>
            <Text style={styles.sectionTitle}>
              {modeActive ? 'People nearby 💕' : 'Activate mode to see people'}
            </Text>
            {isLoading && <Text style={styles.loadingText}>Loading…</Text>}
          </View>

          {!modeActive && (
            <GlassCard style={styles.inactiveCard}>
              <Ionicons name="heart-outline" size={40} color="#FF4D6D" style={{ alignSelf: 'center' }} />
              <Text style={styles.inactiveText}>
                Turn on Dating Mode above to discover people looking for romance near you.
              </Text>
              <Button
                title="Activate Dating Mode 💕"
                onPress={() => handleToggleMode(true)}
                style={{ marginTop: 12 }}
              />
            </GlassCard>
          )}

          {modeActive && filteredUsers.length === 0 && !isLoading && (
            <GlassCard style={styles.emptyCard}>
              <Text style={styles.emptyEmoji}>💕</Text>
              <Text style={styles.emptyTitle}>No one nearby right now</Text>
              <Text style={styles.emptySub}>Try expanding your distance or changing filters</Text>
            </GlassCard>
          )}

          {modeActive && filteredUsers.length > 0 && (
            <View style={styles.feedGrid}>
              {filteredUsers.map((u, i) => (
                <View key={u.id} style={styles.feedItem}>
                  <UserCard
                    user={u}
                    onPress={() => router.push(`/user/${u.id}`)}
                  />
                  {/* Action buttons overlay */}
                  <View style={styles.cardActions}>
                    <TouchableOpacity
                      onPress={() => handleSkip(u)}
                      style={styles.skipBtn}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="close" size={16} color={colors.subtext} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handlePing(u)}
                      style={styles.pingBtn}
                      activeOpacity={0.7}
                    >
                      <LinearGradient
                        colors={['#FF4D6D', '#C2185B']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.pingBtnGradient}
                      >
                        <Text style={styles.pingBtnText}>Ping 💕</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 40 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    paddingBottom: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  titleGradient: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    flex: 1,
    marginHorizontal: 10,
    alignItems: 'center',
  },
  titleText: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  description: {
    color: colors.subtext,
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 16,
  },

  filtersCard: { marginBottom: 16 },
  sectionLabel: {
    color: colors.subtext,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  filterLabel: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  chipScroll: { marginBottom: 4 },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 8,
    backgroundColor: colors.surface,
  },
  filterChipActive: {
    borderColor: '#FF4D6D',
    backgroundColor: '#FF4D6D22',
  },
  filterChipText: {
    color: colors.subtext,
    fontSize: 12,
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: '#FF4D6D',
  },
  ageButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ageBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ageValue: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
    minWidth: 60,
    textAlign: 'center',
  },

  matchCard: { marginBottom: 16 },
  matchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  matchTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  countBadge: {
    backgroundColor: '#FF4D6D',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  countText: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '800',
  },
  matchSub: {
    color: colors.subtext,
    fontSize: 12,
    marginBottom: 12,
  },
  avatarStack: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stackedAvatar: {
    borderWidth: 2,
    borderColor: colors.background,
    borderRadius: 24,
  },
  moreAvatars: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -12,
  },
  moreAvatarsText: {
    color: colors.subtext,
    fontSize: 11,
    fontWeight: '700',
  },

  premiumCard: {
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FF4D6D44',
    marginBottom: 16,
  },
  premiumRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  premiumTitle: {
    color: '#FFD700',
    fontSize: 14,
    fontWeight: '800',
  },
  premiumDesc: {
    color: colors.subtext,
    fontSize: 12,
    marginBottom: 12,
  },
  premiumBtn: {
    backgroundColor: '#FFD70022',
    borderWidth: 1,
    borderColor: '#FFD70066',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignSelf: 'flex-start',
  },
  premiumBtnText: {
    color: '#FFD700',
    fontSize: 12,
    fontWeight: '700',
  },

  feedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  loadingText: {
    color: colors.subtext,
    fontSize: 12,
  },

  inactiveCard: {
    alignItems: 'center',
    paddingVertical: 24,
    marginBottom: 16,
  },
  inactiveText: {
    color: colors.subtext,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 12,
    paddingHorizontal: 16,
  },

  emptyCard: {
    alignItems: 'center',
    paddingVertical: 32,
    marginBottom: 16,
  },
  emptyEmoji: { fontSize: 40, marginBottom: 8 },
  emptyTitle: { color: colors.text, fontSize: 16, fontWeight: '700' },
  emptySub: { color: colors.subtext, fontSize: 13, marginTop: 4, textAlign: 'center' },

  feedGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
  },
  feedItem: {
    width: (SCREEN_W - 44) / 2,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
  },
  skipBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pingBtn: {
    flex: 1,
    borderRadius: 18,
    overflow: 'hidden',
    height: 36,
  },
  pingBtnGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pingBtnText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
  },
});
