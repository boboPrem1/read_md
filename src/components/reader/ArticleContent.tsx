'use client';

import React, { useEffect, useMemo, useRef } from 'react';
import { Icon } from './Icon';
import { renderMarkdown } from '../../lib/markdown/engine';
import { postProcess } from '../../lib/markdown/post-process';
import { useAnnotations } from '../../hooks/use-annotations';
import type { Annotation } from '../../lib/storage/annotations';

export interface ArticleContentProps {
  rawContent: string;
  fileHash?: string;
  contentRef?: React.RefObject<HTMLElement | null>;
  articleRef?: React.RefObject<HTMLElement | null>;
  onHeadingsExtracted?: (headings: Element[]) => void;
  onTotalWordsCalculated?: (words: number) => void;
  canNavBack?: boolean;
  onNavBack?: () => void;
  onScrollToTop?: () => void;
  showBackToTop?: boolean;
  onImageClick?: (src: string, alt: string) => void;
  onAnchorClick?: () => void;
  onScroll?: (e: React.UIEvent<HTMLElement>) => void;
  onAnnotationsChange?: (
    annotations: Annotation[],
    removeAnnotation: (id: number, silent?: boolean) => void,
  ) => void;
  className?: string;
}

export function ArticleContent({
  rawContent,
  fileHash = '',
  contentRef,
  articleRef: externalArticleRef,
  onHeadingsExtracted,
  onTotalWordsCalculated,
  canNavBack = false,
  onNavBack,
  onScrollToTop,
  showBackToTop = false,
  onImageClick,
  onAnchorClick,
  onScroll,
  onAnnotationsChange,
  className = '',
}: ArticleContentProps) {
  const internalContentRef = useRef<HTMLElement | null>(null);
  const internalArticleRef = useRef<HTMLElement | null>(null);

  const activeContentRef = contentRef || internalContentRef;
  const activeArticleRef = externalArticleRef || internalArticleRef;

  // Render markdown with math blocks and frontmatter extraction
  const rendered = useMemo(() => {
    return renderMarkdown(rawContent || '');
  }, [rawContent]);

  // Hook up annotations on the article
  const annotationsResult = useAnnotations({
    fileHash,
    articleRef: activeArticleRef,
  });
  const { annotations, removeAnnotation, applyAnnotations } = annotationsResult;
  const onAnchorClickRef = useRef(onAnchorClick);
  const onImageClickRef = useRef(onImageClick);
  const onHeadingsRef = useRef(onHeadingsExtracted);
  const onWordsRef = useRef(onTotalWordsCalculated);

  useEffect(() => {
    onAnchorClickRef.current = onAnchorClick;
    onImageClickRef.current = onImageClick;
    onHeadingsRef.current = onHeadingsExtracted;
    onWordsRef.current = onTotalWordsCalculated;
  });

  useEffect(() => {
    onAnnotationsChange?.(annotations, removeAnnotation);
  }, [annotations, removeAnnotation, onAnnotationsChange]);

  // Post process markdown HTML (katex, mermaid, prism/hljs, anchors, copy buttons, etc.)
  useEffect(() => {
    const articleEl = document.getElementById('article');
    if (!articleEl) return;

    postProcess(articleEl, rendered.mathBlocks, {
      onImageClick: (src, alt) => onImageClickRef.current?.(src, alt),
      onAnchorClick: () => onAnchorClickRef.current?.(),
    });

    const headings = Array.from(
      articleEl.querySelectorAll('h1, h2, h3, h4, h5, h6')
    ).filter((h) => h.id);
    onHeadingsRef.current?.(headings);

    const words = rawContent ? rawContent.trim().split(/\s+/).filter(Boolean).length : 0;
    onWordsRef.current?.(words);
  }, [rendered, rawContent]);

  // Runs after postProcess so highlights survive the DOM tweaks above.
  useEffect(() => {
    applyAnnotations();
  }, [applyAnnotations, rendered]);

  const handleScrollToTop = () => {
    if (onScrollToTop) {
      onScrollToTop();
    } else if (activeContentRef.current) {
      activeContentRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <>
      <main
        ref={(el) => {
          (activeContentRef as React.MutableRefObject<HTMLElement | null>).current = el;
        }}
        id="content"
        className={`content ${className}`.trim()}
        tabIndex={-1}
        onScroll={onScroll}
      >
        <article
          ref={(el) => {
            (activeArticleRef as React.MutableRefObject<HTMLElement | null>).current = el;
          }}
          id="article"
          className="article markdown-body"
          dangerouslySetInnerHTML={{ __html: rendered.html }}
        />
      </main>

      <div className="float-actions">
        <button
          id="navBack"
          type="button"
          className="float-btn float-btn-labelled"
          hidden={!canNavBack}
          title="Revenir à la position précédente (B)"
          onClick={onNavBack}
        >
          <Icon>
            <path d="M19 12H5" />
            <path d="m12 19-7-7 7-7" />
          </Icon>
          Revenir
        </button>
        <button
          id="backToTop"
          type="button"
          className={`float-btn back-to-top ${showBackToTop ? 'visible' : ''}`.trim()}
          aria-label="Retour en haut du document"
          title="Retour en haut (Début)"
          onClick={handleScrollToTop}
        >
          <Icon>
            <path d="m18 15-6-6-6 6" />
          </Icon>
        </button>
      </div>
    </>
  );
}

export default ArticleContent;
