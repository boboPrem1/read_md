import { POSITIONS_KEY, MAX_POSITIONS } from '../constants';

export const PositionManager = {
  _data: null as Record<string, { f: number; t: number }> | null,
  _load() {
    if (this._data) return;
    try {
      const raw = localStorage.getItem(POSITIONS_KEY);
      this._data = raw ? (JSON.parse(raw) as Record<string, { f: number; t: number }>) : {};
    } catch { this._data = {}; }
  },
  save(hash: string, fraction: number): void {
    this._load();
    this._data![hash] = { f: fraction, t: Date.now() };
    const keys = Object.keys(this._data!);
    if (keys.length > MAX_POSITIONS) {
      keys.sort((a, b) => this._data![a].t - this._data![b].t);
      keys.slice(0, keys.length - MAX_POSITIONS).forEach(k => delete this._data![k]);
    }
    try { localStorage.setItem(POSITIONS_KEY, JSON.stringify(this._data)); } catch { /* ignore */ }
  },
  get(hash: string): number | null {
    this._load();
    return this._data![hash]?.f ?? null;
  }
};
