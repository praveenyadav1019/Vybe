import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Image,
  Alert,
  Modal,
  Pressable,
  Dimensions,
} from 'react-native';

const { width: SCREEN_W } = Dimensions.get('window');
const AVATAR_SIZE = (SCREEN_W - 40 - 28) / 3;
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { AVATARS, isRemotePhoto } from '@/lib/avatars';
import { uploadPhoto } from '@/lib/uploadPhoto';
import { colors } from '@/theme/colors';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import type { Gender } from '@/types';

const GENDERS: { label: string; value: Gender; icon: string }[] = [
  { label: 'Male', value: 'male', icon: '♂' },
  { label: 'Female', value: 'female', icon: '♀' },
  { label: 'Non-binary', value: 'non-binary', icon: '⚧' },
  { label: 'Prefer not to say', value: 'prefer-not-to-say', icon: '◎' },
];

const MAX_BIO = 160;
const PHOTO_SLOTS = 6;

const STEPS = ['Basic Info', 'About You', 'Photos'];

// Fake ImagePicker fallback (real expo-image-picker used if available)
async function pickImage(): Promise<string | null> {
  try {
    // Dynamic import so the screen doesn't crash if expo-image-picker isn't installed
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const ImagePicker = require('expo-image-picker');
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Allow access to your photo library to upload photos.');
      return null;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.85,
    });
    if (!result.canceled && result.assets?.[0]) {
      return result.assets[0].uri;
    }
    return null;
  } catch {
    Alert.alert('Photo picker unavailable', 'expo-image-picker is not installed.');
    return null;
  }
}

