/**
 * Google Places API service.
 * Uses the Places API (Nearby Search) with caching-friendly upsert in the DB.
 */

export interface GooglePlace {
  googlePlaceId: string;
  name: string;
  category: string;
  address: string;
  lat: number;
  lng: number;
  rating: number;
  userRatingCount: number;
  priceLevel?: number;
  photoReference?: string;
  isOpen?: boolean;
  openingHours?: string[];
  phoneNumber?: string;
  website?: string;
  types: string[];
}

// Simplified shape used internally by searchNearbyNightlife
export interface NightlifePlace {
  placeId: string;
  name: string;
  category: string;
  address: string;
  lat: number;
  lng: number;
  rating: number | null;
  priceLevel: number | null;
  openNow: boolean;
  photos: string[];  // resolved photo URLs
  tags: string[];    // derived from type array
}

function categoryFromTypes(types: string[]): string {
  if (types.includes("night_club")) return "Club";
  if (types.includes("bar")) return "Bar";
  if (types.includes("lounge")) return "Lounge";
  if (types.includes("restaurant")) return "Restaurant";
  if (types.includes("cafe")) return "Cafe";
  if (types.includes("casino")) return "Casino";
  if (types.includes("amusement_park")) return "Venue";
  return "Venue";
}

function tagsFromTypes(types: string[]): string[] {
  const map: Record<string, string> = {
    night_club: "Nightclub",
    bar: "Bar",
    lounge: "Lounge",
    restaurant: "Restaurant",
    cafe: "Cafe",
    live_music_venue: "Live Music",
    casino: "Casino",
  };
  return types.flatMap((t) => (map[t] ? [map[t]] : [])).slice(0, 4);
}

export class GooglePlacesService {
  private readonly apiKey: string;
  private readonly baseUrl = "https://maps.googleapis.com/maps/api";

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async nearbySearch(
    lat: number,
    lng: number,
    radiusMeters: number,
    types: string[] = ["bar", "night_club", "restaurant"]
  ): Promise<GooglePlace[]> {
    const results: GooglePlace[] = [];

    for (const type of types.slice(0, 3)) {
      const url = new URL(`${this.baseUrl}/place/nearbysearch/json`);
      url.searchParams.set("location", `${lat},${lng}`);
      url.searchParams.set("radius", String(Math.min(radiusMeters, 50000)));
      url.searchParams.set("type", type);
      url.searchParams.set("key", this.apiKey);

      const res = await fetch(url.toString());
      if (!res.ok) continue;
      const data = (await res.json()) as {
        results?: Array<{
          place_id: string;
          name: string;
          vicinity: string;
          geometry: { location: { lat: number; lng: number } };
          rating?: number;
          user_ratings_total?: number;
          price_level?: number;
          photos?: Array<{ photo_reference: string }>;
          opening_hours?: { open_now: boolean };
          types: string[];
        }>;
      };

      for (const p of data.results ?? []) {
        if (results.some((r) => r.googlePlaceId === p.place_id)) continue;
        results.push({
          googlePlaceId: p.place_id,
          name: p.name,
          category: categoryFromTypes(p.types),
          address: p.vicinity ?? "",
          lat: p.geometry.location.lat,
          lng: p.geometry.location.lng,
          rating: p.rating ?? 0,
          userRatingCount: p.user_ratings_total ?? 0,
          priceLevel: p.price_level,
          photoReference: p.photos?.[0]?.photo_reference,
          isOpen: p.opening_hours?.open_now,
          types: p.types,
        });
      }
    }

    return results;
  }

  async placeDetails(googlePlaceId: string): Promise<Partial<GooglePlace>> {
    const url = new URL(`${this.baseUrl}/place/details/json`);
    url.searchParams.set("place_id", googlePlaceId);
    url.searchParams.set(
      "fields",
      "name,formatted_address,formatted_phone_number,website,opening_hours,rating,price_level,photos,types,geometry"
    );
    url.searchParams.set("key", this.apiKey);

    const res = await fetch(url.toString());
    if (!res.ok) return {};
    const data = (await res.json()) as {
      result?: {
        name?: string;
        formatted_address?: string;
        formatted_phone_number?: string;
        website?: string;
        opening_hours?: { weekday_text?: string[]; open_now?: boolean };
        rating?: number;
        price_level?: number;
        photos?: Array<{ photo_reference: string }>;
        types?: string[];
        geometry?: { location: { lat: number; lng: number } };
      };
    };

    const r = data.result;
    if (!r) return {};

    return {
      name: r.name,
      address: r.formatted_address,
      phoneNumber: r.formatted_phone_number,
      website: r.website,
      isOpen: r.opening_hours?.open_now,
      openingHours: r.opening_hours?.weekday_text,
      rating: r.rating,
      priceLevel: r.price_level,
      photoReference: r.photos?.[0]?.photo_reference,
      types: r.types,
    };
  }

  photoUrl(photoReference: string, maxWidth = 800): string {
    return `${this.baseUrl}/place/photo?maxwidth=${maxWidth}&photo_reference=${photoReference}&key=${this.apiKey}`;
  }

  /**
   * Search nearby nightlife places (clubs, bars, lounges) and return a
   * normalized NightlifePlace array suitable for the "Happening Now" section.
   * Searches multiple types and deduplicates by placeId.
   */
  async searchNearbyNightlife(
    lat: number,
    lng: number,
    radiusM: number,
  ): Promise<NightlifePlace[]> {
    const NIGHTLIFE_TYPES = ["night_club", "bar", "casino"];
    const seen = new Set<string>();
    const results: NightlifePlace[] = [];

    for (const type of NIGHTLIFE_TYPES) {
      const url = new URL(`${this.baseUrl}/place/nearbysearch/json`);
      url.searchParams.set("location", `${lat},${lng}`);
      url.searchParams.set("radius", String(Math.min(radiusM, 50000)));
      url.searchParams.set("type", type);
      url.searchParams.set("key", this.apiKey);

      let data: {
        results?: Array<{
          place_id: string;
          name: string;
          vicinity: string;
          geometry: { location: { lat: number; lng: number } };
          rating?: number;
          price_level?: number;
          photos?: Array<{ photo_reference: string }>;
          opening_hours?: { open_now?: boolean };
          types: string[];
        }>;
      };

      try {
        const res = await fetch(url.toString());
        if (!res.ok) continue;
        data = (await res.json()) as typeof data;
      } catch {
        continue;
      }

      for (const p of data.results ?? []) {
        if (seen.has(p.place_id)) continue;
        seen.add(p.place_id);

        results.push({
          placeId:    p.place_id,
          name:       p.name,
          category:   categoryFromTypes(p.types),
          address:    p.vicinity ?? "",
          lat:        p.geometry.location.lat,
          lng:        p.geometry.location.lng,
          rating:     p.rating ?? null,
          priceLevel: p.price_level ?? null,
          openNow:    p.opening_hours?.open_now ?? false,
          photos:     (p.photos ?? [])
            .slice(0, 3)
            .map((ph) => this.photoUrl(ph.photo_reference, 600)),
          tags: tagsFromTypes(p.types),
        });
      }

      // Stay within Google's rate limits
      await new Promise((r) => setTimeout(r, 120));
    }

    return results;
  }
}
