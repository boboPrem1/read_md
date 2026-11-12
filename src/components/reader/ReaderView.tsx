'use client';

import React, { useRef, useState, useCallback, useMemo } from 'react';
import { Toolbar, type ReaderMode } from './Toolbar';
import { ProgressBar } from './ProgressBar';
import { SearchBar } from './SearchBar';
import { Sidebar, type SidebarTab } from './Sidebar';
import { ArticleContent } from './ArticleContent';
import { SettingsPanel } from './SettingsPanel';

import { useDocument, useDocumentDispatch } from '../../contexts/document-context';
import { useReadingProgress } from '../../hooks/use-reading-progress';
import { useSearch } from '../../hooks/use-search';
import { useBookmarks } from '../../hooks/use-bookmarks';
import { useImmersion } from '../../hooks/use-immersion';
import type { UseAnnotationsResult } from '../../hooks/use-annotations';

export interface ReaderViewProps {
  fileName?: string;
  fileHash?: string;
  rawContent?: string;
  dirty?: boolean;
  onHome?: () => void;
  onOpenFile?: () => void;
  onFileSelect?: (file: File) => void;
  mode?: ReaderMode;
  onModeChange?: (mode: ReaderMode) => void;
  onToggleFullscreen?: () => void;
  onToggleShortcuts?: () => void;
  onToggleStats?: () => void;
  onPrint?: () => void;
  className?: string;
}

