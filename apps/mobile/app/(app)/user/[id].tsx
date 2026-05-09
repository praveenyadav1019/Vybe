import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Alert,
  StyleSheet,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
  FadeIn,
  FadeInDown,
} from 'react-native-reanimated';
import { apiFetch } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { colors } from '@/theme/colors';
import type { User, Mode } from '@/types';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const PHOTO_HEIGHT = SCREEN_HEIGHT * 0.55;

// ─── Types ─────────────────────────────────────────────────────────────────
interface UserProfileResponse {
  user: User & { mutualInterests?: string[]; hasActiveChat?: boolean };
}

// ─── Mode Config ──────────────────────────────────────────────────────────
const MODE_CONFIG: Record<Mode, { emoji: string; label: string; color: string }> = {
  dating: { emoji: '💕', label: 'Dating', color: colors.modes.dating },
  hook: { emoji: '🔥', label: 'Hook', color: colors.modes.hook },
  'co-travel': { emoji: '✈️', label: 'Travel', color: colors.modes['co-travel'] },
  'night-out': { emoji: '🌙', label: 'Night Out', color: colors.modes['night-out'] },
  'club-mates': { emoji: '🎵', label: 'Club Mates', color: colors.modes['club-mates'] },
  casual: { emoji: '👋', label: 'Casual', color: colors.modes.casual },
};

function formatDistance(d?: string) {
  if (!d) return null;
  switch (d) {
    case 'Same venue': return { text: 'Same Venue', color: colors.success };
    case 'Within 100m': return { text: 'Within 100m', color: colors.accent };
    default: return { text: d, color: colors.subtext };
  }
}

function formatMemberSince(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  } catch {
    return 'Recently joined';
  }
}

// ─── Photo Carousel ────────────────────────────────────────────────────────
function PhotoCarousel({
  photos,
  onBack,
  onMenu,
}: {
  photos: string[];
  onBack: () => void;
  onMenu: () => void;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const displayPhotos = photos.length > 0 ? photos : ['__placeholder__'];

  const handleScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    setCurrentIndex(idx);
  }, []);

  return (
    <View style={styles.carouselContainer}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        scrollEventThrottle={16}
        style={{ width: SCREEN_WIDTH, height: PHOTO_HEIGHT }}
      >
        {displayPhotos.map((photo, idx) => (
          <View key={idx} style={{ width: SCREEN_WIDTH, height: PHOTO_HEIGHT }}>
            {photo === '__placeholder__' ? (
              <LinearGradient
                colors={['#1A1A2E', '#0A0A14']}
                style={{ width: SCREEN_WIDTH, height: PHOTO_HEIGHT, alignItems: 'center', justifyContent: 'center' }}
              >
                <Ionicons name="person" size={80} color={colors.border} />
              </LinearGradient>
            ) : (
              <Image
                source={{ uri: photo }}
                style={{ width: SCREEN_WIDTH, height: PHOTO_HEIGHT }}
                contentFit="cover"
              />
            )}
            {/* Gradient overlay at bottom */}
            <LinearGradient
              colors={['transparent', 'transparent', 'rgba(10,10,10,0.8)', '#0A0A0A']}
              style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 200 }}
            />
          </View>
        ))}
      </ScrollView>

      {/* Top controls */}
      <View style={styles.carouselTopControls}>
        <TouchableOpacity onPress={onBack} style={styles.glassBtn}>
          <BlurView intensity={60} tint="dark" style={StyleSheet.absoluteFill} />
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </TouchableOpacity>

        <View style={styles.carouselCounter}>
          <BlurView intensity={60} tint="dark" style={StyleSheet.absoluteFill} />
          <Text style={styles.counterText}>
            {currentIndex + 1}/{displayPhotos.length}
          </Text>
        </View>

        <TouchableOpacity onPress={onMenu} style={styles.glassBtn}>
          <BlurView intensity={60} tint="dark" style={StyleSheet.absoluteFill} />
          <Ionicons name="ellipsis-horizontal" size={22} color={colors.text} />
        </TouchableOpacity>
      </View>

      {/* Dot indicators */}
      {displayPhotos.length > 1 && (
        <View style={styles.dotRow}>
          {displayPhotos.map((_, idx) => (
            <View
              key={idx}
              style={[
                styles.dot,
                idx === currentIndex && styles.dotActive,
              ]}
            />
          ))}
        </View>
      )}
    </View>
  );
}

