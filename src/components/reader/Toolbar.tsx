'use client';

import React, { useState } from 'react';
import { Icon } from './Icon';
import { Breadcrumb } from './Breadcrumb';
import { MoreMenu } from './MoreMenu';

export type ReaderMode = 'read' | 'edit' | 'present';

export interface ToolbarProps {
  onHome?: () => void;
  docName?: string;
  isDirty?: boolean;
  activeHeading?: Element | null;
  headings?: Element[];
  breadcrumbParent?: string | null;
  breadcrumbCurrent?: string;
  onSectionClick?: () => void;
  readingRemaining?: string;
  mode?: ReaderMode;
  onModeChange?: (mode: ReaderMode) => void;
  isBookmarked?: boolean;
  onToggleBookmark?: () => void;
  isSidebarOpen?: boolean;
  onToggleSidebar?: () => void;
  isSearchOpen?: boolean;
  onToggleSearch?: () => void;
  isSettingsOpen?: boolean;
  onToggleSettings?: () => void;
  isMoreOpen?: boolean;
  onToggleMore?: () => void;
  onCloseMore?: () => void;
  onOpenFile?: () => void;
  onToggleImmersive?: () => void;
  onToggleFocus?: () => void;
  onToggleStats?: () => void;
  onPrint?: () => void;
  onToggleFullscreen?: () => void;
  onToggleShortcuts?: () => void;
  className?: string;
}

export function Toolbar({
  onHome,
  docName = '',
  isDirty = false,
  activeHeading = null,
  headings = [],
  breadcrumbParent,
  breadcrumbCurrent,
  onSectionClick,
  readingRemaining = '',
  mode = 'read',
  onModeChange,
  isBookmarked = false,
  onToggleBookmark,
  isSidebarOpen = false,
  onToggleSidebar,
  isSearchOpen = false,
  onToggleSearch,
  isSettingsOpen = false,
  onToggleSettings,
  isMoreOpen: propIsMoreOpen,
  onToggleMore,
  onCloseMore,
  onOpenFile,
  onToggleImmersive,
  onToggleFocus,
  onToggleStats,
  onPrint,
  onToggleFullscreen,
  onToggleShortcuts,
  className = '',
}: ToolbarProps) {
  const [internalMoreOpen, setInternalMoreOpen] = useState(false);
  const isMoreOpen = propIsMoreOpen ?? internalMoreOpen;

  const handleToggleMore = () => {
    if (onToggleMore) {
      onToggleMore();
    } else {
      setInternalMoreOpen((prev) => !prev);
    }
  };

  const handleCloseMore = () => {
    if (onCloseMore) {
      onCloseMore();
    } else {
      setInternalMoreOpen(false);
    }
  };

  const cleanHeading = activeHeading
    ? (activeHeading.textContent || '').replace(/^#\s*/, '').trim()
    : 'Début du document';

  return (
    <header className={`toolbar ${className}`.trim()} aria-label="Barre de lecture">
      <div className="toolbar-place">
        <button
          id="homeBtn"
          type="button"
          className="tool-btn tool-btn-labelled"
          title="Retour à l'accueil"
          onClick={onHome}
        >
          <Icon>
            <path d="M19 12H5" />
            <path d="m12 19-7-7 7-7" />
          </Icon>
          <span className="tool-label">Accueil</span>
        </button>
        <span id="docName" className={`doc-name ${isDirty ? 'is-dirty' : ''}`.trim()}>
          {docName}
        </span>
      </div>

      <div className="toolbar-status">
        <button
          id="sectionBtn"
          type="button"
          className="section-btn"
          title="Ouvrir le sommaire"
          onClick={onSectionClick}
          aria-label={
            activeHeading
              ? `Section en cours : ${cleanHeading}. Ouvrir le sommaire`
              : 'Début du document. Ouvrir le sommaire'
          }
        >
          <Breadcrumb
            activeHeading={activeHeading}
            headings={headings}
            parent={breadcrumbParent}
            current={breadcrumbCurrent}
          />
        </button>
        <span id="readingRemaining" className="reading-status" aria-live="off">
          {readingRemaining}
        </span>
      </div>

      <div className="mode-switch" role="group" aria-label="Mode">
        <button
          id="modeRead"
          type="button"
          data-mode="read"
          aria-pressed={mode === 'read'}
          onClick={() => onModeChange?.('read')}
        >
          Lire
        </button>
        <button
          id="editorToggle"
          type="button"
          data-mode="edit"
          aria-pressed={mode === 'edit'}
          title="Éditeur (E)"
          onClick={() => onModeChange?.('edit')}
        >
          Éditer
        </button>
        <button
          id="presentToggle"
          type="button"
          data-mode="present"
          aria-pressed={mode === 'present'}
          title="Présentation (P)"
          onClick={() => onModeChange?.('present')}
        >
          Présenter
        </button>
      </div>

      <button
        id="bookmarkToggle"
        type="button"
        className="tool-btn tool-bookmark"
        aria-pressed={isBookmarked}
        aria-label={isBookmarked ? 'Retirer ce signet' : 'Marquer cette position'}
        title="Marquer cette position (Ctrl+B)"
        onClick={onToggleBookmark}
      >
        <Icon>
          <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
        </Icon>
      </button>

      <div className="toolbar-actions">
        <button
          id="tocToggle"
          type="button"
          className="tool-btn tool-btn-labelled"
          aria-expanded={isSidebarOpen}
          aria-controls="sidebar"
          title="Sommaire (T)"
          onClick={onToggleSidebar}
        >
          <Icon>
            <path d="M8 6h13" />
            <path d="M8 12h13" />
            <path d="M8 18h13" />
            <path d="M3 6h.01" />
            <path d="M3 12h.01" />
            <path d="M3 18h.01" />
          </Icon>
          <span className="tool-label">Sommaire</span>
        </button>

        <button
          id="searchToggle"
          type="button"
          className="tool-btn tool-btn-labelled"
          aria-expanded={isSearchOpen}
          aria-controls="searchBar"
          title="Rechercher (Ctrl+F)"
          onClick={onToggleSearch}
        >
          <Icon>
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </Icon>
          <span className="tool-label">Rechercher</span>
        </button>

        <button
          id="settingsToggle"
          type="button"
          className="tool-btn tool-btn-labelled"
          aria-expanded={isSettingsOpen}
          aria-controls="settingsPanel"
          title="Confort de lecture (S)"
          onClick={onToggleSettings}
        >
          <span className="tool-glyph" aria-hidden="true">
            Aa
          </span>
          <span className="tool-label">Lecture</span>
        </button>

        <MoreMenu
          isOpen={isMoreOpen}
          onToggle={handleToggleMore}
          onClose={handleCloseMore}
          onOpenFile={onOpenFile}
          onEdit={() => onModeChange?.('edit')}
          onPresent={() => onModeChange?.('present')}
          onImmersive={onToggleImmersive}
          onFocus={onToggleFocus}
          onStats={onToggleStats}
          onPrint={onPrint}
          onFullscreen={onToggleFullscreen}
          onShortcuts={onToggleShortcuts}
        />
      </div>
    </header>
  );
}

export default Toolbar;
