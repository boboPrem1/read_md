'use client';

import React, { useRef, useState, useCallback, useMemo, useEffect } from 'react';
import { Toolbar, type ReaderMode } from './Toolbar';
import { ProgressBar } from './ProgressBar';
import { SearchBar } from './SearchBar';
import { Sidebar, type SidebarTab } from './Sidebar';
import { ArticleContent } from './ArticleContent';
import { SettingsPanel } from './SettingsPanel';
import { EditorPane } from '../editor/EditorPane';
import { PresentationMode } from '../presentation/PresentationMode';
import { Lightbox } from '../dialogs/Lightbox';
import { StatsDialog } from '../dialogs/StatsDialog';
import { ShortcutsDialog } from '../dialogs/ShortcutsDialog';

import { useDocument } from '../../contexts/document-context';
import { useReadingProgress } from '../../hooks/use-reading-progress';
import { useSearch } from '../../hooks/use-search';
import { useBookmarks } from '../../hooks/use-bookmarks';
import { useImmersion } from '../../hooks/use-immersion';
import { useFocusMode } from '../../hooks/use-focus-mode';
import { usePreferences } from '../../hooks/use-preferences';
import { useKeyboard } from '../../hooks/use-keyboard';
import { pickMarkdownFile } from '../../lib/pick-markdown-file';
import type { Annotation } from '../../lib/storage/annotations';

export interface ReaderViewProps {
  fileName?: string;
  fileHash?: string;
  rawContent?: string;
  dirty?: boolean;
  onHome?: () => void;
  onOpenFile?: () => void;
  onFileSelect?: (file: File, handle?: FileSystemFileHandle | null) => void;
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
  const documentState = useDocument();

  const fileName = propFileName ?? documentState.fileName;
  const fileHash = propFileHash ?? documentState.fileHash;
  const rawContent = propRawContent ?? documentState.rawContent;
  const isDirty = propDirty ?? documentState.dirty;

  const contentRef = useRef<HTMLElement | null>(null);
  const articleRef = useRef<HTMLElement | null>(null);

