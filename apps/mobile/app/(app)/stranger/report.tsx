import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  TextInput, ScrollView, StatusBar, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { api } from '../../../src/lib/api';

// ─── Color tokens ─────────────────────────────────────────────────────────────
const bg    = '#F8F8FC';
const ink   = '#1A1A2E';
const muted = '#6B7280';
const white = '#FFFFFF';
const brand = '#7C3AED';
const red   = '#EF4444';
const border = '#E8E8F0';

const REASONS = [
  { id: 'harassment',  label: 'Harassment / Abuse',  icon: 'hand-left-outline' },
  { id: 'nudity',      label: 'Nudity / Sexual content', icon: 'eye-off-outline' },
  { id: 'underage',    label: 'Underage user',        icon: 'alert-circle-outline' },
  { id: 'spam',        label: 'Spam / Bot',           icon: 'ban-outline' },
  { id: 'other',       label: 'Other',                icon: 'flag-outline' },
] as const;

type Reason = typeof REASONS[number]['id'];

export default function StrangerReportScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();

  const [reason, setReason] = useState<Reason | null>(null);
  const [details, setDetails] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!reason) {
      Alert.alert('Select a reason', 'Please pick why you\'re reporting this session.');
      return;
    }
    setLoading(true);
    try {
      await api.post('/stranger/report', { sessionId, reason, details: details.trim() || undefined });
      Alert.alert('Report submitted', 'Thank you for keeping VYBE safe.', [
        { text: 'OK', onPress: () => router.replace('/(tabs)/meet' as any) },
      ]);
    } catch {
      Alert.alert('Error', 'Could not submit report. Please try again.');
    } finally {
      setLoading(false);
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
        <Text style={styles.headerTitle}>Report Session</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.intro}>
          Help us keep VYBE safe. Reports are anonymous and reviewed by our safety team.
        </Text>

        {/* Reason list */}
        <Text style={styles.sectionLabel}>What's the issue?</Text>
        <View style={styles.reasonList}>
          {REASONS.map((r) => (
            <TouchableOpacity
              key={r.id}
              style={[styles.reasonRow, reason === r.id && styles.reasonRowActive]}
              onPress={() => setReason(r.id)}
              activeOpacity={0.8}
            >
              <View style={[styles.reasonIcon, reason === r.id && styles.reasonIconActive]}>
                <Ionicons name={r.icon as any} size={18} color={reason === r.id ? brand : muted} />
              </View>
              <Text style={[styles.reasonLabel, reason === r.id && styles.reasonLabelActive]}>
                {r.label}
              </Text>
              {reason === r.id && (
                <Ionicons name="checkmark-circle" size={18} color={brand} style={{ marginLeft: 'auto' }} />
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Optional details */}
        <Text style={styles.sectionLabel}>Additional details (optional)</Text>
        <TextInput
          style={styles.detailsInput}
          value={details}
          onChangeText={setDetails}
          placeholder="Describe what happened…"
          placeholderTextColor={muted}
          multiline
          maxLength={500}
          textAlignVertical="top"
        />
        <Text style={styles.charCount}>{details.length}/500</Text>

        {/* Submit */}
        <TouchableOpacity
          style={[styles.submitBtn, !reason && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          activeOpacity={0.85}
          disabled={!reason || loading}
        >
          <Ionicons name="flag" size={16} color={white} style={{ marginRight: 6 }} />
          <Text style={styles.submitText}>{loading ? 'Submitting…' : 'Submit Report'}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.cancelLink}
          onPress={() => router.back()}
          activeOpacity={0.75}
        >
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: white,
    borderBottomWidth: 1, borderBottomColor: border,
  },
  backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: ink },

  content: { padding: 20, gap: 4, paddingBottom: 40 },
  intro: { fontSize: 14, color: muted, lineHeight: 20, marginBottom: 20 },
  sectionLabel: { fontSize: 14, fontWeight: '700', color: ink, marginBottom: 10, marginTop: 8 },

  reasonList: { gap: 8, marginBottom: 20 },
  reasonRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: white, borderRadius: 14,
    borderWidth: 1.5, borderColor: border,
    paddingHorizontal: 14, paddingVertical: 13,
  },
  reasonRowActive: { borderColor: brand, backgroundColor: '#FAFAFF' },
  reasonIcon: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: '#F3F4F6',
    alignItems: 'center', justifyContent: 'center',
  },
  reasonIconActive: { backgroundColor: '#EDE9FE' },
  reasonLabel: { fontSize: 14, color: ink },
  reasonLabelActive: { color: brand, fontWeight: '600' },

  detailsInput: {
    backgroundColor: white, borderRadius: 14,
    borderWidth: 1.5, borderColor: border,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14, color: ink,
    minHeight: 100,
    marginBottom: 4,
  },
  charCount: { fontSize: 11, color: muted, alignSelf: 'flex-end', marginBottom: 20 },

  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    height: 52, borderRadius: 26,
    backgroundColor: red,
    marginBottom: 12,
  },
  submitBtnDisabled: { opacity: 0.45 },
  submitText: { fontSize: 16, fontWeight: '700', color: white },
  cancelLink: { alignItems: 'center', paddingVertical: 8 },
  cancelText: { fontSize: 14, color: muted },
});
