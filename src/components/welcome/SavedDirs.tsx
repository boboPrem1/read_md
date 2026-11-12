'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  GithubDirsStore,
  type SavedDir,
} from '../../lib/storage/github-dirs';

export interface SavedDirsProps {
  onSelectDir: (dirId: string) => void;
  savedDirs?: SavedDir[];
  onRefreshDir?: (dirId: string) => void;
  onRemoveDir?: (dirId: string) => void;
}

export function SavedDirs({
  onSelectDir,
  savedDirs: externalDirs,
  onRefreshDir,
  onRemoveDir,
}: SavedDirsProps) {
  const [internalDirs, setInternalDirs] = useState<SavedDir[]>([]);

  const refreshList = useCallback(() => {
    setInternalDirs(GithubDirsStore.get());
  }, []);

  useEffect(() => {
    if (!externalDirs) {
      refreshList();
    }
  }, [externalDirs, refreshList]);

  const list = externalDirs !== undefined ? externalDirs : internalDirs;

  const handleOpen = useCallback((id: string) => {
    onSelectDir(id);
  }, [onSelectDir]);

  const handleRefresh = useCallback((id: string) => {
    if (onRefreshDir) {
      onRefreshDir(id);
    }
  }, [onRefreshDir]);

  const handleRemove = useCallback((id: string) => {
    if (onRemoveDir) {
      onRemoveDir(id);
    } else {
      GithubDirsStore.remove(id);
      refreshList();
    }
  }, [onRemoveDir, refreshList]);

  if (list.length === 0) {
    return (
      <div id="ghSavedDirs" className="gh-saved-list">
        <div className="gh-saved-empty">
          Aucun répertoire sauvegardé pour l&apos;instant. Scannez un dossier GitHub puis cliquez
          &quot;Sauvegarder ce répertoire&quot;.
        </div>
      </div>
    );
  }

  return (
    <div id="ghSavedDirs" className="gh-saved-list">
      {list.map((dir) => {
        const title = `${dir.owner}/${dir.repo}${dir.path ? ` / ${dir.path}` : ''}`;
        const count = dir.count || (dir.files || []).length;
        const scannedDate = dir.scannedAt
          ? new Date(dir.scannedAt).toLocaleDateString('fr-FR')
          : '';
        const meta = `Branche: ${dir.ref || '?'} · ${count} fichier(s) · scanné le ${scannedDate}`;

        return (
          <div key={dir.id} className="gh-saved-item">
            <div className="gh-saved-header">
              <div className="gh-saved-title">{title}</div>
            </div>
            <div className="gh-saved-meta">{meta}</div>
            <div className="gh-saved-btns">
              <button
                type="button"
                className="primary"
                data-saved-open={dir.id}
                onClick={() => handleOpen(dir.id)}
              >
                Ouvrir
              </button>
              <button
                type="button"
                data-saved-refresh={dir.id}
                onClick={() => handleRefresh(dir.id)}
              >
                Actualiser
              </button>
              <button
                type="button"
                data-saved-remove={dir.id}
                onClick={() => handleRemove(dir.id)}
              >
                Supprimer
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default SavedDirs;

