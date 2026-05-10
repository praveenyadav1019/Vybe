import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, TextInput, StatusBar, Switch, Alert, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { usePartyStore } from '../../../src/stores/partyStore';
import { useLocationStore } from '../../../src/stores/locationStore';

// ─── Colors ───────────────────────────────────────────────────────────────────
const bg     = '#F8F8FC';
const ink    = '#1A1A2E';
const muted  = '#6B7280';
const white  = '#FFFFFF';
const brand  = '#7C3AED';
const border = '#E8E8F0';

// ─── Vibe options ─────────────────────────────────────────────────────────────
const VIBE_OPTIONS = [
  { label: 'House Party', emoji: '🏠' },
  { label: 'Rooftop', emoji: '🌃' },
  { label: 'Pool Party', emoji: '🏊' },
  { label: 'Chill', emoji: '🌿' },
  { label: 'Rave', emoji: '🎉' },
  { label: 'BBQ', emoji: '🔥' },
  { label: 'Dinner', emoji: '🍽️' },
  { label: 'Game Night', emoji: '🎮' },
];

const MUSIC_OPTIONS = ['EDM', 'Hip-Hop', 'Bollywood', 'Lo-Fi', 'Pop', 'Mixed', 'R&B', 'Live Band'];

// ─── Form field wrapper ───────────────────────────────────────────────────────
function FormField({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <View style={field.wrap}>
      <Text style={field.label}>{label}{required && <Text style={{ color: '#EF4444' }}> *</Text>}</Text>
      {children}
    </View>
  );
}

