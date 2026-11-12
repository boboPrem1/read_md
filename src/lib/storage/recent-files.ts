import { RECENT_KEY, MAX_RECENT } from '../constants';
import { HandleStore } from './handle-store';

export type RecentFile = { name: string; size: number; date: number };

export function getRecentFiles(): RecentFile[] {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]') as RecentFile[]; }
  catch { return []; }
}

export function addRecentFile(name: string, size: number, handle?: FileSystemFileHandle | null): void {
  const list = getRecentFiles().filter(f => f.name !== name);
  list.unshift({ name, size, date: Date.now() });
  if (list.length > MAX_RECENT) list.length = MAX_RECENT;
  try { localStorage.setItem(RECENT_KEY, JSON.stringify(list)); } catch { /* ignore */ }
  if (handle) HandleStore.set(name, handle);
}

export function clearRecentFiles(): void {
  try { localStorage.removeItem(RECENT_KEY); } catch { /* ignore */ }
}

export function removeRecentFile(name: string): void {
  const list = getRecentFiles().filter(f => f.name !== name);
  try { localStorage.setItem(RECENT_KEY, JSON.stringify(list)); } catch { /* ignore */ }
  HandleStore.remove(name);
}

