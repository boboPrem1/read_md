// IndexedDB store for FileSystemFileHandle persistence.
export const HandleStore = {
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
    try {
      const db = await this._db();
      return await new Promise((resolve, reject) => {
        const tx = db.transaction('handles', 'readonly');
        const req = tx.objectStore('handles').get(name);
        req.onsuccess = () => resolve((req.result as FileSystemFileHandle) || null);
        req.onerror = () => reject(req.error);
      });
    } catch { return null; }
  },
  async remove(name: string): Promise<void> {
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
