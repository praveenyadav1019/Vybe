import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { api } from './api';

/**
 * Register this device's Expo push token with the backend (PATCH /me/push-token).
 * Best-effort: no-op on web and silently ignores permission/transport failures.
 */
export async function registerPushToken(): Promise<void> {
  try {
    if (Platform.OS === 'web') return;

    const Notifications = await import('expo-notifications');

    const { status: existing } = await Notifications.getPermissionsAsync();
    let status = existing;
    if (status !== 'granted') {
      const req = await Notifications.requestPermissionsAsync();
      status = req.status;
    }
    if (status !== 'granted') return;

    const projectId =
      (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas?.projectId ??
      (Constants as unknown as { easConfig?: { projectId?: string } }).easConfig?.projectId;

    const tokenResp = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    );

    if (tokenResp?.data) {
      await api.patch('/me/push-token', { pushToken: tokenResp.data });
    }
  } catch {
    // best-effort — never block auth on push registration
  }
}
