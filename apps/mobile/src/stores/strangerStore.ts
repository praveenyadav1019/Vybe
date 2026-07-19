import { create } from 'zustand';
import { socketClient } from '../lib/socket';
import { api } from '../lib/api';
import type { RTCIceServerConfig } from '../lib/rtc/useWebRTCCall';

// ─── Types ────────────────────────────────────────────────────────────────────

export type StrangerMode      = 'text' | 'video' | 'audio';
export type GenderPref        = 'everyone' | 'male' | 'female';
export type SessionStatus     = 'idle' | 'queuing' | 'matched' | 'ended';

export interface StrangerPreferences {
  mode:       StrangerMode;
  genderPref: GenderPref;
  nearbyOnly: boolean;
  country:    string;
}

export interface StrangerPartner {
  age?:             number | null;
  sharedInterests:  string[];
  mode?:            string;
}

export interface ActiveSession {
  sessionId: string;
  roomId:    string;
  mode:      StrangerMode;
  partner:   StrangerPartner;
  startedAt: number;
  /** WebRTC ICE servers (STUN + TURN creds) delivered on video upgrade. */
  iceServers?: RTCIceServerConfig[];
  /** Whether this client should create the SDP offer for the video upgrade. */
  isOfferer?: boolean;
}

export interface StrangerMessage {
  id:        string;
  sessionId: string;
  senderId:  string;
  content:   string;
  type:      string;
  createdAt: string;
}

export interface QueueStats {
  onlineCount: number;
  queueSize:   number;
}

// ─── Store ────────────────────────────────────────────────────────────────────

interface StrangerState {
  // Preferences
  preferences: StrangerPreferences;

  // Queue state
  status:        SessionStatus;
  queuePosition: number;

  // Active session
  session:       ActiveSession | null;
  messages:      StrangerMessage[];
  partnerTyping: boolean;
  friendRequestSent:     boolean;
  friendRequestReceived: boolean;

  // Stats (for lobby screen)
  stats: QueueStats;

  // Error
  lastError: string | null;

  // Actions
  setPreferences:    (prefs: Partial<StrangerPreferences>) => void;
  joinQueue:         (lat?: number, lng?: number) => void;
  leaveQueue:        () => void;
  nextStranger:      () => void;
  endSession:        () => void;
  sendMessage:       (content: string, type?: string) => void;
  sendTyping:        (isTyping: boolean) => void;
  sendFriendRequest: () => void;
  upgradeToVideo:    () => void;
  fetchStats:        () => Promise<void>;
  clearError:        () => void;

  // Internal (called by socket event handlers)
  _onMatched:        (payload: ActiveSession) => void;
  _onMessage:        (msg: StrangerMessage) => void;
  _onTyping:         (isTyping: boolean) => void;
  _onSessionEnded:   (reason: string) => void;
  _onQueueUpdate:    (position: number, searching: boolean) => void;
  _onFriendRequest:  (from: { fromName: string; fromPhoto: string | null }) => void;
  _onFriendRequestSent: () => void;
  _onVideoReady:     (payload: { iceServers: RTCIceServerConfig[]; isOfferer: boolean; roomId: string }) => void;
  _onError:          (message: string) => void;
}

