import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  FlatList, StatusBar, Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useRouter } from 'expo-router';

const { width: W } = Dimensions.get('window');
const CARD_H = Math.round(W * 0.52);

// ─── Mock event data ──────────────────────────────────────────────────────────
const EVENTS = [
  {
    id: '1',
    name: 'Apex Lounge Grand Opening',
    date: 'Sat, Nov 18 · 10 PM',
    venue: 'SoHo, NYC',
    photo: 'https://images.unsplash.com/photo-1574391884720-bbc3740c59d1?w=800&q=80',
    friendsGoing: 4,
    friendPhotos: [
      'https://randomuser.me/api/portraits/women/44.jpg',
      'https://randomuser.me/api/portraits/men/32.jpg',
      'https://randomuser.me/api/portraits/women/45.jpg',
    ],
    action: 'Join Guestlist',
    actionStyle: 'primary',
  },
  {
    id: '2',
    name: 'Midnight Masquerade',
    date: 'Fri, Dec 1 · 9 PM',
    venue: 'The Pierre, NYC',
    photo: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&q=80',
    friendsGoing: 2,
    friendPhotos: [
      'https://randomuser.me/api/portraits/women/46.jpg',
      'https://randomuser.me/api/portraits/men/33.jpg',
    ],
    action: 'Book Tickets',
    actionStyle: 'gold',
  },
  {
    id: '3',
    name: 'Neon Jungle Rave',
    date: 'Sat, Dec 9 · 11 PM',
    venue: 'Warehouse 5, Brooklyn',
    photo: 'https://images.unsplash.com/photo-1578736641330-3155e606cd40?w=800&q=80',
    friendsGoing: 7,
    friendPhotos: [
      'https://randomuser.me/api/portraits/men/34.jpg',
      'https://randomuser.me/api/portraits/women/47.jpg',
      'https://randomuser.me/api/portraits/men/35.jpg',
    ],
    action: 'Join Guestlist',
    actionStyle: 'primary',
  },
];

// ─── Color tokens ─────────────────────────────────────────────────────────────
const darkBg   = '#0A0A1A';
const darkCard = '#1A1633';
const white    = '#FFFFFF';
const brand    = '#7C3AED';
const gold     = '#C9A84C';

// ─── Event card ───────────────────────────────────────────────────────────────
function EventCard({ event, delay, onPress }: { event: typeof EVENTS[0]; delay: number; onPress: () => void }) {
  return (
    <Animated.View entering={FadeInDown.delay(delay).duration(380)}>
      <TouchableOpacity style={styles.card} activeOpacity={0.9} onPress={onPress}>
        {/* Photo */}
        <View style={styles.photoWrap}>
          <Image source={{ uri: event.photo }} style={styles.photo} contentFit="cover" />
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.85)']}
            locations={[0.3, 1]}
            style={StyleSheet.absoluteFillObject}
          />
          {/* Event name on photo */}
          <View style={styles.photoOverlay}>
            <Text style={styles.eventName}>{event.name}</Text>
          </View>
        </View>

        {/* Info */}
        <View style={styles.infoRow}>
          <View style={{ flex: 1 }}>
            <View style={styles.dateRow}>
              <Ionicons name="calendar-outline" size={13} color="rgba(255,255,255,0.6)" />
              <Text style={styles.dateText}>{event.date}</Text>
            </View>
            <View style={styles.venueRow}>
              <Ionicons name="location-outline" size={13} color="rgba(255,255,255,0.6)" />
              <Text style={styles.venueText}>{event.venue}</Text>
            </View>
          </View>

          {/* Friends going */}
          <View style={styles.friendsWrap}>
            <View style={styles.friendAvatars}>
              {event.friendPhotos.slice(0, 3).map((p, i) => (
                <Image
                  key={i}
                  source={{ uri: p }}
                  style={[styles.friendAvatar, { marginLeft: i === 0 ? 0 : -8, zIndex: 3 - i }]}
                  contentFit="cover"
                />
              ))}
            </View>
            <Text style={styles.friendsText}>Friends Going</Text>
          </View>
        </View>

        {/* CTA button */}
        <TouchableOpacity
          style={event.actionStyle === 'gold' ? styles.goldBtn : styles.primaryBtn}
          activeOpacity={0.85}
          onPress={onPress}
        >
          {event.actionStyle === 'gold' ? (
            <LinearGradient
              colors={['#C9A84C', '#F5E3A0', '#C9A84C']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={styles.goldBtnInner}
            >
              <Text style={styles.goldBtnText}>{event.action}</Text>
            </LinearGradient>
          ) : (
            <LinearGradient
              colors={['#9333EA', '#7C3AED']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={styles.primaryBtnInner}
            >
              <Text style={styles.primaryBtnText}>{event.action}</Text>
            </LinearGradient>
          )}
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function NightlifeEventsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor={darkBg} />

      {/* Header */}
      <Animated.View entering={FadeInDown.delay(0).duration(350)} style={styles.header}>
        <Text style={styles.title}>Nightlife Events</Text>
        <TouchableOpacity style={styles.filterBtn} activeOpacity={0.75}>
          <Ionicons name="options-outline" size={20} color={white} />
        </TouchableOpacity>
      </Animated.View>

      <FlatList
        data={EVENTS}
        keyExtractor={(e) => e.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 100 }]}
        renderItem={({ item, index }) => (
          <EventCard
            event={item}
            delay={index * 100 + 60}
            onPress={() => router.push(`/(app)/checkout` as any)}
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

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8,
  },
  title: { fontSize: 24, fontWeight: '800', color: white },
  filterBtn: {
    width: 38, height: 38, borderRadius: 19,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },

  list: { paddingHorizontal: 20, paddingTop: 8 },

  card: {
    borderRadius: 20, overflow: 'hidden',
    backgroundColor: '#1A1633',
  },
  photoWrap: { height: CARD_H, position: 'relative' },
  photo: { width: '100%', height: CARD_H },
  photoOverlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0, padding: 14,
  },
  eventName: { fontSize: 18, fontWeight: '800', color: white },

  infoRow: {
    flexDirection: 'row', alignItems: 'center',
    padding: 14, paddingBottom: 10,
  },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 4 },
  dateText: { fontSize: 13, color: 'rgba(255,255,255,0.7)' },
  venueRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  venueText: { fontSize: 13, color: 'rgba(255,255,255,0.7)' },

  friendsWrap: { alignItems: 'flex-end' },
  friendAvatars: { flexDirection: 'row', marginBottom: 4 },
  friendAvatar: {
    width: 24, height: 24, borderRadius: 12,
    borderWidth: 1.5, borderColor: '#1A1633',
    backgroundColor: '#333',
  },
  friendsText: { fontSize: 10, color: 'rgba(255,255,255,0.5)' },

  primaryBtn: { marginHorizontal: 14, marginBottom: 14, borderRadius: 9999, overflow: 'hidden' },
  primaryBtnInner: { height: 46, alignItems: 'center', justifyContent: 'center' },
  primaryBtnText: { fontSize: 15, fontWeight: '700', color: white },

  goldBtn: { marginHorizontal: 14, marginBottom: 14, borderRadius: 9999, overflow: 'hidden' },
  goldBtnInner: { height: 46, alignItems: 'center', justifyContent: 'center' },
  goldBtnText: { fontSize: 15, fontWeight: '700', color: '#7A5B10' },
});
