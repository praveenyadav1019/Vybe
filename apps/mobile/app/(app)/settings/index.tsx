import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  StyleSheet,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { colors } from '@/theme/colors';
import { GlassCard } from '@/components/ui/GlassCard';

interface SettingsRowProps {
  icon: string;
  label: string;
  onPress?: () => void;
  value?: boolean;
  isSwitch?: boolean;
  onToggle?: (val: boolean) => void;
  isDanger?: boolean;
  subtitle?: string;
  rightLabel?: string;
}

function SettingsRow({ icon, label, subtitle, onPress, value, isSwitch, onToggle, isDanger, rightLabel }: SettingsRowProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isSwitch}
      activeOpacity={0.7}
      style={styles.row}
    >
      <View style={[styles.rowIcon, { backgroundColor: isDanger ? `${colors.danger}22` : colors.surface }]}>
        <Ionicons name={icon as any} size={18} color={isDanger ? colors.danger : colors.text} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.rowLabel, isDanger && { color: colors.danger }]}>{label}</Text>
        {subtitle && <Text style={styles.rowSubtitle}>{subtitle}</Text>}
      </View>
      {isSwitch && onToggle ? (
        <Switch value={value} onValueChange={onToggle} trackColor={{ false: colors.border, true: colors.primary }} thumbColor="#FFF" />
      ) : rightLabel ? (
        <Text style={styles.rightLabel}>{rightLabel}</Text>
      ) : (
        <Ionicons name="chevron-forward" size={16} color={colors.subtext} />
      )}
    </TouchableOpacity>
  );
}

