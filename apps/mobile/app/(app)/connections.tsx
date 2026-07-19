import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  FlatList, StatusBar, TextInput, RefreshControl,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { api } from '../../src/lib/api';
import { ScreenGradient } from '../../src/components/ui/ScreenGradient';

// ─── Types ────────────────────────────────────────────────────────────────────
interface ConnectionUser {
  id:       string;
  name:     string;
  photos:   string[];
  verified: boolean;
  bio:      string | null;
  mode:     string;
  isOnline: boolean;
  lastSeen: string;
}

interface Connection {
  connectionId: string;
  type:         'matched' | 'met_at_venue' | 'met_at_party' | 'stranger_chat';
  metAt:        string | null;
  connectedAt:  string;
  user:         ConnectionUser;
}

// ─── Colors ───────────────────────────────────────────────────────────────────
const ink     = '#1A1A2E';
const inkSec  = '#6B7280';
const white   = '#FFFFFF';
const brand   = '#7C3AED';
const bg      = '#F8F8FC';
const border  = '#E8E8F0';
const success = '#10B981';

// ─── Connection type label ────────────────────────────────────────────────────
const TYPE_LABELS: Record<string, { label: string; icon: string; color: string; bg: string }> = {
  matched:        { label: 'Matched',       icon: 'heart',          color: '#9333EA', bg: '#F5F3FF' },
  met_at_venue:   { label: 'Met at venue',  icon: 'business',       color: '#0284C7', bg: '#EFF6FF' },
  met_at_party:   { label: 'Met at party',  icon: 'home',           color: '#C2410C', bg: '#FFF7ED' },
  stranger_chat:  { label: 'Random chat',   icon: 'shuffle',        color: '#059669', bg: '#F0FDF4' },
};

// ─── Filter tabs ──────────────────────────────────────────────────────────────
const TABS = [
  { key: 'all',           label: 'All' },
  { key: 'matched',       label: 'Matched' },
  { key: 'stranger_chat', label: 'Random' },
] as const;
type TabKey = typeof TABS[number]['key'];

// ─── Connection row ───────────────────────────────────────────────────────────
function ConnectionRow({ conn, onMessage, onProfile }: {
  conn: Connection;
  onMessage: () => void;
  onProfile: () => void;
}) {
  const photo = conn.user.photos?.[0];
  const typeInfo = TYPE_LABELS[conn.type];
  const connDate = new Date(conn.connectedAt);
  const dateStr = connDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

  return (
    <TouchableOpacity style={row.wrap} onPress={onProfile} activeOpacity={0.8}>
      {/* Avatar */}
      <View style={row.avatarWrap}>
        {photo ? (
          <Image source={{ uri: photo }} style={row.avatar} contentFit="cover" />
        ) : (
          <View style={[row.avatar, row.avatarFallback]}>
            <Ionicons name="person" size={22} color={brand} />
          </View>
        )}
        {conn.user.isOnline && <View style={row.onlineDot} />}
      </View>

      {/* Text */}
      <View style={row.info}>
        <View style={row.topRow}>
          <Text style={row.name}>{conn.user.name}</Text>
          {conn.user.verified && (
            <Ionicons name="checkmark-circle" size={14} color={brand} />
          )}
        </View>
        {/* Connection type badge */}
        <View style={[row.typeBadge, { backgroundColor: typeInfo?.bg ?? '#F9FAFB' }]}>
          <Ionicons name={(typeInfo?.icon ?? 'link-outline') as any} size={10} color={typeInfo?.color ?? inkSec} />
          <Text style={[row.typeText, { color: typeInfo?.color ?? inkSec }]}>
            {typeInfo?.label ?? conn.type}
            {conn.metAt ? ` · ${conn.metAt}` : ''}
          </Text>
        </View>
        <Text style={row.date}>{dateStr}</Text>
      </View>

      {/* Message button */}
      <TouchableOpacity onPress={onMessage} activeOpacity={0.85}>
        <LinearGradient
          colors={['#9333EA', '#7C3AED']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          style={row.msgBtn}
        >
          <Ionicons name="chatbubble-outline" size={13} color={white} />
          <Text style={row.msgText}>Chat</Text>
        </LinearGradient>
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function ConnectionsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading]         = useState(true);
  const [refreshing, setRefreshing]   = useState(false);
  const [activeTab, setActiveTab]     = useState<TabKey>('all');
  const [search, setSearch]           = useState('');

  const fetchConnections = async (type: TabKey = 'all') => {
    try {
      const params = type !== 'all' ? `?type=${type}` : '';
      const res = await api.get<{ connections: Connection[] }>(`/connections${params}`);
      setConnections(res.data.connections);
    } catch {
      // fallback to empty
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    void fetchConnections(activeTab);
  }, [activeTab]);

  const handleRefresh = () => {
    setRefreshing(true);
    void fetchConnections(activeTab);
  };

  const filtered = connections.filter((c) =>
    c.user.name.toLowerCase().includes(search.toLowerCase())
  );

  const onlineCount = connections.filter((c) => c.user.isOnline).length;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <ScreenGradient />
      <StatusBar barStyle="dark-content" backgroundColor="#ECE4FF" />

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <Animated.View entering={FadeInDown.delay(0).duration(350)} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={22} color={ink} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.title}>Connections</Text>
          {onlineCount > 0 && (
            <View style={styles.onlineBadge}>
              <View style={styles.onlineBadgeDot} />
              <Text style={styles.onlineBadgeText}>{onlineCount} online</Text>
            </View>
          )}
        </View>
        <View style={{ width: 40 }} />
      </Animated.View>

      {/* ── Tabs ────────────────────────────────────────────────────────── */}
      <Animated.View entering={FadeInDown.delay(50).duration(350)} style={styles.tabsWrap}>
        <FlatList
          data={TABS}
          horizontal
          keyExtractor={(t) => t.key}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsRow}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.tab, activeTab === item.key && styles.tabActive]}
              onPress={() => setActiveTab(item.key)}
              activeOpacity={0.8}
            >
              <Text style={[styles.tabText, activeTab === item.key && styles.tabTextActive]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          )}
        />
      </Animated.View>

      {/* ── Search ──────────────────────────────────────────────────────── */}
      <Animated.View entering={FadeInDown.delay(90).duration(350)} style={styles.searchBar}>
        <Ionicons name="search-outline" size={16} color={inkSec} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search connections…"
          placeholderTextColor={inkSec}
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={16} color={inkSec} />
          </TouchableOpacity>
        )}
      </Animated.View>

      {/* ── List ────────────────────────────────────────────────────────── */}
      <FlatList
        data={filtered}
        keyExtractor={(c) => c.connectionId}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 24, flexGrow: 1 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={brand} />}
        renderItem={({ item, index }) => (
          <Animated.View entering={FadeInDown.delay(120 + index * 30).duration(300)}>
            <ConnectionRow
              conn={item}
              onMessage={() => router.push(`/(app)/chats/${item.user.id}` as any)}
              onProfile={() => router.push(`/(app)/user/${item.user.id}` as any)}
            />
            <View style={styles.rowDivider} />
          </Animated.View>
        )}
        ListEmptyComponent={
          loading ? null : (
            <View style={styles.empty}>
              <LinearGradient colors={['#EDE9FE', '#DDD6FE']} style={styles.emptyIcon}>
                <Ionicons name="people-outline" size={32} color={brand} />
              </LinearGradient>
              <Text style={styles.emptyTitle}>
                {activeTab === 'all' ? 'No connections yet' : `No ${activeTab.replace(/_/g, ' ')} connections`}
              </Text>
              <Text style={styles.emptySub}>
                Meet people at venues, parties, or via random chat
              </Text>
              <TouchableOpacity
                style={styles.emptyBtn}
                onPress={() => router.push('/(app)/nearby' as any)}
                activeOpacity={0.85}
              >
                <Text style={styles.emptyBtnText}>Discover Nearby People</Text>
              </TouchableOpacity>
            </View>
          )
        }
      />
    </View>
  );
}

