// File System Access permission methods are not in this project's DOM lib yet.
interface PermittedFileHandle extends FileSystemFileHandle {
  queryPermission(descriptor: { mode: 'read' }): Promise<PermissionState>;
  requestPermission(descriptor: { mode: 'read' }): Promise<PermissionState>;
}

export type ReopenResult =
  | { status: 'opened'; file: File; handle: FileSystemFileHandle }
  | { status: 'needs-gesture' }
  | { status: 'denied' }
  | { status: 'missing' };

export async function reopenRecentFile(name: string): Promise<ReopenResult> {
  const handle = HandleStore.cached(name) ?? await HandleStore.get(name);
  if (!handle) return { status: 'missing' };
  try {
    const permitted = handle as PermittedFileHandle;
    let permission = await permitted.queryPermission({ mode: 'read' });
    if (permission !== 'granted') {
      if (navigator.userActivation && !navigator.userActivation.isActive) {
        return { status: 'needs-gesture' };
      }
      permission = await permitted.requestPermission({ mode: 'read' });
    }
    if (permission !== 'granted') return { status: 'denied' };
    return { status: 'opened', file: await handle.getFile(), handle };
  } catch {
    return { status: 'denied' };
  }
}

// IndexedDB store for FileSystemFileHandle persistence.
// Handles are also kept in memory so a click can call requestPermission
// before any IndexedDB await, while the user gesture is still active.
const memoryHandles = new Map<string, FileSystemFileHandle>();

export const HandleStore = {
  remember(name: string, handle: FileSystemFileHandle) {
    memoryHandles.set(name, handle);
  },
  cached(name: string): FileSystemFileHandle | null {
    return memoryHandles.get(name) ?? null;
  },
  async preload(names: string[]): Promise<void> {
    await Promise.all(names.map((name) => this.get(name)));
  },
  _dbPromise: null as Promise<IDBDatabase> | null,
  _db() {
    if (!this._dbPromise) {
      this._dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
        if (!('indexedDB' in window)) { reject(new Error('no-idb')); return; }
        const req = indexedDB.open('mdreader-handles', 1);
        req.onupgradeneeded = () => { req.result.createObjectStore('handles'); };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
    }
    return this._dbPromise;
  },
  async set(name: string, handle: FileSystemFileHandle): Promise<void> {
    memoryHandles.set(name, handle);
    try {
      const db = await this._db();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction('handles', 'readwrite');
        tx.objectStore('handles').put(handle, name);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch { /* ignore */ }
  },
  async get(name: string): Promise<FileSystemFileHandle | null> {
    const remembered = memoryHandles.get(name);
    if (remembered) return remembered;
    try {
      const db = await this._db();
      return await new Promise((resolve, reject) => {
        const tx = db.transaction('handles', 'readonly');
        const req = tx.objectStore('handles').get(name);
        req.onsuccess = () => {
          const handle = (req.result as FileSystemFileHandle) || null;
          if (handle) memoryHandles.set(name, handle);
          resolve(handle);
        };
        req.onerror = () => reject(req.error);
      });
    } catch { return null; }
  },
  async remove(name: string): Promise<void> {
    memoryHandles.delete(name);
    try {
      const db = await this._db();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction('handles', 'readwrite');
        tx.objectStore('handles').delete(name);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch { /* ignore */ }
  }
};
