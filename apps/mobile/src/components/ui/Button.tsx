import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '@/theme/colors';

type Variant = 'primary' | 'outline' | 'ghost' | 'danger';

export interface ButtonProps {
  title: string;
  onPress?: () => void;
  variant?: Variant;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  gradient?: boolean;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  disabled,
  loading,
  style,
  textStyle,
  gradient = false,
}: ButtonProps) {
  const isDisabled = disabled || loading;

  const inner = loading ? (
    <ActivityIndicator color={variant === 'primary' || variant === 'danger' ? '#FFFFFF' : colors.primary} />
  ) : (
    <Text
      style={[
        styles.text,
        variant === 'primary' && styles.textPrimary,
        variant === 'outline' && styles.textOutline,
        variant === 'ghost' && styles.textGhost,
        variant === 'danger' && styles.textDanger,
        textStyle,
      ]}
    >
      {title}
    </Text>
  );

  if (gradient && !isDisabled) {
    return (
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        disabled={isDisabled}
        style={({ pressed }) => [pressed && styles.pressed, style]}
      >
        <LinearGradient
          colors={['#7C3AED', '#6D28D9']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.base}
        >
          {inner}
        </LinearGradient>
      </Pressable>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        variant === 'primary' && styles.primary,
        variant === 'outline' && styles.outline,
        variant === 'ghost' && styles.ghost,
        variant === 'danger' && styles.danger,
        pressed && !isDisabled && styles.pressed,
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {inner}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 52,
    paddingHorizontal: 20,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: {
    backgroundColor: colors.primary,
  },
  outline: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'transparent',
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  danger: {
    backgroundColor: colors.danger,
  },
  pressed: {
    opacity: 0.85,
  },
  disabled: {
    opacity: 0.4,
  },
  text: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  textPrimary: { color: '#FFFFFF' },
  textOutline: { color: colors.text },
  textGhost: { color: colors.primary },
  textDanger: { color: '#FFFFFF' },
});
