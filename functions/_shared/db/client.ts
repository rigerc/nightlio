import { drizzle } from 'drizzle-orm/d1';
import * as schema from './schema';

export type Database = ReturnType<typeof createDb>;

export function createDb(d1: D1Database) {
  return drizzle(d1, { schema });
}

/**
 * D1 rejects Drizzle's `db.transaction()` at runtime (it issues raw BEGIN/SAVEPOINT
 * SQL, which D1 disallows) — `db.batch([...])` is the only atomic multi-statement
 * primitive D1 supports. `batch` requires a non-empty tuple type; this narrows a
 * plain array built at runtime into that shape.
 */
export function toBatch<T>(items: T[]): [T, ...T[]] {
  if (items.length === 0) {
    throw new Error('db.batch requires at least one statement');
  }
  return items as [T, ...T[]];
}