export function ReaderView({
  fileName: propFileName,
  fileHash: propFileHash,
  rawContent: propRawContent,
  dirty: propDirty,
  onHome,
  onOpenFile,
  onFileSelect,
  mode: propMode,
  onModeChange,
  onToggleFullscreen,
  onToggleShortcuts,
  onToggleStats,
  onPrint,
  className = '',
}: ReaderViewProps) {
  // Try reading from DocumentContext if present
  let contextState = null;
  let contextDispatch = null;
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    contextState = useDocument();
    // eslint-disable-next-line react-hooks/rules-of-hooks
    contextDispatch = useDocumentDispatch();
  } catch {
    // Rendered outside DocumentProvider; fallback to local state / props
  }

  const fileName = propFileName ?? contextState?.fileName ?? '';
  const fileHash = propFileHash ?? contextState?.fileHash ?? '';
  const rawContent = propRawContent ?? contextState?.rawContent ?? '';
  const isDirty = propDirty ?? contextState?.dirty ?? false;

  // Refs for DOM nodes
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const contentRef = useRef<HTMLElement | null>(null);
  const articleRef = useRef<HTMLElement | null>(null);

  // Local UI states
  const [headings, setHeadings] = useState<Element[]>([]);
  const [activeHeadingId, setActiveHeadingId] = useState<string | null>(null);
  const [totalWords, setTotalWords] = useState<number>(0);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>('toc');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [currentMode, setCurrentMode] = useState<ReaderMode>('read');
  const [navHistory, setNavHistory] = useState<number[]>([]);
  const [annotationsResult, setAnnotationsResult] = useState<UseAnnotationsResult | null>(null);

  const activeMode = propMode ?? currentMode;

  const handleModeChange = (newMode: ReaderMode) => {
    setCurrentMode(newMode);
    onModeChange?.(newMode);
    if (contextDispatch) {
      if (newMode === 'edit') {
        contextDispatch({ type: 'TOGGLE_EDITOR' });
      } else if (newMode === 'present') {
        contextDispatch({ type: 'TOGGLE_PRESENTATION' });
      }
    }
  };

  // Immersion hook
  const immersion = useImmersion({ contentRef });

  // Reading progress hook
  const { progressPercent, remainingText, showBackToTop, scrollToTop } =
    useReadingProgress({
      contentRef,
      fileHash,
      totalWords,
    });

  // Search hook
  const search = useSearch({ articleRef });

  // Current active heading element
  const activeHeadingEl = useMemo(() => {
    return headings.find((h) => h.id === activeHeadingId) || null;
  }, [headings, activeHeadingId]);

  const activeHeadingText = activeHeadingEl
    ? (activeHeadingEl.textContent || '').replace(/^#\s*/, '').trim()
    : undefined;

  // Bookmarks hook
  const bookmarksManager = useBookmarks(fileHash, contentRef, activeHeadingText);

  // Navigation history tracking
  const rememberPosition = useCallback(() => {
    if (contentRef.current) {
      setNavHistory((prev) => [...prev, contentRef.current!.scrollTop]);
    }
  }, []);

  const handleNavBack = useCallback(() => {
    if (navHistory.length === 0 || !contentRef.current) return;
    const last = navHistory[navHistory.length - 1];
    setNavHistory((prev) => prev.slice(0, -1));
    contentRef.current.scrollTo({ top: last, behavior: 'smooth' });
  }, [navHistory]);

  // Headings extracted callback
  const handleHeadingsExtracted = useCallback(
    (extracted: Element[]) => {
      setHeadings(extracted);
      if (contextDispatch) {
        contextDispatch({ type: 'SET_HEADINGS', payload: extracted });
      }
    },
    [contextDispatch]
  );

  // Word count callback
  const handleTotalWordsCalculated = useCallback(
    (words: number) => {
      setTotalWords(words);
      if (contextDispatch) {
        contextDispatch({ type: 'SET_TOTAL_WORDS', payload: words });
      }
    },
    [contextDispatch]
  );

  // Scroll handler for sync active heading & immersion
  const handleScroll = (e: React.UIEvent<HTMLElement>) => {
    immersion.onScroll(e);

    const content = contentRef.current;
    if (!content || headings.length === 0) return;

    const line = content.getBoundingClientRect().top + content.clientHeight * 0.2;
    let current: Element | null = null;
    for (const h of headings) {
      if (h.getBoundingClientRect().top > line) break;
      current = h;
    }

    const newActiveId = current ? current.id : null;
    setActiveHeadingId(newActiveId);
    if (contextDispatch) {
      contextDispatch({ type: 'SET_ACTIVE_HEADING', payload: newActiveId });
    }
  };

  // Heading selection in ToC
  const handleSelectHeading = useCallback(
    (heading: Element) => {
      rememberPosition();
      heading.scrollIntoView({ behavior: 'smooth', block: 'start' });
      if (typeof window !== 'undefined' && window.innerWidth <= 900) {
        setSidebarOpen(false);
      }
    },
    [rememberPosition]
  );

  // Bookmark jump
  const handleGoToBookmark = useCallback(
    (pos: number) => {
      rememberPosition();
      const content = contentRef.current;
      if (content) {
        const maxScroll = content.scrollHeight - content.clientHeight;
        content.scrollTo({ top: pos * maxScroll, behavior: 'smooth' });
        if (typeof window !== 'undefined' && window.innerWidth <= 900) {
          setSidebarOpen(false);
        }
      }
    },
    [rememberPosition]
  );

  // Annotation jump
  const handleGoToAnnotation = useCallback(
    (id: number) => {
      rememberPosition();
      const el = articleRef.current?.querySelector(`[data-ann-id="${id}"]`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        if (typeof window !== 'undefined' && window.innerWidth <= 900) {
          setSidebarOpen(false);
        }
      }
    },
    [rememberPosition]
  );

  const handleOpenFileInput = () => {
    if (onOpenFile) {
      onOpenFile();
    } else {
      fileInputRef.current?.click();
    }
  };

  return (
    <div id="reader" className={`reader ${className}`.trim()}>
      <input
        ref={fileInputRef}
        type="file"
        id="newFileInput"
        className="hidden-input"
        tabIndex={-1}
        aria-hidden="true"
        accept=".md,.markdown,.mdown,.mkd,.mkdn,.mdwn,.mdtxt,.mdtext,.text,.txt"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            onFileSelect?.(file);
            e.target.value = '';
          }
        }}
      />

      {/* Toolbar */}
      <Toolbar
        onHome={onHome}
        docName={fileName}
        isDirty={isDirty}
        activeHeading={activeHeadingEl}
        headings={headings}
        onSectionClick={() => {
          setSidebarTab('toc');
          setSidebarOpen(true);
        }}
        readingRemaining={remainingText}
        mode={activeMode}
        onModeChange={handleModeChange}
        isBookmarked={bookmarksManager.isCurrentPositionBookmarked}
        onToggleBookmark={bookmarksManager.toggleBookmark}
        isSidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
        isSearchOpen={search.isOpen}
        onToggleSearch={() => {
          if (search.isOpen) {
            search.close();
          } else {
            search.open();
          }
        }}
        isSettingsOpen={settingsOpen}
        onToggleSettings={() => setSettingsOpen((prev) => !prev)}
        onOpenFile={handleOpenFileInput}
        onToggleImmersive={() => immersion.toggleMinimal()}
        onToggleFocus={() => {
          if (contextDispatch) {
            contextDispatch({ type: 'TOGGLE_FOCUS' });
          }
        }}
        onToggleStats={onToggleStats}
        onPrint={onPrint}
        onToggleFullscreen={onToggleFullscreen}
        onToggleShortcuts={onToggleShortcuts}
      />

      {/* Progress Bar */}
      <ProgressBar progressPercent={progressPercent} />

      {/* Search Bar */}
      <SearchBar search={search} />

      {/* Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        headings={headings}
        activeHeadingId={activeHeadingId}
        onSelectHeading={handleSelectHeading}
        bookmarks={bookmarksManager.bookmarks}
        onGoToBookmark={handleGoToBookmark}
        onRemoveBookmark={bookmarksManager.removeBookmark}
        annotations={annotationsResult?.annotations ?? []}
        onGoToAnnotation={handleGoToAnnotation}
        onRemoveAnnotation={annotationsResult?.removeAnnotation}
        activeTab={sidebarTab}
        onTabChange={setSidebarTab}
      />

      {/* Reader Stage */}
      <div className="reader-stage">
        <ArticleContent
          rawContent={rawContent}
          fileHash={fileHash}
          contentRef={contentRef}
          articleRef={articleRef}
          onHeadingsExtracted={handleHeadingsExtracted}
          onTotalWordsCalculated={handleTotalWordsCalculated}
          canNavBack={navHistory.length > 0}
          onNavBack={handleNavBack}
          onScrollToTop={scrollToTop}
          showBackToTop={showBackToTop}
          onScroll={handleScroll}
          onAnnotationsReady={setAnnotationsResult}
        />
      </div>

      {/* Settings Panel */}
      <SettingsPanel
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </div>
  );
}

export default ReaderView;
