'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Annotation } from '../lib/storage/annotations';
import { loadAnnotations, saveAnnotations } from '../lib/storage/annotations';
import { Announcer, debounce, showToast } from '../lib/utils';

export type { Annotation };

export const ANNOTATION_COLORS = {
  yellow: { name: 'jaune', value: '#facc15' },
  green: { name: 'vert', value: '#4ade80' },
  blue: { name: 'bleu', value: '#60a5fa' },
  pink: { name: 'rose', value: '#f472b6' },
} as const;

export type AnnotationColorKey = keyof typeof ANNOTATION_COLORS;

export type AnnotationPopupMode = 'selection' | 'highlight' | 'note';

export interface AnnotationPopupState {
  isOpen: boolean;
  visible: boolean;
  x: number;
  y: number;
  mode: AnnotationPopupMode;
  text: string;
  annotationId: number | null;
  note: string;
  rect: DOMRect | null;
}

export interface UseAnnotationsOptions {
  fileHash: string;
  articleRef: React.RefObject<HTMLElement | null>;
}

export interface UseAnnotationsResult {
  annotations: Annotation[];
  popup: AnnotationPopupState;
  addAnnotation: (text: string, color?: string, note?: string) => boolean;
  removeAnnotation: (id: number, silent?: boolean) => void;
  setNote: (id: number, note: string) => void;
  hidePopup: () => void;
  applyAnnotations: () => boolean;
}

function decorateSpan(
  span: HTMLElement,
  ann: { id: number; color: string; note: string }
) {
  span.className =
    'annotation-highlight' +
    (ann.color && ann.color !== 'yellow' ? ` color-${ann.color}` : '') +
    (ann.note ? ' has-note' : '');
  span.dataset.annId = String(ann.id);
  if (ann.note) {
    span.title = ann.note;
  } else {
    span.removeAttribute('title');
  }
}

function computePopupPosition(
  rect: DOMRect,
  popupWidth = 240,
  popupHeight = 40
): { x: number; y: number } {
  if (typeof window === 'undefined') return { x: 0, y: 0 };
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  const left = Math.max(
    8,
    Math.min(window.innerWidth - popupWidth - 8, rect.left + rect.width / 2 - popupWidth / 2)
  );
  const above = rect.top - popupHeight - 8;
  const top =
    coarse || above < 60
      ? Math.min(window.innerHeight - popupHeight - 8, rect.bottom + 8)
      : above;
  return { x: left, y: top };
}

