import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Vibration,
  Alert,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSpring,
  withSequence,
  FadeIn,
  cancelAnimation,
  Easing,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { colors } from '@/theme/colors';
import { socketClient } from '@/lib/socket';
import { api } from '@/lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────
type CallState = 'ringing' | 'connecting' | 'active' | 'ended';

// ─── Avatar with glow ring ────────────────────────────────────────────────────
function CallerAvatar({
  name,
  size = 100,
}: {
  name: string;
  size?: number;
}) {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <View
      style={[
        styles.callerAvatar,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
        },
      ]}
    >
      <Text style={[styles.callerInitials, { fontSize: size * 0.3 }]}>
        {initials}
      </Text>
    </View>
  );
}

// ─── Pulsing Ring ─────────────────────────────────────────────────────────────
function PulsingRing({ size, delay = 0 }: { size: number; delay?: number }) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0.6);

  useEffect(() => {
    setTimeout(() => {
      scale.value = withRepeat(
        withTiming(1.6, { duration: 1400, easing: Easing.out(Easing.ease) }),
        -1,
        false
      );
      opacity.value = withRepeat(
        withTiming(0, { duration: 1400, easing: Easing.out(Easing.ease) }),
        -1,
        false
      );
    }, delay);

    return () => {
      cancelAnimation(scale);
      cancelAnimation(opacity);
    };
  }, [scale, opacity, delay]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        animStyle,
        {
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: colors.primary,
        },
      ]}
    />
  );
}

// ─── Call Control Button ──────────────────────────────────────────────────────
function CallBtn({
  icon,
  label,
  onPress,
  active = false,
  danger = false,
  size = 64,
}: {
  icon: string;
  label: string;
  onPress: () => void;
  active?: boolean;
  danger?: boolean;
  size?: number;
}) {
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    scale.value = withSequence(
      withSpring(0.9, { damping: 8, stiffness: 200 }),
      withSpring(1, { damping: 8, stiffness: 200 })
    );
    onPress();
  };

  const bgColor = danger
    ? colors.danger
    : active
    ? colors.primary
    : 'rgba(255,255,255,0.12)';

  return (
    <View style={styles.callBtnWrap}>
      <Animated.View style={animStyle}>
        <TouchableOpacity
          onPress={handlePress}
          style={[
            styles.callBtnCircle,
            { width: size, height: size, borderRadius: size / 2, backgroundColor: bgColor },
            danger && styles.callBtnDangerShadow,
          ]}
          activeOpacity={0.8}
        >
          <Ionicons
            name={icon as any}
            size={size * 0.38}
            color={colors.text}
          />
        </TouchableOpacity>
      </Animated.View>
      <Text style={styles.callBtnLabel}>{label}</Text>
    </View>
  );
}

