import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  StatusBar, Alert, Dimensions, Modal, ScrollView, Pressable,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeIn, useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { uploadPhoto } from '@/lib/uploadPhoto';
import { api } from '@/lib/api';
import { AVATARS } from '@/lib/avatars';

const { width: W } = Dimensions.get('window');
const GRID_GAP = 10;
const CELL_W = (W - 40 - GRID_GAP * 2) / 3;
const CELL_H = Math.round(CELL_W * 1.25);

// ─── Color tokens ─────────────────────────────────────────────────────────────
const ink     = '#1A1A2E';
const inkSec  = '#6B7280';
const white   = '#FFFFFF';
const brand   = '#7C3AED';
const brandSoft = '#EDE9FE';
const bgSec   = '#F9FAFB';
const border  = '#E5E7EB';
const gold    = '#C9A84C';
const goldSoft = '#FDF6E3';

const MIN_PHOTOS = 1;
const MAX_PHOTOS = 6;

const TIPS = [
  { emoji: '☀️', text: 'Use natural light for clear photos' },
  { emoji: '😊', text: 'Smile and be authentic' },
  { emoji: '✈️', text: 'Showcase your interests or travel' },
];


// ─── Photo cell ───────────────────────────────────────────────────────────────
function PhotoCell({
  photo,
  index,
  isHighlighted,
  onPress,
  onRemove,
}: {
  photo: string | null;
  index: number;
  isHighlighted: boolean;
  onPress: () => void;
  onRemove: () => void;
}) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  function handlePress() {
    scale.value = withSpring(0.93, { damping: 10 }, () => { scale.value = withSpring(1, { damping: 10 }); });
    onPress();
  }

  if (photo) {
    return (
      <Animated.View style={[styles.cell, animStyle]}>
        <Image source={{ uri: photo }} style={styles.cellImg} contentFit="cover" />
        <TouchableOpacity style={styles.removeBtn} onPress={onRemove} activeOpacity={0.8}>
          <Ionicons name="close" size={12} color={white} />
        </TouchableOpacity>
        {index === 0 && (
          <View style={styles.mainBadge}>
            <Text style={styles.mainBadgeText}>Main</Text>
          </View>
        )}
      </Animated.View>
    );
  }

  if (isHighlighted) {
    return (
      <TouchableOpacity onPress={handlePress} activeOpacity={0.88}>
        <LinearGradient
          colors={['#C9A84C', '#E8C97A']}
          style={[styles.cell, styles.cellHighlight]}
        >
          <Ionicons name="add" size={28} color={white} />
          <Text style={styles.addLabelGold}>Add Photo</Text>
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity style={[styles.cell, styles.cellEmpty]} onPress={handlePress} activeOpacity={0.8}>
      <Ionicons name="camera-outline" size={22} color={inkSec} />
      <Text style={styles.addLabel}>Add Photo</Text>
    </TouchableOpacity>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function PhotoUploadScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [photos, setPhotos] = useState<Array<string | null>>(Array(MAX_PHOTOS).fill(null));
  const [targetIndex, setTargetIndex] = useState<number | null>(null);
  const [sheet, setSheet] = useState<'menu' | 'avatars' | null>(null);

  const filledCount = photos.filter(Boolean).length;
  const canContinue = filledCount >= MIN_PHOTOS;

  function openChooser(index: number) {
    setTargetIndex(index);
    setSheet('menu');
  }
  function closeSheet() {
    setSheet(null);
    setTargetIndex(null);
  }

  // Choose a prebuilt avatar: set it locally and persist the URL like a photo.
  async function handlePickAvatar(url: string) {
    if (targetIndex === null) return;
    const idx = targetIndex;
    setPhotos((cur) => { const n = [...cur]; n[idx] = url; return n; });
    closeSheet();
    try {
      await api.post('/me/photos', { urls: [url] });
    } catch {
      /* keep the local selection; it'll be re-sent if the user re-picks */
    }
  }

  async function handleAddPhoto(index: number) {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow access to your photo library.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.85,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      // Optimistic local preview while the upload runs.
      setPhotos((cur) => { const n = [...cur]; n[index] = asset.uri; return n; });
      try {
        const cdnUrl = await uploadPhoto(asset.uri, asset.mimeType ?? 'image/jpeg');
        setPhotos((cur) => { const n = [...cur]; n[index] = cdnUrl; return n; });
      } catch {
        setPhotos((cur) => { const n = [...cur]; n[index] = null; return n; });
        Alert.alert('Upload failed', 'Could not upload that photo. Please try again.');
      }
    }
  }

  function handleRemove(index: number) {
    const next = [...photos];
    next[index] = null;
    setPhotos(next);
  }

  function getHighlightedIndex() {
    const firstEmpty = photos.findIndex((p) => p === null);
    return firstEmpty === -1 ? -1 : firstEmpty;
  }

  const highlightedIdx = getHighlightedIndex();

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor={white} />

      {/* Header */}
      <Animated.View entering={FadeInDown.delay(0).duration(300)} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.8}>
          <Ionicons name="chevron-back" size={22} color={ink} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Your Photos</Text>
        <TouchableOpacity onPress={() => router.push('/(tabs)/home' as any)} activeOpacity={0.8}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Title */}
      <Animated.View entering={FadeInDown.delay(60).duration(350)} style={styles.titleBlock}>
        <Text style={styles.title}>Show Your Best Self</Text>
        <Text style={styles.subtitle}>
          Add at least 1 photo or avatar to continue.{'\n'}More photos help you get noticed.
        </Text>
      </Animated.View>

      {/* Photo grid */}
      <Animated.View entering={FadeInDown.delay(120).duration(380)} style={styles.grid}>
        {photos.map((photo, i) => (
          <PhotoCell
            key={i}
            photo={photo}
            index={i}
            isHighlighted={i === highlightedIdx}
            onPress={() => openChooser(i)}
            onRemove={() => handleRemove(i)}
          />
        ))}
      </Animated.View>

      {/* Photo tips */}
      <Animated.View entering={FadeInDown.delay(180).duration(380)} style={styles.tipsBlock}>
        <Text style={styles.tipsLabel}>Photo Tips</Text>
        {TIPS.map((tip) => (
          <View key={tip.text} style={styles.tipRow}>
            <Text style={styles.tipEmoji}>{tip.emoji}</Text>
            <Text style={styles.tipText}>{tip.text}</Text>
          </View>
        ))}
      </Animated.View>

      {/* Continue */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity
          style={[styles.continueBtn, !canContinue && styles.continueBtnDisabled]}
          onPress={() => canContinue && router.push('/(tabs)/home' as any)}
          activeOpacity={0.88}
          disabled={!canContinue}
        >
          <LinearGradient
            colors={canContinue ? ['#9333EA', '#7C3AED'] : ['#D1D5DB', '#D1D5DB']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={styles.continueBtnInner}
          >
            <Text style={[styles.continueBtnText, !canContinue && styles.continueBtnTextDisabled]}>
              Continue
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* ── Add-photo chooser + avatar picker ─────────────────────────────── */}
      <Modal
        visible={sheet !== null}
        transparent
        animationType="slide"
        onRequestClose={closeSheet}
        statusBarTranslucent
      >
        <Pressable style={styles.modalBackdrop} onPress={closeSheet}>
          <Pressable style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]} onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetHandle} />

            {sheet === 'menu' && (
              <>
                <Text style={styles.sheetTitle}>Add a photo</Text>
                <Text style={styles.sheetSub}>Upload your own or pick a ready-made avatar</Text>

                <TouchableOpacity
                  style={styles.optionRow}
                  activeOpacity={0.85}
                  onPress={() => { const idx = targetIndex; setSheet(null); if (idx != null) handleAddPhoto(idx); }}
                >
                  <View style={[styles.optionIcon, { backgroundColor: brandSoft }]}>
                    <Ionicons name="image-outline" size={22} color={brand} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.optionTitle}>Upload Photo</Text>
                    <Text style={styles.optionDesc}>Choose from your library</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={inkSec} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.optionRow}
                  activeOpacity={0.85}
                  onPress={() => setSheet('avatars')}
                >
                  <View style={[styles.optionIcon, { backgroundColor: goldSoft }]}>
                    <Ionicons name="happy-outline" size={22} color={gold} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.optionTitle}>Choose Avatar</Text>
                    <Text style={styles.optionDesc}>Pick a prebuilt avatar</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={inkSec} />
                </TouchableOpacity>
              </>
            )}

            {sheet === 'avatars' && (
              <>
                <View style={styles.avatarHeader}>
                  <TouchableOpacity onPress={() => setSheet('menu')} hitSlop={8}>
                    <Ionicons name="chevron-back" size={22} color={ink} />
                  </TouchableOpacity>
                  <Text style={styles.sheetTitle}>Choose an avatar</Text>
                  <View style={{ width: 22 }} />
                </View>
                <ScrollView
                  contentContainerStyle={styles.avatarGrid}
                  showsVerticalScrollIndicator={false}
                >
                  {AVATARS.map((url) => (
                    <TouchableOpacity key={url} activeOpacity={0.8} onPress={() => handlePickAvatar(url)}>
                      <Image source={{ uri: url }} style={styles.avatarImg} contentFit="cover" transition={150} />
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: white },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 12,
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '600', color: ink },
  skipText: { fontSize: 15, color: brand, fontWeight: '500' },

  titleBlock: { paddingHorizontal: 20, marginBottom: 24 },
  title: { fontSize: 26, fontWeight: '800', color: ink, marginBottom: 8 },
  subtitle: { fontSize: 14, color: inkSec, lineHeight: 21 },

  grid: {
    flexDirection: 'row', flexWrap: 'wrap',
    gap: GRID_GAP, paddingHorizontal: 20,
    marginBottom: 24,
  },
  cell: {
    width: CELL_W, height: CELL_H,
    borderRadius: 14, overflow: 'hidden',
  },
  cellEmpty: {
    backgroundColor: bgSec,
    borderWidth: 1.5, borderColor: border,
    borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  cellHighlight: {
    alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  cellImg: { width: '100%', height: '100%' },

  addLabel: { fontSize: 11, color: inkSec, fontWeight: '500' },
  addLabelGold: { fontSize: 12, color: white, fontWeight: '700' },

  removeBtn: {
    position: 'absolute', top: 6, right: 6,
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center', justifyContent: 'center',
  },
  mainBadge: {
    position: 'absolute', bottom: 6, left: 6,
    backgroundColor: brand, borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  mainBadgeText: { fontSize: 10, color: white, fontWeight: '700' },

  tipsBlock: { paddingHorizontal: 20, gap: 10 },
  tipsLabel: { fontSize: 13, fontWeight: '700', color: ink, marginBottom: 4 },
  tipRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tipEmoji: { fontSize: 16 },
  tipText: { fontSize: 13, color: inkSec },

  footer: { paddingHorizontal: 20, paddingTop: 16 },
  continueBtn: { borderRadius: 9999, overflow: 'hidden' },
  continueBtnDisabled: { opacity: 0.5 },
  continueBtnInner: { height: 54, alignItems: 'center', justifyContent: 'center' },
  continueBtnText: { fontSize: 16, fontWeight: '700', color: white },
  continueBtnTextDisabled: { color: '#9CA3AF' },

  // ── Chooser / avatar sheet ──────────────────────────────────────────────
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 10,
    maxHeight: '80%',
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: border,
    marginBottom: 16,
  },
  sheetTitle: { fontSize: 18, fontWeight: '800', color: ink, textAlign: 'center' },
  sheetSub: { fontSize: 13, color: inkSec, textAlign: 'center', marginTop: 4, marginBottom: 16 },

  optionRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingVertical: 14, paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1, borderColor: border,
    marginBottom: 12,
  },
  optionIcon: {
    width: 44, height: 44, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  optionTitle: { fontSize: 15, fontWeight: '700', color: ink },
  optionDesc: { fontSize: 12, color: inkSec, marginTop: 2 },

  avatarHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 16,
  },
  avatarGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    gap: 14, justifyContent: 'center',
    paddingBottom: 8,
  },
  avatarImg: {
    width: (W - 40 - 14 * 2) / 3,
    height: (W - 40 - 14 * 2) / 3,
    borderRadius: 16,
    backgroundColor: bgSec,
  },
});
