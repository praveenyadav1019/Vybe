import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  FlatList, StatusBar, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { api } from '../../../src/lib/api';

// ─── Color tokens ─────────────────────────────────────────────────────────────
const bg    = '#F8F8FC';
const ink   = '#1A1A2E';
const muted = '#6B7280';
const white = '#FFFFFF';
const brand = '#7C3AED';
const border = '#E8E8F0';

interface Session {
  id: string;
  mode: string;
  status: string;
  duration: number | null;
  skipCount: number;
  createdAt: string;
  endedAt: string | null;
  _count: { messages: number };
}

function SessionRow({ item }: { item: Session }) {
  const date = new Date(item.createdAt);
  const dateStr = date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' });
  const dur = item.duration ? `${Math.floor(item.duration / 60)}m ${item.duration % 60}s` : '—';
  const modeIcon = item.mode === 'video' ? 'videocam-outline' : item.mode === 'audio' ? 'mic-outline' : 'chatbubble-ellipses-outline';

  return (
    <View style={row.wrap}>
      <View style={row.iconBox}>
        <Ionicons name={modeIcon as any} size={18} color={brand} />
      </View>
      <View style={row.info}>
        <Text style={row.mode}>{item.mode.charAt(0).toUpperCase() + item.mode.slice(1)} chat</Text>
        <Text style={row.sub}>
          {item._count.messages} messages · {dur} · {dateStr}
        </Text>
      </View>
      <View style={[row.statusBadge, item.status === 'reported' && row.statusBadgeDanger]}>
        <Text style={[row.statusText, item.status === 'reported' && row.statusTextDanger]}>
          {item.status}
        </Text>
      </View>
    </View>
  );
}

export default function StrangerSessionsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const fetchSessions = async (p = 1) => {
    try {
      const res = await api.get<{ sessions: Session[]; hasMore: boolean }>(`/stranger/sessions?page=${p}&limit=20`);
      if (p === 1) {
        setSessions(res.data.sessions);
      } else {
        setSessions((prev) => [...prev, ...res.data.sessions]);
      }
      setHasMore(res.data.hasMore);
      setPage(p);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void fetchSessions(1); }, []);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor={bg} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.75}>
          <Ionicons name="arrow-back" size={22} color={ink} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Session History</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator color={brand} size="large" />
        </View>
      ) : (
        <FlatList
          data={sessions}
          keyExtractor={(s) => s.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
          renderItem={({ item }) => <SessionRow item={item} />}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          onEndReached={() => hasMore && fetchSessions(page + 1)}
          onEndReachedThreshold={0.4}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="time-outline" size={40} color={muted} />
              <Text style={styles.emptyTitle}>No sessions yet</Text>
              <Text style={styles.emptySub}>Your stranger chat history will appear here</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const row = StyleSheet.create({
  wrap: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 20, paddingVertical: 14,
    backgroundColor: white,
  },
  iconBox: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: '#EDE9FE',
    alignItems: 'center', justifyContent: 'center',
  },
  info: { flex: 1 },
  mode: { fontSize: 14, fontWeight: '600', color: ink },
  sub:  { fontSize: 12, color: muted, marginTop: 2 },
  statusBadge: {
    backgroundColor: '#F3F4F6', borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  statusBadgeDanger: { backgroundColor: '#FEE2E2' },
  statusText: { fontSize: 11, fontWeight: '600', color: muted },
  statusTextDanger: { color: '#EF4444' },
});

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: white,
    borderBottomWidth: 1, borderBottomColor: border,
  },
  backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: ink },
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  separator: { height: 1, backgroundColor: border, marginLeft: 72 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, marginTop: 80, gap: 10 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: ink },
  emptySub: { fontSize: 13, color: muted, textAlign: 'center' },
});
