import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
} from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Modal,
  Animated,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { api } from '@/lib/api';
import { socketClient } from '@/lib/socket';
import { useChatStore } from '@/stores/chatStore';
import { useAuthStore } from '@/stores/authStore';
import { colors } from '@/theme/colors';
import type { Message, Chat } from '@/types';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatMsgTime(dateStr: string): string {
  const d = new Date(dateStr);
  const h = d.getHours();
  const m = d.getMinutes().toString().padStart(2, '0');
  const ampm = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 || 12}:${m} ${ampm}`;
}

function formatDateSeparator(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);

  if (d.toDateString() === now.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
}

function shouldShowTimestamp(messages: Message[], index: number): boolean {
  if (index === messages.length - 1) return true;
  const curr = new Date(messages[index].createdAt).getTime();
  const next = new Date(messages[index + 1].createdAt).getTime();
  return Math.abs(next - curr) > 3 * 60 * 1000; // > 3 min gap
}

function isDifferentDay(a: string, b: string): boolean {
  return new Date(a).toDateString() !== new Date(b).toDateString();
}

type ListItem =
  | { type: 'message'; data: Message }
  | { type: 'separator'; date: string };

// ─── Typing Dots Animation ────────────────────────────────────────────────────
function TypingIndicator({ name }: { name: string }) {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const bounce = (dot: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, { toValue: -5, duration: 300, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0, duration: 300, useNativeDriver: true }),
          Animated.delay(600),
        ])
      );
    const a1 = bounce(dot1, 0);
    const a2 = bounce(dot2, 150);
    const a3 = bounce(dot3, 300);
    a1.start();
    a2.start();
    a3.start();
    return () => {
      a1.stop();
      a2.stop();
      a3.stop();
    };
  }, [dot1, dot2, dot3]);

  return (
    <View style={styles.typingWrap}>
      <View style={styles.typingBubble}>
        {[dot1, dot2, dot3].map((dot, i) => (
          <Animated.View
            key={i}
            style={[
              styles.typingDot,
              { transform: [{ translateY: dot }] },
            ]}
          />
        ))}
      </View>
      <Text style={styles.typingLabel}>{name} is typing...</Text>
    </View>
  );
}

// ─── Date Separator ───────────────────────────────────────────────────────────
function DateSeparator({ date }: { date: string }) {
  return (
    <View style={styles.separatorRow}>
      <View style={styles.separatorLine} />
      <Text style={styles.separatorText}>{date}</Text>
      <View style={styles.separatorLine} />
    </View>
  );
}

// ─── Read Receipt ─────────────────────────────────────────────────────────────
function ReadReceipt({ msg, currentUserId }: { msg: Message; currentUserId: string }) {
  if (msg.senderId !== currentUserId) return null;
  if (msg.readAt) {
    return (
      <Ionicons name="checkmark-done" size={12} color={colors.accent} />
    );
  }
  return <Ionicons name="checkmark-done" size={12} color={colors.subtext} />;
}

// ─── Message Bubble ───────────────────────────────────────────────────────────
function MessageBubble({
  msg,
  isOwn,
  showTimestamp,
  isGrouped,
  currentUserId,
}: {
  msg: Message;
  isOwn: boolean;
  showTimestamp: boolean;
  isGrouped: boolean;
  currentUserId: string;
}) {
  return (
    <View
      style={[
        styles.bubbleWrap,
        isOwn ? styles.bubbleWrapOwn : styles.bubbleWrapOther,
        isGrouped && { marginBottom: 2 },
      ]}
    >
      {isOwn ? (
        <LinearGradient
          colors={['#7C3AED', '#5B21B6']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            styles.bubble,
            styles.bubbleOwn,
            isGrouped && styles.bubbleGroupedOwn,
          ]}
        >
          <Text style={styles.bubbleTextOwn}>{msg.content}</Text>
        </LinearGradient>
      ) : (
        <View
          style={[
            styles.bubble,
            styles.bubbleOther,
            isGrouped && styles.bubbleGroupedOther,
          ]}
        >
          <Text style={styles.bubbleTextOther}>{msg.content}</Text>
        </View>
      )}

      {showTimestamp && (
        <View
          style={[
            styles.timestampRow,
            isOwn ? styles.timestampRowOwn : styles.timestampRowOther,
          ]}
        >
          <Text style={styles.timestamp}>{formatMsgTime(msg.createdAt)}</Text>
          <ReadReceipt msg={msg} currentUserId={currentUserId} />
        </View>
      )}
    </View>
  );
}

// ─── Avatar Circle ────────────────────────────────────────────────────────────
function AvatarCircle({ name, size = 36 }: { name: string; size?: number }) {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
  return (
    <View
      style={[
        styles.avatarCircle,
        { width: size, height: size, borderRadius: size / 2 },
      ]}
    >
      <Text style={{ color: colors.text, fontWeight: '700', fontSize: size * 0.38 }}>
        {initials}
      </Text>
    </View>
  );
}

// ─── 3-dot Menu ───────────────────────────────────────────────────────────────
function MenuModal({
  visible,
  onClose,
  onBlock,
  onReport,
  onUnmatch,
}: {
  visible: boolean;
  onClose: () => void;
  onBlock: () => void;
  onReport: () => void;
  onUnmatch: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.menuOverlay} onPress={onClose}>
        <View style={styles.menuSheet}>
          {[
            { label: 'Block user', icon: 'ban-outline', action: onBlock, danger: false },
            { label: 'Report', icon: 'flag-outline', action: onReport, danger: false },
            { label: 'Unmatch', icon: 'heart-dislike-outline', action: onUnmatch, danger: true },
          ].map((item) => (
            <Pressable
              key={item.label}
              onPress={() => {
                item.action();
                onClose();
              }}
              style={styles.menuItem}
            >
              <Ionicons
                name={item.icon as any}
                size={20}
                color={item.danger ? colors.danger : colors.text}
              />
              <Text
                style={[
                  styles.menuItemText,
                  item.danger && { color: colors.danger },
                ]}
              >
                {item.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </Pressable>
    </Modal>
  );
}

// ─── Main Chat Screen ─────────────────────────────────────────────────────────
export default function ChatScreen() {
  const { id: chatId } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const user = useAuthStore((s) => s.user);
  const typingByChat = useChatStore((s) => s.typingByChat);
  const setTyping = useChatStore((s) => s.setTyping);

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [menuVisible, setMenuVisible] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const flatListRef = useRef<FlatList>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);

  const isOtherTyping = typingByChat[chatId] ?? false;

  // ── Fetch chat metadata ────────────────────────────────────────────────────
  const { data: chatData } = useQuery({
    queryKey: ['chat', chatId],
    queryFn: async () => {
      const res = await api.get<{ chat: Chat }>(`/chats/${chatId}`);
      return res.data.chat;
    },
    enabled: !!chatId,
  });

  const otherUser = chatData?.otherUser;

  // ── Fetch messages (page 1) ───────────────────────────────────────────────
  const { isLoading: messagesLoading } = useQuery({
    queryKey: ['messages', chatId, 1],
    queryFn: async () => {
      const res = await api.get<{ messages: Message[]; hasMore: boolean }>(
        `/chats/${chatId}/messages`,
        { page: 1, limit: 40 }
      );
      setMessages(res.data.messages);
      setHasMore(res.data.hasMore);
      return res.data;
    },
    enabled: !!chatId,
  });

  // ── Load more messages ────────────────────────────────────────────────────
  const loadMore = useCallback(async () => {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const res = await api.get<{ messages: Message[]; hasMore: boolean }>(
        `/chats/${chatId}/messages`,
        { page: nextPage, limit: 40 }
      );
      setMessages((prev) => [...prev, ...res.data.messages]);
      setHasMore(res.data.hasMore);
      setPage(nextPage);
    } catch {
      // swallow
    } finally {
      setLoadingMore(false);
    }
  }, [chatId, hasMore, loadingMore, page]);

  // ── Mark as read on focus ─────────────────────────────────────────────────
  useFocusEffect(
    useCallback(() => {
      if (chatId) {
        api.post(`/chats/${chatId}/read`).catch(() => {});
        queryClient.setQueryData(['chats'], (old: { chats: Chat[] } | undefined) => {
          if (!old) return old;
          return {
            chats: old.chats.map((c) =>
              c.id === chatId ? { ...c, unreadCount: 0 } : c
            ),
          };
        });
      }
    }, [chatId, queryClient])
  );

  // ── Socket: join room + listen for events ─────────────────────────────────
  useEffect(() => {
    if (!chatId) return;

    socketClient.emit('chat:join', { chatId });

    const handleNewMessage = (data: unknown) => {
      const msg = data as Message;
      if (msg.chatId !== chatId) return;
      setMessages((prev) => {
        // Deduplicate by id
        if (prev.find((m) => m.id === msg.id)) return prev;
        return [msg, ...prev];
      });
      // Auto mark as read if screen is focused
      api.post(`/chats/${chatId}/read`).catch(() => {});
    };

    const handleTypingUpdate = (data: unknown) => {
      const { userId, isTyping } = data as { userId: string; isTyping: boolean };
      if (userId !== user?.id) {
        setTyping(chatId, isTyping);
      }
    };

    const handleMessageRead = (data: unknown) => {
      const { messageId, readAt } = data as { messageId: string; readAt: string };
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, readAt } : m))
      );
    };

    socketClient.on('message:new', handleNewMessage);
    socketClient.on('typing:update', handleTypingUpdate);
    socketClient.on('message:read', handleMessageRead);

    return () => {
      socketClient.emit('chat:leave', { chatId });
      socketClient.off('message:new', handleNewMessage);
      socketClient.off('typing:update', handleTypingUpdate);
      socketClient.off('message:read', handleMessageRead);
      setTyping(chatId, false);
    };
  }, [chatId, user?.id, setTyping]);

  // ── Send message mutation ─────────────────────────────────────────────────
  const sendMutation = useMutation({
    mutationFn: async (content: string) => {
      const res = await api.post<{ message: Message }>(
        `/chats/${chatId}/messages`,
        { content, type: 'text' }
      );
      return res.data.message;
    },
    onMutate: async (content) => {
      // Optimistic message
      const optimisticMsg: Message = {
        id: `optimistic-${Date.now()}`,
        chatId,
        senderId: user?.id ?? '',
        content,
        type: 'text',
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [optimisticMsg, ...prev]);
      return { optimisticMsg };
    },
    onSuccess: (serverMsg, _vars, ctx) => {
      // Replace optimistic with real
      setMessages((prev) =>
        prev.map((m) =>
          m.id === ctx?.optimisticMsg.id ? serverMsg : m
        )
      );
    },
    onError: (_err, _vars, ctx) => {
      // Remove optimistic on failure
      setMessages((prev) =>
        prev.filter((m) => m.id !== ctx?.optimisticMsg.id)
      );
    },
  });

  // ── Send handler ──────────────────────────────────────────────────────────
  const handleSend = useCallback(() => {
    const text = inputText.trim();
    if (!text) return;
    setInputText('');

    // Stop typing indicator
    if (isTypingRef.current) {
      socketClient.emit('typing:stop', { chatId });
      isTypingRef.current = false;
    }
    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current);
    }

    // Emit via socket for real-time
    socketClient.emit('message:send', { chatId, content: text, type: 'text' });
    // Persist via API
    sendMutation.mutate(text);
  }, [chatId, inputText, sendMutation]);

  // ── Typing events ─────────────────────────────────────────────────────────
  const handleInputChange = useCallback(
    (text: string) => {
      setInputText(text);

      if (!isTypingRef.current) {
        socketClient.emit('typing:start', { chatId });
        isTypingRef.current = true;
      }

      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      typingTimerRef.current = setTimeout(() => {
        socketClient.emit('typing:stop', { chatId });
        isTypingRef.current = false;
      }, 1500);
    },
    [chatId]
  );

  // ── Build list items with separators ─────────────────────────────────────
  const listItems = useMemo<ListItem[]>(() => {
    const items: ListItem[] = [];
    // messages are newest-first (for inverted FlatList)
    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      items.push({ type: 'message', data: msg });

      // Check if next message is on a different day
      const next = messages[i + 1];
      if (!next || isDifferentDay(msg.createdAt, next.createdAt)) {
        items.push({ type: 'separator', date: formatDateSeparator(msg.createdAt) });
      }
    }
    return items;
  }, [messages]);

  // ── Render item ───────────────────────────────────────────────────────────
  const renderItem = useCallback(
    ({ item, index }: { item: ListItem; index: number }) => {
      if (item.type === 'separator') {
        return <DateSeparator date={item.date} />;
      }

      const msg = item.data;
      const isOwn = msg.senderId === user?.id;

      // Check grouping: same sender as next message (index+1 in inverted list = older)
      const prevItem = listItems[index - 1];
      const isGrouped =
        prevItem?.type === 'message' &&
        prevItem.data.senderId === msg.senderId &&
        Math.abs(
          new Date(prevItem.data.createdAt).getTime() -
            new Date(msg.createdAt).getTime()
        ) < 3 * 60 * 1000;

      // Timestamp: show if next item is different sender / type / time gap
      const nextItem = listItems[index + 1];
      const showTimestamp =
        !nextItem ||
        nextItem.type === 'separator' ||
        nextItem.data.senderId !== msg.senderId ||
        Math.abs(
          new Date(msg.createdAt).getTime() -
            new Date(nextItem.data.createdAt).getTime()
        ) > 3 * 60 * 1000;

      return (
        <MessageBubble
          msg={msg}
          isOwn={isOwn}
          showTimestamp={showTimestamp}
          isGrouped={isGrouped}
          currentUserId={user?.id ?? ''}
        />
      );
    },
    [listItems, user?.id]
  );

  // ── Handle call navigation ────────────────────────────────────────────────
  const handleVideoCall = useCallback(() => {
    router.push({
      pathname: '/(app)/calls/video',
      params: {
        chatId,
        userId: otherUser?.id,
        callerName: otherUser?.name,
        callType: 'video',
        isIncoming: 'false',
      },
    });
  }, [router, chatId, otherUser]);

  const handleAudioCall = useCallback(() => {
    router.push({
      pathname: '/(app)/calls/audio',
      params: {
        chatId,
        userId: otherUser?.id,
        callerName: otherUser?.name,
        callType: 'audio',
        isIncoming: 'false',
      },
    });
  }, [router, chatId, otherUser]);

  const handleBlock = useCallback(() => {
    Alert.alert('Block User', `Block ${otherUser?.name}? You won't see each other on VYBEON.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Block',
        style: 'destructive',
        onPress: async () => {
          await api.post(`/users/${otherUser?.id}/block`);
          router.back();
        },
      },
    ]);
  }, [otherUser, router]);

  const handleReport = useCallback(() => {
    router.push({ pathname: '/report-block', params: { userId: otherUser?.id } });
  }, [otherUser, router]);

  const handleUnmatch = useCallback(() => {
    Alert.alert('Unmatch', `Unmatch with ${otherUser?.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Unmatch',
        style: 'destructive',
        onPress: async () => {
          await api.delete(`/chats/${chatId}`);
          queryClient.invalidateQueries({ queryKey: ['chats'] });
          router.back();
        },
      },
    ]);
  }, [otherUser, chatId, queryClient, router]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#1A1A2E" />
        </Pressable>

        <Pressable
          style={styles.headerUserInfo}
          onPress={() =>
            router.push({
              pathname: '/user/[id]',
              params: { id: otherUser?.id ?? '' },
            })
          }
        >
          <AvatarCircle name={otherUser?.name ?? '?'} size={36} />
          <View style={styles.headerNameCol}>
            <View style={styles.headerNameRow}>
              <Text style={styles.headerName} numberOfLines={1}>
                {otherUser?.name ?? 'Chat'}
              </Text>
              {otherUser?.isVerified && (
                <Ionicons name="checkmark-circle" size={13} color={colors.accent} style={{ marginLeft: 3 }} />
              )}
            </View>
            <Text style={styles.headerStatus}>
              {otherUser?.isOnline ? 'Online now' : 'Offline'}
            </Text>
          </View>
        </Pressable>

        <View style={styles.headerActions}>
          <Pressable style={styles.iconBtn} onPress={handleAudioCall}>
            <Ionicons name="call-outline" size={21} color="#1A1A2E" />
          </Pressable>
          <Pressable style={styles.iconBtn} onPress={handleVideoCall}>
            <Ionicons name="videocam-outline" size={21} color="#1A1A2E" />
          </Pressable>
          <Pressable style={styles.iconBtn} onPress={() => setMenuVisible(true)}>
            <Ionicons name="ellipsis-vertical" size={21} color="#1A1A2E" />
          </Pressable>
        </View>
      </View>

      {/* Messages */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        {messagesLoading ? (
          <View style={styles.messagesLoadingWrap}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={listItems}
            keyExtractor={(item, i) =>
              item.type === 'message' ? item.data.id : `sep-${i}`
            }
            renderItem={renderItem}
            inverted
            contentContainerStyle={styles.messagesList}
            showsVerticalScrollIndicator={false}
            onEndReached={loadMore}
            onEndReachedThreshold={0.3}
            ListHeaderComponent={
              isOtherTyping ? (
                <TypingIndicator name={otherUser?.name ?? 'User'} />
              ) : null
            }
            ListFooterComponent={
              loadingMore ? (
                <View style={styles.loadMoreWrap}>
                  <ActivityIndicator size="small" color={colors.primary} />
                </View>
              ) : null
            }
          />
        )}

        {/* Input Bar */}
        <View
          style={[
            styles.inputBar,
            { paddingBottom: insets.bottom > 0 ? insets.bottom : 12 },
          ]}
        >
          {/* Attach */}
          <Pressable
            style={styles.inputIconBtn}
            onPress={() => Alert.alert('Coming soon', 'Media sharing is coming soon!')}
          >
            <Ionicons name="attach-outline" size={22} color={colors.subtext} />
          </Pressable>

          {/* Text input */}
          <View style={styles.inputWrap}>
            <TextInput
              style={styles.textInput}
              value={inputText}
              onChangeText={handleInputChange}
              placeholder="Type a message..."
              placeholderTextColor={colors.subtext}
              multiline
              maxLength={1000}
              returnKeyType="default"
            />
            {/* Emoji button */}
            <Pressable style={styles.emojiBtn}>
              <Ionicons name="happy-outline" size={20} color={colors.subtext} />
            </Pressable>
          </View>

          {/* Send or Voice */}
          {inputText.trim().length > 0 ? (
            <Pressable style={styles.sendBtn} onPress={handleSend}>
              <LinearGradient
                colors={['#7C3AED', '#5B21B6']}
                style={styles.sendBtnGradient}
              >
                <Ionicons name="send" size={18} color={colors.text} />
              </LinearGradient>
            </Pressable>
          ) : (
            <Pressable
              style={styles.inputIconBtn}
              onPress={() => Alert.alert('Coming soon', 'Voice notes are coming soon!')}
            >
              <Ionicons name="mic-outline" size={22} color={colors.subtext} />
            </Pressable>
          )}
        </View>
      </KeyboardAvoidingView>

      {/* 3-dot Menu */}
      <MenuModal
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        onBlock={handleBlock}
        onReport={handleReport}
        onUnmatch={handleUnmatch}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerUserInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 4,
  },
  headerNameCol: {
    marginLeft: 10,
    flex: 1,
  },
  headerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A2E',
    maxWidth: 150,
  },
  headerStatus: {
    fontSize: 11,
    color: '#10B981',
    marginTop: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  iconBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
  },
  avatarCircle: {
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Messages
  messagesLoadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messagesList: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 4,
  },
  loadMoreWrap: {
    paddingVertical: 16,
    alignItems: 'center',
  },

  // Bubbles
  bubbleWrap: {
    marginVertical: 2,
    maxWidth: '80%',
  },
  bubbleWrapOwn: {
    alignSelf: 'flex-end',
    alignItems: 'flex-end',
  },
  bubbleWrapOther: {
    alignSelf: 'flex-start',
    alignItems: 'flex-start',
  },
  bubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
  },
  bubbleOwn: {
    borderBottomRightRadius: 4,
  },
  bubbleGroupedOwn: {
    borderTopRightRadius: 6,
    borderBottomRightRadius: 6,
  },
  bubbleOther: {
    backgroundColor: '#F3F4F6',
    borderBottomLeftRadius: 4,
  },
  bubbleGroupedOther: {
    borderTopLeftRadius: 6,
    borderBottomLeftRadius: 6,
  },
  bubbleTextOwn: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 21,
  },
  bubbleTextOther: {
    color: '#1A1A2E',
    fontSize: 15,
    lineHeight: 21,
  },
  timestampRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
    marginHorizontal: 4,
    marginBottom: 6,
  },
  timestampRowOwn: {
    justifyContent: 'flex-end',
  },
  timestampRowOther: {
    justifyContent: 'flex-start',
  },
  timestamp: {
    fontSize: 10,
    color: colors.subtext,
  },

  // Date Separator
  separatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
    gap: 8,
  },
  separatorLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  separatorText: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },

  // Typing
  typingWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingBottom: 8,
    gap: 8,
  },
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 4,
  },
  typingDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.subtext,
  },
  typingLabel: {
    fontSize: 12,
    color: colors.subtext,
    fontStyle: 'italic',
  },

  // Input Bar
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 8,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    gap: 6,
  },
  inputIconBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  inputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#F3F4F6',
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingVertical: 8,
    minHeight: 44,
    maxHeight: 120,
  },
  textInput: {
    flex: 1,
    color: '#1A1A2E',
    fontSize: 15,
    lineHeight: 20,
    maxHeight: 100,
    paddingTop: 0,
    paddingBottom: 0,
  },
  emojiBtn: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
    alignSelf: 'flex-end',
    marginBottom: 1,
  },
  sendBtn: {
    marginBottom: 2,
  },
  sendBtnGradient: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOpacity: 0.5,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },

  // Menu Modal
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  menuSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 40,
    paddingTop: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    gap: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  menuItemText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
});
