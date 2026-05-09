import React, { useCallback, useState, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Pressable,
  StyleSheet,
  TextInput,
  Animated,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/lib/api';
import { useChatStore } from '@/stores/chatStore';
import { useAuthStore } from '@/stores/authStore';
import { colors } from '@/theme/colors';
import type { Chat, MatchRequest } from '@/types';

// ─── Avatar component (inline since no Avatar component exists yet) ───────────
function AvatarCircle({
  uri,
  name,
  size = 52,
  isOnline = false,
}: {
  uri?: string;
  name: string;
  size?: number;
  isOnline?: boolean;
}) {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <View style={{ width: size, height: size }}>
      <View
        style={[
          styles.avatarCircle,
          { width: size, height: size, borderRadius: size / 2 },
        ]}
      >
        <Text style={[styles.avatarInitials, { fontSize: size * 0.35 }]}>
          {initials}
        </Text>
      </View>
      {isOnline && (
        <View
          style={[
            styles.onlineDot,
            {
              width: size * 0.26,
              height: size * 0.26,
              borderRadius: (size * 0.26) / 2,
              bottom: 0,
              right: 0,
            },
          ]}
        />
      )}
    </View>
  );
}

// ─── Relative timestamp ───────────────────────────────────────────────────────
function relativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'now';
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ─── Chat Item ────────────────────────────────────────────────────────────────
function ChatItem({
  chat,
  onPress,
  currentUserId,
}: {
  chat: Chat;
  onPress: () => void;
  currentUserId: string;
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.97,
      useNativeDriver: true,
      tension: 150,
      friction: 8,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 150,
      friction: 8,
    }).start();
  };

  const { otherUser, lastMessage, unreadCount } = chat;
  const hasUnread = unreadCount > 0;

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[styles.chatItem, hasUnread && styles.chatItemUnread]}
      >
        <AvatarCircle
          name={otherUser.name}
          size={52}
          isOnline={otherUser.isOnline}
        />

        <View style={styles.chatContent}>
          <View style={styles.chatTopRow}>
            <View style={styles.nameRow}>
              <Text style={[styles.chatName, hasUnread && styles.chatNameUnread]}>
                {otherUser.name}
              </Text>
              {otherUser.isVerified && (
                <Ionicons
                  name="checkmark-circle"
                  size={14}
                  color={colors.accent}
                  style={{ marginLeft: 4 }}
                />
              )}
            </View>
            <Text style={styles.chatTime}>
              {lastMessage?.createdAt ? relativeTime(lastMessage.createdAt) : ''}
            </Text>
          </View>

          <View style={styles.chatBottomRow}>
            <Text
              style={[styles.lastMessage, hasUnread && styles.lastMessageUnread]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {lastMessage
                ? lastMessage.senderId === currentUserId
                  ? `You: ${lastMessage.content}`
                  : lastMessage.content
                : 'Start a conversation'}
            </Text>
            {hasUnread && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadText}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Text>
              </View>
            )}
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

