import React, { useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Animated, { FadeInDown, FadeInRight } from 'react-native-reanimated';
import { formatDistanceToNow } from 'date-fns';
import { api } from '@/lib/api';
import { colors } from '@/theme/colors';
import { Avatar } from '@/components/ui/Avatar';
import type { Notification } from '@/types';

const NOTIF_ICONS: Record<string, { icon: string; color: string; emoji: string }> = {
  match_request: { icon: 'radio-button-on', color: colors.primary, emoji: '💕' },
  match_accepted: { icon: 'heart', color: '#FF4D6D', emoji: '🎉' },
  message: { icon: 'chatbubble', color: colors.accent, emoji: '💬' },
  call: { icon: 'call', color: colors.success, emoji: '📞' },
  nearby: { icon: 'location', color: colors.warning, emoji: '📍' },
  safety: { icon: 'shield', color: colors.danger, emoji: '🛡️' },
};

// Sample notifications for demo
const DEMO_NOTIFICATIONS: Notification[] = [
  { id: '1', type: 'match_request', title: 'Priya sent you a Ping', body: 'Priya, 24 wants to connect with you in Dating mode', read: false, createdAt: new Date(Date.now() - 5 * 60000).toISOString() },
  { id: '2', type: 'match_accepted', title: 'Rahul accepted your Ping!', body: 'You matched with Rahul. Start a conversation!', read: false, createdAt: new Date(Date.now() - 30 * 60000).toISOString() },
  { id: '3', type: 'message', title: 'New message from Ananya', body: 'Hey! What are you up to tonight? 🌙', read: false, createdAt: new Date(Date.now() - 2 * 3600000).toISOString() },
  { id: '4', type: 'nearby', title: '5 people in Night Out mode nearby', body: 'Open Radar to discover who\'s around you', read: true, createdAt: new Date(Date.now() - 5 * 3600000).toISOString() },
  { id: '5', type: 'match_request', title: 'Kavya sent you a Ping', body: 'Kavya, 22 is in Club Mates mode nearby', read: true, createdAt: new Date(Date.now() - 24 * 3600000).toISOString() },
];

function NotificationItem({ item, onPress }: { item: Notification; onPress: () => void }) {
  const config = NOTIF_ICONS[item.type] || NOTIF_ICONS.nearby;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={[styles.notifItem, !item.read && styles.notifUnread]}>
      {!item.read && <View style={styles.unreadDot} />}
      <View style={[styles.notifIcon, { backgroundColor: `${config.color}22` }]}>
        <Text style={styles.notifEmoji}>{config.emoji}</Text>
      </View>
      <View style={styles.notifContent}>
        <Text style={styles.notifTitle} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.notifBody} numberOfLines={2}>{item.body}</Text>
        <Text style={styles.notifTime}>
          {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

export default function NotificationsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [notifications, setNotifications] = useState<Notification[]>(DEMO_NOTIFICATIONS);

  // In production, fetch from API:
  // const { data } = useQuery({ queryKey: ['notifications'], queryFn: () => api.get('/notifications') });

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    // api.patch('/notifications/read-all');
  };

  const handleNotifPress = (notif: Notification) => {
    setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, read: true } : n));
    switch (notif.type) {
      case 'match_request':
        router.push('/(app)/nearby');
        break;
      case 'match_accepted':
        router.push('/(app)/chats/');
        break;
      case 'message':
        router.push('/(app)/chats/');
        break;
      case 'nearby':
        router.push('/(app)/radar');
        break;
      default:
        break;
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const today = notifications.filter(n => {
    const diff = Date.now() - new Date(n.createdAt).getTime();
    return diff < 24 * 3600000;
  });
  const earlier = notifications.filter(n => {
    const diff = Date.now() - new Date(n.createdAt).getTime();
    return diff >= 24 * 3600000;
  });

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <Animated.View entering={FadeInDown.delay(50)} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          Notifications {unreadCount > 0 ? `(${unreadCount})` : ''}
        </Text>
        {unreadCount > 0 ? (
          <TouchableOpacity onPress={markAllRead}>
            <Text style={styles.markAllBtn}>Mark all read</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 60 }} />
        )}
      </Animated.View>

      {notifications.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>🔔</Text>
          <Text style={styles.emptyTitle}>No notifications yet</Text>
          <Text style={styles.emptySubtext}>When you get pings, matches, and messages they'll appear here</Text>
        </View>
      ) : (
        <FlatList
          data={[]}
          ListHeaderComponent={() => (
            <>
              {today.length > 0 && (
                <>
                  <Text style={styles.groupLabel}>Today</Text>
                  {today.map((item, i) => (
                    <Animated.View key={item.id} entering={FadeInRight.delay(i * 60)}>
                      <NotificationItem item={item} onPress={() => handleNotifPress(item)} />
                    </Animated.View>
                  ))}
                </>
              )}
              {earlier.length > 0 && (
                <>
                  <Text style={styles.groupLabel}>Earlier</Text>
                  {earlier.map((item, i) => (
                    <Animated.View key={item.id} entering={FadeInRight.delay(i * 60)}>
                      <NotificationItem item={item} onPress={() => handleNotifPress(item)} />
                    </Animated.View>
                  ))}
                </>
              )}
            </>
          )}
          renderItem={() => null}
          keyExtractor={(_, i) => i.toString()}
          contentContainerStyle={{ paddingBottom: 40 }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: colors.text, fontSize: 18, fontWeight: '700', flex: 1, textAlign: 'center' },
  markAllBtn: { color: colors.primary, fontSize: 13, fontWeight: '600' },
  groupLabel: { color: colors.subtext, fontSize: 12, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase', paddingHorizontal: 16, paddingVertical: 8 },
  notifItem: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 16, paddingVertical: 14, gap: 12, borderBottomWidth: 1, borderBottomColor: colors.border, position: 'relative' },
  notifUnread: { backgroundColor: `${colors.primary}08` },
  unreadDot: { position: 'absolute', left: 6, top: '50%', width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primary },
  notifIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  notifEmoji: { fontSize: 20 },
  notifContent: { flex: 1, gap: 2 },
  notifTitle: { color: colors.text, fontSize: 14, fontWeight: '600' },
  notifBody: { color: colors.subtext, fontSize: 13, lineHeight: 19 },
  notifTime: { color: colors.subtext, fontSize: 11, marginTop: 2 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 40 },
  emptyEmoji: { fontSize: 56 },
  emptyTitle: { color: colors.text, fontSize: 20, fontWeight: '700' },
  emptySubtext: { color: colors.subtext, fontSize: 14, textAlign: 'center', lineHeight: 22 },
});
