import { marked } from 'marked';
import DOMPurify from 'dompurify';
import hljs from 'highlight.js';
import katex from 'katex';
import mermaid from 'mermaid';
import {
  ACCEPTED_EXTENSIONS, WORDS_PER_MINUTE, PREFS_KEY, POSITIONS_KEY, MAX_POSITIONS,
  BOOKMARKS_KEY, RECENT_KEY, ANNOTATIONS_KEY, MAX_RECENT, EMOJI_MAP,
  ALERT_ICONS, ALERT_LABELS, GITHUB_SOURCE_KEY, SAVED_DIRS_KEY
} from './constants';

let _initialized = false;

// ── State ──
const state = {
  fileName: '',
  fileHash: '',
  rawContent: '',
  headings: [] as HTMLElement[],
  activeHeading: null as string | null,
  searchResults: [] as HTMLElement[],
  searchIndex: -1,
  sidebarOpen: true,
  settingsOpen: false,
  searchOpen: false,
  minimalMode: false,
  lightboxOpen: false,
  shortcutsOpen: false,
  focusMode: false,
  navHistory: [] as number[],
  totalWords: 0,
  bookmarks: [] as { pos: number; label: string; id: number }[],
  annotations: [] as { id: number; text: string; color: string; note: string; created: number }[],
  statsOpen: false,
  editorOpen: false,
  presentationOpen: false,
  presentationSlide: 0,
  regexSearch: false,
  dirty: false,
};