export function useAnnotations(
  fileHashOrOptions: string | UseAnnotationsOptions,
  articleRefArg?: React.RefObject<HTMLElement | null>
): UseAnnotationsResult {
  const options: UseAnnotationsOptions =
    typeof fileHashOrOptions === 'string'
      ? { fileHash: fileHashOrOptions, articleRef: articleRefArg! }
      : fileHashOrOptions;

  const { fileHash, articleRef } = options;

  const [annotations, setAnnotations] = useState<Annotation[]>(() =>
    fileHash ? loadAnnotations(fileHash) : []
  );
  const [prevHash, setPrevHash] = useState(fileHash);

  if (fileHash !== prevHash) {
    setPrevHash(fileHash);
    const loaded = fileHash ? loadAnnotations(fileHash) : [];
    setAnnotations(loaded);
  }

  const annotationsRef = useRef<Annotation[]>(annotations);

  useEffect(() => {
    annotationsRef.current = annotations;
  }, [annotations]);

  const [popup, setPopup] = useState<AnnotationPopupState>({
    isOpen: false,
    visible: false,
    x: 0,
    y: 0,
    mode: 'selection',
    text: '',
    annotationId: null,
    note: '',
    rect: null,
  });

  const hidePopup = useCallback(() => {
    setPopup((prev) => ({ ...prev, isOpen: false, visible: false }));
    const popupEl = document.querySelector<HTMLElement>('.annotation-popup');
    if (popupEl) popupEl.style.display = 'none';
  }, []);

  const ensureDomPopup = useCallback((): HTMLElement => {
    let popupEl = document.querySelector<HTMLElement>('.annotation-popup');
    if (!popupEl) {
      popupEl = document.createElement('div');
      popupEl.className = 'annotation-popup';
      popupEl.setAttribute('role', 'toolbar');
      popupEl.setAttribute('aria-label', 'Surligner la sélection');
      document.body.appendChild(popupEl);
      popupEl.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          e.stopPropagation();
          hidePopup();
        }
      });
    }
    return popupEl;
  }, [hidePopup]);

  const placeDomPopup = useCallback((popupEl: HTMLElement, rect: DOMRect) => {
    popupEl.style.display = 'flex';
    const w = popupEl.offsetWidth || 240;
    const h = popupEl.offsetHeight || 40;
    const pos = computePopupPosition(rect, w, h);
    popupEl.style.left = `${pos.x}px`;
    popupEl.style.top = `${pos.y}px`;
  }, []);

  const applyAnnotations = useCallback((): boolean => {
    const article = articleRef?.current;
    if (!article) return true;
    let allPlaced = true;

    annotationsRef.current.forEach((ann) => {
      if (article.querySelector(`[data-ann-id="${ann.id}"]`)) return;
      const walker = document.createTreeWalker(article, NodeFilter.SHOW_TEXT, null);
      let node: Node | null;
      while ((node = walker.nextNode())) {
        const idx = (node.textContent || '').indexOf(ann.text);
        if (idx < 0) continue;
        const range = document.createRange();
        range.setStart(node, idx);
        range.setEnd(node, idx + ann.text.length);
        const span = document.createElement('span');
        decorateSpan(span, ann);
        try {
          range.surroundContents(span);
          return;
        } catch {
          break;
        }
      }
      allPlaced = false;
    });

    return allPlaced;
  }, [articleRef]);

  // Re-apply annotations into DOM when annotations or articleRef changes
  useEffect(() => {
    if (articleRef?.current && annotations.length > 0) {
      applyAnnotations();
    }
  }, [articleRef, annotations, applyAnnotations]);

  const removeAnnotation = useCallback(
    (id: number, silent = false) => {
      if (!fileHash) return;
      const removed = annotationsRef.current.find((a) => a.id === id);
      const next = annotationsRef.current.filter((a) => a.id !== id);
      annotationsRef.current = next;
      setAnnotations(next);
      saveAnnotations(fileHash, next);

      const article = articleRef?.current;
      if (article) {
        article.querySelectorAll<HTMLElement>(`[data-ann-id="${id}"]`).forEach((el) => {
          const parent = el.parentNode;
          if (parent) {
            while (el.firstChild) {
              parent.insertBefore(el.firstChild, el);
            }
            el.remove();
            parent.normalize();
          }
        });
      }

      if (removed && !silent) {
        showToast('Surlignage retiré', {
          action: 'Annuler',
          onAction: () => {
            const restored = [...annotationsRef.current, removed];
            annotationsRef.current = restored;
            setAnnotations(restored);
            applyAnnotations();
            saveAnnotations(fileHash, restored);
          },
        });
        Announcer.say('Surlignage retiré');
      }
    },
    [fileHash, articleRef, applyAnnotations]
  );

  const setNote = useCallback(
    (id: number, note: string) => {
      if (!fileHash) return;
      const next = annotationsRef.current.map((a) =>
        a.id === id ? { ...a, note } : a
      );
      annotationsRef.current = next;
      setAnnotations(next);
      saveAnnotations(fileHash, next);

      const article = articleRef?.current;
      if (article) {
        const span = article.querySelector<HTMLElement>(`[data-ann-id="${id}"]`);
        const ann = next.find((a) => a.id === id);
        if (span && ann) {
          decorateSpan(span, ann);
        }
      }

      showToast(note ? 'Note enregistrée' : 'Note retirée');
      Announcer.say(note ? 'Note enregistrée' : 'Note retirée');
    },
    [fileHash, articleRef]
  );

  const addAnnotation = useCallback(
    (text: string, color = 'yellow', note = ''): boolean => {
      if (!text || text.length < 2 || !fileHash) return false;
      const ann: Annotation = {
        id: Date.now(),
        text: text.substring(0, 200),
        color: color || 'yellow',
        note: note || '',
        created: Date.now(),
      };

      const next = [...annotationsRef.current, ann];
      annotationsRef.current = next;
      setAnnotations(next);

      const placed = applyAnnotations();
      if (!placed) {
        const reverted = annotationsRef.current.filter((a) => a.id !== ann.id);
        annotationsRef.current = reverted;
        setAnnotations(reverted);
        showToast(
          'Ce passage traverse plusieurs blocs ou styles. Sélectionnez un passage plus court.',
          { duration: 4500 }
        );
        return false;
      }

      saveAnnotations(fileHash, next);
      showToast(note ? 'Note enregistrée' : 'Passage surligné', {
        action: 'Annuler',
        onAction: () => removeAnnotation(ann.id, true),
      });
      Announcer.say(note ? 'Note enregistrée' : 'Passage surligné');
      return true;
    },
    [fileHash, applyAnnotations, removeAnnotation]
  );

  const showNoteEditor = useCallback(
    (rect: DOMRect, initialValue: string, onSave: (note: string) => void) => {
      const pos = computePopupPosition(rect);
      setPopup((prev) => ({
        ...prev,
        isOpen: true,
        visible: true,
        x: pos.x,
        y: pos.y,
        mode: 'note',
        note: initialValue,
        rect,
      }));

      const domPopup = ensureDomPopup();
      domPopup.innerHTML =
        '<input type="text" class="ann-note-input" aria-label="Texte de la note" placeholder="Votre note" />' +
        '<button type="button" class="ann-action" data-act="save">Enregistrer</button>';

      const input = domPopup.querySelector<HTMLInputElement>('input');
      if (input) {
        input.value = initialValue;
        const save = () => {
          const note = input.value.trim();
          hidePopup();
          onSave(note);
        };
        domPopup
          .querySelector<HTMLButtonElement>('[data-act="save"]')
          ?.addEventListener('click', save);
        input.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            save();
          }
        });
        placeDomPopup(domPopup, rect);
        input.focus();
      }
    },
    [ensureDomPopup, hidePopup, placeDomPopup]
  );

  const showForSelection = useCallback(
    (rect: DOMRect, text: string) => {
      const pos = computePopupPosition(rect);
      setPopup({
        isOpen: true,
        visible: true,
        x: pos.x,
        y: pos.y,
        mode: 'selection',
        text,
        annotationId: null,
        note: '',
        rect,
      });

      const domPopup = ensureDomPopup();
      domPopup.innerHTML =
        Object.entries(ANNOTATION_COLORS)
          .map(
            ([key, c]) =>
              `<button type="button" class="ann-swatch ann-${key}" data-color="${key}" aria-label="Surligner en ${c.name}" title="Surligner en ${c.name}"></button>`
          )
          .join('') +
        '<span class="ann-divider"></span><button type="button" class="ann-action" data-act="note">Ajouter une note</button>';

      domPopup.querySelectorAll<HTMLElement>('[data-color]').forEach((btn) =>
        btn.addEventListener('click', () => {
          addAnnotation(text, btn.dataset.color || 'yellow');
          hidePopup();
          window.getSelection()?.removeAllRanges();
        })
      );

      domPopup
        .querySelector<HTMLButtonElement>('[data-act="note"]')
        ?.addEventListener('click', () => {
          showNoteEditor(rect, '', (note) => {
            addAnnotation(text, 'yellow', note);
            window.getSelection()?.removeAllRanges();
          });
        });

      placeDomPopup(domPopup, rect);
    },
    [addAnnotation, ensureDomPopup, hidePopup, placeDomPopup, showNoteEditor]
  );

  const showForHighlight = useCallback(
    (span: HTMLElement) => {
      const id = parseInt(span.dataset.annId || '', 10);
      const ann = annotationsRef.current.find((a) => a.id === id);
      if (!ann) return;
      const rect = span.getBoundingClientRect();
      const pos = computePopupPosition(rect);

      setPopup({
        isOpen: true,
        visible: true,
        x: pos.x,
        y: pos.y,
        mode: 'highlight',
        text: ann.text,
        annotationId: id,
        note: ann.note,
        rect,
      });

      const domPopup = ensureDomPopup();
      domPopup.innerHTML =
        `<button type="button" class="ann-action" data-act="note">${
          ann.note ? 'Modifier la note' : 'Ajouter une note'
        }</button>` +
        '<span class="ann-divider"></span><button type="button" class="ann-action" data-act="remove">Retirer</button>';

      domPopup
        .querySelector<HTMLButtonElement>('[data-act="note"]')
        ?.addEventListener('click', () => {
          showNoteEditor(rect, ann.note, (note) => setNote(id, note));
        });

      domPopup
        .querySelector<HTMLButtonElement>('[data-act="remove"]')
        ?.addEventListener('click', () => {
          hidePopup();
          removeAnnotation(id);
        });

      placeDomPopup(domPopup, rect);
    },
    [ensureDomPopup, hidePopup, placeDomPopup, removeAnnotation, setNote, showNoteEditor]
  );

  // Set up listeners for text selection and highlight clicks
  useEffect(() => {
    const article = articleRef?.current;
    if (!article) return;

    const fromSelection = (): boolean => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || !sel.toString().trim() || sel.rangeCount === 0) {
        return false;
      }
      const anchorNode = sel.anchorNode;
      if (!anchorNode || !article.contains(anchorNode)) return false;
      if ((anchorNode as Element)?.parentElement?.closest('pre')) return false;

      const text = sel.toString().trim();
      const rect = sel.getRangeAt(0).getBoundingClientRect();
      showForSelection(rect, text);
      return true;
    };

    const onMouseUp = (e: MouseEvent) => {
      setTimeout(() => {
        if (fromSelection()) return;
        const target = e.target as HTMLElement | null;
        const span = target?.closest?.('.annotation-highlight') as HTMLElement | null;
        if (span && article.contains(span)) {
          showForHighlight(span);
        }
      });
    };

    const onPointerDown = (e: PointerEvent) => {
      const popupEl = document.querySelector('.annotation-popup');
      if (popupEl && !popupEl.contains(e.target as Node)) {
        hidePopup();
      }
    };

    const onScroll = () => {
      if (document.activeElement?.classList.contains('ann-note-input')) return;
      hidePopup();
    };

    article.addEventListener('mouseup', onMouseUp);
    document.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('scroll', onScroll, { passive: true });

    const isCoarse =
      typeof window !== 'undefined' &&
      window.matchMedia('(pointer: coarse)').matches;

    let onSelectionChange: (() => void) | null = null;
    if (isCoarse) {
      onSelectionChange = debounce(() => {
        fromSelection();
      }, 500);
      document.addEventListener('selectionchange', onSelectionChange);
    }

    return () => {
      article.removeEventListener('mouseup', onMouseUp);
      document.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('scroll', onScroll);
      if (isCoarse && onSelectionChange) {
        document.removeEventListener('selectionchange', onSelectionChange);
      }
    };
  }, [articleRef, hidePopup, showForHighlight, showForSelection]);

  return {
    annotations,
    popup,
    addAnnotation,
    removeAnnotation,
    setNote,
    hidePopup,
    applyAnnotations,
  };
}
