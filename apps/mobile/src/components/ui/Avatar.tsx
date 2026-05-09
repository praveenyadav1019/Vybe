import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { colors } from '../../theme/colors';

interface AvatarProps {
  uri?: string;
  name?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showOnline?: boolean;
  isOnline?: boolean;
}

const DIMS: Record<NonNullable<AvatarProps['size']>, number> = {
  xs: 28,
  sm: 36,
  md: 48,
  lg: 64,
  xl: 96,
};

const FONT_SIZES: Record<NonNullable<AvatarProps['size']>, number> = {
  xs: 10,
  sm: 13,
  md: 18,
  lg: 24,
  xl: 36,
};

export function Avatar({
  uri,
  name,
  size = 'md',
  showOnline = false,
  isOnline = false,
}: AvatarProps) {
  const dim = DIMS[size];
  const fontSize = FONT_SIZES[size];
  const initials = name
    ? name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : '?';

  return (
    <View style={{ width: dim, height: dim }}>
      {uri ? (
        <Image
          source={{ uri }}
          style={{
            width: dim,
            height: dim,
            borderRadius: dim / 2,
          }}
          contentFit="cover"
        />
      ) : (
        <View
          style={[
            styles.placeholder,
            { width: dim, height: dim, borderRadius: dim / 2 },
          ]}
        >
          <Text style={{ color: '#FFF', fontSize, fontWeight: '700' }}>
            {initials}
          </Text>
        </View>
      )}

      {showOnline && (
        <View
          style={[
            styles.onlineDot,
            {
              width: dim * 0.28,
              height: dim * 0.28,
              borderRadius: (dim * 0.28) / 2,
              backgroundColor: isOnline ? colors.success : colors.subtext,
            },
          ]}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  placeholder: {
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 1,
    right: 1,
    borderWidth: 2,
    borderColor: colors.card,
  },
});
