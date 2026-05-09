import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiFetch } from '@/lib/api';
import { colors } from '@/theme/colors';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

const COUNTRY_CODES = [
  { code: '+91', flag: '🇮🇳', name: 'India', maxLen: 10 },
  { code: '+1', flag: '🇺🇸', name: 'USA', maxLen: 10 },
  { code: '+44', flag: '🇬🇧', name: 'UK', maxLen: 10 },
  { code: '+971', flag: '🇦🇪', name: 'UAE', maxLen: 9 },
  { code: '+65', flag: '🇸🇬', name: 'Singapore', maxLen: 8 },
  { code: '+61', flag: '🇦🇺', name: 'Australia', maxLen: 9 },
];

export default function LoginScreen() {
  const router = useRouter();
  const [selectedCountry, setSelectedCountry] = useState(COUNTRY_CODES[0]);
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCountryPicker, setShowCountryPicker] = useState(false);

  const phoneInputRef = useRef<TextInput>(null);

  const fullPhone = `${selectedCountry.code}${phone}`;
  const isValid = phone.length === selectedCountry.maxLen && /^\d+$/.test(phone);

  async function handleSendOtp() {
    if (!isValid) {
      setError(`Please enter a valid ${selectedCountry.maxLen}-digit phone number`);
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await apiFetch('/auth/send-otp', {
        method: 'POST',
        body: JSON.stringify({ phone: fullPhone }),
      });
      router.push({
        pathname: '/(auth)/otp',
        params: { phone: fullPhone, countryCode: selectedCountry.code },
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to send OTP. Please try again.');
    } finally {
      setLoading(false);
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
          {/* Header */}
          <View style={styles.header}>
            <LinearGradient
              colors={['#7C3AED', '#00E5FF']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.logoGradient}
            >
              <Text style={styles.logoText}>VYBEON</Text>
            </LinearGradient>
          </View>

          {/* Form card */}
          <View style={styles.card}>
            <Text style={styles.headline}>Enter your{'\n'}phone number</Text>
            <Text style={styles.subtext}>
              We'll send you a 6-digit code to verify it's really you.
            </Text>

            {/* Country + Phone row */}
            <View style={styles.phoneRow}>
              {/* Country code selector */}
              <TouchableOpacity
                style={styles.countrySelector}
                onPress={() => setShowCountryPicker(!showCountryPicker)}
                activeOpacity={0.7}
              >
                <Text style={styles.countryFlag}>{selectedCountry.flag}</Text>
                <Text style={styles.countryCode}>{selectedCountry.code}</Text>
                <Ionicons
                  name={showCountryPicker ? 'chevron-up' : 'chevron-down'}
                  size={14}
                  color={colors.subtext}
                />
              </TouchableOpacity>

              {/* Phone input */}
              <Input
                ref={phoneInputRef}
                containerStyle={styles.phoneInputContainer}
                placeholder={`${selectedCountry.maxLen}-digit number`}
                keyboardType="phone-pad"
                value={phone}
                onChangeText={(t) => {
                  const cleaned = t.replace(/\D/g, '').slice(0, selectedCountry.maxLen);
                  setPhone(cleaned);
                  if (error) setError(null);
                }}
                maxLength={selectedCountry.maxLen}
                returnKeyType="done"
                onSubmitEditing={handleSendOtp}
                style={styles.phoneInput}
              />
            </View>

            {/* Country picker dropdown */}
            {showCountryPicker && (
              <View style={styles.countryDropdown}>
                {COUNTRY_CODES.map((country) => (
                  <TouchableOpacity
                    key={country.code}
                    style={[
                      styles.countryOption,
                      selectedCountry.code === country.code && styles.countryOptionActive,
                    ]}
                    onPress={() => {
                      setSelectedCountry(country);
                      setShowCountryPicker(false);
                      setPhone('');
                      phoneInputRef.current?.focus();
                    }}
                  >
                    <Text style={styles.countryOptionFlag}>{country.flag}</Text>
                    <Text style={styles.countryOptionName}>{country.name}</Text>
                    <Text style={styles.countryOptionCode}>{country.code}</Text>
                    {selectedCountry.code === country.code && (
                      <Ionicons name="checkmark" size={16} color={colors.primary} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Error message */}
            {error && (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={16} color={colors.danger} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {/* Send OTP button */}
            <Button
              title={loading ? 'Sending...' : 'Send OTP'}
              onPress={handleSendOtp}
              disabled={!isValid}
              loading={loading}
              gradient
              style={styles.sendBtn}
            />

            {/* Phone number display */}
            {phone.length > 0 && (
              <Text style={styles.phonePill}>
                Sending to {selectedCountry.flag} {selectedCountry.code} {phone}
              </Text>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Terms */}
      <View style={styles.termsContainer}>
        <Text style={styles.termsText}>
          By continuing, you agree to our{' '}
          <Text style={styles.termsLink}>Terms of Service</Text>
          {' and '}
          <Text style={styles.termsLink}>Privacy Policy</Text>
        </Text>
      </View>
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
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: 'rgba(124,58,237,0.1)',
    top: -100,
    right: -100,
  },
  orb2: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(0,229,255,0.06)',
    bottom: 60,
    left: -80,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
    marginTop: 12,
  },
  logoGradient: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  logoText: {
    fontSize: 28,
    fontWeight: '900',
    color: colors.text,
    letterSpacing: -0.5,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 24,
    shadowColor: colors.primary,
    shadowOpacity: 0.1,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  headline: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.5,
    marginBottom: 12,
    lineHeight: 40,
  },
  subtext: {
    fontSize: 15,
    color: colors.subtext,
    lineHeight: 22,
    marginBottom: 28,
    fontWeight: '400',
  },
  phoneRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
    alignItems: 'center',
  },
  countrySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    minWidth: 90,
  },
  countryFlag: {
    fontSize: 18,
  },
  countryCode: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  phoneInputContainer: {
    flex: 1,
  },
  phoneInput: {
    fontSize: 18,
    letterSpacing: 1,
    fontWeight: '600',
  },
  countryDropdown: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
    overflow: 'hidden',
  },
  countryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  countryOptionActive: {
    backgroundColor: 'rgba(124,58,237,0.1)',
  },
  countryOptionFlag: {
    fontSize: 20,
  },
  countryOptionName: {
    flex: 1,
    color: colors.text,
    fontSize: 15,
    fontWeight: '500',
  },
  countryOptionCode: {
    color: colors.subtext,
    fontSize: 14,
    fontWeight: '500',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(239,68,68,0.1)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.25)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
  },
  errorText: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  sendBtn: {
    marginTop: 8,
    borderRadius: 16,
  },
  phonePill: {
    marginTop: 14,
    textAlign: 'center',
    color: colors.subtext,
    fontSize: 13,
    fontWeight: '500',
  },
  termsContainer: {
    paddingHorizontal: 24,
    paddingBottom: 12,
    paddingTop: 16,
  },
  termsText: {
    textAlign: 'center',
    color: colors.subtext,
    fontSize: 12,
    lineHeight: 18,
  },
  termsLink: {
    color: colors.accent,
    fontWeight: '600',
  },
});
