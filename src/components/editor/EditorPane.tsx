'use client';

import React, { useState, useEffect, useRef } from 'react';

export interface EditorPaneProps {
  rawContent: string;
  onChange: (content: string) => void;
  onDownload: () => void;
}

export function EditorPane({ rawContent, onChange, onDownload }: EditorPaneProps) {
  const [value, setValue] = useState(rawContent);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // Sync state if rawContent changes externally
  useEffect(() => {
    setValue(rawContent);
  }, [rawContent]);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const nextValue = e.target.value;
    setValue(nextValue);

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(() => {
      onChangeRef.current(nextValue);
    }, 300);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  return (
    <aside className="editor-pane" aria-label="Éditeur source Markdown">
      <div className="editor-toolbar">
        <span>Source Markdown</span>
        <button
          id="editorDownload"
          type="button"
          onClick={onDownload}
          title="Télécharger le fichier Markdown"
        >
          Télécharger
        </button>
      </div>
      <textarea
        id="editorTextarea"
        aria-label="Contenu Markdown"
        value={value}
        onChange={handleChange}
        spellCheck="false"
      />
    </aside>
  );
}

export default EditorPane;
