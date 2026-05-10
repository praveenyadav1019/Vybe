import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  StatusBar, Share, Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Rect, Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';

const { width: W } = Dimensions.get('window');
const QR_SIZE = W - 80;

// ─── Stylized QR placeholder (real QR would use a library) ───────────────────
function QRCodePlaceholder({ size }: { size: number }) {
  const cell = size / 21;
  // Simplified QR pattern - just the corner squares + some cells
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* Background */}
      <Rect x={0} y={0} width={size} height={size} fill="#0D1B3E" rx={12} />

      {/* Top-left finder square */}
      <Rect x={cell} y={cell} width={cell * 7} height={cell * 7} rx={2} fill="#00E5FF" />
      <Rect x={cell * 2} y={cell * 2} width={cell * 5} height={cell * 5} rx={1} fill="#0D1B3E" />
      <Rect x={cell * 3} y={cell * 3} width={cell * 3} height={cell * 3} rx={1} fill="#00E5FF" />

      {/* Top-right finder square */}
      <Rect x={cell * 13} y={cell} width={cell * 7} height={cell * 7} rx={2} fill="#00E5FF" />
      <Rect x={cell * 14} y={cell * 2} width={cell * 5} height={cell * 5} rx={1} fill="#0D1B3E" />
      <Rect x={cell * 15} y={cell * 3} width={cell * 3} height={cell * 3} rx={1} fill="#00E5FF" />

      {/* Bottom-left finder square */}
      <Rect x={cell} y={cell * 13} width={cell * 7} height={cell * 7} rx={2} fill="#00E5FF" />
      <Rect x={cell * 2} y={cell * 14} width={cell * 5} height={cell * 5} rx={1} fill="#0D1B3E" />
      <Rect x={cell * 3} y={cell * 15} width={cell * 3} height={cell * 3} rx={1} fill="#00E5FF" />

      {/* Data cells (randomized pattern) */}
      {[
        [9,1],[10,1],[11,1],[9,2],[11,2],[9,3],[10,3],[11,3],
        [1,9],[2,9],[3,9],[1,10],[3,10],[1,11],[2,11],[3,11],
        [13,9],[14,9],[15,9],[13,10],[15,10],[13,11],[14,11],[15,11],
        [9,9],[11,9],[10,10],[9,11],[11,11],[13,13],[15,13],[14,14],
        [13,15],[14,15],[15,15],[9,13],[10,14],[11,14],[9,15],[11,15],
        [17,9],[18,9],[19,9],[17,11],[17,13],[18,14],[19,13],[19,15],
      ].map(([col, row], i) => (
        <Rect
          key={i}
          x={col * cell} y={row * cell}
          width={cell - 1} height={cell - 1}
          rx={1}
          fill="#00E5FF"
          opacity={0.85}
        />
      ))}

      {/* Center VYBEON "N" mark */}
      <Rect
        x={size / 2 - 18} y={size / 2 - 18}
        width={36} height={36} rx={8}
        fill="#7C3AED"
      />
      <Path
        d={`M ${size/2 - 10} ${size/2 - 10} L ${size/2 - 10} ${size/2 + 10} L ${size/2 + 10} ${size/2 - 10} L ${size/2 + 10} ${size/2 + 10}`}
        stroke="white" strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function NetworkingQRScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const user   = useAuthStore((s) => s.user);
  const name   = user?.name ?? 'Alex Chen';
  const isPremium = user?.isPremium ?? true;

  async function handleShare() {
    await Share.share({
      message: `Connect with me on VYBEON! vybeon://user/${user?.id ?? 'alex'}`,
      title: 'My VYBEON Profile',
    });
  }

  return (
    <LinearGradient
      colors={['#0A0A1A', '#12102A', '#0A0A1A']}
      style={[styles.root, { paddingTop: insets.top }]}
    >
      <StatusBar barStyle="light-content" backgroundColor="#0A0A1A" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn} activeOpacity={0.8}>
          <Text style={styles.closeText}>Close</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Networking QR Code</Text>
        <TouchableOpacity style={styles.closeBtn} activeOpacity={0.8}>
          <Ionicons name="scan-outline" size={20} color="rgba(255,255,255,0.7)" />
        </TouchableOpacity>
      </View>

      <Animated.View entering={FadeInDown.delay(60).duration(400)} style={styles.qrWrap}>
        {/* QR card */}
        <View style={styles.qrCard}>
          {/* Border glow */}
          <LinearGradient
            colors={['#00E5FF44', '#7C3AED44', '#00E5FF44']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFillObject}
          />
          <View style={styles.qrInner}>
            <QRCodePlaceholder size={QR_SIZE - 40} />
          </View>
        </View>

        {/* User info */}
        <View style={styles.userInfo}>
          <View style={styles.userAvatarWrap}>
            <Image
              source={{ uri: user?.photos?.[0] ?? 'https://randomuser.me/api/portraits/men/32.jpg' }}
              style={styles.userAvatar}
              contentFit="cover"
            />
          </View>
          <Text style={styles.userName}>{name}</Text>
          <Text style={styles.userBadge}>
            {isPremium ? 'Premium Member · ' : ''}Nightlife Mode
          </Text>
        </View>
      </Animated.View>

      {/* Share button */}
      <Animated.View entering={FadeInDown.delay(200).duration(400)} style={[styles.shareWrap, { paddingBottom: insets.bottom + 24 }]}>
        <TouchableOpacity style={styles.shareBtn} onPress={handleShare} activeOpacity={0.88}>
          <LinearGradient
            colors={['#9333EA', '#7C3AED']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={styles.shareBtnInner}
          >
            <Ionicons name="share-social-outline" size={18} color="#FFFFFF" />
            <Text style={styles.shareBtnText}>Share Profile</Text>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    </LinearGradient>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1 },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8,
  },
  closeBtn: { paddingHorizontal: 4, paddingVertical: 8 },
  closeText: { fontSize: 15, color: 'rgba(255,255,255,0.7)' },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },

  qrWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },

  qrCard: {
    borderRadius: 24,
    padding: 3,
    overflow: 'hidden',
    backgroundColor: '#1A1633',
  },
  qrInner: {
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: '#0D1B3E',
    padding: 20,
  },

  userInfo: { alignItems: 'center', marginTop: 24 },
  userAvatarWrap: {
    width: 56, height: 56, borderRadius: 28,
    borderWidth: 2.5, borderColor: '#00E5FF',
    overflow: 'hidden', marginBottom: 10,
  },
  userAvatar: { width: 51, height: 51 },
  userName: { fontSize: 18, fontWeight: '700', color: '#FFFFFF', marginBottom: 4 },
  userBadge: { fontSize: 13, color: 'rgba(255,255,255,0.55)' },

  shareWrap: { paddingHorizontal: 40 },
  shareBtn: { borderRadius: 9999, overflow: 'hidden' },
  shareBtnInner: {
    height: 52, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  shareBtnText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
});
