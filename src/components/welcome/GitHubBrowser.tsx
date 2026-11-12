'use client';

import React, { useCallback } from 'react';
import {
  useGitHubBrowser,
  type UseGitHubBrowserReturn,
  type GitHubFile,
} from '../../hooks/use-github-browser';

export interface GitHubBrowserProps {
  onOpenFile: (file: File) => void;
  browser?: UseGitHubBrowserReturn;
}

export function GitHubBrowser({ onOpenFile, browser: externalBrowser }: GitHubBrowserProps) {
  const internalBrowser = useGitHubBrowser({ onOpenFile });
  const browser = externalBrowser || internalBrowser;

  const {
    currentRepo,
    files,
    isLoading,
    status,
    isError,
    lastInput,
    setLastInput,
    isCurrentSaved,
    scan,
    openFile,
    saveCurrentDirectory,
  } = browser;

  const handleScan = useCallback(async () => {
    await scan(lastInput.trim());
  }, [scan, lastInput]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleScan();
      }
    },
    [handleScan]
  );

  const canSave = Boolean(currentRepo && files && files.length > 0 && !isLoading);
  const saveBtnText = isCurrentSaved ? 'Mettre à jour le répertoire' : 'Sauvegarder ce répertoire';

  return (
    <div className="github-browser" id="ghBrowser">
      <p className="gh-description">
        Entrez une URL GitHub ou un chemin owner/repo pour scanner les fichiers Markdown.
      </p>

      <div className="gh-input-row">
        <input
          type="text"
          id="ghUrl"
          placeholder="owner/repo ou https://github.com/..."
          className="gh-input"
          value={lastInput}
          onChange={(e) => setLastInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isLoading}
        />
        <button
          type="button"
          id="ghScanBtn"
          className="primary-btn"
          onClick={handleScan}
          disabled={isLoading}
        >
          {isLoading ? 'Scan en cours...' : 'Scanner'}
        </button>
        <button
          type="button"
          id="ghSaveBtn"
          className="secondary-btn"
          disabled={!canSave}
          onClick={saveCurrentDirectory}
        >
          {saveBtnText}
        </button>
      </div>

      <div className="gh-status-row">
        <div
          className="gh-status"
          id="ghStatus"
          style={{ color: isError ? '#c0392b' : undefined }}
        >
          {status}
        </div>
      </div>

      <div className="gh-results" id="ghResults">
        {files.length === 0 ? (
          <div className="gh-empty">Aucun fichier Markdown à afficher. Lancez un scan.</div>
        ) : (
          <>
            <div className="gh-count">{files.length} fichier(s) Markdown</div>
            {files.map((f: GitHubFile, index: number) => (
              <button
                key={f.path}
                className="gh-file"
                type="button"
                data-gh-index={index}
                onClick={() => openFile(index)}
              >
                <span className="gh-file-name">{f.name}</span>
                <span className="gh-file-path">
                  {f.path}
                  {f.size ? `  (${Math.round(f.size / 1024)} Ko)` : ''}
                </span>
              </button>
            ))}
          </>
        )}
      </div>
    </div>
  );
}

export default GitHubBrowser;