// ── Utilities ──
function debounce(fn: (...args: unknown[]) => void, ms: number) {
  let t: ReturnType<typeof setTimeout>;
  return function(this: unknown, ...a: unknown[]) { clearTimeout(t); t = setTimeout(() => fn.apply(this, a), ms); };
}
function throttle(fn: (...args: unknown[]) => void, ms: number) {
  let last = 0;
  return function(this: unknown, ...a: unknown[]) { const now = Date.now(); if (now - last >= ms) { last = now; fn.apply(this, a); } };
}
function escapeHtml(s: string) {
  const d = document.createElement('div'); d.textContent = s; return d.innerHTML;
}
function frenchTypography(html: string) {
  html = html.replace(/\s+([;:!?»])/g, ' $1');
  html = html.replace(/(«)\s+/g, '$1 ');
  return html;
}
// Applies a text transform to prose only: code (and Mermaid sources, which are code blocks
// at this stage) and HTML attributes must reach their consumers byte-for-byte.
function transformProseText(html: string, transform: (text: string) => string) {
  const template = document.createElement('template');
  template.innerHTML = html;
  const walker = document.createTreeWalker(template.content, NodeFilter.SHOW_TEXT);
  let node: Node | null;
  while ((node = walker.nextNode())) {
    if (node.parentElement?.closest('pre, code, kbd, samp, var')) continue;
    node.nodeValue = transform(node.nodeValue || '');
  }
  return template.innerHTML;
}
let toastTimer: ReturnType<typeof setTimeout> | undefined;
// Every consequential action reports what happened and, when possible, how to undo it.
function showToast(msg: string, opts: { action?: string; onAction?: () => void; duration?: number } = {}) {
  let toast = document.querySelector('.toast') as HTMLElement | null;
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = '';
  const text = document.createElement('span');
  text.textContent = msg;
  toast.appendChild(text);
  const hide = () => toast!.classList.remove('visible');
  if (opts.action && opts.onAction) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = opts.action;
    btn.addEventListener('click', () => { hide(); opts.onAction!(); });
    toast.appendChild(btn);
  }
  toast.classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(hide, opts.duration ?? (opts.action ? 6000 : 2400));
  Announcer.say(msg);
}
function contentFraction() {
  const content = document.getElementById('content');
  if (!content || content.scrollHeight <= content.clientHeight) return 0;
  return content.scrollTop / (content.scrollHeight - content.clientHeight);
}
function showDocumentLoading() {
  const welcome = document.getElementById('welcome');
  const reader = document.getElementById('reader');
  const article = document.getElementById('article');
  if (!welcome || !reader || !article) return;
  article.innerHTML = '<div class="loading-indicator"><div class="loading-spinner"></div><span>Chargement du document...</span></div>';
  welcome.classList.add('hidden');
  reader.classList.remove('hidden');
}
function hashString(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = ((h << 5) - h + s.charCodeAt(i)) | 0; }
  return h.toString(36);
}
function slugify(text: string) {
  return text.toLowerCase().replace(/<[^>]*>/g, '').replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').trim();
}
function scrollBehavior(): ScrollBehavior {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
}
function removeAccents(str: string) {
  return str.normalize('NFD').replace(/[̀-ͯ]/g, '');
}
function trapFocus(container: HTMLElement) {
  const focusable = container.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
  if (focusable.length === 0) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  first.focus();
  const handler = (e: KeyboardEvent) => {
    if (e.key !== 'Tab') return;
    if (e.shiftKey) {
      if (document.activeElement === first) { e.preventDefault(); last.focus(); }
    } else {
      if (document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  };
  (container as any)._trapHandler = handler;
  container.addEventListener('keydown', handler);
}
function releaseFocus(container: HTMLElement) {
  if ((container as any)._trapHandler) {
    container.removeEventListener('keydown', (container as any)._trapHandler);
    delete (container as any)._trapHandler;
  }
}

const Announcer = {
  _el: null as HTMLElement | null,
  init() {
    this._el = document.createElement('div');
    this._el.setAttribute('role', 'status');
    this._el.setAttribute('aria-live', 'polite');
    this._el.setAttribute('aria-atomic', 'true');
    this._el.className = 'aria-live';
    document.body.appendChild(this._el);
  },
  say(msg: string) {
    if (!this._el) return;
    this._el.textContent = '';
    setTimeout(() => { this._el!.textContent = msg; }, 100);
  }
};

// ── Handle store (IndexedDB) ──
const HandleStore = {
  _dbPromise: null as Promise<IDBDatabase> | null,
  _db() {
    if (!this._dbPromise) {
      this._dbPromise = new Promise((resolve, reject) => {
        if (!('indexedDB' in window)) { reject(new Error('no-idb')); return; }
        const req = indexedDB.open('mdreader-handles', 1);
        req.onupgradeneeded = () => { req.result.createObjectStore('handles'); };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
    }
    return this._dbPromise;
  },
  async set(name: string, handle: FileSystemFileHandle) {
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
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => reject(req.error);
      });
    } catch { return null; }
  },
  async remove(name: string) {
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

const RecentFiles = {
  get(): { name: string; size: number; date: number }[] {
    try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]'); } catch { return []; }
  },
  add(name: string, size: number, handle?: FileSystemFileHandle | null) {
    const list = this.get().filter(f => f.name !== name);
    list.unshift({ name, size, date: Date.now() });
    if (list.length > MAX_RECENT) list.length = MAX_RECENT;
    try { localStorage.setItem(RECENT_KEY, JSON.stringify(list)); } catch { /* ignore */ }
    if (handle) HandleStore.set(name, handle);
    this.render();
  },
  clear() {
    try { localStorage.removeItem(RECENT_KEY); } catch { /* ignore */ }
    this.render();
  },
  render() {
    const container = document.getElementById('recentFiles');
    if (!container) return;
    const files = this.get();
    if (files.length === 0) { container.innerHTML = ''; return; }
    const ago = (ts: number) => {
      const d = Math.floor((Date.now() - ts) / 86400000);
      if (d === 0) return "Aujourd'hui";
      if (d === 1) return 'Hier';
      return d + ' jours';
    };
    container.innerHTML = '<h3>Fichiers récents <button class="recent-file-clear" id="clearRecent">Effacer</button></h3>' +
      files.map(f => '<div class="recent-file-item" data-name="' + escapeHtml(f.name) + '" tabindex="0" role="button" aria-label="Rouvrir ' + escapeHtml(f.name) + '"><span class="recent-file-name">' + escapeHtml(f.name) + '</span><span class="recent-file-date">' + ago(f.date) + '</span></div>').join('');
    document.getElementById('clearRecent')?.addEventListener('click', (e) => { e.stopPropagation(); this.clear(); });
    container.querySelectorAll('.recent-file-item').forEach(item => {
      const el = item as HTMLElement;
      const open = () => this.reopen(el.dataset.name!);
      el.addEventListener('click', open);
      el.addEventListener('keydown', (e) => { if ((e as KeyboardEvent).key === 'Enter' || (e as KeyboardEvent).key === ' ') { e.preventDefault(); open(); } });
    });
  },
  async reopen(name: string) {
    showDocumentLoading();
    const handle = await HandleStore.get(name);
    if (handle) {
      try {
        let permission = await (handle as any).queryPermission({ mode: 'read' });
        if (permission !== 'granted') permission = await (handle as any).requestPermission({ mode: 'read' });
        if (permission === 'granted') {
          const file = await handle.getFile();
          FileLoader.loadFile(file, handle);
          return;
        }
      } catch { /* ignore */ }
    }
    document.getElementById('welcome')?.classList.remove('hidden');
    document.getElementById('reader')?.classList.add('hidden');
    showToast(handle ? 'Impossible de rouvrir automatiquement — sélectionnez le fichier' : 'Sélectionnez à nouveau « ' + name + ' »');
    document.getElementById('fileInput')?.click();
  }
};

// In-document jumps are always reversible.
const Nav = {
  remember() {
    const content = document.getElementById('content');
    if (!content) return;
    state.navHistory.push(content.scrollTop);
    if (state.navHistory.length > 20) state.navHistory.shift();
    this.sync();
  },
  back() {
    const pos = state.navHistory.pop();
    if (pos !== undefined) document.getElementById('content')?.scrollTo({ top: pos, behavior: scrollBehavior() });
    this.sync();
  },
  reset() { state.navHistory = []; this.sync(); },
  sync() {
    const btn = document.getElementById('navBack');
    if (btn) btn.hidden = state.navHistory.length === 0;
  }
};

const Bookmarks = {
  load() {
    try {
      const all = JSON.parse(localStorage.getItem(BOOKMARKS_KEY) || '{}');
      state.bookmarks = all[state.fileHash] || [];
    } catch { state.bookmarks = []; }
  },
  save() {
    try {
      const all = JSON.parse(localStorage.getItem(BOOKMARKS_KEY) || '{}');
      if (state.bookmarks.length) all[state.fileHash] = state.bookmarks;
      else delete all[state.fileHash];
      localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(all));
    } catch { /* ignore */ }
  },
  current() {
    const fraction = contentFraction();
    return state.bookmarks.find(b => Math.abs(b.pos - fraction) < 0.01);
  },
  toggle() {
    const existing = this.current();
    if (existing) { this.remove(existing.id); return; }
    const fraction = contentFraction();
    const active = state.headings.find(h => h.id === state.activeHeading);
    const label = active ? (active.textContent || '').replace(/^#\s*/, '') : 'Début du document';
    state.bookmarks.push({ pos: fraction, label, id: Date.now() });
    this.save();
    this.renderPanel();
    showToast('Signet ajouté : ' + label);
  },
  goTo(pos: number) {
    const content = document.getElementById('content');
    if (!content) return;
    Nav.remember();
    content.scrollTo({ top: pos * (content.scrollHeight - content.clientHeight), behavior: scrollBehavior() });
    if (window.innerWidth <= 900) UI.closeSidebar();
  },
  remove(id: number) {
    const removed = state.bookmarks.find(b => b.id === id);
    state.bookmarks = state.bookmarks.filter(b => b.id !== id);
    this.save();
    this.renderPanel();
    if (removed) {
      showToast('Signet retiré', {
        action: 'Annuler',
        onAction: () => { state.bookmarks.push(removed); this.save(); this.renderPanel(); },
      });
    }
  },
  syncButton() {
    const btn = document.getElementById('bookmarkToggle');
    if (!btn) return;
    const marked = !!this.current();
    btn.setAttribute('aria-pressed', String(marked));
    btn.setAttribute('aria-label', marked ? 'Retirer le signet de cette position' : 'Marquer cette position');
  },
  renderPanel() {
    const container = document.getElementById('bookmarksPanel');
    const count = document.getElementById('bookmarksCount');
    if (count) count.textContent = state.bookmarks.length ? String(state.bookmarks.length) : '';
    this.syncButton();
    if (!container) return;
    if (state.bookmarks.length === 0) {
      container.innerHTML = '<p class="panel-empty"><strong>Aucun signet.</strong> Utilisez l\'icône de signet dans la barre, ou Ctrl+B, pour marquer votre position.</p>';
      return;
    }
    const sorted = [...state.bookmarks].sort((a, b) => a.pos - b.pos);
    container.innerHTML = '<ul class="panel-list">' + sorted.map(b =>
      '<li class="panel-item"><button type="button" class="panel-go" data-pos="' + b.pos + '"><span class="panel-go-text">' + escapeHtml(b.label) + '</span><span class="panel-go-meta">' + Math.round(b.pos * 100) + ' % du document</span></button>' +
      '<button type="button" class="panel-remove" data-id="' + b.id + '" aria-label="Retirer le signet ' + escapeHtml(b.label) + '" title="Retirer">&times;</button></li>').join('') + '</ul>';
    container.querySelectorAll('.panel-go').forEach(btn => btn.addEventListener('click', () => this.goTo(parseFloat((btn as HTMLElement).dataset.pos!))));
    container.querySelectorAll('.panel-remove').forEach(btn => btn.addEventListener('click', () => this.remove(parseInt((btn as HTMLElement).dataset.id!))));
  }
};

const Breadcrumb = {
  update() {
    const el = document.getElementById('breadcrumb');
    if (!el) return;
    const clean = (h: HTMLElement) => (h.textContent || '').replace(/^#\s*/, '');
    const active = state.activeHeading ? state.headings.find(h => h.id === state.activeHeading) : null;
    const btn = document.getElementById('sectionBtn');
    if (!active) {
      el.innerHTML = '<span class="crumb-current">Début du document</span>';
      btn?.setAttribute('aria-label', 'Début du document. Ouvrir le sommaire');
      return;
    }
    const level = parseInt(active.tagName[1]);
    let parent: HTMLElement | null = null;
    for (let i = state.headings.indexOf(active) - 1; i >= 0; i--) {
      const candidate = parseInt(state.headings[i].tagName[1]);
      if (candidate < level) { if (candidate > 1) parent = state.headings[i]; break; }
    }
    el.innerHTML = (parent ? '<span class="crumb-parent">' + escapeHtml(clean(parent)) + '</span><span class="crumb-sep" aria-hidden="true">›</span>' : '') +
      '<span class="crumb-current">' + escapeHtml(clean(active)) + '</span>';
    btn?.setAttribute('aria-label', 'Section en cours : ' + clean(active) + '. Ouvrir le sommaire');
  }
};

const Statistics = {
  toggle() {
    state.statsOpen = !state.statsOpen;
    const panel = document.getElementById('statsPanel');
    if (!panel) return;
    if (state.statsOpen) { this.compute(); panel.classList.add('visible'); trapFocus(panel); }
    else { panel.classList.remove('visible'); releaseFocus(panel); }
  },
  compute() {
    const text = state.rawContent;
    if (!text) return;
    const words = text.trim().split(/\s+/).length;
    const chars = text.length;
    const charsNoSpace = text.replace(/\s/g, '').length;
    const sentences = (text.match(/[.!?]+(\s|$)/g) || []).length;
    const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim()).length;
    const headings = (text.match(/^#{1,6}\s/gm) || []).length;
    const links = (text.match(/\[([^\]]+)\]\(/g) || []).length;
    const images = (text.match(/!\[/g) || []).length;
    const codeBlocks = (text.match(/^```/gm) || []).length / 2;
    const readTime = Math.ceil(words / WORDS_PER_MINUTE);
    const avgWordLen = charsNoSpace / Math.max(words, 1);
    const avgSentLen = words / Math.max(sentences, 1);
    const readability = Math.max(0, Math.min(100, 206.835 - 1.015 * avgSentLen - 84.6 * (avgWordLen / 5)));
    const inner = document.querySelector('.stats-inner');
    if (!inner) return;
    inner.innerHTML = '<h2>Statistiques du document</h2><button class="stats-close" aria-label="Fermer">&times;</button>' +
      '<div class="stats-grid">' +
      this.card(words, 'Mots') + this.card(chars, 'Caractères') + this.card(sentences, 'Phrases') +
      this.card(paragraphs, 'Paragraphes') + this.card(headings, 'Titres') + this.card(readTime + ' min', 'Temps de lecture') +
      '</div>' +
      '<div class="stats-detail"><h3>Détails</h3>' +
      this.row('Caractères (sans espaces)', charsNoSpace) +
      this.row('Liens', links) + this.row('Images', images) +
      this.row('Blocs de code', Math.floor(codeBlocks)) +
      this.row('Longueur moyenne des phrases', avgSentLen.toLocaleString('fr-FR', { maximumFractionDigits: 1 }) + ' mots') +
      this.row('Lisibilité (Flesch)', readability.toFixed(0) + '/100') +
      '</div>';
    inner.querySelector('.stats-close')!.addEventListener('click', () => this.toggle());
  },
  card(val: string | number, label: string) { return '<div class="stat-card"><span class="stat-value">' + (typeof val === 'number' ? val.toLocaleString('fr-FR') : val) + '</span><span class="stat-label">' + label + '</span></div>'; },
  row(label: string, val: string | number) { return '<div class="stats-detail-row"><span>' + label + '</span><span>' + (typeof val === 'number' ? val.toLocaleString('fr-FR') : val) + '</span></div>'; }
};

const ANNOTATION_COLORS: Record<string, { name: string; value: string }> = {
  yellow: { name: 'jaune', value: '#facc15' },
  green: { name: 'vert', value: '#4ade80' },
  blue: { name: 'bleu', value: '#60a5fa' },
  pink: { name: 'rose', value: '#f472b6' },
};

const Annotations = {
  load() {
    try {
      const all = JSON.parse(localStorage.getItem(ANNOTATIONS_KEY) || '{}');
      state.annotations = all[state.fileHash] || [];
    } catch { state.annotations = []; }
  },
  save() {
    try {
      const all = JSON.parse(localStorage.getItem(ANNOTATIONS_KEY) || '{}');
      if (state.annotations.length) all[state.fileHash] = state.annotations;
      else delete all[state.fileHash];
      localStorage.setItem(ANNOTATIONS_KEY, JSON.stringify(all));
    } catch { /* ignore */ }
  },
  // Wraps each annotation not yet in the page; returns false if one could not be located.
  apply() {
    const article = document.getElementById('article');
    if (!article) return true;
    let allPlaced = true;
    state.annotations.forEach(ann => {
      if (article.querySelector('[data-ann-id="' + ann.id + '"]')) return;
      const walker = document.createTreeWalker(article, NodeFilter.SHOW_TEXT, null);
      let node: Node | null;
      while ((node = walker.nextNode())) {
        const idx = (node.textContent || '').indexOf(ann.text);
        if (idx < 0) continue;
        const range = document.createRange();
        range.setStart(node, idx);
        range.setEnd(node, idx + ann.text.length);
        const span = document.createElement('span');
        this.decorate(span, ann);
        try { range.surroundContents(span); return; } catch { break; }
      }
      allPlaced = false;
    });
    return allPlaced;
  },
  decorate(span: HTMLElement, ann: { id: number; color: string; note: string }) {
    span.className = 'annotation-highlight' + (ann.color !== 'yellow' ? ' color-' + ann.color : '') + (ann.note ? ' has-note' : '');
    span.dataset.annId = String(ann.id);
    if (ann.note) span.title = ann.note; else span.removeAttribute('title');
  },
  add(text: string, color: string, note?: string) {
    if (!text || text.length < 2) return;
    const ann = { id: Date.now(), text: text.substring(0, 200), color: color || 'yellow', note: note || '', created: Date.now() };
    state.annotations.push(ann);
    if (!this.apply()) {
      state.annotations = state.annotations.filter(a => a.id !== ann.id);
      showToast('Ce passage traverse plusieurs blocs ou styles. Sélectionnez un passage plus court.', { duration: 4500 });
      return;
    }
    this.save();
    this.renderPanel();
    showToast(note ? 'Note enregistrée' : 'Passage surligné', {
      action: 'Annuler',
      onAction: () => this.remove(ann.id, true),
    });
  },
  remove(id: number, silent = false) {
    const removed = state.annotations.find(a => a.id === id);
    state.annotations = state.annotations.filter(a => a.id !== id);
    this.save();
    document.querySelectorAll('[data-ann-id="' + id + '"]').forEach(el => {
      const parent = el.parentNode!;
      while (el.firstChild) parent.insertBefore(el.firstChild, el);
      el.remove();
      parent.normalize();
    });
    this.renderPanel();
    if (removed && !silent) {
      showToast('Surlignage retiré', {
        action: 'Annuler',
        onAction: () => { state.annotations.push(removed); this.apply(); this.save(); this.renderPanel(); },
      });
    }
  },
  setNote(id: number, note: string) {
    const ann = state.annotations.find(a => a.id === id);
    if (!ann) return;
    ann.note = note;
    this.save();
    const span = document.querySelector('[data-ann-id="' + id + '"]') as HTMLElement | null;
    if (span) this.decorate(span, ann);
    this.renderPanel();
    showToast(note ? 'Note enregistrée' : 'Note retirée');
  },
  popup() {
    let popup = document.querySelector('.annotation-popup') as HTMLElement | null;
    if (!popup) {
      popup = document.createElement('div');
      popup.className = 'annotation-popup';
      popup.setAttribute('role', 'toolbar');
      popup.setAttribute('aria-label', 'Surligner la sélection');
      document.body.appendChild(popup);
      popup.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') { e.stopPropagation(); this.hidePopup(); }
      });
    }
    return popup;
  },
  place(popup: HTMLElement, rect: DOMRect) {
    popup.style.display = 'flex';
    const w = popup.offsetWidth;
    const h = popup.offsetHeight;
    const coarse = window.matchMedia('(pointer: coarse)').matches;
    const left = Math.max(8, Math.min(window.innerWidth - w - 8, rect.left + rect.width / 2 - w / 2));
    // Below on touch screens, where the native selection menu occupies the space above.
    const above = rect.top - h - 8;
    const top = coarse || above < 60 ? Math.min(window.innerHeight - h - 8, rect.bottom + 8) : above;
    popup.style.left = left + 'px';
    popup.style.top = top + 'px';
  },
  hidePopup() {
    const popup = document.querySelector('.annotation-popup') as HTMLElement | null;
    if (popup) popup.style.display = 'none';
  },
  showForSelection(rect: DOMRect, text: string) {
    const popup = this.popup();
    popup.innerHTML = Object.entries(ANNOTATION_COLORS).map(([key, c]) =>
      '<button type="button" class="ann-swatch ann-' + key + '" data-color="' + key + '" aria-label="Surligner en ' + c.name + '" title="Surligner en ' + c.name + '"></button>').join('') +
      '<span class="ann-divider"></span><button type="button" class="ann-action" data-act="note">Ajouter une note</button>';
    popup.querySelectorAll<HTMLElement>('[data-color]').forEach(btn => btn.addEventListener('click', () => {
      this.add(text, btn.dataset.color!);
      this.hidePopup();
      window.getSelection()?.removeAllRanges();
    }));
    popup.querySelector('[data-act="note"]')!.addEventListener('click', () => {
      this.noteEditor(rect, '', (note) => {
        this.add(text, 'yellow', note);
        window.getSelection()?.removeAllRanges();
      });
    });
    this.place(popup, rect);
  },
  showForHighlight(span: HTMLElement) {
    const id = parseInt(span.dataset.annId!);
    const ann = state.annotations.find(a => a.id === id);
    if (!ann) return;
    const rect = span.getBoundingClientRect();
    const popup = this.popup();
    popup.innerHTML =
      '<button type="button" class="ann-action" data-act="note">' + (ann.note ? 'Modifier la note' : 'Ajouter une note') + '</button>' +
      '<span class="ann-divider"></span><button type="button" class="ann-action" data-act="remove">Retirer</button>';
    popup.querySelector('[data-act="note"]')!.addEventListener('click', () => {
      this.noteEditor(rect, ann.note, (note) => this.setNote(id, note));
    });
    popup.querySelector('[data-act="remove"]')!.addEventListener('click', () => { this.hidePopup(); this.remove(id); });
    this.place(popup, rect);
  },
  noteEditor(rect: DOMRect, value: string, onSave: (note: string) => void) {
    const popup = this.popup();
    popup.innerHTML = '<input type="text" class="ann-note-input" aria-label="Texte de la note" placeholder="Votre note" /><button type="button" class="ann-action" data-act="save">Enregistrer</button>';
    const input = popup.querySelector('input') as HTMLInputElement;
    input.value = value;
    const save = () => { const note = input.value.trim(); this.hidePopup(); onSave(note); };
    popup.querySelector('[data-act="save"]')!.addEventListener('click', save);
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); save(); } });
    this.place(popup, rect);
    input.focus();
  },
  renderPanel() {
    const container = document.getElementById('annotationsPanel');
    const count = document.getElementById('annotationsCount');
    if (count) count.textContent = state.annotations.length ? String(state.annotations.length) : '';
    if (!container) return;
    if (state.annotations.length === 0) {
      container.innerHTML = '<p class="panel-empty"><strong>Aucune note.</strong> Sélectionnez du texte dans le document pour le surligner ou l\'annoter.</p>';
      return;
    }
    container.innerHTML = '<ul class="panel-list">' + state.annotations.map(a =>
      '<li class="panel-item"><button type="button" class="panel-go" data-id="' + a.id + '" style="border-left-color:' + (ANNOTATION_COLORS[a.color]?.value || ANNOTATION_COLORS.yellow.value) + '"><span class="panel-go-text">' + escapeHtml(a.text) + '</span>' + (a.note ? '<span class="panel-go-meta">' + escapeHtml(a.note) + '</span>' : '') + '</button>' +
      '<button type="button" class="panel-remove" data-id="' + a.id + '" aria-label="Retirer ce surlignage" title="Retirer">&times;</button></li>').join('') + '</ul>';
    container.querySelectorAll('.panel-go').forEach(item => {
      item.addEventListener('click', () => {
        const el = document.querySelector('[data-ann-id="' + (item as HTMLElement).dataset.id + '"]');
        if (!el) return;
        Nav.remember();
        el.scrollIntoView({ behavior: scrollBehavior(), block: 'center' });
        if (window.innerWidth <= 900) UI.closeSidebar();
      });
    });
    container.querySelectorAll('.panel-remove').forEach(btn => btn.addEventListener('click', () => this.remove(parseInt((btn as HTMLElement).dataset.id!))));
  },
  initSelection() {
    const article = document.getElementById('article');
    if (!article) return;
    const fromSelection = () => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || !sel.toString().trim() || sel.rangeCount === 0) return false;
      if (!article.contains(sel.anchorNode) || (sel.anchorNode as Element)?.parentElement?.closest('pre')) return false;
      this.showForSelection(sel.getRangeAt(0).getBoundingClientRect(), sel.toString().trim());
      return true;
    };
    article.addEventListener('mouseup', (e) => {
      setTimeout(() => {
        if (fromSelection()) return;
        const span = (e.target as HTMLElement).closest?.('.annotation-highlight') as HTMLElement | null;
        if (span) this.showForHighlight(span);
      });
    });
    // Touch screens select through system handles: no mouseup is guaranteed.
    if (window.matchMedia('(pointer: coarse)').matches) {
      document.addEventListener('selectionchange', debounce(() => { fromSelection(); }, 500));
    }
    document.addEventListener('pointerdown', (e) => {
      const popup = document.querySelector('.annotation-popup');
      if (popup && !popup.contains(e.target as Node)) this.hidePopup();
    });
    document.getElementById('content')?.addEventListener('scroll', () => {
      if (document.activeElement?.classList.contains('ann-note-input')) return;
      this.hidePopup();
    }, { passive: true });
  }
};

const Modes = {
  sync() {
    const mode = state.presentationOpen ? 'present' : state.editorOpen ? 'edit' : 'read';
    document.querySelectorAll('[data-mode]').forEach(btn => {
      btn.setAttribute('aria-pressed', String((btn as HTMLElement).dataset.mode === mode));
    });
  }
};

const Editor = {
  toggle() {
    state.editorOpen = !state.editorOpen;
    const reader = document.getElementById('reader');
    if (!reader) return;
    reader.classList.toggle('split-layout', state.editorOpen);
    const textarea = document.getElementById('editorTextarea') as HTMLTextAreaElement;
    if (state.editorOpen && textarea) {
      textarea.value = state.rawContent;
      textarea.focus();
    }
    Modes.sync();
    Announcer.say(state.editorOpen ? 'Mode édition' : 'Mode lecture');
  },
  setDirty(dirty: boolean) {
    state.dirty = dirty;
    document.getElementById('docName')?.classList.toggle('is-dirty', dirty);
  },
  render: debounce(function() {
    const textarea = document.getElementById('editorTextarea') as HTMLTextAreaElement;
    if (!textarea) return;
    const text = textarea.value;
    state.rawContent = text;
    Editor.setDirty(true);
    Search.clear();
    const article = document.getElementById('article')!;
    const { html, mathBlocks } = MarkdownEngine.render(text);
    article.innerHTML = html;
    PostProcessor.process(article, mathBlocks);
    TOC.build(article);
    Annotations.apply();
    ReadingProgress.estimateTime(text);
    ReadingProgress.update();
  }, 300),
  download() {
    const blob = new Blob([state.rawContent], { type: 'text/markdown' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = state.fileName || 'document.md';
    a.click();
    URL.revokeObjectURL(a.href);
    this.setDirty(false);
    showToast('Téléchargé : ' + a.download);
  }
};

const Presentation = {
  slides: [] as { html: string; mathBlocks: { id: string; expr: string; display: boolean }[] }[],
  toggle() {
    if (state.presentationOpen) this.exit();
    else this.enter();
  },
  enter() {
    if (!state.rawContent) return;
    this.slides = this.buildSlides();
    if (this.slides.length === 0) return;
    state.presentationOpen = true;
    state.presentationSlide = 0;
    const el = document.getElementById('presentationMode');
    if (el) { el.classList.add('active'); this.showSlide(0); }
    document.getElementById('presentExit')?.focus();
    Modes.sync();
    Announcer.say('Mode présentation. Flèches pour naviguer, Échap pour quitter.');
  },
  exit() {
    state.presentationOpen = false;
    const el = document.getElementById('presentationMode');
    if (el) el.classList.remove('active');
    Modes.sync();
    const trigger = document.getElementById('presentToggle');
    if (trigger?.offsetParent) trigger.focus(); else document.getElementById('moreBtn')?.focus();
  },
  buildSlides() {
    const sections = state.rawContent.split(/^(?=## )/m);
    return sections.filter(s => s.trim()).map(s => {
      const { html, mathBlocks } = MarkdownEngine.render(s);
      return { html, mathBlocks };
    });
  },
  showSlide(idx: number) {
    if (idx < 0 || idx >= this.slides.length) return;
    state.presentationSlide = idx;
    const content = document.querySelector('.presentation-content') as HTMLElement | null;
    const counter = document.querySelector('.slide-counter');
    const progress = document.querySelector('.presentation-progress-fill') as HTMLElement;
    if (content) {
      content.innerHTML = '<div class="slide markdown-body">' + this.slides[idx].html + '</div>';
      content.scrollTop = 0;
      PostProcessor.process(content.firstElementChild as HTMLElement, this.slides[idx].mathBlocks);
    }
    if (counter) counter.textContent = (idx + 1) + ' / ' + this.slides.length;
    if (progress) progress.style.width = ((idx + 1) / this.slides.length * 100) + '%';
    (document.getElementById('presentPrev') as HTMLButtonElement).disabled = idx === 0;
    (document.getElementById('presentNext') as HTMLButtonElement).disabled = idx === this.slides.length - 1;
  },
  next() { this.showSlide(state.presentationSlide + 1); },
  prev() { this.showSlide(state.presentationSlide - 1); }
};

// ── Preferences ──
const READING_DEFAULTS = { fontSize: 18, lineHeight: 1.6, contentWidth: 66, fontFamily: 'serif' };
const FONT_SIZE_RANGE = { min: 14, max: 24 };

const Preferences = {
  defaults: {
    theme: 'auto', ...READING_DEFAULTS, minimalMode: false, sidebarOpen: true, prefsVersion: 2
  } as Record<string, unknown>,
  _data: null as Record<string, unknown> | null,
  load() {
    try {
      const raw = localStorage.getItem(PREFS_KEY);
      const stored = raw ? JSON.parse(raw) : {};
      // Version 1 stored the line length in px and offered free-form sliders.
      if (stored.prefsVersion !== this.defaults.prefsVersion) {
        delete stored.contentWidth;
        delete stored.lineHeight;
        stored.prefsVersion = this.defaults.prefsVersion;
      }
      this._data = { ...this.defaults, ...stored };
    } catch { this._data = { ...this.defaults }; }
    return this._data;
  },
  get(key: string): unknown { return (this._data || this.load())![key]; },
  set(key: string, val: unknown) {
    if (!this._data) this.load();
    this._data![key] = val;
    try { localStorage.setItem(PREFS_KEY, JSON.stringify(this._data)); } catch { /* ignore */ }
  }
};

// ── Position Manager ──
const PositionManager = {
  _data: null as Record<string, { f: number; t: number }> | null,
  _load() {
    if (this._data) return;
    try {
      const raw = localStorage.getItem(POSITIONS_KEY);
      this._data = raw ? JSON.parse(raw) : {};
    } catch { this._data = {}; }
  },
  save(hash: string, fraction: number) {
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

// ── Theme Manager ──
function mermaidConfig(theme: string) {
  return {
    startOnLoad: false,
    theme: (theme === 'dark' || theme === 'contrast' ? 'dark' : 'neutral') as 'dark' | 'neutral',
    securityLevel: 'strict' as const,
    // Lets a broken diagram fall back to its readable source instead of Mermaid's error graphic.
    suppressErrorRendering: true,
    fontFamily: '"Hanken Grotesk", system-ui, sans-serif',
  };
}

const ThemeManager = {
  current: 'light',
  mediaQuery: null as MediaQueryList | null,
  init() {
    this.mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    this.mediaQuery.addEventListener('change', () => {
      if (Preferences.get('theme') === 'auto') this.applyAuto();
    });
    const saved = Preferences.get('theme') as string;
    if (saved === 'auto' || !saved) this.applyAuto();
    else this.apply(saved);
  },
  applyAuto() {
    this.apply(this.mediaQuery!.matches ? 'dark' : 'light');
  },
  apply(theme: string) {
    this.current = theme;
    document.documentElement.setAttribute('data-theme', theme);
    this.updateButtons();
    try {
      mermaid.initialize(mermaidConfig(theme));
      const article = document.getElementById('article');
      if (article) PostProcessor.runMermaid(article);
    } catch { /* ignore */ }
  },
  set(theme: string) {
    Preferences.set('theme', theme);
    if (theme === 'auto') this.applyAuto();
    else this.apply(theme);
    this.updateButtons();
    const labels: Record<string, string> = { auto: 'Ambiance automatique', light: 'Ambiance claire', dark: 'Ambiance sombre', sepia: 'Ambiance sépia', contrast: 'Contraste élevé' };
    Announcer.say(labels[theme] || theme);
  },
  updateButtons() {
    const chosen = (Preferences.get('theme') as string) || 'auto';
    document.querySelectorAll('.theme-btn').forEach(btn => {
      btn.setAttribute('aria-pressed', String((btn as HTMLElement).dataset.themeChoice === chosen));
    });
  }
};

// ── Reading Settings ──
const ReadingSettings = {
  init() {
    this.apply('fontSize', Preferences.get('fontSize') as number);
    this.apply('lineHeight', Preferences.get('lineHeight') as number);
    this.apply('contentWidth', Preferences.get('contentWidth') as number);
    this.apply('fontFamily', Preferences.get('fontFamily') as string);
  },
  apply(prop: string, val: unknown) {
    const root = document.documentElement;
    switch (prop) {
      case 'fontSize': {
        root.style.setProperty('--font-size', val + 'px');
        const output = document.getElementById('fontSizeVal');
        if (output) output.textContent = val + ' px';
        (document.getElementById('fontSizeDec') as HTMLButtonElement | null)?.toggleAttribute('disabled', (val as number) <= FONT_SIZE_RANGE.min);
        (document.getElementById('fontSizeInc') as HTMLButtonElement | null)?.toggleAttribute('disabled', (val as number) >= FONT_SIZE_RANGE.max);
        break;
      }
      case 'lineHeight':
        root.style.setProperty('--line-height', String(val));
        break;
      case 'contentWidth':
        // In characters: the measure stays comfortable whatever the text size.
        root.style.setProperty('--content-width', val + 'ch');
        break;
      case 'fontFamily': {
        const families: Record<string, string> = { serif: 'var(--font-serif)', 'sans-serif': 'var(--font-sans)', mono: 'var(--font-mono)' };
        root.style.setProperty('--font-body', families[val as string] || families.serif);
        break;
      }
    }
    document.querySelectorAll('[data-setting="' + prop + '"]').forEach(btn => {
      btn.setAttribute('aria-pressed', String((btn as HTMLElement).dataset.value === String(val)));
    });
    Preferences.set(prop, val);
  },
  stepFontSize(delta: number) {
    const next = Math.min(FONT_SIZE_RANGE.max, Math.max(FONT_SIZE_RANGE.min, (Preferences.get('fontSize') as number) + delta));
    this.apply('fontSize', next);
    return next;
  },
  reset() {
    const before = Object.fromEntries(Object.keys(READING_DEFAULTS).map(k => [k, Preferences.get(k)]));
    Object.entries(READING_DEFAULTS).forEach(([k, v]) => this.apply(k, v));
    showToast('Réglages par défaut rétablis', {
      action: 'Annuler',
      onAction: () => Object.entries(before).forEach(([k, v]) => this.apply(k, v)),
    });
  }
};

const FRONTMATTER_LABELS: Record<string, string> = {
  title: 'Titre', author: 'Auteur', authors: 'Auteurs', date: 'Date', updated: 'Mis à jour', version: 'Version',
  description: 'Description', tags: 'Étiquettes', category: 'Catégorie', status: 'Statut', license: 'Licence',
};

// ── Markdown Engine ──
const MarkdownEngine = {
  headingCounts: {} as Record<string, number>,

  init() {
    marked.use({
      gfm: true,
      breaks: false,
    });
  },

  extractFrontmatter(text: string) {
    const match = text.match(/^---\s*\n([\s\S]*?)\n---\s*\n/);
    if (!match) return { meta: null as Record<string, string> | null, body: text };
    const yaml = match[1];
    const body = text.slice(match[0].length);
    const meta: Record<string, string> = {};
    yaml.split('\n').forEach(line => {
      const m = line.match(/^(\w[\w\s]*?):\s*(.+)/);
      if (m) meta[m[1].trim()] = m[2].trim();
    });
    return { meta, body };
  },

  preprocessInlineSyntax(text: string) {
    const blocks: { id: string; expr: string; display: boolean }[] = [];
    let idx = 0;
    const codeProtected: { id: string; content: string }[] = [];
    let cpIdx = 0;
    text = text.replace(/^```[^\n]*\n[\s\S]*?\n```$/gm, (m) => {
      const id = `%%CODE_${cpIdx++}%%`;
      codeProtected.push({ id, content: m });
      return id;
    });
    text = text.replace(/`[^`\n]+`/g, (m) => {
      const id = `%%CODE_${cpIdx++}%%`;
      codeProtected.push({ id, content: m });
      return id;
    });
    text = text.replace(/\$\$([^$]+?)\$\$/g, (_, expr) => {
      const id = `%%MATHBLOCK_${idx++}%%`;
      blocks.push({ id, expr: expr.trim(), display: true });
      return id;
    });
    text = text.replace(/(?<!\$)\$(?!\$)([^\n$]+?)\$(?!\$)/g, (_, expr) => {
      const id = `%%MATHINLINE_${idx++}%%`;
      blocks.push({ id, expr: expr.trim(), display: false });
      return id;
    });
    // Sub/sup must run while code is protected, and stay on a single token: a stray `^` or `~`
    // (e.g. "^1.0.0" in a code block) must not pair with another one far away in the document.
    text = text.replace(/(?<![\\~])~([^~\s]+)~/g, '<sub>$1</sub>');
    text = text.replace(/(?<![\\^[])\^([^\^\s[\]]+)\^/g, '<sup>$1</sup>');
    codeProtected.forEach(({ id, content }) => { text = text.split(id).join(content); });
    return { text, blocks };
  },

  processFootnotes(text: string) {
    const defs: Record<string, string> = {};
    let index = 0;
    text = text.replace(/^\[\^([^\]]+)\]:\s*([\s\S]*?)(?=\n\[\^|\n\n|\n*$)/gm, (_, id, content) => {
      defs[id] = content.trim();
      return '';
    });
    const refs: { id: string; index: number; content: string }[] = [];
    text = text.replace(/\[\^([^\]]+)\]/g, (_, id) => {
      if (!defs[id]) return `[^${id}]`;
      index++;
      refs.push({ id, index, content: defs[id] });
      return `<sup class="footnote-ref"><a href="#fn-${escapeHtml(id)}" id="fnref-${escapeHtml(id)}" role="doc-noteref">[${index}]</a></sup>`;
    });
    if (refs.length > 0) {
      let section = '<section class="footnotes-section" role="doc-endnotes"><h2>Notes</h2><ol>';
      refs.forEach(ref => {
        section += `<li id="fn-${escapeHtml(ref.id)}"><p>${ref.content} <a href="#fnref-${escapeHtml(ref.id)}" class="footnote-backref" role="doc-backlink" aria-label="Retour">&#8617;</a></p></li>`;
      });
      section += '</ol></section>';
      text += '\n\n' + section;
    }
    return text;
  },

  render(markdown: string) {
    this.headingCounts = {};
    const { meta, body } = this.extractFrontmatter(markdown);
    let processed = this.processFootnotes(body);
    const { text: preprocessed, blocks: mathBlocks } = this.preprocessInlineSyntax(processed);
    let html = marked.parse(preprocessed) as string;

    html = DOMPurify.sanitize(html, {
      ADD_TAGS: ['sup','sub','details','summary','mark','abbr','kbd','var','samp','cite','dl','dt','dd',
        'figure','figcaption','ruby','rt','rp','bdi','bdo','wbr','ins','del','q','dfn','time',
        'small','picture','source','video','audio','center'],
      ADD_ATTR: ['id','class','href','src','alt','title','target','rel','type','start','reversed',
        'align','valign','colspan','rowspan','open','datetime','cite','dir','lang','loading',
        'aria-label','aria-hidden','role','tabindex','checked','disabled','name',
        'width','height','decoding'],
      ALLOW_DATA_ATTR: false,
    });

    html = transformProseText(html, (text) =>
      frenchTypography(text.replace(/:([a-z_]+):/g, (m, code) => EMOJI_MAP[code] || m)));

    let metaHtml = '';
    if (meta && Object.keys(meta).length > 0) {
      metaHtml = '<div class="frontmatter-block"><dl>';
      for (const [k, v] of Object.entries(meta)) {
        metaHtml += `<div><dt>${escapeHtml(FRONTMATTER_LABELS[k.toLowerCase()] || k)}</dt><dd>${escapeHtml(v)}</dd></div>`;
      }
      metaHtml += '</dl></div>';
    }

    return { html: metaHtml + html, mathBlocks, meta };
  }
};

// ── Post-Processor ──
const PostProcessor = {
  process(container: HTMLElement, mathBlocks: { id: string; expr: string; display: boolean }[]) {
    this.renderMath(container, mathBlocks);
    this.renderMermaid(container);
    this.processHeadings(container);
    this.processCodeBlocks(container);
    this.processTables(container);
    this.processAlerts(container);
    this.processLinks(container);
    this.processFootnotePopups(container);
    this.processImages(container);
    this.processTaskLists(container);
  },

  processHeadings(container: HTMLElement) {
    const counts: Record<string, number> = {};
    container.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach(h => {
      let slug = slugify(h.textContent || '');
      if (!slug) slug = 'heading';
      if (!counts[slug]) counts[slug] = 0;
      counts[slug]++;
      if (counts[slug] > 1) slug += '-' + counts[slug];
      h.id = slug;
      const anchor = document.createElement('a');
      anchor.className = 'heading-anchor';
      anchor.href = '#' + slug;
      anchor.setAttribute('aria-hidden', 'true');
      anchor.tabIndex = -1;
      anchor.textContent = '#';
      anchor.addEventListener('click', (e) => {
        e.preventDefault();
        const url = window.location.href.split('#')[0] + '#' + slug;
        navigator.clipboard.writeText(url).then(() => showToast('Lien copié')).catch(() => {});
      });
      h.insertBefore(anchor, h.firstChild);
    });
  },

  processCodeBlocks(container: HTMLElement) {
    container.querySelectorAll('pre > code').forEach(code => {
      const pre = code.parentElement!;
      const langMatch = code.className.match(/language-(\S+)/);
      const language = langMatch ? langMatch[1] : '';
      if (language === 'mermaid') return;
      const header = document.createElement('div');
      header.className = 'code-header';
      header.innerHTML = `<span>${escapeHtml(language)}</span><button class="copy-btn" aria-label="Copier le code">Copier</button>`;
      pre.insertBefore(header, pre.firstChild);
      header.querySelector('.copy-btn')!.addEventListener('click', function(this: HTMLElement) {
        const text = code.textContent || '';
        const btn = this;
        navigator.clipboard.writeText(text).then(() => {
          btn.textContent = 'Copié !'; btn.classList.add('copied');
          setTimeout(() => { btn.textContent = 'Copier'; btn.classList.remove('copied'); }, 1500);
        }).catch(() => {});
      });
      try { hljs.highlightElement(code as HTMLElement); } catch { /* ignore */ }
      const lines = (code as HTMLElement).innerHTML.split('\n');
      if (lines.length > 3) {
        pre.classList.add('line-numbers');
        (code as HTMLElement).innerHTML = lines.map(line => '<span class="code-line">' + line + '</span>').join('\n');
      }
    });
  },

  processTables(container: HTMLElement) {
    container.querySelectorAll('table').forEach(table => {
      if (table.parentElement?.classList.contains('table-wrapper')) return;
      const wrapper = document.createElement('div');
      wrapper.className = 'table-wrapper';
      table.parentNode!.insertBefore(wrapper, table);
      wrapper.appendChild(table);
      this.makeSortable(table);
    });
  },

  makeSortable(table: HTMLTableElement) {
    const headers = table.querySelectorAll('th');
    if (headers.length === 0) return;
    headers.forEach((th, colIdx) => {
      th.classList.add('sortable');
      th.tabIndex = 0;
      th.title = 'Trier par cette colonne';
      th.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); th.click(); }
      });
      th.addEventListener('click', () => {
        const tbody = table.querySelector('tbody') || table;
        const rows = Array.from(tbody.querySelectorAll('tr'));
        const isAsc = th.classList.contains('sort-asc');
        headers.forEach(h => { h.classList.remove('sort-asc', 'sort-desc'); h.removeAttribute('aria-sort'); });
        th.classList.add(isAsc ? 'sort-desc' : 'sort-asc');
        th.setAttribute('aria-sort', isAsc ? 'descending' : 'ascending');
        rows.sort((a, b) => {
          const aText = (a.cells[colIdx]?.textContent || '').trim();
          const bText = (b.cells[colIdx]?.textContent || '').trim();
          const aNum = parseFloat(aText);
          const bNum = parseFloat(bText);
          if (!isNaN(aNum) && !isNaN(bNum)) return isAsc ? bNum - aNum : aNum - bNum;
          return isAsc ? bText.localeCompare(aText, 'fr') : aText.localeCompare(bText, 'fr');
        });
        rows.forEach(r => tbody.appendChild(r));
      });
    });
  },

  processAlerts(container: HTMLElement) {
    container.querySelectorAll('blockquote').forEach(bq => {
      const firstP = bq.querySelector('p');
      if (!firstP) return;
      const text = firstP.textContent || '';
      const m = text.match(/^\s*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*/i);
      if (!m) return;
      const type = m[1].toLowerCase();
      firstP.innerHTML = firstP.innerHTML.replace(/^\s*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*(<br\s*\/?>)?\s*/i, '');
      if (!firstP.innerHTML.trim()) firstP.remove();
      const alert = document.createElement('div');
      alert.className = `alert-block alert-${type}`;
      const title = document.createElement('div');
      title.className = 'alert-title';
      title.innerHTML = `${ALERT_ICONS[type] || ''} ${ALERT_LABELS[type] || type}`;
      alert.appendChild(title);
      while (bq.firstChild) alert.appendChild(bq.firstChild);
      bq.replaceWith(alert);
    });
  },

  processLinks(container: HTMLElement) {
    container.querySelectorAll('a').forEach(link => {
      const href = link.getAttribute('href');
      if (!href) return;
      if (href.startsWith('javascript:') || href.startsWith('vbscript:') || href.startsWith('data:')) {
        link.removeAttribute('href');
        return;
      }
      if (href.startsWith('http://') || href.startsWith('https://')) {
        link.setAttribute('rel', 'noopener noreferrer');
        link.setAttribute('target', '_blank');
      }
      if (href.startsWith('#')) {
        link.addEventListener('click', (e) => {
          const target = document.getElementById(href.slice(1));
          if (target) {
            e.preventDefault();
            Nav.remember();
            target.scrollIntoView({ behavior: scrollBehavior(), block: 'start' });
          }
        });
      }
    });
  },

  processFootnotePopups(container: HTMLElement) {
    container.querySelectorAll('a[href^="#fn-"], a[href^="#user-content-fn-"]').forEach(link => {
      const href = link.getAttribute('href')!;
      const fnId = href.replace('#user-content-', '').replace('#', '');
      const footnote = container.querySelector('#' + fnId + ', #user-content-' + fnId);
      if (!footnote) return;
      link.classList.add('footnote-ref');
      const popup = document.createElement('span');
      popup.className = 'footnote-popup';
      popup.textContent = (footnote.textContent || '').replace(/↩$/, '').trim();
      link.appendChild(popup);
    });
  },

  processImages(container: HTMLElement) {
    container.querySelectorAll('img').forEach(img => {
      img.loading = 'lazy';
      img.addEventListener('error', function(this: HTMLImageElement) {
        const alt = this.alt || this.src;
        const div = document.createElement('div');
        div.className = 'img-error';
        div.textContent = 'Image non disponible : ' + alt;
        this.replaceWith(div);
      });
      img.addEventListener('click', (e) => {
        e.preventDefault();
        Lightbox.open(img.src, img.alt);
      });
      if (img.title) {
        const caption = document.createElement('span');
        caption.className = 'img-caption';
        caption.textContent = img.title;
        img.parentNode!.insertBefore(caption, img.nextSibling);
      }
    });
  },

  processTaskLists(container: HTMLElement) {
    container.querySelectorAll('li').forEach(li => {
      const cb = li.querySelector('input[type="checkbox"]');
      if (cb) li.classList.add('task-list-item');
    });
  },

  renderMath(container: HTMLElement, mathBlocks: { id: string; expr: string; display: boolean }[]) {
    if (!mathBlocks.length) return;
    let html = container.innerHTML;
    mathBlocks.forEach(({ id, expr, display }) => {
      let rendered;
      try {
        rendered = katex.renderToString(expr, { displayMode: display, throwOnError: false, strict: false, trust: false, output: 'html' });
      } catch (e: unknown) {
        rendered = `<span class="math-error" title="${escapeHtml((e as Error).message)}">${escapeHtml(expr)}</span>`;
      }
      if (display) rendered = `<div class="katex-display">${rendered}</div>`;
      html = html.split(id).join(rendered);
    });
    container.innerHTML = html;
  },

  renderMermaid(container: HTMLElement) {
    container.querySelectorAll('pre code.language-mermaid').forEach(block => {
      const pre = block.closest('pre')!;
      const source = block.textContent || '';
      const wrapper = document.createElement('div');
      wrapper.className = 'mermaid-container';
      wrapper.dataset.source = source;
      wrapper.textContent = source;
      pre.replaceWith(wrapper);
    });
    this.runMermaid(container);
  },

  runMermaid(container: HTMLElement) {
    const nodes = container.querySelectorAll<HTMLElement>('.mermaid-container');
    if (nodes.length === 0) return;
    nodes.forEach(node => {
      node.removeAttribute('data-processed');
      node.textContent = node.dataset.source || '';
    });
    const showFallbacks = () => nodes.forEach(node => {
      if (node.querySelector('svg')) return;
      node.innerHTML = '<div class="mermaid-fallback"><div class="mermaid-fallback-label">Ce diagramme contient une erreur de syntaxe. Voici sa source :</div><pre><code>' + escapeHtml(node.dataset.source || '') + '</code></pre></div>';
    });
    try {
      mermaid.run({ nodes: nodes as unknown as ArrayLike<HTMLElement>, suppressErrors: true }).then(showFallbacks, showFallbacks);
    } catch { showFallbacks(); }
  }
};

// ── Table of Contents ──
const TOC_MAX_LEVEL = 3;

const TOC = {
  build(container: HTMLElement) {
    const headings = container.querySelectorAll('h1, h2, h3, h4, h5, h6');
    state.headings = Array.from(headings).filter(h => h.id) as HTMLElement[];
    state.activeHeading = null;
    Breadcrumb.update();
    const tocEl = document.getElementById('tocContent');
    if (!tocEl) return;
    tocEl.innerHTML = '';
    if (state.headings.length === 0) {
      tocEl.innerHTML = '<p class="panel-empty"><strong>Aucun titre</strong> dans ce document.</p>';
      return;
    }
    // Deep levels remain reachable by scrolling: they only make the map harder to read.
    state.headings.filter(h => parseInt(h.tagName[1]) <= TOC_MAX_LEVEL).forEach(h => {
      const level = parseInt(h.tagName[1]);
      const a = document.createElement('a');
      const label = (h.textContent || '').replace(/^#\s*/, '');
      a.className = `toc-item toc-h${level}`;
      a.href = '#' + h.id;
      a.textContent = label;
      a.title = label;
      a.addEventListener('click', (e) => {
        e.preventDefault();
        Nav.remember();
        h.scrollIntoView({ behavior: scrollBehavior(), block: 'start' });
        if (window.innerWidth <= 900) UI.closeSidebar();
      });
      tocEl.appendChild(a);
    });
    this.syncActive();
  },
  // Computed from the scroll position: jumps (resume, scrollbar drag) cross headings without touching them.
  syncActive() {
    const content = document.getElementById('content');
    if (!content || state.headings.length === 0) return;
    const line = content.getBoundingClientRect().top + content.clientHeight * 0.2;
    let current: HTMLElement | null = null;
    for (const h of state.headings) {
      if (h.getBoundingClientRect().top > line) break;
      current = h;
    }
    if (current) this.setActive(current.id);
    else this.clearActive();
  },
  clearActive() {
    if (state.activeHeading === null) return;
    state.activeHeading = null;
    Breadcrumb.update();
    document.querySelectorAll('.toc-item.active').forEach(item => {
      item.classList.remove('active');
      item.removeAttribute('aria-current');
    });
  },
  setActive(id: string) {
    if (state.activeHeading === id) return;
    state.activeHeading = id;
    Breadcrumb.update();
    // A level hidden from the map highlights its nearest visible ancestor.
    let index = state.headings.findIndex(h => h.id === id);
    while (index > 0 && parseInt(state.headings[index].tagName[1]) > TOC_MAX_LEVEL) index--;
    const mapped = state.headings[index]?.id;
    document.querySelectorAll('.toc-item').forEach(item => {
      const isActive = item.getAttribute('href') === '#' + mapped;
      item.classList.toggle('active', isActive);
      if (isActive) item.setAttribute('aria-current', 'location'); else item.removeAttribute('aria-current');
    });
    const activeItem = document.querySelector('.toc-item.active') as HTMLElement | null;
    const sidebar = document.getElementById('tocContent');
    if (activeItem && sidebar && !sidebar.hidden) {
      const itemTop = activeItem.offsetTop;
      const itemH = activeItem.offsetHeight;
      const scrollTop = sidebar.scrollTop;
      const viewH = sidebar.clientHeight;
      if (itemTop < scrollTop || itemTop + itemH > scrollTop + viewH) {
        sidebar.scrollTo({ top: itemTop - viewH / 3, behavior: scrollBehavior() });
      }
    }
  }
};

// ── Search ──
const Search = {
  marks: [] as HTMLElement[],
  open() {
    state.searchOpen = true;
    const bar = document.getElementById('searchBar')!;
    bar.classList.remove('hidden');
    document.getElementById('searchToggle')?.setAttribute('aria-expanded', 'true');
    const input = document.getElementById('searchInput') as HTMLInputElement;
    input.focus();
    input.select();
    if (input.value) this.perform(input.value);
  },
  close(returnFocus = true) {
    state.searchOpen = false;
    document.getElementById('searchBar')!.classList.add('hidden');
    const toggle = document.getElementById('searchToggle');
    toggle?.setAttribute('aria-expanded', 'false');
    this.clear();
    if (returnFocus) toggle?.focus();
  },
  setStatus(message: string, isProblem = false) {
    const count = document.getElementById('searchCount')!;
    count.textContent = message;
    count.classList.toggle('is-empty', isProblem);
    const has = state.searchResults.length > 0;
    (document.getElementById('searchPrev') as HTMLButtonElement).disabled = !has;
    (document.getElementById('searchNext') as HTMLButtonElement).disabled = !has;
  },
  clear() {
    this.marks.forEach(m => {
      const parent = m.parentNode;
      if (!parent) return;
      parent.replaceChild(document.createTextNode(m.textContent || ''), m);
      parent.normalize();
    });
    this.marks = [];
    state.searchResults = [];
    state.searchIndex = -1;
    document.getElementById('searchInput')?.removeAttribute('aria-invalid');
    this.setStatus('');
  },
  perform(query: string) {
    this.clear();
    if (!query) return;
    if (query.length < 2) { this.setStatus('2 caractères minimum'); return; }
    const article = document.getElementById('article');
    if (!article) return;
    const normalizedQuery = removeAccents(query);
    let regex: RegExp;
    if (state.regexSearch) {
      try { regex = new RegExp(normalizedQuery, 'gi'); } catch {
        document.getElementById('searchInput')?.setAttribute('aria-invalid', 'true');
        this.setStatus('Expression invalide', true);
        return;
      }
    } else {
      const escapedQuery = normalizedQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      regex = new RegExp(escapedQuery, 'gi');
    }
    const walker = document.createTreeWalker(article, NodeFilter.SHOW_TEXT, null);
    const textNodes: Text[] = [];
    let node: Node | null;
    while (node = walker.nextNode()) {
      if (node.parentElement && (node.parentElement.tagName === 'SCRIPT' || node.parentElement.tagName === 'STYLE')) continue;
      if (regex.test(removeAccents(node.textContent || ''))) textNodes.push(node as Text);
      regex.lastIndex = 0;
    }
    textNodes.forEach(textNode => {
      const text = textNode.textContent || '';
      const normalized = removeAccents(text);
      const frag = document.createDocumentFragment();
      let lastIdx = 0;
      let match;
      regex.lastIndex = 0;
      while ((match = regex.exec(normalized)) !== null) {
        if (match[0].length === 0) { regex.lastIndex++; continue; }
        if (match.index > lastIdx) frag.appendChild(document.createTextNode(text.slice(lastIdx, match.index)));
        const mark = document.createElement('mark');
        mark.className = 'search-mark';
        mark.textContent = text.slice(match.index, match.index + match[0].length);
        this.marks.push(mark);
        frag.appendChild(mark);
        lastIdx = match.index + match[0].length;
      }
      if (lastIdx < text.length) frag.appendChild(document.createTextNode(text.slice(lastIdx)));
      textNode.parentNode!.replaceChild(frag, textNode);
    });
    state.searchResults = this.marks;
    if (state.searchResults.length > 0) {
      this.goTo(0);
      Announcer.say(state.searchResults.length + ' résultats trouvés');
    } else {
      this.setStatus('Aucun résultat', true);
      Announcer.say('Aucun résultat');
    }
  },
  goTo(index: number) {
    if (state.searchResults.length === 0) return;
    if (state.searchIndex >= 0 && state.searchResults[state.searchIndex]) {
      state.searchResults[state.searchIndex].classList.remove('active');
    }
    state.searchIndex = ((index % state.searchResults.length) + state.searchResults.length) % state.searchResults.length;
    const mark = state.searchResults[state.searchIndex];
    mark.classList.add('active');
    mark.scrollIntoView({ behavior: scrollBehavior(), block: 'center' });
    this.setStatus(`${state.searchIndex + 1} sur ${state.searchResults.length}`);
  },
  next() { this.goTo(state.searchIndex + 1); },
  prev() { this.goTo(state.searchIndex - 1); }
};

// ── Reading Progress ──
const ReadingProgress = {
  update() {
    const content = document.getElementById('content');
    if (!content) return;
    const scrollTop = content.scrollTop;
    const fraction = contentFraction();
    const fill = document.getElementById('progressFill') as HTMLElement;
    if (fill) fill.style.width = (fraction * 100) + '%';
    document.querySelector('.reading-line')?.setAttribute('aria-valuenow', String(Math.round(fraction * 100)));
    document.getElementById('backToTop')?.classList.toggle('visible', scrollTop > content.clientHeight);
    if (state.fileHash) PositionManager.save(state.fileHash, fraction);
    this.updateRemaining();
  },
  updateRemaining() {
    const content = document.getElementById('content');
    const el = document.getElementById('readingRemaining');
    if (!content || !el || !state.totalWords) return;
    const total = Math.max(1, Math.ceil(state.totalWords / WORDS_PER_MINUTE));
    const scrollable = content.scrollHeight > content.clientHeight;
    const fraction = contentFraction();
    if (!scrollable || fraction < 0.005) {
      el.textContent = total + ' min de lecture';
    } else if (fraction > 0.995) {
      el.textContent = 'Lecture terminée';
    } else {
      const remaining = Math.max(1, Math.ceil(total * (1 - fraction)));
      el.textContent = Math.round(fraction * 100) + ' % · ' + remaining + ' min restante' + (remaining > 1 ? 's' : '');
    }
  },
  estimateTime(text: string) {
    state.totalWords = text.trim().split(/\s+/).length;
    this.updateRemaining();
  }
};

// ── Lightbox ──
const Lightbox = {
  open(src: string, alt: string) {
    const lb = document.getElementById('lightbox')!;
    const img = document.getElementById('lightboxImg') as HTMLImageElement;
    img.src = src;
    img.alt = alt || '';
    lb.classList.remove('hidden');
    state.lightboxOpen = true;
    document.body.style.overflow = 'hidden';
    trapFocus(lb);
  },
  close() {
    const lb = document.getElementById('lightbox')!;
    releaseFocus(lb);
    lb.classList.add('hidden');
    (document.getElementById('lightboxImg') as HTMLImageElement).src = '';
    state.lightboxOpen = false;
    document.body.style.overflow = '';
  }
};

const FocusMode = {
  observer: null as IntersectionObserver | null,
  toggle() {
    state.focusMode = !state.focusMode;
    document.getElementById('app')!.classList.toggle('focus-mode', state.focusMode);
    if (state.focusMode) this.start();
    else this.stop();
    const checkbox = document.getElementById('focusMode') as HTMLInputElement | null;
    if (checkbox) checkbox.checked = state.focusMode;
    document.getElementById('menuFocus')?.setAttribute('aria-checked', String(state.focusMode));
    showToast(state.focusMode ? 'Concentration activée. Échap pour quitter.' : 'Concentration désactivée');
  },
  start() {
    const content = document.getElementById('content');
    if (!content) return;
    this.observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        entry.target.classList.toggle('focus-active', entry.isIntersecting);
      });
    }, { root: content, rootMargin: '-30% 0px -30% 0px', threshold: 0 });
    document.querySelectorAll('#article > *').forEach(el => this.observer!.observe(el));
  },
  stop() {
    if (this.observer) { this.observer.disconnect(); this.observer = null; }
    document.querySelectorAll('.focus-active').forEach(el => el.classList.remove('focus-active'));
  },
  refresh() {
    if (!state.focusMode) return;
    this.stop();
    this.start();
  }
};