// ─── Duration Timer ───────────────────────────────────────────────────────────
function DurationTimer({ running }: { running: boolean }) {
  const [seconds, setSeconds] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setSeconds((s) => s + 1);
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running]);

  const mm = Math.floor(seconds / 60).toString().padStart(2, '0');
  const ss = (seconds % 60).toString().padStart(2, '0');

  return <Text style={styles.durationText}>{mm}:{ss}</Text>;
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function AudioCallScreen() {
  const {
    callId,
    userId,
    callerName,
    callerPhoto,
    callType,
    isIncoming,
  } = useLocalSearchParams<{
    callId?: string;
    userId?: string;
    callerName?: string;
    callerPhoto?: string;
    callType?: string;
    isIncoming?: string;
  }>();

  const router = useRouter();

  const [callState, setCallState] = useState<CallState>(
    isIncoming === 'true' ? 'ringing' : 'connecting'
  );
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaker, setIsSpeaker] = useState(false);
  const [endedDuration, setEndedDuration] = useState('');

  const durationRef = useRef(0);
  const durationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const name = callerName ?? 'Unknown';
  const incomingCall = isIncoming === 'true';

  // Status text
  const statusText = {
    ringing: incomingCall ? 'Incoming call...' : 'Calling...',
    connecting: 'Connecting...',
    active: 'Connected',
    ended: 'Call Ended',
  }[callState];

  // ── Vibration for ringing ─────────────────────────────────────────────────
  useEffect(() => {
    if (callState === 'ringing' && incomingCall) {
      const pattern = [0, 800, 600, 800, 600];
      Vibration.vibrate(pattern, true);
    } else {
      Vibration.cancel();
    }
    return () => Vibration.cancel();
  }, [callState, incomingCall]);

  // ── Socket events ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!incomingCall && callState === 'connecting') {
      // Outgoing: emit call request
      socketClient.emit('call:initiate', {
        callId,
        receiverId: userId,
        type: 'audio',
      });
    }

    const handleCallAccepted = () => {
      setCallState('active');
      startDurationCounter();
    };

    const handleCallRejected = () => {
      setCallState('ended');
      endCall(false);
    };

    const handleCallEnded = () => {
      endCall(false);
    };

    socketClient.on('call:accepted', handleCallAccepted);
    socketClient.on('call:rejected', handleCallRejected);
    socketClient.on('call:ended', handleCallEnded);

    return () => {
      socketClient.off('call:accepted', handleCallAccepted);
      socketClient.off('call:rejected', handleCallRejected);
      socketClient.off('call:ended', handleCallEnded);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startDurationCounter = useCallback(() => {
    durationRef.current = 0;
    durationIntervalRef.current = setInterval(() => {
      durationRef.current += 1;
    }, 1000);
  }, []);

  const endCall = useCallback(
    async (emitEnd = true) => {
      Vibration.cancel();
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
      const totalSecs = durationRef.current;
      const mm = Math.floor(totalSecs / 60).toString().padStart(2, '0');
      const ss = (totalSecs % 60).toString().padStart(2, '0');
      setEndedDuration(`${mm}:${ss}`);
      setCallState('ended');

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

      setTimeout(() => {
        router.back();
      }, 2000);
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
    setTimeout(() => {
      setCallState('active');
      startDurationCounter();
    }, 800);
  }, [callId, startDurationCounter]);

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

  const handleToggleMute = useCallback(() => {
    setIsMuted((m) => !m);
    // TODO: actual mute via WebRTC/Agora SDK
  }, []);

  const handleToggleSpeaker = useCallback(() => {
    setIsSpeaker((s) => !s);
    // TODO: actual speaker toggle via native audio API
  }, []);

  const isRinging = callState === 'ringing' || callState === 'connecting';

  return (
    <LinearGradient
      colors={['#1A0533', '#0A0A0A']}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 0.3, y: 1 }}
    >
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        {/* Top info */}
        <Animated.View entering={FadeIn.duration(600)} style={styles.topSection}>
          {callState === 'active' && <DurationTimer running />}
          {callState !== 'active' && (
            <Text style={styles.callTypeLabel}>
              {incomingCall ? 'Incoming Audio Call' : 'Audio Call'}
            </Text>
          )}
        </Animated.View>

        {/* Caller info center */}
        <Animated.View entering={FadeIn.duration(700)} style={styles.centerSection}>
          {/* Pulsing rings behind avatar */}
          {isRinging && (
            <View style={styles.ringsWrap}>
              <PulsingRing size={100} delay={0} />
              <PulsingRing size={100} delay={450} />
              <PulsingRing size={100} delay={900} />
            </View>
          )}

          {/* Avatar */}
          <View style={styles.avatarGlowWrap}>
            <View
              style={[
                styles.avatarGlowRing,
                isRinging && styles.avatarGlowRingPulse,
              ]}
            />
            <CallerAvatar name={name} size={100} />
          </View>

          <Text style={styles.callerName}>{name}</Text>
          <Text style={styles.statusText}>{statusText}</Text>

          {callState === 'ended' && endedDuration ? (
            <Text style={styles.endedDuration}>Duration: {endedDuration}</Text>
          ) : null}
        </Animated.View>

        {/* Controls bottom */}
        <Animated.View entering={FadeIn.duration(800).delay(200)} style={styles.controlsSection}>
          {callState === 'active' && (
            <View style={styles.activeControls}>
              <CallBtn
                icon={isMuted ? 'mic-off' : 'mic'}
                label={isMuted ? 'Unmute' : 'Mute'}
                onPress={handleToggleMute}
                active={isMuted}
              />
              <CallBtn
                icon="call"
                label="End Call"
                onPress={() => endCall(true)}
                danger
                size={72}
              />
              <CallBtn
                icon={isSpeaker ? 'volume-high' : 'volume-medium'}
                label={isSpeaker ? 'Speaker On' : 'Speaker'}
                onPress={handleToggleSpeaker}
                active={isSpeaker}
              />
            </View>
          )}

          {callState === 'ringing' && incomingCall && (
            <View style={styles.incomingControls}>
              <CallBtn
                icon="close"
                label="Decline"
                onPress={handleReject}
                danger
                size={72}
              />
              <CallBtn
                icon="call"
                label="Accept"
                onPress={handleAccept}
                size={72}
              />
            </View>
          )}

          {(callState === 'ringing' && !incomingCall) ||
          callState === 'connecting' ? (
            <View style={styles.cancelControl}>
              <CallBtn
                icon="close"
                label="Cancel"
                onPress={() => endCall(true)}
                danger
                size={72}
              />
            </View>
          ) : null}

          {callState === 'ended' && (
            <View style={styles.cancelControl}>
              <Text style={styles.endingText}>Closing...</Text>
            </View>
          )}
        </Animated.View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 24,
  },

  // Sections
  topSection: {
    alignItems: 'center',
    paddingTop: 16,
  },
  centerSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlsSection: {
    paddingBottom: 24,
  },

  // Top
  callTypeLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.subtext,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  durationText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.accent,
    letterSpacing: 2,
  },

  // Rings
  ringsWrap: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Avatar
  avatarGlowWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
  },
  avatarGlowRing: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    borderColor: 'rgba(124,58,237,0.4)',
  },
  avatarGlowRingPulse: {
    borderColor: colors.primary,
    shadowColor: colors.primary,
    shadowOpacity: 0.6,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
  callerAvatar: {
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOpacity: 0.5,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  callerInitials: {
    color: colors.text,
    fontWeight: '800',
  },
  callerName: {
    fontSize: 30,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  statusText: {
    fontSize: 15,
    color: colors.subtext,
    marginTop: 8,
    textAlign: 'center',
  },
  endedDuration: {
    fontSize: 14,
    color: colors.accent,
    marginTop: 8,
  },

  // Controls
  activeControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    paddingHorizontal: 16,
  },
  incomingControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    paddingHorizontal: 40,
  },
  cancelControl: {
    alignItems: 'center',
  },
  callBtnWrap: {
    alignItems: 'center',
    gap: 8,
  },
  callBtnCircle: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  callBtnDangerShadow: {
    shadowColor: colors.danger,
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 6,
  },
  callBtnLabel: {
    fontSize: 11,
    color: colors.subtext,
    fontWeight: '600',
    textAlign: 'center',
  },
  endingText: {
    color: colors.subtext,
    fontSize: 15,
    fontStyle: 'italic',
  },
});
