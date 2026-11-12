'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  getRecentFiles,
  clearRecentFiles,
  removeRecentFile,
  type RecentFile,
} from '../../lib/storage/recent-files';
import { HandleStore } from '../../lib/storage/handle-store';
import { showToast } from '../../lib/utils';

export interface RecentFilesProps {
  onOpenFile: (file: File, handle?: FileSystemFileHandle | null) => void;
}

function formatAgo(ts: number): string {
  const d = Math.floor((Date.now() - ts) / 86400000);
  if (d === 0) return "Aujourd'hui";
  if (d === 1) return 'Hier';
  return `${d} jours`;
}

export function RecentFiles({ onOpenFile }: RecentFilesProps) {
  const [files, setFiles] = useState<RecentFile[]>([]);

  const refresh = useCallback(() => {
    setFiles(getRecentFiles());
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleClear = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    clearRecentFiles();
    setFiles([]);
  }, []);

  const handleRemove = useCallback((name: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    removeRecentFile(name);
    refresh();
  }, [refresh]);

  const handleReopen = useCallback(async (name: string) => {
    const handle = await HandleStore.get(name);
    if (handle) {
      try {
        const queryMode = { mode: 'read' as const };
        let permission = await (handle as unknown as {
          queryPermission: (opt: { mode: string }) => Promise<PermissionState>;
          requestPermission: (opt: { mode: string }) => Promise<PermissionState>;
          getFile: () => Promise<File>;
        }).queryPermission(queryMode);

        if (permission !== 'granted') {
          permission = await (handle as unknown as {
            requestPermission: (opt: { mode: string }) => Promise<PermissionState>;
          }).requestPermission(queryMode);
        }

        if (permission === 'granted') {
          const file = await (handle as unknown as {
            getFile: () => Promise<File>;
          }).getFile();
          onOpenFile(file, handle);
          return;
        }
      } catch {
        /* ignore error and show fallback */
      }
    }

    showToast(
      handle
        ? 'Impossible de rouvrir automatiquement — sélectionnez le fichier'
        : `Sélectionnez à nouveau « ${name} »`
    );
  }, [onOpenFile]);

  if (files.length === 0) {
    return <div className="recent-files" id="recentFiles" />;
  }

  return (
    <div className="recent-files" id="recentFiles">
      <h3>
        Fichiers récents{' '}
        <button
          className="recent-file-clear"
          id="clearRecent"
          type="button"
          onClick={handleClear}
        >
          Effacer
        </button>
      </h3>
      {files.map((file) => (
        <div
          key={file.name}
          className="recent-file-item"
          data-name={file.name}
          tabIndex={0}
          role="button"
          aria-label={`Rouvrir ${file.name}`}
          onClick={() => handleReopen(file.name)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleReopen(file.name);
            } else if (e.key === 'Delete') {
              e.preventDefault();
              handleRemove(file.name);
            }
          }}
        >
          <span className="recent-file-name">{file.name}</span>
          <span className="recent-file-date">{formatAgo(file.date)}</span>
        </div>
      ))}
    </div>
  );
}

export default RecentFiles;

