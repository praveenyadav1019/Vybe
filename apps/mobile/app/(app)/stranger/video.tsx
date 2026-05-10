import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  StatusBar, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { useStrangerStore } from '../../../src/stores/strangerStore';

// ─── Color tokens ─────────────────────────────────────────────────────────────
const white  = '#FFFFFF';
const brand  = '#7C3AED';
const accent = '#00C2CB';
const muted  = '#6B7280';
const ink    = '#1A1A2E';

// ─── Control button ───────────────────────────────────────────────────────────
function ControlBtn({
  icon, label, onPress, active = true, danger = false, small = false,
}: {
  icon: string; label?: string;
  onPress: () => void;
  active?: boolean; danger?: boolean; small?: boolean;
}) {
  return (
    <TouchableOpacity style={[ctrl.wrap, small && ctrl.wrapSmall]} onPress={onPress} activeOpacity={0.8}>
      <View style={[
        ctrl.circle,
        small && ctrl.circleSmall,
        danger && ctrl.circleDanger,
        !active && ctrl.circleInactive,
      ]}>
        <Ionicons name={icon as any} size={small ? 18 : 22} color={white} />
      </View>
      {label && <Text style={ctrl.label}>{label}</Text>}
    </TouchableOpacity>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function StrangerVideoScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const {
    session, status, partnerTyping,
    friendRequestSent, friendRequestReceived,
    nextStranger, endSession, sendFriendRequest,
  } = useStrangerStore();

  const [micMuted, setMicMuted] = useState(false);
  const [camOff, setCamOff] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [showChat, setShowChat] = useState(false);

  // Session timer
  useEffect(() => {
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, []);

  // Handle session ended
  useEffect(() => {
    if (status === 'ended') {
      Alert.alert('Call Ended', 'The stranger has disconnected.', [
        { text: 'Next Stranger', onPress: () => { nextStranger(); router.replace('/(app)/stranger/queue' as any); }},
        { text: 'Go Home', style: 'cancel', onPress: () => router.replace('/(tabs)/meet' as any) },
      ]);
    }
  }, [status]);

  const mm = String(Math.floor(elapsed / 60)).padStart(2, '0');
  const ss = String(elapsed % 60).padStart(2, '0');

  const handleEnd = () => {
    Alert.alert('End Call?', '', [
      { text: 'End', style: 'destructive', onPress: () => { endSession(); router.replace('/(tabs)/meet' as any); }},
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleNext = () => {
    Alert.alert('Skip?', 'Move on to a new stranger?', [
      { text: 'Skip', style: 'destructive', onPress: () => { nextStranger(); router.replace('/(app)/stranger/queue' as any); }},
      { text: 'Stay', style: 'cancel' },
    ]);
  };

  const handleReport = () => {
    router.push({ pathname: '/(app)/stranger/report' as any, params: { sessionId: session?.sessionId } });
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      {/* ── Remote video area (placeholder gradient) ──────────────────────── */}
      <View style={styles.remoteVideo}>
        <LinearGradient
          colors={['#1A1A2E', '#312E81']}
          style={StyleSheet.absoluteFillObject}
        />
        {/* In production: replace with Agora RtcRemoteView or WebRTC RTCView */}
        <View style={styles.remoteCenter}>
          <LinearGradient colors={['#9333EA', accent]} style={styles.remoteAvatar}>
            <Ionicons name="person" size={36} color={white} />
          </LinearGradient>
          {camOff && <Text style={styles.remoteOffText}>Stranger's camera is off</Text>}
        </View>

        {/* Timer overlay */}
        <Animated.View entering={FadeIn.duration(500)} style={[styles.timerBadge, { top: insets.top + 16 }]}>
          <View style={styles.recDot} />
          <Text style={styles.timerText}>{mm}:{ss}</Text>
        </Animated.View>

        {/* Report button */}
        <TouchableOpacity
          style={[styles.reportBtn, { top: insets.top + 16 }]}
          onPress={handleReport}
          activeOpacity={0.75}
        >
          <Ionicons name="flag-outline" size={18} color={white} />
        </TouchableOpacity>

        {/* Shared interests */}
        {session?.partner.sharedInterests?.length ? (
          <Animated.View entering={FadeInDown.delay(500).duration(400)} style={styles.interestsBadge}>
            <Text style={styles.interestsText}>
              You both like: {session.partner.sharedInterests.slice(0, 3).join(', ')}
            </Text>
          </Animated.View>
        ) : null}
      </View>

      {/* ── Local video PiP ───────────────────────────────────────────────── */}
      <Animated.View
        entering={FadeIn.delay(300).duration(400)}
        style={[styles.localVideo, { top: insets.top + 70 }]}
      >
        <LinearGradient colors={['#374151', '#1F2937']} style={StyleSheet.absoluteFillObject} />
        {camOff ? (
          <View style={styles.localOff}>
            <Ionicons name="videocam-off-outline" size={20} color={white} />
          </View>
        ) : (
          /* In production: replace with Agora RtcLocalView or WebRTC RTCView */
          <View style={styles.localOff}>
            <Ionicons name="person-outline" size={20} color={white} />
          </View>
        )}
      </Animated.View>

      {/* ── Friend request banner ─────────────────────────────────────────── */}
      {friendRequestReceived && !friendRequestSent && (
        <Animated.View entering={FadeInDown.duration(300)} style={styles.frBanner}>
          <Text style={styles.frText}>Stranger wants to connect!</Text>
          <TouchableOpacity onPress={() => sendFriendRequest()} style={styles.frBtn}>
            <Text style={styles.frBtnText}>Connect</Text>
          </TouchableOpacity>
        </Animated.View>
      )}
      {friendRequestSent && (
        <Animated.View entering={FadeInDown.duration(300)} style={[styles.frBanner, styles.frBannerSent]}>
          <Ionicons name="checkmark-circle" size={14} color={brand} />
          <Text style={styles.frText}>Request sent!</Text>
        </Animated.View>
      )}

      {/* ── Controls ─────────────────────────────────────────────────────── */}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.85)']}
        style={[styles.controls, { paddingBottom: insets.bottom + 20 }]}
      >
        <View style={styles.ctrlRow}>
          <ControlBtn
            icon={micMuted ? 'mic-off' : 'mic-outline'}
            label={micMuted ? 'Unmute' : 'Mute'}
            active={!micMuted}
            onPress={() => setMicMuted((v) => !v)}
          />
          <ControlBtn
            icon={camOff ? 'videocam-off' : 'videocam-outline'}
            label={camOff ? 'Camera On' : 'Camera Off'}
            active={!camOff}
            onPress={() => setCamOff((v) => !v)}
          />
          <ControlBtn
            icon="person-add-outline"
            label={friendRequestSent ? 'Requested' : 'Connect'}
            active={!friendRequestSent}
            onPress={() => !friendRequestSent && sendFriendRequest()}
          />
        </View>

        <View style={styles.ctrlRowSmall}>
          <ControlBtn icon="play-skip-forward-outline" label="Next" onPress={handleNext} small />
          {/* End call - prominent red */}
          <TouchableOpacity style={styles.endCallBtn} onPress={handleEnd} activeOpacity={0.85}>
            <LinearGradient
              colors={['#EF4444', '#DC2626']}
              style={styles.endCallGradient}
            >
              <Ionicons name="call" size={28} color={white} style={{ transform: [{ rotate: '135deg' }] }} />
            </LinearGradient>
          </TouchableOpacity>
          <ControlBtn icon="flag-outline" label="Report" onPress={handleReport} small />
        </View>
      </LinearGradient>
    </View>
  );
}

// ─── Control button styles ─────────────────────────────────────────────────────
const ctrl = StyleSheet.create({
  wrap: { alignItems: 'center', gap: 6, minWidth: 60 },
  wrapSmall: { minWidth: 48 },
  circle: {
    width: 54, height: 54, borderRadius: 27,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center', justifyContent: 'center',
  },
  circleSmall: { width: 42, height: 42, borderRadius: 21 },
  circleDanger: { backgroundColor: 'rgba(239,68,68,0.25)' },
  circleInactive: { backgroundColor: 'rgba(255,255,255,0.08)' },
  label: { fontSize: 11, color: 'rgba(255,255,255,0.75)', textAlign: 'center' },
});

// ─── Screen styles ────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },

  // Remote video
  remoteVideo: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  remoteCenter: { alignItems: 'center', gap: 12 },
  remoteAvatar: {
    width: 80, height: 80, borderRadius: 40,
    alignItems: 'center', justifyContent: 'center',
  },
  remoteOffText: { color: 'rgba(255,255,255,0.6)', fontSize: 13 },

  // Timer
  timerBadge: {
    position: 'absolute', left: 16,
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 20,
  },
  recDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#EF4444' },
  timerText: { color: white, fontSize: 13, fontWeight: '600' },

  // Report
  reportBtn: {
    position: 'absolute', right: 16,
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center', justifyContent: 'center',
  },

  // Interests badge
  interestsBadge: {
    position: 'absolute', bottom: 120,
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 20,
  },
  interestsText: { color: white, fontSize: 12 },

  // Local video PiP
  localVideo: {
    position: 'absolute', right: 16,
    width: 90, height: 130,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.2)',
  },
  localOff: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
  },

  // Friend request banner
  frBanner: {
    position: 'absolute', bottom: 170, left: 20, right: 20,
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: 'rgba(124,58,237,0.9)',
    paddingHorizontal: 16, paddingVertical: 12,
    borderRadius: 14,
  },
  frBannerSent: { backgroundColor: 'rgba(16,185,129,0.85)' },
  frText: { flex: 1, fontSize: 13, color: white, fontWeight: '500' },
  frBtn: {
    backgroundColor: white, borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  frBtnText: { fontSize: 12, fontWeight: '700', color: brand },

  // Controls
  controls: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingTop: 60, paddingHorizontal: 24,
    gap: 16,
  },
  ctrlRow: {
    flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center',
  },
  ctrlRowSmall: {
    flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center',
  },
  endCallBtn: {
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5, shadowRadius: 12, elevation: 8,
  },
  endCallGradient: {
    width: 66, height: 66, borderRadius: 33,
    alignItems: 'center', justifyContent: 'center',
  },
});
