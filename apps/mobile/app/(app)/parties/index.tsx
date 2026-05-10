import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  FlatList, StatusBar, ActivityIndicator, RefreshControl,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { usePartyStore, HouseParty } from '../../../src/stores/partyStore';
import { useLocationStore } from '../../../src/stores/locationStore';

// ─── Color tokens ─────────────────────────────────────────────────────────────
const bg     = '#F8F8FC';
const ink    = '#1A1A2E';
const muted  = '#6B7280';
const white  = '#FFFFFF';
const brand  = '#7C3AED';
const border = '#E8E8F0';
const success = '#10B981';

const TABS = ['Nearby', 'Attending', 'Hosting'] as const;
type Tab = typeof TABS[number];

// ─── Party list card ──────────────────────────────────────────────────────────
function PartyListCard({ party, onPress }: { party: HouseParty; onPress: () => void }) {
  const startDate = new Date(party.startsAt);
  const timeStr = startDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  const dateStr = startDate.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
  const spotsLeft = party.maxAttendees - party.attendeeCount;
  const isFull = spotsLeft <= 0;

  return (
    <TouchableOpacity style={card.wrap} onPress={onPress} activeOpacity={0.88}>
      {/* Cover strip */}
      <View style={card.cover}>
        {party.coverImage ? (
          <Image source={{ uri: party.coverImage }} style={StyleSheet.absoluteFillObject} contentFit="cover" />
        ) : (
          <LinearGradient
            colors={['#4C1D95', '#7C3AED', '#00C2CB']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFillObject}
          />
        )}
        <LinearGradient colors={['transparent', 'rgba(0,0,0,0.55)']} style={StyleSheet.absoluteFillObject} />
        {/* Vibe tag */}
        <View style={card.vibeTag}>
          <Text style={card.vibeText}>{party.vibeType}</Text>
        </View>
        {/* Status badge */}
        {isFull && (
          <View style={card.fullBadge}>
            <Text style={card.fullText}>FULL</Text>
          </View>
        )}
      </View>

      {/* Info */}
      <View style={card.info}>
        {/* Header row */}
        <View style={card.topRow}>
          <View style={card.hostAvatar}>
            {party.host?.photo ? (
              <Image source={{ uri: party.host.photo }} style={StyleSheet.absoluteFillObject} contentFit="cover" />
            ) : (
              <LinearGradient colors={['#9333EA', '#7C3AED']} style={StyleSheet.absoluteFillObject} />
            )}
            {party.host?.verified && (
              <View style={card.verifiedDot}>
                <Ionicons name="checkmark" size={6} color={white} />
              </View>
            )}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={card.title} numberOfLines={1}>{party.title}</Text>
            <Text style={card.hostName} numberOfLines={1}>Hosted by {party.host?.name ?? 'Anonymous'}</Text>
          </View>
          {party.isPaid && party.entryFee ? (
            <View style={card.feeBadge}>
              <Text style={card.feeText}>₹{party.entryFee}</Text>
            </View>
          ) : (
            <View style={[card.feeBadge, card.freeBadge]}>
              <Text style={[card.feeText, { color: success }]}>Free</Text>
            </View>
          )}
        </View>

        {/* Meta */}
        <View style={card.metaRow}>
          <View style={card.metaItem}>
            <Ionicons name="calendar-outline" size={12} color={muted} />
            <Text style={card.metaText}>{dateStr} · {timeStr}</Text>
          </View>
          <View style={card.metaItem}>
            <Ionicons name="location-outline" size={12} color={muted} />
            <Text style={card.metaText}>{party.neighborhood ?? party.city}</Text>
          </View>
        </View>

        {/* Attendees + spots */}
        <View style={card.bottomRow}>
          <View style={card.attendeeRow}>
            <Ionicons name="people-outline" size={13} color={muted} />
            <Text style={card.attendeeText}>
              {party.attendeeCount}/{party.maxAttendees} joined
            </Text>
            {!isFull && (
              <Text style={card.spotsText}> · {spotsLeft} spots left</Text>
            )}
          </View>
          {/* Tags */}
          <View style={card.tags}>
            {party.isByob && <View style={card.tag}><Text style={card.tagText}>BYOB</Text></View>}
            {party.requiresVerification && <View style={[card.tag, card.tagVerified]}><Text style={[card.tagText, { color: '#7C3AED' }]}>Verified</Text></View>}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function PartiesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const city = useLocationStore((s) => s.city);
  const { nearbyParties, attendingParties, hostingParties, isLoading, fetchNearby, fetchAttending, fetchHosting } = usePartyStore();
  const [activeTab, setActiveTab] = useState<Tab>('Nearby');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    void fetchNearby(city ?? undefined);
    void fetchAttending();
    void fetchHosting();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [city]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchNearby(city ?? undefined), fetchAttending(), fetchHosting()]);
    setRefreshing(false);
  };

  const data =
    activeTab === 'Nearby'    ? nearbyParties :
    activeTab === 'Attending' ? attendingParties :
    hostingParties;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor={bg} />

      {/* Header */}
      <Animated.View entering={FadeInDown.delay(0).duration(350)} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.75}>
          <Ionicons name="arrow-back" size={22} color={ink} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>House Parties</Text>
          {city && <Text style={styles.headerSub}>{city}</Text>}
        </View>
        <TouchableOpacity
          style={styles.hostBtn}
          onPress={() => router.push('/(app)/parties/create' as any)}
          activeOpacity={0.85}
        >
          <LinearGradient colors={['#7C3AED', '#9333EA']} style={styles.hostBtnGrad}>
            <Ionicons name="add" size={16} color={white} />
            <Text style={styles.hostBtnText}>Host</Text>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>

      {/* Tabs */}
      <Animated.View entering={FadeInDown.delay(60).duration(350)} style={styles.tabsRow}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{tab}</Text>
          </TouchableOpacity>
        ))}
      </Animated.View>

      {/* List */}
      {isLoading && data.length === 0 ? (
        <View style={styles.loader}>
          <ActivityIndicator color={brand} size="large" />
        </View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(p) => p.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: insets.bottom + 20 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={brand} />}
          renderItem={({ item, index }) => (
            <Animated.View entering={FadeInDown.delay(80 + index * 40).duration(350)}>
              <PartyListCard
                party={item}
                onPress={() => router.push(`/(app)/parties/${item.id}` as any)}
              />
            </Animated.View>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <LinearGradient colors={['#EDE9FE', '#DDD6FE']} style={styles.emptyIcon}>
                <Ionicons name="home-outline" size={32} color={brand} />
              </LinearGradient>
              <Text style={styles.emptyTitle}>
                {activeTab === 'Nearby' ? 'No parties nearby' :
                 activeTab === 'Attending' ? "You haven't joined any parties" :
                 "You haven't hosted any parties"}
              </Text>
              <Text style={styles.emptySub}>
                {activeTab === 'Nearby' ? 'Be the first to host one!' : 'Browse nearby parties to join'}
              </Text>
              {activeTab !== 'Nearby' && (
                <TouchableOpacity onPress={() => setActiveTab('Nearby')} style={styles.emptyBtn}>
                  <Text style={styles.emptyBtnText}>Browse Parties</Text>
                </TouchableOpacity>
              )}
              {activeTab === 'Hosting' && (
                <TouchableOpacity
                  style={[styles.emptyBtn, { backgroundColor: brand }]}
                  onPress={() => router.push('/(app)/parties/create' as any)}
                >
                  <Text style={[styles.emptyBtnText, { color: white }]}>Host a Party</Text>
                </TouchableOpacity>
              )}
            </View>
          }
        />
      )}
    </View>
  );
}

