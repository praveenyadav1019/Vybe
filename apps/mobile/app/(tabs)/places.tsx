import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, FlatList,
  StatusBar, ScrollView, Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useRouter } from 'expo-router';

const { width: W } = Dimensions.get('window');
const CARD_H = Math.round(W * 0.56);  // 16:9ish card photo

// ─── Mock venues data ─────────────────────────────────────────────────────────
const FILTER_CHIPS = ['All', 'Rooftop', 'Jazz', 'Dance', 'Cocktail Bar', 'Members Only'];

const VENUES = [
  {
    id: '1',
    name: 'The Gilded Lounge',
    category: 'Cocktail Bar',
    rating: 4.5,
    checkins: 125,
    trending: true,
    photo: 'https://images.unsplash.com/photo-1614267861476-0d129972a0f4?w=800&q=80',
    tags: ['Rooftop', 'Cocktail Bar'],
    price: '$$$',
    distance: '0.8 km',
  },
  {
    id: '2',
    name: 'Blue Note Society',
    category: 'Jazz Club',
    rating: 4.8,
    checkins: 98,
    trending: true,
    photo: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&q=80',
    tags: ['Jazz', 'Members Only'],
    price: '$$$$',
    distance: '1.2 km',
  },
  {
    id: '3',
    name: 'Aura Nightclub',
    category: 'Dance Club',
    rating: 4.7,
    checkins: 210,
    trending: true,
    photo: 'https://images.unsplash.com/photo-1575444758702-4a6b9222336e?w=800&q=80',
    tags: ['Dance', 'Night Out'],
    price: '$$$',
    distance: '0.5 km',
  },
  {
    id: '4',
    name: 'Skyline Rooftop Bar',
    category: 'Rooftop Bar',
    rating: 4.6,
    checkins: 156,
    trending: false,
    photo: 'https://images.unsplash.com/photo-1551632436-cbf8dd35adfa?w=800&q=80',
    tags: ['Rooftop', 'Cocktail Bar'],
    price: '$$$',
    distance: '1.5 km',
  },
];

// ─── Color tokens ─────────────────────────────────────────────────────────────
const darkBg   = '#0A0A1A';
const darkCard = '#1A1633';
const white    = '#FFFFFF';
const brand    = '#7C3AED';
const gold     = '#C9A84C';
const success  = '#10B981';

