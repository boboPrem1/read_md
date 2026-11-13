// ── Function utilities ──

export function debounce(fn: (...args: unknown[]) => void, ms: number) {
  let t: ReturnType<typeof setTimeout>;
  return function(this: unknown, ...a: unknown[]) { clearTimeout(t); t = setTimeout(() => fn.apply(this, a), ms); };
}

export function throttle(fn: (...args: unknown[]) => void, ms: number) {
  let last = 0;
  return function(this: unknown, ...a: unknown[]) { const now = Date.now(); if (now - last >= ms) { last = now; fn.apply(this, a); } };
}

// ── String / HTML utilities ──

export function escapeHtml(s: string) {
  const d = document.createElement('div'); d.textContent = s; return d.innerHTML;
}

export function frenchTypography(html: string) {
  html = html.replace(/\s+([;:!?»])/g, '\u202f$1');
  html = html.replace(/(«)\s+/g, '$1\u202f');
  return html;
}

// Applies a text transform to prose only: code (and Mermaid sources, which are code blocks
// at this stage) and HTML attributes must reach their consumers byte-for-byte.
export function transformProseText(html: string, transform: (text: string) => string) {
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

export function hashString(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = ((h << 5) - h + s.charCodeAt(i)) | 0; }
  return h.toString(36);
}

export function slugify(text: string) {
  return text.toLowerCase().replace(/<[^>]*>/g, '').replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').trim();
}

// ── DOM / scroll utilities ──

export function scrollBehavior(): ScrollBehavior {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
}

export function removeAccents(str: string) {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

export function trapFocus(container: HTMLElement) {
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
  (container as HTMLElement & { _trapHandler?: (e: KeyboardEvent) => void })._trapHandler = handler;
  container.addEventListener('keydown', handler);
}

export function releaseFocus(container: HTMLElement) {
  const c = container as HTMLElement & { _trapHandler?: (e: KeyboardEvent) => void };
  if (c._trapHandler) {
    container.removeEventListener('keydown', c._trapHandler);
    delete c._trapHandler;
  }
}

// ── Accessibility singleton ──

export const Announcer = {
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

// ── Toast notification utility ──

export interface ToastOptions {
  action?: string;
  onAction?: () => void;
  duration?: number;
}

let toastTimer: ReturnType<typeof setTimeout> | undefined;

export function showToast(msg: string, opts: ToastOptions = {}) {
  if (typeof document === 'undefined') return;
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
  if (opts.action && opts.onAction) {
    const btn = document.createElement('button');
    btn.textContent = opts.action;
    btn.className = 'toast-action';
    btn.addEventListener('click', () => {
      opts.onAction?.();
      toast?.classList.remove('visible');
    });
    toast.appendChild(btn);
  }
  toast.classList.add('visible');
  Announcer.say(msg);
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast?.classList.remove('visible');
  }, opts.duration || 3000);
}
