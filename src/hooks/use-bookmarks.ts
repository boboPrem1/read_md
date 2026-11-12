'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Bookmark } from '../lib/storage/bookmarks';
import { loadBookmarks, saveBookmarks } from '../lib/storage/bookmarks';
import { Announcer, scrollBehavior, showToast } from '../lib/utils';

export type { Bookmark };

export interface UseBookmarksOptions {
  fileHash: string;
  contentRef: React.RefObject<HTMLElement | null>;
  activeHeadingText?: string;
}

export interface UseBookmarksResult {
  bookmarks: Bookmark[];
  isCurrentPositionBookmarked: boolean;
  toggleBookmark: () => void;
  removeBookmark: (id: number) => void;
  goToBookmark: (pos: number) => void;
}

export function useBookmarks(
  fileHashOrOptions: string | UseBookmarksOptions,
  contentRefArg?: React.RefObject<HTMLElement | null>,
  activeHeadingTextArg?: string
): UseBookmarksResult {
  const options: UseBookmarksOptions =
    typeof fileHashOrOptions === 'string'
      ? {
          fileHash: fileHashOrOptions,
          contentRef: contentRefArg!,
          activeHeadingText: activeHeadingTextArg,
        }
      : fileHashOrOptions;

  const { fileHash, contentRef, activeHeadingText } = options;

  const [bookmarks, setBookmarks] = useState<Bookmark[]>(() =>
    fileHash ? loadBookmarks(fileHash) : []
  );
  const [prevHash, setPrevHash] = useState(fileHash);

  // Sync bookmarks when fileHash changes (React recommended pattern for state derived from props)
  if (fileHash !== prevHash) {
    setPrevHash(fileHash);
    setBookmarks(fileHash ? loadBookmarks(fileHash) : []);
  }

  const [scrollFraction, setScrollFraction] = useState(0);

  const getScrollFraction = useCallback((): number => {
    const el = contentRef?.current;
    if (!el || el.scrollHeight <= el.clientHeight) return 0;
    return el.scrollTop / (el.scrollHeight - el.clientHeight);
  }, [contentRef]);

  // Listen to scroll on content element to update current fraction
  useEffect(() => {
    const el = contentRef?.current;
    if (!el) return;

    const onScroll = () => {
      setScrollFraction(getScrollFraction());
    };

    onScroll();
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      el.removeEventListener('scroll', onScroll);
    };
  }, [contentRef, getScrollFraction]);

  const isCurrentPositionBookmarked = useMemo(() => {
    return bookmarks.some((b) => Math.abs(b.pos - scrollFraction) < 0.01);
  }, [bookmarks, scrollFraction]);

  const removeBookmark = useCallback(
    (id: number) => {
      if (!fileHash) return;
      setBookmarks((prev) => {
        const removed = prev.find((b) => b.id === id);
        const next = prev.filter((b) => b.id !== id);
        saveBookmarks(fileHash, next);

        if (removed) {
          showToast('Signet retiré', {
            action: 'Annuler',
            onAction: () => {
              setBookmarks((current) => {
                if (current.some((b) => b.id === removed.id)) return current;
                const restored = [...current, removed];
                saveBookmarks(fileHash, restored);
                return restored;
              });
            },
          });
          Announcer.say('Signet retiré');
        }

        return next;
      });
    },
    [fileHash]
  );

  const toggleBookmark = useCallback(() => {
    if (!fileHash) return;
    const fraction = getScrollFraction();
    const existing = bookmarks.find((b) => Math.abs(b.pos - fraction) < 0.01);

    if (existing) {
      removeBookmark(existing.id);
      return;
    }

    const cleanHeading = activeHeadingText
      ? activeHeadingText.replace(/^#\s*/, '').trim()
      : '';
    const label = cleanHeading || 'Début du document';

    const newBookmark: Bookmark = {
      pos: fraction,
      label,
      id: Date.now(),
    };

    const next = [...bookmarks, newBookmark];
    setBookmarks(next);
    saveBookmarks(fileHash, next);
    showToast(`Signet ajouté : ${label}`);
    Announcer.say(`Signet ajouté : ${label}`);
  }, [fileHash, getScrollFraction, bookmarks, activeHeadingText, removeBookmark]);

  const goToBookmark = useCallback(
    (pos: number) => {
      const el = contentRef?.current;
      if (!el) return;
      el.scrollTo({
        top: pos * (el.scrollHeight - el.clientHeight),
        behavior: scrollBehavior(),
      });
    },
    [contentRef]
  );

  return {
    bookmarks,
    isCurrentPositionBookmarked,
    toggleBookmark,
    removeBookmark,
    goToBookmark,
  };
}
