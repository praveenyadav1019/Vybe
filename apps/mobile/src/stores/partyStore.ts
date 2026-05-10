import { create } from 'zustand';
import { api } from '../lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────

export type PartyStatus     = 'active' | 'cancelled' | 'ended' | 'full';
export type PartyVisibility = 'public' | 'invite_only' | 'verified_only';
export type JoinStatus      = 'pending' | 'accepted' | 'rejected' | 'waitlisted' | null;
export type VibeType        = 'House Party' | 'Rooftop' | 'Pool Party' | 'Chill' | 'Rave' | 'BBQ' | 'Dinner' | 'Game Night';

export interface PartyHost {
  id:       string;
  name:     string;
  photo:    string | null;
  verified: boolean;
}

export interface PartyAttendeePreview {
  id:       string;
  name:     string;
  photo:    string | null;
  verified: boolean;
}

export interface HouseParty {
  id:               string;
  title:            string;
  description:      string | null;
  coverImage:       string | null;
  neighborhood:     string | null;
  city:             string;
  state:            string | null;
  lat:              number | null;
  lng:              number | null;
  vibeType:         string;
  musicType:        string | null;
  ageMin:           number;
  ageMax:           number | null;
  allowMale:        boolean;
  allowFemale:      boolean;
  allowCouple:      boolean;
  maxAttendees:     number;
  isByob:           boolean;
  isPaid:           boolean;
  entryFee:         number | null;
  requiresVerification: boolean;
  startsAt:         string;
  endsAt:           string | null;
  status:           PartyStatus;
  visibility:       PartyVisibility;
  attendeeCount:    number;
  isFull:           boolean;
  isHost:           boolean;
  requestStatus:    JoinStatus;
  host:             PartyHost | null;
  attendees?:       PartyAttendeePreview[];
  createdAt:        string;
}

export interface CreatePartyInput {
  title:          string;
  description?:   string;
  coverImage?:    string;
  neighborhood?:  string;
  city:           string;
  state?:         string;
  lat?:           number;
  lng?:           number;
  vibeType:       string;
  musicType?:     string;
  ageMin?:        number;
  ageMax?:        number;
  allowMale?:     boolean;
  allowFemale?:   boolean;
  allowCouple?:   boolean;
  maxAttendees?:  number;
  isByob?:        boolean;
  isPaid?:        boolean;
  entryFee?:      number;
  requiresVerification?: boolean;
  startsAt:       string;
  endsAt?:        string;
  visibility?:    PartyVisibility;
}

// ─── Store ────────────────────────────────────────────────────────────────────

interface PartyState {
  nearbyParties:    HouseParty[];
  hostingParties:   HouseParty[];
  attendingParties: HouseParty[];
  selectedParty:    HouseParty | null;
  isLoading:        boolean;
  error:            string | null;

  // Actions
  fetchNearby:    (city?: string, page?: number) => Promise<void>;
  fetchHosting:   () => Promise<void>;
  fetchAttending: () => Promise<void>;
  fetchParty:     (id: string) => Promise<void>;
  createParty:    (input: CreatePartyInput) => Promise<HouseParty | null>;
  joinParty:      (id: string, message?: string) => Promise<void>;
  cancelParty:    (id: string) => Promise<void>;
  clearError:     () => void;
}

export const usePartyStore = create<PartyState>((set, get) => ({
  nearbyParties:    [],
  hostingParties:   [],
  attendingParties: [],
  selectedParty:    null,
  isLoading:        false,
  error:            null,

  fetchNearby: async (city, page = 1) => {
    set({ isLoading: true, error: null });
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (city) params.set('city', city);
      const res = await api.get<{ parties: HouseParty[] }>(`/parties/nearby?${params}`);
      set({ nearbyParties: res.data.parties });
    } catch (e: any) {
      set({ error: e?.response?.data?.error ?? 'Failed to load parties' });
    } finally {
      set({ isLoading: false });
    }
  },

  fetchHosting: async () => {
    try {
      const res = await api.get<{ parties: HouseParty[] }>('/parties/hosting');
      set({ hostingParties: res.data.parties });
    } catch {
      // non-critical
    }
  },

  fetchAttending: async () => {
    try {
      const res = await api.get<{ parties: HouseParty[] }>('/parties/attending');
      set({ attendingParties: res.data.parties });
    } catch {
      // non-critical
    }
  },

  fetchParty: async (id) => {
    set({ isLoading: true });
    try {
      const res = await api.get<{ party: HouseParty }>(`/parties/${id}`);
      set({ selectedParty: res.data.party });
    } catch (e: any) {
      set({ error: e?.response?.data?.error ?? 'Party not found' });
    } finally {
      set({ isLoading: false });
    }
  },

  createParty: async (input) => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.post<{ party: HouseParty }>('/parties', input);
      const party = res.data.party;
      set((s) => ({
        hostingParties: [party, ...s.hostingParties],
        nearbyParties:  [party, ...s.nearbyParties],
      }));
      return party;
    } catch (e: any) {
      set({ error: e?.response?.data?.error ?? 'Failed to create party' });
      return null;
    } finally {
      set({ isLoading: false });
    }
  },

  joinParty: async (id, message) => {
    set({ isLoading: true, error: null });
    try {
      await api.post(`/parties/${id}/join`, { message });
      // Refresh party to get updated status
      await get().fetchParty(id);
    } catch (e: any) {
      set({ error: e?.response?.data?.error ?? 'Failed to join party' });
    } finally {
      set({ isLoading: false });
    }
  },

  cancelParty: async (id) => {
    try {
      await api.delete(`/parties/${id}`);
      set((s) => ({
        hostingParties: s.hostingParties.filter((p) => p.id !== id),
        nearbyParties:  s.nearbyParties.filter((p) => p.id !== id),
      }));
    } catch (e: any) {
      set({ error: e?.response?.data?.error ?? 'Failed to cancel party' });
    }
  },

  clearError: () => set({ error: null }),
}));
