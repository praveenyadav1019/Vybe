import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  FlatList, StatusBar, Alert, ActivityIndicator, RefreshControl,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { api } from '../../../../src/lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────
interface JoinRequest {
  id:        string;
  message:   string | null;
  createdAt: string;
  user: {
    id:       string;
    name:     string;
    age:      number | null;
    photos:   string[];
    verified: boolean;
    bio:      string | null;
  };
}

// ─── Colors ───────────────────────────────────────────────────────────────────
const bg     = '#F8F8FC';
const ink    = '#1A1A2E';
const muted  = '#6B7280';
const white  = '#FFFFFF';
const brand  = '#7C3AED';
const border = '#E8E8F0';
const success = '#10B981';

// ─── Request card ─────────────────────────────────────────────────────────────
function RequestCard({
  req,
  onAccept,
  onReject,
  responding,
}: {
  req: JoinRequest;
  onAccept: () => void;
  onReject: () => void;
  responding: boolean;
}) {
  const photo = req.user.photos?.[0];
  const timeAgo = (() => {
    const diff = Date.now() - new Date(req.createdAt).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  })();

  return (
    <View style={card.wrap}>
      {/* Avatar */}
      <TouchableOpacity style={card.avatarWrap} activeOpacity={0.85}>
        {photo ? (
          <Image source={{ uri: photo }} style={card.avatar} contentFit="cover" />
        ) : (
          <View style={[card.avatar, card.avatarFallback]}>
            <Ionicons name="person" size={22} color={brand} />
          </View>
        )}
        {req.user.verified && (
          <View style={card.verifiedDot}>
            <Ionicons name="checkmark" size={7} color={white} />
          </View>
        )}
      </TouchableOpacity>

      {/* Info */}
      <View style={card.info}>
        <View style={card.nameRow}>
          <Text style={card.name}>{req.user.name}{req.user.age ? `, ${req.user.age}` : ''}</Text>
          <Text style={card.time}>{timeAgo}</Text>
        </View>

        {req.user.bio ? (
          <Text style={card.bio} numberOfLines={1}>{req.user.bio}</Text>
        ) : null}

        {req.message ? (
          <View style={card.msgBox}>
            <Ionicons name="chatbubble-outline" size={11} color={muted} />
            <Text style={card.msgText} numberOfLines={2}>{req.message}</Text>
          </View>
        ) : null}

        {/* Accept / Reject */}
        <View style={card.actions}>
          <TouchableOpacity
            style={card.rejectBtn}
            onPress={onReject}
            disabled={responding}
            activeOpacity={0.8}
          >
            <Ionicons name="close" size={16} color="#EF4444" />
            <Text style={card.rejectText}>Decline</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={card.acceptBtn}
            onPress={onAccept}
            disabled={responding}
            activeOpacity={0.85}
          >
            {responding ? (
              <ActivityIndicator size="small" color={white} />
            ) : (
              <>
                <Ionicons name="checkmark" size={16} color={white} />
                <Text style={card.acceptText}>Accept</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function PartyRequestsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [requests, setRequests]     = useState<JoinRequest[]>([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [responding, setResponding] = useState<string | null>(null);

  const fetchRequests = useCallback(async () => {
    try {
      const res = await api.get<{ requests: JoinRequest[] }>(`/parties/${id}/requests`);
      setRequests(res.data.requests);
    } catch {
      // silent
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => { void fetchRequests(); }, [fetchRequests]);

  const respond = async (requestId: string, action: 'accept' | 'reject') => {
    setResponding(requestId);
    try {
      await api.post(`/parties/${id}/respond`, { requestId, action });
      setRequests((prev) => prev.filter((r) => r.id !== requestId));
      if (action === 'accept') {
        Alert.alert('Accepted!', 'They\'ve been added to the party and notified.');
      }
    } catch {
      Alert.alert('Error', 'Could not process the request. Please try again.');
    } finally {
      setResponding(null);
    }
  };

  const handleAccept = (req: JoinRequest) => {
    Alert.alert(
      `Accept ${req.user.name}?`,
      'They\'ll be added to your party and a connection will be created.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Accept', onPress: () => respond(req.id, 'accept') },
      ]
    );
  };

  const handleReject = (req: JoinRequest) => {
    Alert.alert(
      `Decline ${req.user.name}?`,
      'They won\'t be notified of the reason.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Decline', style: 'destructive', onPress: () => respond(req.id, 'reject') },
      ]
    );
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor={white} />

      {/* Header */}
      <Animated.View entering={FadeInDown.delay(0).duration(350)} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={22} color={ink} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.title}>Join Requests</Text>
          {requests.length > 0 && (
            <View style={styles.countBadge}>
              <Text style={styles.countText}>{requests.length} pending</Text>
            </View>
          )}
        </View>
        <View style={{ width: 40 }} />
      </Animated.View>

      {/* List */}
      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator color={brand} size="large" />
        </View>
      ) : (
        <FlatList
          data={requests}
          keyExtractor={(r) => r.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: insets.bottom + 24, flexGrow: 1 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void fetchRequests(); }} tintColor={brand} />}
          renderItem={({ item, index }) => (
            <Animated.View entering={FadeInDown.delay(index * 40).duration(300)}>
              <RequestCard
                req={item}
                responding={responding === item.id}
                onAccept={() => handleAccept(item)}
                onReject={() => handleReject(item)}
              />
            </Animated.View>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <LinearGradient colors={['#EDE9FE', '#DDD6FE']} style={styles.emptyIcon}>
                <Ionicons name="people-outline" size={32} color={brand} />
              </LinearGradient>
              <Text style={styles.emptyTitle}>No pending requests</Text>
              <Text style={styles.emptySub}>
                When people request to join your party, they'll appear here.
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

// ─── Card styles ──────────────────────────────────────────────────────────────
const AVATAR = 54;
const card = StyleSheet.create({
  wrap: {
    backgroundColor: white, borderRadius: 18,
    padding: 14, flexDirection: 'row', gap: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  avatarWrap: { position: 'relative' },
  avatar: { width: AVATAR, height: AVATAR, borderRadius: AVATAR / 2, backgroundColor: '#EDE9FE' },
  avatarFallback: { alignItems: 'center', justifyContent: 'center' },
  verifiedDot: {
    position: 'absolute', bottom: 0, right: 0,
    width: 16, height: 16, borderRadius: 8,
    backgroundColor: brand, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: white,
  },
  info: { flex: 1, gap: 5 },
  nameRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  name: { fontSize: 15, fontWeight: '700', color: ink },
  time: { fontSize: 11, color: '#9CA3AF' },
  bio: { fontSize: 12, color: muted },
  msgBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 6,
    backgroundColor: '#F9FAFB', borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 7,
    borderWidth: 1, borderColor: border,
  },
  msgText: { flex: 1, fontSize: 12, color: ink, lineHeight: 17 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 4 },
  rejectBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
    height: 38, borderRadius: 19,
    borderWidth: 1.5, borderColor: '#FEE2E2',
    backgroundColor: '#FFF5F5',
  },
  rejectText: { fontSize: 13, fontWeight: '600', color: '#EF4444' },
  acceptBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
    height: 38, borderRadius: 19,
    backgroundColor: brand,
  },
  acceptText: { fontSize: 13, fontWeight: '700', color: white },
});

// ─── Screen styles ────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: white,
    borderBottomWidth: 1, borderBottomColor: border,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerCenter: { alignItems: 'center', gap: 5 },
  title: { fontSize: 20, fontWeight: '800', color: ink },
  countBadge: {
    backgroundColor: '#EDE9FE', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20,
  },
  countText: { fontSize: 12, fontWeight: '600', color: brand },
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 80 },
  emptyIcon: { width: 72, height: 72, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: ink },
  emptySub: { fontSize: 13, color: muted, textAlign: 'center', lineHeight: 19, maxWidth: 260 },
});
