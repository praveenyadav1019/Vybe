import React, { useRef, useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  StatusBar, Switch, ScrollView, PanResponder, Animated as RNAnimated,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useRouter } from 'expo-router';

// ─── Color tokens ─────────────────────────────────────────────────────────────
const ink    = '#1A1A2E';
const inkSec = '#6B7280';
const white  = '#FFFFFF';
const brand  = '#7C3AED';
const bgSec  = 'rgba(255,255,255,0.08)';
const border = 'rgba(255,255,255,0.12)';

const MODES = [
  { key: 'dating',     label: 'Dating' },
  { key: 'friends',    label: 'Friends' },
  { key: 'networking', label: 'Networking' },
  { key: 'nightlife',  label: 'Travel & Nightlife' },
];

const INTEREST_CHIPS = ['Food & Drink', 'Outdoors', 'Art & Culture', 'Music', 'Sports', 'Tech'];

// ─── Custom Slider ────────────────────────────────────────────────────────────

function CustomSlider({
  min, max, value, onChange,
}: { min: number; max: number; value: number; onChange: (v: number) => void }) {
  const trackWidth = useRef(0);
  const currentValue = useRef(value);

  const thumbX = useRef(new RNAnimated.Value(0)).current;

  const getThumbX = useCallback((v: number, width: number) => {
    if (width === 0) return 0;
    return ((v - min) / (max - min)) * width;
  }, [min, max]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        const locationX = evt.nativeEvent.locationX;
        const width = trackWidth.current;
        if (width === 0) return;
        const ratio = Math.max(0, Math.min(1, locationX / width));
        const newVal = Math.round(min + ratio * (max - min));
        currentValue.current = newVal;
        thumbX.setValue(ratio * width);
        onChange(newVal);
      },
      onPanResponderMove: (evt) => {
        const locationX = evt.nativeEvent.locationX;
        const width = trackWidth.current;
        if (width === 0) return;
        const ratio = Math.max(0, Math.min(1, locationX / width));
        const newVal = Math.round(min + ratio * (max - min));
        currentValue.current = newVal;
        thumbX.setValue(ratio * width);
        onChange(newVal);
      },
    })
  ).current;

  return (
    <View
      style={styles.sliderTrack}
      onLayout={(e) => {
        const w = e.nativeEvent.layout.width;
        trackWidth.current = w;
        thumbX.setValue(getThumbX(value, w));
      }}
      {...panResponder.panHandlers}
    >
      <View style={StyleSheet.absoluteFillObject}>
        <RNAnimated.View
          style={[
            styles.sliderFill,
            { width: thumbX },
          ]}
        />
      </View>
      <RNAnimated.View
        style={[
          styles.sliderThumb,
          { transform: [{ translateX: RNAnimated.subtract(thumbX, 10) }] },
        ]}
      />
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function FiltersScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [ageMin, setAgeMin] = useState(24);
  const [ageMax, setAgeMax] = useState(45);
  const [distanceMi, setDistanceMi] = useState(50);
  const [modes, setModes] = useState<Record<string, boolean>>({
    dating: true, friends: false, networking: false, nightlife: false,
  });
  const [interests, setInterests] = useState<Set<string>>(new Set(['Food & Drink']));

  function toggleMode(key: string) {
    setModes((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function toggleInterest(tag: string) {
    setInterests((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) next.delete(tag); else next.add(tag);
      return next;
    });
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <BlurView intensity={55} tint="dark" style={StyleSheet.absoluteFillObject} />

      <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
        {/* Header */}
        <Animated.View entering={FadeInDown.delay(0).duration(300)} style={styles.header}>
          <Text style={styles.headerTitle}>Filters</Text>
          <TouchableOpacity onPress={() => router.back()} style={styles.cancelBtn} activeOpacity={0.8}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </Animated.View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 80 }}>
          {/* Age Range */}
          <Animated.View entering={FadeInDown.delay(60).duration(320)} style={styles.section}>
            <View style={styles.sectionRow}>
              <Text style={styles.sectionLabel}>AGE RANGE</Text>
              <Text style={styles.rangeValue}>{ageMin} — {ageMax}</Text>
            </View>
            <CustomSlider min={18} max={65} value={ageMin} onChange={setAgeMin} />
          </Animated.View>

          {/* Distance */}
          <Animated.View entering={FadeInDown.delay(100).duration(320)} style={styles.section}>
            <View style={styles.sectionRow}>
              <Text style={styles.sectionLabel}>DISTANCE</Text>
              <Text style={styles.rangeValue}>up to {distanceMi} mi</Text>
            </View>
            <CustomSlider min={1} max={100} value={distanceMi} onChange={setDistanceMi} />
          </Animated.View>

          {/* Modes */}
          <Animated.View entering={FadeInDown.delay(140).duration(320)} style={styles.section}>
            <Text style={styles.sectionLabel}>MODES</Text>
            {MODES.map((mode) => (
              <View key={mode.key} style={styles.toggleRow}>
                <Text style={styles.toggleLabel}>{mode.label}</Text>
                <Switch
                  value={modes[mode.key] ?? false}
                  onValueChange={() => toggleMode(mode.key)}
                  trackColor={{ false: 'rgba(255,255,255,0.2)', true: brand }}
                  thumbColor={white}
                />
              </View>
            ))}
          </Animated.View>

          {/* Interests */}
          <Animated.View entering={FadeInDown.delay(180).duration(320)} style={styles.section}>
            <Text style={styles.sectionLabel}>INTERESTS</Text>
            <View style={styles.chipsWrap}>
              {INTEREST_CHIPS.map((chip) => (
                <TouchableOpacity
                  key={chip}
                  style={[styles.chip, interests.has(chip) && styles.chipActive]}
                  onPress={() => toggleInterest(chip)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.chipText, interests.has(chip) && styles.chipTextActive]}>
                    {chip}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </Animated.View>
        </ScrollView>

        {/* Apply */}
        <View style={styles.applyWrap}>
          <TouchableOpacity
            style={styles.applyBtn}
            onPress={() => router.back()}
            activeOpacity={0.88}
          >
            <LinearGradient
              colors={['#9333EA', '#7C3AED']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={styles.applyBtnInner}
            >
              <Text style={styles.applyBtnText}>Apply Filters</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },

  sheet: {
    backgroundColor: 'rgba(15,12,35,0.92)',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingTop: 8,
    maxHeight: '88%',
  },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 20, paddingVertical: 14,
    position: 'relative',
  },
  headerTitle: { fontSize: 16, fontWeight: '700', color: white },
  cancelBtn: { position: 'absolute', right: 20 },
  cancelText: { fontSize: 15, color: brand, fontWeight: '500' },

  section: {
    paddingHorizontal: 20, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: border,
  },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.5)',
    letterSpacing: 0.8, textTransform: 'uppercase',
  },
  rangeValue: { fontSize: 14, fontWeight: '600', color: white },

  // Custom slider
  sliderTrack: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 2,
    marginVertical: 10,
    position: 'relative',
  },
  sliderFill: {
    height: 4,
    backgroundColor: brand,
    borderRadius: 2,
  },
  sliderThumb: {
    position: 'absolute',
    top: -8,
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: white,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },

  toggleRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 10,
  },
  toggleLabel: { fontSize: 15, color: white },

  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 9999,
    backgroundColor: bgSec,
    borderWidth: 1, borderColor: border,
  },
  chipActive: { backgroundColor: brand, borderColor: brand },
  chipText: { fontSize: 13, color: 'rgba(255,255,255,0.7)', fontWeight: '500' },
  chipTextActive: { color: white, fontWeight: '600' },

  applyWrap: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16,
    backgroundColor: 'rgba(15,12,35,0.98)',
  },
  applyBtn: { borderRadius: 9999, overflow: 'hidden' },
  applyBtnInner: { height: 52, alignItems: 'center', justifyContent: 'center' },
  applyBtnText: { fontSize: 16, fontWeight: '700', color: white },
});
