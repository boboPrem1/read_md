import { PREFS_KEY } from '../constants';

export const READING_DEFAULTS = { fontSize: 18, lineHeight: 1.6, contentWidth: 66, fontFamily: 'serif' };
export const FONT_SIZE_RANGE = { min: 14, max: 24 };

export const Preferences = {
  defaults: {
    theme: 'auto', ...READING_DEFAULTS, minimalMode: false, sidebarOpen: true, prefsVersion: 2
  } as Record<string, unknown>,
  _data: null as Record<string, unknown> | null,
  load(): Record<string, unknown> {
    try {
      const raw = localStorage.getItem(PREFS_KEY);
      const stored: Record<string, unknown> = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
      // Version 1 stored the line length in px and offered free-form sliders.
      if (stored['prefsVersion'] !== this.defaults['prefsVersion']) {
        delete stored['contentWidth'];
        delete stored['lineHeight'];
        stored['prefsVersion'] = this.defaults['prefsVersion'];
      }
      this._data = { ...this.defaults, ...stored };
    } catch { this._data = { ...this.defaults }; }
    return this._data!;
  },
  get(key: string): unknown { return (this._data || this.load())[key]; },
  set(key: string, val: unknown): void {
    if (!this._data) this.load();
    this._data![key] = val;
    try { localStorage.setItem(PREFS_KEY, JSON.stringify(this._data)); } catch { /* ignore */ }
  }
};
