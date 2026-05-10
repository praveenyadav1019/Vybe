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

  // SMS – optional in development (falls back to console log)
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_PHONE_NUMBER: z.string().optional(),

  // Agora – optional; placeholder token used when cert is absent
  AGORA_APP_ID: z.string().optional(),
  AGORA_APP_CERTIFICATE: z.string().optional(),

  // Storage
  STORAGE_CDN_URL: z.string().default("https://cdn.vybeon.com"),
  STORAGE_BUCKET: z.string().default("vybeon-media"),
  STORAGE_REGION: z.string().default("us-east-1"),
  STORAGE_ACCESS_KEY: z.string().optional(),
  STORAGE_SECRET_KEY: z.string().optional(),

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

  // Additional production guards
  if (data.NODE_ENV === "production") {
    const required = ["TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_PHONE_NUMBER"] as const;
    for (const key of required) {
      if (!data[key]) {
        throw new Error(`${key} is required in production`);
      }
    }
  }

  return data;
}
