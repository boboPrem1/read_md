'use client';

import React, { useEffect, useRef } from 'react';
import { Icon } from './Icon';
import type { UseSearchResult } from '../../hooks/use-search';

export interface SearchBarProps {
  search?: UseSearchResult;
  isOpen?: boolean;
  query?: string;
  isRegex?: boolean;
  resultsCount?: number;
  currentIndex?: number;
  statusText?: string;
  isError?: boolean;
  onQueryChange?: (query: string) => void;
  onToggleRegex?: () => void;
  onNext?: () => void;
  onPrev?: () => void;
  onClose?: () => void;
  className?: string;
}

export function SearchBar({
  search,
  isOpen: propIsOpen,
  query: propQuery,
  isRegex: propIsRegex,
  resultsCount: propResultsCount,
  statusText: propStatusText,
  isError: propIsError,
  onQueryChange,
  onToggleRegex,
  onNext,
  onPrev,
  onClose,
  className = '',
}: SearchBarProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const isOpen = propIsOpen ?? search?.isOpen ?? false;
  const query = propQuery ?? search?.query ?? '';
  const isRegex = propIsRegex ?? search?.isRegex ?? false;
  const resultsCount = propResultsCount ?? search?.resultsCount ?? 0;
  const statusText = propStatusText ?? search?.statusText ?? '';
  const isError = propIsError ?? search?.isError ?? false;

  const handleQueryChange = (val: string) => {
    if (onQueryChange) {
      onQueryChange(val);
    } else if (search) {
      search.setQuery(val);
    }
  };

  const handleToggleRegex = () => {
    if (onToggleRegex) {
      onToggleRegex();
    } else if (search) {
      search.toggleRegex();
    }
  };

  const handleNext = () => {
    if (onNext) {
      onNext();
    } else if (search) {
      search.next();
    }
  };

  const handlePrev = () => {
    if (onPrev) {
      onPrev();
    } else if (search) {
      search.prev();
    }
  };

  const handleClose = () => {
    if (onClose) {
      onClose();
    } else if (search) {
      search.close(true);
    }
  };

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      handleClose();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (e.shiftKey) {
        handlePrev();
      } else {
        handleNext();
      }
    }
  };

  return (
    <div
      id="searchBar"
      className={`search-bar ${isOpen ? '' : 'hidden'} ${className}`.trim()}
      role="search"
      aria-label="Recherche dans le document"
    >
      <input
        ref={inputRef}
        type="text"
        id="searchInput"
        placeholder="Rechercher dans le document"
        aria-label="Terme de recherche"
        aria-describedby="searchCount"
        value={query}
        onChange={(e) => handleQueryChange(e.target.value)}
        onKeyDown={handleKeyDown}
      />
      <span
        id="searchCount"
        className={`search-count ${isError ? 'search-error' : ''}`.trim()}
        role="status"
      >
        {statusText}
      </span>
      <button
        id="regexToggle"
        type="button"
        className={`search-text-btn ${isRegex ? 'active' : ''}`.trim()}
        aria-pressed={isRegex}
        title="Interpréter comme une expression régulière"
        onClick={handleToggleRegex}
      >
        Regex
      </button>
      <button
        id="searchPrev"
        type="button"
        className="search-icon-btn"
        aria-label="Résultat précédent"
        title="Précédent (Maj+Entrée)"
        disabled={resultsCount === 0}
        onClick={handlePrev}
      >
        <Icon>
          <path d="m18 15-6-6-6 6" />
        </Icon>
      </button>
      <button
        id="searchNext"
        type="button"
        className="search-icon-btn"
        aria-label="Résultat suivant"
        title="Suivant (Entrée)"
        disabled={resultsCount === 0}
        onClick={handleNext}
      >
        <Icon>
          <path d="m6 9 6 6 6-6" />
        </Icon>
      </button>
      <button
        id="searchClose"
        type="button"
        className="search-icon-btn"
        aria-label="Fermer la recherche"
        title="Fermer (Échap)"
        onClick={handleClose}
      >
        <Icon>
          <path d="M18 6 6 18" />
          <path d="m6 6 12 12" />
        </Icon>
      </button>
    </div>
  );
}

export default SearchBar;
