import { useEffect, useState } from 'react';
import { Redirect } from 'expo-router';
import { useAuthStore } from '../src/stores/authStore';
import { useUserStore } from '../src/stores/userStore';
import { BrandSplash } from '../src/components/BrandSplash';

// Minimum time the branded splash stays up so it registers on open (like most
// polished apps), even when the stores hydrate near-instantly.
const MIN_SPLASH_MS = 1600;

export default function Entry() {
  const isLoading = useAuthStore((s) => s.isLoading);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const onboardingComplete = useUserStore((s) => s.onboardingComplete);
  const onboardingHydrated = useUserStore((s) => s.onboardingHydrated);

  const [minElapsed, setMinElapsed] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setMinElapsed(true), MIN_SPLASH_MS);
    return () => clearTimeout(t);
  }, []);

  // Branded splash while the auth + onboarding stores hydrate on cold open.
  if (isLoading || !onboardingHydrated || !minElapsed) {
    return <BrandSplash />;
  }

  if (!isAuthenticated) return <Redirect href="/(auth)/splash" />;
  if (!onboardingComplete) return <Redirect href="/(auth)/profile-setup" />;
  return <Redirect href="/(tabs)/home" />;
}
