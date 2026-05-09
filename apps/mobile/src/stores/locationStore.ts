import { create } from 'zustand';
import * as Location from 'expo-location';
import { api } from '../lib/api';
import { socketClient } from '../lib/socket';

interface LocationState {
  // New detailed coords
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  isTracking: boolean;
  permissionGranted: boolean;
  // Legacy shape kept for backward-compat
  coords: { lat: number; lng: number } | null;
  venueLabel?: string;

  setLocation: (lat: number, lng: number, accuracy?: number) => void;
  startTracking: () => Promise<void>;
  stopTracking: () => void;
  requestPermission: () => Promise<boolean>;
  // Legacy setters
  setCoords: (c: { lat: number; lng: number } | null) => void;
  setVenueLabel: (v?: string) => void;
}

let trackingSubscription: Location.LocationSubscription | null = null;

export const useLocationStore = create<LocationState>((set, get) => ({
  latitude: null,
  longitude: null,
  accuracy: null,
  isTracking: false,
  permissionGranted: false,
  coords: null,
  venueLabel: undefined,

  setLocation: (latitude, longitude, accuracy) => {
    set({ latitude, longitude, accuracy: accuracy ?? null, coords: { lat: latitude, lng: longitude } });
  },

  setCoords: (coords) => {
    if (coords) {
      set({ coords, latitude: coords.lat, longitude: coords.lng });
    } else {
      set({ coords: null, latitude: null, longitude: null });
    }
  },

  setVenueLabel: (venueLabel) => set({ venueLabel }),

  requestPermission: async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    const granted = status === 'granted';
    set({ permissionGranted: granted });
    return granted;
  },

  startTracking: async () => {
    const granted =
      get().permissionGranted || (await get().requestPermission());
    if (!granted) return;

    // Get initial location immediately
    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const { latitude, longitude, accuracy } = location.coords;
      set({
        latitude,
        longitude,
        accuracy: accuracy ?? null,
        isTracking: true,
        coords: { lat: latitude, lng: longitude },
      });

      // Notify backend
      await api
        .post('/location/update', { latitude, longitude, accuracy })
        .catch(() => undefined);
      socketClient.emit('location:update', { latitude, longitude });
    } catch {
      // Permission may have been revoked
    }

    // Continuous updates: every 30 s or 20 m movement
    trackingSubscription = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 30_000,
        distanceInterval: 20,
      },
      async (loc) => {
        const { latitude, longitude, accuracy } = loc.coords;
        set({
          latitude,
          longitude,
          accuracy: accuracy ?? null,
          coords: { lat: latitude, lng: longitude },
        });
        await api
          .post('/location/update', { latitude, longitude })
          .catch(() => undefined);
        socketClient.emit('location:update', { latitude, longitude });
      }
    );
  },

  stopTracking: () => {
    trackingSubscription?.remove();
    trackingSubscription = null;
    set({ isTracking: false });
  },
}));
