import { useEffect, useCallback, useRef } from 'react';
import { socketClient } from '../lib/socket';
import { useAuthStore } from '../stores/authStore';
import { useChatStore } from '../stores/chatStore';
import { useDiscoveryStore } from '../stores/discoveryStore';
import { attachStrangerSocketListeners } from '../stores/strangerStore';
import type { Message, NearbyUser, Mode, Distance } from '../types';

export function useSocket() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { addMessage, setTyping, incrementUnread, activeChatId } =
    useChatStore();
  const { setNearbyUsers } = useDiscoveryStore();

  useEffect(() => {
    if (!isAuthenticated) return;

    let mounted = true;

    const connectSocket = async () => {
      try {
        await socketClient.connect();
        if (!mounted) return;

        socketClient.on('message:new', (raw: unknown) => {
          const msg = raw as Message;
          addMessage(msg);
          if (msg.chatId !== activeChatId) {
            incrementUnread(msg.chatId);
          }
        });

        socketClient.on('typing:update', (raw: unknown) => {
          const { chatId, userId, isTyping } = raw as {
            chatId: string;
            userId: string;
            isTyping: boolean;
          };
          setTyping(chatId, userId, isTyping);
        });

        // Wire stranger chat listeners (idempotent — socketClient.on deduplication is safe)
        attachStrangerSocketListeners();

        socketClient.on('nearby:update', (raw: unknown) => {
          const payload = raw as {
            users: Array<{
              id: string; name: string; age: number;
              photoUrl?: string; verified?: boolean;
              mode?: string; interests?: string[];
              isOnline?: boolean; distanceBucket?: string;
            }>;
          };
          const modeMap: Record<string, Mode> = {
            dating: 'dating', hook: 'hook',
            co_travel: 'co-travel', night_out: 'night-out',
            club_mates: 'club-mates', happening: 'happening',
          };
          const normalized: NearbyUser[] = (payload.users ?? []).map((u) => ({
            id: u.id,
            name: u.name,
            age: u.age,
            photos: u.photoUrl ? [u.photoUrl] : [],
            distance: (u.distanceBucket ?? 'Nearby') as Distance,
            activeMode: modeMap[u.mode ?? ''] ?? 'happening',
            isVerified: u.verified ?? false,
            isOnline: u.isOnline ?? false,
            interests: u.interests ?? [],
          }));
          setNearbyUsers(normalized);
        });
      } catch (err) {
        console.error('[Socket] Connection failed:', err);
      }
    };

    void connectSocket();

    return () => {
      mounted = false;
      socketClient.disconnect();
    };
    // activeChatId intentionally excluded — it changes frequently and we
    // don't want to reconnect on every chat navigation
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  const sendMessage = useCallback(
    (chatId: string, content: string, type = 'text') => {
      socketClient.emit('message:send', { chatId, content, type });
    },
    []
  );

  const sendTypingStart = useCallback((chatId: string) => {
    socketClient.emit('typing:start', { chatId });
  }, []);

  const sendTypingStop = useCallback((chatId: string) => {
    socketClient.emit('typing:stop', { chatId });
  }, []);

  return { sendMessage, sendTypingStart, sendTypingStop };
}
