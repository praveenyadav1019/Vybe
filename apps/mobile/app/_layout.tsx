import '../global.css';
import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { queryClient } from '../src/lib/queryClient';
import { useAuthStore } from '../src/stores/authStore';
import { useUserStore } from '../src/stores/userStore';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

export default function RootLayout() {
  const initialize = useAuthStore((s) => s.initialize);
  const hydrateOnboarding = useUserStore((s) => s.hydrateOnboarding);

  useEffect(() => {
    Promise.all([initialize(), hydrateOnboarding()]).finally(() => {
      SplashScreen.hideAsync().catch(() => undefined);
    });
  }, [initialize, hydrateOnboarding]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <StatusBar style="light" backgroundColor="#0A0A0A" />
          <Stack
            screenOptions={{
              headerShown: false,
              animation: 'fade',
              contentStyle: { backgroundColor: '#0A0A0A' },
            }}
          >
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          </Stack>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
