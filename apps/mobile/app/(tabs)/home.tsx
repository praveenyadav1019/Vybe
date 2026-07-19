import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, StatusBar, TouchableOpacity,
  ActivityIndicator, Dimensions, Modal,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, withTiming,
  runOnJS, interpolate, Extrapolation,
} from 'react-native-reanimated';
import { GestureDetector, Gesture, GestureHandlerRootView } from 'react-native-gesture-handler';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../../src/stores/authStore';
import { api } from '../../src/lib/api';
import { photoUri } from '../../src/lib/photo';
import { ScreenGradient } from '../../src/components/ui/ScreenGradient';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const SWIPE_THRESHOLD = SCREEN_W * 0.28;
const CARD_W = SCREEN_W - 32;

// ─── Tokens ──────────────────────────────────────────────────────────────────
const ink = '#111827';
const inkSec = '#6B7280';
const brand = '#7C3AED';
const white = '#FFFFFF';
const like = '#22C55E';
const nope = '#EF4444';
const superBlue = '#3B9EFF';

// ─── Feed types ────────────────────────────────────────────────────────────────
interface FeedUser {
  id: string;
  name: string;
  age?: number;
  photoUrl?: string;
  photos: string[];
  interests: string[];
  verified: boolean;
  mode: string;
  isOnline: boolean;
  distanceBucket: string;
}

type Decision = 'like' | 'pass' | 'superlike';

// ─── Card ────────────────────────────────────────────────────────────────────
function Card({ user, style, badgeOpacity }: {
  user: FeedUser;
  style?: any;
  badgeOpacity?: { like: any; nope: any; superlike: any };
}) {
  const photo = photoUri(user.photos?.[0] ?? user.photoUrl);
  return (
    <Animated.View style={[styles.card, style]}>
      {photo ? (
        <Image source={{ uri: photo }} style={StyleSheet.absoluteFillObject} contentFit="cover" transition={150} />
      ) : (
        <View style={[StyleSheet.absoluteFillObject, styles.cardFallback]}>
          <Ionicons name="person" size={72} color={brand} />
        </View>
      )}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.05)', 'rgba(0,0,0,0.82)']}
        locations={[0.4, 0.6, 1]}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Swipe badges */}
      {badgeOpacity && (
        <>
          <Animated.View style={[styles.badge, styles.badgeLike, badgeOpacity.like]}>
            <Text style={[styles.badgeText, { color: like }]}>LIKE</Text>
          </Animated.View>
          <Animated.View style={[styles.badge, styles.badgeNope, badgeOpacity.nope]}>
            <Text style={[styles.badgeText, { color: nope }]}>NOPE</Text>
          </Animated.View>
          <Animated.View style={[styles.badge, styles.badgeSuper, badgeOpacity.superlike]}>
            <Text style={[styles.badgeText, { color: superBlue }]}>SUPER</Text>
          </Animated.View>
        </>
      )}

      {user.isOnline && (
        <View style={styles.onlinePill}>
          <View style={styles.onlineDot} />
          <Text style={styles.onlineText}>Online</Text>
        </View>
      )}

      <View style={styles.cardInfo}>
        <View style={styles.nameRow}>
          <Text style={styles.cardName} numberOfLines={1}>
            {user.name}{user.age ? `, ${user.age}` : ''}
          </Text>
          {user.verified && <Ionicons name="checkmark-circle" size={20} color="#4FC3F7" />}
        </View>
        <View style={styles.metaRow}>
          <Ionicons name="location" size={13} color="rgba(255,255,255,0.85)" />
          <Text style={styles.cardMeta}>{user.distanceBucket}</Text>
        </View>
        {user.interests?.length > 0 && (
          <View style={styles.chipRow}>
            {user.interests.slice(0, 3).map((it) => (
              <View key={it} style={styles.chip}><Text style={styles.chipText}>{it}</Text></View>
            ))}
          </View>
        )}
      </View>
    </Animated.View>
  );
}

