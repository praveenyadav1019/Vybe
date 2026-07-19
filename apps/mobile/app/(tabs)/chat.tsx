import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  FlatList, StatusBar, TextInput, ScrollView,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { useChatStore } from '../../src/stores/chatStore';
import { ScreenGradient } from '../../src/components/ui/ScreenGradient';

// ─── Color tokens ─────────────────────────────────────────────────────────────
const ink     = '#1A1A2E';
const inkSec  = '#6B7280';
const white   = '#FFFFFF';
const brand   = '#7C3AED';
const bgSec   = '#F9FAFB';
const border  = '#F3F4F6';
const success = '#10B981';

// ─── Types ────────────────────────────────────────────────────────────────────
type Scope = 'nearby' | 'global';
type Gender = 'all' | 'female' | 'male';

type Convo = {
  id: string;
  name: string;
  photo: string;
  lastMsg: string;
  time: string;
  unread: number;
  online: boolean;
  scope: Scope;
  gender: Exclude<Gender, 'all'>;
  distance?: string;
};

// ─── Mock data ────────────────────────────────────────────────────────────────
const CONVERSATIONS: Convo[] = [
  { id: '1', name: 'Isabella', photo: 'https://randomuser.me/api/portraits/women/47.jpg', lastMsg: 'Hey, are you free to grab coffee tomorrow?', time: '10:30 AM', unread: 2, online: true,  scope: 'nearby', gender: 'female', distance: '1.2 km' },
  { id: '4', name: 'Marcus',   photo: 'https://randomuser.me/api/portraits/men/36.jpg',   lastMsg: 'Same place? I can see you on radar 👀',     time: 'Mon',     unread: 1, online: true,  scope: 'nearby', gender: 'male',   distance: '800 m' },
  { id: '3', name: 'Chloe',    photo: 'https://randomuser.me/api/portraits/women/48.jpg', lastMsg: 'The nightlife event sounds amazing!',      time: 'Yesterday', unread: 0, online: true, scope: 'nearby', gender: 'female', distance: '2.4 km' },
  { id: '7', name: 'Alex',     photo: 'https://randomuser.me/api/portraits/men/12.jpg',   lastMsg: 'Down for the rooftop later tonight?',     time: 'Tue',     unread: 0, online: true,  scope: 'nearby', gender: 'male',  distance: '3.1 km' },
  { id: '2', name: 'Daniel',   photo: 'https://randomuser.me/api/portraits/men/35.jpg',   lastMsg: "Just landed in New York! Let's connect.", time: 'Yesterday', unread: 0, online: false, scope: 'global', gender: 'male' },
  { id: '5', name: 'Zoe',      photo: 'https://randomuser.me/api/portraits/women/49.jpg', lastMsg: 'haha yes that rooftop is insane',         time: 'Sun',     unread: 0, online: false, scope: 'global', gender: 'female' },
  { id: '8', name: 'Sam',      photo: 'https://randomuser.me/api/portraits/women/68.jpg', lastMsg: 'Just joined from Berlin 🌍',               time: 'Sun',     unread: 3, online: true,  scope: 'global', gender: 'female' },
  { id: '6', name: 'Ryan',     photo: 'https://randomuser.me/api/portraits/men/37.jpg',   lastMsg: "Ping me when you're at the venue!",       time: 'Sat',     unread: 0, online: false, scope: 'global', gender: 'male' },
];

const SCOPES: { key: Scope; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'nearby', label: 'Nearby', icon: 'location' },
  { key: 'global', label: 'Global', icon: 'globe-outline' },
];

const GENDERS: { key: Gender; label: string }[] = [
  { key: 'all',    label: 'All' },
  { key: 'female', label: 'Female' },
  { key: 'male',   label: 'Male' },
];

