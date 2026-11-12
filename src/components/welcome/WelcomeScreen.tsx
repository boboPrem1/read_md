'use client';

import React, { useCallback } from 'react';
import { DropZone } from './DropZone';
import { RecentFiles } from './RecentFiles';
import { GitHubBrowser } from './GitHubBrowser';
import { SavedDirs } from './SavedDirs';
import { useGitHubBrowser } from '../../hooks/use-github-browser';

export interface WelcomeScreenProps {
  onOpenFile: (file: File, handle?: FileSystemFileHandle | null) => void;
  onResume?: () => void;
  currentFileName?: string;
}

export function WelcomeScreen({
  onOpenFile,
  onResume,
  currentFileName,
}: WelcomeScreenProps) {
  const handleGitHubOpen = useCallback(
    (file: File) => {
      onOpenFile(file, null);
    },
    [onOpenFile]
  );

  const gitHubBrowser = useGitHubBrowser({ onOpenFile: handleGitHubOpen });

  return (
    <div id="welcome" className="welcome">
      <main className="welcome-inner">
        <div className="welcome-title-page">
          <div className="welcome-hero">
            <h1>
              Lecteur <em>Markdown</em>
            </h1>
            <p>Ouvrez un fichier Markdown pour commencer la lecture</p>
          </div>

          <div id="resumeSlot">
            {currentFileName ? (
              <div className="resume-card">
                <div className="resume-text">
                  <span className="resume-label">Reprendre la lecture</span>
                  <span className="resume-title">{currentFileName}</span>
                </div>
                {onResume && (
                  <button
                    type="button"
                    className="resume-btn"
                    id="resumeBtn"
                    onClick={onResume}
                  >
                    Reprendre
                  </button>
                )}
              </div>
            ) : null}
          </div>
        </div>

        <div className="welcome-contents">
          <section className="welcome-card" id="localCard">
            <h2>Fichier local</h2>
            <DropZone onFileSelected={onOpenFile} />
            <RecentFiles onOpenFile={onOpenFile} />
          </section>

          <section className="welcome-card" id="githubCard">
            <h2>Depuis GitHub</h2>
            <GitHubBrowser onOpenFile={handleGitHubOpen} browser={gitHubBrowser} />
          </section>

          <section className="welcome-card" id="savedDirsCard">
            <h2>Répertoires sauvegardés</h2>
            <SavedDirs
              savedDirs={gitHubBrowser.savedDirs}
              onSelectDir={(dirId) => gitHubBrowser.loadSavedDir(dirId)}
              onRefreshDir={(dirId) => gitHubBrowser.refreshSavedDir(dirId)}
              onRemoveDir={(dirId) => gitHubBrowser.removeSavedDir(dirId)}
            />
          </section>
        </div>
      </main>
    </div>
  );
}

export default WelcomeScreen;

