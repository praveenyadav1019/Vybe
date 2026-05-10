import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Switch, StyleSheet, Alert,
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
import { Button } from '@/components/ui/Button';
import type { Privacy } from '@/types';

type VisibilityOption = Privacy;

export default function PrivacySettingsScreen() {
  const router = useRouter();
  const { user, updateUser } = useAuthStore();

  const [visibility, setVisibility] = useState<VisibilityOption>(user?.privacyLevel || 'public');
  const [showOnline, setShowOnline] = useState(true);
  const [showLastSeen, setShowLastSeen] = useState(true);
  const [appearInRadar, setAppearInRadar] = useState(true);
  const [appearInNearby, setAppearInNearby] = useState(true);
  const [showFace, setShowFace] = useState(true);
  const [verifiedPingsOnly, setVerifiedPingsOnly] = useState(user?.safetyMode || false);
  const [isSaving, setIsSaving] = useState(false);

  const savePrivacy = async () => {
    setIsSaving(true);
    try {
      await api.patch('/me', {
        privacyLevel: visibility,
        safetyMode: verifiedPingsOnly,
      });
      updateUser({ privacyLevel: visibility, safetyMode: verifiedPingsOnly });
      Alert.alert('Saved', 'Privacy settings updated successfully.');
      router.back();
    } catch {
      Alert.alert('Error', 'Failed to save privacy settings. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Animated.View entering={FadeInDown.delay(50)} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacy Settings</Text>
        <View style={{ width: 40 }} />
      </Animated.View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>

        {/* Profile Visibility */}
        <Animated.View entering={FadeInDown.delay(100)}>
          <Text style={styles.groupLabel}>Profile Visibility</Text>
          <GlassCard style={styles.group}>
            <Text style={styles.groupDesc}>Who can see your profile on VYBEON?</Text>
            {[
              { value: 'public' as Privacy, label: 'Everyone', desc: 'All VYBEON users can see you', icon: 'earth-outline' },
              { value: 'verified-only' as Privacy, label: 'Verified Only', desc: 'Only verified users can see you', icon: 'shield-checkmark-outline' },
              { value: 'private' as Privacy, label: 'Private', desc: 'Only your matches can see you', icon: 'lock-closed-outline' },
            ].map(({ value, label, desc, icon }) => (
              <TouchableOpacity
                key={value}
                onPress={() => setVisibility(value)}
                style={[styles.radioRow, visibility === value && styles.radioRowActive]}
              >
                <View style={[styles.radioIcon, visibility === value && { backgroundColor: `${colors.primary}22` }]}>
                  <Ionicons name={icon as any} size={18} color={visibility === value ? colors.primary : colors.subtext} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.radioLabel, visibility === value && { color: colors.primary }]}>{label}</Text>
                  <Text style={styles.radioDesc}>{desc}</Text>
                </View>
                <View style={[styles.radioCircle, visibility === value && styles.radioCircleActive]}>
                  {visibility === value && <View style={styles.radioFill} />}
                </View>
              </TouchableOpacity>
            ))}
          </GlassCard>
        </Animated.View>

        {/* Location Privacy */}
        <Animated.View entering={FadeInDown.delay(150)}>
          <Text style={styles.groupLabel}>Location Privacy</Text>
          <GlassCard style={styles.group}>
            <View style={styles.infoRow}>
              <Ionicons name="location-outline" size={18} color={colors.success} />
              <View style={{ flex: 1 }}>
                <Text style={styles.infoLabel}>Exact Location Never Shared</Text>
                <Text style={styles.infoDesc}>Only "Same venue", "Within 100m" or "Nearby" is shown to others</Text>
              </View>
              <Ionicons name="checkmark-circle" size={18} color={colors.success} />
            </View>
          </GlassCard>
        </Animated.View>

        {/* Discovery Privacy */}
        <Animated.View entering={FadeInDown.delay(200)}>
          <Text style={styles.groupLabel}>Discovery</Text>
          <GlassCard style={styles.group}>
            {[
              { label: 'Appear in Radar', value: appearInRadar, onChange: setAppearInRadar },
              { label: 'Appear in Nearby List', value: appearInNearby, onChange: setAppearInNearby },
              { label: 'Show when I\'m Online', value: showOnline, onChange: setShowOnline },
              { label: 'Show Last Seen', value: showLastSeen, onChange: setShowLastSeen },
            ].map(({ label, value, onChange }) => (
              <View key={label} style={styles.switchRow}>
                <Text style={styles.switchLabel}>{label}</Text>
                <Switch
                  value={value}
                  onValueChange={onChange}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor="#FFF"
                />
              </View>
            ))}
          </GlassCard>
        </Animated.View>

        {/* Photo Privacy */}
        <Animated.View entering={FadeInDown.delay(250)}>
          <Text style={styles.groupLabel}>Photos</Text>
          <GlassCard style={styles.group}>
            <View style={styles.switchRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.switchLabel}>Show Face in Search Results</Text>
                <Text style={styles.switchDesc}>Hide your main photo from discovery</Text>
              </View>
              <Switch value={showFace} onValueChange={setShowFace} trackColor={{ false: colors.border, true: colors.primary }} thumbColor="#FFF" />
            </View>
            <View style={[styles.switchRow, styles.premiumRow]}>
              <View style={{ flex: 1 }}>
                <View style={styles.premiumLabelRow}>
                  <Text style={styles.switchLabel}>Blur Photos for Unmatched</Text>
                  <View style={styles.premiumBadge}><Text style={styles.premiumBadgeText}>PLUS</Text></View>
                </View>
                <Text style={styles.switchDesc}>Photos blurred until you match</Text>
              </View>
              <TouchableOpacity onPress={() => router.push('/(app)/premium')}>
                <Ionicons name="lock-closed" size={18} color={colors.primary} />
              </TouchableOpacity>
            </View>
          </GlassCard>
        </Animated.View>

        {/* Communication */}
        <Animated.View entering={FadeInDown.delay(300)}>
          <Text style={styles.groupLabel}>Communication</Text>
          <GlassCard style={styles.group}>
            <View style={styles.switchRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.switchLabel}>Verified Users Only</Text>
                <Text style={styles.switchDesc}>Only verified profiles can send you pings</Text>
              </View>
              <Switch value={verifiedPingsOnly} onValueChange={setVerifiedPingsOnly} trackColor={{ false: colors.border, true: colors.primary }} thumbColor="#FFF" />
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="hand-left-outline" size={18} color={colors.accent} />
              <View style={{ flex: 1 }}>
                <Text style={styles.infoLabel}>Consent-First Messaging</Text>
                <Text style={styles.infoDesc}>Both users must match before messaging — always on</Text>
              </View>
              <Ionicons name="checkmark-circle" size={18} color={colors.success} />
            </View>
          </GlassCard>
        </Animated.View>

        {/* Save */}
        <Animated.View entering={FadeInDown.delay(350)} style={styles.saveWrapper}>
          <Button title="Save Privacy Settings" onPress={savePrivacy} loading={isSaving} />
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
  groupDesc: { color: colors.subtext, fontSize: 13, marginBottom: 12 },
  group: { marginHorizontal: 16 },
  radioRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderRadius: 10, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: colors.border },
  radioRowActive: { backgroundColor: `${colors.primary}08` },
  radioIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  radioLabel: { color: colors.text, fontSize: 14, fontWeight: '600' },
  radioDesc: { color: colors.subtext, fontSize: 12, marginTop: 1 },
  radioCircle: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  radioCircleActive: { borderColor: colors.primary },
  radioFill: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  infoLabel: { color: colors.text, fontSize: 13, fontWeight: '600' },
  infoDesc: { color: colors.subtext, fontSize: 11, marginTop: 2, lineHeight: 16 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  switchLabel: { color: colors.text, fontSize: 14, fontWeight: '500' },
  switchDesc: { color: colors.subtext, fontSize: 12, marginTop: 2 },
  premiumRow: {},
  premiumLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  premiumBadge: { backgroundColor: `${colors.primary}33`, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  premiumBadgeText: { color: colors.primary, fontSize: 9, fontWeight: '800' },
  saveWrapper: { paddingHorizontal: 16, marginTop: 24 },
});
