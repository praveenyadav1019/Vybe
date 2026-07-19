import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, StatusBar,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../src/stores/authStore';
import { api } from '../../src/lib/api';
import { ScreenGradient } from '../../src/components/ui/ScreenGradient';

// ─── Color tokens ─────────────────────────────────────────────────────────────
const ink      = '#1A1A2E';
const inkSec   = '#6B7280';
const white    = '#FFFFFF';
const brand    = '#7C3AED';
const brandSoft = '#EDE9FE';
const bgSec    = '#F9FAFB';
const border   = '#F3F4F6';
const success  = '#10B981';

// ─── Quick action row ─────────────────────────────────────────────────────────
const ACTIONS = [
  { icon: 'settings-outline' as const,   label: 'Settings',    route: '/(app)/settings/index' },
  { icon: 'people-outline' as const,     label: 'Connections', route: '/(app)/connections'    },
  { icon: 'qr-code-outline' as const,    label: 'QR Code',     route: '/(app)/qr'             },
] as const;

// ─── Menu items ───────────────────────────────────────────────────────────────
const MENU_ITEMS = [
  { icon: 'shield-outline' as const,       label: 'Safety Center',  route: '/(app)/safety'   },
  { icon: 'star-outline' as const,         label: 'Premium',        route: '/(app)/premium'  },
  { icon: 'help-circle-outline' as const,  label: 'Help & Support', route: '/(app)/help'     },
] as const;

// ─── Stat tile ────────────────────────────────────────────────────────────────
function StatTile({ icon, value, label, color = brand }: { icon: string; value: string | number; label: string; color?: string }) {
  return (
    <View style={stat.tile}>
      <View style={[stat.iconWrap, { backgroundColor: `${color}18` }]}>
        <Ionicons name={icon as any} size={18} color={color} />
      </View>
      <Text style={stat.value}>{value}</Text>
      <Text style={stat.label}>{label}</Text>
    </View>
  );
}

