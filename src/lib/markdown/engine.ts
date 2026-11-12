import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { frenchTypography, transformProseText, escapeHtml } from '../utils';
import { EMOJI_MAP } from '../constants';

export interface MathBlock {
  id: string;
  expr: string;
  display: boolean;
}

const FRONTMATTER_LABELS: Record<string, string> = {
  title: 'Titre', author: 'Auteur', authors: 'Auteurs', date: 'Date', updated: 'Mis à jour', version: 'Version',
  description: 'Description', tags: 'Étiquettes', category: 'Catégorie', status: 'Statut', license: 'Licence',
};

// Initialise marked at module level
marked.use({ gfm: true, breaks: false });

function extractFrontmatter(text: string) {
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
}

function preprocessInlineSyntax(text: string): { text: string; blocks: MathBlock[] } {
  const blocks: MathBlock[] = [];
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
}

function processFootnotes(text: string): string {
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
}

export function renderMarkdown(markdown: string): { html: string; mathBlocks: MathBlock[]; meta: Record<string, string> | null } {
  const { meta, body } = extractFrontmatter(markdown);
  let processed = processFootnotes(body);
  const { text: preprocessed, blocks: mathBlocks } = preprocessInlineSyntax(processed);
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