// ─── Interest Chip ─────────────────────────────────────────────────────────
function InterestChip({
  interest,
  highlighted,
}: {
  interest: string;
  highlighted?: boolean;
}) {
  return (
    <View
      style={[
        styles.interestChip,
        highlighted && {
          backgroundColor: colors.primary + '25',
          borderColor: colors.primary + '70',
        },
      ]}
    >
      {highlighted && (
        <Ionicons name="heart" size={10} color={colors.primary} />
      )}
      <Text
        style={[
          styles.interestText,
          highlighted && { color: colors.primary },
        ]}
      >
        {interest}
      </Text>
    </View>
  );
}

// ─── Ping Button with Animation ────────────────────────────────────────────
function PingButton({
  onPing,
  pinging,
  pinged,
}: {
  onPing: () => void;
  pinging: boolean;
  pinged: boolean;
}) {
  const scale = useSharedValue(1);

  const handlePress = () => {
    scale.value = withSequence(
      withSpring(0.92, { damping: 15 }),
      withSpring(1.06, { damping: 12 }),
      withSpring(1, { damping: 10 })
    );
    onPing();
  };

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[styles.pingBtnWrapper, animStyle]}>
      <TouchableOpacity
        onPress={handlePress}
        disabled={pinging || pinged}
        activeOpacity={0.85}
        style={{ flex: 1 }}
      >
        <LinearGradient
          colors={
            pinged
              ? [colors.success, colors.success + 'CC']
              : (colors.gradients.primary as [string, string])
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.pingGradient}
        >
          <Ionicons
            name={pinged ? 'checkmark-circle' : 'radio'}
            size={22}
            color={colors.text}
          />
          <Text style={styles.pingBtnText}>
            {pinging ? 'Pinging...' : pinged ? 'Pinged! ✨' : 'Ping'}
          </Text>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────