// ─── Screen ──────────────────────────────────────────────────────────────────
export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const firstName = (user?.name ?? 'there').split(' ')[0];

  const [cards, setCards] = useState<FeedUser[]>([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [match, setMatch] = useState<{ name: string; photo?: string } | null>(null);

  const tx = useSharedValue(0);
  const ty = useSharedValue(0);

  const loadFeed = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get<{ items: FeedUser[] }>('/discovery/feed', { params: { limit: 30 } });
      setCards(data.items ?? []);
      setIndex(0);
    } catch {
      setCards([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadFeed(); }, [loadFeed]);

  // Advance to the next card and fire the like/superlike request.
  const decide = useCallback((card: FeedUser, kind: Decision) => {
    tx.value = 0;
    ty.value = 0;
    setIndex((i) => i + 1);
    if (kind === 'pass') return;
    api.post<{ matched?: boolean }>(`/users/${card.id}/ping`, kind === 'superlike' ? { superlike: true } : {})
      .then(({ data }) => {
        if (data?.matched) setMatch({ name: card.name, photo: card.photos?.[0] ?? card.photoUrl });
      })
      .catch(() => {/* already liked / rate-limited — ignore */});
  }, [tx, ty]);

  const top = cards[index];
  const next = cards[index + 1];

  const triggerSwipe = useCallback((kind: Decision) => {
    if (!top) return;
    if (kind === 'like') tx.value = withTiming(SCREEN_W * 1.5, { duration: 240 }, () => runOnJS(decide)(top, 'like'));
    else if (kind === 'pass') tx.value = withTiming(-SCREEN_W * 1.5, { duration: 240 }, () => runOnJS(decide)(top, 'pass'));
    else ty.value = withTiming(-SCREEN_H, { duration: 260 }, () => runOnJS(decide)(top, 'superlike'));
  }, [top, tx, ty, decide]);

  const pan = Gesture.Pan()
    .enabled(!!top)
    .onUpdate((e) => {
      tx.value = e.translationX;
      ty.value = e.translationY;
    })
    .onEnd((e) => {
      if (e.translationX > SWIPE_THRESHOLD) {
        tx.value = withTiming(SCREEN_W * 1.5, { duration: 240 }, () => top && runOnJS(decide)(top, 'like'));
      } else if (e.translationX < -SWIPE_THRESHOLD) {
        tx.value = withTiming(-SCREEN_W * 1.5, { duration: 240 }, () => top && runOnJS(decide)(top, 'pass'));
      } else if (e.translationY < -SWIPE_THRESHOLD) {
        ty.value = withTiming(-SCREEN_H, { duration: 260 }, () => top && runOnJS(decide)(top, 'superlike'));
      } else {
        tx.value = withSpring(0);
        ty.value = withSpring(0);
      }
    });

  const topStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: tx.value },
      { translateY: ty.value },
      { rotate: `${interpolate(tx.value, [-SCREEN_W, SCREEN_W], [-12, 12], Extrapolation.CLAMP)}deg` },
    ],
  }));
  const nextStyle = useAnimatedStyle(() => {
    const p = Math.min(Math.abs(tx.value) / SCREEN_W, 1);
    return { transform: [{ scale: interpolate(p, [0, 1], [0.94, 1]) }] };
  });
  const badgeOpacity = {
    like: useAnimatedStyle(() => ({ opacity: interpolate(tx.value, [10, SWIPE_THRESHOLD], [0, 1], Extrapolation.CLAMP) })),
    nope: useAnimatedStyle(() => ({ opacity: interpolate(tx.value, [-SWIPE_THRESHOLD, -10], [1, 0], Extrapolation.CLAMP) })),
    superlike: useAnimatedStyle(() => ({ opacity: interpolate(ty.value, [-SWIPE_THRESHOLD, -10], [1, 0], Extrapolation.CLAMP) })),
  };

  return (
    <GestureHandlerRootView style={styles.root}>
      <ScreenGradient />
      <StatusBar barStyle="dark-content" backgroundColor="#F3ECFF" />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity style={styles.headerAvatar} onPress={() => router.push('/(tabs)/profile' as any)} activeOpacity={0.85}>
          {user?.photos?.[0]
            ? <Image source={{ uri: photoUri(user.photos[0], { size: 40 }) }} style={styles.headerAvatarImg} contentFit="cover" />
            : <Ionicons name="person" size={18} color={brand} />}
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.greeting}>Discover</Text>
          <Text style={styles.greetingName}>Hi {firstName} 👋</Text>
        </View>
        <TouchableOpacity style={styles.iconBtn} onPress={() => router.push('/(app)/connections' as any)} activeOpacity={0.75}>
          <Ionicons name="people" size={22} color={ink} />
        </TouchableOpacity>
      </View>

      {/* Deck */}
      <View style={styles.deck}>
        {loading ? (
          <ActivityIndicator color={brand} size="large" />
        ) : !top ? (
          <View style={styles.empty}>
            <Ionicons name="sparkles-outline" size={56} color={brand} />
            <Text style={styles.emptyTitle}>You're all caught up</Text>
            <Text style={styles.emptySub}>No more people nearby right now. Check back soon or widen your radius.</Text>
            <TouchableOpacity style={styles.reloadBtn} onPress={loadFeed} activeOpacity={0.85}>
              <Text style={styles.reloadText}>Refresh</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {next && <Card user={next} style={[styles.stacked, nextStyle]} />}
            <GestureDetector gesture={pan}>
              <Card user={top} style={topStyle} badgeOpacity={badgeOpacity} />
            </GestureDetector>
          </>
        )}
      </View>

      {/* Action buttons */}
      {!loading && top && (
        <View style={[styles.actions, { paddingBottom: insets.bottom + 90 }]}>
          <TouchableOpacity style={[styles.actionBtn, styles.passBtn]} onPress={() => triggerSwipe('pass')} activeOpacity={0.8}>
            <Ionicons name="close" size={30} color={nope} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, styles.superBtn]} onPress={() => triggerSwipe('superlike')} activeOpacity={0.8}>
            <Ionicons name="star" size={24} color={superBlue} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, styles.likeBtn]} onPress={() => triggerSwipe('like')} activeOpacity={0.8}>
            <Ionicons name="heart" size={28} color={like} />
          </TouchableOpacity>
        </View>
      )}

      {/* It's a Match overlay */}
      <Modal visible={!!match} transparent animationType="fade" onRequestClose={() => setMatch(null)}>
        <View style={styles.matchOverlay}>
          <Text style={styles.matchTitle}>It's a Match! 🎉</Text>
          <Text style={styles.matchSub}>You and {match?.name} liked each other</Text>
          {match?.photo && <Image source={{ uri: photoUri(match.photo, { size: 150 }) }} style={styles.matchPhoto} contentFit="cover" />}
          <TouchableOpacity
            style={styles.matchBtnPrimary}
            onPress={() => { setMatch(null); router.push('/(app)/connections' as any); }}
            activeOpacity={0.88}
          >
            <Text style={styles.matchBtnPrimaryText}>See Connections</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setMatch(null)} activeOpacity={0.7}>
            <Text style={styles.matchBtnGhost}>Keep swiping</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </GestureHandlerRootView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const CARD_H = SCREEN_H * 0.62;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F7F2FF' },

  header: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 20, paddingBottom: 10, backgroundColor: 'transparent',
  },
  headerAvatar: {
    width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.6)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.8)',
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  headerAvatarImg: { width: 38, height: 38 },
  greeting: { fontSize: 12, color: inkSec },
  greetingName: { fontSize: 18, fontWeight: '700', color: ink },
  iconBtn: {
    width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.6)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.8)',
  },

  deck: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 8 },
  card: {
    position: 'absolute',
    width: CARD_W, height: CARD_H,
    borderRadius: 24, overflow: 'hidden', backgroundColor: '#EDE9FE',
    shadowColor: '#000', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15, shadowRadius: 16, elevation: 6,
  },
  stacked: {},
  cardFallback: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#EDE9FE' },

  onlinePill: {
    position: 'absolute', top: 14, left: 14,
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(0,0,0,0.4)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
  },
  onlineDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: like },
  onlineText: { color: white, fontSize: 11, fontWeight: '600' },

  cardInfo: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: 20 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardName: { fontSize: 26, fontWeight: '800', color: white },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  cardMeta: { color: 'rgba(255,255,255,0.9)', fontSize: 13 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 },
  chip: {
    backgroundColor: 'rgba(255,255,255,0.22)', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 5,
  },
  chipText: { color: white, fontSize: 12, fontWeight: '600' },

  badge: {
    position: 'absolute', top: 40, borderWidth: 4, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 6,
  },
  badgeText: { fontSize: 28, fontWeight: '900', letterSpacing: 2 },
  badgeLike: { left: 24, borderColor: like, transform: [{ rotate: '-18deg' }] },
  badgeNope: { right: 24, borderColor: nope, transform: [{ rotate: '18deg' }] },
  badgeSuper: { alignSelf: 'center', left: 0, right: 0, marginHorizontal: 'auto', borderColor: superBlue, top: 60 },

  actions: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 22,
    paddingTop: 8,
  },
  actionBtn: {
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: 999,
    shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18, shadowRadius: 12, elevation: 5,
  },
  passBtn: { width: 60, height: 60, borderWidth: 1, borderColor: '#FEE2E2' },
  superBtn: { width: 50, height: 50, borderWidth: 1, borderColor: '#DBEAFE' },
  likeBtn: { width: 60, height: 60, borderWidth: 1, borderColor: '#DCFCE7' },

  empty: { alignItems: 'center', paddingHorizontal: 40, gap: 10 },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: ink, marginTop: 8 },
  emptySub: { fontSize: 14, color: inkSec, textAlign: 'center', lineHeight: 21 },
  reloadBtn: {
    marginTop: 12, backgroundColor: brand, borderRadius: 999,
    paddingHorizontal: 28, paddingVertical: 12,
  },
  reloadText: { color: white, fontWeight: '700', fontSize: 15 },

  matchOverlay: {
    flex: 1, backgroundColor: 'rgba(124,58,237,0.96)',
    alignItems: 'center', justifyContent: 'center', padding: 32, gap: 16,
  },
  matchTitle: { fontSize: 34, fontWeight: '900', color: white, textAlign: 'center' },
  matchSub: { fontSize: 16, color: 'rgba(255,255,255,0.9)', textAlign: 'center' },
  matchPhoto: { width: 140, height: 140, borderRadius: 70, borderWidth: 4, borderColor: white, marginVertical: 12 },
  matchBtnPrimary: { backgroundColor: white, borderRadius: 999, paddingHorizontal: 40, paddingVertical: 15 },
  matchBtnPrimaryText: { color: brand, fontWeight: '800', fontSize: 16 },
  matchBtnGhost: { color: 'rgba(255,255,255,0.9)', fontWeight: '600', fontSize: 15, marginTop: 6 },
});
