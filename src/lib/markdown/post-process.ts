import katex from 'katex';
import mermaid from 'mermaid';
import hljs from 'highlight.js';
import { escapeHtml, slugify, scrollBehavior } from '../utils';
import { ALERT_ICONS, ALERT_LABELS } from '../constants';
import type { MathBlock } from './engine';

export type ImageClickCallback = (src: string, alt: string) => void;

export interface PostProcessOptions {
  /** Called when an image is clicked (replaces Lightbox.open). */
  onImageClick?: ImageClickCallback;
  /** Called when an internal anchor link is clicked (before scrollIntoView). */
  onAnchorClick?: () => void;
  /** Called after a heading link URL is copied to clipboard. */
  onLinkCopied?: (msg: string) => void;
}

export function postProcess(
  container: HTMLElement,
  mathBlocks: MathBlock[],
  optionsOrOnImageClick?: PostProcessOptions | ImageClickCallback,
): void {
  const options: PostProcessOptions = typeof optionsOrOnImageClick === 'function'
    ? { onImageClick: optionsOrOnImageClick }
    : (optionsOrOnImageClick ?? {});

  renderMath(container, mathBlocks);
  renderMermaid(container);
  processHeadings(container, options);
  processCodeBlocks(container);
  processTables(container);
  processAlerts(container);
  processLinks(container, options);
  processFootnotePopups(container);
  processImages(container, options);
  processTaskLists(container);
}

function processHeadings(container: HTMLElement, options: PostProcessOptions = {}) {
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
      navigator.clipboard.writeText(url).then(() => {
        if (options.onLinkCopied) options.onLinkCopied('Lien copié');
      }).catch(() => {});
    });
    h.insertBefore(anchor, h.firstChild);
  });
}

function processCodeBlocks(container: HTMLElement) {
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
}

function processTables(container: HTMLElement) {
  container.querySelectorAll('table').forEach(table => {
    if (table.parentElement?.classList.contains('table-wrapper')) return;
    const wrapper = document.createElement('div');
    wrapper.className = 'table-wrapper';
    table.parentNode!.insertBefore(wrapper, table);
    wrapper.appendChild(table);
    makeSortable(table);
  });
}

function makeSortable(table: HTMLTableElement) {
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
}

function processAlerts(container: HTMLElement) {
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
}

function processLinks(container: HTMLElement, options: PostProcessOptions = {}) {
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
          if (options.onAnchorClick) options.onAnchorClick();
          target.scrollIntoView({ behavior: scrollBehavior(), block: 'start' });
        }
      });
    }
  });
}

function processFootnotePopups(container: HTMLElement) {
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
}

function processImages(container: HTMLElement, options: PostProcessOptions = {}) {
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
      if (options.onImageClick) options.onImageClick(img.src, img.alt);
    });
    if (img.title) {
      const caption = document.createElement('span');
      caption.className = 'img-caption';
      caption.textContent = img.title;
      img.parentNode!.insertBefore(caption, img.nextSibling);
    }
  });
}

function processTaskLists(container: HTMLElement) {
  container.querySelectorAll('li').forEach(li => {
    const cb = li.querySelector('input[type="checkbox"]');
    if (cb) li.classList.add('task-list-item');
  });
}

function renderMath(container: HTMLElement, mathBlocks: MathBlock[]) {
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
}

function renderMermaid(container: HTMLElement) {
  container.querySelectorAll('pre code.language-mermaid').forEach(block => {
    const pre = block.closest('pre')!;
    const source = block.textContent || '';
    const wrapper = document.createElement('div');
    wrapper.className = 'mermaid-container';
    wrapper.dataset.source = source;
    wrapper.textContent = source;
    pre.replaceWith(wrapper);
  });
  runMermaid(container);
}

function runMermaid(container: HTMLElement) {
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
