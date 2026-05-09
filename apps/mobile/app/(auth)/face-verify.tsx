import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image,
  Platform,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withSpring,
  withDelay,
  runOnJS,
} from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { useUserStore } from '@/stores/userStore';
import { colors } from '@/theme/colors';
import { Button } from '@/components/ui/Button';

type Stage = 'instructions' | 'camera' | 'preview' | 'success';

export default function FaceVerifyScreen() {
  const router = useRouter();
  const updateUser = useAuthStore((s) => s.updateUser);
  const setProfile = useUserStore((s) => s.setProfile);

  const [permission, requestPermission] = useCameraPermissions();
  const [stage, setStage] = useState<Stage>('instructions');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const cameraRef = useRef<CameraView>(null);

  // Oval ring pulse animation
  const ringScale = useSharedValue(1);
  const ringOpacity = useSharedValue(0.7);
  // Success badge animation
  const badgeScale = useSharedValue(0);
  const badgeOpacity = useSharedValue(0);
  // Scanning line animation
  const scanY = useSharedValue(0);

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ringScale.value }],
    opacity: ringOpacity.value,
  }));

  const badgeStyle = useAnimatedStyle(() => ({
    transform: [{ scale: badgeScale.value }],
    opacity: badgeOpacity.value,
  }));

  const scanStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: scanY.value }],
  }));

  useEffect(() => {
    if (stage === 'camera') {
      // Pulse the oval guide
      ringScale.value = withRepeat(
        withSequence(
          withTiming(1.04, { duration: 1200 }),
          withTiming(1, { duration: 1200 })
        ),
        -1,
        false
      );
      ringOpacity.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 1200 }),
          withTiming(0.6, { duration: 1200 })
        ),
        -1,
        false
      );
      // Scanning line
      scanY.value = withRepeat(
        withSequence(
          withTiming(240, { duration: 2000 }),
          withTiming(0, { duration: 0 })
        ),
        -1,
        false
      );
    }
  }, [stage]);

  function showSuccess() {
    setStage('success');
    badgeScale.value = withSpring(1, { damping: 10, stiffness: 200 });
    badgeOpacity.value = withTiming(1, { duration: 300 });
  }

  async function handleTakePhoto() {
    if (!cameraRef.current) return;
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: false,
        skipProcessing: Platform.OS === 'android',
      });
      if (photo) {
        setPhotoUri(photo.uri);
        setStage('preview');
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to take photo. Please try again.');
    }
  }

  async function handleSubmit() {
    if (!photoUri) return;
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('selfie', {
        uri: photoUri,
        name: 'selfie.jpg',
        type: 'image/jpeg',
      } as unknown as Blob);

      await api.post('/me/verify-face', formData);
      updateUser({ isVerified: true });
      setProfile({ verified: true });
      showSuccess();
      setTimeout(() => {
        router.replace('/(auth)/permissions');
      }, 1800);
    } catch (e) {
      Alert.alert(
        'Verification failed',
        e instanceof Error ? e.message : 'Please try again with better lighting.'
      );
      setStage('camera');
      setPhotoUri(null);
    } finally {
      setLoading(false);
    }
  }

  async function handleSkip() {
    Alert.alert(
      'Skip face verification?',
      'Your profile won\'t show the verified badge. You can verify later from settings.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Skip anyway',
          style: 'destructive',
          onPress: () => router.replace('/(auth)/permissions'),
        },
      ]
    );
  }

  async function handleStartCamera() {
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        Alert.alert(
          'Camera required',
          'Please allow camera access to take a verification selfie.',
          [{ text: 'OK' }]
        );
        return;
      }
    }
    setStage('camera');
  }

  // Instructions stage
  if (stage === 'instructions') {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.orb1} />
        <View style={styles.orb2} />

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={20} color={colors.text} />
          </TouchableOpacity>
        </View>

        <View style={styles.instructionsContent}>
          {/* Icon */}
          <LinearGradient
            colors={['rgba(124,58,237,0.2)', 'rgba(0,229,255,0.1)']}
            style={styles.iconBg}
          >
            <Ionicons name="shield-checkmark" size={48} color={colors.primary} />
          </LinearGradient>

          <Text style={styles.headline}>Face Verification</Text>
          <Text style={styles.subtext}>
            Take a quick selfie so others know you're a real person. This keeps VYBEON safe for everyone.
          </Text>

          {/* Tips */}
          <View style={styles.tipsCard}>
            {[
              { icon: 'sunny', text: 'Good lighting — face the light source' },
              { icon: 'person-circle', text: 'Look directly at the camera' },
              { icon: 'scan', text: 'Align your face in the oval guide' },
              { icon: 'eye-off', text: 'No sunglasses or hats' },
            ].map((tip) => (
              <View key={tip.text} style={styles.tipRow}>
                <View style={styles.tipIcon}>
                  <Ionicons name={tip.icon as any} size={16} color={colors.accent} />
                </View>
                <Text style={styles.tipText}>{tip.text}</Text>
              </View>
            ))}
          </View>

          {/* Privacy note */}
          <View style={styles.privacyNote}>
            <Ionicons name="lock-closed" size={13} color={colors.subtext} />
            <Text style={styles.privacyText}>
              Your photo is processed securely and never stored publicly.
            </Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Button
            title="Take Selfie"
            onPress={handleStartCamera}
            gradient
            style={styles.actionBtn}
          />
          <TouchableOpacity style={styles.skipBtn} onPress={handleSkip}>
            <Text style={styles.skipText}>Skip for now</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Camera stage
  if (stage === 'camera') {
    return (
      <View style={styles.cameraContainer}>
        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          facing="front"
        />

        {/* Overlay */}
        <View style={styles.cameraOverlay}>
          {/* Top bar */}
          <SafeAreaView edges={['top']}>
            <View style={styles.cameraHeader}>
              <TouchableOpacity
                style={styles.cameraBackBtn}
                onPress={() => setStage('instructions')}
              >
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
              <Text style={styles.cameraTitle}>Position your face</Text>
              <View style={{ width: 40 }} />
            </View>
          </SafeAreaView>

          {/* Oval guide */}
          <View style={styles.ovalGuideWrapper}>
            <Animated.View style={[styles.ovalGuide, ringStyle]}>
              {/* Scanning line */}
              <View style={styles.ovalClip}>
                <Animated.View style={[styles.scanLine, scanStyle]} />
              </View>
            </Animated.View>
            <Text style={styles.ovalHint}>Align your face in the guide</Text>
          </View>

          {/* Bottom controls */}
          <SafeAreaView edges={['bottom']}>
            <View style={styles.cameraControls}>
              <TouchableOpacity
                style={styles.captureBtn}
                onPress={handleTakePhoto}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#7C3AED', '#00E5FF']}
                  style={styles.captureBtnInner}
                >
                  <Ionicons name="camera" size={28} color={colors.text} />
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </View>
      </View>
    );
  }

  // Preview stage
  if (stage === 'preview' && photoUri) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => {
            setPhotoUri(null);
            setStage('camera');
          }}>
            <Ionicons name="arrow-back" size={20} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.previewTitle}>Look good?</Text>
          <View style={{ width: 38 }} />
        </View>

        <View style={styles.previewContent}>
          <View style={styles.previewImageWrapper}>
            <Image source={{ uri: photoUri }} style={styles.previewImage} />
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.3)']}
              style={StyleSheet.absoluteFill}
            />
          </View>

          <Text style={styles.previewHint}>
            Make sure your face is clearly visible and well-lit.
          </Text>
        </View>

        <View style={styles.footer}>
          <Button
            title={loading ? 'Verifying...' : 'Confirm & Verify'}
            onPress={handleSubmit}
            loading={loading}
            gradient
            style={styles.actionBtn}
          />
          <TouchableOpacity
            style={styles.retakeBtn}
            onPress={() => {
              setPhotoUri(null);
              setStage('camera');
            }}
          >
            <Ionicons name="refresh" size={16} color={colors.subtext} />
            <Text style={styles.retakeText}>Retake photo</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Success stage
  if (stage === 'success') {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.successContent}>
          <Animated.View style={[styles.successBadge, badgeStyle]}>
            <LinearGradient
              colors={['rgba(34,197,94,0.2)', 'rgba(34,197,94,0.05)']}
              style={styles.successBadgeInner}
            >
              <Ionicons name="shield-checkmark" size={64} color={colors.success} />
            </LinearGradient>
          </Animated.View>
          <Animated.Text style={[styles.successTitle, badgeStyle]}>
            Verified!
          </Animated.Text>
          <Animated.Text style={[styles.successSubtext, badgeStyle]}>
            You'll now show the verified badge on your profile. People trust verified profiles more.
          </Animated.Text>
        </View>
      </SafeAreaView>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  orb1: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(124,58,237,0.08)',
    top: -60,
    right: -60,
  },
  orb2: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(0,229,255,0.05)',
    bottom: 120,
    left: -50,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  instructionsContent: {
    flex: 1,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBg: {
    width: 100,
    height: 100,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(124,58,237,0.2)',
  },
  headline: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  subtext: {
    fontSize: 14,
    color: colors.subtext,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  tipsCard: {
    width: '100%',
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 12,
    marginBottom: 16,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  tipIcon: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: 'rgba(0,229,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tipText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  privacyNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
  },
  privacyText: {
    color: colors.subtext,
    fontSize: 12,
    flex: 1,
    lineHeight: 18,
  },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 12,
  },
  actionBtn: {
    borderRadius: 16,
  },
  skipBtn: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  skipText: {
    color: colors.subtext,
    fontSize: 14,
    fontWeight: '600',
  },
  // Camera styles
  cameraContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  cameraOverlay: {
    flex: 1,
    justifyContent: 'space-between',
  },
  cameraHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  cameraBackBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  ovalGuideWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  ovalGuide: {
    width: 240,
    height: 300,
    borderRadius: 120,
    borderWidth: 2.5,
    borderColor: 'rgba(124,58,237,0.8)',
    overflow: 'hidden',
    shadowColor: colors.primary,
    shadowOpacity: 0.6,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 0 },
    elevation: 12,
  },
  ovalClip: {
    flex: 1,
    overflow: 'hidden',
  },
  scanLine: {
    height: 2,
    backgroundColor: 'rgba(0,229,255,0.6)',
    shadowColor: colors.accent,
    shadowOpacity: 0.8,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
    elevation: 4,
  },
  ovalHint: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    fontWeight: '500',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  cameraControls: {
    alignItems: 'center',
    paddingVertical: 32,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  captureBtn: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.4)',
    overflow: 'hidden',
  },
  captureBtnInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Preview styles
  previewTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  previewContent: {
    flex: 1,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  previewImageWrapper: {
    width: 240,
    height: 300,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: colors.primary,
    shadowColor: colors.primary,
    shadowOpacity: 0.4,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 0 },
    elevation: 10,
  },
  previewImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  previewHint: {
    color: colors.subtext,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 21,
  },
  retakeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
  },
  retakeText: {
    color: colors.subtext,
    fontSize: 14,
    fontWeight: '600',
  },
  // Success styles
  successContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 20,
  },
  successBadge: {
    marginBottom: 8,
  },
  successBadgeInner: {
    width: 140,
    height: 140,
    borderRadius: 70,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(34,197,94,0.3)',
  },
  successTitle: {
    fontSize: 36,
    fontWeight: '800',
    color: colors.success,
    textAlign: 'center',
  },
  successSubtext: {
    fontSize: 15,
    color: colors.subtext,
    textAlign: 'center',
    lineHeight: 24,
  },
});