// ─── Match Requests Banner ────────────────────────────────────────────────────
function MatchRequestsBanner({
  requests,
  onPress,
}: {
  requests: MatchRequest[];
  onPress: () => void;
}) {
  if (!requests || requests.length === 0) return null;

  return (
    <Pressable onPress={onPress} style={styles.banner}>
      <View style={styles.bannerAvatars}>
        {requests.slice(0, 3).map((req, idx) => (
          <View
            key={req.id}
            style={[
              styles.bannerAvatarWrap,
              { marginLeft: idx === 0 ? 0 : -10, zIndex: 3 - idx },
            ]}
          >
            <AvatarCircle name={req.fromUser.name} size={30} />
          </View>
        ))}
      </View>
      <View style={styles.bannerTextCol}>
        <Text style={styles.bannerTitle}>
          {requests.length} new connection{requests.length > 1 ? 's' : ''} waiting
        </Text>
        <Text style={styles.bannerSub}>Tap to view requests</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.accent} />
    </Pressable>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────
function EmptyState() {
  const router = useRouter();

  return (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconWrap}>
        <Ionicons name="chatbubbles-outline" size={56} color={colors.primary} />
      </View>
      <Text style={styles.emptyTitle}>No conversations yet</Text>
      <Text style={styles.emptySub}>
        Start by sending a Ping to someone nearby
      </Text>
      <Pressable
        onPress={() => router.push('/(tabs)/radar')}
        style={styles.emptyButton}
      >
        <Text style={styles.emptyButtonText}>Go to Radar</Text>
      </Pressable>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function ChatListScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const setTyping = useChatStore((s) => s.setTyping);

  const [searchVisible, setSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // Fetch chats
  const {
    data,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['chats'],
    queryFn: async () => {
      const res = await api.get<{ chats: Chat[] }>('/chats');
      return res.data;
    },
    staleTime: 30_000,
  });

  // Fetch match requests
  const { data: requestsData } = useQuery({
    queryKey: ['matchRequests'],
    queryFn: async () => {
      const res = await api.get<{ requests: MatchRequest[] }>('/match-requests');
      return res.data;
    },
    staleTime: 60_000,
  });

  // Re-fetch on screen focus
  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  // Sort: unread first, then by lastMessage timestamp
  const sortedChats = React.useMemo(() => {
    const chats = data?.chats ?? [];
    const filtered = searchQuery
      ? chats.filter((c) =>
          c.otherUser.name.toLowerCase().includes(searchQuery.toLowerCase())
        )
      : chats;

    return [...filtered].sort((a, b) => {
      if (a.unreadCount > 0 && b.unreadCount === 0) return -1;
      if (a.unreadCount === 0 && b.unreadCount > 0) return 1;
      const aTime = a.lastMessage?.createdAt ?? a.createdAt;
      const bTime = b.lastMessage?.createdAt ?? b.createdAt;
      return new Date(bTime).getTime() - new Date(aTime).getTime();
    });
  }, [data, searchQuery]);

  const pendingRequests = requestsData?.requests ?? [];

  const renderItem = useCallback(
    ({ item, index }: { item: Chat; index: number }) => (
      <Animated.View
        style={{ opacity: 1 }}
      >
        <ChatItem
          chat={item}
          currentUserId={user?.id ?? ''}
          onPress={() => router.push(`/(app)/chats/${item.id}`)}
        />
      </Animated.View>
    ),
    [router, user?.id]
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        {searchVisible ? (
          <View style={styles.searchBarWrap}>
            <Ionicons name="search" size={18} color={colors.subtext} style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search conversations..."
              placeholderTextColor={colors.subtext}
              autoFocus
            />
            <Pressable
              onPress={() => {
                setSearchVisible(false);
                setSearchQuery('');
              }}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <Text style={styles.headerTitle}>Messages</Text>
            <View style={styles.headerActions}>
              <Pressable
                style={styles.headerIconBtn}
                onPress={() => setSearchVisible(true)}
              >
                <Ionicons name="search" size={22} color={colors.text} />
              </Pressable>
              <Pressable
                style={styles.headerIconBtn}
                onPress={() => router.push('/(app)/chats/requests')}
              >
                <Ionicons name="person-add-outline" size={22} color={colors.text} />
                {pendingRequests.length > 0 && (
                  <View style={styles.headerBadge}>
                    <Text style={styles.headerBadgeText}>
                      {pendingRequests.length}
                    </Text>
                  </View>
                )}
              </Pressable>
            </View>
          </>
        )}
      </View>

      {/* Match Requests Banner */}
      <MatchRequestsBanner
        requests={pendingRequests}
        onPress={() => router.push('/(app)/chats/requests')}
      />

      {/* Chat List */}
      {isLoading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading conversations...</Text>
        </View>
      ) : isError ? (
        <View style={styles.errorWrap}>
          <Ionicons name="wifi-outline" size={40} color={colors.subtext} />
          <Text style={styles.errorTitle}>Couldn't load chats</Text>
          <Pressable onPress={() => refetch()} style={styles.retryBtn}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={sortedChats}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={
            sortedChats.length === 0
              ? styles.emptyListContent
              : styles.listContent
          }
          ListEmptyComponent={<EmptyState />}
          ItemSeparatorComponent={() => (
            <View style={styles.separator} />
          )}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.5,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: colors.danger,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  headerBadgeText: {
    color: colors.text,
    fontSize: 9,
    fontWeight: '800',
  },

  // Search bar
  searchBarWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    fontSize: 15,
    fontWeight: '500',
    paddingVertical: 0,
  },
  cancelText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },

  // Banner
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 12,
    backgroundColor: 'rgba(124,58,237,0.15)',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(124,58,237,0.3)',
  },
  bannerAvatars: {
    flexDirection: 'row',
    marginRight: 10,
  },
  bannerAvatarWrap: {},
  bannerTextCol: {
    flex: 1,
  },
  bannerTitle: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  bannerSub: {
    color: colors.subtext,
    fontSize: 11,
    marginTop: 1,
  },

  // List
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  emptyListContent: {
    flex: 1,
    paddingHorizontal: 16,
  },
  separator: {
    height: 1,
    backgroundColor: colors.border,
    marginLeft: 84,
    opacity: 0.5,
  },

  // Chat Item
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderRadius: 16,
  },
  chatItemUnread: {
    backgroundColor: 'rgba(124,58,237,0.06)',
  },
  chatContent: {
    flex: 1,
    marginLeft: 12,
  },
  chatTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  chatName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.subtext,
    letterSpacing: 0.1,
  },
  chatNameUnread: {
    color: colors.text,
    fontWeight: '700',
  },
  chatTime: {
    fontSize: 11,
    color: colors.subtext,
    marginLeft: 8,
  },
  chatBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  lastMessage: {
    flex: 1,
    fontSize: 13,
    color: colors.subtext,
    fontWeight: '400',
    lineHeight: 18,
  },
  lastMessageUnread: {
    color: colors.text,
    fontWeight: '600',
  },
  unreadBadge: {
    backgroundColor: colors.danger,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
    marginLeft: 8,
  },
  unreadText: {
    color: colors.text,
    fontSize: 10,
    fontWeight: '800',
  },

  // Avatar
  avatarCircle: {
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    color: colors.text,
    fontWeight: '700',
  },
  onlineDot: {
    position: 'absolute',
    backgroundColor: colors.success,
    borderWidth: 2,
    borderColor: colors.background,
  },

  // Loading / Error
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    color: colors.subtext,
    fontSize: 14,
  },
  errorWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  errorTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  retryBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 4,
  },
  retryText: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 14,
  },

  // Empty State
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingTop: 80,
  },
  emptyIconWrap: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(124,58,237,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySub: {
    fontSize: 14,
    color: colors.subtext,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  emptyButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 16,
    shadowColor: colors.primary,
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  emptyButtonText: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 15,
  },
});
