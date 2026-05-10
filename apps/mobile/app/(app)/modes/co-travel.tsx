import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, StatusBar, TextInput, Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useRouter } from 'expo-router';

const { width: W } = Dimensions.get('window');
const TRIP_CARD_W = (W - 48) / 2;
const TRIP_CARD_H = Math.round(TRIP_CARD_W * 1.25);

// ─── Mock data ────────────────────────────────────────────────────────────────
const FEATURED_TRIPS = [
  {
    id: '1',
    destination: 'Bali, Indonesia',
    travelers: 45,
    photo: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=600&q=80',
  },
  {
    id: '2',
    destination: 'Paris, France',
    travelers: 62,
    photo: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=600&q=80',
  },
  {
    id: '3',
    destination: 'Swiss Alps, Switzerland',
    travelers: 31,
    photo: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&q=80',
  },
];

const TRAVEL_BUDDIES = [
  { id: '1', name: 'Alex, 28', city: '9 Paris',  photo: 'https://randomuser.me/api/portraits/men/32.jpg' },
  { id: '2', name: 'Maya, 26', city: '9 Paris',  photo: 'https://randomuser.me/api/portraits/women/44.jpg' },
  { id: '3', name: 'Liam, 30', city: '9 Tokyo',  photo: 'https://randomuser.me/api/portraits/men/33.jpg' },
  { id: '4', name: 'Sofia, 25', city: '9 Rome',  photo: 'https://randomuser.me/api/portraits/women/45.jpg' },
];

// ─── Color tokens ─────────────────────────────────────────────────────────────
const ink    = '#1A1A2E';
const inkSec = '#6B7280';
const white  = '#FFFFFF';
const brand  = '#7C3AED';
const bgSec  = '#F9FAFB';
const border = '#E5E7EB';
const success = '#10B981';

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function CoTravelScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [search, setSearch] = useState('');

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor={white} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 90 }}>

        {/* Header */}
        <Animated.View entering={FadeInDown.delay(0).duration(350)} style={styles.header}>
          <Text style={styles.title}>Co-Travel Mode</Text>
          <TouchableOpacity style={styles.profileBtn} activeOpacity={0.8}>
            <Ionicons name="person-circle-outline" size={28} color={inkSec} />
          </TouchableOpacity>
        </Animated.View>

        {/* Search */}
        <Animated.View entering={FadeInDown.delay(60).duration(350)} style={styles.searchBar}>
          <Ionicons name="search-outline" size={16} color={inkSec} />
          <TextInput
            style={styles.searchInput}
            placeholder="Where to next? Search destinations..."
            placeholderTextColor={inkSec}
            value={search}
            onChangeText={setSearch}
          />
        </Animated.View>

        {/* Featured Trips */}
        <Animated.View entering={FadeInDown.delay(100).duration(380)}>
          <Text style={styles.sectionTitle}>Featured Trips</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tripsRow}
          >
            {FEATURED_TRIPS.map((trip) => (
              <TouchableOpacity key={trip.id} style={styles.tripCard} activeOpacity={0.88}>
                <Image source={{ uri: trip.photo }} style={styles.tripPhoto} contentFit="cover" />
                <LinearGradient
                  colors={['transparent', 'rgba(0,0,0,0.75)']}
                  locations={[0.45, 1]}
                  style={StyleSheet.absoluteFillObject}
                />
                <View style={styles.tripInfo}>
                  <Text style={styles.tripDest}>{trip.destination}</Text>
                  <Text style={styles.tripTravelers}>{trip.travelers} travelers interested</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </Animated.View>

        {/* Find a Travel Buddy */}
        <Animated.View entering={FadeInDown.delay(160).duration(380)}>
          <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Find a Travel Buddy</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.buddiesRow}
          >
            {TRAVEL_BUDDIES.map((buddy) => (
              <TouchableOpacity
                key={buddy.id}
                style={styles.buddyCard}
                activeOpacity={0.85}
                onPress={() => router.push(`/(app)/user/${buddy.id}` as any)}
              >
                <Image source={{ uri: buddy.photo }} style={styles.buddyPhoto} contentFit="cover" />
                <Text style={styles.buddyName}>{buddy.name}</Text>
                <Text style={styles.buddyCity}>{buddy.city}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </Animated.View>

        {/* Upcoming event CTA */}
        <Animated.View entering={FadeInDown.delay(220).duration(380)} style={styles.eventCta}>
          <View style={styles.eventCtaLeft}>
            <Text style={styles.eventCtaLabel}>Upcoming Events</Text>
            <Text style={styles.eventCtaTitle}>Exclusive Travel Mixer in NYC</Text>
          </View>
          <TouchableOpacity style={styles.joinBtn} activeOpacity={0.85}>
            <LinearGradient
              colors={['#9333EA', '#7C3AED']}
              style={styles.joinBtnInner}
            >
              <Text style={styles.joinBtnText}>Join</Text>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: white },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 6,
  },
  title: { fontSize: 22, fontWeight: '800', color: ink },
  profileBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },

  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginHorizontal: 20, marginBottom: 20,
    paddingHorizontal: 14, paddingVertical: 12,
    backgroundColor: bgSec, borderRadius: 14,
    borderWidth: 1, borderColor: border,
  },
  searchInput: { flex: 1, fontSize: 14, color: ink },

  sectionTitle: { fontSize: 16, fontWeight: '700', color: ink, paddingHorizontal: 20, marginBottom: 12 },

  // Trips
  tripsRow: { paddingHorizontal: 20, gap: 12 },
  tripCard: {
    width: TRIP_CARD_W, height: TRIP_CARD_H,
    borderRadius: 18, overflow: 'hidden',
    backgroundColor: '#D1D5DB',
  },
  tripPhoto: { width: '100%', height: '100%' },
  tripInfo: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 12 },
  tripDest: { fontSize: 13, fontWeight: '700', color: white, marginBottom: 3 },
  tripTravelers: { fontSize: 11, color: 'rgba(255,255,255,0.75)' },

  // Buddies
  buddiesRow: { paddingHorizontal: 20, gap: 14 },
  buddyCard: { width: 74, alignItems: 'center' },
  buddyPhoto: {
    width: 68, height: 68, borderRadius: 34,
    backgroundColor: bgSec, marginBottom: 6,
  },
  buddyName: { fontSize: 11, fontWeight: '600', color: ink, textAlign: 'center' },
  buddyCity: { fontSize: 10, color: inkSec, textAlign: 'center' },

  // Event CTA
  eventCta: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 20, marginTop: 24,
    backgroundColor: bgSec,
    borderRadius: 16, padding: 14,
    borderWidth: 1, borderColor: border,
    gap: 12,
  },
  eventCtaLeft: { flex: 1 },
  eventCtaLabel: { fontSize: 11, fontWeight: '600', color: inkSec, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3 },
  eventCtaTitle: { fontSize: 14, fontWeight: '700', color: ink },
  joinBtn: { borderRadius: 9999, overflow: 'hidden' },
  joinBtnInner: { paddingHorizontal: 16, paddingVertical: 9 },
  joinBtnText: { fontSize: 13, fontWeight: '700', color: white },
});
