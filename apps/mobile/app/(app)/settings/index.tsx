import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, StatusBar, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';

// ─── Color tokens ─────────────────────────────────────────────────────────────
const ink    = '#1A1A2E';
const inkSec = '#6B7280';
const white  = '#FFFFFF';
const brand  = '#7C3AED';
const bgSec  = '#F9FAFB';
const border = '#F3F4F6';
const gold   = '#C9A84C';
const goldL  = '#F5E3A0';
const danger = '#EF4444';

// ─── Section data ─────────────────────────────────────────────────────────────
const SECTIONS = [
  {
    icon: 'lock-closed-outline' as const,
    title: 'Privacy',
    rows: [
      { label: 'Privacy', route: '/(app)/settings/privacy' },
      { label: 'Profile Visibility', route: '/(app)/settings/privacy' },
      { label: 'Data Settings', route: '/(app)/settings/privacy' },
    ],
  },
  {
    icon: 'star-outline' as const,
    title: 'Subscription (Vybeon Gold)',
    rows: [
      { label: 'Plan Details', route: '/(app)/premium' },
      { label: 'Payment Methods', route: '/(app)/premium' },
    ],
  },
  {
    icon: 'notifications-outline' as const,
    title: 'Notifications',
    rows: [
      { label: 'Push Notifications', route: null },
      { label: 'Email Alerts', route: null },
    ],
  },
  {
    icon: 'help-circle-outline' as const,
    title: 'Support',
    rows: [
      { label: 'Help Center', route: '/(app)/help' },
      { label: 'Contact Us', route: null },
    ],
  },
];

// ─── Row component ────────────────────────────────────────────────────────────
function SettingsRow({
  label, onPress, isDanger,
}: { label: string; onPress?: () => void; isDanger?: boolean }) {
  return (
    <TouchableOpacity
      style={styles.row}
      onPress={onPress ?? (() => {})}
      activeOpacity={onPress ? 0.75 : 1}
    >
      <Text style={[styles.rowLabel, isDanger && { color: danger }]}>{label}</Text>
      <Ionicons name="chevron-forward" size={16} color="#D1D5DB" />
    </TouchableOpacity>
  );
}

// ─── Section component ────────────────────────────────────────────────────────
function Section({
  icon, title, rows, delay, onRowPress,
}: {
  icon: typeof SECTIONS[0]['icon'];
  title: string;
  rows: typeof SECTIONS[0]['rows'];
  delay: number;
  onRowPress: (route: string | null, label: string) => void;
}) {
  return (
    <Animated.View entering={FadeInDown.delay(delay).duration(380)} style={styles.section}>
      <View style={styles.sectionHeader}>
        <Ionicons name={icon} size={16} color={inkSec} />
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      <View style={styles.sectionBody}>
        {rows.map((row, i) => (
          <React.Fragment key={row.label}>
            <SettingsRow
              label={row.label}
              onPress={() => onRowPress(row.route, row.label)}
            />
            {i < rows.length - 1 && <View style={styles.rowDivider} />}
          </React.Fragment>
        ))}
      </View>
    </Animated.View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function AccountSettingsScreen() {
  const insets  = useSafeAreaInsets();
  const router  = useRouter();
  const logout  = useAuthStore((s) => s.logout);
  const user    = useAuthStore((s) => s.user);
  const isPremium = user?.isPremium ?? false;

  function handleRowPress(route: string | null, label: string) {
    if (route) {
      router.push(route as any);
    } else {
      Alert.alert(label, 'Coming soon!');
    }
  }

  function handleLogout() {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => logout() },
    ]);
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor={white} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}>

        {/* ── Title ───────────────────────────────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(0).duration(350)} style={styles.titleRow}>
          <Text style={styles.title}>Account Settings</Text>
        </Animated.View>

        {/* ── Gold membership card ─────────────────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(60).duration(380)} style={styles.cardWrap}>
          <LinearGradient
            colors={['#C9A84C', '#F5E3A0', '#C9A84C']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={styles.goldCard}
          >
            <View style={styles.goldCardTop}>
              <Ionicons name="star" size={18} color="#7A5B10" />
              <Text style={styles.goldCardTitle}>Vybeon Gold Member</Text>
            </View>
            <Text style={styles.goldCardSub}>
              Active until Dec 31. Unlocks exclusive features and connections.
            </Text>
            <TouchableOpacity
              style={styles.manageBtn}
              onPress={() => router.push('/(app)/premium' as any)}
              activeOpacity={0.85}
            >
              <Text style={styles.manageBtnText}>Manage Subscription</Text>
            </TouchableOpacity>
          </LinearGradient>
        </Animated.View>

        {/* ── Settings sections ────────────────────────────────────────── */}
        {SECTIONS.map((sec, i) => (
          <Section
            key={sec.title}
            icon={sec.icon}
            title={sec.title}
            rows={sec.rows}
            delay={120 + i * 60}
            onRowPress={handleRowPress}
          />
        ))}

        {/* ── Sign out ─────────────────────────────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(380).duration(380)} style={styles.section}>
          <View style={styles.sectionBody}>
            <SettingsRow label="Sign Out" onPress={handleLogout} isDanger />
          </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: white },

  titleRow: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  title: { fontSize: 28, fontWeight: '800', color: ink },

  // ── Gold card ──────────────────────────────────────────────────────────────
  cardWrap: { paddingHorizontal: 20, marginBottom: 20 },
  goldCard: {
    borderRadius: 20,
    padding: 20,
  },
  goldCardTop: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  goldCardTitle: { fontSize: 16, fontWeight: '700', color: '#7A5B10' },
  goldCardSub: { fontSize: 13, color: '#8A6820', lineHeight: 18, marginBottom: 14 },
  manageBtn: {
    backgroundColor: 'rgba(255,255,255,0.55)',
    borderRadius: 9999,
    paddingVertical: 10,
    alignItems: 'center',
  },
  manageBtnText: { fontSize: 14, fontWeight: '700', color: '#7A5B10' },

  // ── Sections ──────────────────────────────────────────────────────────────
  section: { marginHorizontal: 20, marginBottom: 16 },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginBottom: 8,
  },
  sectionTitle: { fontSize: 12, fontWeight: '600', color: inkSec, textTransform: 'uppercase', letterSpacing: 0.6 },
  sectionBody: {
    backgroundColor: bgSec,
    borderRadius: 16,
    overflow: 'hidden',
  },

  row: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
  },
  rowLabel: { fontSize: 15, color: ink },
  rowDivider: { height: 1, backgroundColor: border, marginLeft: 16 },
});