// ─── Conversation row ─────────────────────────────────────────────────────────
function ConvoRow({ item, onPress }: { item: Convo; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.convoRow} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.avatarWrap}>
        <Image source={{ uri: item.photo }} style={styles.avatar} contentFit="cover" />
        {item.online && <View style={styles.onlineDot} />}
      </View>
      <View style={styles.convoBody}>
        <View style={styles.convoTop}>
          <Text style={[styles.convoName, item.unread > 0 && styles.convoNameUnread]}>
            {item.name}
          </Text>
          <Text style={[styles.convoTime, item.unread > 0 && styles.convoTimeUnread]}>
            {item.time}
          </Text>
        </View>
        <View style={styles.convoBottom}>
          <Text
            style={[styles.convoMsg, item.unread > 0 && styles.convoMsgUnread]}
            numberOfLines={1}
          >
            {item.distance ? `📍 ${item.distance} · ` : ''}{item.lastMsg}
          </Text>
          {item.unread > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadText}>{item.unread}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function ChatTabScreen() {
  const insets  = useSafeAreaInsets();
  const router  = useRouter();
  const [query, setQuery]   = useState('');
  const [scope, setScope]   = useState<Scope>('nearby');
  const [gender, setGender] = useState<Gender>('all');

  const filtered = CONVERSATIONS.filter((c) =>
    c.scope === scope &&
    (gender === 'all' || c.gender === gender) &&
    c.name.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <ScreenGradient />
      <StatusBar barStyle="dark-content" backgroundColor="#ECE4FF" />

      {/* Header */}
      <Animated.View entering={FadeInDown.delay(0).duration(350)} style={styles.header}>
        <Text style={styles.headerTitle}>Messages</Text>
        <TouchableOpacity style={styles.headerBtn} activeOpacity={0.8}>
          <Ionicons name="create-outline" size={22} color={ink} />
        </TouchableOpacity>
      </Animated.View>

      {/* Scope segmented control: Nearby / Global */}
      <Animated.View entering={FadeInDown.delay(30).duration(350)} style={styles.segment}>
        {SCOPES.map((s) => {
          const active = scope === s.key;
          return (
            <TouchableOpacity
              key={s.key}
              style={[styles.segmentBtn, active && styles.segmentBtnActive]}
              onPress={() => setScope(s.key)}
              activeOpacity={0.85}
            >
              <Ionicons name={s.icon} size={15} color={active ? white : inkSec} />
              <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
                {s.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </Animated.View>

      {/* Gender filter chips */}
      <Animated.View entering={FadeInDown.delay(50).duration(350)}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
        >
          {GENDERS.map((g) => {
            const active = gender === g.key;
            return (
              <TouchableOpacity
                key={g.key}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => setGender(g.key)}
                activeOpacity={0.85}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {g.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </Animated.View>

      {/* Search */}
      <Animated.View entering={FadeInDown.delay(70).duration(350)} style={styles.searchBar}>
        <Ionicons name="search-outline" size={16} color={inkSec} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search conversations…"
          placeholderTextColor={inkSec}
          value={query}
          onChangeText={setQuery}
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery('')}>
            <Ionicons name="close-circle" size={16} color={inkSec} />
          </TouchableOpacity>
        )}
      </Animated.View>

      {/* List */}
      <Animated.View entering={FadeInDown.delay(90).duration(380)} style={{ flex: 1 }}>
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ConvoRow
              item={item}
              onPress={() => router.push(`/(app)/chats/${item.id}` as any)}
            />
          )}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: insets.bottom + 90 }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="chatbubbles-outline" size={48} color={border} />
              <Text style={styles.emptyText}>
                No {gender !== 'all' ? `${gender} ` : ''}chats {scope === 'nearby' ? 'nearby' : 'globally'} yet
              </Text>
            </View>
          }
        />
      </Animated.View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F7F2FF' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8,
  },
  headerTitle: { fontSize: 22, fontWeight: '800', color: ink },
  headerBtn: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },

  // Segmented control
  segment: {
    flexDirection: 'row', gap: 6,
    marginHorizontal: 20, marginBottom: 12,
    padding: 4, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.5)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.8)',
  },
  segmentBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 9, borderRadius: 10,
  },
  segmentBtnActive: { backgroundColor: brand },
  segmentText: { fontSize: 14, fontWeight: '600', color: inkSec },
  segmentTextActive: { color: white },

  // Gender chips
  chipRow: { paddingHorizontal: 20, gap: 8, paddingBottom: 12 },
  chip: {
    paddingHorizontal: 16, paddingVertical: 7, borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.55)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.85)',
  },
  chipActive: { backgroundColor: brand, borderColor: brand },
  chipText: { fontSize: 13, fontWeight: '600', color: inkSec },
  chipTextActive: { color: white },

  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 20, marginBottom: 8,
    paddingHorizontal: 14, paddingVertical: 10,
    backgroundColor: 'rgba(255,255,255,0.55)', borderRadius: 14,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.8)',
  },
  searchInput: { flex: 1, fontSize: 14, color: ink },

  convoRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 12, gap: 12,
  },
  avatarWrap: { position: 'relative' },
  avatar: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: bgSec,
  },
  onlineDot: {
    position: 'absolute', bottom: 1, right: 1,
    width: 13, height: 13, borderRadius: 7,
    backgroundColor: success, borderWidth: 2, borderColor: white,
  },

  convoBody: { flex: 1 },
  convoTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 },
  convoName: { fontSize: 15, fontWeight: '500', color: ink },
  convoNameUnread: { fontWeight: '700' },
  convoTime: { fontSize: 12, color: inkSec },
  convoTimeUnread: { color: brand, fontWeight: '600' },

  convoBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  convoMsg: { fontSize: 13, color: inkSec, flex: 1, marginRight: 8 },
  convoMsgUnread: { color: ink, fontWeight: '500' },

  unreadBadge: {
    minWidth: 20, height: 20, borderRadius: 10,
    backgroundColor: brand,
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 5,
  },
  unreadText: { color: white, fontSize: 11, fontWeight: '700' },

  separator: { height: 1, backgroundColor: border, marginLeft: 84 },

  empty: { alignItems: 'center', marginTop: 80, gap: 12 },
  emptyText: { fontSize: 15, color: inkSec },
});