// ── File Loader ──
const SUPPORTS_FS_ACCESS = typeof window !== 'undefined' && typeof (window as any).showOpenFilePicker === 'function';

const FileLoader = {
  init() {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput') as HTMLInputElement;
    const fileBtn = document.getElementById('fileBtn');
    const newFileBtn = document.getElementById('newFileBtn');
    const newFileInput = document.getElementById('newFileInput') as HTMLInputElement;

    if (fileBtn) fileBtn.addEventListener('click', () => this.pickFile());
    if (fileInput) fileInput.addEventListener('change', (e) => { if ((e.target as HTMLInputElement).files?.[0]) this.loadFile((e.target as HTMLInputElement).files![0]); });
    if (newFileBtn) newFileBtn.addEventListener('click', () => this.pickFile());
    if (newFileInput) newFileInput.addEventListener('change', (e) => { if ((e.target as HTMLInputElement).files?.[0]) this.loadFile((e.target as HTMLInputElement).files![0]); });

    if (dropZone) {
      ['dragenter','dragover'].forEach(evt => {
        dropZone.addEventListener(evt, (e) => { e.preventDefault(); e.stopPropagation(); dropZone.classList.add('drag-over'); });
      });
      ['dragleave','drop'].forEach(evt => {
        dropZone.addEventListener(evt, (e) => { e.preventDefault(); e.stopPropagation(); dropZone.classList.remove('drag-over'); });
      });
      dropZone.addEventListener('drop', (e) => { if ((e as DragEvent).dataTransfer?.files[0]) this.loadFile((e as DragEvent).dataTransfer!.files[0]); });
      dropZone.addEventListener('click', (e) => { if (e.target === dropZone || !(e.target as HTMLElement).closest('button')) this.pickFile(); });
    }

    document.body.addEventListener('dragover', (e) => { e.preventDefault(); });
    document.body.addEventListener('drop', (e) => {
      e.preventDefault();
      if ((e as DragEvent).dataTransfer?.files[0]) this.loadFile((e as DragEvent).dataTransfer!.files[0]);
    });
  },

  async pickFile() {
    if (SUPPORTS_FS_ACCESS) {
      try {
        const [handle] = await (window as any).showOpenFilePicker({
          types: [{ description: 'Markdown', accept: { 'text/markdown': ACCEPTED_EXTENSIONS, 'text/plain': ACCEPTED_EXTENSIONS } }],
          excludeAcceptAllOption: false,
        });
        const file = await handle.getFile();
        this.loadFile(file, handle);
        return;
      } catch (err: unknown) {
        if (err && (err as Error).name === 'AbortError') return;
      }
    }
    document.getElementById('fileInput')?.click();
  },

  loadFile(file: File, handle?: FileSystemFileHandle | null) {
    const ext = '.' + file.name.split('.').pop()!.toLowerCase();
    if (!ACCEPTED_EXTENSIONS.includes(ext)) {
      alert('Format non pris en charge. Veuillez utiliser un fichier Markdown (.md, .markdown, .txt).');
      return;
    }
    if (state.dirty && !window.confirm('Vos modifications non téléchargées seront perdues. Ouvrir ce fichier quand même ?')) return;
    Editor.setDirty(false);
    if (state.editorOpen) Editor.toggle();
    if (state.searchOpen) Search.close(false);
    Nav.reset();
    state.fileName = file.name;
    document.getElementById('docName')!.textContent = file.name;
    document.title = file.name + ' — Lecteur Markdown';

    // Emptying the page scrolls it to the top: that must not overwrite the saved position.
    state.fileHash = '';
    showDocumentLoading();

    const fileReader = new FileReader();
    fileReader.onload = (e) => {
      const text = e.target!.result as string;
      state.rawContent = text;
      state.fileHash = hashString(text);
      const savedPos = PositionManager.get(state.fileHash);

      const welcome = document.getElementById('welcome')!;
      const reader = document.getElementById('reader')!;
      const article = document.getElementById('article')!;

      welcome.classList.add('hidden');
      reader.classList.remove('hidden');
      setTimeout(() => {
        try {
          const { html, mathBlocks } = MarkdownEngine.render(text);
          article.innerHTML = html;
          PostProcessor.process(article, mathBlocks);
          TOC.build(article);
          Announcer.say(file.name + ' chargé');
          ReadingProgress.estimateTime(text);
          RecentFiles.add(file.name, file.size, handle);
          Bookmarks.load();
          Bookmarks.renderPanel();
          Annotations.load();
          Annotations.apply();
          Annotations.renderPanel();
          FocusMode.refresh();
          const content = document.getElementById('content')!;
          setTimeout(() => {
            content.scrollTop = (content.scrollHeight - content.clientHeight) * (savedPos ?? 0);
            ReadingProgress.update();
            TOC.syncActive();
            Bookmarks.syncButton();
            if (savedPos !== null && savedPos > 0.02) {
              showToast('Reprise à ' + Math.round(savedPos * 100) + ' %', {
                action: 'Revenir au début',
                onAction: () => content.scrollTo({ top: 0, behavior: scrollBehavior() }),
              });
            }
          }, 0);
        } catch (err: unknown) {
          article.innerHTML = `<div class="error-message"><strong>Erreur de rendu</strong><p>${escapeHtml((err as Error).message)}</p><pre><code>${escapeHtml(text.slice(0, 500))}</code></pre></div>`;
        }
      });
    };
    fileReader.onerror = () => {
      const article = document.getElementById('article')!;
      article.innerHTML = '<div class="error-message"><strong>Erreur de lecture</strong><p>Impossible de lire le fichier.</p></div>';
    };
    fileReader.readAsText(file);
  }
};

