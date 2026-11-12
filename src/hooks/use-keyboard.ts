'use client';

import { useEffect, useRef } from 'react';

export interface KeyboardHandlers {
  // Global modifier shortcuts (Ctrl/Cmd)
  onOpenFile?: () => void;
  onOpenSearch?: () => void;
  onNextSearch?: () => void;
  onPrevSearch?: () => void;
  onToggleBookmark?: () => void;

  // Single-key shortcuts
  onEscape?: (e: KeyboardEvent) => void;
  onToggleSidebar?: () => void;
  onToggleSettings?: () => void;
  onToggleMinimal?: () => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onScrollToTop?: () => void;
  onToggleFocus?: () => void;
  onNavigateBack?: () => void;
  onToggleStats?: () => void;
  onToggleEditor?: () => void;
  onTogglePresentation?: () => void;
  onToggleShortcuts?: () => void;

  // Presentation-specific shortcuts
  onPresentationNext?: () => void;
  onPresentationPrev?: () => void;
  onPresentationExit?: () => void;
}

export interface UseKeyboardOptions extends KeyboardHandlers {
  enabled?: boolean;
  isPresentation?: boolean;
}

export function useKeyboard(
  handlersOrOptions: KeyboardHandlers | UseKeyboardOptions,
  extraOptions?: { enabled?: boolean; isPresentation?: boolean }
): void {
  const handlersRef = useRef<UseKeyboardOptions>({
    ...handlersOrOptions,
    ...extraOptions,
  });

  useEffect(() => {
    handlersRef.current = {
      ...handlersOrOptions,
      ...extraOptions,
    };
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const options = handlersRef.current;
      if (options.enabled === false) return;

      // Handle presentation mode separately if active
      if (options.isPresentation) {
        if (e.key === 'Escape') {
          e.preventDefault();
          if (options.onPresentationExit) {
            options.onPresentationExit();
          } else if (options.onEscape) {
            options.onEscape(e);
          }
          return;
        }
        if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') {
          e.preventDefault();
          options.onPresentationNext?.();
          return;
        }
        if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
          e.preventDefault();
          options.onPresentationPrev?.();
          return;
        }
        return;
      }

      // Check whether an editable field has focus
      const target = e.target;
      const isEditable =
        target instanceof HTMLElement &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable);

      if (isEditable) {
        if (e.key === 'Escape') {
          options.onEscape?.(e);
        }
        return;
      }

      // Ctrl or Meta (Command on Mac) shortcuts
      if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
          case 'o':
            if (options.onOpenFile) {
              e.preventDefault();
              options.onOpenFile();
            }
            break;
          case 'f':
            if (options.onOpenSearch) {
              e.preventDefault();
              options.onOpenSearch();
            }
            break;
          case 'g':
            e.preventDefault();
            if (e.shiftKey) {
              options.onPrevSearch?.();
            } else {
              options.onNextSearch?.();
            }
            break;
          case 'b':
            if (options.onToggleBookmark) {
              e.preventDefault();
              options.onToggleBookmark();
            }
            break;
        }
        return;
      }

      // Single-letter and navigation shortcuts: ignore if Alt is pressed
      if (e.altKey) return;

      switch (e.key) {
        case 'Escape':
          options.onEscape?.(e);
          break;
        case 't':
        case 'T':
          options.onToggleSidebar?.();
          break;
        case 's':
        case 'S':
          options.onToggleSettings?.();
          break;
        case 'm':
        case 'M':
          options.onToggleMinimal?.();
          break;
        case '+':
        case '=':
          e.preventDefault();
          options.onZoomIn?.();
          break;
        case '-':
          e.preventDefault();
          options.onZoomOut?.();
          break;
        case 'Home':
          e.preventDefault();
          options.onScrollToTop?.();
          break;
        case 'f':
        case 'F':
          options.onToggleFocus?.();
          break;
        case 'b':
        case 'B':
          options.onNavigateBack?.();
          break;
        case 'i':
        case 'I':
          options.onToggleStats?.();
          break;
        case 'e':
        case 'E':
          options.onToggleEditor?.();
          break;
        case 'p':
        case 'P':
          options.onTogglePresentation?.();
          break;
        case '?':
          options.onToggleShortcuts?.();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);
}
