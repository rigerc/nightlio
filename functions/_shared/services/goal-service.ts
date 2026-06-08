import { and, between, desc, eq, sql } from 'drizzle-orm';
import type { Database } from '../db/client';
import { goalCompletions, goals } from '../db/schema';
import type { GoalCreateInput, GoalUpdateInput } from '@shared/schemas/goals';

export class ValidationError extends Error {}

type GoalRow = typeof goals.$inferSelect;

export interface GoalRecord {
  id: number;
  user_id: number;
  title: string;
  description: string | null;
  frequency_per_week: number;
  completed: number;
  streak: number;
  period_start: string | null;
  last_completed_date: string | null;
  created_at: string;
  updated_at: string;
  already_completed_today: boolean;
}

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Matches SQLite's `CURRENT_TIMESTAMP` ('YYYY-MM-DD HH:MM:SS', UTC) so
// in-memory reconstructions stay consistent with rows read back from D1.
function sqliteTimestamp(date: Date = new Date()): string {
  return date.toISOString().slice(0, 19).replace('T', ' ');
}

function weekStartIso(date: Date = new Date()): string {
  const weekday = (date.getDay() + 6) % 7; // Monday = 0 ... Sunday = 6
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate() - weekday);
  return formatDate(start);
}

function toGoalRecord(row: GoalRow): Omit<GoalRecord, 'already_completed_today'> {
  return {
    id: row.id,
    user_id: row.userId,
    title: row.title,
    description: row.description,
    frequency_per_week: row.frequencyPerWeek,
    completed: row.completed,
    streak: row.streak,
    period_start: row.periodStart,
    last_completed_date: row.lastCompletedDate,
    created_at: row.createdAt,
    updated_at: row.updatedAt,
  };
}

async function rolloverGoalIfNeeded(db: Database, goalRow: GoalRow): Promise<GoalRecord> {
  const todayStart = weekStartIso();
  const todayStr = formatDate(new Date());

  if ((goalRow.periodStart ?? '') === todayStart) {
    return { ...toGoalRecord(goalRow), already_completed_today: goalRow.lastCompletedDate === todayStr };
  }

  const currentCompleted = goalRow.completed ?? 0;
  const freq = goalRow.frequencyPerWeek ?? 0;
  let streak = goalRow.streak ?? 0;
  streak = freq > 0 && currentCompleted >= freq ? streak + 1 : 0;
  const updatedAt = sqliteTimestamp();

  await db
    .update(goals)
    .set({ completed: 0, streak, periodStart: todayStart, updatedAt: sql`CURRENT_TIMESTAMP` })
    .where(and(eq(goals.id, goalRow.id), eq(goals.userId, goalRow.userId)));

  // Construct the rolled-over record in-memory — we just wrote these exact
  // values, so a re-SELECT would be a redundant round-trip per goal.
  const rolledOver: GoalRow = { ...goalRow, completed: 0, streak, periodStart: todayStart, updatedAt };
  return { ...toGoalRecord(rolledOver), already_completed_today: rolledOver.lastCompletedDate === todayStr };
}

export async function createGoal(db: Database, userId: number, input: GoalCreateInput): Promise<number> {
  if (!input.title.trim()) {
    throw new ValidationError('Title is required and cannot be empty');
  }
  if (input.frequency_per_week < 1 || input.frequency_per_week > 7) {
    throw new ValidationError('frequency_per_week must be between 1 and 7');
  }

  const periodStart = weekStartIso();
  const [inserted] = await db
    .insert(goals)
    .values({
      userId,
      title: input.title.trim(),
      description: (input.description ?? '').trim(),
      frequencyPerWeek: input.frequency_per_week,
      completed: 0,
      streak: 0,
      periodStart,
    })
    .returning({ id: goals.id });

  return inserted.id;
}

export async function getGoals(db: Database, userId: number): Promise<GoalRecord[]> {
  const rows = await db.query.goals.findMany({
    where: eq(goals.userId, userId),
    orderBy: [desc(goals.createdAt)],
  });

  return Promise.all(rows.map((row) => rolloverGoalIfNeeded(db, row)));
}