// ── Keyboard Shortcuts ──
const Keyboard = {
  init() {
    document.addEventListener('keydown', (e) => {
      if (state.presentationOpen) {
        if (e.key === 'Escape') { Presentation.exit(); return; }
        if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') { Presentation.next(); e.preventDefault(); return; }
        if (e.key === 'ArrowLeft' || e.key === 'PageUp') { Presentation.prev(); e.preventDefault(); return; }
        return;
      }
      const inReader = !document.getElementById('reader')!.classList.contains('hidden');
      if (e.target instanceof HTMLElement && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable)) {
        if (e.key === 'Escape') {
          if (e.target.id === 'searchInput' && state.searchOpen) { Search.close(); e.preventDefault(); }
          else if (e.target.tagName === 'TEXTAREA') e.target.blur();
          else if (inReader) { UI.escape(); e.preventDefault(); }
        }
        return;
      }
      if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
          case 'o':
            e.preventDefault();
            document.getElementById(inReader ? 'newFileInput' : 'fileInput')!.click();
            break;
          case 'f':
            if (!inReader) return;
            e.preventDefault();
            Search.open();
            break;
          case 'g':
            if (!inReader) return;
            e.preventDefault();
            if (e.shiftKey) Search.prev();
            else Search.next();
            break;
          case 'b':
            if (!inReader) return;
            e.preventDefault();
            Bookmarks.toggle();
            break;
        }
        return;
      }
      // Single-letter shortcuts only make sense while a document is on screen.
      if (!inReader || e.altKey) return;
      switch (e.key) {
        case 'Escape':
          if (UI.escape()) e.preventDefault();
          break;
        case 't': UI.toggleSidebar(); break;
        case 's': UI.toggleSettings(); break;
        case 'm': UI.toggleMinimal(); break;
        case '+': case '=':
          e.preventDefault();
          showToast('Texte : ' + ReadingSettings.stepFontSize(1) + ' px');
          break;
        case '-':
          e.preventDefault();
          showToast('Texte : ' + ReadingSettings.stepFontSize(-1) + ' px');
          break;
        case 'Home':
          e.preventDefault();
          document.getElementById('content')?.scrollTo({ top: 0, behavior: scrollBehavior() });
          break;
        case 'f': FocusMode.toggle(); break;
        case 'b': Nav.back(); break;
        case 'i': Statistics.toggle(); break;
        case 'e': Editor.toggle(); break;
        case 'p': Presentation.toggle(); break;
        case '?': UI.toggleShortcuts(); break;
      }
    });
  }
};

