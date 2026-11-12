'use client';

import React, { useEffect, useRef } from 'react';
import { Icon } from './Icon';

export interface MoreMenuProps {
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  onOpenFile?: () => void;
  onEdit?: () => void;
  onPresent?: () => void;
  onImmersive?: () => void;
  onFocus?: () => void;
  onStats?: () => void;
  onPrint?: () => void;
  onFullscreen?: () => void;
  onShortcuts?: () => void;
  className?: string;
}

export function MoreMenu({
  isOpen,
  onToggle,
  onClose,
  onOpenFile,
  onEdit,
  onPresent,
  onImmersive,
  onFocus,
  onStats,
  onPrint,
  onFullscreen,
  onShortcuts,
  className = '',
}: MoreMenuProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  const handleAction = (callback?: () => void) => {
    onClose();
    callback?.();
  };

  return (
    <div ref={containerRef} className={`menu-anchor ${className}`.trim()}>
      <button
        id="moreBtn"
        type="button"
        className="tool-btn tool-btn-labelled"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-controls="moreMenu"
        title="Plus d'actions"
        onClick={onToggle}
      >
        <Icon>
          <circle cx="5" cy="12" r="1" />
          <circle cx="12" cy="12" r="1" />
          <circle cx="19" cy="12" r="1" />
        </Icon>
        <span className="tool-label">Plus</span>
      </button>

      <div
        id="moreMenu"
        className="menu"
        role="menu"
        aria-label="Plus d'actions"
        hidden={!isOpen}
      >
        <button
          id="newFileBtn"
          type="button"
          role="menuitem"
          onClick={() => handleAction(onOpenFile)}
        >
          Ouvrir un fichier<span className="menu-key">Ctrl O</span>
        </button>
        <button
          id="menuEdit"
          type="button"
          role="menuitem"
          className="only-narrow"
          onClick={() => handleAction(onEdit)}
        >
          Éditer<span className="menu-key">E</span>
        </button>
        <button
          id="menuPresent"
          type="button"
          role="menuitem"
          className="only-narrow"
          onClick={() => handleAction(onPresent)}
        >
          Présenter<span className="menu-key">P</span>
        </button>
        <button
          id="menuImmersive"
          type="button"
          role="menuitem"
          onClick={() => handleAction(onImmersive)}
        >
          Immersion<span className="menu-key">M</span>
        </button>
        <button
          id="menuFocus"
          type="button"
          role="menuitem"
          onClick={() => handleAction(onFocus)}
        >
          Concentration<span className="menu-key">F</span>
        </button>
        <hr />
        <button
          id="statsToggle"
          type="button"
          role="menuitem"
          onClick={() => handleAction(onStats)}
        >
          Statistiques<span className="menu-key">I</span>
        </button>
        <button
          id="printBtn"
          type="button"
          role="menuitem"
          onClick={() => handleAction(onPrint || (() => window.print()))}
        >
          Imprimer<span className="menu-key">Ctrl P</span>
        </button>
        <button
          id="fullscreenToggle"
          type="button"
          role="menuitem"
          onClick={() =>
            handleAction(
              onFullscreen ||
                (() => {
                  if (!document.fullscreenElement) {
                    document.documentElement.requestFullscreen().catch(() => {});
                  } else {
                    document.exitFullscreen().catch(() => {});
                  }
                })
            )
          }
        >
          Plein écran
        </button>
        <hr />
        <button
          id="shortcutsToggle"
          type="button"
          role="menuitem"
          onClick={() => handleAction(onShortcuts)}
        >
          Raccourcis clavier<span className="menu-key">?</span>
        </button>
      </div>
    </div>
  );
}

export default MoreMenu;
