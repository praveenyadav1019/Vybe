import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  StatusBar, TextInput, ScrollView, Alert,
} from 'react-native';
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
const bgSec  = '#F9FAFB';
const border = '#E5E7EB';
const gold   = '#C9A84C';

// ─── Category cards ───────────────────────────────────────────────────────────
const CATEGORIES = [
  { icon: 'rocket-outline' as const, label: 'Getting\nStarted',       color: brand,  bg: '#EDE9FE' },
  { icon: 'shield-checkmark-outline' as const, label: 'Account &\nSecurity', color: '#2563EB', bg: '#DBEAFE' },
  { icon: 'star-outline' as const, label: 'Premium\nMembership',     color: '#C9A84C', bg: '#FEF3C7' },
] as const;

const ARTICLES = [
  { id: '1', title: 'How to customize your profile?' },
  { id: '2', title: 'Managing notifications' },
  { id: '3', title: 'Understanding premium features' },
];

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function HelpSupportScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor={white} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}>
        {/* Header */}
        <Animated.View entering={FadeInDown.delay(0).duration(350)} style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity onPress={() => router.back()} activeOpacity={0.8}>
              <Ionicons name="arrow-back" size={22} color={ink} />
            </TouchableOpacity>
          </View>
          <View style={styles.headerRight}>
            <Ionicons name="person-circle-outline" size={26} color={inkSec} />
          </View>
        </Animated.View>

        {/* Title */}
        <Animated.View entering={FadeInDown.delay(40).duration(350)} style={styles.titleWrap}>
          <Text style={styles.title}>Help and Support Center</Text>
        </Animated.View>

        {/* Search */}
        <Animated.View entering={FadeInDown.delay(80).duration(350)} style={styles.searchWrap}>
          <Ionicons name="search-outline" size={16} color={inkSec} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search FAQs..."
            placeholderTextColor={inkSec}
          />
        </Animated.View>

        {/* Categories */}
        <Animated.View entering={FadeInDown.delay(120).duration(380)} style={styles.categories}>
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat.label}
              style={[styles.catCard, { backgroundColor: cat.bg }]}
              activeOpacity={0.82}
            >
              <Ionicons name={cat.icon} size={28} color={cat.color} />
              <Text style={[styles.catLabel, { color: cat.color }]}>{cat.label}</Text>
            </TouchableOpacity>
          ))}
        </Animated.View>

        {/* Top Articles */}
        <Animated.View entering={FadeInDown.delay(180).duration(380)} style={styles.articlesWrap}>
          <Text style={styles.articlesTitle}>Top Articles</Text>
          <Text style={styles.articlesSub}>Top articles for busy FAQs</Text>
          {ARTICLES.map((article, i) => (
            <TouchableOpacity
              key={article.id}
              style={[styles.articleRow, i < ARTICLES.length - 1 && styles.articleDivider]}
              activeOpacity={0.8}
              onPress={() => Alert.alert(article.title, 'Loading article...')}
            >
              <Text style={styles.articleTitle}>{article.title}</Text>
              <Ionicons name="chevron-forward" size={16} color="#D1D5DB" />
            </TouchableOpacity>
          ))}
        </Animated.View>

        {/* Contact Support */}
        <Animated.View entering={FadeInDown.delay(280).duration(380)} style={styles.contactWrap}>
          <TouchableOpacity activeOpacity={0.88}>
            <LinearGradient
              colors={['#9333EA', '#7C3AED']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={styles.contactBtn}
            >
              <Ionicons name="chatbubble-ellipses-outline" size={18} color={white} />
              <View>
                <Text style={styles.contactBtnTitle}>Contact Support</Text>
                <Text style={styles.contactBtnSub}>Live Chat or Email</Text>
              </View>
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
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 4,
  },
  headerLeft: { width: 36 },
  headerRight: { width: 36, alignItems: 'flex-end' },

  titleWrap: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 },
  title: { fontSize: 26, fontWeight: '800', color: ink },

  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginHorizontal: 20, paddingHorizontal: 14, paddingVertical: 11,
    backgroundColor: bgSec, borderRadius: 12,
    borderWidth: 1, borderColor: border,
    marginBottom: 20,
  },
  searchInput: { flex: 1, fontSize: 14, color: ink },

  categories: {
    flexDirection: 'row', paddingHorizontal: 20, gap: 12, marginBottom: 24,
  },
  catCard: {
    flex: 1, borderRadius: 16, padding: 16,
    alignItems: 'center', gap: 10,
  },
  catLabel: { fontSize: 12, fontWeight: '700', textAlign: 'center', lineHeight: 16 },

  articlesWrap: {
    marginHorizontal: 20, marginBottom: 24,
    backgroundColor: bgSec,
    borderRadius: 16, overflow: 'hidden',
    borderWidth: 1, borderColor: border,
    padding: 16,
  },
  articlesTitle: { fontSize: 15, fontWeight: '700', color: ink, marginBottom: 2 },
  articlesSub: { fontSize: 12, color: inkSec, marginBottom: 12 },
  articleRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 12,
  },
  articleDivider: { borderBottomWidth: 1, borderBottomColor: border },
  articleTitle: { fontSize: 14, color: ink, flex: 1, marginRight: 8 },

  contactWrap: { paddingHorizontal: 20 },
  contactBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    padding: 18, borderRadius: 16,
  },
  contactBtnTitle: { fontSize: 15, fontWeight: '700', color: white },
  contactBtnSub: { fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 1 },
});