// ── More menu ──
const MoreMenu = {
  el() { return document.getElementById('moreMenu') as HTMLElement; },
  isOpen() { return !this.el().hidden; },
  items() { return Array.from(this.el().querySelectorAll('button')).filter(b => b.offsetParent !== null); },
  open() {
    this.el().hidden = false;
    document.getElementById('moreBtn')?.setAttribute('aria-expanded', 'true');
    this.items()[0]?.focus();
  },
  close(returnFocus = true) {
    if (!this.isOpen()) return;
    this.el().hidden = true;
    const btn = document.getElementById('moreBtn');
    btn?.setAttribute('aria-expanded', 'false');
    if (returnFocus) btn?.focus();
  },
  init() {
    document.getElementById('moreBtn')?.addEventListener('click', () => { if (this.isOpen()) this.close(); else this.open(); });
    this.el().addEventListener('click', (e) => {
      if ((e.target as HTMLElement).closest('button')) this.close(false);
    });
    this.el().addEventListener('keydown', (e) => {
      const items = this.items();
      const index = items.indexOf(document.activeElement as HTMLButtonElement);
      const moves: Record<string, number> = { ArrowDown: index + 1, ArrowUp: index - 1, Home: 0, End: items.length - 1 };
      if (e.key in moves) {
        e.preventDefault();
        items[(moves[e.key] + items.length) % items.length]?.focus();
      } else if (e.key === 'Tab') {
        this.close(false);
      }
    });
  }
};

