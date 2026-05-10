import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  TextInput, FlatList, KeyboardAvoidingView,
  Platform, StatusBar, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { useStrangerStore } from '../../../src/stores/strangerStore';
import { useAuthStore } from '../../../src/stores/authStore';

// ─── Color tokens ─────────────────────────────────────────────────────────────
const bg     = '#F8F8FC';
const ink    = '#1A1A2E';
const muted  = '#6B7280';
const white  = '#FFFFFF';
const brand  = '#7C3AED';
const accent = '#00C2CB';
const border = '#E8E8F0';

// ─── Message bubble ───────────────────────────────────────────────────────────
function Bubble({ content, isMine, time }: { content: string; isMine: boolean; time: string }) {
  return (
    <Animated.View
      entering={FadeInDown.duration(200)}
      style={[bubble.row, isMine && bubble.rowMine]}
    >
      {isMine ? (
        <LinearGradient
          colors={['#7C3AED', '#9333EA']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={[bubble.wrap, bubble.wrapMine]}
        >
          <Text style={[bubble.text, bubble.textMine]}>{content}</Text>
          <Text style={bubble.timeMine}>{time}</Text>
        </LinearGradient>
      ) : (
        <View style={[bubble.wrap, bubble.wrapTheirs]}>
          <Text style={bubble.text}>{content}</Text>
          <Text style={bubble.time}>{time}</Text>
        </View>
      )}
    </Animated.View>
  );
}

// ─── Typing indicator ─────────────────────────────────────────────────────────
function TypingIndicator() {
  return (
    <View style={typing.row}>
      <View style={typing.bubble}>
        <Text style={typing.text}>Stranger is typing…</Text>
      </View>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function StrangerChatScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const {
    session, messages, partnerTyping,
    friendRequestSent, friendRequestReceived,
    status,
    sendMessage, sendTyping, sendFriendRequest,
    nextStranger, endSession,
  } = useStrangerStore();

  const [text, setText] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const flatRef = useRef<FlatList>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Session timer
  useEffect(() => {
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const mm = String(Math.floor(elapsed / 60)).padStart(2, '0');
  const ss = String(elapsed % 60).padStart(2, '0');

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages.length, partnerTyping]);

  // Handle session ended by partner
  useEffect(() => {
    if (status === 'ended') {
      Alert.alert('Chat Ended', 'The stranger has left the chat.', [
        { text: 'Next Stranger', onPress: () => { nextStranger(); router.replace('/(app)/stranger/queue' as any); } },
        { text: 'Go Home', style: 'cancel', onPress: () => router.replace('/(tabs)/meet' as any) },
      ]);
    }
  }, [status]);

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    sendMessage(trimmed);
    setText('');
    sendTyping(false);
  };

  const handleTextChange = (t: string) => {
    setText(t);
    sendTyping(true);
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => sendTyping(false), 2000);
  };

  const handleNext = () => {
    Alert.alert('Skip Stranger?', 'You\'ll be queued for a new match.', [
      { text: 'Skip', style: 'destructive', onPress: () => {
        nextStranger();
        router.replace('/(app)/stranger/queue' as any);
      }},
      { text: 'Stay', style: 'cancel' },
    ]);
  };

  const handleEnd = () => {
    Alert.alert('End Chat?', 'This session will be closed.', [
      { text: 'End', style: 'destructive', onPress: () => {
        endSession();
        router.replace('/(tabs)/meet' as any);
      }},
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleReport = () => {
    router.push({ pathname: '/(app)/stranger/report' as any, params: { sessionId: session?.sessionId } });
  };

  const handleFriendRequest = () => {
    if (friendRequestSent) return;
    sendFriendRequest();
  };

  const myUserId = user?.id ?? '';

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <StatusBar barStyle="dark-content" backgroundColor={bg} />

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <LinearGradient
              colors={['#9333EA', accent]}
              style={styles.avatarCircle}
            >
              <Ionicons name="person" size={20} color={white} />
            </LinearGradient>
            <View>
              <Text style={styles.strangerName}>Anonymous Stranger</Text>
              <Text style={styles.sessionInfo}>
                {session?.partner.sharedInterests?.length
                  ? `${session.partner.sharedInterests.slice(0, 2).join(', ')}`
                  : 'Connected'
                }
                {' · '}{mm}:{ss}
              </Text>
            </View>
          </View>

          {/* Action buttons */}
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={[styles.actionBtn, friendRequestSent && styles.actionBtnActive]}
              onPress={handleFriendRequest}
              activeOpacity={0.75}
            >
              <Ionicons
                name={friendRequestSent ? 'person-add' : 'person-add-outline'}
                size={18}
                color={friendRequestSent ? brand : muted}
              />
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={handleReport} activeOpacity={0.75}>
              <Ionicons name="flag-outline" size={18} color={muted} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Friend request received banner */}
        {friendRequestReceived && !friendRequestSent && (
          <Animated.View entering={FadeInDown.duration(300)} style={styles.frBanner}>
            <Text style={styles.frText}>Stranger wants to connect on VYBE!</Text>
            <TouchableOpacity onPress={handleFriendRequest} style={styles.frBtn}>
              <Text style={styles.frBtnText}>Connect</Text>
            </TouchableOpacity>
          </Animated.View>
        )}
        {friendRequestSent && (
          <Animated.View entering={FadeInDown.duration(300)} style={[styles.frBanner, styles.frBannerSent]}>
            <Ionicons name="checkmark-circle" size={16} color={brand} />
            <Text style={styles.frText}>Friend request sent! Waiting for them…</Text>
          </Animated.View>
        )}

        {/* ── Messages ────────────────────────────────────────────────────── */}
        <FlatList
          ref={flatRef}
          data={messages}
          keyExtractor={(m) => m.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.messagesList}
          renderItem={({ item }) => (
            <Bubble
              content={item.content}
              isMine={item.senderId === myUserId}
              time={formatTime(item.createdAt)}
            />
          )}
          ListFooterComponent={partnerTyping ? <TypingIndicator /> : null}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <LinearGradient
                colors={['#EDE9FE', '#DDD6FE']}
                style={styles.emptyIcon}
              >
                <Ionicons name="chatbubble-ellipses-outline" size={28} color={brand} />
              </LinearGradient>
              <Text style={styles.emptyTitle}>Say hello!</Text>
              <Text style={styles.emptyText}>Break the ice — you're both anonymous here.</Text>
            </View>
          }
        />

        {/* ── Input bar ────────────────────────────────────────────────────── */}
        <View style={[styles.inputBar, { paddingBottom: insets.bottom + 8 }]}>
          {/* Next / End buttons */}
          <View style={styles.quickActions}>
            <TouchableOpacity style={styles.quickBtn} onPress={handleNext} activeOpacity={0.8}>
              <Ionicons name="play-skip-forward-outline" size={15} color={muted} />
              <Text style={styles.quickBtnText}>Next</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.quickBtn, styles.endBtn]} onPress={handleEnd} activeOpacity={0.8}>
              <Ionicons name="stop-circle-outline" size={15} color='#EF4444' />
              <Text style={[styles.quickBtnText, { color: '#EF4444' }]}>End</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              value={text}
              onChangeText={handleTextChange}
              placeholder="Type a message…"
              placeholderTextColor={muted}
              returnKeyType="send"
              onSubmitEditing={handleSend}
              multiline
              maxLength={500}
            />
            <TouchableOpacity
              onPress={handleSend}
              activeOpacity={0.8}
              disabled={!text.trim()}
            >
              <LinearGradient
                colors={text.trim() ? ['#7C3AED', accent] : ['#E5E7EB', '#E5E7EB']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={styles.sendBtn}
              >
                <Ionicons name="arrow-up" size={18} color={text.trim() ? white : muted} />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

// ─── Bubble styles ────────────────────────────────────────────────────────────
const bubble = StyleSheet.create({
  row: { flexDirection: 'row', marginVertical: 2, paddingHorizontal: 16 },
  rowMine: { justifyContent: 'flex-end' },
  wrap: {
    maxWidth: '78%', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10,
  },
  wrapMine: { borderBottomRightRadius: 4 },
  wrapTheirs: { backgroundColor: white, borderBottomLeftRadius: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1 },
  text: { fontSize: 15, color: '#1A1A2E', lineHeight: 21 },
  textMine: { color: '#FFFFFF' },
  time: { fontSize: 10, color: '#9CA3AF', marginTop: 3, alignSelf: 'flex-end' },
  timeMine: { fontSize: 10, color: 'rgba(255,255,255,0.65)', marginTop: 3, alignSelf: 'flex-end' },
});

// ─── Typing indicator styles ──────────────────────────────────────────────────
const typing = StyleSheet.create({
  row: { paddingHorizontal: 16, marginTop: 4 },
  bubble: {
    backgroundColor: white, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 8,
    alignSelf: 'flex-start',
  },
  text: { fontSize: 12, color: '#6B7280', fontStyle: 'italic' },
});

// ─── Screen styles ────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: bg },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: white,
    borderBottomWidth: 1, borderBottomColor: border,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  avatarCircle: {
    width: 42, height: 42, borderRadius: 21,
    alignItems: 'center', justifyContent: 'center',
  },
  strangerName: { fontSize: 15, fontWeight: '700', color: ink },
  sessionInfo: { fontSize: 11, color: muted, marginTop: 1 },
  headerActions: { flexDirection: 'row', gap: 6 },
  actionBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#F3F4F6',
    alignItems: 'center', justifyContent: 'center',
  },
  actionBtnActive: { backgroundColor: '#EDE9FE' },

  // Friend request banners
  frBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#F5F3FF',
    paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: '#DDD6FE',
  },
  frBannerSent: { backgroundColor: '#F0FDF4', borderBottomColor: '#BBF7D0' },
  frText: { flex: 1, fontSize: 13, color: ink },
  frBtn: {
    backgroundColor: brand, borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  frBtnText: { fontSize: 12, fontWeight: '700', color: white },

  // Messages
  messagesList: { paddingVertical: 12, flexGrow: 1 },

  // Empty state
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, gap: 12, marginTop: 80 },
  emptyIcon: { width: 64, height: 64, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: ink },
  emptyText: { fontSize: 13, color: muted, textAlign: 'center', lineHeight: 19 },

  // Input bar
  inputBar: {
    backgroundColor: white,
    borderTopWidth: 1, borderTopColor: border,
    paddingHorizontal: 12, paddingTop: 10,
    gap: 8,
  },
  quickActions: { flexDirection: 'row', gap: 8 },
  quickBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 20, borderWidth: 1, borderColor: border,
  },
  endBtn: { borderColor: '#FEE2E2', backgroundColor: '#FFF5F5' },
  quickBtnText: { fontSize: 12, fontWeight: '600', color: muted },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  input: {
    flex: 1, backgroundColor: '#F3F4F6',
    borderRadius: 22, paddingHorizontal: 16,
    paddingTop: 10, paddingBottom: 10,
    fontSize: 15, color: ink,
    maxHeight: 120,
  },
  sendBtn: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
  },
});
