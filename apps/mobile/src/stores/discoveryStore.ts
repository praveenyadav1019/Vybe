import { create } from 'zustand';
import type { NearbyUser, Mode } from '../types';

interface DiscoveryState {
  nearbyUsers: NearbyUser[];
  activeMode: Mode;
  radarRadius: number;
  isLoading: boolean;
  lastUpdated: Date | null;

  // Legacy filter fields kept for backward-compat
  activeFilter: Mode | 'all';
  radiusM: number;
  sortBy: 'distance' | 'online' | 'mode';
  genderFilter: 'all' | 'male' | 'female' | 'non-binary';
  verifiedOnly: boolean;

  setNearbyUsers: (users: NearbyUser[]) => void;
  setActiveMode: (mode: Mode) => void;
  setRadarRadius: (radius: number) => void;
  setLoading: (loading: boolean) => void;
  addNearbyUser: (user: NearbyUser) => void;
  removeNearbyUser: (userId: string) => void;

  // Legacy setters
  setFilter: (filter: Mode | 'all') => void;
  setRadius: (m: number) => void;
  setSortBy: (sort: 'distance' | 'online' | 'mode') => void;
  setGenderFilter: (g: 'all' | 'male' | 'female' | 'non-binary') => void;
  setVerifiedOnly: (v: boolean) => void;
}

export const useDiscoveryStore = create<DiscoveryState>((set) => ({
  nearbyUsers: [],
  activeMode: 'casual',
  radarRadius: 500,
  isLoading: false,
  lastUpdated: null,

  // Legacy defaults
  activeFilter: 'all',
  radiusM: 500,
  sortBy: 'distance',
  genderFilter: 'all',
  verifiedOnly: false,

  setNearbyUsers: (users) =>
    set({ nearbyUsers: users, lastUpdated: new Date() }),

  setActiveMode: (mode) => set({ activeMode: mode }),

  setRadarRadius: (radius) => set({ radarRadius: radius, radiusM: radius }),

  setLoading: (isLoading) => set({ isLoading }),

  addNearbyUser: (user) =>
    set((s) => ({
      nearbyUsers: s.nearbyUsers.some((u) => u.id === user.id)
        ? s.nearbyUsers
        : [...s.nearbyUsers, user],
    })),

  removeNearbyUser: (userId) =>
    set((s) => ({
      nearbyUsers: s.nearbyUsers.filter((u) => u.id !== userId),
    })),

  // Legacy setters
  setFilter: (activeFilter) => set({ activeFilter }),
  setRadius: (radiusM) => set({ radiusM, radarRadius: radiusM }),
  setSortBy: (sortBy) => set({ sortBy }),
  setGenderFilter: (genderFilter) => set({ genderFilter }),
  setVerifiedOnly: (verifiedOnly) => set({ verifiedOnly }),
}));
