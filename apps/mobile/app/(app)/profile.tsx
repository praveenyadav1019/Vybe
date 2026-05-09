import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Alert,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useAuthStore } from '@/stores/authStore';
import { useDiscoveryStore } from '@/stores/discoveryStore';
import { colors } from '@/theme/colors';
import { ModeChip } from '@/components/user/ModeChip';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import type { Mode } from '@/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const ALL_MODES: { mode: Mode; label: string; emoji: string }[] = [
  { mode: 'dating', label: 'Dating', emoji: '💕' },
  { mode: 'hook', label: 'Hook', emoji: '🔥' },
  { mode: 'co-travel', label: 'Co-Travel', emoji: '✈️' },
  { mode: 'night-out', label: 'Night Out', emoji: '🌙' },
  { mode: 'club-mates', label: 'Club Mates', emoji: '🎵' },
  { mode: 'casual', label: 'Casual', emoji: '👋' },
];

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout, updateUser } = useAuthStore();
  const { activeMode, setActiveMode } = useDiscoveryStore();
  const [showModeSelector, setShowModeSelector] = useState(false);

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: async () => { await logout(); router.replace('/(auth)/login'); } },
    ]);
  };

  const handleModeChange = async (mode: Mode) => {
    setShowModeSelector(false);
    setActiveMode(mode);
    updateUser({ activeMode: mode });
  };

  if (!user) return null;

  const photos = user.photos || [];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Header */}
        <Animated.View entering={FadeInDown.delay(50)} style={styles.header}>
          <Text style={styles.headerTitle}>Profile</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={() => router.push('/(app)/settings/')} style={styles.iconBtn}>
              <Ionicons name="settings-outline" size={22} color={colors.text} />
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Profile Hero */}
        <Animated.View entering={FadeInDown.delay(100)} style={styles.heroSection}>
          <View style={styles.avatarWrapper}>
            <LinearGradient colors={[colors.primary, colors.accent]} style={styles.avatarBorder}>
              {photos[0] ? (
                <Image source={{ uri: photos[0] }} style={styles.avatar} contentFit="cover" />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarInitials}>
                    {user.name?.charAt(0)?.toUpperCase() || '?'}
                  </Text>
                </View>
              )}
            </LinearGradient>
            <TouchableOpacity style={styles.editPhotoBtn} onPress={() => router.push('/(auth)/profile-setup')}>
              <Ionicons name="camera" size={14} color="#FFF" />
            </TouchableOpacity>
          </View>

          <View style={styles.nameRow}>
            <Text style={styles.name}>{user.name}, {user.age}</Text>
            {user.isVerified && <Ionicons name="checkmark-circle" size={22} color={colors.accent} />}
            {user.isPremium && <Ionicons name="star" size={20} color="#FFD700" />}
          </View>

          <View style={styles.onlineRow}>
            <View style={[styles.onlineDot, { backgroundColor: user.isOnline ? colors.success : colors.subtext }]} />
            <Text style={styles.onlineText}>{user.isOnline ? 'Online' : 'Offline'}</Text>
          </View>

          <ModeChip mode={user.activeMode || 'casual'} size="md" />

          <TouchableOpacity
            onPress={() => router.push('/(auth)/profile-setup')}
            style={styles.editProfileBtn}
          >
            <Ionicons name="pencil-outline" size={16} color={colors.primary} />
            <Text style={styles.editProfileText}>Edit Profile</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Stats */}
        <Animated.View entering={FadeInDown.delay(150)}>
          <GlassCard style={styles.statsCard}>
            <View style={styles.statsRow}>
              {[
                { label: 'Pings Sent', value: '24', icon: '📤' },
                { label: 'Matches', value: '8', icon: '💕' },
                { label: 'Profile Views', value: user.isPremium ? '142' : '—', icon: '👁️' },
              ].map(({ label, value, icon }) => (
                <View key={label} style={styles.statItem}>
                  <Text style={styles.statEmoji}>{icon}</Text>
                  <Text style={styles.statValue}>{value}</Text>
                  <Text style={styles.statLabel}>{label}</Text>
                </View>
              ))}
            </View>
            {!user.isPremium && (
              <TouchableOpacity onPress={() => router.push('/(app)/premium')} style={styles.premiumPrompt}>
                <Ionicons name="lock-closed" size={12} color={colors.primary} />
                <Text style={styles.premiumPromptText}>Unlock profile views with VYBEON+</Text>
              </TouchableOpacity>
            )}
          </GlassCard>
        </Animated.View>

        {/* Active Mode */}
        <Animated.View entering={FadeInDown.delay(200)}>
          <GlassCard style={styles.modeCard}>
            <View style={styles.modeHeader}>
              <Text style={styles.modeLabel}>Active Mode</Text>
              <TouchableOpacity onPress={() => setShowModeSelector(true)}>
                <Text style={styles.changeMode}>Change</Text>
              </TouchableOpacity>
            </View>
            <ModeChip mode={user.activeMode || 'casual'} size="md" />
          </GlassCard>
        </Animated.View>

        {/* Mode Selector */}
        {showModeSelector && (
          <Animated.View entering={FadeInDown} style={styles.modeSelectorCard}>
            <GlassCard>
              <Text style={styles.modeSelectorTitle}>Choose Your Mode</Text>
              <View style={styles.modeGrid}>
                {ALL_MODES.map(({ mode, label, emoji }) => (
                  <TouchableOpacity
                    key={mode}
                    onPress={() => handleModeChange(mode)}
                    style={[styles.modeOption, user.activeMode === mode && styles.modeOptionActive]}
                  >
                    <Text style={styles.modeEmoji}>{emoji}</Text>
                    <Text style={[styles.modeName, user.activeMode === mode && { color: colors.primary }]}>{label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </GlassCard>
          </Animated.View>
        )}

        {/* Photos Grid */}
        <Animated.View entering={FadeInDown.delay(250)}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Photos</Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/profile-setup')}>
              <Text style={styles.addPhotos}>+ Add</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.photosGrid}>
            {Array.from({ length: 6 }).map((_, i) => (
              <TouchableOpacity key={i} style={styles.photoSlot} onPress={() => router.push('/(auth)/profile-setup')}>
                {photos[i] ? (
                  <Image source={{ uri: photos[i] }} style={styles.photoImage} contentFit="cover" />
                ) : (
                  <View style={styles.photoPlaceholder}>
                    <Ionicons name="add" size={24} color={colors.subtext} />
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>

        {/* Bio */}
        {user.bio && (
          <Animated.View entering={FadeInDown.delay(300)}>
            <GlassCard style={styles.bioCard}>
              <Text style={styles.sectionTitle}>About</Text>
              <Text style={styles.bioText}>{user.bio}</Text>
            </GlassCard>
          </Animated.View>
        )}

        {/* Interests */}
        {user.interests?.length > 0 && (
          <Animated.View entering={FadeInDown.delay(350)}>
            <Text style={styles.sectionTitle2}>Interests</Text>
            <View style={styles.interestsWrap}>
              {user.interests.map((interest) => (
                <View key={interest} style={styles.interestChip}>
                  <Text style={styles.interestText}>{interest}</Text>
                </View>
              ))}
            </View>
          </Animated.View>
        )}

        {/* Verification Status */}
        <Animated.View entering={FadeInDown.delay(400)}>
          {!user.isVerified ? (
            <GlassCard style={styles.verifyCard}>
              <View style={styles.verifyRow}>
                <Ionicons name="shield-outline" size={24} color={colors.warning} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.verifyTitle}>Get Verified</Text>
                  <Text style={styles.verifySubtext}>Verified profiles get 3x more pings</Text>
                </View>
                <Button
                  title="Verify"
                  onPress={() => router.push('/(auth)/face-verify')}
                  size="sm"
                  fullWidth={false}
                />
              </View>
            </GlassCard>
          ) : (
            <GlassCard style={styles.verifyCard}>
              <View style={styles.verifyRow}>
                <Ionicons name="shield-checkmark" size={24} color={colors.success} />
                <Text style={styles.verifiedText}>Verified Profile</Text>
              </View>
            </GlassCard>
          )}
        </Animated.View>

        {/* Premium */}
        {!user.isPremium && (
          <Animated.View entering={FadeInDown.delay(450)}>
            <TouchableOpacity onPress={() => router.push('/(app)/premium')}>
              <LinearGradient colors={['#7C3AED', '#00E5FF']} style={styles.premiumCard}>
                <Ionicons name="star" size={24} color="#FFD700" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.premiumTitle}>Upgrade to VYBEON+</Text>
                  <Text style={styles.premiumSubtext}>Unlimited pings, see who liked you & more</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#FFF" />
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* Actions */}
        <Animated.View entering={FadeInDown.delay(500)} style={styles.actions}>
          <TouchableOpacity onPress={() => router.push('/(app)/safety')} style={styles.actionRow}>
            <Ionicons name="shield-outline" size={20} color={colors.text} />
            <Text style={styles.actionText}>Safety Center</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.subtext} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/(app)/settings/')} style={styles.actionRow}>
            <Ionicons name="settings-outline" size={20} color={colors.text} />
            <Text style={styles.actionText}>Settings</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.subtext} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleLogout} style={[styles.actionRow, styles.logoutRow]}>
            <Ionicons name="log-out-outline" size={20} color={colors.danger} />
            <Text style={[styles.actionText, { color: colors.danger }]}>Logout</Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const PHOTO_SIZE = (SCREEN_WIDTH - 32 - 16) / 3;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  headerTitle: { color: colors.text, fontSize: 24, fontWeight: '800' },
  headerActions: { flexDirection: 'row', gap: 8 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  heroSection: { alignItems: 'center', paddingVertical: 20, gap: 8 },
  avatarWrapper: { position: 'relative' },
  avatarBorder: { width: 104, height: 104, borderRadius: 52, padding: 3, alignItems: 'center', justifyContent: 'center' },
  avatar: { width: 98, height: 98, borderRadius: 49 },
  avatarPlaceholder: { width: 98, height: 98, borderRadius: 49, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  avatarInitials: { color: '#FFF', fontSize: 36, fontWeight: '700' },
  editPhotoBtn: { position: 'absolute', bottom: 2, right: 2, width: 28, height: 28, borderRadius: 14, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.background },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { color: colors.text, fontSize: 22, fontWeight: '800' },
  onlineRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  onlineDot: { width: 8, height: 8, borderRadius: 4 },
  onlineText: { color: colors.subtext, fontSize: 13 },
  editProfileBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: colors.primary, marginTop: 4 },
  editProfileText: { color: colors.primary, fontSize: 14, fontWeight: '600' },
  statsCard: { marginHorizontal: 16, marginBottom: 12 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around' },
  statItem: { alignItems: 'center', gap: 4 },
  statEmoji: { fontSize: 20 },
  statValue: { color: colors.text, fontSize: 20, fontWeight: '800' },
  statLabel: { color: colors.subtext, fontSize: 11 },
  premiumPrompt: { flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border },
  premiumPromptText: { color: colors.primary, fontSize: 12 },
  modeCard: { marginHorizontal: 16, marginBottom: 12 },
  modeHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  modeLabel: { color: colors.text, fontSize: 15, fontWeight: '600' },
  changeMode: { color: colors.primary, fontSize: 13, fontWeight: '600' },
  modeSelectorCard: { marginHorizontal: 16, marginBottom: 12 },
  modeSelectorTitle: { color: colors.text, fontSize: 16, fontWeight: '700', marginBottom: 12 },
  modeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  modeOption: { width: '30%', alignItems: 'center', paddingVertical: 12, borderRadius: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  modeOptionActive: { borderColor: colors.primary, backgroundColor: `${colors.primary}22` },
  modeEmoji: { fontSize: 24 },
  modeName: { color: colors.subtext, fontSize: 12, fontWeight: '500', marginTop: 4 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginBottom: 8 },
  sectionTitle: { color: colors.text, fontSize: 18, fontWeight: '700' },
  addPhotos: { color: colors.primary, fontSize: 14, fontWeight: '600' },
  photosGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, gap: 8, marginBottom: 16 },
  photoSlot: { width: PHOTO_SIZE, height: PHOTO_SIZE, borderRadius: 12, overflow: 'hidden' },
  photoImage: { width: '100%', height: '100%' },
  photoPlaceholder: { width: '100%', height: '100%', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderStyle: 'dashed' },
  bioCard: { marginHorizontal: 16, marginBottom: 12, gap: 8 },
  bioText: { color: colors.subtext, fontSize: 14, lineHeight: 22 },
  sectionTitle2: { color: colors.text, fontSize: 18, fontWeight: '700', paddingHorizontal: 16, marginBottom: 8 },
  interestsWrap: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, gap: 8, marginBottom: 16 },
  interestChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 100, backgroundColor: `${colors.primary}22`, borderWidth: 1, borderColor: `${colors.primary}44` },
  interestText: { color: colors.primary, fontSize: 13, fontWeight: '500' },
  verifyCard: { marginHorizontal: 16, marginBottom: 12 },
  verifyRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  verifyTitle: { color: colors.text, fontSize: 15, fontWeight: '600' },
  verifySubtext: { color: colors.subtext, fontSize: 12 },
  verifiedText: { color: colors.success, fontSize: 15, fontWeight: '600', flex: 1 },
  premiumCard: { marginHorizontal: 16, borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  premiumTitle: { color: '#FFF', fontSize: 15, fontWeight: '700' },
  premiumSubtext: { color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 2 },
  actions: { marginHorizontal: 16, borderRadius: 16, backgroundColor: colors.card, overflow: 'hidden', marginBottom: 16, borderWidth: 1, borderColor: colors.border },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border },
  actionText: { color: colors.text, fontSize: 15, flex: 1 },
  logoutRow: { borderBottomWidth: 0 },
});
