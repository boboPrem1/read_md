'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Announcer, removeAccents, scrollBehavior } from '../lib/utils';

export interface UseSearchOptions {
  articleRef: React.RefObject<HTMLElement | null>;
}

export interface UseSearchResult {
  isOpen: boolean;
  query: string;
  isRegex: boolean;
  resultsCount: number;
  currentIndex: number;
  statusText: string;
  isError: boolean;
  open: () => void;
  close: (returnFocus?: boolean) => void;
  setQuery: (q: string) => void;
  toggleRegex: () => void;
  next: () => void;
  prev: () => void;
  goTo: (index: number) => void;
  clear: () => void;
}

export function useSearch(
  articleRefOrOptions: React.RefObject<HTMLElement | null> | UseSearchOptions
): UseSearchResult {
  const articleRef =
    'current' in articleRefOrOptions
      ? articleRefOrOptions
      : articleRefOrOptions.articleRef;

  const [isOpen, setIsOpen] = useState(false);
  const [query, setQueryState] = useState('');
  const [isRegex, setIsRegex] = useState(false);
  const [resultsCount, setResultsCount] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [statusText, setStatusText] = useState('');
  const [isError, setIsError] = useState(false);

  const marksRef = useRef<HTMLElement[]>([]);
  const currentIndexRef = useRef(-1);

  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);

  const clear = useCallback(() => {
    marksRef.current.forEach((m) => {
      const parent = m.parentNode;
      if (!parent) return;
      parent.replaceChild(document.createTextNode(m.textContent || ''), m);
      parent.normalize();
    });
    marksRef.current = [];
    setCurrentIndex(-1);
    setResultsCount(0);
    setStatusText('');
    setIsError(false);
  }, []);

  const goTo = useCallback((index: number, marksList?: HTMLElement[]) => {
    const marks = marksList || marksRef.current;
    if (marks.length === 0) return;

    if (currentIndexRef.current >= 0 && marks[currentIndexRef.current]) {
      marks[currentIndexRef.current].classList.remove('active');
    }

    const nextIdx = ((index % marks.length) + marks.length) % marks.length;
    setCurrentIndex(nextIdx);

    const mark = marks[nextIdx];
    if (mark) {
      mark.classList.add('active');
      mark.scrollIntoView({ behavior: scrollBehavior(), block: 'center' });
      setStatusText(`${nextIdx + 1} sur ${marks.length}`);
      setIsError(false);
    }
  }, []);

  const perform = useCallback(
    (searchQuery: string, regexMode: boolean) => {
      clear();
      if (!searchQuery) return;
      if (searchQuery.length < 2) {
        setStatusText('2 caractères minimum');
        setIsError(false);
        return;
      }

      const article = articleRef?.current;
      if (!article) return;

      const normalizedQuery = removeAccents(searchQuery);
      let regex: RegExp;

      if (regexMode) {
        try {
          regex = new RegExp(normalizedQuery, 'gi');
        } catch {
          setIsError(true);
          setStatusText('Expression invalide');
          return;
        }
      } else {
        const escapedQuery = normalizedQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        regex = new RegExp(escapedQuery, 'gi');
      }

      const walker = document.createTreeWalker(article, NodeFilter.SHOW_TEXT, null);
      const textNodes: Text[] = [];
      let node: Node | null;

      while ((node = walker.nextNode())) {
        if (
          node.parentElement &&
          (node.parentElement.tagName === 'SCRIPT' ||
            node.parentElement.tagName === 'STYLE')
        ) {
          continue;
        }
        if (regex.test(removeAccents(node.textContent || ''))) {
          textNodes.push(node as Text);
        }
        regex.lastIndex = 0;
      }

      const newMarks: HTMLElement[] = [];
      textNodes.forEach((textNode) => {
        const text = textNode.textContent || '';
        const normalized = removeAccents(text);
        const frag = document.createDocumentFragment();
        let lastIdx = 0;
        let match: RegExpExecArray | null;
        regex.lastIndex = 0;

        while ((match = regex.exec(normalized)) !== null) {
          if (match[0].length === 0) {
            regex.lastIndex++;
            continue;
          }
          if (match.index > lastIdx) {
            frag.appendChild(document.createTextNode(text.slice(lastIdx, match.index)));
          }
          const mark = document.createElement('mark');
          mark.className = 'search-mark';
          mark.textContent = text.slice(match.index, match.index + match[0].length);
          newMarks.push(mark);
          frag.appendChild(mark);
          lastIdx = match.index + match[0].length;
        }

        if (lastIdx < text.length) {
          frag.appendChild(document.createTextNode(text.slice(lastIdx)));
        }

        textNode.parentNode?.replaceChild(frag, textNode);
      });

      marksRef.current = newMarks;
      setResultsCount(newMarks.length);

      if (newMarks.length > 0) {
        goTo(0, newMarks);
        Announcer.say(`${newMarks.length} résultats trouvés`);
      } else {
        setIsError(true);
        setStatusText('Aucun résultat');
        Announcer.say('Aucun résultat');
      }
    },
    [articleRef, clear, goTo]
  );

  const next = useCallback(() => {
    if (marksRef.current.length === 0) return;
    goTo(currentIndexRef.current + 1);
  }, [goTo]);

  const prev = useCallback(() => {
    if (marksRef.current.length === 0) return;
    goTo(currentIndexRef.current - 1);
  }, [goTo]);

  const setQuery = useCallback(
    (q: string) => {
      setQueryState(q);
      perform(q, isRegex);
    },
    [isRegex, perform]
  );

  const toggleRegex = useCallback(() => {
    setIsRegex((prevRegex) => {
      const nextRegex = !prevRegex;
      perform(query, nextRegex);
      return nextRegex;
    });
  }, [query, perform]);

  const open = useCallback(() => {
    setIsOpen(true);
    if (query) {
      perform(query, isRegex);
    }
  }, [query, isRegex, perform]);

  const close = useCallback(
    (returnFocus = true) => {
      setIsOpen(false);
      clear();
      if (returnFocus) {
        const toggle = document.getElementById('searchToggle');
        toggle?.focus();
      }
    },
    [clear]
  );

  // Clear marks on unmount
  useEffect(() => {
    return () => {
      clear();
    };
  }, [clear]);

  return {
    isOpen,
    query,
    isRegex,
    resultsCount,
    currentIndex,
    statusText,
    isError,
    open,
    close,
    setQuery,
    toggleRegex,
    next,
    prev,
    goTo,
    clear,
  };
}
