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
import { useVenueStore, Venue } from '../../src/stores/venueStore';
import { useDiscoveryStore } from '../../src/stores/discoveryStore';
import { useLocationStore } from '../../src/stores/locationStore';
import { usePartyStore, HouseParty } from '../../src/stores/partyStore';
import { NearbyUser } from '../../src/types';

// ─── Design tokens ─────────────────────────────────────────────────────────────
const ink     = '#1A1A2E';
const brand   = '#7C3AED';
const accent  = '#00C2CB';
const inkSec  = '#6B7280';
const muted   = '#9CA3AF';
const white   = '#FFFFFF';
const bg      = '#F8F8FC';
const success = '#10B981';
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

// ─── Happening Now card ─────────────────────────────────────────────────────────
function VenueCard({ venue, onPress }: { venue: Venue; onPress: () => void }) {
  const photo = venue.photos?.[0];
  const isOpen = (venue as any).openNow ?? true;

  return (
    <TouchableOpacity style={styles.venueCard} activeOpacity={0.9} onPress={onPress}>
      {/* Image */}
      {photo ? (
        <Image source={{ uri: photo }} style={StyleSheet.absoluteFillObject} contentFit="cover" />
      ) : (
        <LinearGradient colors={['#1A1A2E', '#312E81']} style={StyleSheet.absoluteFillObject} />
      )}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.15)', 'rgba(0,0,0,0.9)']}
        locations={[0, 0.4, 1]}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Open badge */}
      <View style={[styles.openBadge, !isOpen && styles.closedBadge]}>
        <Text style={styles.openBadgeText}>{isOpen ? 'Open' : 'Closed'}</Text>
      </View>

      {/* Bottom info */}
      <View style={styles.venueInfo}>
        {/* Vibe score */}
        <View style={styles.vibeRow}>
          <View style={styles.vibeDot} />
          <Text style={styles.vibeText}>
            {venue.vibeScore >= 8 ? '🔥 Very Hot' : venue.vibeScore >= 6 ? '✨ Buzzing' : '💫 Chill'}
          </Text>
          {(venue as any).musicType && (
            <Text style={styles.musicType}>· {(venue as any).musicType}</Text>
          )}
        </View>

        <Text style={styles.venueName} numberOfLines={1}>{venue.name}</Text>

        <View style={styles.venueStats}>
          <View style={styles.venueStatItem}>
            <Ionicons name="location-outline" size={10} color="rgba(255,255,255,0.7)" />
            <Text style={styles.venueStatText}>{venue.distance ?? 'Nearby'}</Text>
          </View>
          <Text style={styles.venueStatDiv}> · </Text>
          <View style={styles.venueStatItem}>
            <Ionicons name="people-outline" size={10} color="rgba(255,255,255,0.7)" />
            <Text style={styles.venueStatText}>{venue.activeUsers ?? 0} here</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.joinCrowdBtn} onPress={onPress} activeOpacity={0.85}>
          <Text style={styles.joinCrowdText}>Join Crowd</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