export default function ProfileTabScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const user   = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const [connectionCount, setConnectionCount] = useState<number | null>(null);

  useEffect(() => {
    api.get<{ connections: unknown[] }>('/connections').then((r) => {
      setConnectionCount(r.data.connections.length);
    }).catch(() => {});
  }, []);

  const name      = user?.name ?? 'You';
  const age       = user?.age ?? '';
  const photo     = user?.photos?.[0];
  const isPremium = user?.isPremium ?? false;
  const isOnline  = user?.isOnline ?? true;

  const handleLogout = () => {
    logout();
    router.replace('/(auth)/login');
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <ScreenGradient />
      <StatusBar barStyle="dark-content" backgroundColor="#ECE4FF" />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}>

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(0).duration(350)} style={styles.header}>
          <Text style={styles.headerTitle}>Profile</Text>
          <TouchableOpacity
            onPress={() => router.push('/(app)/settings/index' as any)}
            style={styles.settingsBtn}
            activeOpacity={0.8}
          >
            <Ionicons name="settings-outline" size={22} color={ink} />
          </TouchableOpacity>
        </Animated.View>

        {/* ── Avatar + info ────────────────────────────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(60).duration(380)} style={styles.profileBlock}>
          <View style={styles.avatarWrap}>
            {photo ? (
              <Image source={{ uri: photo }} style={styles.avatar} contentFit="cover" />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback]}>
                <Ionicons name="person" size={48} color={brand} />
              </View>
            )}
            <TouchableOpacity style={styles.editAvatarBtn} activeOpacity={0.8}>
              <Ionicons name="camera" size={14} color={white} />
            </TouchableOpacity>
            <View style={[styles.onlineDot, { backgroundColor: isOnline ? success : '#9CA3AF' }]} />
          </View>

          <Text style={styles.nameText}>{name}{age ? `, ${age}` : ''}</Text>

          {/* Verified + premium badges */}
          <View style={styles.badgeRow}>
            {user?.isVerified && (
              <View style={styles.verifiedBadge}>
                <Ionicons name="checkmark-circle" size={13} color={brand} />
                <Text style={styles.verifiedText}>Verified</Text>
              </View>
            )}
            {isPremium && (
              <LinearGradient colors={['#C9A84C', '#F5E3A0']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.premiumBadge}>
                <Ionicons name="star" size={11} color="#7A5B10" />
                <Text style={styles.premiumText}>Vybeon Gold</Text>
              </LinearGradient>
            )}
          </View>

          {/* Edit Profile */}
          <TouchableOpacity
            style={styles.editProfileBtn}
            onPress={() => router.push('/(app)/profile' as any)}
            activeOpacity={0.85}
          >
            <Ionicons name="pencil-outline" size={14} color={inkSec} />
            <Text style={styles.editProfileText}>Edit Profile</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* ── Activity stats ──────────────────────────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(110).duration(380)} style={styles.statsGrid}>
          <StatTile
            icon="people-outline"
            value={connectionCount ?? '—'}
            label="Connections"
            color="#7C3AED"
          />
          <StatTile
            icon="shield-checkmark-outline"
            value={user?.isVerified ? 'Yes' : 'No'}
            label="Verified"
            color="#059669"
          />
        </Animated.View>

        {/* ── Quick actions ────────────────────────────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(150).duration(380)} style={styles.actionsRow}>
          {ACTIONS.map((action) => (
            <TouchableOpacity
              key={action.label}
              style={styles.actionItem}
              onPress={() => router.push(action.route as any)}
              activeOpacity={0.8}
            >
              <View style={styles.actionIcon}>
                <Ionicons name={action.icon} size={22} color={brand} />
              </View>
              <Text style={styles.actionLabel}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </Animated.View>

        {/* ── Menu list ────────────────────────────────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(190).duration(380)} style={styles.menuCard}>
          {MENU_ITEMS.map((item, i) => (
            <React.Fragment key={item.label}>
              <TouchableOpacity
                style={styles.menuRow}
                onPress={() => router.push(item.route as any)}
                activeOpacity={0.8}
              >
                <View style={styles.menuIcon}>
                  <Ionicons name={item.icon} size={20} color={inkSec} />
                </View>
                <Text style={styles.menuLabel}>{item.label}</Text>
                <Ionicons name="chevron-forward" size={16} color="#D1D5DB" />
              </TouchableOpacity>
              {i < MENU_ITEMS.length - 1 && <View style={styles.menuDivider} />}
            </React.Fragment>
          ))}
        </Animated.View>

        {/* ── Logout ───────────────────────────────────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(220).duration(380)} style={{ marginHorizontal: 20, marginTop: 12 }}>
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
            <Ionicons name="log-out-outline" size={18} color="#EF4444" />
            <Text style={styles.logoutText}>Log Out</Text>
          </TouchableOpacity>
        </Animated.View>

      </ScrollView>
    </View>
  );
}

// ─── Stat tile styles ─────────────────────────────────────────────────────────
const stat = StyleSheet.create({
  tile: {
    flex: 1, alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(255,255,255,0.55)',
    borderRadius: 16, padding: 14,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.8)',
    shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08, shadowRadius: 10, elevation: 2,
  },
  iconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  value: { fontSize: 20, fontWeight: '800', color: ink },
  label: { fontSize: 10, color: inkSec, textAlign: 'center' },
});

// ─── Screen styles ────────────────────────────────────────────────────────────
const AVATAR_SIZE = 100;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F7F2FF' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 4,
  },
  headerTitle: { fontSize: 22, fontWeight: '800', color: ink },
  settingsBtn: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },

  profileBlock: { alignItems: 'center', paddingTop: 16, paddingBottom: 20, gap: 8 },
  avatarWrap: { position: 'relative', marginBottom: 6 },
  avatar: { width: AVATAR_SIZE, height: AVATAR_SIZE, borderRadius: AVATAR_SIZE / 2, backgroundColor: '#EDE9FE' },
  avatarFallback: { alignItems: 'center', justifyContent: 'center' },
  editAvatarBtn: {
    position: 'absolute', bottom: 2, right: 2,
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: brand, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: white,
  },
  onlineDot: {
    position: 'absolute', top: 4, right: 2,
    width: 14, height: 14, borderRadius: 7,
    borderWidth: 2.5, borderColor: white,
  },
  nameText: { fontSize: 22, fontWeight: '800', color: ink },
  modeBadge: {
    paddingHorizontal: 14, paddingVertical: 6,
    backgroundColor: brandSoft, borderRadius: 9999,
  },
  modeBadgeText: { fontSize: 13, fontWeight: '600', color: brand },

  badgeRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  verifiedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: brandSoft, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 9999,
  },
  verifiedText: { fontSize: 11, fontWeight: '600', color: brand },
  premiumBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 9999,
  },
  premiumText: { fontSize: 11, fontWeight: '700', color: '#7A5B10' },

  editProfileBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 20, paddingVertical: 9,
    borderRadius: 9999, borderWidth: 1.5, borderColor: border,
  },
  editProfileText: { fontSize: 14, fontWeight: '600', color: inkSec },

  statsGrid: {
    flexDirection: 'row', gap: 10,
    marginHorizontal: 20, marginBottom: 20,
  },

  actionsRow: { flexDirection: 'row', marginHorizontal: 20, marginBottom: 20, gap: 12 },
  actionItem: { flex: 1, alignItems: 'center', gap: 6 },
  actionIcon: { width: 54, height: 54, borderRadius: 18, backgroundColor: brandSoft, alignItems: 'center', justifyContent: 'center' },
  actionLabel: { fontSize: 11, fontWeight: '500', color: inkSec },

  menuCard: {
    marginHorizontal: 20, backgroundColor: 'rgba(255,255,255,0.55)',
    borderRadius: 20, overflow: 'hidden',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.8)',
  },
  menuRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  menuIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.7)', alignItems: 'center', justifyContent: 'center' },
  menuLabel: { flex: 1, fontSize: 15, color: ink },
  menuDivider: { height: 1, backgroundColor: border, marginLeft: 64 },

  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 14, borderRadius: 16,
    backgroundColor: '#FFF5F5', borderWidth: 1, borderColor: '#FEE2E2',
  },
  logoutText: { fontSize: 15, fontWeight: '600', color: '#EF4444' },
});