export default function SettingsScreen() {
  const router = useRouter();
  const { user, logout, updateUser } = useAuthStore();
  const [notifications, setNotifications] = useState({
    matches: true,
    messages: true,
    nearby: false,
    email: false,
  });

  const notifMutation = useMutation({
    mutationFn: (prefs: typeof notifications) => api.patch('/me', { notificationPrefs: prefs }),
  });

  const handleNotifToggle = (key: keyof typeof notifications, val: boolean) => {
    const updated = { ...notifications, [key]: val };
    setNotifications(updated);
    notifMutation.mutate(updated);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account and all data. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => Alert.alert('Contact Support', 'Please email support@vybeon.com to delete your account.'),
        },
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: async () => { await logout(); router.replace('/(auth)/login'); } },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <Animated.View entering={FadeInDown.delay(50)} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 40 }} />
      </Animated.View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 80 }}>
        {/* Account */}
        <Animated.View entering={FadeInDown.delay(100)}>
          <Text style={styles.groupLabel}>Account</Text>
          <GlassCard style={styles.group}>
            <SettingsRow icon="person-outline" label="Edit Profile" onPress={() => router.push('/(auth)/profile-setup')} />
            <SettingsRow icon="shield-checkmark-outline" label="Verification" rightLabel={user?.isVerified ? '✓ Verified' : 'Not verified'} onPress={() => !user?.isVerified && router.push('/(auth)/face-verify')} />
            <SettingsRow icon="star-outline" label="Subscription" rightLabel={user?.isPremium ? 'VYBEON+' : 'Free'} onPress={() => router.push('/(app)/premium')} />
          </GlassCard>
        </Animated.View>

        {/* Discovery */}
        <Animated.View entering={FadeInDown.delay(150)}>
          <Text style={styles.groupLabel}>Discovery</Text>
          <GlassCard style={styles.group}>
            <SettingsRow icon="radio-outline" label="Discovery Radius" rightLabel="500m" onPress={() => Alert.alert('Radius', 'Adjust in Privacy Settings')} />
            <SettingsRow icon="eye-outline" label="Show Me To" rightLabel="Everyone" onPress={() => router.push('/(app)/settings/privacy')} />
            <SettingsRow icon="people-outline" label="Age Range" rightLabel="18 - 35" onPress={() => Alert.alert('Age Filter', 'Coming soon in next update')} />
          </GlassCard>
        </Animated.View>

        {/* Privacy */}
        <Animated.View entering={FadeInDown.delay(200)}>
          <Text style={styles.groupLabel}>Privacy</Text>
          <GlassCard style={styles.group}>
            <SettingsRow icon="lock-closed-outline" label="Privacy Settings" onPress={() => router.push('/(app)/settings/privacy')} />
            <SettingsRow icon="ban-outline" label="Blocked Users" onPress={() => router.push('/(app)/safety')} />
            <SettingsRow icon="document-text-outline" label="Data & Privacy" onPress={() => Alert.alert('Data', 'Your data is stored securely. Email privacy@vybeon.com for requests.')} />
          </GlassCard>
        </Animated.View>

        {/* Notifications */}
        <Animated.View entering={FadeInDown.delay(250)}>
          <Text style={styles.groupLabel}>Notifications</Text>
          <GlassCard style={styles.group}>
            <SettingsRow icon="heart-outline" label="New Matches" isSwitch value={notifications.matches} onToggle={(v) => handleNotifToggle('matches', v)} />
            <SettingsRow icon="chatbubble-outline" label="Messages" isSwitch value={notifications.messages} onToggle={(v) => handleNotifToggle('messages', v)} />
            <SettingsRow icon="location-outline" label="Nearby Alerts" isSwitch value={notifications.nearby} onToggle={(v) => handleNotifToggle('nearby', v)} />
            <SettingsRow icon="mail-outline" label="Email Notifications" isSwitch value={notifications.email} onToggle={(v) => handleNotifToggle('email', v)} />
          </GlassCard>
        </Animated.View>

        {/* Support */}
        <Animated.View entering={FadeInDown.delay(300)}>
          <Text style={styles.groupLabel}>Support</Text>
          <GlassCard style={styles.group}>
            <SettingsRow icon="help-circle-outline" label="Help Center" onPress={() => Alert.alert('Help', 'Email support@vybeon.com for help')} />
            <SettingsRow icon="flag-outline" label="Report a Problem" onPress={() => router.push('/(app)/safety')} />
            <SettingsRow icon="star-outline" label="Rate the App" onPress={() => Alert.alert('Rate', 'Thank you! Rating coming soon')} />
          </GlassCard>
        </Animated.View>

        {/* About */}
        <Animated.View entering={FadeInDown.delay(350)}>
          <Text style={styles.groupLabel}>About</Text>
          <GlassCard style={styles.group}>
            <SettingsRow icon="document-outline" label="Terms of Service" onPress={() => Alert.alert('Terms', 'Visit vybeon.com/terms')} />
            <SettingsRow icon="shield-outline" label="Privacy Policy" onPress={() => Alert.alert('Privacy', 'Visit vybeon.com/privacy')} />
            <SettingsRow icon="information-circle-outline" label="Version" rightLabel="1.0.0" />
          </GlassCard>
        </Animated.View>

        {/* Danger Zone */}
        <Animated.View entering={FadeInDown.delay(400)}>
          <Text style={styles.groupLabel}>Account Actions</Text>
          <GlassCard style={styles.group}>
            <SettingsRow icon="log-out-outline" label="Logout" onPress={handleLogout} isDanger />
            <SettingsRow icon="trash-outline" label="Delete Account" onPress={handleDeleteAccount} isDanger />
          </GlassCard>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: colors.text, fontSize: 18, fontWeight: '700' },
  groupLabel: { color: colors.subtext, fontSize: 12, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase', paddingHorizontal: 16, marginTop: 16, marginBottom: 6 },
  group: { marginHorizontal: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: colors.border },
  rowIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  rowLabel: { color: colors.text, fontSize: 15 },
  rowSubtitle: { color: colors.subtext, fontSize: 12, marginTop: 1 },
  rightLabel: { color: colors.subtext, fontSize: 13 },
});
