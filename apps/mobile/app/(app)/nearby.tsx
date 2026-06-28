import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, FlatList, Image,
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

// ─── Premium light tokens ───────────────────────────────────────────────────────
const C = {
  bg: '#FBFAFD',
  card: '#FFFFFF',
  border: '#EFEDF5',
  primary: '#7C3AED',
  primarySoft: '#F4F1FE',
  text: '#15131D',
  sub: '#6B6577',
  muted: '#A6A1B2',
  danger: '#EF4444',
  success: '#22C55E',
};
const GRAD: [string, string] = ['#7C3AED', '#6D28D9'];

type Gender = 'all' | 'female' | 'male';

const GENDERS: { key: Gender; label: string }[] = [
  { key: 'all',    label: 'All' },
  { key: 'female', label: 'Female' },
  { key: 'male',   label: 'Male' },
];

const NEARBY_PEOPLE = [
  { id: '1', name: 'Aanya', age: 24, photo: 'https://randomuser.me/api/portraits/women/1.jpg', distance: '50 m',  gender: 'female', verified: true,  isOnline: true,  isLive: true,  interests: ['Music', 'Travel'] },
  { id: '2', name: 'Priya', age: 23, photo: 'https://randomuser.me/api/portraits/women/2.jpg', distance: '120 m', gender: 'female', verified: true,  isOnline: true,  isLive: false, interests: ['Food', 'Travel'] },
  { id: '3', name: 'Rahul', age: 27, photo: 'https://randomuser.me/api/portraits/men/1.jpg',   distance: '200 m', gender: 'male',   verified: false, isOnline: false, isLive: false, interests: ['Cricket', 'Music'] },
  { id: '4', name: 'Sneha', age: 25, photo: 'https://randomuser.me/api/portraits/women/3.jpg', distance: '300 m', gender: 'female', verified: true,  isOnline: true,  isLive: true,  interests: ['Travel', 'Hiking'] },
  { id: '5', name: 'Dev',   age: 26, photo: 'https://randomuser.me/api/portraits/men/2.jpg',   distance: '450 m', gender: 'male',   verified: true,  isOnline: true,  isLive: false, interests: ['Music', 'Clubs'] },
  { id: '6', name: 'Zara',  age: 22, photo: 'https://randomuser.me/api/portraits/women/4.jpg', distance: '500 m', gender: 'female', verified: true,  isOnline: true,  isLive: false, interests: ['Art', 'Coffee'] },
];

type Person = typeof NEARBY_PEOPLE[0];

// ─── Ping toast ─────────────────────────────────────────────────────────────────
type ToastInfo = { name: string; photo: string; message: string };

function PingToast({ info, onDismiss }: { info: ToastInfo; onDismiss: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 4000);
    return () => clearTimeout(t);
  }, [onDismiss]);
  return (
    <Animated.View entering={FadeIn} exiting={FadeOut} style={styles.toast}>
      <LinearGradient colors={GRAD} style={styles.toastGrad}>
        <Image source={{ uri: info.photo }} style={styles.toastPhoto} />
        <View style={styles.toastInfo}>
          <Text style={styles.toastName}>{info.name} pinged you! 💜</Text>
          <Text style={styles.toastMsg} numberOfLines={1}>{info.message}</Text>
        </View>
        <TouchableOpacity onPress={onDismiss} style={styles.toastClose}>
          <Ionicons name="close" size={16} color="#FFF" />
        </TouchableOpacity>
      </LinearGradient>
    </Animated.View>
  );
}

// ─── Live badge ─────────────────────────────────────────────────────────────────
function LiveBadge() {
  const scale = useSharedValue(1);
  useEffect(() => {
    scale.value = withRepeat(withSequence(withTiming(1.25, { duration: 600 }), withTiming(1, { duration: 600 })), -1, false);
    return () => cancelAnimation(scale);
  }, []);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <View style={styles.liveBadge}>
      <Animated.View style={[styles.livePulseDot, animStyle]} />
      <Text style={styles.liveBadgeText}>LIVE</Text>
    </View>
  );
}