// ─── Card styles ──────────────────────────────────────────────────────────────
const card = StyleSheet.create({
  wrap: {
    backgroundColor: white, borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 10, elevation: 3,
  },
  cover: { height: 120, width: '100%', backgroundColor: '#4C1D95' },
  vibeTag: {
    position: 'absolute', bottom: 10, left: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
  },
  vibeText: { fontSize: 11, fontWeight: '600', color: white },
  fullBadge: {
    position: 'absolute', top: 10, right: 12,
    backgroundColor: 'rgba(239,68,68,0.85)',
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20,
  },
  fullText: { fontSize: 10, fontWeight: '700', color: white },
  info: { padding: 14 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  hostAvatar: {
    width: 36, height: 36, borderRadius: 18, overflow: 'hidden',
    backgroundColor: '#7C3AED', position: 'relative',
  },
  verifiedDot: {
    position: 'absolute', bottom: -1, right: -1,
    width: 12, height: 12, borderRadius: 6,
    backgroundColor: brand, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: white,
  },
  title: { fontSize: 15, fontWeight: '700', color: ink },
  hostName: { fontSize: 11, color: muted, marginTop: 1 },
  feeBadge: {
    backgroundColor: '#FFF7ED', paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 20,
  },
  freeBadge: { backgroundColor: '#F0FDF4' },
  feeText: { fontSize: 12, fontWeight: '700', color: '#C2410C' },
  metaRow: { gap: 5, marginBottom: 10 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontSize: 12, color: muted },
  bottomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  attendeeRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  attendeeText: { fontSize: 12, color: muted },
  spotsText: { fontSize: 12, color: success },
  tags: { flexDirection: 'row', gap: 6 },
  tag: { backgroundColor: '#F9FAFB', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, borderWidth: 1, borderColor: border },
  tagVerified: { backgroundColor: '#F5F3FF', borderColor: '#DDD6FE' },
  tagText: { fontSize: 10, fontWeight: '600', color: muted },
});

// ─── Screen styles ────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: bg },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: white,
    borderBottomWidth: 1, borderBottomColor: border,
  },
  backBtn: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flex: 1 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: ink },
  headerSub: { fontSize: 11, color: muted, marginTop: 1 },
  hostBtn: { borderRadius: 20, overflow: 'hidden' },
  hostBtnGrad: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingVertical: 8 },
  hostBtnText: { fontSize: 13, fontWeight: '700', color: white },
  tabsRow: {
    flexDirection: 'row', backgroundColor: white,
    paddingHorizontal: 16, paddingBottom: 4,
    borderBottomWidth: 1, borderBottomColor: border,
  },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 10 },
  tabActive: { borderBottomWidth: 2, borderBottomColor: brand },
  tabText: { fontSize: 13, fontWeight: '500', color: muted },
  tabTextActive: { color: brand, fontWeight: '700' },
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: 12 },
  emptyIcon: { width: 72, height: 72, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: ink, textAlign: 'center' },
  emptySub: { fontSize: 13, color: muted, textAlign: 'center' },
  emptyBtn: {
    marginTop: 4, paddingHorizontal: 20, paddingVertical: 10,
    borderRadius: 20, backgroundColor: '#F3F4F6',
  },
  emptyBtnText: { fontSize: 14, fontWeight: '600', color: ink },
});
