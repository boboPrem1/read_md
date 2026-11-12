'use client';

import React, { useEffect, useRef } from 'react';
import { trapFocus, releaseFocus } from '../../lib/utils';

export interface ShortcutsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const SHORTCUTS: Array<{ key: string; description: string }> = [
  { key: 'T', description: 'Ouvrir ou fermer le sommaire' },
  { key: 'Ctrl + F', description: 'Rechercher dans le document' },
  { key: 'Ctrl + B', description: 'Marquer cette position' },
  { key: 'B', description: 'Revenir à la position précédente' },
  { key: 'S', description: 'Confort de lecture' },
  { key: '+ / -', description: 'Taille du texte' },
  { key: 'M', description: 'Immersion' },
  { key: 'F', description: 'Concentration' },
  { key: 'E', description: 'Éditer le document' },
  { key: 'P', description: 'Présenter le document' },
  { key: 'I', description: 'Statistiques' },
  { key: 'Début', description: 'Retour en haut' },
  { key: 'Ctrl + O', description: 'Ouvrir un fichier' },
  { key: 'Échap', description: 'Fermer ou quitter' },
  { key: '?', description: 'Cette aide' },
];

export function ShortcutsDialog({ isOpen, onClose }: ShortcutsDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const currentDialog = dialogRef.current;
    if (currentDialog) {
      trapFocus(currentDialog);
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      if (currentDialog) {
        releaseFocus(currentDialog);
      }
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={dialogRef}
      id="shortcutsHelp"
      className="shortcuts-help"
      role="dialog"
      aria-label="Raccourcis clavier"
      aria-modal="true"
      onClick={(e) => {
        if (
          e.target === e.currentTarget ||
          (e.target as HTMLElement).classList.contains('shortcuts-close')
        ) {
          onClose();
        }
      }}
    >
      <div className="shortcuts-inner">
        <h2>Raccourcis clavier</h2>
        <button
          type="button"
          className="shortcuts-close"
          aria-label="Fermer"
          onClick={onClose}
        >
          &times;
        </button>
        <dl>
          {SHORTCUTS.map((item) => (
            <React.Fragment key={item.key}>
              <dt>{item.key}</dt>
              <dd>{item.description}</dd>
            </React.Fragment>
          ))}
        </dl>
      </div>
    </div>
  );
}

export default ShortcutsDialog;

