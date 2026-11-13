'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Icon } from './Icon';
import type { Bookmark } from '../../lib/storage/bookmarks';
import type { Annotation } from '../../lib/storage/annotations';
import { ANNOTATION_COLORS } from '../../hooks/use-annotations';

export type SidebarTab = 'toc' | 'bookmarks' | 'notes';

export interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  headings?: Element[];
  activeHeadingId?: string | null;
  onSelectHeading?: (heading: Element) => void;
  bookmarks?: Bookmark[];
  onGoToBookmark?: (pos: number) => void;
  onRemoveBookmark?: (id: number) => void;
  annotations?: Annotation[];
  onGoToAnnotation?: (id: number) => void;
  onRemoveAnnotation?: (id: number) => void;
  activeTab?: SidebarTab;
  onTabChange?: (tab: SidebarTab) => void;
  className?: string;
}

export function Sidebar({
  isOpen,
  onClose,
  headings = [],
  activeHeadingId = null,
  onSelectHeading,
  bookmarks = [],
  onGoToBookmark,
  onRemoveBookmark,
  annotations = [],
  onGoToAnnotation,
  onRemoveAnnotation,
  activeTab: propActiveTab,
  onTabChange,
  className = '',
}: SidebarProps) {
  const [internalTab, setInternalTab] = useState<SidebarTab>('toc');
  const activeTab = propActiveTab ?? internalTab;
  const tocContainerRef = useRef<HTMLDivElement | null>(null);

  const handleTabChange = (tab: SidebarTab) => {
    if (onTabChange) {
      onTabChange(tab);
    } else {
      setInternalTab(tab);
    }
  };

  // Filter headings to h1, h2, h3
  const tocHeadings = headings.filter((h) => {
    const level = parseInt(h.tagName[1], 10);
    return !isNaN(level) && level >= 1 && level <= 3;
  });

  // Auto-scroll active ToC item into view
  useEffect(() => {
    if (activeTab === 'toc' && isOpen && activeHeadingId && tocContainerRef.current) {
      const activeEl = tocContainerRef.current.querySelector<HTMLElement>('.toc-item.active');
      if (activeEl) {
        const itemTop = activeEl.offsetTop;
        const itemH = activeEl.offsetHeight;
        const scrollTop = tocContainerRef.current.scrollTop;
        const viewH = tocContainerRef.current.clientHeight;

        if (itemTop < scrollTop || itemTop + itemH > scrollTop + viewH) {
          tocContainerRef.current.scrollTo({
            top: itemTop - viewH / 3,
            behavior: 'smooth',
          });
        }
      }
    }
  }, [activeHeadingId, activeTab, isOpen]);

  return (
    <>
      <nav
        id="sidebar"
        className={`sidebar ${isOpen ? 'mobile-open' : 'collapsed'} ${className}`.trim()}
        aria-label="Navigation du document"
      >
        <div className="sidebar-header">
          <div className="sidebar-tabs" role="tablist" aria-label="Contenu du panneau">
            <button
              id="tabToc"
              type="button"
              role="tab"
              aria-selected={activeTab === 'toc'}
              aria-controls="tocContent"
              data-panel="tocContent"
              tabIndex={activeTab === 'toc' ? 0 : -1}
              onClick={() => handleTabChange('toc')}
            >
              Sommaire
            </button>
            <button
              id="tabBookmarks"
              type="button"
              role="tab"
              aria-selected={activeTab === 'bookmarks'}
              aria-controls="bookmarksPanel"
              data-panel="bookmarksPanel"
              tabIndex={activeTab === 'bookmarks' ? 0 : -1}
              onClick={() => handleTabChange('bookmarks')}
            >
              Signets{' '}
              <span id="bookmarksCount" className="tab-count">
                {bookmarks.length > 0 ? bookmarks.length : ''}
              </span>
            </button>
            <button
              id="tabNotes"
              type="button"
              role="tab"
              aria-selected={activeTab === 'notes'}
              aria-controls="annotationsPanel"
              data-panel="annotationsPanel"
              tabIndex={activeTab === 'notes' ? 0 : -1}
              onClick={() => handleTabChange('notes')}
            >
              Notes{' '}
              <span id="annotationsCount" className="tab-count">
                {annotations.length > 0 ? annotations.length : ''}
              </span>
            </button>
          </div>
          <button
            id="sidebarClose"
            type="button"
            className="tool-btn sidebar-close"
            aria-label="Fermer le panneau"
            onClick={onClose}
          >
            <Icon>
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </Icon>
          </button>
        </div>

        {/* ToC Tab */}
        <div
          ref={tocContainerRef}
          className="sidebar-content"
          id="tocContent"
          role="tabpanel"
          aria-labelledby="tabToc"
          hidden={activeTab !== 'toc'}
        >
          {tocHeadings.length === 0 ? (
            <p className="panel-empty">
              <strong>Aucun titre</strong> dans ce document.
            </p>
          ) : (
            tocHeadings.map((h, index) => {
              const level = parseInt(h.tagName[1], 10) || 1;
              const label = (h.textContent || '').replace(/^#\s*/, '').trim();
              const isActive = activeHeadingId === h.id;

              return (
                <a
                  key={h.id || index}
                  href={`#${h.id}`}
                  className={`toc-item toc-h${level} ${isActive ? 'active' : ''}`.trim()}
                  aria-current={isActive ? 'location' : undefined}
                  title={label}
                  onClick={(e) => {
                    e.preventDefault();
                    if (onSelectHeading) {
                      onSelectHeading(h);
                    } else {
                      h.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                  }}
                >
                  {label}
                </a>
              );
            })
          )}
        </div>

        {/* Bookmarks Tab */}
        <div
          className="sidebar-content"
          id="bookmarksPanel"
          role="tabpanel"
          aria-labelledby="tabBookmarks"
          hidden={activeTab !== 'bookmarks'}
        >
          {bookmarks.length === 0 ? (
            <p className="panel-empty">
              <strong>Aucun signet.</strong> Utilisez l&apos;icône de signet dans la barre, ou
              Ctrl+B, pour marquer votre position.
            </p>
          ) : (
            <ul className="panel-list">
              {[...bookmarks]
                .sort((a, b) => a.pos - b.pos)
                .map((b) => (
                  <li key={b.id} className="panel-item">
                    <button
                      type="button"
                      className="panel-go"
                      data-pos={b.pos}
                      onClick={() => onGoToBookmark?.(b.pos)}
                    >
                      <span className="panel-go-text">{b.label}</span>
                      <span className="panel-go-meta">
                        {Math.round(b.pos * 100)} % du document
                      </span>
                    </button>
                    <button
                      type="button"
                      className="panel-remove"
                      data-id={b.id}
                      aria-label={`Retirer le signet ${b.label}`}
                      title="Retirer"
                      onClick={() => onRemoveBookmark?.(b.id)}
                    >
                      &times;
                    </button>
                  </li>
                ))}
            </ul>
          )}
        </div>

        {/* Notes (Annotations) Tab */}
        <div
          className="sidebar-content"
          id="annotationsPanel"
          role="tabpanel"
          aria-labelledby="tabNotes"
          hidden={activeTab !== 'notes'}
        >
          {annotations.length === 0 ? (
            <p className="panel-empty">
              <strong>Aucune note.</strong> Sélectionnez du texte dans le document pour le
              surligner ou l&apos;annoter.
            </p>
          ) : (
            <ul className="panel-list">
              {annotations.map((a) => {
                const colorConfig =
                  ANNOTATION_COLORS[a.color as keyof typeof ANNOTATION_COLORS];
                const colorVal = colorConfig?.value || '#facc15';

                return (
                  <li key={a.id} className="panel-item">
                    <button
                      type="button"
                      className="panel-go"
                      data-id={a.id}
                      style={{ borderLeftColor: colorVal }}
                      onClick={() => onGoToAnnotation?.(a.id)}
                    >
                      <span className="panel-go-text">{a.text}</span>
                      {a.note && <span className="panel-go-meta">{a.note}</span>}
                    </button>
                    <button
                      type="button"
                      className="panel-remove"
                      data-id={a.id}
                      aria-label="Retirer ce surlignage"
                      title="Retirer"
                      onClick={() => onRemoveAnnotation?.(a.id)}
                    >
                      &times;
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </nav>

      <div
        id="sidebarOverlay"
        className={`sidebar-overlay ${isOpen ? '' : 'hidden'}`.trim()}
        onClick={onClose}
        aria-hidden={!isOpen}
      />
    </>
  );
}

export default Sidebar;
