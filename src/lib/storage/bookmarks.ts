import { BOOKMARKS_KEY } from '../constants';

export type Bookmark = { pos: number; label: string; id: number };

export function loadBookmarks(hash: string): Bookmark[] {
  try {
    const all = JSON.parse(localStorage.getItem(BOOKMARKS_KEY) || '{}') as Record<string, Bookmark[]>;
    return all[hash] || [];
  } catch { return []; }
}

export function saveBookmarks(hash: string, bookmarks: Bookmark[]): void {
  try {
    const all = JSON.parse(localStorage.getItem(BOOKMARKS_KEY) || '{}') as Record<string, Bookmark[]>;
    if (bookmarks.length) all[hash] = bookmarks;
    else delete all[hash];
    localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(all));
  } catch { /* ignore */ }
}
