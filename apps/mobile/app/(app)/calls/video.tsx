import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  PanResponder,
  Alert,
  TextInput,
  ScrollView,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  FadeIn,
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withRepeat,
  FadeOut,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { colors } from '@/theme/colors';
import { socketClient } from '@/lib/socket';
import { api } from '@/lib/api';
import { useWebRTCCall } from '@/lib/rtc/useWebRTCCall';
import { RTCVideoView } from '@/lib/rtc/RTCVideoView';
import { callSignaling } from '@/lib/rtc/signaling';
import type { RTCIceServerConfig } from '@/lib/rtc/useWebRTCCall';

// WebRTC is wired via `@/lib/rtc/useWebRTCCall` (native RTCPeerConnection) +
// `@/lib/rtc/RTCVideoView` (RTCView). Both are no-ops on web/Expo Go. Signaling
// rides the existing socket `webrtc:*` relays; ICE servers come from /calls/:id/ice.

// ─── Types ────────────────────────────────────────────────────────────────────
type CallState = 'ringing' | 'connecting' | 'active' | 'ended';

// ─── Remote Video Placeholder ─────────────────────────────────────────────────
function RemoteVideoPlaceholder({ name, callState }: { name: string; callState: CallState }) {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const breathe = useSharedValue(1);

  React.useEffect(() => {
    if (callState === 'active') {
      breathe.value = withRepeat(
        withSequence(
          withSpring(1.06, { damping: 8 }),
          withSpring(1, { damping: 8 })
        ),
        -1,
        false
      );
    }
  }, [callState]);

  const avatarStyle = useAnimatedStyle(() => ({
    transform: [{ scale: breathe.value }],
  }));

  const statusMsg = {
    ringing: 'Ringing...',
    connecting: 'Connecting...',
    active: null,
    ended: 'Call Ended',
  }[callState];

  return (
    <LinearGradient
      colors={['#1A0533', '#0A0A1A', '#0A0A0A']}
      style={styles.remoteVideoPlaceholder}
      start={{ x: 0.3, y: 0 }}
      end={{ x: 0.7, y: 1 }}
    >
      <Animated.View style={[styles.remoteAvatarCircle, callState === 'active' && avatarStyle]}>
        <Text style={styles.remoteAvatarText}>{initials}</Text>
      </Animated.View>
      {statusMsg && (
        <Text style={styles.remoteVideoHint}>{statusMsg}</Text>
      )}
    </LinearGradient>
  );
}

// ─── Local Video Placeholder ──────────────────────────────────────────────────
function LocalVideoPlaceholder() {
  return (
    <View style={styles.localVideoPlaceholder}>
      {/* Shown as the RTCVideoView fallback until the local stream is ready. */}
      <LinearGradient
        colors={['#2A1050', '#1A0533']}
        style={styles.localVideoGradient}
      >
        <Ionicons name="videocam" size={20} color={colors.primary} />
      </LinearGradient>
    </View>
  );
}

// ─── Call Control Button ──────────────────────────────────────────────────────
function ControlBtn({
  icon,
  label,
  onPress,
  active = false,
  danger = false,
}: {
  icon: string;
  label: string;
  onPress: () => void;
  active?: boolean;
  danger?: boolean;
}) {
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    scale.value = withSequence(
      withSpring(0.88, { damping: 8 }),
      withSpring(1, { damping: 8 })
    );
    onPress();
  };

  const bgColor = danger
    ? colors.danger
    : active
    ? colors.primary
    : 'rgba(255,255,255,0.15)';

  return (
    <View style={styles.ctrlWrap}>
      <Animated.View style={animStyle}>
        <TouchableOpacity
          onPress={handlePress}
          activeOpacity={0.8}
          style={[
            styles.ctrlCircle,
            { backgroundColor: bgColor },
            danger && styles.ctrlDangerShadow,
            active && styles.ctrlActiveShadow,
          ]}
        >
          <Ionicons name={icon as any} size={24} color={colors.text} />
        </TouchableOpacity>
      </Animated.View>
      <Text style={styles.ctrlLabel}>{label}</Text>
    </View>
  );
}