export const useStrangerStore = create<StrangerState>((set, get) => ({
  preferences: {
    mode:       'text',
    genderPref: 'everyone',
    nearbyOnly: false,
    country:    'IN',
  },

  status:        'idle',
  queuePosition: 0,
  session:       null,
  messages:      [],
  partnerTyping: false,
  friendRequestSent:     false,
  friendRequestReceived: false,
  stats:         { onlineCount: 0, queueSize: 0 },
  lastError:     null,

  // ── Preferences ─────────────────────────────────────────────────────────────

  setPreferences: (prefs) =>
    set((s) => ({ preferences: { ...s.preferences, ...prefs } })),

  // ── Queue actions ────────────────────────────────────────────────────────────

  joinQueue: (lat, lng) => {
    const { preferences } = get();
    set({ status: 'queuing', queuePosition: 0, lastError: null, messages: [] });

    socketClient.emit('stranger:join-queue', {
      mode:       preferences.mode,
      genderPref: preferences.genderPref,
      nearbyOnly: preferences.nearbyOnly,
      country:    preferences.country,
      lat,
      lng,
    });
  },

  leaveQueue: () => {
    socketClient.emit('stranger:leave-queue', {});
    set({ status: 'idle', queuePosition: 0 });
  },

  // ── Session actions ──────────────────────────────────────────────────────────

  nextStranger: () => {
    const { preferences } = get();
    socketClient.emit('stranger:next', { preferences });
    set({
      status:        'queuing',
      session:       null,
      messages:      [],
      partnerTyping: false,
      friendRequestSent:     false,
      friendRequestReceived: false,
      lastError:     null,
    });
  },

  endSession: () => {
    socketClient.emit('stranger:end', {});
    set({ status: 'idle', session: null, messages: [], partnerTyping: false });
  },

  sendMessage: (content, type = 'text') => {
    socketClient.emit('stranger:message', { content, type });
  },

  sendTyping: (isTyping) => {
    socketClient.emit('stranger:typing', { isTyping });
  },

  sendFriendRequest: () => {
    socketClient.emit('stranger:friend-request', {});
  },

  upgradeToVideo: () => {
    socketClient.emit('stranger:upgrade-video', {});
  },

  fetchStats: async () => {
    try {
      const res = await api.get<{ onlineCount: number; queueSize: number }>('/stranger/stats');
      set({ stats: res.data });
    } catch {
      // non-critical, ignore
    }
  },

  clearError: () => set({ lastError: null }),

  // ── Internal socket handlers ─────────────────────────────────────────────────

  _onMatched: (payload) => {
    set({
      status:  'matched',
      session: { ...payload, startedAt: Date.now() },
      messages: [],
      partnerTyping: false,
      friendRequestSent:     false,
      friendRequestReceived: false,
    });
  },

  _onMessage: (msg) => {
    set((s) => ({ messages: [...s.messages, msg] }));
  },

  _onTyping: (isTyping) => {
    set({ partnerTyping: isTyping });
    // Auto-clear typing indicator after 4 seconds
    if (isTyping) {
      setTimeout(() => {
        set((s) => (s.partnerTyping ? { partnerTyping: false } : {}));
      }, 4000);
    }
  },

  _onSessionEnded: (reason) => {
    // If they were matched keep "ended" state so UI can show reason
    const wasMatched = get().status === 'matched';
    set({
      status:        wasMatched ? 'ended' : 'idle',
      partnerTyping: false,
      lastError:     reason === 'reported' ? 'Session ended due to a report.' : null,
    });
  },

  _onQueueUpdate: (position, searching) => {
    if (searching) {
      set({ status: 'queuing', queuePosition: position });
    } else {
      set({ status: 'idle', queuePosition: 0 });
    }
  },

  _onFriendRequest: (from) => {
    set({ friendRequestReceived: true });
  },

  _onFriendRequestSent: () => {
    set({ friendRequestSent: true });
  },

  _onVideoReady: (payload) => {
    set((s) => ({
      session: s.session
        ? {
            ...s.session,
            mode:       'video',
            iceServers: payload.iceServers,
            isOfferer:  payload.isOfferer,
            roomId:     payload.roomId,
          }
        : null,
    }));
  },

  _onError: (message) => {
    set({ lastError: message });
  },
}));

// ─── Socket event wiring ──────────────────────────────────────────────────────
// Call this once after socket connects (from useSocket hook or tabs layout).

export function attachStrangerSocketListeners() {
  const store = useStrangerStore.getState();

  socketClient.on('stranger:matched',      (raw) => store._onMatched(raw as ActiveSession));
  socketClient.on('stranger:message',      (raw) => store._onMessage(raw as StrangerMessage));
  socketClient.on('stranger:typing',       (raw) => {
    const { isTyping } = raw as { userId: string; isTyping: boolean };
    store._onTyping(isTyping);
  });
  socketClient.on('stranger:session-ended', (raw) => {
    const { reason } = raw as { sessionId: string; reason: string };
    store._onSessionEnded(reason);
  });
  socketClient.on('stranger:queue-update', (raw) => {
    const { position, searching } = raw as { position: number; searching: boolean };
    store._onQueueUpdate(position, searching);
  });
  socketClient.on('stranger:friend-request', (raw) => {
    store._onFriendRequest(raw as { fromName: string; fromPhoto: string | null });
  });
  socketClient.on('stranger:friend-request-sent', () => {
    store._onFriendRequestSent();
  });
  socketClient.on('stranger:video-ready', (raw) => {
    store._onVideoReady(raw as { iceServers: RTCIceServerConfig[]; isOfferer: boolean; roomId: string });
  });
  socketClient.on('stranger:error', (raw) => {
    const { message } = raw as { code: string; message: string };
    store._onError(message);
  });
}
