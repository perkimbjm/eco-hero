/**
 * Durable storage for the SQLite snapshot.
 *
 * sql.js keeps the whole database in WebAssembly memory, which dies with the
 * page. To survive a reload we export the database to a byte array and park it
 * in IndexedDB — the only browser store that takes binary data without a
 * base64 detour and without localStorage's ~5 MB ceiling.
 */

const IDB_NAME = 'eco-hero';
const IDB_VERSION = 1;
const STORE_NAME = 'sqlite';
const SNAPSHOT_KEY = 'main';

/** Set once IndexedDB proves unusable, so we stop retrying on every write. */
let storageDisabled = false;

/** True while snapshots can still be written; false after a hard IDB failure. */
export function isPersistenceAvailable(): boolean {
  return !storageDisabled && typeof indexedDB !== 'undefined';
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(IDB_NAME, IDB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB open failed'));
    request.onblocked = () => reject(new Error('IndexedDB open blocked by another tab'));
  });
}

/** Runs one transaction against the snapshot store and closes the connection. */
async function withStore<T>(
  mode: IDBTransactionMode,
  work: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  const db = await openDatabase();
  try {
    return await new Promise<T>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, mode);
      const request = work(transaction.objectStore(STORE_NAME));

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed'));
      transaction.onabort = () => reject(transaction.error ?? new Error('IndexedDB transaction aborted'));
    });
  } finally {
    db.close();
  }
}

/**
 * Reads the stored database, or null when there is nothing saved yet.
 * A storage failure here is not fatal — the caller falls back to the seed file.
 */
export async function loadSnapshot(): Promise<Uint8Array | null> {
  if (!isPersistenceAvailable()) return null;

  try {
    const stored = await withStore<ArrayBuffer | Uint8Array | undefined>('readonly', (store) =>
      store.get(SNAPSHOT_KEY)
    );
    if (!stored) return null;
    return stored instanceof Uint8Array ? stored : new Uint8Array(stored);
  } catch (error) {
    disablePersistence('read', error);
    return null;
  }
}

/** Overwrites the stored database with the given bytes. */
export async function saveSnapshot(bytes: Uint8Array): Promise<void> {
  if (!isPersistenceAvailable()) return;

  try {
    await withStore('readwrite', (store) => store.put(bytes, SNAPSHOT_KEY));
  } catch (error) {
    disablePersistence('write', error);
  }
}

/** Drops the stored database so the next boot starts from the seed file again. */
export async function clearSnapshot(): Promise<void> {
  if (!isPersistenceAvailable()) return;

  try {
    await withStore('readwrite', (store) => store.delete(SNAPSHOT_KEY));
  } catch (error) {
    disablePersistence('clear', error);
  }
}

/**
 * IndexedDB is blocked in some privacy modes and embedded webviews. The game is
 * still fully playable in memory, so we degrade instead of throwing — but we
 * say so once, because "progress silently never saves" is worth knowing about.
 */
function disablePersistence(operation: string, error: unknown): void {
  storageDisabled = true;
  const reason = error instanceof Error ? error.message : String(error);
  console.warn(
    `[eco-hero] IndexedDB ${operation} failed (${reason}). ` +
      'Game progress will not survive a reload.'
  );
}