const field = StyleSheet.create({
  wrap: { gap: 8 },
  label: { fontSize: 13, fontWeight: '600', color: ink },
});

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function CreatePartyScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const city   = useLocationStore((s) => s.city);
  const lat    = useLocationStore((s) => s.latitude);
  const lng    = useLocationStore((s) => s.longitude);
  const { createParty, isLoading } = usePartyStore();

  // Form state
  const [title,        setTitle]        = useState('');
  const [description,  setDescription]  = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [partyCity,    setPartyCity]    = useState(city ?? '');
  const [vibeType,     setVibeType]     = useState('');
  const [musicType,    setMusicType]    = useState('');
  const [startsAt,     setStartsAt]     = useState('');   // "2025-12-31T20:00:00"
  const [maxAttendees, setMaxAttendees] = useState('30');
  const [ageMin,       setAgeMin]       = useState('18');
  const [allowMale,    setAllowMale]    = useState(true);
  const [allowFemale,  setAllowFemale]  = useState(true);
  const [allowCouple,  setAllowCouple]  = useState(true);
  const [isByob,       setIsByob]       = useState(false);
  const [isPaid,       setIsPaid]       = useState(false);
  const [entryFee,     setEntryFee]     = useState('');
  const [requiresVerification, setRequiresVerification] = useState(false);
  const [visibility,   setVisibility]   = useState<'public' | 'invite_only' | 'verified_only'>('public');

  const handleCreate = async () => {
    if (!title.trim()) { Alert.alert('Missing title', 'Please add a party title.'); return; }
    if (!vibeType)      { Alert.alert('Pick a vibe', 'Select what type of party this is.'); return; }
    if (!partyCity.trim()) { Alert.alert('Missing city', 'Enter your city.'); return; }
    if (!startsAt)      { Alert.alert('Missing time', 'Add the party start date and time.'); return; }

    const party = await createParty({
      title:        title.trim(),
      description:  description.trim() || undefined,
      neighborhood: neighborhood.trim() || undefined,
      city:         partyCity.trim(),
      lat:          lat ?? undefined,
      lng:          lng ?? undefined,
      vibeType,
      musicType:    musicType || undefined,
      startsAt:     new Date(startsAt).toISOString(),
      maxAttendees: parseInt(maxAttendees, 10) || 30,
      ageMin:       parseInt(ageMin, 10) || 18,
      allowMale,
      allowFemale,
      allowCouple,
      isByob,
      isPaid,
      entryFee:     isPaid ? parseFloat(entryFee) || 0 : undefined,
      requiresVerification,
      visibility,
    });

    if (party) {
      Alert.alert('Party Created! 🎉', 'Your party is now live.', [
        { text: 'View Party', onPress: () => router.replace(`/(app)/parties/${party.id}` as any) },
      ]);
    }
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor={bg} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.75}>
          <Ionicons name="arrow-back" size={22} color={ink} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Host a Party</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>

        {/* ── Basic info ──────────────────────────────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(0).duration(350)} style={styles.card}>
          <Text style={styles.cardTitle}>Party Details</Text>

          <FormField label="Party Title" required>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="e.g. Saturday Night Rooftop"
              placeholderTextColor={muted}
              maxLength={100}
            />
          </FormField>

          <FormField label="Description">
            <TextInput
              style={[styles.input, styles.textarea]}
              value={description}
              onChangeText={setDescription}
              placeholder="Tell people what to expect…"
              placeholderTextColor={muted}
              multiline
              maxLength={500}
              textAlignVertical="top"
            />
          </FormField>
        </Animated.View>

        {/* ── Vibe ────────────────────────────────────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(60).duration(350)} style={styles.card}>
          <Text style={styles.cardTitle}>Vibe Type *</Text>
          <View style={styles.vibeGrid}>
            {VIBE_OPTIONS.map((v) => (
              <TouchableOpacity
                key={v.label}
                style={[styles.vibeChip, vibeType === v.label && styles.vibeChipActive]}
                onPress={() => setVibeType(v.label)}
                activeOpacity={0.8}
              >
                <Text style={styles.vibeEmoji}>{v.emoji}</Text>
                <Text style={[styles.vibeLabel, vibeType === v.label && styles.vibeLabelActive]}>
                  {v.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>

        {/* ── Music ───────────────────────────────────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(100).duration(350)} style={styles.card}>
          <Text style={styles.cardTitle}>Music Type</Text>
          <View style={styles.musicRow}>
            {MUSIC_OPTIONS.map((m) => (
              <TouchableOpacity
                key={m}
                style={[styles.musicChip, musicType === m && styles.musicChipActive]}
                onPress={() => setMusicType(musicType === m ? '' : m)}
                activeOpacity={0.8}
              >
                <Text style={[styles.musicLabel, musicType === m && styles.musicLabelActive]}>{m}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>

        {/* ── Location & Time ─────────────────────────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(130).duration(350)} style={styles.card}>
          <Text style={styles.cardTitle}>Location & Time</Text>

          <FormField label="Neighborhood">
            <TextInput
              style={styles.input}
              value={neighborhood}
              onChangeText={setNeighborhood}
              placeholder="e.g. Koramangala, 5th Block"
              placeholderTextColor={muted}
            />
          </FormField>

          <FormField label="City" required>
            <TextInput
              style={styles.input}
              value={partyCity}
              onChangeText={setPartyCity}
              placeholder="City"
              placeholderTextColor={muted}
            />
          </FormField>

          <FormField label="Start Date & Time (YYYY-MM-DDThh:mm)" required>
            <TextInput
              style={styles.input}
              value={startsAt}
              onChangeText={setStartsAt}
              placeholder="e.g. 2025-12-31T20:00"
              placeholderTextColor={muted}
              keyboardType="default"
            />
          </FormField>
        </Animated.View>

        {/* ── Capacity & Rules ────────────────────────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(160).duration(350)} style={styles.card}>
          <Text style={styles.cardTitle}>Capacity & Rules</Text>

          <FormField label="Max Attendees">
            <TextInput
              style={styles.input}
              value={maxAttendees}
              onChangeText={setMaxAttendees}
              keyboardType="numeric"
              placeholder="30"
              placeholderTextColor={muted}
            />
          </FormField>

          <FormField label="Minimum Age">
            <TextInput
              style={styles.input}
              value={ageMin}
              onChangeText={setAgeMin}
              keyboardType="numeric"
              placeholder="18"
              placeholderTextColor={muted}
            />
          </FormField>

          {/* Who's allowed */}
          <Text style={[field.label, { marginTop: 4 }]}>Open to</Text>
          <View style={styles.allowRow}>
            {[
              { label: 'Men',      val: allowMale,   set: setAllowMale },
              { label: 'Women',    val: allowFemale, set: setAllowFemale },
              { label: 'Couples',  val: allowCouple, set: setAllowCouple },
            ].map((a) => (
              <TouchableOpacity
                key={a.label}
                style={[styles.allowChip, a.val && styles.allowChipActive]}
                onPress={() => a.set(!a.val)}
                activeOpacity={0.8}
              >
                <Text style={[styles.allowLabel, a.val && styles.allowLabelActive]}>{a.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Toggle rows */}
          {[
            { label: 'BYOB', sub: 'Bring your own drinks', val: isByob, set: setIsByob },
            { label: 'Verified users only', sub: 'Require profile verification', val: requiresVerification, set: setRequiresVerification },
          ].map((t) => (
            <View key={t.label} style={styles.toggleRow}>
              <View>
                <Text style={styles.toggleLabel}>{t.label}</Text>
                <Text style={styles.toggleSub}>{t.sub}</Text>
              </View>
              <Switch
                value={t.val}
                onValueChange={t.set}
                trackColor={{ false: border, true: brand }}
                thumbColor={white}
                ios_backgroundColor={border}
              />
            </View>
          ))}
        </Animated.View>

        {/* ── Entry / Visibility ──────────────────────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(190).duration(350)} style={styles.card}>
          <Text style={styles.cardTitle}>Entry & Access</Text>

          <View style={styles.toggleRow}>
            <View>
              <Text style={styles.toggleLabel}>Paid Entry</Text>
              <Text style={styles.toggleSub}>Charge an entry fee</Text>
            </View>
            <Switch
              value={isPaid}
              onValueChange={setIsPaid}
              trackColor={{ false: border, true: brand }}
              thumbColor={white}
              ios_backgroundColor={border}
            />
          </View>

          {isPaid && (
            <FormField label="Entry Fee (₹)">
              <TextInput
                style={styles.input}
                value={entryFee}
                onChangeText={setEntryFee}
                keyboardType="numeric"
                placeholder="e.g. 500"
                placeholderTextColor={muted}
              />
            </FormField>
          )}

          <FormField label="Visibility">
            <View style={styles.visibilityRow}>
              {(['public', 'invite_only', 'verified_only'] as const).map((v) => (
                <TouchableOpacity
                  key={v}
                  style={[styles.visChip, visibility === v && styles.visChipActive]}
                  onPress={() => setVisibility(v)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.visLabel, visibility === v && styles.visLabelActive]}>
                    {v === 'public' ? 'Public' : v === 'invite_only' ? 'Invite Only' : 'Verified Only'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </FormField>
        </Animated.View>

        {/* ── Submit ──────────────────────────────────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(220).duration(350)}>
          <TouchableOpacity onPress={handleCreate} activeOpacity={0.88} disabled={isLoading}>
            <LinearGradient
              colors={['#7C3AED', '#00C2CB']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={styles.submitBtn}
            >
              {isLoading ? (
                <ActivityIndicator color={white} />
              ) : (
                <>
                  <Ionicons name="home" size={20} color={white} />
                  <Text style={styles.submitText}>Create Party</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
          <View style={{ height: insets.bottom + 20 }} />
        </Animated.View>
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: white, borderBottomWidth: 1, borderBottomColor: border,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: ink },
  content: { padding: 16, gap: 14 },
  card: {
    backgroundColor: white, borderRadius: 18, padding: 18,
    gap: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: ink },
  input: {
    backgroundColor: '#F9FAFB', borderRadius: 12,
    borderWidth: 1, borderColor: border,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14, color: ink,
  },
  textarea: { minHeight: 90, textAlignVertical: 'top' },

  vibeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  vibeChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1.5, borderColor: border,
    backgroundColor: white,
  },
  vibeChipActive: { borderColor: brand, backgroundColor: '#F5F3FF' },
  vibeEmoji: { fontSize: 14 },
  vibeLabel: { fontSize: 12, fontWeight: '600', color: muted },
  vibeLabelActive: { color: brand },

  musicRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  musicChip: {
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 20, borderWidth: 1.5, borderColor: border,
    backgroundColor: white,
  },
  musicChipActive: { borderColor: brand, backgroundColor: '#F5F3FF' },
  musicLabel: { fontSize: 12, fontWeight: '600', color: muted },
  musicLabelActive: { color: brand },

  allowRow: { flexDirection: 'row', gap: 8 },
  allowChip: {
    flex: 1, alignItems: 'center', paddingVertical: 10,
    borderRadius: 12, borderWidth: 1.5, borderColor: border, backgroundColor: white,
  },
  allowChipActive: { borderColor: brand, backgroundColor: '#F5F3FF' },
  allowLabel: { fontSize: 13, fontWeight: '600', color: muted },
  allowLabelActive: { color: brand },

  toggleRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  toggleLabel: { fontSize: 14, fontWeight: '600', color: ink },
  toggleSub: { fontSize: 11, color: muted, marginTop: 2 },

  visibilityRow: { flexDirection: 'row', gap: 8 },
  visChip: {
    flex: 1, alignItems: 'center', paddingVertical: 10,
    borderRadius: 12, borderWidth: 1.5, borderColor: border, backgroundColor: white,
  },
  visChipActive: { borderColor: brand, backgroundColor: '#F5F3FF' },
  visLabel: { fontSize: 11, fontWeight: '600', color: muted, textAlign: 'center' },
  visLabelActive: { color: brand },

  submitBtn: {
    height: 56, borderRadius: 28,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    shadowColor: brand, shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3, shadowRadius: 16, elevation: 8,
  },
  submitText: { fontSize: 17, fontWeight: '700', color: white },
});
