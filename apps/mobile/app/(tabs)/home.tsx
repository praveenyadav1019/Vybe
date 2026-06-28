import React, { useEffect } from 'react';
import {
  View, Text, ScrollView, FlatList, TouchableOpacity,
  StyleSheet, StatusBar, ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  FadeInDown, useSharedValue, useAnimatedStyle, withRepeat,
  withTiming, withSequence,
} from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../../src/stores/authStore';
import { useDiscoveryStore } from '../../src/stores/discoveryStore';
import { useLocationStore } from '../../src/stores/locationStore';
import { NearbyUser } from '../../src/types';

// ─── Design tokens (clean & minimal) ─────────────────────────────────────────────
const ink     = '#111827';
const brand   = '#7C3AED';
const pink     = '#7C3AED';
const accent  = '#7C3AED';
const coral    = '#7C3AED';
const inkSec  = '#6B7280';
const muted   = '#9CA3AF';
const white   = '#FFFFFF';
const bg      = '#FFFFFF';
const success = '#22C55E';
const warn    = '#F59E0B';

// ─── Live pulse dot ────────────────────────────────────────────────────────────
function PulseDot({ color = success }: { color?: string }) {
  const scale   = useSharedValue(1);
  const opacity = useSharedValue(0.85);
  useEffect(() => {
    scale.value   = withRepeat(withSequence(withTiming(1.5, { duration: 700 }), withTiming(1, { duration: 700 })), -1);
    opacity.value = withRepeat(withSequence(withTiming(0.3, { duration: 700 }), withTiming(0.85, { duration: 700 })), -1);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }], opacity: opacity.value }));
  return <Animated.View style={[styles.pulseDot, { backgroundColor: color }, style]} />;
}

// ─── Section header ────────────────────────────────────────────────────────────
function SectionHeader({
  title, subtitle, onSeeAll, live, icon,
}: {
  title: string; subtitle?: string; onSeeAll?: () => void;
  live?: boolean; icon?: string;
}) {
  return (
    <View style={styles.sectionHeader}>
      <View style={{ gap: 2 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {icon && <Ionicons name={icon as any} size={16} color={brand} />}
          {live && <PulseDot />}
          <Text style={styles.sectionTitle}>{title}</Text>
        </View>
        {subtitle && <Text style={styles.sectionSub}>{subtitle}</Text>}
      </View>
      {onSeeAll && (
        <TouchableOpacity onPress={onSeeAll} activeOpacity={0.7} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.seeAll}>See All</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─── Connection bubble ─────────────────────────────────────────────────────────
function ConnectionBubble({
  name, photo, isOnline, onPress,
}: { name: string; photo?: string | null; isOnline: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.connItem} onPress={onPress} activeOpacity={0.82}>
      <View style={styles.connAvatarWrap}>
        {photo ? (
          <Image source={{ uri: photo }} style={styles.connAvatar} contentFit="cover" />
        ) : (
          <View style={[styles.connAvatar, styles.connAvatarFallback]}>
            <Ionicons name="person" size={20} color={brand} />
          </View>
        )}
        {isOnline && <View style={styles.connOnlineDot} />}
      </View>
      <Text style={styles.connName} numberOfLines={1}>{name.split(' ')[0]}</Text>
    </TouchableOpacity>
  );
}

// ─── Nearby person card ────────────────────────────────────────────────────────
function PersonCard({ person, onPress }: { person: NearbyUser; onPress: () => void }) {
  const photo = person.photos?.[0];
  return (
    <TouchableOpacity style={styles.personCard} activeOpacity={0.88} onPress={onPress}>
      {photo ? (
        <Image source={{ uri: photo }} style={StyleSheet.absoluteFillObject} contentFit="cover" />
      ) : (
        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: '#E9E0FF', alignItems: 'center', justifyContent: 'center' }]}>
          <Ionicons name="person" size={36} color={brand} />
        </View>
      )}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.75)']}
        locations={[0.45, 1]}
        style={StyleSheet.absoluteFillObject}
      />
      {person.isOnline && <View style={styles.personOnlineDot} />}
      <View style={styles.personInfo}>
        <Text style={styles.personName} numberOfLines={1}>{person.name}, {person.age}</Text>
        <Text style={styles.personDist} numberOfLines={1}>{person.distance}</Text>
      </View>
    </TouchableOpacity>
  );
}

