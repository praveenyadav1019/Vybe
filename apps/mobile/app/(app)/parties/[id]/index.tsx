import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, StatusBar, Alert, ActivityIndicator,
  Modal, TextInput,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { usePartyStore } from '../../../../src/stores/partyStore';
import { useAuthStore } from '../../../../src/stores/authStore';

// ─── Colors ───────────────────────────────────────────────────────────────────
const bg     = '#F8F8FC';
const ink    = '#1A1A2E';
const muted  = '#6B7280';
const white  = '#FFFFFF';
const brand  = '#7C3AED';
const border = '#E8E8F0';
const success = '#10B981';

// ─── Info row ─────────────────────────────────────────────────────────────────
function InfoRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIcon}>
        <Ionicons name={icon as any} size={17} color={brand} />
      </View>
      <View>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function PartyDetailScreen() {
  const insets  = useSafeAreaInsets();
  const router  = useRouter();
  const { id }  = useLocalSearchParams<{ id: string }>();
  const user    = useAuthStore((s) => s.user);

  const { selectedParty, isLoading, fetchParty, joinParty, cancelParty } = usePartyStore();
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinMessage, setJoinMessage]     = useState('');
  const [joining, setJoining]             = useState(false);

  useEffect(() => {
    if (id) void fetchParty(id);
  }, [id]);

  const party = selectedParty;

  const handleJoin = async () => {
    if (!party) return;
    setJoining(true);
    await joinParty(party.id, joinMessage.trim() || undefined);
    setShowJoinModal(false);
    setJoining(false);
  };

  const handleCancel = () => {
    Alert.alert('Cancel Party?', 'This will notify all attendees.', [
      { text: 'Yes, Cancel', style: 'destructive', onPress: async () => {
        if (party) { await cancelParty(party.id); router.back(); }
      }},
      { text: 'Keep it', style: 'cancel' },
    ]);
  };

  if (isLoading || !party) {
    return (
      <View style={[styles.root, { alignItems: 'center', justifyContent: 'center', paddingTop: insets.top }]}>
        <ActivityIndicator color={brand} size="large" />
      </View>
    );
  }

  const startDate = new Date(party.startsAt);
  const dateStr = startDate.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });
  const timeStr = startDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  const spotsLeft = party.maxAttendees - party.attendeeCount;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* ── Cover ────────────────────────────────────────────────────────── */}
        <View style={styles.coverWrap}>
          {party.coverImage ? (
            <Image source={{ uri: party.coverImage }} style={StyleSheet.absoluteFillObject} contentFit="cover" />
          ) : (
            <LinearGradient
              colors={['#1A1A2E', '#4C1D95', '#7C3AED']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFillObject}
            />
          )}
          <LinearGradient
            colors={['rgba(0,0,0,0.3)', 'transparent', 'rgba(0,0,0,0.7)']}
            locations={[0, 0.4, 1]}
            style={StyleSheet.absoluteFillObject}
          />
          <TouchableOpacity
            style={[styles.backBtn, { top: insets.top + 10 }]}
            onPress={() => router.back()}
            activeOpacity={0.8}
          >
            <Ionicons name="arrow-back" size={22} color={white} />
          </TouchableOpacity>
          <View style={[styles.coverInfo, { paddingBottom: 24 }]}>
            <View style={styles.vibeTag}>
              <Text style={styles.vibeTagText}>{party.vibeType}</Text>
            </View>
            {party.musicType && (
              <View style={[styles.vibeTag, { backgroundColor: 'rgba(0,194,203,0.25)', borderColor: 'rgba(0,194,203,0.4)' }]}>
                <Ionicons name="musical-notes-outline" size={10} color="rgba(255,255,255,0.9)" style={{ marginRight: 3 }} />
                <Text style={styles.vibeTagText}>{party.musicType}</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.content}>
          {/* ── Title + host ──────────────────────────────────────────────── */}
          <Animated.View entering={FadeInDown.delay(0).duration(350)}>
            <Text style={styles.title}>{party.title}</Text>
            <View style={styles.hostRow}>
              <View style={styles.hostAvatarWrap}>
                {party.host?.photo ? (
                  <Image source={{ uri: party.host.photo }} style={StyleSheet.absoluteFillObject} contentFit="cover" />
                ) : (
                  <LinearGradient colors={['#9333EA', '#7C3AED']} style={StyleSheet.absoluteFillObject} />
                )}
              </View>
              <View>
                <Text style={styles.hostName}>Hosted by {party.host?.name ?? 'Anonymous'}</Text>
                {party.host?.verified && (
                  <View style={styles.verifiedBadge}>
                    <Ionicons name="checkmark-circle" size={12} color={brand} />
                    <Text style={styles.verifiedText}>Verified host</Text>
                  </View>
                )}
              </View>
            </View>
          </Animated.View>

          {/* ── Stats row ──────────────────────────────────────────────────── */}
          <Animated.View entering={FadeInDown.delay(60).duration(350)} style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statNum}>{party.attendeeCount}</Text>
              <Text style={styles.statLabel}>Joined</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Text style={[styles.statNum, { color: spotsLeft > 0 ? success : '#EF4444' }]}>
                {spotsLeft > 0 ? spotsLeft : 'Full'}
              </Text>
              <Text style={styles.statLabel}>Spots Left</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Text style={styles.statNum}>{party.ageMin}+</Text>
              <Text style={styles.statLabel}>Age Min</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Text style={styles.statNum}>{party.isPaid ? `₹${party.entryFee ?? 0}` : 'Free'}</Text>
              <Text style={styles.statLabel}>Entry</Text>
            </View>
          </Animated.View>

          {/* ── Details card ───────────────────────────────────────────────── */}
          <Animated.View entering={FadeInDown.delay(100).duration(350)} style={styles.detailsCard}>
            <InfoRow icon="calendar-outline" label="Date & Time" value={`${dateStr} · ${timeStr}`} />
            <View style={styles.infoDiv} />
            <InfoRow icon="location-outline" label="Location" value={party.neighborhood ?? party.city} />
            <View style={styles.infoDiv} />
            <InfoRow icon="people-outline" label="Open to" value={[
              party.allowMale && 'Men',
              party.allowFemale && 'Women',
              party.allowCouple && 'Couples',
            ].filter(Boolean).join(' · ')} />
            {party.isByob && (
              <>
                <View style={styles.infoDiv} />
                <InfoRow icon="wine-outline" label="BYOB" value="Bring your own drinks" />
              </>
            )}
            {party.requiresVerification && (
              <>
                <View style={styles.infoDiv} />
                <InfoRow icon="shield-checkmark-outline" label="Access" value="Verified users only" />
              </>
            )}
          </Animated.View>

          {/* ── Description ────────────────────────────────────────────────── */}
          {party.description ? (
            <Animated.View entering={FadeInDown.delay(140).duration(350)} style={styles.descCard}>
              <Text style={styles.descTitle}>About the Party</Text>
              <Text style={styles.descText}>{party.description}</Text>
            </Animated.View>
          ) : null}

          {/* ── Attendees preview ──────────────────────────────────────────── */}
          {party.attendees && party.attendees.length > 0 && (
            <Animated.View entering={FadeInDown.delay(180).duration(350)} style={styles.attendeesCard}>
              <Text style={styles.descTitle}>Who's Going</Text>
              <View style={styles.attendeesList}>
                {party.attendees.slice(0, 5).map((a) => (
                  <TouchableOpacity
                    key={a.id}
                    style={styles.attendeeItem}
                    onPress={() => router.push(`/(app)/user/${a.id}` as any)}
                    activeOpacity={0.85}
                  >
                    <View style={styles.attendeeAvatar}>
                      {a.photo ? (
                        <Image source={{ uri: a.photo }} style={StyleSheet.absoluteFillObject} contentFit="cover" />
                      ) : (
                        <LinearGradient colors={['#EDE9FE', '#DDD6FE']} style={StyleSheet.absoluteFillObject} />
                      )}
                    </View>
                    <Text style={styles.attendeeName} numberOfLines={1}>{a.name.split(' ')[0]}</Text>
                  </TouchableOpacity>
                ))}
                {party.attendeeCount > 5 && (
                  <View style={styles.moreAttendees}>
                    <Text style={styles.moreAttendeesText}>+{party.attendeeCount - 5}</Text>
                  </View>
                )}
              </View>
            </Animated.View>
          )}

          <View style={{ height: 100 }} />
        </View>
      </ScrollView>

      {/* ── Fixed bottom action ────────────────────────────────────────────── */}
      <Animated.View entering={FadeIn.delay(200).duration(350)} style={[styles.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
        {party.isHost ? (
          <View style={styles.hostActions}>
            <TouchableOpacity
              style={styles.manageBtn}
              onPress={() => router.push(`/(app)/parties/${party.id}/requests` as any)}
              activeOpacity={0.85}
            >
              <Ionicons name="people-outline" size={17} color={brand} />
              <Text style={styles.manageBtnText}>Manage Requests</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelPartyBtn} onPress={handleCancel} activeOpacity={0.85}>
              <Text style={styles.cancelPartyText}>Cancel Party</Text>
            </TouchableOpacity>
          </View>
        ) : party.requestStatus === 'accepted' ? (
          <View style={styles.joinedBanner}>
            <Ionicons name="checkmark-circle" size={20} color={success} />
            <Text style={styles.joinedText}>You're going! Check location closer to the date.</Text>
          </View>
        ) : party.requestStatus === 'pending' ? (
          <View style={styles.pendingBanner}>
            <Ionicons name="time-outline" size={20} color="#F59E0B" />
            <Text style={styles.pendingText}>Request pending — the host will respond soon.</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.joinBtn, party.isFull && styles.joinBtnDisabled]}
            onPress={() => !party.isFull && setShowJoinModal(true)}
            activeOpacity={0.88}
            disabled={party.isFull}
          >
            <LinearGradient
              colors={party.isFull ? ['#E5E7EB', '#E5E7EB'] : ['#7C3AED', '#00C2CB']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={styles.joinBtnGrad}
            >
              <Ionicons name={party.isFull ? 'close-circle-outline' : 'enter-outline'} size={20} color={party.isFull ? muted : white} />
              <Text style={[styles.joinBtnText, party.isFull && { color: muted }]}>
                {party.isFull ? 'Party is Full' : party.visibility === 'public' ? 'Join Party' : 'Request to Join'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        )}
      </Animated.View>

      {/* ── Join message modal ────────────────────────────────────────────── */}
      <Modal visible={showJoinModal} transparent animationType="slide">
        <View style={modal.overlay}>
          <View style={modal.sheet}>
            <Text style={modal.title}>
              {party.visibility === 'public' ? 'Join Party' : 'Request to Join'}
            </Text>
            <Text style={modal.sub}>
              {party.visibility === 'public'
                ? "You'll be added instantly."
                : 'The host will review your request.'}
            </Text>
            {party.visibility !== 'public' && (
              <TextInput
                style={modal.input}
                placeholder="Add a message to the host (optional)"
                placeholderTextColor={muted}
                value={joinMessage}
                onChangeText={setJoinMessage}
                multiline
                maxLength={200}
              />
            )}
            <View style={modal.actions}>
              <TouchableOpacity style={modal.cancelBtn} onPress={() => setShowJoinModal(false)} activeOpacity={0.8}>
                <Text style={modal.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={modal.confirmBtn} onPress={handleJoin} activeOpacity={0.85} disabled={joining}>
                <LinearGradient colors={['#7C3AED', '#9333EA']} style={modal.confirmGrad}>
                  {joining ? <ActivityIndicator color={white} size="small" /> : <Text style={modal.confirmText}>Confirm</Text>}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─── Modal styles ─────────────────────────────────────────────────────────────
const modal = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: white, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, gap: 12,
  },
  title: { fontSize: 20, fontWeight: '800', color: ink },
  sub:   { fontSize: 14, color: muted },
  input: {
    backgroundColor: '#F9FAFB', borderRadius: 14,
    borderWidth: 1, borderColor: border,
    padding: 14, fontSize: 14, color: ink,
    minHeight: 80, textAlignVertical: 'top',
  },
  actions: { flexDirection: 'row', gap: 12, marginTop: 4 },
  cancelBtn: {
    flex: 1, height: 50, borderRadius: 25,
    borderWidth: 1.5, borderColor: border,
    alignItems: 'center', justifyContent: 'center',
  },
  cancelText: { fontSize: 15, fontWeight: '600', color: ink },
  confirmBtn: { flex: 1, borderRadius: 25, overflow: 'hidden' },
  confirmGrad: { height: 50, alignItems: 'center', justifyContent: 'center' },
  confirmText: { fontSize: 15, fontWeight: '700', color: white },
});