// ─── Row styles ───────────────────────────────────────────────────────────────
const AVATAR_SIZE = 52;
const row = StyleSheet.create({
  wrap: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12, gap: 12,
    backgroundColor: 'transparent',
  },
  avatarWrap: { position: 'relative' },
  avatar: { width: AVATAR_SIZE, height: AVATAR_SIZE, borderRadius: AVATAR_SIZE / 2 },
  avatarFallback: { backgroundColor: '#EDE9FE', alignItems: 'center', justifyContent: 'center' },
  onlineDot: {
    position: 'absolute', bottom: 1, right: 1,
    width: 12, height: 12, borderRadius: 6,
    backgroundColor: success, borderWidth: 2, borderColor: white,
  },
  info: { flex: 1, gap: 4 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  name: { fontSize: 15, fontWeight: '600', color: ink },
  typeBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20,
  },
  typeText: { fontSize: 10, fontWeight: '600' },
  date: { fontSize: 11, color: '#9CA3AF' },
  msgBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 9999,
  },
  msgText: { fontSize: 12, fontWeight: '600', color: white },
});

// ─── Screen styles ────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F7F2FF' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 12, paddingBottom: 10,
    backgroundColor: 'transparent',
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerCenter: { alignItems: 'center', gap: 4 },
  title: { fontSize: 20, fontWeight: '800', color: ink },
  onlineBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#F0FDF4', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20,
  },
  onlineBadgeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: success },
  onlineBadgeText: { fontSize: 11, fontWeight: '600', color: '#166534' },

  tabsWrap: { backgroundColor: 'transparent' },
  tabsRow: { paddingHorizontal: 12, paddingBottom: 4, gap: 6 },
  tab: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, marginTop: 6 },
  tabActive: { backgroundColor: '#EDE9FE' },
  tabText: { fontSize: 13, fontWeight: '500', color: inkSec },
  tabTextActive: { color: brand, fontWeight: '700' },

  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginHorizontal: 16, marginVertical: 10,
    paddingHorizontal: 14, paddingVertical: 10,
    backgroundColor: 'rgba(255,255,255,0.55)', borderRadius: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.8)',
  },
  searchInput: { flex: 1, fontSize: 14, color: ink },

  rowDivider: { height: 1, backgroundColor: border, marginLeft: 80 },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, gap: 12, marginTop: 60 },
  emptyIcon: { width: 72, height: 72, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: ink, textAlign: 'center' },
  emptySub: { fontSize: 13, color: inkSec, textAlign: 'center', lineHeight: 19 },
  emptyBtn: {
    marginTop: 4, paddingHorizontal: 20, paddingVertical: 10,
    borderRadius: 20, backgroundColor: '#EDE9FE',
  },
  emptyBtnText: { fontSize: 14, fontWeight: '600', color: brand },
});