// ─── Venue card ───────────────────────────────────────────────────────────────
function VenueCard({
  venue, onPress, delay,
}: { venue: typeof VENUES[0]; onPress: () => void; delay: number }) {
  return (
    <Animated.View entering={FadeInDown.delay(delay).duration(380)}>
      <TouchableOpacity style={styles.venueCard} activeOpacity={0.88} onPress={onPress}>
        {/* Photo */}
        <View style={styles.venuePhotoWrap}>
          <Image
            source={{ uri: venue.photo }}
            style={styles.venuePhoto}
            contentFit="cover"
          />
          {/* Photo gradient */}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.7)']}
            locations={[0.4, 1]}
            style={StyleSheet.absoluteFillObject}
          />

          {/* Trending badge */}
          {venue.trending && (
            <View style={styles.trendingBadge}>
              <Ionicons name="flame" size={11} color={white} />
              <Text style={styles.trendingText}>Trending Now</Text>
            </View>
          )}

          {/* Rating */}
          <View style={styles.ratingBadge}>
            <Ionicons name="star" size={11} color={gold} />
            <Text style={styles.ratingText}> {venue.rating.toFixed(1)}</Text>
          </View>
        </View>

        {/* Info */}
        <View style={styles.venueInfo}>
          <View style={styles.venueRow}>
            <Text style={styles.venueName}>{venue.name}</Text>
            <Text style={styles.venuePrice}>{venue.price}</Text>
          </View>
          <View style={styles.venueMetaRow}>
            <Ionicons name="person" size={12} color="rgba(255,255,255,0.55)" />
            <Text style={styles.venueCheckins}> {venue.checkins} Vybers checked in</Text>
            <Text style={styles.venueDot}> · </Text>
            <Ionicons name="location-outline" size={12} color="rgba(255,255,255,0.55)" />
            <Text style={styles.venueCheckins}> {venue.distance}</Text>
          </View>
          {/* Tags */}
          <View style={styles.tagsRow}>
            {venue.tags.map((tag) => (
              <View key={tag} style={styles.tag}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function VenuesScreen() {
  const insets  = useSafeAreaInsets();
  const router  = useRouter();
  const [activeFilter, setActiveFilter] = useState('All');

  const filtered = activeFilter === 'All'
    ? VENUES
    : VENUES.filter((v) => v.tags.includes(activeFilter));

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor={darkBg} />

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <Animated.View entering={FadeInDown.delay(0).duration(350)} style={styles.header}>
        <Text style={styles.title}>Premium Venues Guide</Text>
        <TouchableOpacity style={styles.headerIconBtn} activeOpacity={0.75}>
          <Ionicons name="options-outline" size={22} color={white} />
        </TouchableOpacity>
      </Animated.View>

      {/* ── Filter chips ────────────────────────────────────────────────── */}
      <Animated.View entering={FadeInDown.delay(60).duration(350)}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersRow}
        >
          {FILTER_CHIPS.map((chip) => (
            <TouchableOpacity
              key={chip}
              style={[styles.chip, activeFilter === chip && styles.chipActive]}
              onPress={() => setActiveFilter(chip)}
              activeOpacity={0.8}
            >
              <Text style={[styles.chipText, activeFilter === chip && styles.chipTextActive]}>
                {chip}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </Animated.View>

      {/* ── Venue list ──────────────────────────────────────────────────── */}
      <FlatList
        data={filtered}
        keyExtractor={(v) => v.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 90 }]}
        renderItem={({ item, index }) => (
          <VenueCard
            venue={item}
            delay={index * 80 + 120}
            onPress={() => router.push(`/(app)/places/${item.id}` as any)}
          />
        )}
        ItemSeparatorComponent={() => <View style={{ height: 16 }} />}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: darkBg },

  // ── Header ─────────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 6,
  },
  title: { fontSize: 20, fontWeight: '700', color: white },
  headerIconBtn: {
    width: 38, height: 38, borderRadius: 19,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },

  // ── Filter chips ────────────────────────────────────────────────────────────
  filtersRow: { paddingHorizontal: 20, gap: 8, paddingBottom: 12 },
  chip: {
    paddingHorizontal: 16, paddingVertical: 7,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  chipActive: {
    backgroundColor: brand,
    borderColor: brand,
  },
  chipText: { fontSize: 13, color: 'rgba(255,255,255,0.6)', fontWeight: '500' },
  chipTextActive: { color: white, fontWeight: '600' },

  // ── List ────────────────────────────────────────────────────────────────────
  list: { paddingHorizontal: 20, paddingTop: 4 },

  // ── Venue card ──────────────────────────────────────────────────────────────
  venueCard: {
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: darkCard,
  },
  venuePhotoWrap: { height: CARD_H, position: 'relative' },
  venuePhoto: { width: '100%', height: CARD_H },
  trendingBadge: {
    position: 'absolute', top: 12, right: 12,
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#F59E0B',
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 9999,
  },
  trendingText: { fontSize: 11, fontWeight: '700', color: white },
  ratingBadge: {
    position: 'absolute', bottom: 12, left: 12,
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: 9999,
  },
  ratingText: { fontSize: 13, fontWeight: '700', color: gold },

  // Info section
  venueInfo: { padding: 16 },
  venueRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 },
  venueName: { fontSize: 16, fontWeight: '700', color: white, flex: 1, marginRight: 8 },
  venuePrice: { fontSize: 13, color: gold, fontWeight: '600' },
  venueMetaRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  venueCheckins: { fontSize: 12, color: 'rgba(255,255,255,0.55)' },
  venueDot: { fontSize: 12, color: 'rgba(255,255,255,0.3)' },
  tagsRow: { flexDirection: 'row', gap: 6 },
  tag: {
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 9999,
    backgroundColor: 'rgba(124,58,237,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(124,58,237,0.4)',
  },
  tagText: { fontSize: 11, color: '#A78BFA', fontWeight: '500' },
});
