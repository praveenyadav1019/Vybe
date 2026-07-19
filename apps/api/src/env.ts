import { z } from "zod";

const schema = z.object({
  // Runtime
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(4000),

  // Database
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),

  // Redis
  REDIS_URL: z.string().min(1, "REDIS_URL is required"),
  LOCATION_TTL_SECONDS: z.coerce.number().default(300),

  // Auth
  JWT_SECRET: z.string().min(16, "JWT_SECRET must be at least 16 characters"),
  JWT_REFRESH_SECRET: z.string().min(16).optional(),
  JWT_EXPIRES_IN: z.string().default("15m"),
  JWT_REFRESH_EXPIRES_IN: z.string().default("30d"),

  // CORS
  CORS_ORIGIN: z.string().default("*"),

  // WebRTC TURN/STUN (self-hosted coturn). TURN_HOST + TURN_SECRET enable
  // relay; without them only public STUN is returned (not production-viable).
  TURN_HOST: z.string().optional(),          // public IP or domain of coturn
  TURN_SECRET: z.string().optional(),         // coturn static-auth-secret
  TURN_REALM: z.string().default("vybeon"),
  TURN_PORT: z.coerce.number().default(3478),
  TURN_TLS_PORT: z.coerce.number().default(5349),
  TURN_TLS_ENABLED: z.coerce.boolean().default(false),

  // Storage (S3 or Cloudflare R2 — R2 needs STORAGE_ENDPOINT set)
  STORAGE_CDN_URL: z.string().default("https://cdn.vybeon.com"),
  STORAGE_BUCKET: z.string().default("vybeon-media"),
  STORAGE_REGION: z.string().default("us-east-1"),
  STORAGE_ENDPOINT: z.string().optional(),
  STORAGE_ACCESS_KEY: z.string().optional(),
  STORAGE_SECRET_KEY: z.string().optional(),
  // On AWS, prefer an EC2 instance role over long-lived keys: set this true and
  // leave STORAGE_ACCESS_KEY/SECRET empty. The SDK then resolves credentials
  // from IMDS, so no storage secrets are stored on the box at all.
  STORAGE_USE_INSTANCE_ROLE: z.coerce.boolean().default(false),

  // Google OAuth (Sign-In) — verify ID tokens issued to these client IDs
  GOOGLE_CLIENT_ID_WEB: z.string().optional(),
  GOOGLE_CLIENT_ID_ANDROID: z.string().optional(),
  GOOGLE_CLIENT_ID_IOS: z.string().optional(),

  // Google Places
  GOOGLE_PLACES_API_KEY: z.string().optional(),
  VIBE_REFRESH_INTERVAL_MS: z.coerce.number().default(300000), // 5 min
});

export type Env = z.infer<typeof schema>;

export function loadEnv(): Env {
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const fields = parsed.error.flatten().fieldErrors;
    console.error("❌ Invalid environment variables:", fields);
    throw new Error("Invalid environment variables – check your .env file");
  }

  const data = parsed.data;

  // Additional production guards: TURN is required for reliable calling.
  if (data.NODE_ENV === "production") {
    if (!data.TURN_HOST || !data.TURN_SECRET) {
      console.warn(
        "⚠️  TURN_HOST/TURN_SECRET not set — WebRTC calls will fail on symmetric NAT (mobile networks). Configure coturn for production.",
      );
    }
  }

  return data;
}
