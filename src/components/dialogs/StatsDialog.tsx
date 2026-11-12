'use client';

import React, { useMemo, useEffect, useRef } from 'react';
import { WORDS_PER_MINUTE } from '../../lib/constants';
import { trapFocus, releaseFocus } from '../../lib/utils';

export interface StatsDialogProps {
  isOpen: boolean;
  rawContent: string;
  onClose: () => void;
}

export function StatsDialog({ isOpen, rawContent, onClose }: StatsDialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const currentPanel = panelRef.current;
    if (currentPanel) {
      trapFocus(currentPanel);
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      if (currentPanel) {
        releaseFocus(currentPanel);
      }
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  const stats = useMemo(() => {
    const text = rawContent || '';
    const trimmed = text.trim();
    const words = trimmed ? trimmed.split(/\s+/).length : 0;
    const chars = text.length;
    const charsNoSpace = text.replace(/\s/g, '').length;
    const sentences = (text.match(/[.!?]+(\s|$)/g) || []).length;
    const paragraphs = text.split(/\n\s*\n/).filter((p) => p.trim()).length;
    const headings = (text.match(/^#{1,6}\s/gm) || []).length;
    const links = (text.match(/\[([^\]]+)\]\(/g) || []).length;
    const images = (text.match(/!\[/g) || []).length;
    const codeBlocks = (text.match(/^```/gm) || []).length / 2;
    const readTime = Math.ceil(words / WORDS_PER_MINUTE);
    const avgWordLen = charsNoSpace / Math.max(words, 1);
    const avgSentLen = words / Math.max(sentences, 1);
    const readability = Math.max(
      0,
      Math.min(100, 206.835 - 1.015 * avgSentLen - 84.6 * (avgWordLen / 5))
    );

    return {
      words,
      chars,
      charsNoSpace,
      sentences,
      paragraphs,
      headings,
      links,
      images,
      codeBlocks: Math.floor(codeBlocks),
      readTime,
      avgSentLen,
      readability,
    };
  }, [rawContent]);

  if (!isOpen) return null;

  return (
    <div
      ref={panelRef}
      id="statsPanel"
      className="stats-panel visible"
      role="dialog"
      aria-label="Statistiques"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="stats-inner">
        <h2>Statistiques du document</h2>
        <button
          type="button"
          className="stats-close"
          aria-label="Fermer"
          onClick={onClose}
        >
          &times;
        </button>

        <div className="stats-grid">
          <div className="stat-card">
            <span className="stat-value">{stats.words.toLocaleString('fr-FR')}</span>
            <span className="stat-label">Mots</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">{stats.chars.toLocaleString('fr-FR')}</span>
            <span className="stat-label">Caractères</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">{stats.sentences.toLocaleString('fr-FR')}</span>
            <span className="stat-label">Phrases</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">{stats.paragraphs.toLocaleString('fr-FR')}</span>
            <span className="stat-label">Paragraphes</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">{stats.headings.toLocaleString('fr-FR')}</span>
            <span className="stat-label">Titres</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">{stats.readTime} min</span>
            <span className="stat-label">Temps de lecture</span>
          </div>
        </div>

        <div className="stats-detail">
          <h3>Détails</h3>
          <div className="stats-detail-row">
            <span>Caractères (sans espaces)</span>
            <span>{stats.charsNoSpace.toLocaleString('fr-FR')}</span>
          </div>
          <div className="stats-detail-row">
            <span>Liens</span>
            <span>{stats.links.toLocaleString('fr-FR')}</span>
          </div>
          <div className="stats-detail-row">
            <span>Images</span>
            <span>{stats.images.toLocaleString('fr-FR')}</span>
          </div>
          <div className="stats-detail-row">
            <span>Blocs de code</span>
            <span>{stats.codeBlocks.toLocaleString('fr-FR')}</span>
          </div>
          <div className="stats-detail-row">
            <span>Longueur moyenne des phrases</span>
            <span>
              {stats.avgSentLen.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} mots
            </span>
          </div>
          <div className="stats-detail-row">
            <span>Lisibilité (Flesch)</span>
            <span>{stats.readability.toFixed(0)}/100</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default StatsDialog;

