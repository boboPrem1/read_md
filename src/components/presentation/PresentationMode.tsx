'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { renderMarkdown, type MathBlock } from '../../lib/markdown/engine';
import { postProcess } from '../../lib/markdown/post-process';
import { Announcer } from '../../lib/utils';

export interface PresentationModeProps {
  isOpen: boolean;
  rawContent: string;
  onClose: () => void;
}

interface SlideData {
  html: string;
  mathBlocks: MathBlock[];
}

export function PresentationMode({ isOpen, rawContent, onClose }: PresentationModeProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const slideRef = useRef<HTMLDivElement | null>(null);
  const exitBtnRef = useRef<HTMLButtonElement | null>(null);

  // Split markdown into slides by `## ` headings
  const slides = useMemo<SlideData[]>(() => {
    if (!rawContent) return [];
    const sections = rawContent.split(/^(?=## )/m);
    return sections
      .filter((s) => s.trim().length > 0)
      .map((section) => {
        const { html, mathBlocks } = renderMarkdown(section);
        return { html, mathBlocks };
      });
  }, [rawContent]);

  const totalSlides = slides.length;

  // Reset slide index when opening
  useEffect(() => {
    if (isOpen) {
      setCurrentSlide(0);
      Announcer.say('Mode présentation. Flèches pour naviguer, Échap pour quitter.');
      // Give DOM time to render before focusing
      const timer = setTimeout(() => {
        exitBtnRef.current?.focus();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const handleNext = useCallback(() => {
    setCurrentSlide((prev) => (prev < totalSlides - 1 ? prev + 1 : prev));
  }, [totalSlides]);

  const handlePrev = useCallback(() => {
    setCurrentSlide((prev) => (prev > 0 ? prev - 1 : prev));
  }, []);

  // Post-process the active slide and reset scroll position
  useEffect(() => {
    if (isOpen && slideRef.current && slides[currentSlide]) {
      postProcess(slideRef.current, slides[currentSlide].mathBlocks);
    }
    if (contentRef.current) {
      contentRef.current.scrollTop = 0;
    }
  }, [isOpen, currentSlide, slides]);

  // Keyboard navigation for presentation mode
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      } else if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') {
        e.preventDefault();
        e.stopPropagation();
        handleNext();
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        e.stopPropagation();
        handlePrev();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleNext, handlePrev, onClose]);

  if (!isOpen) {
    return null;
  }

  const currentSlideData = slides[currentSlide];
  const progressPercent = totalSlides > 0 ? ((currentSlide + 1) / totalSlides) * 100 : 0;

  return (
    <div
      id="presentationMode"
      className="presentation active"
      role="dialog"
      aria-label="Mode présentation"
    >
      <div className="presentation-toolbar">
        <button
          ref={exitBtnRef}
          id="presentExit"
          type="button"
          onClick={onClose}
        >
          Quitter (Échap)
        </button>
        <span className="slide-counter">
          {totalSlides > 0 ? `${currentSlide + 1} / ${totalSlides}` : '0 / 0'}
        </span>
        <div>
          <button
            id="presentPrev"
            type="button"
            onClick={handlePrev}
            disabled={currentSlide === 0}
          >
            &larr; Précédent
          </button>
          <button
            id="presentNext"
            type="button"
            onClick={handleNext}
            disabled={currentSlide >= totalSlides - 1}
          >
            Suivant &rarr;
          </button>
        </div>
      </div>

      <div className="presentation-progress">
        <div
          className="presentation-progress-fill"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <div className="presentation-content" ref={contentRef}>
        {currentSlideData ? (
          <div
            ref={slideRef}
            className="slide markdown-body"
            dangerouslySetInnerHTML={{ __html: currentSlideData.html }}
          />
        ) : (
          <div className="slide markdown-body">
            <p>Aucun contenu à afficher.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default PresentationMode;
