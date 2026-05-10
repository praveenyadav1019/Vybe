import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  FlatList, StatusBar,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeInRight } from 'react-native-reanimated';
import { useRouter } from 'expo-router';

// ─── Mock data ────────────────────────────────────────────────────────────────
const TODAY_NOTIFS = [
  {
    id: '1',
    type: 'like',
    icon: 'heart' as const,
    iconColor: '#EF4444',
    iconBg: '#FEE2E2',
    photo: 'https://randomuser.me/api/portraits/women/44.jpg',
    title: "Someone liked your profile.",
    body: "Check out who's interested in you.",
    time: '2m ago',
    read: false,
  },
  {
    id: '2',
    type: 'event',
    icon: 'calendar' as const,
    iconColor: '#7C3AED',
    iconBg: '#EDE9FE',
    photo: null,
    title: 'New event in your area: Rooftop Mixer.',
    body: 'Join other members for drinks tonight!',
    time: '1h ago',
    read: false,
  },
];

const EARLIER_NOTIFS = [
  {
    id: '3',
    type: 'message',
    icon: 'chatbubble' as const,
    iconColor: '#2563EB',
    iconBg: '#DBEAFE',
    photo: 'https://randomuser.me/api/portraits/men/32.jpg',
    title: 'Message from Rohan.',
    body: 'Hey, are you free for coffee this weekend?',
    time: 'Yesterday',
    read: true,
  },
  {
    id: '4',
    type: 'match',
    icon: 'airplane' as const,
    iconColor: '#059669',
    iconBg: '#D1FAE5',
    photo: null,
    title: 'Travel Buddy Match: Paris.',
    body: 'Based on your upcoming trip.',
    time: '2 days ago',
    read: true,
  },
];

type NotifItem = {
  id: string;
  type: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  iconColor: string;
  iconBg: string;
  photo: string | null;
  title: string;
  body: string;
  time: string;
  read: boolean;
};

// ─── Color tokens ─────────────────────────────────────────────────────────────
const ink    = '#1A1A2E';
const inkSec = '#6B7280';
const white  = '#FFFFFF';
const brand  = '#7C3AED';
const bgSec  = '#F9FAFB';
const border = '#F3F4F6';

// ─── Notification row ─────────────────────────────────────────────────────────
function NotifRow({ item, onPress }: { item: NotifItem; onPress: () => void }) {
  return (
    <TouchableOpacity
      style={[styles.notifRow, !item.read && styles.notifRowUnread]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {/* Icon / avatar */}
      {item.photo ? (
        <View style={styles.avatarWrap}>
          <Image source={{ uri: item.photo }} style={styles.avatar} contentFit="cover" />
          <View style={[styles.iconBadge, { backgroundColor: item.iconBg }]}>
            <Ionicons name={item.icon} size={10} color={item.iconColor} />
          </View>
        </View>
      ) : (
        <View style={[styles.iconCircle, { backgroundColor: item.iconBg }]}>
          <Ionicons name={item.icon} size={22} color={item.iconColor} />
        </View>
      )}

      {/* Text */}
      <View style={styles.notifContent}>
        <Text style={[styles.notifTitle, !item.read && styles.notifTitleUnread]}>
          {item.title}
        </Text>
        <Text style={styles.notifBody} numberOfLines={1}>{item.body}</Text>
        <Text style={styles.notifTime}>{item.time}</Text>
      </View>

      {/* Unread dot */}
      {!item.read && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function NotificationCenterScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [todayRead, setTodayRead] = useState(false);

  const todayItems = todayRead
    ? TODAY_NOTIFS.map((n) => ({ ...n, read: true }))
    : TODAY_NOTIFS;

  const sections = [
    { key: 'today', label: 'TODAY', items: todayItems },
    { key: 'earlier', label: 'EARLIER', items: EARLIER_NOTIFS },
  ];

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor={white} />

      <FlatList
        data={sections}
        keyExtractor={(s) => s.key}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        ListHeaderComponent={
          <Animated.View entering={FadeInDown.delay(0).duration(350)} style={styles.titleRow}>
            <Text style={styles.title}>Notification Center</Text>
          </Animated.View>
        }
        renderItem={({ item: section, index: sIdx }) => (
          <Animated.View entering={FadeInDown.delay(sIdx * 80 + 60).duration(380)}>
            {/* Section header */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionLabel}>{section.label}</Text>
              {section.key === 'today' && (
                <TouchableOpacity onPress={() => setTodayRead(true)} activeOpacity={0.7}>
                  <Text style={styles.markAllRead}>Mark All as Read</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Notification rows */}
            {section.items.map((notif, i) => (
              <React.Fragment key={notif.id}>
                <Animated.View entering={FadeInRight.delay(sIdx * 80 + i * 40 + 80).duration(320)}>
                  <NotifRow
                    item={notif}
                    onPress={() => {}}
                  />
                </Animated.View>
                {i < section.items.length - 1 && <View style={styles.rowDivider} />}
              </React.Fragment>
            ))}
          </Animated.View>
        )}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const AVATAR_SIZE = 50;
const ICON_CIRCLE = 50;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: white },

  titleRow: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 },
  title: { fontSize: 28, fontWeight: '800', color: ink },

  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 8,
  },
  sectionLabel: { fontSize: 12, fontWeight: '700', color: inkSec, letterSpacing: 0.8 },
  markAllRead: { fontSize: 13, fontWeight: '500', color: brand },

  // ── Notification row ────────────────────────────────────────────────────────
  notifRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 12,
    backgroundColor: white,
    gap: 12,
  },
  notifRowUnread: { backgroundColor: '#F5F3FF' },

  avatarWrap: { position: 'relative' },
  avatar: {
    width: AVATAR_SIZE, height: AVATAR_SIZE, borderRadius: AVATAR_SIZE / 2,
    backgroundColor: bgSec,
  },
  iconBadge: {
    position: 'absolute', bottom: -2, right: -2,
    width: 20, height: 20, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: white,
  },
  iconCircle: {
    width: ICON_CIRCLE, height: ICON_CIRCLE, borderRadius: ICON_CIRCLE / 2,
    alignItems: 'center', justifyContent: 'center',
  },

  notifContent: { flex: 1 },
  notifTitle: { fontSize: 14, fontWeight: '500', color: ink, lineHeight: 19 },
  notifTitleUnread: { fontWeight: '700' },
  notifBody: { fontSize: 13, color: inkSec, marginTop: 2, lineHeight: 17 },
  notifTime: { fontSize: 11, color: inkSec, marginTop: 3 },

  unreadDot: {
    width: 8, height: 8, borderRadius: 4, backgroundColor: brand,
  },

  rowDivider: { height: 1, backgroundColor: border, marginLeft: 82 },
});
