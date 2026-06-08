#!/usr/bin/env node
/**
 * One-time data migration: dumps every row from the legacy FastAPI/SQLite
 * database (api/database_schema.py, e.g. data/nightlio.db) into a SQL file of
 * INSERT statements that can be replayed against D1.
 *
 * Table names and columns are identical between the source SQLite schema and
 * the new Drizzle/D1 schema (functions/_shared/db/schema/*.ts) — this is a
 * straight row copy, not a transformation. Tables are ordered so foreign keys
 * are always satisfied (parents before children).
 *
 * Usage:
 *   node scripts/migration/sqlite-to-d1.mjs <path-to-sqlite-db> [output.sql]
 *
 * Then replay it:
 *   wrangler d1 execute waymark-db --local  --file=<output.sql>   # local check
 *   wrangler d1 execute waymark-db --remote --file=<output.sql>   # production
 *
 * Run `wrangler d1 migrations apply DB --local/--remote` FIRST so the target
 * tables exist. That migration also seeds default `groups`/`group_options`
 * rows — since the source instance has its own (and `mood_entries` reference
 * them by id), this script clears those defaults right before replaying the
 * source's `groups` data (see GROUP_CLEANUP_TABLES below) so the original ids
 * survive the round trip without PRIMARY KEY conflicts or duplicates. Aside
 * from that, the destination should be empty — this script does not delete or
 * upsert any other existing rows.
 */
import { existsSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import Database from 'better-sqlite3';

// Parents before children, so FK references always resolve on replay.
const TABLES = [
  'users',
  'groups',
  'group_options',
  'mood_entries',
  'entry_mood_logs',
  'entry_selections',
  'entry_slider_values',
  'goals',
  'goal_completions',
  'user_preferences',
  'user_metrics',
  'achievements',
  'fitness_connections',
  'fitness_data',
];

function quoteIdent(name) {
  return `\`${name.replace(/`/g, '``')}\``;
}

// `groups`/`group_options` are global tables pre-populated by
// drizzle/0001_seed_default_groups.sql. Clear them (child-to-parent, FK-safe)
// right before replaying the source's own rows so original ids transfer
// cleanly — `entry_selections`/`entry_slider_values` reference them and would
// otherwise either collide on id or end up duplicated alongside the seed data.
const GROUP_CLEANUP_TABLES = ['entry_selections', 'entry_slider_values', 'group_options', 'groups'];

function groupCleanupSql() {
  return GROUP_CLEANUP_TABLES.map((table) => `DELETE FROM ${quoteIdent(table)};`).join('\n');
}

function formatValue(value) {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'number') {
    return Number.isFinite(value) ? String(value) : 'NULL';
  }
  if (typeof value === 'bigint') return value.toString();
  if (Buffer.isBuffer(value)) return `X'${value.toString('hex')}'`;
  // SQLite stores booleans/JSON as integers/TEXT already — pass strings through verbatim.
  return `'${String(value).replace(/'/g, "''")}'`;
}

function tableToInserts(db, table) {
  const rows = db.prepare(`SELECT * FROM ${quoteIdent(table)}`).all();
  if (rows.length === 0) return { count: 0, sql: '' };

  const columns = Object.keys(rows[0]);
  const columnList = columns.map(quoteIdent).join(', ');
  const statements = rows.map((row) => {
    const values = columns.map((col) => formatValue(row[col])).join(', ');
    return `INSERT INTO ${quoteIdent(table)} (${columnList}) VALUES (${values});`;
  });

  return { count: rows.length, sql: statements.join('\n') };
}

async function main() {
  const [, , dbPathArg, outArg] = process.argv;
  if (!dbPathArg) {
    console.error('Usage: node scripts/migration/sqlite-to-d1.mjs <path-to-sqlite-db> [output.sql]');
    process.exitCode = 1;
    return;
  }

  const dbPath = path.resolve(dbPathArg);
  if (!existsSync(dbPath)) {
    console.error(`SQLite database not found at ${dbPath}`);
    process.exitCode = 1;
    return;
  }

  const outPath = path.resolve(outArg ?? 'd1-data-migration.sql');
  const db = new Database(dbPath, { readonly: true });

  try {
    const chunks = [];
    const counts = {};

    for (const table of TABLES) {
      const exists = db
        .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?")
        .get(table);
      if (!exists) {
        console.warn(`Skipping ${table}: not present in source database`);
        continue;
      }

      const { count, sql } = tableToInserts(db, table);
      counts[table] = count;

      if (table === 'groups' && count > 0) {
        chunks.push(`-- Clear seed-migration defaults before replaying source groups\n${groupCleanupSql()}`);
      }

      if (count > 0) {
        chunks.push(`-- ${table} (${count} rows)\n${sql}`);
      }
    }

    await writeFile(outPath, `${chunks.join('\n\n')}\n`, 'utf8');

    console.log(`Wrote ${outPath}`);
    console.log('Row counts:');
    for (const [table, count] of Object.entries(counts)) {
      console.log(`  ${table.padEnd(22)} ${count}`);
    }
    console.log('\nReplay against D1, e.g.:');
    console.log(`  wrangler d1 execute waymark-db --local  --file=${path.relative(process.cwd(), outPath)}`);
    console.log(`  wrangler d1 execute waymark-db --remote --file=${path.relative(process.cwd(), outPath)}`);
    console.log('\nAfter replaying, spot-check counts and JSON columns, e.g.:');
    console.log("  wrangler d1 execute waymark-db --remote --command \"SELECT COUNT(*) FROM mood_entries\"");
    console.log("  wrangler d1 execute waymark-db --remote --command \"SELECT mood_icons FROM user_preferences LIMIT 5\"");
  } finally {
    db.close();
  }
}

main();
