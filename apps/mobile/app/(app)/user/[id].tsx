import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Dimensions,
  ScrollView, Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';

// ─── Static profile fallback data ────────────────────────────────────────────
const PROFILES = [
  {
    id: '1',
    name: 'Ananya',
    age: 22,
    photo: 'https://randomuser.me/api/portraits/women/44.jpg',
    mode: 'Night Out',
    distance: '300m away',
    verified: true,
    isOnline: true,
    bio: 'Coffee lover, adventure seeker, and music enthusiast. Always up for a good conversation!',
    emojis: '🌍🌊',
    interests: ['Music', 'Travel', 'Photography', 'Fitness', 'Food'],
    city: 'Mumbai, India',
  },
  {
    id: '2',
    name: 'Neha',
    age: 22,
    photo: 'https://randomuser.me/api/portraits/women/45.jpg',
    mode: 'Dating',
    distance: '220m away',
    verified: true,
    isOnline: true,
    bio: "Foodie & travel junkie 🌍 Let's explore together",
    emojis: '🎵✨',
    interests: ['Food', 'Travel', 'Movies', 'Cooking'],
    city: 'Delhi, India',
  },
  {
    id: '3',
    name: 'Rohan',
    age: 22,
    photo: 'https://randomuser.me/api/portraits/men/32.jpg',
    mode: 'Casual',
    distance: '330m away',
    verified: false,
    isOnline: false,
    bio: 'Cricket fan & music lover 🎵 Here for good times',
    emojis: '🏏🎵',
    interests: ['Cricket', 'Music', 'Movies', 'Gym'],
    city: 'Mumbai, India',
  },
  {
    id: '4',
    name: 'Karan',
    age: 24,
    photo: 'https://randomuser.me/api/portraits/men/33.jpg',
    mode: 'Co-Travel',
    distance: '180m away',
    verified: true,
    isOnline: true,
    bio: 'Adventure seeker ✈️ Currently exploring India solo',
    emojis: '✈️🏔️',
    interests: ['Travel', 'Hiking', 'Photography', 'Adventure'],
    city: 'Bangalore, India',
  },
];

const { height: SCREEN_H } = Dimensions.get('window');
const PHOTO_H = Math.round(SCREEN_H * 0.58);

// ─── Color tokens ─────────────────────────────────────────────────────────────
const ink     = '#1A1A2E';
const inkSec  = '#6B7280';
const brand   = '#7C3AED';
const brandSoft = '#EDE9FE';
const white   = '#FFFFFF';
const border  = '#E5E7EB';
const success = '#10B981';