export default function ProfileSetupScreen() {
  const router = useRouter();
  const token = useAuthStore((s) => s.token);
  const updateUser = useAuthStore((s) => s.updateUser);

  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState<Gender | null>(null);
  const [bio, setBio] = useState('');
  const [photos, setPhotos] = useState<(string | null)[]>(Array(PHOTO_SLOTS).fill(null));
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [targetIndex, setTargetIndex] = useState<number | null>(null);
  const [sheet, setSheet] = useState<'menu' | 'avatars' | null>(null);

  // Progress bar animation
  const progressWidth = useSharedValue(0);
  const progressStyle = useAnimatedStyle(() => ({
    width: `${progressWidth.value}%`,
  }));

  React.useEffect(() => {
    progressWidth.value = withSpring(((step + 1) / STEPS.length) * 100, {
      damping: 20,
      stiffness: 120,
    });
  }, [step]);

  function validateStep(): boolean {
    const errs: Record<string, string> = {};
    if (step === 0) {
      if (!name.trim()) errs.name = 'Name is required';
      else if (name.trim().length < 2) errs.name = 'Name must be at least 2 characters';
      const ageNum = parseInt(age, 10);
      if (!age) errs.age = 'Age is required';
      else if (isNaN(ageNum) || ageNum < 18 || ageNum > 40) errs.age = 'Age must be between 18 and 40';
    } else if (step === 1) {
      if (!gender) errs.gender = 'Please select your gender';
    } else if (step === 2) {
      if (!photos[0]) errs.photos = 'At least one photo is required';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleNext() {
    if (!validateStep()) return;
    if (step < STEPS.length - 1) {
      setStep((s) => s + 1);
      return;
    }
    // Final submit
    setLoading(true);
    try {
      // 1. Save text fields (JSON — PATCH /me does not handle photos).
      await api.patch('/me', {
        name: name.trim(),
        age: parseInt(age, 10),
        gender: gender!,
        bio: bio.trim(),
      });

      // 2. Persist photos: avatars are already hosted URLs; local files are
      //    uploaded to storage. Both end up on the profile via POST /me/photos.
      const urls: string[] = [];
      for (const uri of photos.filter(Boolean) as string[]) {
        if (isRemotePhoto(uri)) {
          urls.push(uri);
        } else {
          try {
            urls.push(await uploadPhoto(uri));
          } catch {
            /* skip a failed local upload — an avatar/other photo still counts */
          }
        }
      }
      if (urls.length) {
        await api.post('/me/photos', { urls });
      }

      updateUser({
        name: name.trim(),
        age: parseInt(age, 10),
        gender: gender!,
        bio: bio.trim(),
        photos: urls,
      });
      router.replace('/(auth)/interests');
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to save profile. Try again.');
    } finally {
      setLoading(false);
    }
  }

  function openChooser(index: number) {
    setTargetIndex(index);
    setSheet('menu');
  }
  function closeSheet() {
    setSheet(null);
    setTargetIndex(null);
  }
  function setPhotoAt(index: number, value: string) {
    setPhotos((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
    if (errors.photos) setErrors((e) => ({ ...e, photos: '' }));
  }

  async function handleUploadPhoto() {
    const idx = targetIndex;
    setSheet(null);
    if (idx == null) return;
    const uri = await pickImage();
    if (uri) setPhotoAt(idx, uri);
    setTargetIndex(null);
  }

  function handlePickAvatar(url: string) {
    if (targetIndex != null) setPhotoAt(targetIndex, url);
    closeSheet();
  }

  function removePhoto(index: number) {
    setPhotos((prev) => {
      const next = [...prev];
      next[index] = null;
      return next;
    });
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Background orbs */}
      <View style={styles.orb1} />
      <View style={styles.orb2} />

      {/* Header */}
      <View style={styles.header}>
        {step > 0 && (
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => setStep((s) => s - 1)}
          >
            <Ionicons name="arrow-back" size={20} color={colors.text} />
          </TouchableOpacity>
        )}
        <View style={styles.headerCenter}>
          <Text style={styles.stepLabel}>
            Step {step + 1} of {STEPS.length}
          </Text>
          <Text style={styles.stepTitle}>{STEPS[step]}</Text>
        </View>
        <View style={styles.backBtnPlaceholder} />
      </View>

      {/* Progress bar */}
      <View style={styles.progressTrack}>
        <Animated.View style={[styles.progressBar, progressStyle]} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Step 0: Basic Info */}
          {step === 0 && (
            <View style={styles.stepContent}>
              <Text style={styles.sectionHeadline}>What's your name?</Text>
              <Text style={styles.sectionSub}>This is how you'll appear to others on VYBEON.</Text>

              <Input
                label="Your name"
                placeholder="e.g. Aryan, Priya..."
                value={name}
                onChangeText={(t) => {
                  setName(t);
                  if (errors.name) setErrors((e) => ({ ...e, name: '' }));
                }}
                error={errors.name}
                autoCapitalize="words"
                returnKeyType="next"
                containerStyle={styles.inputGroup}
              />

              <Input
                label="Age"
                placeholder="Must be 18–40"
                value={age}
                onChangeText={(t) => {
                  setAge(t.replace(/\D/g, '').slice(0, 2));
                  if (errors.age) setErrors((e) => ({ ...e, age: '' }));
                }}
                error={errors.age}
                keyboardType="number-pad"
                maxLength={2}
                containerStyle={styles.inputGroup}
              />
            </View>
          )}

          {/* Step 1: About You */}
          {step === 1 && (
            <View style={styles.stepContent}>
              <Text style={styles.sectionHeadline}>Tell us about you</Text>
              <Text style={styles.sectionSub}>Help others understand your vibe better.</Text>

              {/* Gender */}
              <Text style={styles.fieldLabel}>GENDER</Text>
              <View style={styles.genderGrid}>
                {GENDERS.map((g) => (
                  <TouchableOpacity
                    key={g.value}
                    style={[
                      styles.genderChip,
                      gender === g.value && styles.genderChipActive,
                    ]}
                    onPress={() => {
                      setGender(g.value);
                      if (errors.gender) setErrors((e) => ({ ...e, gender: '' }));
                    }}
                  >
                    <Text style={styles.genderIcon}>{g.icon}</Text>
                    <Text
                      style={[
                        styles.genderLabel,
                        gender === g.value && styles.genderLabelActive,
                      ]}
                    >
                      {g.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              {errors.gender ? (
                <Text style={styles.fieldError}>{errors.gender}</Text>
              ) : null}

              {/* Bio */}
              <View style={styles.bioContainer}>
                <View style={styles.bioHeader}>
                  <Text style={styles.fieldLabel}>BIO</Text>
                  <Text style={styles.charCount}>
                    {bio.length}/{MAX_BIO}
                  </Text>
                </View>
                <Input
                  placeholder="Write something about yourself... your energy, what you're into, what you're looking for."
                  value={bio}
                  onChangeText={(t) => setBio(t.slice(0, MAX_BIO))}
                  multiline
                  numberOfLines={4}
                  style={styles.bioInput}
                  textAlignVertical="top"
                />
              </View>
            </View>
          )}

          {/* Step 2: Photos */}
          {step === 2 && (
            <View style={styles.stepContent}>
              <Text style={styles.sectionHeadline}>Add your photos</Text>
              <Text style={styles.sectionSub}>
                First photo is your main photo. Add up to 6. Real, clear photos get more connections.
              </Text>

              {errors.photos ? (
                <View style={styles.errorBox}>
                  <Ionicons name="alert-circle" size={16} color={colors.danger} />
                  <Text style={styles.errorText}>{errors.photos}</Text>
                </View>
              ) : null}

              <View style={styles.photoGrid}>
                {photos.map((uri, i) => (
                  <TouchableOpacity
                    key={i}
                    style={[styles.photoSlot, i === 0 && styles.photoSlotMain]}
                    onPress={() => (uri ? undefined : openChooser(i))}
                    activeOpacity={0.8}
                  >
                    {uri ? (
                      <>
                        <Image source={{ uri }} style={styles.photoImage} />
                        <TouchableOpacity
                          style={styles.photoRemove}
                          onPress={() => removePhoto(i)}
                        >
                          <Ionicons name="close-circle" size={22} color={colors.danger} />
                        </TouchableOpacity>
                        {i === 0 && (
                          <View style={styles.mainPhotoLabel}>
                            <Text style={styles.mainPhotoLabelText}>Main</Text>
                          </View>
                        )}
                      </>
                    ) : (
                      <View style={styles.photoPlaceholder}>
                        <Ionicons
                          name="add-circle"
                          size={i === 0 ? 32 : 24}
                          color={i === 0 ? colors.primary : colors.border}
                        />
                        {i === 0 && (
                          <Text style={styles.photoPlaceholderText}>Main photo</Text>
                        )}
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.photoHint}>
                Tap a slot to add a photo. Swipe or tap to remove.
              </Text>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Footer */}
      <View style={styles.footer}>
        <Button
          title={step === STEPS.length - 1 ? (loading ? 'Saving...' : 'Continue') : 'Next'}
          onPress={handleNext}
          loading={loading}
          gradient
          style={styles.nextBtn}
        />
      </View>

      {/* Add-photo chooser: upload or pick a prebuilt avatar */}
      <Modal visible={sheet !== null} transparent animationType="slide" onRequestClose={closeSheet}>
        <Pressable style={styles.sheetBackdrop} onPress={closeSheet}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetHandle} />

            {sheet === 'menu' && (
              <>
                <Text style={styles.sheetTitle}>Add a photo</Text>
                <Text style={styles.sheetSub}>Upload your own or pick a ready-made avatar</Text>

                <TouchableOpacity style={styles.optionRow} activeOpacity={0.85} onPress={handleUploadPhoto}>
                  <View style={[styles.optionIcon, { backgroundColor: '#EDE9FE' }]}>
                    <Ionicons name="image-outline" size={22} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.optionTitle}>Upload Photo</Text>
                    <Text style={styles.optionDesc}>Choose from your library</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.subtext} />
                </TouchableOpacity>

                <TouchableOpacity style={styles.optionRow} activeOpacity={0.85} onPress={() => setSheet('avatars')}>
                  <View style={[styles.optionIcon, { backgroundColor: '#FDF6E3' }]}>
                    <Ionicons name="happy-outline" size={22} color="#C9A84C" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.optionTitle}>Choose Avatar</Text>
                    <Text style={styles.optionDesc}>Pick a prebuilt avatar</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.subtext} />
                </TouchableOpacity>
              </>
            )}

            {sheet === 'avatars' && (
              <>
                <View style={styles.avatarHeader}>
                  <TouchableOpacity onPress={() => setSheet('menu')} hitSlop={8}>
                    <Ionicons name="chevron-back" size={22} color={colors.text} />
                  </TouchableOpacity>
                  <Text style={styles.sheetTitle}>Choose an avatar</Text>
                  <View style={{ width: 22 }} />
                </View>
                <ScrollView contentContainerStyle={styles.avatarGrid} showsVerticalScrollIndicator={false}>
                  {AVATARS.map((url) => (
                    <TouchableOpacity key={url} activeOpacity={0.8} onPress={() => handlePickAvatar(url)}>
                      <Image source={{ uri: url }} style={styles.avatarImg} />
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
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
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(124,58,237,0.08)',
    top: -80,
    right: -80,
  },
  orb2: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(0,229,255,0.05)',
    bottom: 120,
    left: -60,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 12,
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
  backBtnPlaceholder: {
    width: 38,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  stepLabel: {
    color: colors.subtext,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  stepTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  progressTrack: {
    height: 3,
    backgroundColor: colors.border,
    marginHorizontal: 20,
    borderRadius: 2,
    marginBottom: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 2,
    shadowColor: colors.primary,
    shadowOpacity: 0.6,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 0 },
    elevation: 3,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
  },
  stepContent: {
    flex: 1,
  },
  sectionHeadline: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  sectionSub: {
    fontSize: 14,
    color: colors.subtext,
    lineHeight: 21,
    marginBottom: 28,
  },
  inputGroup: {
    marginBottom: 20,
  },
  fieldLabel: {
    color: colors.subtext,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  genderGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 8,
  },
  genderChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  genderChipActive: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(124,58,237,0.12)',
    shadowColor: colors.primary,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
    elevation: 4,
  },
  genderIcon: {
    fontSize: 18,
  },
  genderLabel: {
    color: colors.subtext,
    fontSize: 14,
    fontWeight: '600',
  },
  genderLabelActive: {
    color: colors.text,
  },
  fieldError: {
    color: colors.danger,
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 16,
  },
  bioContainer: {
    marginTop: 20,
  },
  bioHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  charCount: {
    color: colors.subtext,
    fontSize: 12,
    fontWeight: '600',
  },
  bioInput: {
    height: 120,
    paddingTop: 14,
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
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'flex-start',
  },
  photoSlot: {
    width: '31%',
    aspectRatio: 3 / 4,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  photoSlotMain: {
    borderColor: colors.primary,
    borderWidth: 2,
  },
  photoImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  photoRemove: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 11,
  },
  mainPhotoLabel: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    backgroundColor: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  mainPhotoLabelText: {
    color: colors.text,
    fontSize: 10,
    fontWeight: '700',
  },
  photoPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  photoPlaceholderText: {
    color: colors.subtext,
    fontSize: 10,
    fontWeight: '500',
    textAlign: 'center',
  },
  photoHint: {
    marginTop: 14,
    color: colors.subtext,
    fontSize: 12,
    textAlign: 'center',
    fontWeight: '400',
  },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    paddingTop: 12,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  nextBtn: {
    borderRadius: 16,
  },

  // ── Add-photo chooser sheet ──────────────────────────────────────────────
  sheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 28,
    maxHeight: '80%',
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: colors.border,
    marginBottom: 16,
  },
  sheetTitle: { fontSize: 18, fontWeight: '800', color: colors.text, textAlign: 'center' },
  sheetSub: { fontSize: 13, color: colors.subtext, textAlign: 'center', marginTop: 4, marginBottom: 16 },
  optionRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingVertical: 14, paddingHorizontal: 14,
    borderRadius: 16, borderWidth: 1, borderColor: colors.border, marginBottom: 12,
  },
  optionIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  optionTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  optionDesc: { fontSize: 12, color: colors.subtext, marginTop: 2 },
  avatarHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16,
  },
  avatarGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 14, justifyContent: 'center', paddingBottom: 8,
  },
  avatarImg: {
    width: AVATAR_SIZE, height: AVATAR_SIZE, borderRadius: 16, backgroundColor: '#F3F4F6',
  },
});