// ─── House Party card ──────────────────────────────────────────────────────────
function PartyCard({ party, onPress }: { party: HouseParty; onPress: () => void }) {
  const startDate = new Date(party.startsAt);
  const timeStr = startDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  const dateStr = startDate.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
  const spotsLeft = party.maxAttendees - party.attendeeCount;

  return (
    <TouchableOpacity style={styles.partyCard} onPress={onPress} activeOpacity={0.88}>
      {/* Cover */}
      <View style={styles.partyCoverWrap}>
        {party.coverImage ? (
          <Image source={{ uri: party.coverImage }} style={StyleSheet.absoluteFillObject} contentFit="cover" />
        ) : (
          <LinearGradient
            colors={['#4C1D95', '#7C3AED']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFillObject}
          />
        )}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.7)']}
          style={StyleSheet.absoluteFillObject}
        />
        {/* Vibe tag */}
        <View style={styles.partyVibeTag}>
          <Text style={styles.partyVibeText}>{party.vibeType}</Text>
        </View>
        {/* Host avatar */}
        {party.host?.photo ? (
          <View style={styles.hostAvatarWrap}>
            <Image source={{ uri: party.host.photo }} style={styles.hostAvatar} contentFit="cover" />
            {party.host.verified && (
              <View style={styles.hostVerifiedDot}>
                <Ionicons name="checkmark" size={7} color={white} />
              </View>
            )}
          </View>
        ) : null}
      </View>

      {/* Info */}
      <View style={styles.partyInfoWrap}>
        <Text style={styles.partyTitle} numberOfLines={1}>{party.title}</Text>
        <Text style={styles.partyHost} numberOfLines={1}>
          by {party.host?.name ?? 'Host'}
          {party.requiresVerification ? ' · Verified only' : ''}
        </Text>

        <View style={styles.partyMeta}>
          <View style={styles.partyMetaItem}>
            <Ionicons name="calendar-outline" size={12} color={inkSec} />
            <Text style={styles.partyMetaText}>{dateStr} · {timeStr}</Text>
          </View>
          <View style={styles.partyMetaItem}>
            <Ionicons name="people-outline" size={12} color={inkSec} />
            <Text style={styles.partyMetaText}>
              {party.attendeeCount}/{party.maxAttendees}
              {' '}{spotsLeft > 0 ? `· ${spotsLeft} spots left` : '· Full'}
            </Text>
          </View>
          {party.isPaid && party.entryFee && (
            <View style={styles.partyMetaItem}>
              <Ionicons name="ticket-outline" size={12} color={inkSec} />
              <Text style={styles.partyMetaText}>₹{party.entryFee}</Text>
            </View>
          )}
        </View>

        {/* Gender mix indicators */}
        <View style={styles.genderRow}>
          {party.allowMale   && <View style={[styles.genderChip, { backgroundColor: '#EFF6FF' }]}><Text style={[styles.genderText, { color: '#2563EB' }]}>Men</Text></View>}
          {party.allowFemale && <View style={[styles.genderChip, { backgroundColor: '#FDF2F8' }]}><Text style={[styles.genderText, { color: '#9D174D' }]}>Women</Text></View>}
          {party.allowCouple && <View style={[styles.genderChip, { backgroundColor: '#FFF7ED' }]}><Text style={[styles.genderText, { color: '#C2410C' }]}>Couples</Text></View>}
          {party.isByob && <View style={[styles.genderChip, { backgroundColor: '#F0FDF4' }]}><Text style={[styles.genderText, { color: '#166534' }]}>BYOB</Text></View>}
        </View>
      </View>
    </TouchableOpacity>
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

  const { happeningVenues, isLoading: venuesLoading, fetchHappening } = useVenueStore();
  const nearbyUsers = useDiscoveryStore((s) => s.nearbyUsers);
  const lat = useLocationStore((s) => s.latitude);
  const lng = useLocationStore((s) => s.longitude);
  const city = useLocationStore((s) => s.city);
  const { nearbyParties, fetchNearby: fetchParties } = usePartyStore();

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

  useEffect(() => {
    void fetchHappening(lat ?? undefined, lng ?? undefined);
    void fetchParties(city ?? undefined);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lat, lng, city]);

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
            <Text style={styles.greeting}>{greeting}, <Text style={styles.greetingName}>{firstName}</Text></Text>
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

        {/* ── Happening Now ───────────────────────────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(100).duration(350)} style={styles.section}>
          <SectionHeader
            title="Happening Now"
            subtitle="Clubs · Bars · Lounges near you"
            live
            onSeeAll={() => router.push('/(app)/places' as any)}
          />
          {venuesLoading && happeningVenues.length === 0 ? (
            <View style={{ height: 240, alignItems: 'center', justifyContent: 'center' }}>
              <ActivityIndicator color={brand} />
            </View>
          ) : (
            <FlatList
              data={happeningVenues.slice(0, 8)}
              horizontal
              keyExtractor={(v) => v.id}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.rowPadded}
              renderItem={({ item }) => (
                <VenueCard
                  venue={item}
                  onPress={() => router.push(`/(app)/places/${item.id}` as any)}
                />
              )}
              ListEmptyComponent={
                <View style={styles.emptyCard}>
                  <Ionicons name="business-outline" size={28} color={muted} />
                  <Text style={styles.emptyCardText}>No venues found nearby</Text>
                  <Text style={styles.emptyCardSub}>Enable location for local results</Text>
                </View>
              }
            />
          )}
        </Animated.View>

        {/* ── House Parties ────────────────────────────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(150).duration(350)} style={styles.section}>
          <SectionHeader
            title="House Parties"
            subtitle="Real parties, real people nearby"
            icon="home"
            onSeeAll={() => router.push('/(app)/parties' as any)}
          />
          {/* Host Party CTA */}
          <TouchableOpacity
            style={styles.hostPartyCta}
            onPress={() => router.push('/(app)/parties/create' as any)}
            activeOpacity={0.88}
          >
            <LinearGradient
              colors={['#7C3AED', '#9333EA']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={styles.hostPartyGradient}
            >
              <View style={styles.hostPartyLeft}>
                <Ionicons name="add-circle" size={24} color={white} />
                <View>
                  <Text style={styles.hostPartyTitle}>Host a Party</Text>
                  <Text style={styles.hostPartySub}>Invite people to your space</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.7)" />
            </LinearGradient>
          </TouchableOpacity>

          <FlatList
            data={nearbyParties.slice(0, 5)}
            horizontal
            keyExtractor={(p) => p.id}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.rowPadded}
            renderItem={({ item }) => (
              <PartyCard
                party={item}
                onPress={() => router.push(`/(app)/parties/${item.id}` as any)}
              />
            )}
            ListEmptyComponent={
              <View style={styles.emptyCard}>
                <Ionicons name="home-outline" size={28} color={muted} />
                <Text style={styles.emptyCardText}>No parties nearby</Text>
                <Text style={styles.emptyCardSub}>Be the first to host one!</Text>
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
    backgroundColor: '#EDE9FE',
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  headerAvatarImg: { width: 38, height: 38 },
  headerCenter: { flex: 1 },
  greeting: { fontSize: 15, fontWeight: '400', color: ink },
  greetingName: { fontWeight: '700', color: ink },
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
  seeAll: { fontSize: 13, fontWeight: '500', color: brand, paddingTop: 2 },
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
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
    borderRadius: 20, paddingVertical: 6,
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
  hostPartyCta: { marginHorizontal: 20, marginBottom: 12, borderRadius: 14, overflow: 'hidden' },
  hostPartyGradient: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
  },
  hostPartyLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  hostPartyTitle: { fontSize: 15, fontWeight: '700', color: white },
  hostPartySub: { fontSize: 11, color: 'rgba(255,255,255,0.75)', marginTop: 1 },

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
