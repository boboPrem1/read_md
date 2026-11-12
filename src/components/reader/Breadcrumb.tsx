'use client';

import React from 'react';

export interface BreadcrumbProps {
  parent?: string | null;
  current?: string;
  activeHeading?: Element | null;
  headings?: Element[];
  className?: string;
}

function cleanHeadingText(el: Element | null | undefined): string {
  if (!el) return '';
  return (el.textContent || '').replace(/^#\s*/, '').trim();
}

export function Breadcrumb({
  parent,
  current,
  activeHeading,
  headings = [],
  className = '',
}: BreadcrumbProps) {
  let resolvedParent = parent ?? null;
  let resolvedCurrent = current;

  if (activeHeading) {
    resolvedCurrent = cleanHeadingText(activeHeading);

    if (!resolvedParent && headings.length > 0) {
      const level = parseInt(activeHeading.tagName[1], 10);
      const activeIndex = headings.indexOf(activeHeading);

      if (activeIndex > 0 && !isNaN(level)) {
        for (let i = activeIndex - 1; i >= 0; i--) {
          const candidateLevel = parseInt(headings[i].tagName[1], 10);
          if (!isNaN(candidateLevel) && candidateLevel < level) {
            if (candidateLevel > 1) {
              resolvedParent = cleanHeadingText(headings[i]);
            }
            break;
          }
        }
      }
    }
  }

  if (!resolvedCurrent) {
    resolvedCurrent = 'Début du document';
  }

  return (
    <span id="breadcrumb" className={`breadcrumb ${className}`.trim()}>
      {resolvedParent && (
        <>
          <span className="crumb-parent">{resolvedParent}</span>
          <span className="crumb-sep" aria-hidden="true">
            ›
          </span>
        </>
      )}
      <span className="crumb-current">{resolvedCurrent}</span>
    </span>
  );
}

export default Breadcrumb;