// ─── Screen styles ────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: bg },
  coverWrap: { height: 260, position: 'relative' },
  backBtn: {
    position: 'absolute', left: 16, zIndex: 10,
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center', justifyContent: 'center',
  },
  coverInfo: {
    position: 'absolute', bottom: 0, left: 16, right: 16,
    flexDirection: 'row', flexWrap: 'wrap', gap: 6,
  },
  vibeTag: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)',
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
  },
  vibeTagText: { fontSize: 11, fontWeight: '600', color: white },

  content: { padding: 20, gap: 16 },
  title: { fontSize: 26, fontWeight: '800', color: ink, marginBottom: 10 },

  hostRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  hostAvatarWrap: {
    width: 42, height: 42, borderRadius: 21,
    overflow: 'hidden', backgroundColor: '#7C3AED',
  },
  hostName: { fontSize: 14, fontWeight: '600', color: ink },
  verifiedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  verifiedText: { fontSize: 11, color: brand, fontWeight: '500' },

  statsRow: {
    flexDirection: 'row', backgroundColor: white,
    borderRadius: 16, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  statBox: { flex: 1, alignItems: 'center', gap: 3 },
  statNum: { fontSize: 18, fontWeight: '800', color: ink },
  statLabel: { fontSize: 10, color: muted },
  statDivider: { width: 1, backgroundColor: border, marginHorizontal: 4 },

  detailsCard: {
    backgroundColor: white, borderRadius: 16, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, padding: 16 },
  infoIcon: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: '#EDE9FE', alignItems: 'center', justifyContent: 'center',
  },
  infoLabel: { fontSize: 11, color: muted, marginBottom: 2 },
  infoValue: { fontSize: 14, fontWeight: '600', color: ink },
  infoDiv: { height: 1, backgroundColor: border, marginHorizontal: 16 },

  descCard: {
    backgroundColor: white, borderRadius: 16, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  descTitle: { fontSize: 15, fontWeight: '700', color: ink, marginBottom: 10 },
  descText: { fontSize: 14, color: muted, lineHeight: 21 },

  attendeesCard: {
    backgroundColor: white, borderRadius: 16, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  attendeesList: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 4 },
  attendeeItem: { alignItems: 'center', gap: 5 },
  attendeeAvatar: {
    width: 50, height: 50, borderRadius: 25,
    overflow: 'hidden', backgroundColor: '#EDE9FE',
  },
  attendeeName: { fontSize: 10, color: muted, width: 50, textAlign: 'center' },
  moreAttendees: {
    width: 50, height: 50, borderRadius: 25,
    backgroundColor: '#F3F4F6',
    alignItems: 'center', justifyContent: 'center',
  },
  moreAttendeesText: { fontSize: 13, fontWeight: '700', color: ink },

  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: white, paddingHorizontal: 20, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: border,
  },
  joinBtn: { borderRadius: 28, overflow: 'hidden' },
  joinBtnDisabled: { opacity: 0.6 },
  joinBtnGrad: {
    height: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  joinBtnText: { fontSize: 17, fontWeight: '700', color: white },

  joinedBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#F0FDF4', borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: 14,
  },
  joinedText: { flex: 1, fontSize: 13, color: '#166534', fontWeight: '500' },

  pendingBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#FFFBEB', borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: 14,
  },
  pendingText: { flex: 1, fontSize: 13, color: '#92400E', fontWeight: '500' },

  hostActions: { gap: 10 },
  manageBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    height: 50, borderRadius: 25, backgroundColor: '#EDE9FE',
  },
  manageBtnText: { fontSize: 15, fontWeight: '700', color: brand },
  cancelPartyBtn: {
    height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: '#FEE2E2',
  },
  cancelPartyText: { fontSize: 14, fontWeight: '600', color: '#EF4444' },
});
