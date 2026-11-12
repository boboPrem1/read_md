import { SAVED_DIRS_KEY } from '../constants';

export type SavedDirFile = { path: string; name: string; size: number };

export type SavedDir = {
  id: string;
  owner: string;
  repo: string;
  ref: string;
  path: string;
  url: string;
  count: number;
  scannedAt: number;
  files: SavedDirFile[];
  truncatedCache?: boolean;
};

export const GithubDirsStore = {
  get(): SavedDir[] {
    try { return JSON.parse(localStorage.getItem(SAVED_DIRS_KEY) || '[]') as SavedDir[]; }
    catch { return []; }
  },
  set(list: SavedDir[]): void {
    try {
      localStorage.setItem(SAVED_DIRS_KEY, JSON.stringify(list));
    } catch {
      try {
        const light = list.map(({ files: _files, ...rest }) => ({ ...rest, files: [] as SavedDirFile[], truncatedCache: true }));
        localStorage.setItem(SAVED_DIRS_KEY, JSON.stringify(light));
      } catch { /* ignore */ }
    }
  },
  remove(id: string): void {
    this.set(this.get().filter(d => d.id !== id));
  },
  find(id: string): SavedDir | null {
    return this.get().find(d => d.id === id) || null;
  }
};
