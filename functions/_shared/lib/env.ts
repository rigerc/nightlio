export interface Bindings {
  DB: D1Database;
  JWT_SECRET: string;
  JWT_EXPIRES_IN_SECONDS?: string;
  DEFAULT_SELF_HOST_ID?: string;
  CORS_ORIGINS?: string;
  ENABLE_GOOGLE_OAUTH?: string;
  ENABLE_MOOD_MUSIC?: string;
  ENABLE_GOOGLE_HEALTH?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  GOOGLE_HEALTH_CLIENT_ID?: string;
  FITNESS_TOKEN_KEY?: string;
  SELFHOST_USER_NAME?: string;
  SELFHOST_USER_EMAIL?: string;
  SELFHOST_ACCESS_KEY?: string;
  CLERK_JWT_KEY?: string;
  CLERK_AUTHORIZED_PARTIES?: string;
}

export interface Variables {
  userId: number;
}

export type AppEnv = { Bindings: Bindings; Variables: Variables };

export function isTruthy(value: string | undefined | null): boolean {
  if (value == null) return false;
  return ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase());
}

export function corsOrigins(env: Bindings): string[] {
  return (env.CORS_ORIGINS ?? 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export function jwtExpiresInSeconds(env: Bindings): number {
  const raw = env.JWT_EXPIRES_IN_SECONDS;
  const parsed = raw ? Number.parseInt(raw, 10) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 3600;
}
