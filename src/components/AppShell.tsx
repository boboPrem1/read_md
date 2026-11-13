'use client';

import React, { useCallback, useEffect, useState } from 'react';

import { DocumentProvider, useDocument } from '../contexts/document-context';
import { Announcer } from '../lib/utils';
import { ReaderView } from './reader/ReaderView';
import { WelcomeScreen } from './welcome/WelcomeScreen';

export function AppShell() {
  return (
    <DocumentProvider>
      <div id="app">
        <Shell />
      </div>
    </DocumentProvider>
  );
}

function Shell() {
  const { fileName, loadFile } = useDocument();
  const [showReader, setShowReader] = useState(false);

  useEffect(() => {
    if (!Announcer._el) Announcer.init();
  }, []);

  const openFile = useCallback(async (file: File, handle?: FileSystemFileHandle | null) => {
    const opened = await loadFile(file, handle);
    if (opened) setShowReader(true);
  }, [loadFile]);

  useEffect(() => {
    const prevent = (event: DragEvent) => event.preventDefault();
    const onDrop = (event: DragEvent) => {
      event.preventDefault();
      const file = event.dataTransfer?.files?.[0];
      if (file) void openFile(file, null);
    };
    document.body.addEventListener('dragover', prevent);
    document.body.addEventListener('drop', onDrop);
    return () => {
      document.body.removeEventListener('dragover', prevent);
      document.body.removeEventListener('drop', onDrop);
    };
  }, [openFile]);

  if (showReader && fileName) {
    return (
      <ReaderView
        onHome={() => setShowReader(false)}
        onFileSelect={(file, handle) => {
          void openFile(file, handle);
        }}
      />
    );
  }

  return (
    <WelcomeScreen
      onOpenFile={(file, handle) => {
        void openFile(file, handle);
      }}
      onResume={fileName ? () => setShowReader(true) : undefined}
      currentFileName={fileName || undefined}
    />
  );
}

export default AppShell;