// ─── In-call Chat Overlay ─────────────────────────────────────────────────────
function InCallChat({
  visible,
  onClose,
  chatId,
}: {
  visible: boolean;
  onClose: () => void;
  chatId?: string;
}) {
  const [text, setText] = useState('');
  const [msgs, setMsgs] = useState<{ id: string; text: string; mine: boolean }[]>([]);

  const handleSend = () => {
    const t = text.trim();
    if (!t) return;
    setMsgs((prev) => [...prev, { id: String(Date.now()), text: t, mine: true }]);
    setText('');
    if (chatId) {
      socketClient.emit('message:send', { chatId, content: t, type: 'text' });
    }
  };

  if (!visible) return null;

  return (
    <Animated.View entering={FadeIn} exiting={FadeOut} style={styles.inCallChatWrap}>
      <BlurView intensity={70} tint="dark" style={styles.inCallChatBlur}>
        <View style={styles.inCallChatHeader}>
          <Text style={styles.inCallChatTitle}>In-call Chat</Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={20} color={colors.subtext} />
          </TouchableOpacity>
        </View>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 8 }}>
          {msgs.map((m) => (
            <View
              key={m.id}
              style={[
                styles.inCallMsg,
                m.mine ? styles.inCallMsgMine : styles.inCallMsgOther,
              ]}
            >
              <Text style={styles.inCallMsgText}>{m.text}</Text>
            </View>
          ))}
        </ScrollView>
        <View style={styles.inCallInput}>
          <TextInput
            style={styles.inCallTextInput}
            value={text}
            onChangeText={setText}
            placeholder="Type..."
            placeholderTextColor={colors.subtext}
          />
          <TouchableOpacity onPress={handleSend} style={styles.inCallSendBtn}>
            <Ionicons name="send" size={16} color={colors.text} />
          </TouchableOpacity>
        </View>
      </BlurView>
    </Animated.View>
  );
}

// ─── Duration Timer ───────────────────────────────────────────────────────────
function useCallTimer(running: boolean) {
  const [seconds, setSeconds] = useState(0);
  const ref = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (running) {
      ref.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    } else {
      if (ref.current) clearInterval(ref.current);
    }
    return () => {
      if (ref.current) clearInterval(ref.current);
    };
  }, [running]);

  const mm = Math.floor(seconds / 60).toString().padStart(2, '0');
  const ss = (seconds % 60).toString().padStart(2, '0');
  return `${mm}:${ss}`;
}