export async function getGoalById(db: Database, userId: number, goalId: number): Promise<GoalRecord | null> {
  const row = await db.query.goals.findFirst({ where: and(eq(goals.id, goalId), eq(goals.userId, userId)) });
  if (!row) return null;
  return rolloverGoalIfNeeded(db, row);
}

export async function updateGoal(db: Database, userId: number, goalId: number, input: GoalUpdateInput): Promise<boolean> {
  const updates: Record<string, unknown> = {};

  if (input.title !== undefined) {
    updates.title = input.title.trim();
  }
  if (input.description !== undefined) {
    updates.description = input.description.trim();
  }
  const frequency = input.frequency_per_week ?? input.frequency;
  if (frequency !== undefined) {
    if (frequency < 1 || frequency > 7) {
      throw new ValidationError('frequency_per_week must be between 1 and 7');
    }
    updates.frequencyPerWeek = frequency;
    updates.completed = sql`MIN(${goals.completed}, ${frequency})`;
  }

  if (Object.keys(updates).length === 0) {
    return false;
  }

  updates.updatedAt = sql`CURRENT_TIMESTAMP`;
  const result = await db
    .update(goals)
    .set(updates)
    .where(and(eq(goals.id, goalId), eq(goals.userId, userId)))
    .returning({ id: goals.id });

  return result.length > 0;
}

export async function deleteGoal(db: Database, userId: number, goalId: number): Promise<boolean> {
  const result = await db
    .delete(goals)
    .where(and(eq(goals.id, goalId), eq(goals.userId, userId)))
    .returning({ id: goals.id });
  return result.length > 0;
}

export async function incrementGoalProgress(db: Database, userId: number, goalId: number): Promise<GoalRecord | null> {
  const todayStr = formatDate(new Date());

  // Sequential read-modify-write (each step depends on the previous step's result) —
  // D1 has no cross-statement transaction primitive reachable from Drizzle that
  // allows intermediate reads (see toBatch), so these run as separate
  // auto-committed statements.
  const row = await db.query.goals.findFirst({ where: and(eq(goals.id, goalId), eq(goals.userId, userId)) });
  if (!row) return null;

  const goal = await rolloverGoalIfNeeded(db, row);
  let currentCompleted = goal.completed;
  const freq = goal.frequency_per_week;
  const streak = goal.streak;
  const periodStart = goal.period_start;
  let lastCompletedDate = goal.last_completed_date;

  if (lastCompletedDate !== todayStr && currentCompleted < freq) {
    currentCompleted += 1;
    lastCompletedDate = todayStr;
  } else if (lastCompletedDate !== todayStr) {
    lastCompletedDate = todayStr;
  }

  await db
    .update(goals)
    .set({
      completed: currentCompleted,
      streak,
      periodStart,
      lastCompletedDate: lastCompletedDate ?? goal.last_completed_date,
      updatedAt: sql`CURRENT_TIMESTAMP`,
    })
    .where(and(eq(goals.id, goalId), eq(goals.userId, userId)));

  if (lastCompletedDate === todayStr) {
    await db
      .insert(goalCompletions)
      .values({ userId, goalId, date: todayStr })
      .onConflictDoNothing();
  }

  const updated = await db.query.goals.findFirst({ where: and(eq(goals.id, goalId), eq(goals.userId, userId)) });
  if (!updated) return null;

  return { ...toGoalRecord(updated), already_completed_today: updated.lastCompletedDate === todayStr };
}

export async function getGoalCompletions(
  db: Database,
  userId: number,
  goalId: number,
  startDate?: string,
  endDate?: string
): Promise<Array<{ date: string }>> {
  let start = startDate;
  let end = endDate;
  if (!start || !end) {
    const today = new Date();
    const past = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 90);
    start = formatDate(past);
    end = formatDate(today);
  }

  const rows = await db
    .select({ date: goalCompletions.date })
    .from(goalCompletions)
    .where(and(eq(goalCompletions.userId, userId), eq(goalCompletions.goalId, goalId), between(goalCompletions.date, start, end)))
    .orderBy(goalCompletions.date);

  return rows;
}
