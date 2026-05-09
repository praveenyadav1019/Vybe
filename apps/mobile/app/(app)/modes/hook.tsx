import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Switch,
  StyleSheet,
  Dimensions,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation } from '@tanstack/react-query';
import Animated, { FadeInDown, FadeInRight } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { useDiscoveryStore } from '@/stores/discoveryStore';
import type { NearbyUser } from '@/types';
import { colors } from '@/theme/colors';
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import { Avatar } from '@/components/ui/Avatar';
import { ModeChip } from '@/components/user/ModeChip';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const MODE_COLOR = '#FF6B35';

export default function HookModeScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { setActiveMode } = useDiscoveryStore();
  const [isActive, setIsActive] = useState(false);
  const [safetyEnabled, setSafetyEnabled] = useState(
    user?.gender === 'female' || user?.safetyMode || false
  );

  const { data, isLoading } = useQuery({
    queryKey: ['nearby', 'hook'],
    queryFn: () => api.get<{ users: NearbyUser[] }>('/location/nearby?mode=hook').then(r => r.data.users),
    enabled: isActive,
    refetchInterval: 30000,
  });

  const activateMutation = useMutation({
    mutationFn: (active: boolean) =>
      api.patch('/me', { activeMode: active ? 'hook' : 'casual' }),
    onSuccess: (_, active) => {
      setIsActive(active);
      if (active) setActiveMode('hook');
      else setActiveMode('casual');
    },
  });

  const pingMutation = useMutation({
    mutationFn: (userId: string) => api.post(`/users/${userId}/ping`),
    onSuccess: () => Alert.alert('🔥 Pinged!', 'Your ping was sent.'),
    onError: () => Alert.alert('Error', 'Could not send ping.'),
  });

  const handleToggle = (val: boolean) => {
    if (val && !user?.isVerified) {
      Alert.alert(
        'Verification Required',
        'Hook Mode requires a verified profile. Please complete face verification.',
        [
          { text: 'Verify Now', onPress: () => router.push('/(auth)/face-verify') },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
      return;
    }
    activateMutation.mutate(val);
  };

  const nearbyUsers = data || [];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <Animated.View entering={FadeInDown.delay(50)} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Hook Mode 🔥</Text>
        <View style={{ width: 40 }} />
      </Animated.View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Hero Card */}
        <Animated.View entering={FadeInDown.delay(100)} style={styles.heroWrapper}>
          <LinearGradient
            colors={['#FF6B35', '#CC3300']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroGradient}
          >
            <Text style={styles.heroEmoji}>🔥</Text>
            <Text style={styles.heroTitle}>Hook Mode</Text>
            <Text style={styles.heroSubtitle}>Find someone for tonight</Text>
            <View style={styles.toggleRow}>
              <Text style={styles.toggleLabel}>{isActive ? 'Active' : 'Inactive'}</Text>
              <Switch
                value={isActive}
                onValueChange={handleToggle}
                trackColor={{ false: 'rgba(255,255,255,0.3)', true: '#FFFFFF' }}
                thumbColor={isActive ? MODE_COLOR : '#FFFFFF'}
              />
            </View>
          </LinearGradient>
        </Animated.View>

        {/* Safety Disclaimer */}
        <Animated.View entering={FadeInDown.delay(150)}>
          <GlassCard style={styles.safetyCard}>
            <View style={styles.safetyRow}>
              <Ionicons name="shield-checkmark" size={20} color={colors.success} />
              <Text style={styles.safetyText}>Consent is everything. Always verify.</Text>
            </View>
            <Text style={styles.safetySubtext}>
              All communication requires mutual consent. Block and report anyone making you uncomfortable.
            </Text>
            {user?.gender === 'female' && (
              <View style={styles.safetyToggleRow}>
                <Text style={styles.safetyToggleLabel}>Women's Safety Mode</Text>
                <Switch
                  value={safetyEnabled}
                  onValueChange={setSafetyEnabled}
                  trackColor={{ false: colors.border, true: colors.success }}
                  thumbColor="#FFF"
                />
              </View>
            )}
          </GlassCard>
        </Animated.View>

        {/* Tonight Indicator */}
        <Animated.View entering={FadeInDown.delay(200)}>
          <GlassCard style={styles.tonightCard}>
            <View style={styles.tonightRow}>
              <View style={styles.pulsingDot} />
              <Text style={styles.tonightText}>Tonight Only — Resets at 6:00 AM</Text>
            </View>
            <Text style={styles.tonightCount}>
              {nearbyUsers.length > 0 ? `${nearbyUsers.length} people in hook mode nearby` : 'Activate to see who\'s nearby'}
            </Text>
          </GlassCard>
        </Animated.View>

        {/* Users in Hook Mode */}
        {isActive && (
          <Animated.View entering={FadeInDown.delay(250)}>
            <Text style={styles.sectionTitle}>People Nearby 🔥</Text>
            {isLoading ? (
              <Text style={styles.loadingText}>Finding people...</Text>
            ) : nearbyUsers.length === 0 ? (
              <GlassCard style={styles.emptyCard}>
                <Ionicons name="flame-outline" size={48} color={MODE_COLOR} />
                <Text style={styles.emptyTitle}>No one nearby yet</Text>
                <Text style={styles.emptySubtext}>Check back later or increase your radius</Text>
              </GlassCard>
            ) : (
              <FlatList
                data={nearbyUsers}
                keyExtractor={(item) => item.id}
                scrollEnabled={false}
                numColumns={2}
                columnWrapperStyle={{ gap: 12 }}
                contentContainerStyle={{ gap: 12, paddingHorizontal: 16 }}
                renderItem={({ item, index }) => (
                  <Animated.View entering={FadeInRight.delay(index * 80)} style={styles.userCard}>
                    <TouchableOpacity
                      onPress={() => router.push(`/(app)/user/${item.id}`)}
                      activeOpacity={0.85}
                    >
                      <Avatar uri={item.photos[0]} name={item.name} size="xl" />
                      <View style={styles.userInfo}>
                        <Text style={styles.userName}>{item.name}, {item.age}</Text>
                        <Text style={styles.userDist}>{item.distance}</Text>
                      </View>
                      <Button
                        title="Ping 🔥"
                        onPress={() => pingMutation.mutate(item.id)}
                        size="sm"
                        fullWidth
                        loading={pingMutation.isPending}
                      />
                    </TouchableOpacity>
                  </Animated.View>
                )}
              />
            )}
          </Animated.View>
        )}

        {!isActive && (
          <Animated.View entering={FadeInDown.delay(300)} style={styles.inactivePrompt}>
            <Ionicons name="flame-outline" size={64} color={MODE_COLOR} />
            <Text style={styles.inactiveTitle}>You're not in Hook Mode</Text>
            <Text style={styles.inactiveSubtext}>Toggle the switch above to start discovering</Text>
          </Animated.View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: colors.text, fontSize: 18, fontWeight: '700' },
  heroWrapper: { margin: 16, borderRadius: 20, overflow: 'hidden' },
  heroGradient: { padding: 24, alignItems: 'center', gap: 8 },
  heroEmoji: { fontSize: 48 },
  heroTitle: { color: '#FFF', fontSize: 28, fontWeight: '800' },
  heroSubtitle: { color: 'rgba(255,255,255,0.8)', fontSize: 15 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8, backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 8 },
  toggleLabel: { color: '#FFF', fontSize: 16, fontWeight: '600', flex: 1 },
  safetyCard: { marginHorizontal: 16, marginBottom: 12 },
  safetyRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  safetyText: { color: colors.success, fontSize: 14, fontWeight: '600' },
  safetySubtext: { color: colors.subtext, fontSize: 12, lineHeight: 18 },
  safetyToggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10 },
  safetyToggleLabel: { color: colors.text, fontSize: 14, fontWeight: '500' },
  tonightCard: { marginHorizontal: 16, marginBottom: 16 },
  tonightRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  pulsingDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.danger },
  tonightText: { color: colors.text, fontSize: 13, fontWeight: '600' },
  tonightCount: { color: colors.subtext, fontSize: 13 },
  sectionTitle: { color: colors.text, fontSize: 18, fontWeight: '700', paddingHorizontal: 16, marginBottom: 12 },
  loadingText: { color: colors.subtext, textAlign: 'center', padding: 24 },
  emptyCard: { marginHorizontal: 16, alignItems: 'center', gap: 8, paddingVertical: 32 },
  emptyTitle: { color: colors.text, fontSize: 18, fontWeight: '600' },
  emptySubtext: { color: colors.subtext, fontSize: 13, textAlign: 'center' },
  userCard: { flex: 1, backgroundColor: colors.card, borderRadius: 16, padding: 12, gap: 8 },
  userInfo: { gap: 2 },
  userName: { color: colors.text, fontSize: 14, fontWeight: '600' },
  userDist: { color: colors.subtext, fontSize: 12 },
  inactivePrompt: { alignItems: 'center', gap: 12, paddingVertical: 48 },
  inactiveTitle: { color: colors.text, fontSize: 20, fontWeight: '700' },
  inactiveSubtext: { color: colors.subtext, fontSize: 14, textAlign: 'center', paddingHorizontal: 32 },
});
