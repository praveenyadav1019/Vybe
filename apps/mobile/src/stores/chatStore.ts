import { create } from 'zustand';
import type { Chat, Message } from '../types';

// Legacy type kept for backward-compat with existing screens
export type LocalMessage = {
  id: string;
  mine: boolean;
  text: string;
  at: string;
};

interface ChatState {
  // Full chat list
  chats: Chat[];
  // Messages indexed by chatId
  messages: Record<string, Message[]>;
  activeChatId: string | null;
  typingUsers: Record<string, Set<string>>;

  // Legacy field used by existing chat screen
  typingByChat: Record<string, boolean>;

  setChats: (chats: Chat[]) => void;
  addChat: (chat: Chat) => void;
  setMessages: (chatId: string, messages: Message[]) => void;
  addMessage: (message: Message) => void;
  setActiveChat: (chatId: string | null) => void;
  updateLastMessage: (chatId: string, message: Message) => void;
  incrementUnread: (chatId: string) => void;
  clearUnread: (chatId: string) => void;
  setTyping: (chatId: string, userId: string, isTyping: boolean) => void;
  getTotalUnread: () => number;
}

export const useChatStore = create<ChatState>((set, get) => ({
  chats: [],
  messages: {},
  activeChatId: null,
  typingUsers: {},
  typingByChat: {},

  setChats: (chats) => set({ chats }),

  addChat: (chat) =>
    set((s) => ({ chats: [chat, ...s.chats] })),

  setMessages: (chatId, messages) =>
    set((s) => ({ messages: { ...s.messages, [chatId]: messages } })),

  addMessage: (message) => {
    set((s) => ({
      messages: {
        ...s.messages,
        [message.chatId]: [
          ...(s.messages[message.chatId] ?? []),
          message,
        ],
      },
    }));
    get().updateLastMessage(message.chatId, message);
  },

  setActiveChat: (chatId) => set({ activeChatId: chatId }),

  updateLastMessage: (chatId, message) =>
    set((s) => ({
      chats: s.chats.map((c) =>
        c.id === chatId ? { ...c, lastMessage: message } : c
      ),
    })),

  incrementUnread: (chatId) =>
    set((s) => ({
      chats: s.chats.map((c) =>
        c.id === chatId ? { ...c, unreadCount: c.unreadCount + 1 } : c
      ),
    })),

  clearUnread: (chatId) =>
    set((s) => ({
      chats: s.chats.map((c) =>
        c.id === chatId ? { ...c, unreadCount: 0 } : c
      ),
    })),

  setTyping: (chatId, userId, isTyping) =>
    set((s) => {
      const current = new Set(s.typingUsers[chatId] ?? []);
      if (isTyping) current.add(userId);
      else current.delete(userId);
      const typingUsers = { ...s.typingUsers, [chatId]: current };
      // Keep legacy field in sync
      const typingByChat = {
        ...s.typingByChat,
        [chatId]: current.size > 0,
      };
      return { typingUsers, typingByChat };
    }),

  getTotalUnread: () =>
    get().chats.reduce((sum, c) => sum + c.unreadCount, 0),
}));
