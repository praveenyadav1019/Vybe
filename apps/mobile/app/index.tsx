import { View, ActivityIndicator } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuthStore } from '../src/stores/authStore';
import { useUserStore } from '../src/stores/userStore';

export default function Entry() {
  const isLoading = useAuthStore((s) => s.isLoading);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const onboardingComplete = useUserStore((s) => s.onboardingComplete);
  const onboardingHydrated = useUserStore((s) => s.onboardingHydrated);

  // Show loading indicator until both stores have hydrated
  if (isLoading || !onboardingHydrated) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator color="#7C3AED" size="large" />
      </View>
    );
  }

  if (!isAuthenticated) return <Redirect href="/(auth)/splash" />;
  if (!onboardingComplete) return <Redirect href="/(auth)/profile-setup" />;
  return <Redirect href="/(tabs)/home" />;
}
