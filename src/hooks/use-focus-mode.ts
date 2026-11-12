'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Announcer } from '../lib/utils';

export interface UseFocusModeReturn {
  isFocusMode: boolean;
  toggleFocusMode: (force?: boolean) => void;
  refreshFocusMode: () => void;
}

export function useFocusMode(
  containerRef?: React.RefObject<HTMLElement | null>
): UseFocusModeReturn {
  const [isFocusMode, setIsFocusMode] = useState<boolean>(false);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const getContainer = useCallback((): HTMLElement | null => {
    if (containerRef?.current) return containerRef.current;
    if (typeof document === 'undefined') return null;
    return document.getElementById('app') ?? document.body;
  }, [containerRef]);

  const stopObserving = useCallback(() => {
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }
    if (typeof document !== 'undefined') {
      document.querySelectorAll('.focus-active').forEach((el) => {
        el.classList.remove('focus-active');
      });
    }
  }, []);

  const startObserving = useCallback(() => {
    if (typeof window === 'undefined' || typeof IntersectionObserver === 'undefined') return;

    // Disconnect any existing observer before starting
    stopObserving();

    const root = document.getElementById('content') || null;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          entry.target.classList.toggle('focus-active', entry.isIntersecting);
        });
      },
      {
        root,
        rootMargin: '-30% 0px -30% 0px',
        threshold: 0,
      }
    );

    observerRef.current = observer;
    const elements = document.querySelectorAll('#article > *');
    elements.forEach((el) => observer.observe(el));
  }, [stopObserving]);

  const toggleFocusMode = useCallback((force?: boolean) => {
    setIsFocusMode((prev) => {
      const next = typeof force === 'boolean' ? force : !prev;
      const container = getContainer();

      if (container) {
        container.classList.toggle('focus-mode', next);
      }

      if (next) {
        startObserving();
        if (typeof document !== 'undefined' && !Announcer._el) {
          Announcer.init();
        }
        Announcer.say('Concentration activée. Échap pour quitter.');
      } else {
        stopObserving();
        if (typeof document !== 'undefined' && !Announcer._el) {
          Announcer.init();
        }
        Announcer.say('Concentration désactivée');
      }

      return next;
    });
  }, [getContainer, startObserving, stopObserving]);

  const refreshFocusMode = useCallback(() => {
    if (!isFocusMode) return;
    stopObserving();
    startObserving();
  }, [isFocusMode, stopObserving, startObserving]);

  // Handle Escape key to exit focus mode
  useEffect(() => {
    if (!isFocusMode || typeof window === 'undefined') return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        toggleFocusMode(false);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [isFocusMode, toggleFocusMode]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopObserving();
      const container = getContainer();
      container?.classList.remove('focus-mode');
    };
  }, [getContainer, stopObserving]);

  return {
    isFocusMode,
    toggleFocusMode,
    refreshFocusMode,
  };
}
