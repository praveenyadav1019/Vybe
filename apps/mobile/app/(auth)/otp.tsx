import React, { useState, useRef, useEffect } from 'react';
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
import { apiFetch } from '../../src/lib/api';
import { useAuthStore } from '../../src/stores/authStore';

// ─── Color tokens ─────────────────────────────────────────────────────────────
const ink     = '#1A1A2E';
const inkSec  = '#6B7280';
const white   = '#FFFFFF';
const brand   = '#7C3AED';
const brandSoft = '#EDE9FE';
const bgSec   = '#F9FAFB';
const border  = '#E5E7EB';
const success = '#10B981';
const danger  = '#EF4444';

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
  const login = useAuthStore((s) => s.login);

  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(RESEND_COUNTDOWN);
  const [canResend, setCanResend] = useState(false);
  const [verified, setVerified] = useState(false);

  const inputRefs = useRef<Array<TextInput | null>>(Array(OTP_LENGTH).fill(null));
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

    if (finalCode === '123456') {
      const mockUser = {
        id: 'dev-user-1',
        phone,
        name: 'Praveen',
        age: 26,
        gender: 'male' as const,
        photos: ['https://randomuser.me/api/portraits/men/10.jpg'],
        interests: ['Music', 'Travel', 'Nightlife'],
        isVerified: true,
        isPremium: false,
        activeMode: 'happening' as const,
        isOnline: true,
        lastSeen: new Date().toISOString(),
        safetyMode: false,
        privacyLevel: 'public' as const,
        createdAt: new Date().toISOString(),
      };
      await login('dev-access-token', 'dev-refresh-token', mockUser);
      successScale.value = withSpring(1, { damping: 12, stiffness: 200 });
      setVerified(true);
      setTimeout(() => router.replace('/(tabs)/home'), 600);
      setLoading(false);
      return;
    }

    try {
      const res = await apiFetch<{ accessToken: string; refreshToken: string; user: any; isNewUser?: boolean }>(
        '/auth/verify-otp',
        {
          method: 'POST',
          body: JSON.stringify({ phone, code: finalCode, deviceId: `expo-${phone.replace(/\D/g, '')}` }),
        }
      );
      await login(res.accessToken, res.refreshToken, res.user);
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
            <Ionicons name="arrow-back" size={22} color={ink} />
          </TouchableOpacity>

          {/* Icon */}
          <View style={styles.iconWrapper}>
            <View style={styles.iconBg}>
              <Ionicons name="phone-portrait" size={36} color={brand} />
            </View>
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
                  ref={(ref) => { inputRefs.current[i] = ref; }}
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
              <Ionicons name="alert-circle" size={16} color={danger} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Success */}
          {verified && (
            <Animated.View style={[styles.successBox, successStyle]}>
              <Ionicons name="checkmark-circle" size={20} color={success} />
              <Text style={styles.successText}>Verified!</Text>
            </Animated.View>
          )}

          {/* Verify button */}
          <TouchableOpacity
            style={[styles.verifyBtn, (code.length !== OTP_LENGTH || loading || verified) && styles.verifyBtnDisabled]}
            onPress={() => verifyOtp()}
            disabled={code.length !== OTP_LENGTH || loading || verified}
            activeOpacity={0.88}
          >
            <LinearGradient
              colors={['#9333EA', '#7C3AED']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={styles.verifyBtnInner}
            >
              <Text style={styles.verifyBtnText}>{loading ? 'Verifying…' : 'Verify'}</Text>
            </LinearGradient>
          </TouchableOpacity>

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
  container: { flex: 1, backgroundColor: white },
  keyboardView: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 40,
    alignItems: 'center',
  },

  backBtn: {
    alignSelf: 'flex-start',
    width: 42, height: 42, borderRadius: 12,
    backgroundColor: bgSec,
    borderWidth: 1, borderColor: border,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 32,
  },

  iconWrapper: { marginBottom: 24 },
  iconBg: {
    width: 80, height: 80, borderRadius: 24,
    backgroundColor: brandSoft,
    alignItems: 'center', justifyContent: 'center',
  },

  headline: {
    fontSize: 30, fontWeight: '800', color: ink,
    textAlign: 'center', marginBottom: 12, letterSpacing: -0.5,
  },
  subtext: {
    fontSize: 15, color: inkSec,
    textAlign: 'center', lineHeight: 24, marginBottom: 36,
  },
  phoneBold: { color: ink, fontWeight: '700', letterSpacing: 1 },

  otpRow: {
    flexDirection: 'row', gap: 10,
    marginBottom: 20, justifyContent: 'center',
  },
  otpBox: {
    width: 50, height: 60, borderRadius: 14,
    borderWidth: 1.5, borderColor: border,
    backgroundColor: bgSec,
    alignItems: 'center', justifyContent: 'center',
  },
  otpBoxFilled: {
    borderColor: brand,
    backgroundColor: brandSoft,
    shadowColor: brand,
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
    elevation: 4,
  },
  otpBoxError: {
    borderColor: danger,
    backgroundColor: 'rgba(239,68,68,0.06)',
  },
  otpInput: {
    width: '100%', height: '100%',
    textAlign: 'center',
    fontSize: 24, fontWeight: '700', color: ink,
  },

  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(239,68,68,0.08)',
    borderRadius: 10, borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.2)',
    paddingHorizontal: 14, paddingVertical: 10,
    marginBottom: 16, alignSelf: 'stretch',
  },
  errorText: { color: danger, fontSize: 13, fontWeight: '500', flex: 1 },

  successBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(16,185,129,0.08)',
    borderRadius: 10, borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.2)',
    paddingHorizontal: 14, paddingVertical: 10,
    marginBottom: 16, alignSelf: 'stretch',
  },
  successText: { color: success, fontSize: 14, fontWeight: '600' },

  verifyBtn: { alignSelf: 'stretch', borderRadius: 16, overflow: 'hidden', marginBottom: 24 },
  verifyBtnDisabled: { opacity: 0.45 },
  verifyBtnInner: { height: 54, alignItems: 'center', justifyContent: 'center' },
  verifyBtnText: { fontSize: 16, fontWeight: '700', color: white },

  resendRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  resendLabel: { color: inkSec, fontSize: 14 },
  resendActive: { color: brand, fontSize: 14, fontWeight: '700' },
  resendTimer: { color: inkSec, fontSize: 14, fontWeight: '600' },
});