export default function UserProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const token = useAuthStore((s) => s.token);
  const [pingSuccess, setPingSuccess] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);

  // ── Fetch user ──────────────────────────────────────────────────────────
  const { data, isLoading, isError } = useQuery<UserProfileResponse>({
    queryKey: ['user', id],
    queryFn: () => apiFetch<UserProfileResponse>(`/users/${id}`, { token }),
    enabled: !!id && !!token,
    placeholderData: {
      user: {
        id: id ?? 'unknown',
        phone: '',
        name: 'Avery',
        age: 24,
        gender: 'female',
        bio: 'Techno & travel enthusiast. Always chasing the next festival. Consent first, always. 🎶✈️',
        photos: [],
        interests: ['techno', 'travel', 'photography', 'coffee', 'festivals', 'art'],
        isVerified: true,
        isPremium: false,
        activeMode: 'dating',
        isOnline: true,
        lastSeen: new Date().toISOString(),
        safetyMode: false,
        privacyLevel: 'public',
        createdAt: '2024-06-01T00:00:00.000Z',
        mutualInterests: ['techno', 'travel'],
        hasActiveChat: false,
      },
    },
  });

  // ── Ping mutation ────────────────────────────────────────────────────────
  const pingMutation = useMutation({
    mutationFn: async () => {
      return apiFetch<{ success: boolean }>(`/users/${id}/ping`, {
        method: 'POST',
        token,
      });
    },
    onSuccess: () => {
      setPingSuccess(true);
      setTimeout(() => setPingSuccess(false), 5000);
    },
    onError: () => {
      Alert.alert('Ping failed', 'Could not send ping. Please try again.');
    },
  });

  // ── Report / Block ────────────────────────────────────────────────────────
  const handleReport = useCallback(() => {
    setMenuVisible(false);
    Alert.alert(
      'Report User',
      'Why are you reporting this user?',
      [
        { text: 'Fake profile', onPress: () => submitReport('fake') },
        { text: 'Inappropriate content', onPress: () => submitReport('inappropriate') },
        { text: 'Harassment', onPress: () => submitReport('harassment') },
        { text: 'Spam', onPress: () => submitReport('spam') },
        { text: 'Cancel', style: 'cancel' },
      ],
      { cancelable: true }
    );
  }, []);

  const submitReport = useCallback(
    (reason: string) => {
      apiFetch(`/users/${id}/report`, {
        method: 'POST',
        token,
        body: JSON.stringify({ reason }),
      }).catch(() => {});
      Alert.alert('Reported', 'Thank you. We will review this profile.');
    },
    [id, token]
  );

  const handleBlock = useCallback(() => {
    setMenuVisible(false);
    Alert.alert(
      'Block User',
      `Block ${user?.name}? They won't be able to see your profile or ping you.`,
      [
        {
          text: 'Block',
          style: 'destructive',
          onPress: () => {
            apiFetch(`/users/${id}/block`, { method: 'POST', token }).catch(() => {});
            router.back();
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  }, [id, token, router]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <LinearGradient colors={['#1A1A2E', '#0A0A0A']} style={styles.loadingGradient} />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  if (isError || !data?.user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorEmoji}>😕</Text>
          <Text style={styles.errorTitle}>Profile not found</Text>
          <TouchableOpacity onPress={() => router.back()} style={styles.errorBackBtn}>
            <Text style={styles.errorBackText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const user = data.user;
  const mode = MODE_CONFIG[user.activeMode] || MODE_CONFIG.casual;
  const mutualInterests = user.mutualInterests ?? [];
  const distInfo = formatDistance(
    user.isOnline ? 'Same venue' : undefined
  );

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        style={{ flex: 1 }}
        bounces={true}
      >
        {/* Photo Carousel */}
        <PhotoCarousel
          photos={user.photos}
          onBack={() => router.back()}
          onMenu={() => setMenuVisible(true)}
        />

        {/* Profile Info — overlaps photo at bottom */}
        <View style={styles.profileInfoSection}>
          {/* Name row */}
          <Animated.View entering={FadeInDown.delay(100).duration(400)} style={styles.nameRow}>
            <Text style={styles.userName}>{user.name}</Text>
            <Text style={styles.userAge}>, {user.age}</Text>
            {user.isVerified && (
              <View style={styles.verifiedBadge}>
                <Ionicons name="checkmark" size={12} color={colors.background} />
              </View>
            )}
          </Animated.View>

          {/* Status chips row */}
          <Animated.View entering={FadeInDown.delay(150).duration(400)} style={styles.chipsRow}>
            {/* Mode chip */}
            <View style={[styles.statusChip, { backgroundColor: mode.color + '20', borderColor: mode.color + '50' }]}>
              <Text style={styles.statusChipEmoji}>{mode.emoji}</Text>
              <Text style={[styles.statusChipText, { color: mode.color }]}>{mode.label}</Text>
            </View>

            {/* Distance chip */}
            {distInfo && (
              <View style={[styles.statusChip, { backgroundColor: distInfo.color + '20', borderColor: distInfo.color + '50' }]}>
                <Ionicons name="location" size={11} color={distInfo.color} />
                <Text style={[styles.statusChipText, { color: distInfo.color }]}>{distInfo.text}</Text>
              </View>
            )}

            {/* Online indicator */}
            {user.isOnline && (
              <View style={[styles.statusChip, { backgroundColor: colors.success + '15', borderColor: colors.success + '40' }]}>
                <View style={styles.onlineDot} />
                <Text style={[styles.statusChipText, { color: colors.success }]}>Online</Text>
              </View>
            )}
          </Animated.View>

          {/* Action buttons */}
          <Animated.View entering={FadeInDown.delay(200).duration(400)} style={styles.actionButtons}>
            <PingButton
              onPing={() => pingMutation.mutate()}
              pinging={pingMutation.isPending}
              pinged={pingSuccess}
            />
            <TouchableOpacity onPress={handleBlock} style={styles.blockBtn}>
              <Ionicons name="ban" size={18} color={colors.subtext} />
              <Text style={styles.blockBtnText}>Block</Text>
            </TouchableOpacity>
          </Animated.View>

          {/* Call buttons (only if active chat) */}
          {user.hasActiveChat && user.isVerified && (
            <Animated.View entering={FadeInDown.delay(250).duration(400)} style={styles.callButtons}>
              <TouchableOpacity
                onPress={() => router.push(`/audio-call`)}
                style={styles.callBtn}
              >
                <LinearGradient
                  colors={['#22C55E20', '#22C55E08']}
                  style={styles.callBtnGradient}
                >
                  <Ionicons name="call" size={20} color={colors.success} />
                  <Text style={[styles.callBtnText, { color: colors.success }]}>Audio</Text>
                </LinearGradient>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => router.push(`/video-call`)}
                style={styles.callBtn}
              >
                <LinearGradient
                  colors={[colors.accent + '20', colors.accent + '08']}
                  style={styles.callBtnGradient}
                >
                  <Ionicons name="videocam" size={20} color={colors.accent} />
                  <Text style={[styles.callBtnText, { color: colors.accent }]}>Video</Text>
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>
          )}

          {/* Divider */}
          <View style={styles.divider} />

          {/* Bio */}
          {user.bio ? (
            <Animated.View entering={FadeInDown.delay(300).duration(400)} style={styles.section}>
              <Text style={styles.sectionTitle}>About</Text>
              <Text style={styles.bioText}>{user.bio}</Text>
            </Animated.View>
          ) : null}

          {/* Mutual Interests */}
          {mutualInterests.length > 0 && (
            <Animated.View entering={FadeInDown.delay(350).duration(400)} style={styles.section}>
              <View style={styles.mutualHeader}>
                <Ionicons name="heart" size={16} color={colors.primary} />
                <Text style={styles.mutualTitle}>
                  {mutualInterests.length} shared interest{mutualInterests.length > 1 ? 's' : ''}
                </Text>
              </View>
              <View style={styles.chipsWrap}>
                {mutualInterests.map((interest) => (
                  <InterestChip key={interest} interest={interest} highlighted />
                ))}
              </View>
            </Animated.View>
          )}

          {/* All Interests */}
          {user.interests.length > 0 && (
            <Animated.View entering={FadeInDown.delay(400).duration(400)} style={styles.section}>
              <Text style={styles.sectionTitle}>Interests</Text>
              <View style={styles.chipsWrap}>
                {user.interests.map((interest) => (
                  <InterestChip
                    key={interest}
                    interest={interest}
                    highlighted={mutualInterests.includes(interest)}
                  />
                ))}
              </View>
            </Animated.View>
          )}

          {/* Member since */}
          <Animated.View entering={FadeInDown.delay(450).duration(400)} style={styles.section}>
            <View style={styles.memberRow}>
              <Ionicons name="calendar-outline" size={14} color={colors.subtext} />
              <Text style={styles.memberText}>
                Member since {formatMemberSince(user.createdAt)}
              </Text>
            </View>
            {user.isPremium && (
              <View style={styles.premiumBadge}>
                <LinearGradient
                  colors={colors.gradients.neon as [string, string]}
                  style={styles.premiumGradient}
                >
                  <Ionicons name="diamond" size={12} color={colors.text} />
                  <Text style={styles.premiumText}>Premium</Text>
                </LinearGradient>
              </View>
            )}
          </Animated.View>

          <View style={{ height: 48 }} />
        </View>
      </ScrollView>

      {/* Report / Block Menu Modal */}
      <Modal
        visible={menuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <Pressable style={styles.menuOverlay} onPress={() => setMenuVisible(false)}>
          <Pressable onPress={() => {}} style={styles.menuSheet}>
            <BlurView intensity={90} tint="dark" style={StyleSheet.absoluteFill} />
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>{user.name}</Text>

              <TouchableOpacity onPress={handleReport} style={styles.menuItem}>
                <Ionicons name="flag-outline" size={20} color={colors.warning} />
                <Text style={[styles.menuItemText, { color: colors.warning }]}>Report</Text>
              </TouchableOpacity>

              <View style={styles.menuDivider} />

              <TouchableOpacity onPress={handleBlock} style={styles.menuItem}>
                <Ionicons name="ban-outline" size={20} color={colors.danger} />
                <Text style={[styles.menuItemText, { color: colors.danger }]}>Block</Text>
              </TouchableOpacity>

              <View style={styles.menuDivider} />

              <TouchableOpacity
                onPress={() => setMenuVisible(false)}
                style={[styles.menuItem, { justifyContent: 'center' }]}
              >
                <Text style={[styles.menuItemText, { color: colors.subtext }]}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  loadingText: {
    fontSize: 16,
    color: colors.subtext,
    fontWeight: '600',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  errorEmoji: {
    fontSize: 56,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
  },
  errorBackBtn: {
    marginTop: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.primary + '20',
  },
  errorBackText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.primary,
  },
  // Carousel
  carouselContainer: {
    width: SCREEN_WIDTH,
    height: PHOTO_HEIGHT,
    position: 'relative',
  },
  carouselTopControls: {
    position: 'absolute',
    top: 48,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    zIndex: 10,
  },
  glassBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  carouselCounter: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  counterText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
    zIndex: 1,
  },
  dotRow: {
    position: 'absolute',
    bottom: 16,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    zIndex: 10,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  dotActive: {
    width: 20,
    backgroundColor: colors.text,
  },
  // Profile Info
  profileInfoSection: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    marginTop: -24,
    paddingTop: 24,
    paddingHorizontal: 20,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    marginBottom: 12,
  },
  userName: {
    fontSize: 30,
    fontWeight: '900',
    color: colors.text,
    letterSpacing: -0.5,
  },
  userAge: {
    fontSize: 24,
    fontWeight: '600',
    color: colors.subtext,
  },
  verifiedBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
    alignSelf: 'center',
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  statusChipEmoji: {
    fontSize: 13,
  },
  statusChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  onlineDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: colors.success,
  },
  // Action buttons
  actionButtons: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  pingBtnWrapper: {
    flex: 1,
    height: 52,
    borderRadius: 16,
    overflow: 'hidden',
  },
  pingGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 20,
  },
  pingBtnText: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.text,
  },
  blockBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 20,
    height: 52,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  blockBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.subtext,
  },
  // Call buttons
  callButtons: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  callBtn: {
    flex: 1,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  callBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
  },
  callBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginBottom: 20,
  },
  // Bio
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.subtext,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 10,
  },
  bioText: {
    fontSize: 16,
    color: colors.text,
    lineHeight: 26,
    fontWeight: '400',
  },
  // Mutual interests
  mutualHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  mutualTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
  // Interest chips
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  interestChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  interestText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.subtext,
  },
  // Member since
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  memberText: {
    fontSize: 13,
    color: colors.subtext,
  },
  premiumBadge: {
    alignSelf: 'flex-start',
    borderRadius: 10,
    overflow: 'hidden',
  },
  premiumGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  premiumText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.text,
  },
  // Menu modal
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  menuSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: colors.border,
  },
  menuContent: {
    padding: 8,
    paddingTop: 16,
    paddingBottom: 32,
  },
  menuTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.subtext,
    textAlign: 'center',
    paddingBottom: 12,
    letterSpacing: 0.5,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 14,
  },
  menuItemText: {
    fontSize: 16,
    fontWeight: '600',
  },
  menuDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginHorizontal: 16,
  },
});