  const [headings, setHeadings] = useState<Element[]>([]);
  const [activeHeadingId, setActiveHeadingId] = useState<string | null>(null);
  const [totalWords, setTotalWords] = useState<number>(0);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>('toc');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [currentMode, setCurrentMode] = useState<ReaderMode>('read');
  const [navHistory, setNavHistory] = useState<number[]>([]);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const removeAnnotationRef = useRef<((id: number, silent?: boolean) => void) | null>(null);
  const [statsOpen, setStatsOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [lightbox, setLightbox] = useState<{ src: string; alt: string } | null>(null);

  const activeMode = propMode ?? currentMode;

  const setMode = useCallback(
    (mode: ReaderMode) => {
      setCurrentMode(mode);
      onModeChange?.(mode);
    },
    [onModeChange]
  );

  const immersion = useImmersion({ contentRef });
  const focus = useFocusMode();
  const prefs = usePreferences();

  const { progressPercent, remainingText, showBackToTop, scrollToTop } = useReadingProgress({
    contentRef,
    fileHash,
    totalWords,
  });

  const search = useSearch({ articleRef });
  const clearSearch = search.clear;

  useEffect(() => {
    clearSearch();
  }, [rawContent, clearSearch]);

  const activeHeadingEl = useMemo(() => {
    return headings.find((h) => h.id === activeHeadingId) || null;
  }, [headings, activeHeadingId]);

  const activeHeadingText = activeHeadingEl
    ? (activeHeadingEl.textContent || '').replace(/^#\s*/, '').trim()
    : undefined;

  const bookmarksManager = useBookmarks(fileHash, contentRef, activeHeadingText);

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

  const handleImageClick = useCallback((src: string, alt: string) => {
    setLightbox({ src, alt });
  }, []);

  const handleHeadingsExtracted = useCallback((extracted: Element[]) => {
    setHeadings((prev) => {
      if (prev.length === extracted.length && prev.every((heading, index) => heading === extracted[index])) {
        return prev;
      }
      return extracted;
    });
  }, []);

  const handleTotalWordsCalculated = useCallback((words: number) => {
    setTotalWords(words);
  }, []);

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

    setActiveHeadingId(current ? current.id : null);
  };

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

  const handleAnnotationsChange = useCallback((
    next: Annotation[],
    remove: (id: number, silent?: boolean) => void,
  ) => {
    removeAnnotationRef.current = remove;
    setAnnotations(next);
  }, []);

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
      return;
    }
    void pickMarkdownFile().then((picked) => {
      if (picked) onFileSelect?.(picked.file, picked.handle);
    });
  };

  const download = useCallback(() => {
    const blob = new Blob([rawContent], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName || 'document.md';
    a.click();
    URL.revokeObjectURL(url);
    documentState.markClean();
  }, [rawContent, fileName, documentState]);

  const toggleFullscreen = useCallback(() => {
    if (onToggleFullscreen) {
      onToggleFullscreen();
      return;
    }
    if (!document.fullscreenElement) {
      void document.documentElement.requestFullscreen();
    } else {
      void document.exitFullscreen();
    }
  }, [onToggleFullscreen]);

  useKeyboard({
    enabled: activeMode !== 'present',
    onOpenFile: handleOpenFileInput,
    onOpenSearch: () => search.open(),
    onNextSearch: () => search.next(),
    onPrevSearch: () => search.prev(),
    onToggleBookmark: () => bookmarksManager.toggleBookmark(),
    onToggleSidebar: () => setSidebarOpen((open) => !open),
    onToggleSettings: () => setSettingsOpen((open) => !open),
    onToggleMinimal: () => immersion.toggleMinimal(),
    onZoomIn: () => prefs.stepFontSize(1),
    onZoomOut: () => prefs.stepFontSize(-1),
    onScrollToTop: scrollToTop,
    onToggleFocus: () => focus.toggleFocusMode(),
    onNavigateBack: handleNavBack,
    onToggleStats: () => {
      if (onToggleStats) onToggleStats();
      else setStatsOpen((open) => !open);
    },
    onToggleEditor: () => setMode(activeMode === 'edit' ? 'read' : 'edit'),
    onTogglePresentation: () => setMode(activeMode === 'present' ? 'read' : 'present'),
    onToggleShortcuts: () => {
      if (onToggleShortcuts) onToggleShortcuts();
      else setShortcutsOpen((open) => !open);
    },
    onEscape: (e) => {
      if (lightbox) {
        setLightbox(null);
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      if (shortcutsOpen) {
        setShortcutsOpen(false);
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      if (statsOpen) {
        setStatsOpen(false);
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      if (search.isOpen) {
        search.close();
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      if (settingsOpen) {
        setSettingsOpen(false);
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      if (activeMode === 'edit') {
        setMode('read');
        e.preventDefault();
        e.stopPropagation();
      }
    },
  });

  return (
    <div id="reader" className={`reader ${activeMode === 'edit' ? 'split-layout' : ''} ${className}`.trim()}>
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
        onModeChange={setMode}
        isBookmarked={bookmarksManager.isCurrentPositionBookmarked}
        onToggleBookmark={bookmarksManager.toggleBookmark}
        isSidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
        isSearchOpen={search.isOpen}
        onToggleSearch={() => {
          if (search.isOpen) search.close();
          else search.open();
        }}
        isSettingsOpen={settingsOpen}
        onToggleSettings={() => setSettingsOpen((prev) => !prev)}
        onOpenFile={handleOpenFileInput}
        onToggleImmersive={() => immersion.toggleMinimal()}
        onToggleFocus={() => focus.toggleFocusMode()}
        onToggleStats={onToggleStats ?? (() => setStatsOpen((open) => !open))}
        onPrint={onPrint ?? (() => window.print())}
        onToggleFullscreen={toggleFullscreen}
        onToggleShortcuts={onToggleShortcuts ?? (() => setShortcutsOpen((open) => !open))}
      />

      <ProgressBar progressPercent={progressPercent} />

      <SearchBar search={search} />

      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        headings={headings}
        activeHeadingId={activeHeadingId}
        onSelectHeading={handleSelectHeading}
        bookmarks={bookmarksManager.bookmarks}
        onGoToBookmark={handleGoToBookmark}
        onRemoveBookmark={bookmarksManager.removeBookmark}
        annotations={annotations}
        onGoToAnnotation={handleGoToAnnotation}
        onRemoveAnnotation={(id) => removeAnnotationRef.current?.(id)}
        activeTab={sidebarTab}
        onTabChange={setSidebarTab}
      />

      <div className="reader-stage">
        {activeMode === 'edit' ? (
          <EditorPane rawContent={rawContent} onChange={documentState.updateContent} onDownload={download} />
        ) : null}
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
          onImageClick={handleImageClick}
          onAnchorClick={rememberPosition}
          onScroll={handleScroll}
          onAnnotationsChange={handleAnnotationsChange}
        />
      </div>

      <SettingsPanel
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        theme={prefs.theme}
        onThemeChange={prefs.setTheme}
        fontSize={prefs.fontSize}
        onStepFontSize={prefs.stepFontSize}
        contentWidth={prefs.contentWidth}
        onContentWidthChange={prefs.setContentWidth}
        lineHeight={prefs.lineHeight}
        onLineHeightChange={prefs.setLineHeight}
        fontFamily={prefs.fontFamily}
        onFontFamilyChange={prefs.setFontFamily}
        isMinimal={immersion.isMinimal}
        onToggleMinimal={immersion.toggleMinimal}
        isFocusMode={focus.isFocusMode}
        onToggleFocusMode={focus.toggleFocusMode}
        onResetPreferences={prefs.resetPreferences}
      />

      <PresentationMode
        isOpen={activeMode === 'present'}
        rawContent={rawContent}
        onClose={() => setMode('read')}
      />
      <Lightbox src={lightbox?.src ?? null} alt={lightbox?.alt ?? ''} onClose={() => setLightbox(null)} />
      <StatsDialog isOpen={statsOpen} rawContent={rawContent} onClose={() => setStatsOpen(false)} />
      <ShortcutsDialog isOpen={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
    </div>
  );
}

export default ReaderView;
