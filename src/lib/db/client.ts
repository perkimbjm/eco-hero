/**
 * SQLite client running entirely in the browser via sql.js (SQLite compiled to
 * WebAssembly). There is no server and no network call at query time: the whole
 * database lives in WASM memory and is mirrored to IndexedDB after every write.
 */

import initSqlJs, { type Database, type SqlValue } from 'sql.js';
import wasmUrl from 'sql.js/dist/sql-wasm.wasm?url';
import schemaSql from './schema.sql?raw';
import { loadSnapshot, saveSnapshot, clearSnapshot } from './storage';

/** Seed database shipped in public/, used the first time a browser runs the game. */
const SEED_URL = `${import.meta.env.BASE_URL}eco_guardian_game.db`;

/** Writes are batched for this long so a burst of updates costs one export. */
const SAVE_DEBOUNCE_MS = 250;

export type QueryParams = ReadonlyArray<SqlValue>;

/** Shared boot promise — concurrent callers must not open two databases. */
let bootPromise: Promise<Database> | null = null;

let saveTimer: ReturnType<typeof setTimeout> | null = null;
let flushListenersAttached = false;

/**
 * Returns the ready-to-use database, booting it on first call.
 *
 * Boot order: restore the IndexedDB snapshot, else fall back to the seed file,
 * else start empty. The schema is then applied on top, which is safe in all
 * three cases because every statement in it is idempotent.
 */
export function getDatabase(): Promise<Database> {
  if (!bootPromise) {
    bootPromise = boot().catch((error: unknown) => {
      // Let the next caller retry rather than caching a permanently failed boot.
      bootPromise = null;
      throw error;
    });
  }
  return bootPromise;
}

async function boot(): Promise<Database> {
  const SQL = await initSqlJs({ locateFile: () => wasmUrl });

  const snapshot = await loadSnapshot();
  const initialBytes = snapshot ?? (await fetchSeed());

  const database = initialBytes ? new SQL.Database(initialBytes) : new SQL.Database();
  database.exec(schemaSql);

  attachFlushListeners();

  // A brand-new database (or a freshly seeded one) is not in IndexedDB yet.
  if (!snapshot) await saveSnapshot(database.export());

  return database;
}

/**
 * Loads the seed database. A missing or unreadable seed is recoverable — the
 * schema alone is enough to start a valid, empty game — so we return null
 * instead of failing the boot.
 */
async function fetchSeed(): Promise<Uint8Array | null> {
  try {
    const response = await fetch(SEED_URL);
    if (!response.ok) return null;
    return new Uint8Array(await response.arrayBuffer());
  } catch {
    return null;
  }
}

// ── Queries ─────────────────────────────────────────────────

/** Runs a SELECT and returns every row as a plain object. */
export async function selectAll<T>(sql: string, params: QueryParams = []): Promise<T[]> {
  const database = await getDatabase();
  const statement = database.prepare(sql);
  try {
    statement.bind(params as SqlValue[]);
    const rows: T[] = [];
    while (statement.step()) {
      rows.push(statement.getAsObject() as T);
    }
    return rows;
  } finally {
    statement.free();
  }
}

/** Runs a SELECT and returns the first row, or null when there is none. */
export async function selectOne<T>(sql: string, params: QueryParams = []): Promise<T | null> {
  const rows = await selectAll<T>(sql, params);
  return rows[0] ?? null;
}

/** Runs a write statement and schedules a snapshot save. */
export async function execute(sql: string, params: QueryParams = []): Promise<void> {
  const database = await getDatabase();
  database.run(sql, params as SqlValue[]);
  scheduleSave();
}

/** The rowid assigned by the most recent INSERT on the shared connection. */
export async function lastInsertId(): Promise<number> {
  const row = await selectOne<{ id: SqlValue }>('SELECT last_insert_rowid() AS id');
  return typeof row?.id === 'number' ? row.id : 0;
}

// ── Persistence ─────────────────────────────────────────────

/** Coalesces rapid writes into a single export + IndexedDB round trip. */
function scheduleSave(): void {
  if (saveTimer !== null) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveTimer = null;
    void flush();
  }, SAVE_DEBOUNCE_MS);
}

/** Writes the current database to IndexedDB immediately. */
export async function flush(): Promise<void> {
  if (saveTimer !== null) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
  if (!bootPromise) return;

  const database = await bootPromise;
  await saveSnapshot(database.export());
}

/**
 * A debounced save loses its race against a closing tab, so pending writes are
 * flushed when the page is hidden — the last reliable moment on mobile, where
 * `beforeunload` is not guaranteed to fire.
 */
function attachFlushListeners(): void {
  if (flushListenersAttached || typeof window === 'undefined') return;
  flushListenersAttached = true;

  const flushNow = () => {
    if (saveTimer !== null) void flush();
  };

  window.addEventListener('pagehide', flushNow);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushNow();
  });
}

/**
 * Wipes local game data and re-boots from the seed file. Exposed for a
 * "reset progress" action and for recovering from a corrupted snapshot.
 */
export async function resetDatabase(): Promise<void> {
  if (saveTimer !== null) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
  if (bootPromise) {
    const database = await bootPromise;
    database.close();
    bootPromise = null;
  }
  await clearSnapshot();
}
