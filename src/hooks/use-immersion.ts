'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Preferences } from '../lib/storage/preferences';
import { Announcer } from '../lib/utils';

export interface UseImmersionReturn {
  isMinimal: boolean;
  toggleMinimal: (force?: boolean) => void;
  showChrome: () => void;
  onScroll: (e?: React.UIEvent<HTMLElement> | Event) => void;
}

export interface UseImmersionOptions {
  containerRef?: React.RefObject<HTMLElement | null>;
  contentRef?: React.RefObject<HTMLElement | null>;
}

export function useImmersion(
  optionsOrRef?: React.RefObject<HTMLElement | null> | UseImmersionOptions
): UseImmersionReturn {
  const containerRef = (
    optionsOrRef && 'current' in optionsOrRef
      ? optionsOrRef
      : (optionsOrRef as UseImmersionOptions | undefined)?.containerRef
  ) as React.RefObject<HTMLElement | null> | undefined;

  const contentRef = (
    optionsOrRef && !('current' in optionsOrRef)
      ? (optionsOrRef as UseImmersionOptions | undefined)?.contentRef
      : undefined
  ) as React.RefObject<HTMLElement | null> | undefined;

  const [isMinimal, setIsMinimal] = useState<boolean>(false);
  const lastTopRef = useRef<number>(0);

  const getContainer = useCallback((): HTMLElement | null => {
    if (containerRef?.current) return containerRef.current;
    if (typeof document === 'undefined') return null;
    return document.getElementById('app') ?? document.body;
  }, [containerRef]);

  const getContent = useCallback((): HTMLElement | null => {
    if (contentRef?.current) return contentRef.current;
    if (typeof document === 'undefined') return null;
    return document.getElementById('content');
  }, [contentRef]);

  const showChrome = useCallback(() => {
    const container = getContainer();
    container?.classList.remove('chrome-hidden');
  }, [getContainer]);

  // Initialize minimalMode from Preferences on mount
  useEffect(() => {
    const initial = Boolean(Preferences.get('minimalMode'));
    setIsMinimal(initial);
    const container = getContainer();
    if (container && initial) {
      container.classList.add('minimal');
    }
  }, [getContainer]);

  const toggleMinimal = useCallback((force?: boolean) => {
    setIsMinimal((prev) => {
      const next = typeof force === 'boolean' ? force : !prev;
      Preferences.set('minimalMode', next);

      const container = getContainer();
      if (container) {
        container.classList.toggle('minimal', next);
        if (!next) {
          container.classList.remove('chrome-hidden');
        }
      }

      if (typeof document !== 'undefined' && !Announcer._el) {
        Announcer.init();
      }
      Announcer.say(
        next
          ? 'Immersion activée. Remontez pour revoir la barre, Échap pour quitter.'
          : 'Immersion désactivée'
      );

      return next;
    });
  }, [getContainer]);

  const onScroll = useCallback(
    (e?: React.UIEvent<HTMLElement> | Event) => {
      if (!isMinimal) return;

      const content = (e?.currentTarget as HTMLElement | null) ?? getContent();
      if (!content) return;

      const currentTop = content.scrollTop;
      const delta = currentTop - lastTopRef.current;
      lastTopRef.current = currentTop;

      if (Math.abs(delta) < 4) return;

      const panelOpen = Boolean(
        document.querySelector(
          '.settings-panel.visible, .search-bar.visible, #settingsPanel.visible, #searchBar.visible, [data-panel-open="true"]'
        )
      );

      const container = getContainer();
      if (!container) return;

      if (delta > 0 && currentTop > 80 && !panelOpen) {
        container.classList.add('chrome-hidden');
      } else if (delta < 0) {
        container.classList.remove('chrome-hidden');
      }
    },
    [isMinimal, getContent, getContainer]
  );

  // Attach mouse movement and toolbar focus listeners when in minimal mode
  useEffect(() => {
    if (!isMinimal || typeof window === 'undefined') return;

    const handleMouseMove = (e: MouseEvent) => {
      if (e.clientY < 64) {
        showChrome();
      }
    };

    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest('.toolbar')) {
        showChrome();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        toggleMinimal(false);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('focusin', handleFocusIn);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('focusin', handleFocusIn);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMinimal, showChrome, toggleMinimal]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      const container = getContainer();
      container?.classList.remove('chrome-hidden');
    };
  }, [getContainer]);

  return {
    isMinimal,
    toggleMinimal,
    showChrome,
    onScroll,
  };
}
