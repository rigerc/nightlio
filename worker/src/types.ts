export type Bindings = {
  DB: D1Database
  JWT_SECRET: string
  GOOGLE_CLIENT_ID?: string
  ENABLE_GOOGLE_OAUTH?: string
  DEFAULT_SELF_HOST_ID?: string
  SELFHOST_USER_NAME?: string
  SELFHOST_USER_EMAIL?: string
  CORS_ORIGINS?: string
}

export type Variables = {
  userId: number
}

export type Env = { Bindings: Bindings; Variables: Variables }