// ── Immersion: the chrome leaves while reading and returns as soon as it is wanted ──
const Immersion = {
  lastTop: 0,
  show() { document.getElementById('app')!.classList.remove('chrome-hidden'); },
  onScroll() {
    if (!state.minimalMode) return;
    const content = document.getElementById('content');
    if (!content) return;
    const delta = content.scrollTop - this.lastTop;
    this.lastTop = content.scrollTop;
    if (Math.abs(delta) < 4) return;
    const panelOpen = state.settingsOpen || state.searchOpen || MoreMenu.isOpen();
    document.getElementById('app')!.classList.toggle('chrome-hidden', delta > 0 && content.scrollTop > 80 && !panelOpen);
  },
  init() {
    document.addEventListener('mousemove', (e) => { if (state.minimalMode && e.clientY < 64) this.show(); });
    document.querySelector('.toolbar')?.addEventListener('focusin', () => this.show());
  }
};

// ── UI Controller ──
const UI = {
  init() {
    const on = (id: string, handler: (e: Event) => void) => document.getElementById(id)?.addEventListener('click', handler);
    on('homeBtn', () => Library.show());
    on('tocToggle', () => this.toggleSidebar());
    on('sectionBtn', () => { this.showPanel('tocContent'); if (!state.sidebarOpen) this.toggleSidebar(); });
    on('sidebarClose', () => { this.closeSidebar(); document.getElementById('tocToggle')?.focus(); });
    on('sidebarOverlay', () => this.closeSidebar());
    on('searchToggle', () => { if (state.searchOpen) Search.close(); else Search.open(); });
    on('settingsToggle', () => this.toggleSettings());
    on('settingsClose', () => this.closeSettings(true));
    on('fullscreenToggle', () => this.toggleFullscreen());
    on('printBtn', () => window.print());
    on('shortcutsToggle', () => this.toggleShortcuts());
    on('bookmarkToggle', () => Bookmarks.toggle());
    on('navBack', () => Nav.back());
    on('menuImmersive', () => this.toggleMinimal());
    on('menuFocus', () => FocusMode.toggle());
    on('modeRead', () => { if (state.editorOpen) Editor.toggle(); });
    on('editorToggle', () => { if (!state.editorOpen) Editor.toggle(); });
    on('menuEdit', () => Editor.toggle());
    on('presentToggle', () => Presentation.toggle());
    on('menuPresent', () => Presentation.toggle());
    on('backToTop', () => document.getElementById('content')?.scrollTo({ top: 0, behavior: scrollBehavior() }));
    on('searchNext', () => Search.next());
    on('searchPrev', () => Search.prev());
    on('searchClose', () => Search.close());
    on('fontSizeDec', () => ReadingSettings.stepFontSize(-1));
    on('fontSizeInc', () => ReadingSettings.stepFontSize(1));
    on('settingsReset', () => ReadingSettings.reset());
    on('statsToggle', () => Statistics.toggle());
    on('presentExit', () => Presentation.exit());
    on('presentPrev', () => Presentation.prev());
    on('presentNext', () => Presentation.next());
    on('editorDownload', () => Editor.download());
    MoreMenu.init();
    Immersion.init();
    Annotations.initSelection();

    document.querySelectorAll('.sidebar-tabs [role="tab"]').forEach((tab, _i, tabs) => {
      tab.addEventListener('click', () => this.showPanel((tab as HTMLElement).dataset.panel!));
      tab.addEventListener('keydown', (e) => {
        const key = (e as KeyboardEvent).key;
        if (key !== 'ArrowRight' && key !== 'ArrowLeft') return;
        const list = Array.from(tabs) as HTMLElement[];
        const next = list[(list.indexOf(tab as HTMLElement) + (key === 'ArrowRight' ? 1 : list.length - 1)) % list.length];
        this.showPanel(next.dataset.panel!);
        next.focus();
      });
    });

    document.getElementById('searchInput')?.addEventListener('input', debounce((e: unknown) => {
      Search.perform((e as InputEvent & { target: HTMLInputElement }).target.value);
    }, 200));
    document.getElementById('searchInput')?.addEventListener('keydown', (e) => {
      if ((e as KeyboardEvent).key === 'Enter') {
        if ((e as KeyboardEvent).shiftKey) Search.prev(); else Search.next();
        e.preventDefault();
      }
    });
    document.querySelectorAll('.theme-btn').forEach(btn => {
      btn.addEventListener('click', () => ThemeManager.set((btn as HTMLElement).dataset.themeChoice!));
    });
    document.querySelectorAll<HTMLElement>('[data-setting]').forEach(btn => {
      btn.addEventListener('click', () => {
        const prop = btn.dataset.setting!;
        ReadingSettings.apply(prop, prop === 'fontFamily' ? btn.dataset.value : parseFloat(btn.dataset.value!));
      });
    });
    document.getElementById('minimalMode')?.addEventListener('change', () => this.toggleMinimal());
    document.getElementById('focusMode')?.addEventListener('change', () => FocusMode.toggle());
    document.getElementById('content')?.addEventListener('scroll', throttle(() => {
      ReadingProgress.update();
      TOC.syncActive();
      Bookmarks.syncButton();
      Immersion.onScroll();
    }, 100), { passive: true });
    document.getElementById('lightbox')?.addEventListener('click', (e) => {
      if (e.target === e.currentTarget || (e.target as HTMLElement).classList.contains('lightbox-close')) Lightbox.close();
    });
    document.querySelector('.shortcuts-close')?.addEventListener('click', () => this.closeShortcuts());
    document.getElementById('shortcutsHelp')?.addEventListener('click', (e) => {
      if (e.target === e.currentTarget) this.closeShortcuts();
    });
    document.getElementById('editorTextarea')?.addEventListener('input', () => Editor.render());
    document.getElementById('regexToggle')?.addEventListener('click', function(this: HTMLElement) {
      state.regexSearch = !state.regexSearch;
      this.setAttribute('aria-pressed', String(state.regexSearch));
      const input = document.getElementById('searchInput') as HTMLInputElement;
      if (input && input.value) Search.perform(input.value);
    });
    document.getElementById('statsPanel')?.addEventListener('click', function(this: HTMLElement, e: Event) {
      if (e.target === this) Statistics.toggle();
    });
    document.addEventListener('pointerdown', (e) => {
      const target = e.target as Node;
      if (MoreMenu.isOpen() && !document.querySelector('.menu-anchor')?.contains(target)) MoreMenu.close(false);
      const onToast = (target as Element).closest?.('.toast');
      if (state.settingsOpen && !onToast && !document.getElementById('settingsPanel')?.contains(target) && !document.getElementById('settingsToggle')?.contains(target)) {
        this.closeSettings();
      }
    });
    window.addEventListener('beforeunload', (e) => { if (state.dirty) e.preventDefault(); });

    Bookmarks.renderPanel();
    Annotations.renderPanel();
    if (Preferences.get('minimalMode')) {
      state.minimalMode = true;
      document.getElementById('app')!.classList.add('minimal');
      const cb = document.getElementById('minimalMode') as HTMLInputElement;
      if (cb) cb.checked = true;
      document.getElementById('menuImmersive')?.setAttribute('aria-checked', 'true');
    }
    if (window.innerWidth <= 900) {
      this.syncSidebarButton(false);
    } else if (!Preferences.get('sidebarOpen')) {
      document.getElementById('sidebar')!.classList.add('collapsed');
      state.sidebarOpen = false;
      this.syncSidebarButton(false);
    }
  },

  // Closes the most recently relevant layer. Returns whether anything was closed.
  escape() {
    if (MoreMenu.isOpen()) { MoreMenu.close(); return true; }
    const popup = document.querySelector('.annotation-popup') as HTMLElement | null;
    if (popup && popup.style.display !== 'none' && popup.style.display !== '') { Annotations.hidePopup(); return true; }
    if (state.lightboxOpen) { Lightbox.close(); return true; }
    if (state.shortcutsOpen) { this.closeShortcuts(); return true; }
    if (state.statsOpen) { Statistics.toggle(); return true; }
    if (state.searchOpen) { Search.close(); return true; }
    if (state.settingsOpen) { this.closeSettings(true); return true; }
    if (window.innerWidth <= 900 && state.sidebarOpen) { this.closeSidebar(); document.getElementById('tocToggle')?.focus(); return true; }
    if (state.focusMode) { FocusMode.toggle(); return true; }
    if (state.minimalMode) { this.toggleMinimal(); return true; }
    return false;
  },
  showPanel(panelId: string) {
    document.querySelectorAll<HTMLElement>('.sidebar-tabs [role="tab"]').forEach(tab => {
      const selected = tab.dataset.panel === panelId;
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
      const panel = document.getElementById(tab.dataset.panel!);
      if (panel) panel.hidden = !selected;
    });
  },
  syncSidebarButton(open: boolean) {
    document.getElementById('tocToggle')?.setAttribute('aria-expanded', String(open));
  },
  toggleSidebar() {
    const sidebar = document.getElementById('sidebar')!;
    const overlay = document.getElementById('sidebarOverlay')!;
    if (window.innerWidth <= 900) {
      const isOpen = sidebar.classList.contains('mobile-open');
      sidebar.classList.toggle('mobile-open', !isOpen);
      overlay.classList.toggle('hidden', isOpen);
      state.sidebarOpen = !isOpen;
      if (!isOpen) document.querySelector<HTMLElement>('.sidebar-tabs [aria-selected="true"]')?.focus();
    } else {
      sidebar.classList.toggle('collapsed');
      state.sidebarOpen = !sidebar.classList.contains('collapsed');
      Preferences.set('sidebarOpen', state.sidebarOpen);
    }
    this.syncSidebarButton(state.sidebarOpen);
  },
  closeSidebar() {
    const sidebar = document.getElementById('sidebar')!;
    if (window.innerWidth <= 900) {
      sidebar.classList.remove('mobile-open');
      document.getElementById('sidebarOverlay')!.classList.add('hidden');
    } else {
      sidebar.classList.add('collapsed');
      Preferences.set('sidebarOpen', false);
    }
    state.sidebarOpen = false;
    this.syncSidebarButton(false);
  },
  toggleSettings() {
    if (state.settingsOpen) { this.closeSettings(true); return; }
    state.settingsOpen = true;
    document.getElementById('settingsPanel')!.classList.add('visible');
    document.getElementById('settingsToggle')?.setAttribute('aria-expanded', 'true');
    document.querySelector<HTMLElement>('#settingsPanel .theme-btn[aria-pressed="true"]')?.focus();
  },
  closeSettings(returnFocus = false) {
    state.settingsOpen = false;
    document.getElementById('settingsPanel')!.classList.remove('visible');
    const toggle = document.getElementById('settingsToggle');
    toggle?.setAttribute('aria-expanded', 'false');
    if (returnFocus) toggle?.focus();
  },
  toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {
        showToast('Le plein écran n\'est pas disponible sur cet appareil.');
      });
    } else {
      document.exitFullscreen?.();
    }
  },
  toggleMinimal() {
    state.minimalMode = !state.minimalMode;
    Preferences.set('minimalMode', state.minimalMode);
    const app = document.getElementById('app')!;
    app.classList.toggle('minimal', state.minimalMode);
    if (!state.minimalMode) app.classList.remove('chrome-hidden');
    const cb = document.getElementById('minimalMode') as HTMLInputElement;
    if (cb) cb.checked = state.minimalMode;
    document.getElementById('menuImmersive')?.setAttribute('aria-checked', String(state.minimalMode));
    showToast(state.minimalMode ? 'Immersion activée. Remontez pour revoir la barre, Échap pour quitter.' : 'Immersion désactivée');
  },
  toggleShortcuts() {
    if (state.shortcutsOpen) { this.closeShortcuts(); return; }
    state.shortcutsOpen = true;
    const el = document.getElementById('shortcutsHelp')!;
    el.classList.remove('hidden');
    trapFocus(el);
  },
  closeShortcuts() {
    state.shortcutsOpen = false;
    const el = document.getElementById('shortcutsHelp')!;
    releaseFocus(el);
    el.classList.add('hidden');
    document.getElementById('moreBtn')?.focus();
  }
};

