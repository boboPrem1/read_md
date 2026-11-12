'use client';

import React, { useEffect, useRef } from 'react';
import { trapFocus, releaseFocus } from '../../lib/utils';

export interface LightboxProps {
  src: string | null;
  alt?: string;
  onClose: () => void;
}

export function Lightbox({ src, alt = '', onClose }: LightboxProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!src) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

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
      document.body.style.overflow = prevOverflow;
      if (currentDialog) {
        releaseFocus(currentDialog);
      }
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [src, onClose]);

  if (!src) return null;

  return (
    <div
      ref={dialogRef}
      id="lightbox"
      className="lightbox"
      role="dialog"
      aria-label="Image agrandie"
      aria-modal="true"
      onClick={(e) => {
        if (
          e.target === e.currentTarget ||
          (e.target as HTMLElement).classList.contains('lightbox-close')
        ) {
          onClose();
        }
      }}
    >
      <button
        type="button"
        className="lightbox-close"
        aria-label="Fermer"
        onClick={onClose}
      >
        &times;
      </button>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img id="lightboxImg" src={src} alt={alt} />
    </div>
  );
}

export default Lightbox;

