import { create } from "zustand";
import type { AppMode } from "../types";
import { deleteStoredValue, getStoredValue, setStoredValue } from "../lib/api";

const ONBOARDING_KEY = "vybeon_onboarding_complete";

export type LocalProfile = {
  name: string;
  age?: number;
  interests: string[];
  verified: boolean;
  womenSafetyMode: boolean;
  activeMode: AppMode;
};

type UserState = {
  profile: LocalProfile | null;
  onboardingComplete: boolean;
  onboardingHydrated: boolean;
  setProfile: (p: Partial<LocalProfile>) => void;
  resetProfile: () => Promise<void>;
  finishOnboarding: () => Promise<void>;
  hydrateOnboarding: () => Promise<void>;
};

const defaultProfile: LocalProfile = {
  name: "",
  interests: [],
  verified: false,
  womenSafetyMode: false,
  activeMode: "dating",
};

export const useUserStore = create<UserState>((set, get) => ({
  profile: null,
  onboardingComplete: false,
  onboardingHydrated: false,
  setProfile: (p) =>
    set({
      profile: { ...defaultProfile, ...get().profile, ...p },
    }),
  resetProfile: async () => {
    await deleteStoredValue(ONBOARDING_KEY).catch(() => undefined);
    set({ profile: null, onboardingComplete: false, onboardingHydrated: true });
  },
  finishOnboarding: async () => {
    await setStoredValue(ONBOARDING_KEY, "1");
    set({ onboardingComplete: true, onboardingHydrated: true });
  },
  hydrateOnboarding: async () => {
    try {
      const v = await getStoredValue(ONBOARDING_KEY);
      set({ onboardingComplete: v === "1", onboardingHydrated: true });
    } catch {
      set({ onboardingHydrated: true });
    }
  },
}));
