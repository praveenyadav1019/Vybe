import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  StatusBar, Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  FadeIn, useSharedValue, useAnimatedStyle, withTiming,
} from 'react-native-reanimated';
import { useLocalSearchParams, useRouter } from 'expo-router';

const { width: W, height: H } = Dimensions.get('window');

const PHOTOS = [
  'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80',
  'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=800&q=80',
  'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=800&q=80',
  'https://images.unsplash.com/photo-1551632436-cbf8dd35adfa?w=800&q=80',
  'https://images.unsplash.com/photo-1614267861476-0d129972a0f4?w=800&q=80',
];

const USER_NAME = 'Alex D.';
const USER_PHOTO = 'https://randomuser.me/api/portraits/men/32.jpg';

export default function PhotoGalleryScreen() {
  const insets  = useSafeAreaInsets();
  const router  = useRouter();
  const { index: indexParam } = useLocalSearchParams<{ index?: string }>();
  const [currentIdx, setCurrentIdx] = useState(parseInt(indexParam ?? '0', 10) || 0);
  const [liked, setLiked] = useState(false);

  const chromeOpacity = useSharedValue(1);
  const chromeStyle = useAnimatedStyle(() => ({ opacity: chromeOpacity.value }));

  function toggleChrome() {
    chromeOpacity.value = withTiming(chromeOpacity.value > 0.5 ? 0 : 1, { duration: 200 });
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Full-screen photo */}
      <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={toggleChrome}>
        <Image
          source={{ uri: PHOTOS[currentIdx] }}
          style={{ width: W, height: H }}
          contentFit="cover"
        />
      </TouchableOpacity>

      {/* Header chrome */}
      <Animated.View style={[styles.header, chromeStyle, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn} activeOpacity={0.8}>
          <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.photoCount}>Photo {currentIdx + 1} of {PHOTOS.length}</Text>
        <View style={styles.headerBtn} />
      </Animated.View>

      {/* User info (bottom-left) */}
      <Animated.View style={[styles.userInfo, chromeStyle, { bottom: insets.bottom + 56 }]}>
        <View style={styles.userAvatar}>
          <Image source={{ uri: USER_PHOTO }} style={styles.avatarImg} contentFit="cover" />
        </View>
        <Text style={styles.userName}>{USER_NAME}</Text>
      </Animated.View>

      {/* Action bar */}
      <Animated.View style={[styles.actionBar, chromeStyle, { paddingBottom: insets.bottom + 8 }]}>
        {/* Prev */}
        {currentIdx > 0 && (
          <TouchableOpacity
            style={styles.navBtn}
            onPress={() => setCurrentIdx((i) => i - 1)}
            activeOpacity={0.8}
          />
        )}

        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => setLiked((l) => !l)}
          activeOpacity={0.8}
        >
          <Ionicons name={liked ? 'heart' : 'heart-outline'} size={26} color={liked ? '#EF4444' : white} />
          <Text style={styles.actionLabel}>Like</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtn} activeOpacity={0.8}>
          <Ionicons name="chatbubble-outline" size={24} color={white} />
          <Text style={styles.actionLabel}>Comment</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtn} activeOpacity={0.8}>
          <Ionicons name="arrow-redo-outline" size={24} color={white} />
          <Text style={styles.actionLabel}>Share</Text>
        </TouchableOpacity>

        {/* Next tap zone */}
        {currentIdx < PHOTOS.length - 1 && (
          <TouchableOpacity
            style={styles.navBtn}
            onPress={() => setCurrentIdx((i) => i + 1)}
            activeOpacity={0.8}
          />
        )}
      </Animated.View>
    </View>
  );
}

const white = '#FFFFFF';

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },

  header: {
    position: 'absolute', top: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 12,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  headerBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  photoCount: { fontSize: 15, fontWeight: '600', color: white },

  userInfo: {
    position: 'absolute', left: 20,
    flexDirection: 'row', alignItems: 'center', gap: 8,
  },
  userAvatar: { width: 32, height: 32, borderRadius: 16, overflow: 'hidden', borderWidth: 1.5, borderColor: white },
  avatarImg: { width: 29, height: 29 },
  userName: { fontSize: 14, fontWeight: '600', color: white },

  actionBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingTop: 12,
  },
  actionBtn: { alignItems: 'center', gap: 4 },
  actionLabel: { fontSize: 11, color: white, fontWeight: '500' },

  navBtn: {
    position: 'absolute', top: 0, bottom: 0,
    width: '30%',
  },
});