// ─── Not Verified Screen ──────────────────────────────────────────────────────
function NotVerifiedScreen({ onBack }: { onBack: () => void }) {
  return (
    <LinearGradient colors={['#1A0533', '#0A0A0A']} style={styles.container}>
      <SafeAreaView style={styles.notVerifiedWrap} edges={['top', 'bottom']}>
        <Ionicons name="shield-checkmark-outline" size={64} color={colors.accent} />
        <Text style={styles.notVerifiedTitle}>Verified Users Only</Text>
        <Text style={styles.notVerifiedBody}>
          Video calls on VYBEON are exclusively available to verified users to ensure
          authenticity and safety. Complete face verification in your profile to unlock
          video calls.
        </Text>
        <TouchableOpacity onPress={onBack} style={styles.notVerifiedBtn}>
          <Text style={styles.notVerifiedBtnText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    </LinearGradient>
  );
}

// ─── Main Video Call Screen ───────────────────────────────────────────────────
export default function VideoCallScreen() {
  const {
    callId,
    userId,
    callerName,
    chatId,
    isIncoming,
    isVerified,
  } = useLocalSearchParams<{
    callId?: string;
    userId?: string;
    callerName?: string;
    chatId?: string;
    isIncoming?: string;
    isVerified?: string;
  }>();

  const router = useRouter();
  const insets = useSafeAreaInsets();

  const name = callerName ?? 'User';
  const incomingCall = isIncoming === 'true';
  // If isVerified param not passed, assume verified
  const bothVerified = isVerified !== 'false';

  const [callState, setCallState] = useState<CallState>(
    incomingCall ? 'ringing' : 'connecting'
  );
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isFrontCamera, setIsFrontCamera] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const [showChat, setShowChat] = useState(false);
  const [controlsTimer, setControlsTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  const timer = useCallTimer(callState === 'active');
  const durationSecRef = useRef(0);

  // ── WebRTC engine (native only; no-op on web/Expo Go) ─────────────────────
  const [iceServers, setIceServers] = useState<RTCIceServerConfig[]>([]);
  useEffect(() => {
    if (!callId) return;
    let cancelled = false;
    api
      .get<{ iceServers: RTCIceServerConfig[] }>(`/calls/${callId}/ice`)
      .then(({ data }) => { if (!cancelled) setIceServers(data.iceServers ?? []); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [callId]);

  // The caller (non-incoming) is the offerer. The callee accepts first, so its
  // hook mounts (and subscribes) before the caller creates the offer.
  const signaling = useMemo(() => callSignaling(userId ?? '', callId), [userId, callId]);
  const rtc = useWebRTCCall({
    active: callState === 'active' && iceServers.length > 0 && !!userId,
    video: true,
    isOfferer: !incomingCall,
    iceServers,
    signaling,
  });

  const handleToggleMute = useCallback(() => {
    setIsMuted((m) => { rtc.setMuted(!m); return !m; });
  }, [rtc]);
  const handleToggleCamera = useCallback(() => {
    setIsCameraOff((c) => { rtc.setCameraOff(!c); return !c; });
  }, [rtc]);

  // Auto-hide controls after 4 seconds of inactivity
  const resetControlsTimer = useCallback(() => {
    setShowControls(true);
    if (controlsTimer) clearTimeout(controlsTimer);
    const t = setTimeout(() => {
      if (callState === 'active') setShowControls(false);
    }, 4000);
    setControlsTimer(t);
  }, [controlsTimer, callState]);

  useEffect(() => {
    if (callState === 'active') resetControlsTimer();
    return () => {
      if (controlsTimer) clearTimeout(controlsTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [callState]);

  // ── Socket events ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!incomingCall && callState === 'connecting') {
      socketClient.emit('call:initiate', {
        callId,
        receiverId: userId,
        type: 'video',
      });
    }

    const handleAccepted = () => {
      setCallState('active');
    };

    const handleRejected = () => {
      setCallState('ended');
      setTimeout(() => router.back(), 1500);
    };

    const handleEnded = () => {
      endCall(false);
    };

    socketClient.on('call:accepted', handleAccepted);
    socketClient.on('call:rejected', handleRejected);
    socketClient.on('call:ended', handleEnded);

    return () => {
      socketClient.off('call:accepted', handleAccepted);
      socketClient.off('call:rejected', handleRejected);
      socketClient.off('call:ended', handleEnded);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const endCall = useCallback(
    async (emitEnd = true) => {
      setCallState('ended');
      rtc.leave();
      if (emitEnd) {
        socketClient.emit('call:end', { callId });
        if (callId) {
          try {
            await api.post(`/calls/${callId}/end`);
          } catch {
            // swallow
          }
        }
      }
      setTimeout(() => router.back(), 1500);
    },
    [callId, router]
  );

  const handleAccept = useCallback(async () => {
    setCallState('connecting');
    socketClient.emit('call:accept', { callId });
    if (callId) {
      try {
        await api.post(`/calls/${callId}/accept`);
      } catch {
        // swallow
      }
    }
    setTimeout(() => setCallState('active'), 1000);
  }, [callId]);

  const handleReject = useCallback(async () => {
    socketClient.emit('call:reject', { callId });
    if (callId) {
      try {
        await api.post(`/calls/${callId}/reject`);
      } catch {
        // swallow
      }
    }
    router.back();
  }, [callId, router]);

  const handleFlipCamera = useCallback(() => {
    setIsFrontCamera((prev) => !prev);
    rtc.switchCamera();
  }, [rtc]);

  // ── Not verified gate ────────────────────────────────────────────────────
  if (!bothVerified) {
    return <NotVerifiedScreen onBack={() => router.back()} />;
  }

  const statusText = {
    ringing: incomingCall ? `${name} is calling...` : 'Ringing...',
    connecting: 'Connecting...',
    active: name,
    ended: 'Call Ended',
  }[callState];

  return (
    <View style={styles.container}>
      {/* Remote video (full screen) */}
      <TouchableOpacity
        activeOpacity={1}
        onPress={resetControlsTimer}
        style={StyleSheet.absoluteFill}
      >
        {rtc.remoteStream != null ? (
          <RTCVideoView stream={rtc.remoteStream} style={StyleSheet.absoluteFillObject} />
        ) : (
          <RemoteVideoPlaceholder name={name} callState={callState} />
        )}
      </TouchableOpacity>

      {/* Local video (preview) */}
      {callState === 'active' && !isCameraOff && (
        <View
          style={[
            styles.localVideoContainer,
            { top: insets.top + 80, right: 16 },
          ]}
        >
          <RTCVideoView
            stream={rtc.localStream}
            mirror={isFrontCamera}
            style={StyleSheet.absoluteFillObject}
            fallback={<LocalVideoPlaceholder />}
          />
        </View>
      )}

      {/* Top header overlay */}
      <SafeAreaView style={styles.overlayTop} edges={['top']}>
        <Animated.View entering={FadeInDown} style={styles.header}>
          <TouchableOpacity
            onPress={() => endCall(true)}
            style={styles.backBtn}
          >
            <Ionicons name="chevron-down" size={24} color={colors.text} />
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            {callState === 'active' && (
              <View style={styles.verifiedBadge}>
                <Ionicons name="shield-checkmark" size={12} color={colors.background} />
                <Text style={styles.verifiedBadgeText}>Verified call</Text>
              </View>
            )}
            <Text style={styles.headerName} numberOfLines={1}>
              {statusText}
            </Text>
            {callState === 'active' && (
              <Text style={styles.timerText}>{timer}</Text>
            )}
          </View>

          <View style={{ width: 40 }} />
        </Animated.View>
      </SafeAreaView>

      {/* Bottom controls overlay */}
      {showControls && (
        <Animated.View
          entering={FadeIn}
          exiting={FadeOut}
          style={[
            styles.overlayBottom,
            { paddingBottom: insets.bottom + 16 },
          ]}
        >
          {Platform.OS === 'ios' ? (
            <BlurView intensity={60} tint="dark" style={styles.controlsBlur}>
              <ControlsContent
                callState={callState}
                isMuted={isMuted}
                isCameraOff={isCameraOff}
                onToggleMute={handleToggleMute}
                onToggleCamera={handleToggleCamera}
                onFlipCamera={handleFlipCamera}
                onEndCall={() => endCall(true)}
                onChat={() => setShowChat((s) => !s)}
                onAccept={handleAccept}
                onReject={handleReject}
                incomingCall={incomingCall}
              />
            </BlurView>
          ) : (
            <View style={[styles.controlsBlur, styles.controlsAndroid]}>
              <ControlsContent
                callState={callState}
                isMuted={isMuted}
                isCameraOff={isCameraOff}
                onToggleMute={handleToggleMute}
                onToggleCamera={handleToggleCamera}
                onFlipCamera={handleFlipCamera}
                onEndCall={() => endCall(true)}
                onChat={() => setShowChat((s) => !s)}
                onAccept={handleAccept}
                onReject={handleReject}
                incomingCall={incomingCall}
              />
            </View>
          )}
        </Animated.View>
      )}

      {/* In-call chat */}
      <InCallChat
        visible={showChat}
        onClose={() => setShowChat(false)}
        chatId={chatId}
      />
    </View>
  );
}

// ─── Controls Content ─────────────────────────────────────────────────────────
function ControlsContent({
  callState,
  isMuted,
  isCameraOff,
  onToggleMute,
  onToggleCamera,
  onFlipCamera,
  onEndCall,
  onChat,
  onAccept,
  onReject,
  incomingCall,
}: {
  callState: CallState;
  isMuted: boolean;
  isCameraOff: boolean;
  onToggleMute: () => void;
  onToggleCamera: () => void;
  onFlipCamera: () => void;
  onEndCall: () => void;
  onChat: () => void;
  onAccept: () => void;
  onReject: () => void;
  incomingCall: boolean;
}) {
  if (callState === 'ringing' && incomingCall) {
    return (
      <View style={styles.controlsRow}>
        <ControlBtn icon="close" label="Decline" onPress={onReject} danger />
        <ControlBtn icon="videocam" label="Accept" onPress={onAccept} />
      </View>
    );
  }

  if (callState === 'ringing' || callState === 'connecting') {
    return (
      <View style={styles.controlsRow}>
        <ControlBtn icon="close" label="Cancel" onPress={onEndCall} danger />
      </View>
    );
  }

  if (callState === 'ended') {
    return (
      <View style={styles.controlsRow}>
        <Text style={{ color: colors.subtext, fontSize: 15 }}>Ending...</Text>
      </View>
    );
  }

  // active
  return (
    <View style={styles.controlsRow}>
      <ControlBtn
        icon={isMuted ? 'mic-off' : 'mic'}
        label={isMuted ? 'Unmute' : 'Mute'}
        onPress={onToggleMute}
        active={isMuted}
      />
      <ControlBtn
        icon={isCameraOff ? 'videocam-off' : 'videocam'}
        label={isCameraOff ? 'Cam Off' : 'Camera'}
        onPress={onToggleCamera}
        active={isCameraOff}
      />
      <ControlBtn
        icon="call"
        label="End"
        onPress={onEndCall}
        danger
      />
      <ControlBtn
        icon="camera-reverse"
        label="Flip"
        onPress={onFlipCamera}
      />
      <ControlBtn
        icon="chatbubble-ellipses"
        label="Chat"
        onPress={onChat}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },

  // Remote video
  remoteVideoPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  remoteAvatarCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: colors.primary,
    shadowOpacity: 0.5,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  remoteAvatarText: {
    color: colors.text,
    fontSize: 42,
    fontWeight: '800',
  },
  remoteVideoHint: {
    color: colors.subtext,
    fontSize: 14,
    textAlign: 'center',
    marginTop: 16,
  },

  // Local video
  localVideoContainer: {
    position: 'absolute',
    zIndex: 10,
    borderRadius: 16,
    overflow: 'hidden',
    width: 100,
    height: 140,
    borderWidth: 2,
    borderColor: colors.primary,
    shadowColor: colors.primary,
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 4,
  },
  localVideoPlaceholder: {
    flex: 1,
    backgroundColor: '#1A0533',
  },
  localVideoGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Header overlay
  overlayTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.accent,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    gap: 4,
    marginBottom: 4,
  },
  verifiedBadgeText: {
    color: colors.background,
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  headerName: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  timerText: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
    letterSpacing: 1.5,
  },

  // Bottom controls overlay
  overlayBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 20,
  },
  controlsBlur: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
    paddingTop: 20,
    paddingBottom: 8,
    paddingHorizontal: 24,
  },
  controlsAndroid: {
    backgroundColor: 'rgba(10,10,10,0.85)',
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    flexWrap: 'wrap',
    gap: 12,
  },
  ctrlWrap: {
    alignItems: 'center',
    gap: 6,
  },
  ctrlCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  ctrlDangerShadow: {
    shadowColor: colors.danger,
    shadowOpacity: 0.5,
    elevation: 6,
  },
  ctrlActiveShadow: {
    shadowColor: colors.primary,
    shadowOpacity: 0.5,
    elevation: 6,
  },
  ctrlLabel: {
    fontSize: 10,
    color: colors.subtext,
    fontWeight: '600',
    textAlign: 'center',
  },

  // In-call chat
  inCallChatWrap: {
    position: 'absolute',
    bottom: 120,
    left: 16,
    right: 16,
    height: 240,
    zIndex: 30,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  inCallChatBlur: {
    flex: 1,
  },
  inCallChatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  inCallChatTitle: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 14,
  },
  inCallMsg: {
    maxWidth: '75%',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginVertical: 3,
  },
  inCallMsgMine: {
    alignSelf: 'flex-end',
    backgroundColor: colors.primary,
  },
  inCallMsgOther: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surface,
  },
  inCallMsgText: {
    color: colors.text,
    fontSize: 13,
  },
  inCallInput: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    padding: 8,
    gap: 8,
  },
  inCallTextInput: {
    flex: 1,
    color: colors.text,
    fontSize: 13,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: colors.surface,
    borderRadius: 10,
  },
  inCallSendBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Not verified
  notVerifiedWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 16,
  },
  notVerifiedTitle: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
  },
  notVerifiedBody: {
    color: colors.subtext,
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  notVerifiedBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 16,
    marginTop: 8,
  },
  notVerifiedBtnText: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 15,
  },
});
