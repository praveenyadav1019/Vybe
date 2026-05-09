import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  StyleSheet,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import type { NearbyUser } from '../../types';
import { colors } from '../../theme/colors';
import { ModeChip } from './ModeChip';

const { width: SCREEN_W } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_W - 48) / 2; // two-column grid with 16px gutter

interface UserCardProps {
  user: NearbyUser;
  onPress?: () => void;
  /** 'sm' = compact grid card | 'lg' = full-width hero card */
  size?: 'sm' | 'lg';
}

export function UserCard({ user, onPress, size = 'sm' }: UserCardProps) {
  const router = useRouter();

  const cardWidth = size === 'lg' ? SCREEN_W - 32 : CARD_WIDTH;
  const cardHeight = size === 'lg' ? 420 : 220;
  const nameFontSize = size === 'lg' ? 22 : 16;
  const iconSize = size === 'lg' ? 18 : 14;

  const handlePress = () => {
    if (onPress) {
      onPress();
      return;
    }
    router.push(`/user/${user.id}`);
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.9}
      style={{ width: cardWidth, height: cardHeight, borderRadius: 20, overflow: 'hidden' }}
    >
      {/* Photo */}
      <Image
        source={{
          uri: user.photos[0] ?? 'https://ui-avatars.com/api/?name=' + encodeURIComponent(user.name) + '&background=7C3AED&color=fff&size=400',
        }}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
      />

      {/* Gradient overlay */}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.88)']}
        style={[StyleSheet.absoluteFill, { justifyContent: 'flex-end' }]}
      >
        <View style={{ padding: 12 }}>
          {/* Name + verified */}
          <View style={styles.nameRow}>
            <Text
              style={[styles.name, { fontSize: nameFontSize }]}
              numberOfLines={1}
            >
              {user.name}, {user.age}
            </Text>
            {user.isVerified && (
              <Ionicons
                name="checkmark-circle"
                size={iconSize}
                color={colors.accent}
              />
            )}
          </View>

          {/* Online indicator + distance + mode */}
          <View style={styles.metaRow}>
            <View style={styles.onlineRow}>
              <View
                style={[
                  styles.onlineDot,
                  {
                    backgroundColor: user.isOnline
                      ? colors.success
                      : colors.subtext,
                  },
                ]}
              />
              <Text style={styles.distance}>{user.distance}</Text>
            </View>
            <ModeChip mode={user.activeMode} size="xs" />
          </View>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  name: {
    color: '#FFF',
    fontWeight: '700',
    flexShrink: 1,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  onlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  distance: {
    color: colors.subtext,
    fontSize: 11,
  },
});
