import type { LoadedVolume } from "./load";

export type CachedVolume = Omit<LoadedVolume, "ref">;

export interface LedgerCache {
  get(key: string): Promise<CachedVolume | null>;
  put(key: string, v: CachedVolume): Promise<void>;
  clear(): Promise<void>;
}

export function cacheKey(volumeId: string, sha: string): string {
  return `${volumeId}@${sha}`;
}

export function memoryCache(): LedgerCache {
  const store = new Map<string, CachedVolume>();
  return {
    async get(key) { return store.get(key) ?? null; },
    async put(key, v) { store.set(key, v); },
    async clear() { store.clear(); },
  };
}

const STORE = "volumes";

function open(dbName: string): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(dbName, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function run<T>(db: IDBDatabase, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest): Promise<T> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const req = fn(tx.objectStore(STORE));
    req.onsuccess = () => resolve(req.result as T);
    req.onerror = () => reject(req.error);
  });
}

/** Caches a loaded volume keyed by commit sha. Every failure degrades to a
 *  cache miss so a browser with storage disabled still reads the ledger. */
export function idbCache(dbName = "codex-cache"): LedgerCache {
  return {
    async get(key) {
      try {
        const db = await open(dbName);
        const v = await run<CachedVolume | undefined>(db, "readonly", (s) => s.get(key));
        db.close();
        return v ?? null;
      } catch { return null; }
    },
    async put(key, v) {
      try {
        const db = await open(dbName);
        await run(db, "readwrite", (s) => s.put(v, key));
        db.close();
      } catch { /* storage unavailable: skip the cache */ }
    },
    async clear() {
      try {
        const db = await open(dbName);
        await run(db, "readwrite", (s) => s.clear());
        db.close();
      } catch { /* nothing to clear */ }
    },
  };
}
