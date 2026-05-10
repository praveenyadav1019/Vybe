import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, FlatList, Image, ScrollView,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  FadeInDown, FadeIn, FadeOut, useSharedValue, useAnimatedStyle,
  withRepeat, withSequence, withSpring, withTiming, cancelAnimation,
} from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { socketClient } from '@/lib/socket';

const { width: W } = Dimensions.get('window');

const C = {
  bg: '#0A0A0A',
  card: '#121212',
  border: '#1F1F1F',
  primary: '#7C3AED',
  accent: '#00E5FF',
  pink: '#FF2DAF',
  text: '#FFFFFF',
  sub: '#A1A1AA',
  danger: '#EF4444',
  success: '#22C55E',
};

const NEARBY_PEOPLE = [
  { id: '1', name: 'Aanya', age: 24, photo: 'https://randomuser.me/api/portraits/women/1.jpg', distance: '~50m', mode: 'Night Out', verified: true, isOnline: true, isLive: true, bio: 'Love music and good vibes ✨', interests: ['Music', 'Travel', 'Party'] },
  { id: '2', name: 'Priya', age: 23, photo: 'https://randomuser.me/api/portraits/women/2.jpg', distance: '~120m', mode: 'Dating', verified: true, isOnline: true, isLive: false, bio: 'Foodie & travel junkie 🌍', interests: ['Food', 'Travel', 'Movies'] },
  { id: '3', name: 'Rahul', age: 27, photo: 'https://randomuser.me/api/portraits/men/1.jpg', distance: '~200m', mode: 'Casual', verified: false, isOnline: false, isLive: false, bio: 'Cricket fan & music lover 🎵', interests: ['Cricket', 'Music', 'Movies'] },
  { id: '4', name: 'Sneha', age: 25, photo: 'https://randomuser.me/api/portraits/women/3.jpg', distance: '~300m', mode: 'Co-Travel', verified: true, isOnline: true, isLive: true, bio: 'Adventure seeker ✈️', interests: ['Travel', 'Hiking', 'Photography'] },
  { id: '5', name: 'Dev', age: 26, photo: 'https://randomuser.me/api/portraits/men/2.jpg', distance: '~450m', mode: 'Club Mates', verified: true, isOnline: true, isLive: false, bio: 'DJ & nightlife enthusiast 🎧', interests: ['Music', 'Clubs', 'Dancing'] },
  { id: '6', name: 'Zara', age: 22, photo: 'https://randomuser.me/api/portraits/women/4.jpg', distance: '~500m', mode: 'Dating', verified: true, isOnline: true, isLive: false, bio: 'Artist & coffee addict ☕', interests: ['Art', 'Coffee', 'Fashion'] },
];

const FILTERS = ['All', 'Dating', 'Night Out', 'Co-Travel', 'Club Mates'];

type Person = typeof NEARBY_PEOPLE[0];

// ─── In-app Toast Notification ────────────────────────────────────────────────

type ToastInfo = { name: string; photo: string; message: string };

function PingToast({ info, onDismiss }: { info: ToastInfo; onDismiss: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 4000);
    return () => clearTimeout(t);
  }, [onDismiss]);

  return (
    <Animated.View entering={FadeIn} exiting={FadeOut} style={styles.toast}>
      <LinearGradient colors={['#1A0533', '#2A1050']} style={styles.toastGrad}>
        <Image source={{ uri: info.photo }} style={styles.toastPhoto} />
        <View style={styles.toastInfo}>
          <Text style={styles.toastName}>{info.name} pinged you! 💜</Text>
          <Text style={styles.toastMsg} numberOfLines={1}>{info.message}</Text>
        </View>
        <TouchableOpacity onPress={onDismiss} style={styles.toastClose}>
          <Ionicons name="close" size={16} color={C.sub} />
        </TouchableOpacity>
      </LinearGradient>
    </Animated.View>
  );
}

// ─── Live Pulse Badge ─────────────────────────────────────────────────────────

function LiveBadge() {
  const scale = useSharedValue(1);

  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1.2, { duration: 600 }),
        withTiming(1, { duration: 600 })
      ),
      -1,
      false
    );
    return () => cancelAnimation(scale);
  }, []);

  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <View style={styles.liveBadgeWrap}>
      <Animated.View style={[styles.livePulseDot, animStyle]} />
      <Text style={styles.liveBadgeText}>LIVE</Text>
    </View>
  );
}

