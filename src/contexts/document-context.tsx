'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useReducer,
} from 'react';

import type { Bookmark } from '../lib/storage/bookmarks';
import type { Annotation } from '../lib/storage/annotations';

// ── Types ──────────────────────────────────────────────────────────────────

export type { Bookmark, Annotation };

export interface ReaderState {
  fileName: string;
  fileHash: string;
  rawContent: string;
  headings: Element[];
  activeHeading: string | null;
  searchResults: Element[];
  searchIndex: number;
  sidebarOpen: boolean;
  settingsOpen: boolean;
  searchOpen: boolean;
  minimalMode: boolean;
  lightboxOpen: boolean;
  shortcutsOpen: boolean;
  focusMode: boolean;
  navHistory: number[];
  totalWords: number;
  bookmarks: Bookmark[];
  annotations: Annotation[];
  statsOpen: boolean;
  editorOpen: boolean;
  presentationOpen: boolean;
  presentationSlide: number;
  regexSearch: boolean;
  dirty: boolean;
  isLoading: boolean;
}

// ── Actions ────────────────────────────────────────────────────────────────

export type ReaderAction =
  | { type: 'SET_FILE'; payload: { fileName: string; fileHash: string; rawContent: string } }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_HEADINGS'; payload: Element[] }
  | { type: 'SET_ACTIVE_HEADING'; payload: string | null }
  | { type: 'SET_BOOKMARKS'; payload: Bookmark[] }
  | { type: 'SET_ANNOTATIONS'; payload: Annotation[] }
  | { type: 'SET_SEARCH'; payload: { results: Element[]; index: number } }
  | { type: 'TOGGLE_SIDEBAR' }
  | { type: 'TOGGLE_SETTINGS' }
  | { type: 'TOGGLE_SEARCH' }
  | { type: 'TOGGLE_MINIMAL' }
  | { type: 'TOGGLE_FOCUS' }
  | { type: 'TOGGLE_LIGHTBOX' }
  | { type: 'TOGGLE_SHORTCUTS' }
  | { type: 'TOGGLE_STATS' }
  | { type: 'TOGGLE_EDITOR' }
  | { type: 'TOGGLE_PRESENTATION'; payload?: { slide?: number } }
  | { type: 'SET_DIRTY'; payload: boolean }
  | { type: 'NAV_PUSH'; payload: number }
  | { type: 'NAV_BACK' }
  | { type: 'SET_TOTAL_WORDS'; payload: number };

// ── Initial state ──────────────────────────────────────────────────────────

const initialState: ReaderState = {
  fileName: '',
  fileHash: '',
  rawContent: '',
  headings: [],
  activeHeading: null,
  searchResults: [],
  searchIndex: -1,
  sidebarOpen: true,
  settingsOpen: false,
  searchOpen: false,
  minimalMode: false,
  lightboxOpen: false,
  shortcutsOpen: false,
  focusMode: false,
  navHistory: [],
  totalWords: 0,
  bookmarks: [],
  annotations: [],
  statsOpen: false,
  editorOpen: false,
  presentationOpen: false,
  presentationSlide: 0,
  regexSearch: false,
  dirty: false,
  isLoading: false,
};

// ── Reducer ────────────────────────────────────────────────────────────────

function readerReducer(state: ReaderState, action: ReaderAction): ReaderState {
  switch (action.type) {
    case 'SET_FILE':
      return {
        ...state,
        fileName: action.payload.fileName,
        fileHash: action.payload.fileHash,
        rawContent: action.payload.rawContent,
        // Reset per-document state
        headings: [],
        activeHeading: null,
        searchResults: [],
        searchIndex: -1,
        bookmarks: [],
        annotations: [],
        navHistory: [],
        dirty: false,
      };

    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };

    case 'SET_HEADINGS':
      return { ...state, headings: action.payload };

    case 'SET_ACTIVE_HEADING':
      return { ...state, activeHeading: action.payload };

    case 'SET_BOOKMARKS':
      return { ...state, bookmarks: action.payload };

    case 'SET_ANNOTATIONS':
      return { ...state, annotations: action.payload };

    case 'SET_SEARCH':
      return {
        ...state,
        searchResults: action.payload.results,
        searchIndex: action.payload.index,
      };

    case 'TOGGLE_SIDEBAR':
      return { ...state, sidebarOpen: !state.sidebarOpen };

    case 'TOGGLE_SETTINGS':
      return { ...state, settingsOpen: !state.settingsOpen };

    case 'TOGGLE_SEARCH':
      return { ...state, searchOpen: !state.searchOpen };

    case 'TOGGLE_MINIMAL':
      return { ...state, minimalMode: !state.minimalMode };

    case 'TOGGLE_FOCUS':
      return { ...state, focusMode: !state.focusMode };

    case 'TOGGLE_LIGHTBOX':
      return { ...state, lightboxOpen: !state.lightboxOpen };

    case 'TOGGLE_SHORTCUTS':
      return { ...state, shortcutsOpen: !state.shortcutsOpen };

    case 'TOGGLE_STATS':
      return { ...state, statsOpen: !state.statsOpen };

    case 'TOGGLE_EDITOR':
      return { ...state, editorOpen: !state.editorOpen };

    case 'TOGGLE_PRESENTATION':
      return {
        ...state,
        presentationOpen: !state.presentationOpen,
        presentationSlide: action.payload?.slide ?? state.presentationSlide,
      };

    case 'SET_DIRTY':
      return { ...state, dirty: action.payload };

    case 'NAV_PUSH':
      return { ...state, navHistory: [...state.navHistory, action.payload] };

    case 'NAV_BACK': {
      const history = state.navHistory.slice(0, -1);
      return { ...state, navHistory: history };
    }

    case 'SET_TOTAL_WORDS':
      return { ...state, totalWords: action.payload };

    default:
      return state;
  }
}

