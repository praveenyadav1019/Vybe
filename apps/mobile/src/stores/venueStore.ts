import { create } from 'zustand';
import { api } from '../lib/api';
import { socketClient } from '../lib/socket';

export interface Venue {
  id: string;
  name: string;
  category: string;
  address?: string;
  description?: string;
  tags: string[];
  photos: string[];
  isHappening: boolean;
  vibeScore: number;
  crowdScore: number;
  activeUsers: number;
  distance: string;
  distanceM?: number;
  vibeLabel?: string;
  peakTime?: string;
  trending?: boolean;
  isCheckedIn?: boolean;
  // Google Places enrichment
  googlePlaceId?: string;
  rating?: number;
  priceLevel?: number;
  isOpen?: boolean;
}

export interface ClubMateBroadcast {
  id: string;
  fromUser: {
    id: string;
    name: string;
    age: number;
    photoUrl?: string;
    verified: boolean;
    mode: string;
  };
  placeId: string;
  placeName?: string;
  type: 'female' | 'male' | 'couple' | 'group' | 'any';
  goingAt?: string;
  message?: string;
  createdAt: string;
}

interface VenueState {
  happeningVenues: Venue[];
  nearbyVenues: Venue[];
  selectedVenue: Venue | null;
  clubMatesBroadcasts: ClubMateBroadcast[];
  checkedInVenueId: string | null;
  isLoading: boolean;
  error: string | null;

  fetchHappening: (lat?: number, lng?: number, radius?: number) => Promise<void>;
  fetchVenueDetail: (id: string) => Promise<Venue | null>;
  checkIn: (venueId: string) => Promise<boolean>;
  checkOut: (venueId: string) => Promise<void>;
  fetchClubMates: (placeId: string, type?: string) => Promise<void>;
  broadcastClubMate: (data: {
    placeId: string;
    type: ClubMateBroadcast['type'];
    goingAt?: string;
    message?: string;
  }) => Promise<boolean>;
  joinClubMate: (broadcastId: string) => Promise<boolean>;
  updateVibeScoreLocally: (venueId: string, score: Partial<Venue>) => void;
}

export const useVenueStore = create<VenueState>((set, get) => ({
  happeningVenues: [],
  nearbyVenues: [],
  selectedVenue: null,
  clubMatesBroadcasts: [],
  checkedInVenueId: null,
  isLoading: false,
  error: null,

  fetchHappening: async (lat, lng, radius = 5000) => {
    set({ isLoading: true, error: null });
    try {
      const params = new URLSearchParams();
      if (lat != null) params.set('lat', String(lat));
      if (lng != null) params.set('lng', String(lng));
      params.set('radius', String(radius));

      const res = await api.get<{ places: Venue[] }>(`/places/happening?${params}`);
      set({ happeningVenues: res.data.places ?? [], isLoading: false });
    } catch (e: any) {
      set({ error: e?.message ?? 'Failed to fetch venues', isLoading: false });
    }
  },

  fetchVenueDetail: async (id: string) => {
    set({ isLoading: true });
    try {
      const res = await api.get<Venue>(`/places/${id}`);
      set({ selectedVenue: res.data, isLoading: false });
      socketClient.emit('venue:join', { placeId: id });
      return res.data;
    } catch {
      set({ isLoading: false });
      return null;
    }
  },

  checkIn: async (venueId: string) => {
    try {
      const res = await api.post<{ ok: boolean; alreadyCheckedIn: boolean }>(
        `/places/${venueId}/checkin`,
        {}
      );
      if (res.data.ok) {
        set({ checkedInVenueId: venueId });
        get().updateVibeScoreLocally(venueId, { isCheckedIn: true });
      }
      return res.data.ok;
    } catch {
      return false;
    }
  },

  checkOut: async (venueId: string) => {
    try {
      await api.post(`/places/${venueId}/checkout`, {});
      set({ checkedInVenueId: null });
      socketClient.emit('venue:leave', { placeId: venueId });
      get().updateVibeScoreLocally(venueId, { isCheckedIn: false });
    } catch {
      // swallow
    }
  },

  fetchClubMates: async (placeId: string, type?: string) => {
    try {
      const params = new URLSearchParams({ placeId });
      if (type) params.set('type', type);
      const res = await api.get<{ broadcasts: ClubMateBroadcast[] }>(
        `/clubmates?${params}`
      );
      set({ clubMatesBroadcasts: res.data.broadcasts ?? [] });
    } catch {
      set({ clubMatesBroadcasts: [] });
    }
  },

  broadcastClubMate: async (data) => {
    try {
      await api.post('/clubmates/broadcast', data);
      return true;
    } catch {
      return false;
    }
  },

  joinClubMate: async (broadcastId: string) => {
    try {
      await api.post(`/clubmates/${broadcastId}/join`, {});
      return true;
    } catch {
      return false;
    }
  },

  updateVibeScoreLocally: (venueId: string, updates: Partial<Venue>) => {
    set((state) => ({
      happeningVenues: state.happeningVenues.map((v) =>
        v.id === venueId ? { ...v, ...updates } : v
      ),
      selectedVenue:
        state.selectedVenue?.id === venueId
          ? { ...state.selectedVenue, ...updates }
          : state.selectedVenue,
    }));
  },
}));