// ─── Person Card ──────────────────────────────────────────────────────────────

function PersonCard({ person, index, onPress, onPing, onChat, pinged }: {
  person: Person;
  index: number;
  onPress: () => void;
  onPing: () => void;
  onChat: () => void;
  pinged: boolean;
}) {
  const pingScale = useSharedValue(1);

  const handlePing = () => {
    pingScale.value = withSequence(
      withSpring(1.4, { damping: 6 }),
      withSpring(1, { damping: 8 })
    );
    onPing();
  };

  const pingStyle = useAnimatedStyle(() => ({ transform: [{ scale: pingScale.value }] }));

  return (
    <Animated.View entering={FadeInDown.delay(index * 60).duration(400)}>
      <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.88}>
        {/* LEFT: Photo */}
        <View style={styles.cardPhotoWrap}>
          <Image source={{ uri: person.photo }} style={styles.cardPhoto} resizeMode="cover" />
          {person.isOnline && <View style={styles.onlineDot} />}
          {person.isLive && (
            <View style={styles.liveOnPhoto}>
              <LiveBadge />
            </View>
          )}
        </View>

        {/* RIGHT: Info */}
        <View style={styles.cardInfo}>
          <View style={styles.cardTopRow}>
            <Text style={styles.cardName}>{person.name}, {person.age}</Text>
            {person.verified && <Ionicons name="checkmark-circle" size={14} color={C.accent} />}
          </View>

          <View style={styles.cardModeChip}>
            <Text style={styles.cardModeText}>{person.mode}</Text>
          </View>

          <View style={styles.cardLocationRow}>
            <Ionicons name="location-outline" size={11} color={C.sub} />
            <Text style={styles.cardDistanceText}>{person.distance}</Text>
          </View>

          <View style={styles.cardInterestsRow}>
            {person.interests.slice(0, 2).map((interest) => (
              <View key={interest} style={styles.tinyChip}>
                <Text style={styles.tinyChipText}>{interest}</Text>
              </View>
            ))}
          </View>

          <View style={styles.cardActions}>
            <TouchableOpacity style={styles.actionBtnChat} onPress={onChat} activeOpacity={0.8}>
              <Ionicons name="chatbubble" size={14} color={C.primary} />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtnPing, pinged && styles.actionBtnPinged]} onPress={handlePing} activeOpacity={0.8}>
              <Animated.View style={pingStyle}>
                <Ionicons name={pinged ? 'heart' : 'heart-outline'} size={14} color={pinged ? '#FFF' : C.pink} />
              </Animated.View>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function NearbyScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [activeFilter, setActiveFilter] = useState('All');
  const [pingToast, setPingToast] = useState<ToastInfo | null>(null);
  const [pingedIds, setPingedIds] = useState<Set<string>>(new Set());
  const [people, setPeople] = useState(NEARBY_PEOPLE);

  const filtered = activeFilter === 'All'
    ? people
    : people.filter((p) => p.mode === activeFilter);

  const dismissToast = useCallback(() => setPingToast(null), []);

  const handlePing = useCallback((person: Person) => {
    setPingedIds((prev) => new Set([...prev, person.id]));
    socketClient.emit('user:ping', { userId: person.id });
  }, []);

  const handleChat = useCallback((person: Person) => {
    router.push(`/(app)/user/${person.id}` as any);
  }, [router]);

  // Listen for incoming pings from other users
  useEffect(() => {
    const handlePingReceived = (...args: unknown[]) => {
      const data = args[0] as { fromName: string; fromPhoto: string; message: string };
      setPingToast({
        name: data.fromName,
        photo: data.fromPhoto || 'https://randomuser.me/api/portraits/lego/1.jpg',
        message: data.message || 'Sent you a ping!',
      });
    };

    const handleNearbyUpdate = (...args: unknown[]) => {
      const data = args[0] as { users: typeof NEARBY_PEOPLE };
      if (data?.users?.length) setPeople(data.users);
    };

    socketClient.on('ping:received', handlePingReceived);
    socketClient.on('nearby:update', handleNearbyUpdate);

    return () => {
      socketClient.off('ping:received', handlePingReceived);
      socketClient.off('nearby:update', handleNearbyUpdate);
    };
  }, []);

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={C.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>People Nearby</Text>
        <View style={styles.countBadge}>
          <View style={styles.liveHeaderDot} />
          <Text style={styles.countText}>{filtered.length}</Text>
        </View>
      </View>

      {/* FILTER ROW */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
        {FILTERS.map((filter) => (
          <TouchableOpacity
            key={filter}
            style={[styles.filterChip, activeFilter === filter ? styles.filterChipActive : styles.filterChipInactive]}
            onPress={() => setActiveFilter(filter)}
          >
            <Text style={[styles.filterChipText, activeFilter === filter ? styles.filterChipTextActive : styles.filterChipTextInactive]}>
              {filter}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* PEOPLE LIST */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        renderItem={({ item, index }) => (
          <PersonCard
            person={item}
            index={index}
            pinged={pingedIds.has(item.id)}
            onPress={() => router.push(`/(app)/user/${item.id}` as any)}
            onPing={() => handlePing(item)}
            onChat={() => handleChat(item)}
          />
        )}
      />

      {/* PING TOAST */}
      {pingToast && (
        <View style={[styles.toastContainer, { top: insets.top + 8 }]}>
          <PingToast info={pingToast} onDismiss={dismissToast} />
        </View>
      )}
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
  },
  backBtn: { marginRight: 4 },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFF',
    flex: 1,
    marginLeft: 8,
  },
  countBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(124,58,237,0.15)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  liveHeaderDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: C.success,
  },
  countText: { fontSize: 13, fontWeight: '700', color: C.primary },
  filterRow: { paddingHorizontal: 16, paddingVertical: 12 },
  filterChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginRight: 8 },
  filterChipActive: { backgroundColor: C.primary },
  filterChipInactive: { backgroundColor: '#121212', borderWidth: 1, borderColor: '#1F1F1F' },
  filterChipText: { fontSize: 13, fontWeight: '600' },
  filterChipTextActive: { color: '#FFF' },
  filterChipTextInactive: { color: '#A1A1AA' },
  listContent: { paddingHorizontal: 16, paddingBottom: 100, gap: 12 },

  card: { backgroundColor: '#121212', borderRadius: 20, overflow: 'hidden', flexDirection: 'row', height: 120 },
  cardPhotoWrap: { width: 90, height: 120, position: 'relative' },
  cardPhoto: { width: 90, height: 120 },
  onlineDot: {
    position: 'absolute', top: 8, left: 8,
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: C.success, borderWidth: 1.5, borderColor: '#121212',
  },
  liveOnPhoto: {
    position: 'absolute',
    bottom: 6,
    left: 4,
  },
  liveBadgeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(239,68,68,0.85)',
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  livePulseDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#FFF',
  },
  liveBadgeText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#FFF',
    letterSpacing: 0.5,
  },
  cardInfo: { flex: 1, padding: 12, justifyContent: 'space-between' },
  cardTopRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cardName: { fontSize: 15, fontWeight: '700', color: '#FFF' },
  cardModeChip: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(124,58,237,0.15)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  cardModeText: { fontSize: 10, color: C.primary, fontWeight: '600' },
  cardLocationRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  cardDistanceText: { fontSize: 11, color: '#A1A1AA' },
  cardInterestsRow: { flexDirection: 'row', gap: 4 },
  tinyChip: {
    backgroundColor: 'rgba(124,58,237,0.1)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  tinyChipText: { fontSize: 9, color: C.primary, fontWeight: '600' },
  cardActions: { flexDirection: 'row', gap: 8 },
  actionBtnChat: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(124,58,237,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  actionBtnPing: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(255,45,175,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  actionBtnPinged: {
    backgroundColor: C.pink,
  },

  // Toast
  toastContainer: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 100,
  },
  toast: {
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: C.primary,
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  toastGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(124,58,237,0.3)',
    borderRadius: 18,
  },
  toastPhoto: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: C.primary,
  },
  toastInfo: { flex: 1 },
  toastName: { fontSize: 14, fontWeight: '700', color: C.text },
  toastMsg: { fontSize: 12, color: C.sub, marginTop: 1 },
  toastClose: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
