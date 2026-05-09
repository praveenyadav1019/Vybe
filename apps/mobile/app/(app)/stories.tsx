import React, { useState, useRef } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, Dimensions,
  Modal, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { useAuthStore } from '@/stores/authStore';
import { colors } from '@/theme/colors';
import { Avatar } from '@/components/ui/Avatar';
import { GlassCard } from '@/components/ui/GlassCard';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Demo data
const DEMO_STORIES = [
  { id: 's1', userId: 'me', name: 'You', photo: null, hasStory: false },
  { id: 's2', userId: 'u1', name: 'Priya', photo: 'https://i.pravatar.cc/150?img=1', hasStory: true, viewed: false },
  { id: 's3', userId: 'u2', name: 'Rahul', photo: 'https://i.pravatar.cc/150?img=3', hasStory: true, viewed: false },
  { id: 's4', userId: 'u3', name: 'Ananya', photo: 'https://i.pravatar.cc/150?img=5', hasStory: true, viewed: true },
  { id: 's5', userId: 'u4', name: 'Arjun', photo: 'https://i.pravatar.cc/150?img=7', hasStory: true, viewed: true },
];

const DEMO_VIBES = [
  { id: 'v1', userId: 'u1', name: 'Priya', age: 24, photo: 'https://i.pravatar.cc/150?img=1', location: 'F Bar, Andheri', mood: 'Night Out 🌙', text: 'The vibe here is insane tonight! Who\'s around? 🔥', time: '2m ago', reactions: { '🔥': 12, '❤️': 5, '😍': 3, '👀': 8 } },
  { id: 'v2', userId: 'u2', name: 'Rahul', age: 27, photo: 'https://i.pravatar.cc/150?img=3', location: 'Kitty Su, Delhi', mood: 'Club Mates 🎵', text: 'Looking for someone to share this night with 🎶', time: '15m ago', reactions: { '🔥': 7, '❤️': 18, '😍': 6, '👀': 4 } },
  { id: 'v3', userId: 'u3', name: 'Ananya', age: 23, photo: 'https://i.pravatar.cc/150?img=5', location: 'Goa Beach Shacks', mood: 'Co-Travel ✈️', text: 'Solo traveling in Goa for 3 days. Anyone in the area? 🌊', time: '1h ago', reactions: { '🔥': 4, '❤️': 9, '😍': 11, '👀': 22 } },
  { id: 'v4', userId: 'u4', name: 'Arjun', age: 26, photo: 'https://i.pravatar.cc/150?img=7', location: 'Toit, Bangalore', mood: 'Casual 👋', text: 'Great craft beer and even better company needed 🍺', time: '2h ago', reactions: { '🔥': 15, '❤️': 3, '😍': 2, '👀': 6 } },
];

function StoryCircle({ story, onPress }: { story: typeof DEMO_STORIES[0]; onPress: () => void }) {
  const isMe = story.userId === 'me';
  return (
    <TouchableOpacity onPress={onPress} style={styles.storyCircle}>
      <LinearGradient
        colors={story.hasStory && !story.viewed ? [colors.primary, colors.accent] : story.hasStory ? [colors.border, colors.border] : [colors.border, colors.border]}
        style={styles.storyRing}
      >
        {story.photo ? (
          <Image source={{ uri: story.photo }} style={styles.storyAvatar} contentFit="cover" />
        ) : (
          <View style={[styles.storyAvatar, { backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }]}>
            <Text style={{ color: '#FFF', fontSize: 18, fontWeight: '700' }}>
              {story.name.charAt(0)}
            </Text>
          </View>
        )}
        {isMe && (
          <View style={styles.addStoryBtn}>
            <Ionicons name="add" size={12} color="#FFF" />
          </View>
        )}
      </LinearGradient>
      <Text style={styles.storyName} numberOfLines={1}>{story.name}</Text>
    </TouchableOpacity>
  );
}

