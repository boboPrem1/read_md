'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from 'react';

import { ACCEPTED_EXTENSIONS } from '../lib/constants';
import { addRecentFile } from '../lib/storage/recent-files';
import { hashString } from '../lib/utils';

export interface DocumentState {
  fileName: string;
  fileHash: string;
  rawContent: string;
  dirty: boolean;
  isLoading: boolean;
}

type DocumentAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_FILE'; payload: { fileName: string; fileHash: string; rawContent: string } }
  | { type: 'SET_CONTENT'; payload: string }
  | { type: 'SET_DIRTY'; payload: boolean };

const initialState: DocumentState = {
  fileName: '',
  fileHash: '',
  rawContent: '',
  dirty: false,
  isLoading: false,
};

function documentReducer(state: DocumentState, action: DocumentAction): DocumentState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_FILE':
      return {
        fileName: action.payload.fileName,
        fileHash: action.payload.fileHash,
        rawContent: action.payload.rawContent,
        dirty: false,
        isLoading: false,
      };
    case 'SET_CONTENT':
      return { ...state, rawContent: action.payload, dirty: true };
    case 'SET_DIRTY':
      return { ...state, dirty: action.payload };
    default:
      return state;
  }
}

interface DocumentApi {
  loadFile: (file: File, handle?: FileSystemFileHandle | null) => Promise<boolean>;
  updateContent: (content: string) => void;
  markClean: () => void;
}

const DocumentStateContext = createContext<DocumentState | null>(null);
const DocumentApiContext = createContext<DocumentApi | null>(null);

export function DocumentProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(documentReducer, initialState);
  const stateRef = useRef(state);
  const loadingRef = useRef(false);

  useEffect(() => {
    stateRef.current = state;
  });

  const loadFile = useCallback(
    async (file: File, handle?: FileSystemFileHandle | null): Promise<boolean> => {
      const ext = '.' + (file.name.split('.').pop() ?? '').toLowerCase();
      if (!ACCEPTED_EXTENSIONS.includes(ext)) {
        window.alert('Format non pris en charge. Veuillez utiliser un fichier Markdown (.md, .markdown, .txt).');
        return false;
      }
      if (
        stateRef.current.dirty &&
        !window.confirm('Vos modifications non téléchargées seront perdues. Ouvrir ce fichier quand même ?')
      ) {
        return false;
      }
      if (loadingRef.current) return false;
      loadingRef.current = true;
      dispatch({ type: 'SET_LOADING', payload: true });
      try {
        const rawContent = await file.text();
        const fileHash = hashString(rawContent);
        addRecentFile(file.name, file.size, handle);
        dispatch({
          type: 'SET_FILE',
          payload: { fileName: file.name, fileHash, rawContent },
        });
        document.title = `${file.name} — Lecteur Markdown`;
        return true;
      } catch {
        dispatch({ type: 'SET_LOADING', payload: false });
        window.alert('Impossible de lire ce fichier.');
        return false;
      } finally {
        loadingRef.current = false;
      }
    },
    []
  );

  const updateContent = useCallback((content: string) => {
    dispatch({ type: 'SET_CONTENT', payload: content });
  }, []);

  const markClean = useCallback(() => {
    dispatch({ type: 'SET_DIRTY', payload: false });
  }, []);

  const api = useMemo(
    () => ({ loadFile, updateContent, markClean }),
    [loadFile, updateContent, markClean]
  );

  return (
    <DocumentStateContext.Provider value={state}>
      <DocumentApiContext.Provider value={api}>{children}</DocumentApiContext.Provider>
    </DocumentStateContext.Provider>
  );
}

export function useDocument(): DocumentState & DocumentApi {
  const state = useContext(DocumentStateContext);
  const api = useContext(DocumentApiContext);
  if (!state || !api) {
    throw new Error('useDocument must be used within a <DocumentProvider>');
  }
  return useMemo(() => ({ ...state, ...api }), [state, api]);
}
