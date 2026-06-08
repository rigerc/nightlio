import { eq, sql } from 'drizzle-orm';
import type { Database } from '../db/client';
import { users } from '../db/schema';

export type UserRecord = typeof users.$inferSelect;

export async function getUserById(db: Database, userId: number): Promise<UserRecord | null> {
  const row = await db.query.users.findFirst({ where: eq(users.id, userId) });
  return row ?? null;
}

export async function getUserByGoogleId(db: Database, googleId: string): Promise<UserRecord | null> {
  const row = await db.query.users.findFirst({ where: eq(users.googleId, googleId) });
  return row ?? null;
}

export async function getUserByClerkUserId(db: Database, clerkUserId: string): Promise<UserRecord | null> {
  const row = await db.query.users.findFirst({ where: eq(users.clerkUserId, clerkUserId) });
  return row ?? null;
}

export async function updateLastLogin(db: Database, userId: number): Promise<void> {
  await db.update(users).set({ lastLogin: sql`CURRENT_TIMESTAMP` }).where(eq(users.id, userId));
}

export async function getOrCreateUser(
  db: Database,
  googleId: string,
  email: string,
  name: string,
  avatarUrl?: string | null
): Promise<UserRecord | null> {
  const existing = await getUserByGoogleId(db, googleId);
  if (existing) {
    await updateLastLogin(db, existing.id);
    return existing;
  }

  const [inserted] = await db
    .insert(users)
    .values({ googleId, email, name, avatarUrl: avatarUrl ?? null })
    .returning({ id: users.id });
  return getUserById(db, inserted.id);
}

export async function upsertUserByGoogleId(
  db: Database,
  googleId: string,
  email: string | null | undefined,
  name: string | null | undefined,
  avatarUrl?: string | null
): Promise<UserRecord | null> {
  const [row] = await db
    .insert(users)
    .values({ googleId, email: email ?? '', name: name ?? '', avatarUrl: avatarUrl ?? null })
    .onConflictDoUpdate({
      target: users.googleId,
      set: {
        email: sql`COALESCE(${email ?? null}, ${users.email})`,
        name: sql`COALESCE(${name ?? null}, ${users.name})`,
        avatarUrl: sql`COALESCE(${avatarUrl ?? null}, ${users.avatarUrl})`,
        lastLogin: sql`CURRENT_TIMESTAMP`,
      },
    })
    .returning();

  return row ?? null;
}

export async function getOrCreateClerkUser(
  db: Database,
  clerkUserId: string,
  email?: string | null,
  name?: string | null,
  avatarUrl?: string | null
): Promise<UserRecord | null> {
  const existing = await getUserByClerkUserId(db, clerkUserId);
  if (existing) {
    await db
      .update(users)
      .set({
        email: email ?? existing.email,
        name: name ?? existing.name,
        avatarUrl: avatarUrl ?? existing.avatarUrl,
        lastLogin: sql`CURRENT_TIMESTAMP`,
      })
      .where(eq(users.id, existing.id));
    return getUserById(db, existing.id);
  }

  const [inserted] = await db
    .insert(users)
    .values({
      googleId: clerkUserId,
      clerkUserId,
      email: email ?? `${clerkUserId}@clerk.local`,
      name: name ?? 'Me',
      avatarUrl: avatarUrl ?? null,
    })
    .returning({ id: users.id });
  return getUserById(db, inserted.id);
}

export async function ensureLocalUser(
  db: Database,
  defaultUserId: string,
  defaultName?: string | null,
  defaultEmail?: string | null
): Promise<UserRecord | null> {
  const name = defaultName || 'Me';
  const email = defaultEmail || `${defaultUserId}@localhost`;
  return upsertUserByGoogleId(db, defaultUserId, email, name, null);
}