// ── Context value type ─────────────────────────────────────────────────────

interface DocumentContextValue {
  state: ReaderState;
  dispatch: React.Dispatch<ReaderAction>;
  loadFile: (file: File, handle?: FileSystemFileHandle | null) => Promise<void>;
}

// ── Context — React 19 safe pattern (never null) ───────────────────────────

function missingProvider(): never {
  throw new Error('useDocument / useDocumentDispatch must be used within a <DocumentProvider>');
}

const DocumentStateContext = createContext<ReaderState>(initialState);
const DocumentDispatchContext = createContext<React.Dispatch<ReaderAction>>(
  missingProvider as unknown as React.Dispatch<ReaderAction>
);
const DocumentApiContext = createContext<Pick<DocumentContextValue, 'loadFile'>>({
  loadFile: missingProvider as unknown as DocumentContextValue['loadFile'],
});

// ── Provider ───────────────────────────────────────────────────────────────

export function DocumentProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(readerReducer, initialState);

  /**
   * loadFile — reads the file, hashes the content, dispatches SET_FILE, then
   * loads persisted bookmarks / annotations for that document.
   *
   * Heavy work (markdown rendering, word-count) is done by the components that
   * consume the state; this function only handles I/O and state bootstrap.
   */
  const loadFile = useCallback(
    async (file: File, _handle?: FileSystemFileHandle | null): Promise<void> => {
      dispatch({ type: 'SET_LOADING', payload: true });
      try {
        const rawContent = await file.text();

        // Simple djb2-style hash for change detection (matches reader-app.ts)
        let hash = 5381;
        for (let i = 0; i < rawContent.length; i++) {
          hash = ((hash << 5) + hash) ^ rawContent.charCodeAt(i);
        }
        const fileHash = (hash >>> 0).toString(36);

        dispatch({
          type: 'SET_FILE',
          payload: { fileName: file.name, fileHash, rawContent },
        });

        // Load persisted data for this document (dynamic import avoids SSR issues)
        const [{ loadBookmarks }, { loadAnnotations }] = await Promise.all([
          import('../lib/storage/bookmarks'),
          import('../lib/storage/annotations'),
        ]);

        dispatch({ type: 'SET_BOOKMARKS', payload: loadBookmarks(fileHash) });
        dispatch({ type: 'SET_ANNOTATIONS', payload: loadAnnotations(fileHash) });
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    },
    []
  );

  const api = useMemo(() => ({ loadFile }), [loadFile]);

  return (
    <DocumentStateContext.Provider value={state}>
      <DocumentDispatchContext.Provider value={dispatch}>
        <DocumentApiContext.Provider value={api}>
          {children}
        </DocumentApiContext.Provider>
      </DocumentDispatchContext.Provider>
    </DocumentStateContext.Provider>
  );
}

// ── Hooks ──────────────────────────────────────────────────────────────────

/**
 * useDocument — returns the full reader state plus the loadFile API.
 * Re-renders whenever any part of the state changes.
 */
export function useDocument(): ReaderState & Pick<DocumentContextValue, 'loadFile'> {
  const state = useContext(DocumentStateContext);
  const { loadFile } = useContext(DocumentApiContext);
  return useMemo(() => ({ ...state, loadFile }), [state, loadFile]);
}

/**
 * useDocumentDispatch — returns only the dispatch function.
 * Components that only dispatch actions will NOT re-render on state changes.
 */
export function useDocumentDispatch(): React.Dispatch<ReaderAction> {
  return useContext(DocumentDispatchContext);
}
