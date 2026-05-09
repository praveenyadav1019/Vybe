import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Vibration,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  withSpring,
} from 'react-native-reanimated';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { apiFetch } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { colors } from '@/theme/colors';
import { Button } from '@/components/ui/Button';

const OTP_LENGTH = 6;
const RESEND_COUNTDOWN = 60;

function maskPhone(phone: string): string {
  if (phone.length <= 4) return phone;
  const visible = phone.slice(-4);
  const masked = phone.slice(0, -4).replace(/\d/g, '•');
  return masked + visible;
}

export default function OtpScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ phone: string; countryCode: string }>();
  const phone = params.phone ?? '';
  const setToken = useAuthStore((s) => s.setToken);

  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(RESEND_COUNTDOWN);
  const [canResend, setCanResend] = useState(false);
  const [verified, setVerified] = useState(false);

  const inputRefs = useRef<Array<TextInput | null>>(Array(OTP_LENGTH).fill(null));
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Shake animation for error
  const shakeX = useSharedValue(0);
  const successScale = useSharedValue(0);

  const errorShake = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeX.value }],
  }));
  const successStyle = useAnimatedStyle(() => ({
    transform: [{ scale: successScale.value }],
    opacity: successScale.value,
  }));

  function triggerShake() {
    shakeX.value = withSequence(
      withTiming(-10, { duration: 60 }),
      withTiming(10, { duration: 60 }),
      withTiming(-8, { duration: 60 }),
      withTiming(8, { duration: 60 }),
      withTiming(-4, { duration: 60 }),
      withTiming(0, { duration: 60 })
    );
    Vibration.vibrate(300);
  }

  // Countdown timer
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          setCanResend(true);
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Auto-submit when all digits entered
  const code = digits.join('');
  const prevCodeRef = useRef('');
  useEffect(() => {
    if (code.length === OTP_LENGTH && code !== prevCodeRef.current && !loading) {
      prevCodeRef.current = code;
      verifyOtp(code);
    }
  }, [code]);

  async function verifyOtp(otp?: string) {
    const finalCode = otp ?? digits.join('');
    if (finalCode.length !== OTP_LENGTH) return;
    setError(null);
    setLoading(true);
    try {
      const res = await apiFetch<{ accessToken: string; isNewUser?: boolean }>(
        '/auth/verify-otp',
        {
          method: 'POST',
          body: JSON.stringify({ phone, code: finalCode }),
        }
      );
      await setToken(res.accessToken);
      // Success animation
      successScale.value = withSpring(1, { damping: 12, stiffness: 200 });
      setVerified(true);
      setTimeout(() => {
        if (res.isNewUser) {
          router.replace('/(auth)/profile-setup');
        } else {
          router.replace('/(tabs)/home');
        }
      }, 600);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Invalid or expired OTP. Please try again.');
      triggerShake();
      // Clear the digits
      setDigits(Array(OTP_LENGTH).fill(''));
      prevCodeRef.current = '';
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (!canResend) return;
    setCanResend(false);
    setCountdown(RESEND_COUNTDOWN);
    setDigits(Array(OTP_LENGTH).fill(''));
    setError(null);
    prevCodeRef.current = '';
    try {
      await apiFetch('/auth/send-otp', {
        method: 'POST',
        body: JSON.stringify({ phone }),
      });
    } catch {
      setError('Failed to resend OTP.');
    }
    // Restart timer
    timerRef.current = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          setCanResend(true);
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    setTimeout(() => inputRefs.current[0]?.focus(), 100);
  }

  function handleChange(text: string, index: number) {
    const val = text.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[index] = val;
    setDigits(next);
    if (error) setError(null);

    if (val && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handleKeyPress(key: string, index: number) {
    if (key === 'Backspace') {
      if (digits[index]) {
        const next = [...digits];
        next[index] = '';
        setDigits(next);
      } else if (index > 0) {
        const next = [...digits];
        next[index - 1] = '';
        setDigits(next);
        inputRefs.current[index - 1]?.focus();
      }
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Background orbs */}
      <View style={styles.orb1} />
      <View style={styles.orb2} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 24}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Back button */}
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </TouchableOpacity>

          {/* Icon */}
          <View style={styles.iconWrapper}>
            <LinearGradient
              colors={['rgba(124,58,237,0.2)', 'rgba(0,229,255,0.1)']}
              style={styles.iconBg}
            >
              <Ionicons name="phone-portrait" size={36} color={colors.accent} />
            </LinearGradient>
          </View>

          <Text style={styles.headline}>Verify your number</Text>
          <Text style={styles.subtext}>
            We sent a 6-digit code to{'\n'}
            <Text style={styles.phoneBold}>{maskPhone(phone)}</Text>
          </Text>

          {/* OTP boxes */}
          <Animated.View style={[styles.otpRow, errorShake]}>
            {digits.map((digit, i) => (
              <View
                key={i}
                style={[
                  styles.otpBox,
                  digit ? styles.otpBoxFilled : null,
                  error ? styles.otpBoxError : null,
                ]}
              >
                <TextInput
                  ref={(ref) => {
                    inputRefs.current[i] = ref;
                  }}
                  style={styles.otpInput}
                  value={digit}
                  onChangeText={(t) => handleChange(t, i)}
                  onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, i)}
                  keyboardType="number-pad"
                  maxLength={1}
                  selectTextOnFocus
                  caretHidden
                  autoFocus={i === 0}
                  editable={!loading && !verified}
                />
              </View>
            ))}
          </Animated.View>

          {/* Error */}
          {error && (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={16} color={colors.danger} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Success indicator */}
          {verified && (
            <Animated.View style={[styles.successBox, successStyle]}>
              <Ionicons name="checkmark-circle" size={20} color={colors.success} />
              <Text style={styles.successText}>Verified!</Text>
            </Animated.View>
          )}

          {/* Verify button */}
          <Button
            title={loading ? 'Verifying...' : 'Verify'}
            onPress={() => verifyOtp()}
            disabled={code.length !== OTP_LENGTH || loading || verified}
            loading={loading}
            gradient
            style={styles.verifyBtn}
          />

          {/* Resend */}
          <View style={styles.resendRow}>
            <Text style={styles.resendLabel}>Didn't receive the code?</Text>
            {canResend ? (
              <TouchableOpacity onPress={handleResend}>
                <Text style={styles.resendActive}>Resend OTP</Text>
              </TouchableOpacity>
            ) : (
              <Text style={styles.resendTimer}>Resend in {countdown}s</Text>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  orb1: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(124,58,237,0.1)',
    top: -60,
    left: -80,
  },
  orb2: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(0,229,255,0.07)',
    bottom: 100,
    right: -50,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 40,
    alignItems: 'center',
  },
  backBtn: {
    alignSelf: 'flex-start',
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  iconWrapper: {
    marginBottom: 24,
  },
  iconBg: {
    width: 80,
    height: 80,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,229,255,0.2)',
  },
  headline: {
    fontSize: 30,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  subtext: {
    fontSize: 15,
    color: colors.subtext,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 36,
  },
  phoneBold: {
    color: colors.text,
    fontWeight: '700',
    letterSpacing: 1,
  },
  otpRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
    justifyContent: 'center',
  },
  otpBox: {
    width: 50,
    height: 60,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  otpBoxFilled: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(124,58,237,0.08)',
    shadowColor: colors.primary,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
    elevation: 4,
  },
  otpBoxError: {
    borderColor: colors.danger,
    backgroundColor: 'rgba(239,68,68,0.06)',
  },
  otpInput: {
    width: '100%',
    height: '100%',
    textAlign: 'center',
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(239,68,68,0.1)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.25)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
    alignSelf: 'stretch',
  },
  errorText: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  successBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(34,197,94,0.1)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.25)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
    alignSelf: 'stretch',
  },
  successText: {
    color: colors.success,
    fontSize: 14,
    fontWeight: '600',
  },
  verifyBtn: {
    alignSelf: 'stretch',
    borderRadius: 16,
    marginBottom: 24,
  },
  resendRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  resendLabel: {
    color: colors.subtext,
    fontSize: 14,
  },
  resendActive: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: '700',
  },
  resendTimer: {
    color: colors.subtext,
    fontSize: 14,
    fontWeight: '600',
  },
});