export default function UserProfileScreen() {
  const insets  = useSafeAreaInsets();
  const router  = useRouter();
  const { id }  = useLocalSearchParams<{ id: string }>();
  const profile = PROFILES.find((p) => p.id === id) ?? PROFILES[0];
  const [liked, setLiked] = useState(false);

  function handleLike() {
    setLiked(true);
    Alert.alert('💜 Liked!', `You liked ${profile.name}`);
  }

  function handlePass() {
    router.back();
  }

  function handleSuperLike() {
    Alert.alert('⭐ Super Like!', `Sent to ${profile.name}`);
  }

  return (
    <View style={styles.root}>
      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        bounces={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
      >
        {/* ── Hero Photo ──────────────────────────────────────────────────── */}
        <View style={styles.photoWrap}>
          <Image
            source={{ uri: profile.photo }}
            style={styles.heroPhoto}
            contentFit="cover"
          />
          {/* Bottom gradient into white sheet */}
          <LinearGradient
            colors={['transparent', 'rgba(255,255,255,0.0)', 'rgba(255,255,255,0.6)', white]}
            locations={[0, 0.6, 0.82, 1]}
            style={StyleSheet.absoluteFillObject}
          />

          {/* Back button */}
          <TouchableOpacity
            style={[styles.topBtn, { top: insets.top + 8, left: 16 }]}
            onPress={() => router.back()}
            activeOpacity={0.8}
          >
            <BlurView intensity={40} tint="light" style={styles.blurBtn}>
              <Ionicons name="arrow-back" size={20} color={ink} />
            </BlurView>
          </TouchableOpacity>

          {/* More options */}
          <TouchableOpacity
            style={[styles.topBtn, { top: insets.top + 8, right: 16 }]}
            onPress={() =>
              Alert.alert(profile.name, 'More options', [
                { text: 'Report', style: 'destructive' },
                { text: 'Block', style: 'destructive' },
                { text: 'Cancel', style: 'cancel' },
              ])
            }
            activeOpacity={0.8}
          >
            <BlurView intensity={40} tint="light" style={styles.blurBtn}>
              <Ionicons name="ellipsis-horizontal" size={20} color={ink} />
            </BlurView>
          </TouchableOpacity>

          {/* Online badge */}
          {profile.isOnline && (
            <View style={[styles.onlineBadge, { top: insets.top + 58, right: 16 }]}>
              <View style={styles.onlineDot} />
              <Text style={styles.onlineText}>Online now</Text>
            </View>
          )}
        </View>

        {/* ── White Info Sheet ────────────────────────────────────────────── */}
        <View style={styles.sheet}>
          {/* Name + verified */}
          <View style={styles.nameRow}>
            <Text style={styles.nameText}>{profile.name}, {profile.age}</Text>
            {profile.verified && (
              <Ionicons name="checkmark-circle" size={20} color={brand} />
            )}
          </View>

          {/* Location + distance */}
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={13} color={inkSec} />
            <Text style={styles.locationText}>{profile.city}</Text>
            <Text style={styles.dot}> · </Text>
            <Text style={styles.distanceText}>{profile.distance}</Text>
          </View>

          {/* Bio */}
          <Text style={styles.bioText}>{profile.bio}</Text>

          {/* Emojis */}
          {profile.emojis ? (
            <Text style={styles.emojis}>{profile.emojis}</Text>
          ) : null}

          {/* Interests */}
          <Text style={styles.interestsLabel}>Interests</Text>
          <View style={styles.chipsWrap}>
            {profile.interests.map((tag) => (
              <View key={tag} style={styles.chip}>
                <Text style={styles.chipText}>{tag}</Text>
              </View>
            ))}
          </View>

          {/* ── Action buttons ─────────────────────────────────────────────── */}
          <View style={styles.actions}>
            {/* Pass (X) */}
            <TouchableOpacity style={styles.passBtn} onPress={handlePass} activeOpacity={0.8}>
              <Ionicons name="close" size={28} color="#6B7280" />
            </TouchableOpacity>

            {/* Super-like (star) */}
            <TouchableOpacity style={styles.superBtn} onPress={handleSuperLike} activeOpacity={0.8}>
              <Ionicons name="star" size={22} color="#F59E0B" />
            </TouchableOpacity>

            {/* Like (heart) — purple gradient */}
            <TouchableOpacity style={styles.likeWrap} onPress={handleLike} activeOpacity={0.85}>
              <LinearGradient
                colors={['#9333EA', '#7C3AED']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={styles.likeGradient}
              >
                <Ionicons name="heart" size={28} color={white} />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: white },

  // ── Photo ──────────────────────────────────────────────────────────────────
  photoWrap: { height: PHOTO_H, position: 'relative' },
  heroPhoto: { width: '100%', height: PHOTO_H },

  topBtn: { position: 'absolute', width: 40, height: 40, borderRadius: 20, overflow: 'hidden' },
  blurBtn: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.65)',
  },

  onlineBadge: {
    position: 'absolute',
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(255,255,255,0.88)',
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 12,
  },
  onlineDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: success },
  onlineText: { fontSize: 11, color: success, fontWeight: '700' },

  // ── Sheet ──────────────────────────────────────────────────────────────────
  sheet: {
    marginTop: -28,
    backgroundColor: white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 28,
  },

  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  nameText: { fontSize: 26, fontWeight: '800', color: ink },

  locationRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  locationText: { fontSize: 13, color: inkSec, marginLeft: 3 },
  dot: { fontSize: 13, color: inkSec },
  distanceText: { fontSize: 13, color: inkSec },

  bioText: {
    fontSize: 14, color: inkSec, lineHeight: 21,
    marginTop: 14,
  },
  emojis: { fontSize: 22, marginTop: 8 },

  interestsLabel: {
    fontSize: 13, fontWeight: '700', color: ink,
    marginTop: 20, marginBottom: 10,
  },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    backgroundColor: brandSoft,
    borderRadius: 9999,
    paddingHorizontal: 16, paddingVertical: 8,
  },
  chipText: { fontSize: 13, fontWeight: '500', color: brand },

  // ── Action buttons ─────────────────────────────────────────────────────────
  actions: {
    flexDirection: 'row',
    justifyContent: 'center', alignItems: 'center',
    gap: 20,
    marginTop: 32,
  },
  passBtn: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: white,
    borderWidth: 1.5, borderColor: border,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  superBtn: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: white,
    borderWidth: 1.5, borderColor: border,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  likeWrap: { width: 64, height: 64, borderRadius: 32, overflow: 'hidden' },
  likeGradient: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