// ─── Person card ────────────────────────────────────────────────────────────────
function PersonCard({ person, index, onPress, onPing, onChat, pinged }: {
  person: Person; index: number; onPress: () => void; onPing: () => void; onChat: () => void; pinged: boolean;
}) {
  const pingScale = useSharedValue(1);
  const handlePing = () => {
    pingScale.value = withSequence(withSpring(1.4, { damping: 6 }), withSpring(1, { damping: 8 }));
    onPing();
  };
  const pingStyle = useAnimatedStyle(() => ({ transform: [{ scale: pingScale.value }] }));

  return (
    <Animated.View entering={FadeInDown.delay(index * 55).duration(380)}>
      <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.92}>
        {/* Photo */}
        <View style={styles.photoWrap}>
          <Image source={{ uri: person.photo }} style={styles.photo} resizeMode="cover" />
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.28)']}
            style={StyleSheet.absoluteFillObject}
          />
          {person.isLive
            ? <View style={styles.liveOnPhoto}><LiveBadge /></View>
            : person.isOnline && <View style={styles.onlinePill}><View style={styles.onlineDot} /><Text style={styles.onlineText}>Online</Text></View>}
        </View>

        {/* Info */}
        <View style={styles.info}>
          <View style={styles.nameRow}>
            <Text style={styles.name} numberOfLines={1}>{person.name}</Text>
            <Text style={styles.age}>{person.age}</Text>
            {person.verified && <Ionicons name="checkmark-circle" size={16} color={C.primary} style={{ marginLeft: 2 }} />}
          </View>

          <View style={styles.distancePill}>
            <Ionicons name="navigate" size={11} color={C.primary} />
            <Text style={styles.distanceText}>{person.distance} away</Text>
          </View>

          <View style={styles.interestRow}>
            {person.interests.slice(0, 2).map((it) => (
              <View key={it} style={styles.interestChip}>
                <Text style={styles.interestText}>{it}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity style={styles.chatBtn} onPress={onChat} activeOpacity={0.85}>
            <Ionicons name="chatbubble-ellipses" size={17} color={C.primary} />
          </TouchableOpacity>
          <TouchableOpacity activeOpacity={0.85} onPress={handlePing}>
            <Animated.View style={pingStyle}>
              {pinged ? (
                <LinearGradient colors={GRAD} style={styles.likeBtn}>
                  <Ionicons name="heart" size={17} color="#FFF" />
                </LinearGradient>
              ) : (
                <View style={[styles.likeBtn, styles.likeBtnIdle]}>
                  <Ionicons name="heart-outline" size={17} color={C.primary} />
                </View>
              )}
            </Animated.View>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function NearbyScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [gender, setGender] = useState<Gender>('all');
  const [pingToast, setPingToast] = useState<ToastInfo | null>(null);
  const [pingedIds, setPingedIds] = useState<Set<string>>(new Set());
  const [people] = useState(NEARBY_PEOPLE);

  const filtered = gender === 'all' ? people : people.filter((p) => p.gender === gender);
  const onlineCount = filtered.filter((p) => p.isOnline).length;

  const dismissToast = useCallback(() => setPingToast(null), []);
  const handlePing = useCallback((person: Person) => {
    setPingedIds((prev) => new Set([...prev, person.id]));
    socketClient.emit('user:ping', { userId: person.id });
  }, []);
  const handleChat = useCallback((person: Person) => {
    router.push(`/(app)/user/${person.id}` as any);
  }, [router]);

  useEffect(() => {
    const handlePingReceived = (...args: unknown[]) => {
      const data = args[0] as { fromName: string; fromPhoto: string; message: string };
      setPingToast({
        name: data.fromName,
        photo: data.fromPhoto || 'https://randomuser.me/api/portraits/lego/1.jpg',
        message: data.message || 'Sent you a ping!',
      });
    };
    socketClient.on('ping:received', handlePingReceived);
    return () => { socketClient.off('ping:received', handlePingReceived); };
  }, []);

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="chevron-back" size={24} color={C.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>People Nearby</Text>
          <Text style={styles.headerSub}>{onlineCount} online now</Text>
        </View>
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{filtered.length}</Text>
        </View>
      </View>

      {/* SEGMENTED FILTER (fixed, equal width — no overlap) */}
      <View style={styles.segment}>
        {GENDERS.map((g) => {
          const active = gender === g.key;
          return (
            <TouchableOpacity
              key={g.key}
              style={styles.segmentBtn}
              onPress={() => setGender(g.key)}
              activeOpacity={0.9}
            >
              {active ? (
                <LinearGradient colors={GRAD} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.segmentFill}>
                  <Text style={styles.segmentTextActive}>{g.label}</Text>
                </LinearGradient>
              ) : (
                <Text style={styles.segmentText}>{g.label}</Text>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* LIST */}
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
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="people-outline" size={48} color={C.border} />
            <Text style={styles.emptyText}>No {gender !== 'all' ? `${gender} ` : ''}people nearby</Text>
          </View>
        }
      />

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

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 6, paddingBottom: 10,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: C.card, borderWidth: 1, borderColor: C.border,
    alignItems: 'center', justifyContent: 'center',
  },
  headerCenter: { flex: 1, marginLeft: 12 },
  headerTitle: { fontSize: 21, fontWeight: '800', color: C.text, letterSpacing: -0.4 },
  headerSub: { fontSize: 12, color: C.sub, marginTop: 1 },
  countBadge: {
    minWidth: 36, height: 32, borderRadius: 16,
    paddingHorizontal: 10,
    backgroundColor: C.primarySoft,
    alignItems: 'center', justifyContent: 'center',
  },
  countText: { fontSize: 14, fontWeight: '800', color: C.primary },

  // Segmented control
  segment: {
    flexDirection: 'row',
    marginHorizontal: 16, marginBottom: 14,
    padding: 4, borderRadius: 16,
    backgroundColor: '#F1EFF7',
  },
  segmentBtn: { flex: 1, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  segmentFill: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 12, alignItems: 'center', justifyContent: 'center',
  },
  segmentText: { fontSize: 14, fontWeight: '600', color: C.sub },
  segmentTextActive: { fontSize: 14, fontWeight: '700', color: '#FFF' },

  listContent: { paddingHorizontal: 16, paddingBottom: 110, gap: 14 },

  // Card
  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.card, borderRadius: 22,
    borderWidth: 1, borderColor: C.border,
    padding: 10,
    shadowColor: '#7C3AED', shadowOpacity: 0.07, shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 }, elevation: 3,
  },
  photoWrap: { width: 84, height: 100, borderRadius: 16, overflow: 'hidden', backgroundColor: C.primarySoft },
  photo: { width: 84, height: 100 },
  onlinePill: {
    position: 'absolute', bottom: 6, alignSelf: 'center',
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(0,0,0,0.42)', borderRadius: 999,
    paddingHorizontal: 7, paddingVertical: 3,
  },
  onlineDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.success },
  onlineText: { fontSize: 9, fontWeight: '700', color: '#FFF' },
  liveOnPhoto: { position: 'absolute', bottom: 6, alignSelf: 'center' },
  liveBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(239,68,68,0.95)', borderRadius: 999,
    paddingHorizontal: 7, paddingVertical: 3,
  },
  livePulseDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#FFF' },
  liveBadgeText: { fontSize: 9, fontWeight: '800', color: '#FFF', letterSpacing: 0.5 },

  // Info
  info: { flex: 1, paddingLeft: 14, paddingRight: 8, gap: 7 },
  nameRow: { flexDirection: 'row', alignItems: 'center' },
  name: { fontSize: 16, fontWeight: '800', color: C.text, letterSpacing: -0.3, flexShrink: 1 },
  age: { fontSize: 16, fontWeight: '500', color: C.sub, marginLeft: 5 },
  distancePill: {
    flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start',
    backgroundColor: C.primarySoft, borderRadius: 999,
    paddingHorizontal: 9, paddingVertical: 4,
  },
  distanceText: { fontSize: 11, fontWeight: '600', color: C.primary },
  interestRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  interestChip: { backgroundColor: '#F4F4F6', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  interestText: { fontSize: 10, fontWeight: '600', color: C.sub },

  // Actions
  actions: { gap: 10, paddingRight: 4 },
  chatBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: C.primarySoft, alignItems: 'center', justifyContent: 'center',
  },
  likeBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  likeBtnIdle: { backgroundColor: C.primarySoft },

  empty: { alignItems: 'center', marginTop: 80, gap: 12 },
  emptyText: { fontSize: 15, color: C.sub },

  // Toast
  toastContainer: { position: 'absolute', left: 16, right: 16, zIndex: 100 },
  toast: {
    borderRadius: 18, overflow: 'hidden',
    shadowColor: C.primary, shadowOpacity: 0.3, shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 }, elevation: 8,
  },
  toastGrad: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 18 },
  toastPhoto: { width: 44, height: 44, borderRadius: 22, borderWidth: 2, borderColor: '#FFF' },
  toastInfo: { flex: 1 },
  toastName: { fontSize: 14, fontWeight: '700', color: '#FFF' },
  toastMsg: { fontSize: 12, color: 'rgba(255,255,255,0.85)', marginTop: 1 },
  toastClose: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center',
  },
});
