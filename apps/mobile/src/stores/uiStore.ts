import { create } from "zustand";

type UIState = {
  radarRadiusM: number;
  premiumUpsellVisible: boolean;
  setRadarRadius: (m: number) => void;
  setPremiumUpsell: (v: boolean) => void;
};

export const useUIStore = create<UIState>((set) => ({
  radarRadiusM: 500,
  premiumUpsellVisible: false,
  setRadarRadius: (radarRadiusM) => set({ radarRadiusM }),
  setPremiumUpsell: (premiumUpsellVisible) => set({ premiumUpsellVisible }),
}));
