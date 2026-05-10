/**
 * Authentication Welcome Screen
 * Pixel-perfect recreation of the reference design (authentication_screen/screen.png).
 *
 * Layout:
 *  ┌─────────────────────────────────┐
 *  │  Photo / gradient area  (~52%)  │  ← dark social-scene gradient
 *  │        VYBEON wordmark          │
 *  ├─────────────────────────────────┤
 *  │         "Sign In"  h2           │
 *  │      [ Sign In  ]  outline btn  │  white section
 *  │  [ Create Account ] gold btn    │
 *  │      — Or continue with —       │
 *  │        🍎      G                │
 *  │   terms & privacy footnote      │
 *  └─────────────────────────────────┘
 *
 * "Sign In" press → expands an inline phone-input panel (slide-up)
 * "Create Account" → /(auth)/onboarding
 */

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { apiFetch } from '@/lib/api';
import { C, T, S, R, SH, ANIM, DIM } from '@/design/tokens';

const { width, height } = Dimensions.get('window');

// Hero section takes 52% of screen height
const HERO_H = height * 0.52;
// Phone panel expansion height
const PHONE_PANEL_H = 200;

const COUNTRY_CODES = [
  { code: '+91',  flag: '🇮🇳', name: 'India',     maxLen: 10 },
  { code: '+1',   flag: '🇺🇸', name: 'USA',       maxLen: 10 },
  { code: '+44',  flag: '🇬🇧', name: 'UK',        maxLen: 10 },
  { code: '+971', flag: '🇦🇪', name: 'UAE',       maxLen: 9  },
  { code: '+65',  flag: '🇸🇬', name: 'Singapore', maxLen: 8  },
  { code: '+61',  flag: '🇦🇺', name: 'Australia', maxLen: 9  },
];

// ─── Social button ─────────────────────────────────────────────────────────────

function SocialBtn({
  children,
  onPress,
  dark,
}: {
  children: React.ReactNode;
  onPress: () => void;
  dark?: boolean;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.82}
      style={[ss.socialBtn, dark ? ss.socialBtnDark : ss.socialBtnLight]}
    >
      {children}
    </TouchableOpacity>
  );
}

// ─── Main screen ───────────────────────────────────────────────────────────────