function VibeCard({ vibe, onPing, onReact }: { vibe: typeof DEMO_VIBES[0]; onPing: () => void; onReact: (emoji: string) => void }) {
  const [myReaction, setMyReaction] = useState<string | null>(null);
  const [reactions, setReactions] = useState(vibe.reactions);

  const handleReact = (emoji: string) => {
    if (myReaction === emoji) {
      setMyReaction(null);
      setReactions(r => ({ ...r, [emoji]: (r[emoji as keyof typeof r] || 1) - 1 }));
    } else {
      if (myReaction) setReactions(r => ({ ...r, [myReaction]: (r[myReaction as keyof typeof r] || 1) - 1 }));
      setMyReaction(emoji);
      setReactions(r => ({ ...r, [emoji]: (r[emoji as keyof typeof r] || 0) + 1 }));
    }
  };

  return (
    <GlassCard style={styles.vibeCard} noPadding>
      {/* Header */}
      <View style={styles.vibeHeader}>
        <Avatar uri={vibe.photo} name={vibe.name} size="sm" showOnline isOnline />
        <View style={{ flex: 1 }}>
          <Text style={styles.vibeName}>{vibe.name}, {vibe.age}</Text>
          <View style={styles.vibeMetaRow}>
            <Ionicons name="location-outline" size={11} color={colors.subtext} />
            <Text style={styles.vibeMeta}>{vibe.location}</Text>
            <Text style={styles.vibeDot}>·</Text>
            <Text style={styles.vibeMeta}>{vibe.time}</Text>
          </View>
        </View>
        <View style={styles.moodChip}>
          <Text style={styles.moodText}>{vibe.mood}</Text>
        </View>
      </View>

      {/* Content */}
      <View style={styles.vibeContent}>
        <Text style={styles.vibeText}>{vibe.text}</Text>
      </View>

      {/* Reactions */}
      <View style={styles.reactionsRow}>
        {Object.entries(reactions).map(([emoji, count]) => (
          <TouchableOpacity
            key={emoji}
            onPress={() => handleReact(emoji)}
            style={[styles.reactionBtn, myReaction === emoji && styles.reactionBtnActive]}
          >
            <Text style={styles.reactionEmoji}>{emoji}</Text>
            <Text style={[styles.reactionCount, myReaction === emoji && { color: colors.primary }]}>{count}</Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity onPress={onPing} style={styles.pingBtn}>
          <Ionicons name="paper-plane-outline" size={14} color={colors.primary} />
          <Text style={styles.pingBtnText}>Ping</Text>
        </TouchableOpacity>
      </View>
    </GlassCard>
  );
}

export default function StoriesScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [filter, setFilter] = useState<'all' | 'nearby' | 'following'>('all');
  const [storyModalVisible, setStoryModalVisible] = useState(false);
  const [activeStory, setActiveStory] = useState<typeof DEMO_STORIES[0] | null>(null);

  const handleStoryPress = (story: typeof DEMO_STORIES[0]) => {
    if (story.userId === 'me') {
      return; // TODO: story creation flow
    }
    if (!story.hasStory) return;
    setActiveStory(story);
    setStoryModalVisible(true);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <Animated.View entering={FadeInDown.delay(50)} style={styles.header}>
        <Text style={styles.headerTitle}>Vibes 🌟</Text>
        <TouchableOpacity style={styles.notifBtn} onPress={() => router.push('/(app)/notifications')}>
          <Ionicons name="notifications-outline" size={22} color={colors.text} />
        </TouchableOpacity>
      </Animated.View>

      {/* Stories Row */}
      <Animated.View entering={FadeInDown.delay(100)}>
        <FlatList
          data={DEMO_STORIES}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={i => i.id}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 12, paddingVertical: 8 }}
          renderItem={({ item }) => (
            <StoryCircle story={item} onPress={() => handleStoryPress(item)} />
          )}
        />
      </Animated.View>

      {/* Filter */}
      <Animated.View entering={FadeInDown.delay(150)} style={styles.filterRow}>
        {(['all', 'nearby', 'following'] as const).map((f) => (
          <TouchableOpacity
            key={f}
            onPress={() => setFilter(f)}
            style={[styles.filterChip, filter === f && styles.filterChipActive]}
          >
            <Text style={[styles.filterText, filter === f && { color: '#FFF' }]}>
              {f === 'all' ? 'All Vibes' : f === 'nearby' ? '📍 Nearby' : '👥 Following'}
            </Text>
          </TouchableOpacity>
        ))}
      </Animated.View>

      {/* Vibes Feed */}
      <FlatList
        data={DEMO_VIBES}
        keyExtractor={i => i.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100, gap: 12 }}
        showsVerticalScrollIndicator={false}
        renderItem={({ item, index }) => (
          <Animated.View entering={FadeInDown.delay(index * 80)}>
            <VibeCard
              vibe={item}
              onPing={() => router.push(`/(app)/user/${item.userId}`)}
              onReact={() => {}}
            />
          </Animated.View>
        )}
      />

      {/* Story Viewer Modal */}
      <Modal visible={storyModalVisible} transparent animationType="fade" onRequestClose={() => setStoryModalVisible(false)}>
        <Animated.View entering={FadeIn} style={styles.storyModal}>
          <LinearGradient colors={['#1A0A3D', '#0A0A0A']} style={StyleSheet.absoluteFillObject} />
          <SafeAreaView style={{ flex: 1 }}>
            <TouchableOpacity onPress={() => setStoryModalVisible(false)} style={styles.storyCloseBtn}>
              <Ionicons name="close" size={26} color="#FFF" />
            </TouchableOpacity>
            {activeStory && (
              <View style={styles.storyContent}>
                <Avatar uri={activeStory.photo || undefined} name={activeStory.name} size="xl" />
                <Text style={styles.storyUserName}>{activeStory.name}</Text>
                <Text style={styles.storyPlaceholder}>Story content coming soon ✨</Text>
              </View>
            )}
          </SafeAreaView>
        </Animated.View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  headerTitle: { color: colors.text, fontSize: 24, fontWeight: '800' },
  notifBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  storyCircle: { alignItems: 'center', gap: 4, width: 68 },
  storyRing: { width: 64, height: 64, borderRadius: 32, padding: 2.5, alignItems: 'center', justifyContent: 'center' },
  storyAvatar: { width: 58, height: 58, borderRadius: 29, borderWidth: 2, borderColor: colors.background },
  addStoryBtn: { position: 'absolute', bottom: 0, right: 0, width: 20, height: 20, borderRadius: 10, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.background },
  storyName: { color: colors.text, fontSize: 11, fontWeight: '500', textAlign: 'center' },
  filterRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginBottom: 12 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 100, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  filterChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterText: { color: colors.subtext, fontSize: 13, fontWeight: '500' },
  vibeCard: { borderRadius: 20, overflow: 'hidden' },
  vibeHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderBottomWidth: 1, borderBottomColor: colors.border },
  vibeName: { color: colors.text, fontSize: 14, fontWeight: '600' },
  vibeMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  vibeMeta: { color: colors.subtext, fontSize: 11 },
  vibeDot: { color: colors.subtext, fontSize: 11 },
  moodChip: { backgroundColor: `${colors.primary}22`, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4 },
  moodText: { color: colors.primary, fontSize: 11, fontWeight: '600' },
  vibeContent: { padding: 14 },
  vibeText: { color: colors.text, fontSize: 14, lineHeight: 22 },
  reactionsRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingBottom: 14, flexWrap: 'wrap' },
  reactionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 100, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  reactionBtnActive: { borderColor: colors.primary, backgroundColor: `${colors.primary}22` },
  reactionEmoji: { fontSize: 14 },
  reactionCount: { color: colors.subtext, fontSize: 12, fontWeight: '600' },
  pingBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, marginLeft: 'auto', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 100, borderWidth: 1, borderColor: colors.primary },
  pingBtnText: { color: colors.primary, fontSize: 12, fontWeight: '600' },
  storyModal: { flex: 1 },
  storyCloseBtn: { alignSelf: 'flex-end', margin: 16, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  storyContent: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  storyUserName: { color: '#FFF', fontSize: 22, fontWeight: '700' },
  storyPlaceholder: { color: 'rgba(255,255,255,0.6)', fontSize: 15 },
});
