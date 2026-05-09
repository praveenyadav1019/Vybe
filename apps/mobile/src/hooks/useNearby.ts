import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../stores/authStore';
import { apiFetch } from '../lib/api';
import type { NearbyUser } from '../types';

export interface NearbyResult {
  users: NearbyUser[];
  count: number;
  radiusM: number;
}

export function useNearby(radiusM: number = 500) {
  const token = useAuthStore((s) => s.token);

  return useQuery<NearbyResult>({
    queryKey: ['nearby', radiusM],
    queryFn: () =>
      apiFetch<NearbyResult>(`/discovery/nearby?radius=${radiusM}`, { token }),
    staleTime: 30_000,
    refetchInterval: 60_000,
    enabled: !!token,
    // Fallback mock data when API is unavailable
    placeholderData: {
      users: [
        {
          id: 'u1',
          name: 'Avery',
          age: 24,
          photos: [],
          distance: 'Same venue',
          activeMode: 'dating',
          isVerified: true,
          isOnline: true,
          interests: ['techno', 'travel'],
        },
        {
          id: 'u2',
          name: 'Rio',
          age: 26,
          photos: [],
          distance: 'Within 100m',
          activeMode: 'night-out',
          isVerified: true,
          isOnline: true,
          interests: ['house', 'art'],
        },
        {
          id: 'u3',
          name: 'Mina',
          age: 22,
          photos: [],
          distance: 'Nearby',
          activeMode: 'casual',
          isVerified: false,
          isOnline: false,
          interests: ['photography', 'coffee'],
        },
        {
          id: 'u4',
          name: 'Zara',
          age: 25,
          photos: [],
          distance: 'Same venue',
          activeMode: 'club-mates',
          isVerified: true,
          isOnline: true,
          interests: ['dnb', 'fashion'],
        },
        {
          id: 'u5',
          name: 'Kai',
          age: 28,
          photos: [],
          distance: 'Within 100m',
          activeMode: 'co-travel',
          isVerified: false,
          isOnline: true,
          interests: ['backpacking', 'food'],
        },
      ],
      count: 5,
      radiusM,
    },
  });
}
