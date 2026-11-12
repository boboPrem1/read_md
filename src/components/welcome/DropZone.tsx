'use client';

import React, { useRef, useState, useCallback } from 'react';
import { ACCEPTED_EXTENSIONS } from '../../lib/constants';

export interface DropZoneProps {
  onFileSelected: (file: File, handle?: FileSystemFileHandle | null) => void;
}

export function DropZone({ onFileSelected }: DropZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((file: File, handle?: FileSystemFileHandle | null) => {
    onFileSelected(file, handle);
  }, [onFileSelected]);

  const pickFile = useCallback(async () => {
    if (typeof window !== 'undefined' && 'showOpenFilePicker' in window) {
      try {
        const [handle] = await (window as unknown as {
          showOpenFilePicker: (options: unknown) => Promise<FileSystemFileHandle[]>;
        }).showOpenFilePicker({
          types: [{
            description: 'Markdown',
            accept: {
              'text/markdown': ACCEPTED_EXTENSIONS,
              'text/plain': ACCEPTED_EXTENSIONS,
            },
          }],
          excludeAcceptAllOption: false,
        });
        if (handle) {
          const file = await handle.getFile();
          handleFile(file, handle);
          return;
        }
      } catch (err: unknown) {
        if (err && (err as { name?: string }).name === 'AbortError') {
          return;
        }
      }
    }
    fileInputRef.current?.click();
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

  const onInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file, null);
    }
    // reset input so selecting the same file again triggers change
    e.target.value = '';
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
      <input
        ref={fileInputRef}
        type="file"
        id="fileInput"
        className="hidden-input"
        tabIndex={-1}
        aria-hidden="true"
        accept={ACCEPTED_EXTENSIONS.join(',')}
        onChange={onInputChange}
      />
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