// ── GitHub Browser ──
const GitHubBrowser = {
  current: null as { owner: string; repo: string; ref: string; path: string } | null,
  files: [] as { path: string; name: string; size: number }[],
  lastInput: '',
  els() {
    return {
      input: document.getElementById('ghUrl') as HTMLInputElement,
      scanBtn: document.getElementById('ghScanBtn') as HTMLButtonElement,
      status: document.getElementById('ghStatus'),
      results: document.getElementById('ghResults'),
    };
  },
  setStatus(msg: string, kind?: string) {
    const { status } = this.els();
    if (!status) return;
    status.textContent = msg || '';
    status.style.color = kind === 'error' ? '#c0392b' : '';
  },
  init() {
    const { input, scanBtn, results } = this.els();
    if (!input || !scanBtn || !results) return;
    const saved = localStorage.getItem(GITHUB_SOURCE_KEY);
    if (saved) input.value = saved;
    scanBtn.addEventListener('click', () => this.scan(input.value.trim()));
    const saveBtn = document.getElementById('ghSaveBtn');
    if (saveBtn) saveBtn.addEventListener('click', () => this.saveCurrent());
    try { SavedDirs.render(); } catch { /* ignore */ }
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') this.scan(input.value.trim()); });
    results.addEventListener('click', (e) => {
      const btn = (e.target as HTMLElement)?.closest?.('[data-gh-index]') as HTMLElement | null;
      if (btn) this.openFile(Number(btn.dataset.ghIndex));
    });
  },
  parseInput(raw: string) {
    raw = (raw || '').trim();
    if (!raw) return null;
    let owner: string | null = null, repo: string | null = null, ref: string | null = null, path = '';
    const urlMatch = raw.match(/github\.com\/([^/\s]+)\/([^/\s?#]+)(?:\/tree\/([^/\s?#]+)(?:\/([^\s?#]*))?)?/i);
    if (urlMatch) {
      owner = urlMatch[1];
      repo = urlMatch[2].replace(/\.git$/i, '');
      ref = urlMatch[3] || null;
      path = (urlMatch[4] || '').replace(/^\/+|\/+$/g, '');
    } else {
      const atMatch = raw.match(/^([^/\s]+)\/([^@\s]+)(?:@([^\s/]+)(?:\/(.*))?)?$/);
      if (atMatch) {
        owner = atMatch[1];
        repo = atMatch[2].replace(/\.git$/i, '');
        ref = atMatch[3] || null;
        path = (atMatch[4] || '').replace(/^\/+|\/+$/g, '');
      } else {
        const parts = raw.split('/').filter(Boolean);
        if (parts.length >= 2) {
          owner = parts[0];
          repo = parts[1].replace(/\.git$/i, '');
          path = parts.slice(2).join('/').replace(/^\/+|\/+$/g, '');
        }
      }
    }
    if (!owner || !repo) return null;
    try { path = decodeURIComponent(path); } catch { /* ignore */ }
    return { owner, repo, ref, path };
  },
  isMarkdownPath(p: string) {
    return /\.(md|markdown|mdown|mkd|mkdn|mdwn|mdtxt|mdtext|txt)$/i.test(p || '');
  },
  async scan(raw: string) {
    const { input, scanBtn } = this.els();
    const parsed = this.parseInput(raw);
    if (!parsed) {
      this.setStatus('URL GitHub invalide. Exemple: owner/repo ou https://github.com/owner/repo/tree/main/docs', 'error');
      return;
    }
    let { owner, repo, ref, path } = parsed;
    if (input) localStorage.setItem(GITHUB_SOURCE_KEY, raw);
    this.lastInput = raw;
    scanBtn.disabled = true;
    this.setStatus('Récupération des infos du dépôt...');
    this.files = [];
    this.renderResults();
    try {
      if (!ref) {
        const repoRes = await fetch(`https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`, {
          headers: { 'Accept': 'application/vnd.github+json' }
        });
        if (!repoRes.ok) throw new Error('Dépôt introuvable ou non public (' + repoRes.status + ')');
        const repoInfo = await repoRes.json();
        ref = repoInfo.default_branch;
      }
      this.current = { owner, repo, ref: ref!, path };
      this.setStatus("Scan de l'arbre Git (récursif)...");
      const refPath = String(ref).split('/').map(encodeURIComponent).join('/');
      const treeUrl = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/trees/${refPath}?recursive=1`;
      const treeRes = await fetch(treeUrl, { headers: { 'Accept': 'application/vnd.github+json' } });
      if (!treeRes.ok) throw new Error("Impossible de lire l'arbre (" + treeRes.status + ')');
      const tree = await treeRes.json();
      const prefix = path ? path.replace(/\/+$/g, '') + '/' : '';
      this.files = (tree.tree || [])
        .filter((entry: { type: string; path: string }) => entry.type === 'blob')
        .filter((entry: { path: string }) => {
          if (!this.isMarkdownPath(entry.path)) return false;
          if (!prefix) return true;
          return entry.path === path || entry.path.startsWith(prefix);
        })
        .map((entry: { path: string; size?: number }) => ({
          path: entry.path,
          name: entry.path.split('/').pop()!,
          size: entry.size || 0,
        }));
      this.files.sort((a, b) => a.path.localeCompare(b.path, 'fr'));
      try { SavedDirs.upsertCurrent(); } catch { /* ignore */ }
      this.updateSaveButton();
      let msg = this.files.length + ' fichier(s) Markdown trouvé(s).';
      if (tree.truncated) msg += ' (arbre tronqué par GitHub: certains fichiers peuvent manquer)';
      this.setStatus(msg);
    } catch (err: unknown) {
      console.error(err);
      this.setStatus((err as Error)?.message || 'Erreur lors du scan GitHub', 'error');
    } finally {
      scanBtn.disabled = false;
      this.renderResults();
      this.updateSaveButton();
    }
  },
  renderResults() {
    const { results } = this.els();
    if (!results) return;
    if (!this.files || this.files.length === 0) {
      results.innerHTML = '<div class="gh-empty">Aucun fichier Markdown à afficher. Lancez un scan.</div>';
      return;
    }
    results.innerHTML =
      '<div class="gh-count">' + this.files.length + ' fichier(s) Markdown</div>' +
      this.files.map((f, i) =>
        '<button class="gh-file" type="button" data-gh-index="' + i + '">' +
          '<span class="gh-file-name">' + escapeHtml(f.name) + '</span>' +
          '<span class="gh-file-path">' + escapeHtml(f.path) + (f.size ? '  (' + Math.round(f.size/1024) + ' Ko)' : '') + '</span>' +
        '</button>'
      ).join('');
  },
  async openFile(index: number) {
    const f = this.files[index];
    if (!f || !this.current) return;
    const { owner, repo, ref } = this.current;
    const seg = f.path.split('/').map(encodeURIComponent).join('/');
    const refPath = String(ref).split('/').map(encodeURIComponent).join('/');
    const url = `https://raw.githubusercontent.com/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/${refPath}/${seg}`;
    this.setStatus('Chargement de ' + f.name + '...');
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error('Échec du téléchargement (' + res.status + ')');
      const text = await res.text();
      const file = new File([text], f.name, { type: 'text/markdown' });
      FileLoader.loadFile(file, null);
      this.setStatus('Ouvert: ' + f.name);
    } catch (err: unknown) {
      console.error(err);
      this.setStatus((err as Error)?.message || "Erreur lors de l'ouverture", 'error');
    }
  },
  saveCurrent() { SavedDirs.saveFromBrowser(); },
  updateSaveButton() {
    const btn = document.getElementById('ghSaveBtn') as HTMLButtonElement;
    if (!btn) return;
    const has = !!(this.current && this.files && this.files.length);
    btn.disabled = !has;
    btn.textContent = (has && SavedDirs.existsCurrent()) ? 'Mettre à jour le répertoire' : 'Sauvegarder ce répertoire';
  }
};

// ── Reader toggle helper ──
const ReaderView = {
  show() {
    document.getElementById('welcome')?.classList.add('hidden');
    document.getElementById('reader')?.classList.remove('hidden');
    window.scrollTo(0, 0);
  }
};

function renderResumeCard() {
  const slot = document.getElementById('resumeSlot');
  if (!slot) return;
  if (!state.fileName) { slot.innerHTML = ''; return; }
  slot.innerHTML =
    '<div class="resume-card">' +
      '<div class="resume-text">' +
        '<span class="resume-label">Reprendre la lecture</span>' +
        '<span class="resume-title">' + escapeHtml(state.fileName) + '</span>' +
      '</div>' +
      '<button type="button" class="resume-btn" id="resumeBtn">Reprendre</button>' +
    '</div>';
  const btn = document.getElementById('resumeBtn');
  if (btn) btn.addEventListener('click', () => ReaderView.show());
}

// ── Library / Navigation ──
const Library = {
  show() {
    renderResumeCard();
    if (window.innerWidth <= 900 && state.sidebarOpen) UI.closeSidebar();
    UI.closeSettings();
    MoreMenu.close(false);
    Annotations.hidePopup();
    if (state.searchOpen) Search.close(false);
    const welcome = document.getElementById('welcome');
    const reader = document.getElementById('reader');
    if (welcome) welcome.classList.remove('hidden');
    if (reader) reader.classList.add('hidden');
    try { RecentFiles.render(); } catch { /* ignore */ }
    try { SavedDirs.render(); } catch { /* ignore */ }
    try { GitHubBrowser.renderResults(); } catch { /* ignore */ }
    window.scrollTo(0, 0);
  }
};

// ── Saved GitHub directories ──
const SavedDirs = {
  get(): { id: string; owner: string; repo: string; ref: string; path: string; url: string; count: number; scannedAt: number; files: { path: string; name: string; size: number }[] }[] {
    try { return JSON.parse(localStorage.getItem(SAVED_DIRS_KEY) || '[]'); } catch { return []; }
  },
  set(list: unknown[]) {
    try { localStorage.setItem(SAVED_DIRS_KEY, JSON.stringify(list || [])); }
    catch {
      try {
        const light = (list as { files?: unknown[]; [k: string]: unknown }[] || []).map(({ files, ...rest }) => ({ ...rest, files: [], truncatedCache: true }));
        localStorage.setItem(SAVED_DIRS_KEY, JSON.stringify(light));
      } catch { /* ignore */ }
    }
    this.render();
  },
  keyOf(d: { owner: string; repo: string; ref?: string; path?: string }) { return [d.owner, d.repo, d.ref || '', d.path || ''].join('/'); },
  find(id: string) { return this.get().find(d => d.id === id) || null; },
  existsCurrent() {
    if (!GitHubBrowser.current) return false;
    const curKey = this.keyOf(GitHubBrowser.current);
    return this.get().some(d => this.keyOf(d) === curKey);
  },
  saveFromBrowser() {
    if (!GitHubBrowser.current || !GitHubBrowser.files || !GitHubBrowser.files.length) return;
    const cur = GitHubBrowser.current;
    const list = this.get();
    const curKey = this.keyOf(cur);
    const idx = list.findIndex(d => this.keyOf(d) === curKey);
    const entry = {
      id: idx >= 0 ? list[idx].id : ('dir_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)),
      owner: cur.owner,
      repo: cur.repo,
      ref: cur.ref,
      path: cur.path,
      url: GitHubBrowser.lastInput || '',
      count: GitHubBrowser.files.length,
      scannedAt: Date.now(),
      files: GitHubBrowser.files.map(f => ({ path: f.path, name: f.name, size: f.size || 0 })),
    };
    if (idx >= 0) list[idx] = entry; else list.unshift(entry);
    if (list.length > 12) list.length = 12;
    this.set(list);
    GitHubBrowser.updateSaveButton();
  },
  upsertCurrent() {
    if (!GitHubBrowser.current || !GitHubBrowser.files || !GitHubBrowser.files.length) return;
    if (!this.existsCurrent()) return;
    const cur = GitHubBrowser.current;
    const list = this.get();
    const curKey = this.keyOf(cur);
    const idx = list.findIndex(d => this.keyOf(d) === curKey);
    if (idx < 0) return;
    list[idx] = {
      ...list[idx],
      ref: cur.ref,
      path: cur.path,
      url: GitHubBrowser.lastInput || list[idx].url || '',
      count: GitHubBrowser.files.length,
      scannedAt: Date.now(),
      files: GitHubBrowser.files.map(f => ({ path: f.path, name: f.name, size: f.size || 0 })),
    };
    this.set(list);
  },
  remove(id: string) {
    const list = this.get().filter(d => d.id !== id);
    this.set(list);
  },
  loadIntoBrowser(id: string) {
    const dir = this.find(id);
    if (!dir) return;
    if (!(dir.files && dir.files.length)) {
      this.refresh(id);
      return;
    }
    GitHubBrowser.current = { owner: dir.owner, repo: dir.repo, ref: dir.ref, path: dir.path };
    GitHubBrowser.lastInput = dir.url || (dir.owner + '/' + dir.repo + (dir.ref ? '@' + dir.ref : '') + (dir.path ? '/' + dir.path : ''));
    GitHubBrowser.files = (dir.files || []).map(f => ({ path: f.path, name: f.name, size: f.size || 0 }));
    const input = document.getElementById('ghUrl') as HTMLInputElement;
    if (input) input.value = GitHubBrowser.lastInput;
    GitHubBrowser.renderResults();
    GitHubBrowser.setStatus(dir.files && dir.files.length ? (dir.files.length + ' fichier(s) (scan du ' + new Date(dir.scannedAt).toLocaleString('fr-FR') + ')') : 'Répertoire vide', dir.files && dir.files.length ? '' : 'error');
    GitHubBrowser.updateSaveButton();
  },
  refresh(id: string) {
    const dir = this.find(id);
    if (!dir) return;
    const url = dir.url || (dir.owner + '/' + dir.repo + (dir.path ? '/' + dir.path : ''));
    const input = document.getElementById('ghUrl') as HTMLInputElement;
    if (input) input.value = url;
    GitHubBrowser.lastInput = url;
    GitHubBrowser.scan(url);
  },
  render() {
    const el = document.getElementById('ghSavedDirs');
    if (!el) return;
    const list = this.get();
    if (!list.length) {
      el.innerHTML = '<div class="gh-saved-empty">Aucun répertoire sauvegardé pour l\'instant. Scannez un dossier GitHub puis cliquez "Sauvegarder ce répertoire".</div>';
      return;
    }
    el.innerHTML = list.map(dir => {
      const title = dir.owner + '/' + dir.repo + (dir.path ? ' / ' + dir.path : '');
      const meta = 'Branche: ' + (dir.ref || '?') + ' · ' + (dir.count || (dir.files||[]).length) + ' fichier(s) · scanné le ' + new Date(dir.scannedAt).toLocaleDateString('fr-FR');
      return '<div class="gh-saved-item">' +
        '<div class="gh-saved-header"><div class="gh-saved-title">' + escapeHtml(title) + '</div></div>' +
        '<div class="gh-saved-meta">' + escapeHtml(meta) + '</div>' +
        '<div class="gh-saved-btns">' +
          '<button type="button" class="primary" data-saved-open="' + dir.id + '">Ouvrir</button>' +
          '<button type="button" data-saved-refresh="' + dir.id + '">Actualiser</button>' +
          '<button type="button" data-saved-remove="' + dir.id + '">Supprimer</button>' +
        '</div>' +
      '</div>';
    }).join('');
    el.querySelectorAll('[data-saved-open]').forEach(b => b.addEventListener('click', () => this.loadIntoBrowser((b as HTMLElement).dataset.savedOpen!)));
    el.querySelectorAll('[data-saved-refresh]').forEach(b => b.addEventListener('click', () => this.refresh((b as HTMLElement).dataset.savedRefresh!)));
    el.querySelectorAll('[data-saved-remove]').forEach(b => b.addEventListener('click', () => this.remove((b as HTMLElement).dataset.savedRemove!)));
  }
};

// ── Init ──
export function initApp() {
  if (_initialized) return;
  _initialized = true;
  Announcer.init();
  Preferences.load();
  MarkdownEngine.init();
  ThemeManager.init();
  ReadingSettings.init();
  FileLoader.init();
  GitHubBrowser.init();
  Keyboard.init();
  UI.init();
  RecentFiles.render();
  try { SavedDirs.render(); } catch { /* ignore */ }
}
