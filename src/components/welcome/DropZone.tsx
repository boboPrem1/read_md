'use client';

import React, { useState, useCallback } from 'react';
import { pickMarkdownFile } from '../../lib/pick-markdown-file';

export interface DropZoneProps {
  onFileSelected: (file: File, handle?: FileSystemFileHandle | null) => void;
}

export function DropZone({ onFileSelected }: DropZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleFile = useCallback((file: File, handle?: FileSystemFileHandle | null) => {
    onFileSelected(file, handle);
  }, [onFileSelected]);

  const pickFile = useCallback(async () => {
    const picked = await pickMarkdownFile();
    if (picked) handleFile(picked.file, picked.handle);
  }, [handleFile]);

  const onDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFile(file, null);
    }
  }, [handleFile]);

  return (
    <div
      className={`drop-zone${isDragOver ? ' drag-over' : ''}`}
      id="dropZone"
      onDragEnter={onDragEnter}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onClick={(e) => {
        if (e.target === e.currentTarget || !(e.target as HTMLElement).closest('button')) {
          pickFile();
        }
      }}
    >
      <div className="drop-zone-icon" aria-hidden="true">#</div>
      <div className="drop-zone-body">
        <p>Glissez-déposez un fichier .md ici</p>
        <button
          id="fileBtn"
          type="button"
          className="primary-btn"
          onClick={(e) => {
            e.stopPropagation();
            pickFile();
          }}
        >
          Choisir un fichier
        </button>
      </div>
    </div>
  );
}

export default DropZone;

