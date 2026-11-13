'use client';

import { useEffect, useRef, useState } from 'react';
import { PositionManager } from '../lib/storage/positions';
import { WORDS_PER_MINUTE } from '../lib/constants';
import { scrollBehavior, showToast, throttle } from '../lib/utils';

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
  const totalWordsRef = useRef(totalWords);
  // Stay false until the saved scroll position has been applied, so the first
  // measurement cannot overwrite it with 0.
  const canSaveRef = useRef(false);

  useEffect(() => {
    fileHashRef.current = fileHash;
    totalWordsRef.current = totalWords;
  });

  const updateRef = useRef<() => void>(() => {});

  useEffect(() => {
    updateRef.current = () => {
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

      if (fileHashRef.current && canSaveRef.current) {
        PositionManager.save(fileHashRef.current, frac);
      }

      if (typeof document !== 'undefined') {
        const fill = document.getElementById('progressFill');
        if (fill) fill.style.width = `${percent}%`;
        const readingLine = document.querySelector('.reading-line');
        if (readingLine) readingLine.setAttribute('aria-valuenow', String(percent));
      }
    };
  });

  // Throttled scroll listener
  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;

    const throttledUpdate = throttle(() => {
      updateRef.current();
    }, 100);

    el.addEventListener('scroll', throttledUpdate, { passive: true });
    updateRef.current();

    return () => {
      el.removeEventListener('scroll', throttledUpdate);
      if (canSaveRef.current && fileHashRef.current) {
        PositionManager.save(fileHashRef.current, contentFraction(el));
      }
    };
  }, [contentRef]);

  // Restore the saved fraction once the article has a scrollable height.
  // This effect is registered before the recalculation below so that effect
  // cannot save a 0 fraction for the new document.
  useEffect(() => {
    canSaveRef.current = false;
    if (!fileHash) return;
    let frame = 0;
    let attempts = 0;
    let cancelled = false;

    const apply = () => {
      if (cancelled) return;
      const node = contentRef.current;
      if (!node || fileHashRef.current !== fileHash) return;
      const saved = PositionManager.get(fileHash);
      const max = node.scrollHeight - node.clientHeight;
      const needsScroll = saved != null && saved > 0.02;
      if (needsScroll && max <= 0 && attempts < 4) {
        attempts += 1;
        frame = requestAnimationFrame(apply);
        return;
      }
      if (max > 0) node.scrollTop = max * (saved ?? 0);
      canSaveRef.current = true;
      if (needsScroll) {
        showToast(`Reprise à ${Math.round((saved ?? 0) * 100)} %`, {
          action: 'Revenir au début',
          onAction: () => node.scrollTo({ top: 0, behavior: scrollBehavior() }),
        });
      }
    };

    frame = requestAnimationFrame(apply);
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
    };
  }, [fileHash, contentRef]);

  // Recalculate when fileHash or totalWords change
  useEffect(() => {
    updateRef.current();
  }, [fileHash, totalWords]);

  const scrollToTop = () => {
    contentRef.current?.scrollTo({
      top: 0,
      behavior: scrollBehavior(),
    });
  };

  return {
    fraction,
    progressPercent,
    remainingText,
    showBackToTop,
    scrollToTop,
  };
}