// ─── Main screen ───────────────────────────────────────────────────────────────
export default function HomeScreen() {
  const router  = useRouter();
  const insets  = useSafeAreaInsets();
  const user    = useAuthStore((s) => s.user);
  const firstName = (user?.name ?? 'there').split(' ')[0];

  const nearbyUsers = useDiscoveryStore((s) => s.nearbyUsers);
  const lat = useLocationStore((s) => s.latitude);
  const lng = useLocationStore((s) => s.longitude);
  const city = useLocationStore((s) => s.city);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  // Mock connections (replaced by real API data when backend is live)
  const mockConnections = [
    { id: '1', name: 'Priya S', photo: null, isOnline: true },
    { id: '2', name: 'Arjun K', photo: null, isOnline: true },
    { id: '3', name: 'Nisha M', photo: null, isOnline: false },
    { id: '4', name: 'Rahul V', photo: null, isOnline: true },
    { id: '5', name: 'Sneha D', photo: null, isOnline: false },
  ];

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor={white} />
      <ScrollView
        style={styles.root}
        contentContainerStyle={{ paddingBottom: 100 + insets.bottom }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <Animated.View
          entering={FadeInDown.delay(0).duration(350)}
          style={[styles.header, { paddingTop: insets.top + 12 }]}
        >
          <TouchableOpacity
            style={styles.headerAvatar}
            onPress={() => router.push('/(tabs)/profile' as any)}
            activeOpacity={0.85}
          >
            {user?.photos?.[0] ? (
              <Image source={{ uri: user.photos[0] }} style={styles.headerAvatarImg} contentFit="cover" />
            ) : (
              <Ionicons name="person" size={18} color={brand} />
            )}
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.greeting}>{greeting},</Text>
            <Text style={styles.greetingName}>{firstName}</Text>
            {city ? (
              <View style={styles.locationRow}>
                <Ionicons name="location" size={11} color={brand} />
                <Text style={styles.locationText}>{city}</Text>
              </View>
            ) : null}
          </View>
          <View style={styles.headerIcons}>
            <TouchableOpacity style={styles.iconBtn} onPress={() => router.push('/(app)/nearby' as any)} activeOpacity={0.75}>
              <Ionicons name="search-outline" size={21} color={ink} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconBtn} onPress={() => router.push('/(app)/notifications' as any)} activeOpacity={0.75}>
              <Ionicons name="notifications-outline" size={21} color={ink} />
              <View style={styles.notifBadge} />
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* ── Connections ─────────────────────────────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(50).duration(350)} style={styles.section}>
          <SectionHeader
            title="Connections"
            icon="people"
            onSeeAll={() => router.push('/(app)/connections' as any)}
          />
          <FlatList
            data={mockConnections}
            horizontal
            keyExtractor={(c) => c.id}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.connRow}
            renderItem={({ item }) => (
              <ConnectionBubble
                name={item.name}
                photo={item.photo}
                isOnline={item.isOnline}
                onPress={() => router.push(`/(app)/user/${item.id}` as any)}
              />
            )}
            ListEmptyComponent={
              <View style={styles.emptyInline}>
                <Text style={styles.emptyInlineText}>Meet people to see them here</Text>
              </View>
            }
          />
        </Animated.View>

        {/* ── Nearby People ────────────────────────────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(200).duration(350)} style={styles.section}>
          <SectionHeader
            title="Nearby People"
            live
            onSeeAll={() => router.push('/(app)/nearby' as any)}
          />
          <FlatList
            data={nearbyUsers.slice(0, 8)}
            horizontal
            keyExtractor={(u) => u.id}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.rowPadded}
            renderItem={({ item }) => (
              <PersonCard
                person={item}
                onPress={() => router.push(`/(app)/user/${item.id}` as any)}
              />
            )}
            ListEmptyComponent={
              <View style={styles.emptyInline}>
                <Text style={styles.emptyInlineText}>Enable location to see nearby people</Text>
              </View>
            }
          />
        </Animated.View>
      </ScrollView>
    </>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const VENUE_W  = 170;
const VENUE_H  = 240;
const PARTY_W  = 250;
const PARTY_H  = 320;
const PERSON_W = 128;
const PERSON_H = 170;
const CONN_AVT = 52;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: white },

  // ── Header
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingBottom: 10,
    backgroundColor: white, gap: 10,
  },
  headerAvatar: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: '#F3F4F6',
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  headerAvatarImg: { width: 38, height: 38 },
  headerCenter: { flex: 1 },
  greeting: { fontSize: 12, fontWeight: '400', color: inkSec },
  greetingName: { fontSize: 18, fontWeight: '700', color: ink, marginTop: 0 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 1 },
  locationText: { fontSize: 11, color: brand, fontWeight: '500' },
  headerIcons: { flexDirection: 'row', gap: 4 },
  iconBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  notifBadge: {
    position: 'absolute', top: 8, right: 8,
    width: 7, height: 7, borderRadius: 4,
    backgroundColor: '#EF4444', borderWidth: 1.5, borderColor: white,
  },

  // ── Section
  section: { marginTop: 4 },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 10,
  },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: ink },
  sectionSub: { fontSize: 11, color: inkSec, marginTop: 2 },
  seeAll: { fontSize: 13, fontWeight: '500', color: inkSec, paddingTop: 2 },
  pulseDot: { width: 8, height: 8, borderRadius: 4 },
  rowPadded: { paddingHorizontal: 20, paddingBottom: 4, gap: 12 },

  // ── Connections
  connRow: { paddingHorizontal: 20, paddingBottom: 4, gap: 14 },
  connItem: { width: CONN_AVT + 4, alignItems: 'center', gap: 5 },
  connAvatarWrap: { position: 'relative' },
  connAvatar: { width: CONN_AVT, height: CONN_AVT, borderRadius: CONN_AVT / 2 },
  connAvatarFallback: { backgroundColor: '#EDE9FE', alignItems: 'center', justifyContent: 'center' },
  connOnlineDot: {
    position: 'absolute', bottom: 1, right: 1,
    width: 12, height: 12, borderRadius: 6,
    backgroundColor: success, borderWidth: 2, borderColor: white,
  },
  connName: { fontSize: 10, color: inkSec, textAlign: 'center' },

  // ── Venue card
  venueCard: {
    width: VENUE_W, height: VENUE_H,
    borderRadius: 18, overflow: 'hidden', backgroundColor: '#1A1A2E',
  },
  openBadge: {
    position: 'absolute', top: 10, left: 10,
    backgroundColor: 'rgba(16,185,129,0.9)',
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 20,
  },
  closedBadge: { backgroundColor: 'rgba(107,114,128,0.85)' },
  openBadgeText: { fontSize: 10, fontWeight: '700', color: white },
  venueInfo: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 12 },
  vibeRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
  vibeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: success },
  vibeText: { fontSize: 10, color: 'rgba(255,255,255,0.9)', fontWeight: '600' },
  musicType: { fontSize: 10, color: 'rgba(255,255,255,0.65)' },
  venueName: { fontSize: 15, fontWeight: '700', color: white, marginBottom: 4 },
  venueStats: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  venueStatItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  venueStatText: { fontSize: 10, color: 'rgba(255,255,255,0.7)' },
  venueStatDiv: { fontSize: 10, color: 'rgba(255,255,255,0.4)' },
  joinCrowdBtn: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
    borderRadius: 10, paddingVertical: 7,
    alignItems: 'center',
  },
  joinCrowdText: { fontSize: 12, fontWeight: '600', color: white },

  // ── House Party card
  partyCard: {
    width: PARTY_W, backgroundColor: white,
    borderRadius: 18, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 8, elevation: 3,
  },
  partyCoverWrap: {
    width: PARTY_W, height: 140, backgroundColor: '#1A1A2E',
  },
  partyVibeTag: {
    position: 'absolute', bottom: 10, left: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20,
  },
  partyVibeText: { fontSize: 10, fontWeight: '600', color: white },
  hostAvatarWrap: {
    position: 'absolute', top: 10, right: 10,
    width: 32, height: 32, borderRadius: 16,
    borderWidth: 2, borderColor: white, overflow: 'hidden',
  },
  hostAvatar: { width: 32, height: 32 },
  hostVerifiedDot: {
    position: 'absolute', bottom: -1, right: -1,
    width: 12, height: 12, borderRadius: 6,
    backgroundColor: brand, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: white,
  },
  partyInfoWrap: { padding: 12 },
  partyTitle: { fontSize: 14, fontWeight: '700', color: ink },
  partyHost: { fontSize: 11, color: inkSec, marginTop: 2, marginBottom: 8 },
  partyMeta: { gap: 4, marginBottom: 8 },
  partyMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  partyMetaText: { fontSize: 11, color: inkSec },
  genderRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  genderChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  genderText: { fontSize: 10, fontWeight: '600' },

  // ── Host Party CTA
  hostPartyCta: {
    marginHorizontal: 20, marginBottom: 12,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 14, paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: '#FAFAFA',
    borderWidth: 1, borderColor: '#EFEFF2',
  },
  hostPartyLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  hostPartyIcon: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: '#F3EEFE',
    alignItems: 'center', justifyContent: 'center',
  },
  hostPartyTitle: { fontSize: 15, fontWeight: '700', color: ink },
  hostPartySub: { fontSize: 11, color: inkSec, marginTop: 1 },

  // ── Nearby person
  personCard: {
    width: PERSON_W, height: PERSON_H,
    borderRadius: 16, overflow: 'hidden', backgroundColor: '#EDE9FE',
  },
  personOnlineDot: {
    position: 'absolute', top: 10, left: 10,
    width: 9, height: 9, borderRadius: 5,
    backgroundColor: success, borderWidth: 1.5, borderColor: white,
  },
  personInfo: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 10 },
  personName: { fontSize: 13, fontWeight: '600', color: white },
  personDist: { fontSize: 10, color: 'rgba(255,255,255,0.7)', marginTop: 1 },

  // ── Empty states
  emptyInline: { justifyContent: 'center', height: 56, paddingLeft: 4 },
  emptyInlineText: { color: muted, fontSize: 12 },
  emptyCard: {
    width: 200, height: 160, backgroundColor: '#F9FAFB',
    borderRadius: 16, alignItems: 'center', justifyContent: 'center',
    gap: 8, padding: 16,
  },
  emptyCardText: { fontSize: 13, fontWeight: '600', color: ink, textAlign: 'center' },
  emptyCardSub: { fontSize: 11, color: muted, textAlign: 'center' },
});