export default function AuthWelcomeScreen() {
  const router   = useRouter();
  const insets   = useSafeAreaInsets();
  const phoneRef = useRef<TextInput>(null);

  const [showPhone, setShowPhone]         = useState(false);
  const [country,   setCountry]           = useState(COUNTRY_CODES[0]);
  const [phone,     setPhone]             = useState('');
  const [loading,   setLoading]           = useState(false);
  const [error,     setError]             = useState<string | null>(null);
  const [showPicker, setShowPicker]       = useState(false);

  // ── Animation ─────────────────────────────────────────────────────────────
  const panelH    = useSharedValue(0);
  const panelOpac = useSharedValue(0);

  const panelStyle = useAnimatedStyle(() => ({
    height:  panelH.value,
    opacity: panelOpac.value,
    overflow: 'hidden',
  }));

  function openPhonePanel() {
    setShowPhone(true);
    panelH.value    = withSpring(PHONE_PANEL_H, ANIM.spring.snappy);
    panelOpac.value = withTiming(1, { duration: 250, easing: Easing.out(Easing.cubic) });
    setTimeout(() => phoneRef.current?.focus(), 300);
  }

  function closePhonePanel() {
    panelH.value    = withSpring(0, ANIM.spring.snappy);
    panelOpac.value = withTiming(0, { duration: 180 });
    setTimeout(() => setShowPhone(false), 220);
    setPhone('');
    setError(null);
  }

  // ── Auth handlers ─────────────────────────────────────────────────────────
  const fullPhone = `${country.code}${phone}`;
  const isValid   = phone.length === country.maxLen && /^\d+$/.test(phone);

  async function handleSendOtp() {
    if (!isValid) {
      setError(`Enter a valid ${country.maxLen}-digit number`);
      return;
    }
    setError(null);
    setLoading(true);

    router.push({ pathname: '/(auth)/otp', params: { phone: fullPhone } });

    apiFetch('/auth/send-otp', {
      method: 'POST',
      body: JSON.stringify({ phone: fullPhone }),
    })
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  const handleSignIn     = () => (showPhone ? handleSendOtp() : openPhonePanel());
  const handleCreateAcct = () => router.push('/(auth)/onboarding');
  const handleSocial     = () => openPhonePanel();

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: C.bgPrimary }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <StatusBar barStyle="light-content" />

      {/* ── HERO: gradient simulating nightlife photo ─────────────────────── */}
      <View style={[s.hero, { paddingTop: insets.top }]}>
        {/* Background gradient layers */}
        <LinearGradient
          colors={['#1A0A35', '#3B1A75', '#7B3FAF', 'rgba(245,240,255,0)']}
          locations={[0, 0.38, 0.72, 1]}
          style={StyleSheet.absoluteFillObject}
        />

        {/* Warm ambient orbs */}
        <View style={s.orb1} />
        <View style={s.orb2} />

        {/* VYBEON brand over the hero */}
        <View style={s.brand}>
          <Text style={s.brandText}>VYBEON</Text>
          <Text style={s.brandSub}>Meet. Connect. Vibe.</Text>
        </View>
      </View>

      {/* ── WHITE CONTENT SECTION ─────────────────────────────────────────── */}
      <View style={[s.sheet, { paddingBottom: insets.bottom + S[4] }]}>

        {/* Page heading */}
        <Text style={s.heading}>Sign In</Text>

        {/* ── Animated phone panel ──────────────────────────────────────── */}
        <Animated.View style={panelStyle}>
          {/* Country picker row */}
          {showPicker && (
            <View style={s.pickerList}>
              {COUNTRY_CODES.map((c) => (
                <TouchableOpacity
                  key={c.code}
                  style={s.pickerItem}
                  onPress={() => { setCountry(c); setShowPicker(false); }}
                >
                  <Text style={s.pickerFlag}>{c.flag}</Text>
                  <Text style={s.pickerName}>{c.name}</Text>
                  <Text style={s.pickerCode}>{c.code}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <View style={s.phoneRow}>
            {/* Country selector */}
            <TouchableOpacity
              style={s.countrySel}
              onPress={() => setShowPicker(!showPicker)}
              activeOpacity={0.75}
            >
              <Text style={s.countryFlag}>{country.flag}</Text>
              <Text style={s.countryCode}>{country.code}</Text>
              <Ionicons
                name={showPicker ? 'chevron-up' : 'chevron-down'}
                size={13}
                color={C.textMuted}
              />
            </TouchableOpacity>

            {/* Phone input */}
            <TextInput
              ref={phoneRef}
              style={s.phoneInput}
              placeholder="Phone number"
              placeholderTextColor={C.textPlaceholder}
              keyboardType="phone-pad"
              value={phone}
              onChangeText={(t) => { setPhone(t); setError(null); }}
              maxLength={country.maxLen}
              returnKeyType="done"
              onSubmitEditing={handleSendOtp}
            />

            {/* Close */}
            <TouchableOpacity onPress={closePhonePanel} style={s.phoneClose}>
              <Ionicons name="close-circle" size={20} color={C.textMuted} />
            </TouchableOpacity>
          </View>

          {error ? <Text style={s.errorText}>{error}</Text> : null}
        </Animated.View>

        {/* ── Sign In button ─────────────────────────────────────────────── */}
        <TouchableOpacity
          style={s.btnOutline}
          onPress={handleSignIn}
          activeOpacity={0.82}
        >
          {loading ? (
            <ActivityIndicator color={C.textPrimary} />
          ) : (
            <Text style={s.btnOutlineText}>
              {showPhone ? 'Continue' : 'Sign In'}
            </Text>
          )}
        </TouchableOpacity>

        {/* ── Create Account button ─────────────────────────────────────── */}
        <TouchableOpacity
          style={s.btnGold}
          onPress={handleCreateAcct}
          activeOpacity={0.86}
        >
          <LinearGradient
            colors={['#D4A853', '#C9A84C']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={s.btnGoldInner}
          >
            <Text style={s.btnGoldText}>Create Account</Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* ── Divider ────────────────────────────────────────────────────── */}
        <View style={s.dividerRow}>
          <View style={s.dividerLine} />
          <Text style={s.dividerText}>Or continue with</Text>
          <View style={s.dividerLine} />
        </View>

        {/* ── Social buttons ─────────────────────────────────────────────── */}
        <View style={s.socialRow}>
          {/* Apple */}
          <SocialBtn onPress={handleSocial} dark>
            <Ionicons name="logo-apple" size={22} color="#FFFFFF" />
          </SocialBtn>

          {/* Google */}
          <SocialBtn onPress={handleSocial}>
            <Text style={ss.googleG}>G</Text>
          </SocialBtn>
        </View>

        {/* ── Footer ─────────────────────────────────────────────────────── */}
        <Text style={s.footer}>
          By continuing, you agree to our{' '}
          <Text style={s.footerLink}>Terms of Service</Text>
          {' '}and{' '}
          <Text style={s.footerLink}>Privacy Policy</Text>
          .
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  // ── Hero ──────────────────────────────────────────────────────────────────
  hero: {
    height: HERO_H,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    paddingHorizontal: S.screenH,
    paddingBottom: S[8],
  },
  orb1: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(168,85,247,0.18)',
    top: -60,
    right: -80,
  },
  orb2: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(124,58,237,0.14)',
    bottom: 60,
    left: -60,
  },
  brand: {
    alignItems: 'center',
  },
  brandText: {
    fontSize: T.size['2xl'],
    fontWeight: T.weight.black,
    color: '#FFFFFF',
    letterSpacing: T.tracking.widest,
  },
  brandSub: {
    fontSize: T.size.sm,
    fontWeight: T.weight.regular,
    color: 'rgba(255,255,255,0.65)',
    marginTop: 4,
    letterSpacing: 0.4,
  },

  // ── White sheet ───────────────────────────────────────────────────────────
  sheet: {
    flex: 1,
    backgroundColor: C.bgPrimary,
    paddingHorizontal: S.screenH + 4,
    paddingTop: S[5],
  },
  heading: {
    fontSize: T.size['3xl'],       // 28px
    fontWeight: T.weight.bold,
    color: C.textPrimary,
    marginBottom: S[4],
  },

  // ── Phone panel ───────────────────────────────────────────────────────────
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.bgInput,
    borderRadius: R.input,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: S[3],
    paddingHorizontal: S[3],
    height: DIM.inputHeight,
  },
  countrySel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingRight: S[3],
    borderRightWidth: 1,
    borderRightColor: C.border,
    marginRight: S[2],
  },
  countryFlag: { fontSize: 18 },
  countryCode: {
    fontSize: T.size.md,
    fontWeight: T.weight.medium,
    color: C.textPrimary,
  },
  phoneInput: {
    flex: 1,
    fontSize: T.size.md,
    color: C.textPrimary,
  },
  phoneClose: { padding: 4 },
  errorText: {
    fontSize: T.size.sm,
    color: C.danger,
    marginBottom: S[2],
    marginLeft: 2,
  },
  pickerList: {
    backgroundColor: C.bgCard,
    borderRadius: R.md,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: S[2],
    ...SH.md,
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: S[4],
    paddingVertical: S[3],
    gap: S[3],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.borderLight,
  },
  pickerFlag: { fontSize: 20 },
  pickerName: {
    flex: 1,
    fontSize: T.size.md,
    color: C.textPrimary,
    fontWeight: T.weight.medium,
  },
  pickerCode: {
    fontSize: T.size.base,
    color: C.textSecondary,
  },

  // ── Buttons ───────────────────────────────────────────────────────────────
  btnOutline: {
    height: DIM.buttonHeight,
    borderRadius: R.button,
    borderWidth: 1.2,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: S[3],
    backgroundColor: C.bgPrimary,
  },
  btnOutlineText: {
    fontSize: T.size.md,
    fontWeight: T.weight.semibold,
    color: C.textPrimary,
  },

  btnGold: {
    height: DIM.buttonHeight,
    borderRadius: R.button,
    overflow: 'hidden',
    marginBottom: S[5],
    ...SH.gold,
  },
  btnGoldInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnGoldText: {
    fontSize: T.size.md,
    fontWeight: T.weight.semibold,
    color: '#FFFFFF',
  },

  // ── Divider ───────────────────────────────────────────────────────────────
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S[3],
    marginBottom: S[5],
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: C.border,
  },
  dividerText: {
    fontSize: T.size.base,
    color: C.textMuted,
    fontWeight: T.weight.regular,
  },

  // ── Social ────────────────────────────────────────────────────────────────
  socialRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: S[4],
    marginBottom: S[6],
  },

  // ── Footer ────────────────────────────────────────────────────────────────
  footer: {
    fontSize: T.size.xs,           // 11px
    color: C.textMuted,
    textAlign: 'center',
    lineHeight: 16,
  },
  footerLink: {
    color: C.textSecondary,
    fontWeight: T.weight.medium,
  },
});

const ss = StyleSheet.create({
  socialBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    ...SH.sm,
  },
  socialBtnDark: {
    backgroundColor: '#000000',
  },
  socialBtnLight: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: C.border,
  },
  googleG: {
    fontSize: 20,
    fontWeight: '700',
    color: '#4285F4',
    letterSpacing: -0.5,
  },
});
