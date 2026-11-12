'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { PositionManager } from '../lib/storage/positions';
import { WORDS_PER_MINUTE } from '../lib/constants';
import { scrollBehavior, throttle } from '../lib/utils';

export interface UseReadingProgressReturn {
  fraction: number;
  progressPercent: number;
  remainingText: string;
  showBackToTop: boolean;
  scrollToTop: () => void;
}

export interface UseReadingProgressOptions {
  contentRef: React.RefObject<HTMLElement | null>;
  fileHash: string;
  totalWords: number;
}

export function contentFraction(content: HTMLElement | null): number {
  if (!content || content.scrollHeight <= content.clientHeight) return 0;
  const maxScroll = content.scrollHeight - content.clientHeight;
  return Math.max(0, Math.min(1, content.scrollTop / maxScroll));
}

export function computeRemainingText(fraction: number, totalWords: number, scrollable: boolean): string {
  if (!totalWords || totalWords <= 0) return '';
  const total = Math.max(1, Math.ceil(totalWords / WORDS_PER_MINUTE));
  if (!scrollable || fraction < 0.005) {
    return `${total} min de lecture`;
  }
  if (fraction > 0.995) {
    return 'Lecture terminée';
  }
  const remaining = Math.max(1, Math.ceil(total * (1 - fraction)));
  return `${Math.round(fraction * 100)} % · ${remaining} min restante${remaining > 1 ? 's' : ''}`;
}

export function useReadingProgress(
  arg1: React.RefObject<HTMLElement | null> | UseReadingProgressOptions,
  arg2?: string,
  arg3?: number
): UseReadingProgressReturn {
  const contentRef = (
    typeof arg1 === 'object' && arg1 !== null && 'current' in arg1
      ? arg1
      : (arg1 as UseReadingProgressOptions).contentRef
  ) as React.RefObject<HTMLElement | null>;

  const fileHash = (
    typeof arg1 === 'object' && arg1 !== null && !('current' in arg1)
      ? (arg1 as UseReadingProgressOptions).fileHash
      : (arg2 ?? '')
  );

  const totalWords = (
    typeof arg1 === 'object' && arg1 !== null && !('current' in arg1)
      ? (arg1 as UseReadingProgressOptions).totalWords
      : (arg3 ?? 0)
  );

  const [fraction, setFraction] = useState<number>(0);
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [remainingText, setRemainingText] = useState<string>('');
  const [showBackToTop, setShowBackToTop] = useState<boolean>(false);

  const fileHashRef = useRef(fileHash);
  fileHashRef.current = fileHash;

  const totalWordsRef = useRef(totalWords);
  totalWordsRef.current = totalWords;

  const update = useCallback(() => {
    const el = contentRef.current;
    if (!el) return;

    const frac = contentFraction(el);
    const percent = Math.round(frac * 100);
    const scrollable = el.scrollHeight > el.clientHeight;
    const remaining = computeRemainingText(frac, totalWordsRef.current, scrollable);
    const backToTop = el.scrollTop > el.clientHeight;

    setFraction(frac);
    setProgressPercent(percent);
    setRemainingText(remaining);
    setShowBackToTop(backToTop);

    // Save position if fileHash is set
    if (fileHashRef.current) {
      PositionManager.save(fileHashRef.current, frac);
    }

    // Synchronize DOM attributes / bars if present
    if (typeof document !== 'undefined') {
      const fill = document.getElementById('progressFill');
      if (fill) {
        fill.style.width = `${percent}%`;
      }
      const readingLine = document.querySelector('.reading-line');
      if (readingLine) {
        readingLine.setAttribute('aria-valuenow', String(percent));
      }
    }
  }, [contentRef]);

  // Throttled scroll listener
  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;

    const throttledUpdate = throttle(() => {
      update();
    }, 100);

    el.addEventListener('scroll', throttledUpdate, { passive: true });
    // Run an initial computation
    update();

    return () => {
      el.removeEventListener('scroll', throttledUpdate);
    };
  }, [contentRef, update]);

  // Recalculate when fileHash or totalWords change
  useEffect(() => {
    update();
  }, [fileHash, totalWords, update]);

  const scrollToTop = useCallback(() => {
    if (!contentRef.current) return;
    contentRef.current.scrollTo({
      top: 0,
      behavior: scrollBehavior(),
    });
  }, [contentRef]);

  return {
    fraction,
    progressPercent,
    remainingText,
    showBackToTop,
    scrollToTop,
  };
}
