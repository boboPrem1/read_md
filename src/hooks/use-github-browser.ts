'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { GithubDirsStore, type SavedDir } from '../lib/storage/github-dirs';
import { GITHUB_SOURCE_KEY } from '../lib/constants';

// ── Types ──────────────────────────────────────────────────────────────────

export interface GitHubRepoInfo {
  owner: string;
  repo: string;
  ref: string;
  path: string;
}

export interface GitHubFile {
  path: string;
  name: string;
  size: number;
}

export interface UseGitHubBrowserOptions {
  onOpenFile?: (file: File) => void | Promise<void>;
}

export interface UseGitHubBrowserReturn {
  currentRepo: GitHubRepoInfo | null;
  files: GitHubFile[];
  isLoading: boolean;
  status: string;
  isError: boolean;
  savedDirs: SavedDir[];
  lastInput: string;
  setLastInput: (val: string) => void;
  isCurrentSaved: boolean;
  scan: (rawInput?: string) => Promise<void>;
  openFile: (target: number | GitHubFile | string) => Promise<File | null>;
  saveCurrentDirectory: () => void;
  refreshSavedDir: (id: string) => Promise<void>;
  loadSavedDir: (id: string) => void;
  removeSavedDir: (id: string) => void;
}

// ── Pure Helpers ───────────────────────────────────────────────────────────

export function parseGitHubInput(raw: string): GitHubRepoInfo | null {
  const trimmed = (raw || '').trim();
  if (!trimmed) return null;

  let owner: string | null = null;
  let repo: string | null = null;
  let ref: string | null = null;
  let path = '';

  const urlMatch = trimmed.match(
    /github\.com\/([^/\s]+)\/([^/\s?#]+)(?:\/tree\/([^/\s?#]+)(?:\/([^\s?#]*))?)?/i
  );

  if (urlMatch) {
    owner = urlMatch[1];
    repo = urlMatch[2].replace(/\.git$/i, '');
    ref = urlMatch[3] || null;
    path = (urlMatch[4] || '').replace(/^\/+|\/+$/g, '');
  } else {
    const atMatch = trimmed.match(/^([^/\s]+)\/([^@\s]+)(?:@([^\s/]+)(?:\/(.*))?)?$/);
    if (atMatch) {
      owner = atMatch[1];
      repo = atMatch[2].replace(/\.git$/i, '');
      ref = atMatch[3] || null;
      path = (atMatch[4] || '').replace(/^\/+|\/+$/g, '');
    } else {
      const parts = trimmed.split('/').filter(Boolean);
      if (parts.length >= 2) {
        owner = parts[0];
        repo = parts[1].replace(/\.git$/i, '');
        path = parts.slice(2).join('/').replace(/^\/+|\/+$/g, '');
      }
    }
  }

  if (!owner || !repo) return null;
  try {
    path = decodeURIComponent(path);
  } catch {
    /* ignore */
  }

  return { owner, repo, ref: ref || '', path };
}

export const parseInput = parseGitHubInput;

export function isMarkdownPath(p: string): boolean {
  return /\.(md|markdown|mdown|mkd|mkdn|mdwn|mdtxt|mdtext|txt)$/i.test(p || '');
}

function keyOf(d: { owner: string; repo: string; ref?: string; path?: string }): string {
  return [d.owner, d.repo, d.ref || '', d.path || ''].join('/');
}

// ── Hook ───────────────────────────────────────────────────────────────────

export function useGitHubBrowser(
  options?: UseGitHubBrowserOptions
): UseGitHubBrowserReturn {
  const [currentRepo, setCurrentRepo] = useState<GitHubRepoInfo | null>(null);
  const [files, setFiles] = useState<GitHubFile[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [status, setStatus] = useState<string>('');
  const [isError, setIsError] = useState<boolean>(false);
  const [savedDirs, setSavedDirs] = useState<SavedDir[]>([]);
  const [lastInput, setLastInput] = useState<string>('');

  // Hydrate initial source URL and saved dirs from storage
  useEffect(() => {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      try {
        const savedSource = localStorage.getItem(GITHUB_SOURCE_KEY);
        if (savedSource) {
          setLastInput(savedSource);
        }
      } catch {
        /* ignore */
      }
      setSavedDirs(GithubDirsStore.get());
    }
  }, []);

  const isCurrentSaved = useMemo(() => {
    if (!currentRepo) return false;
    const curKey = keyOf(currentRepo);
    return savedDirs.some((d) => keyOf(d) === curKey);
  }, [currentRepo, savedDirs]);

  const scan = useCallback(
    async (rawInput?: string): Promise<void> => {
      const raw = (rawInput !== undefined ? rawInput : lastInput).trim();
      const parsed = parseGitHubInput(raw);
      if (!parsed) {
        setStatus(
          'URL GitHub invalide. Exemple: owner/repo ou https://github.com/owner/repo/tree/main/docs'
        );
        setIsError(true);
        return;
      }

      setLastInput(raw);
      if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
        try {
          localStorage.setItem(GITHUB_SOURCE_KEY, raw);
        } catch {
          /* ignore */
        }
      }

      setIsLoading(true);
      setIsError(false);
      setStatus('Récupération des infos du dépôt...');
      setFiles([]);

      const owner = parsed.owner;
      const repo = parsed.repo;
      let ref = parsed.ref;
      const path = parsed.path;

      try {
        if (!ref) {
          const repoRes = await fetch(
            `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`,
            { headers: { Accept: 'application/vnd.github+json' } }
          );
          if (!repoRes.ok) {
            throw new Error(`Dépôt introuvable ou non public (${repoRes.status})`);
          }
          const repoInfo = (await repoRes.json()) as { default_branch?: string };
          ref = repoInfo.default_branch || 'main';
        }

        const current: GitHubRepoInfo = { owner, repo, ref, path };
        setCurrentRepo(current);
        setStatus("Scan de l'arbre Git (récursif)...");

        const refPath = String(ref).split('/').map(encodeURIComponent).join('/');
        const treeUrl = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/trees/${refPath}?recursive=1`;
        const treeRes = await fetch(treeUrl, {
          headers: { Accept: 'application/vnd.github+json' },
        });

        if (!treeRes.ok) {
          throw new Error(`Impossible de lire l'arbre (${treeRes.status})`);
        }

        const tree = (await treeRes.json()) as {
          truncated?: boolean;
          tree?: Array<{ type: string; path: string; size?: number }>;
        };

        const prefix = path ? path.replace(/\/+$/g, '') + '/' : '';
        const scannedFiles: GitHubFile[] = (tree.tree || [])
          .filter((entry) => entry.type === 'blob')
          .filter((entry) => {
            if (!isMarkdownPath(entry.path)) return false;
            if (!prefix) return true;
            return entry.path === path || entry.path.startsWith(prefix);
          })
          .map((entry) => ({
            path: entry.path,
            name: entry.path.split('/').pop() || entry.path,
            size: entry.size || 0,
          }));

        scannedFiles.sort((a, b) => a.path.localeCompare(b.path, 'fr'));
        setFiles(scannedFiles);

        // Auto-update saved directory entry if it was previously saved
        const curKey = keyOf(current);
        const list = GithubDirsStore.get();
        const idx = list.findIndex((d) => keyOf(d) === curKey);
        if (idx >= 0) {
          list[idx] = {
            ...list[idx],
            ref: current.ref,
            path: current.path,
            url: raw || list[idx].url || '',
            count: scannedFiles.length,
            scannedAt: Date.now(),
            files: scannedFiles.map((f) => ({
              path: f.path,
              name: f.name,
              size: f.size || 0,
            })),
          };
          GithubDirsStore.set(list);
          setSavedDirs(GithubDirsStore.get());
        }

        let msg = `${scannedFiles.length} fichier(s) Markdown trouvé(s).`;
        if (tree.truncated) {
          msg += ' (arbre tronqué par GitHub: certains fichiers peuvent manquer)';
        }
        setStatus(msg);
      } catch (err: unknown) {
        const msg = (err as Error)?.message || 'Erreur lors du scan GitHub';
        setStatus(msg);
        setIsError(true);
      } finally {
        setIsLoading(false);
      }
    },
    [lastInput]
  );

  const openFile = useCallback(
    async (target: number | GitHubFile | string): Promise<File | null> => {
      let f: GitHubFile | undefined;
      if (typeof target === 'number') {
        f = files[target];
      } else if (typeof target === 'string') {
        f = files.find((item) => item.path === target) || {
          path: target,
          name: target.split('/').pop() || target,
          size: 0,
        };
      } else {
        f = target;
      }

      if (!f || !currentRepo) {
        setStatus('Aucun fichier ou dépôt sélectionné');
        setIsError(true);
        return null;
      }

      const { owner, repo, ref } = currentRepo;
      const seg = f.path.split('/').map(encodeURIComponent).join('/');
      const refPath = String(ref).split('/').map(encodeURIComponent).join('/');
      const url = `https://raw.githubusercontent.com/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/${refPath}/${seg}`;

      setIsLoading(true);
      setIsError(false);
      setStatus(`Chargement de ${f.name}...`);

      try {
        const res = await fetch(url);
        if (!res.ok) {
          throw new Error(`Échec du téléchargement (${res.status})`);
        }
        const text = await res.text();
        const file = new File([text], f.name, { type: 'text/markdown' });

        if (options?.onOpenFile) {
          await options.onOpenFile(file);
        }

        setStatus(`Ouvert: ${f.name}`);
        return file;
      } catch (err: unknown) {
        const msg = (err as Error)?.message || "Erreur lors de l'ouverture";
        setStatus(msg);
        setIsError(true);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [files, currentRepo, options]
  );

  const saveCurrentDirectory = useCallback(() => {
    if (!currentRepo || !files.length) return;
    const curKey = keyOf(currentRepo);
    const list = GithubDirsStore.get();
    const idx = list.findIndex((d) => keyOf(d) === curKey);

    const defaultUrl = `${currentRepo.owner}/${currentRepo.repo}${
      currentRepo.ref ? '@' + currentRepo.ref : ''
    }${currentRepo.path ? '/' + currentRepo.path : ''}`;

    const entry: SavedDir = {
      id:
        idx >= 0
          ? list[idx].id
          : `dir_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
      owner: currentRepo.owner,
      repo: currentRepo.repo,
      ref: currentRepo.ref,
      path: currentRepo.path,
      url: lastInput || defaultUrl,
      count: files.length,
      scannedAt: Date.now(),
      files: files.map((f) => ({ path: f.path, name: f.name, size: f.size || 0 })),
    };

    if (idx >= 0) {
      list[idx] = entry;
    } else {
      list.unshift(entry);
    }

    if (list.length > 12) {
      list.length = 12;
    }

    GithubDirsStore.set(list);
    setSavedDirs(GithubDirsStore.get());
  }, [currentRepo, files, lastInput]);

  const refreshSavedDir = useCallback(
    async (id: string): Promise<void> => {
      const dir = savedDirs.find((d) => d.id === id) || GithubDirsStore.find(id);
      if (!dir) return;
      const url =
        dir.url ||
        `${dir.owner}/${dir.repo}${dir.path ? '/' + dir.path : ''}`;
      await scan(url);
    },
    [savedDirs, scan]
  );

  const loadSavedDir = useCallback(
    (id: string) => {
      const dir = savedDirs.find((d) => d.id === id) || GithubDirsStore.find(id);
      if (!dir) return;

      if (!dir.files || dir.files.length === 0) {
        void refreshSavedDir(id);
        return;
      }

      const current: GitHubRepoInfo = {
        owner: dir.owner,
        repo: dir.repo,
        ref: dir.ref,
        path: dir.path,
      };

      const inputUrl =
        dir.url ||
        `${dir.owner}/${dir.repo}${dir.ref ? '@' + dir.ref : ''}${
          dir.path ? '/' + dir.path : ''
        }`;

      setCurrentRepo(current);
      setLastInput(inputUrl);
      setFiles(
        dir.files.map((f) => ({
          path: f.path,
          name: f.name,
          size: f.size || 0,
        }))
      );
      setIsError(false);
      setStatus(
        `${dir.files.length} fichier(s) (scan du ${new Date(
          dir.scannedAt
        ).toLocaleString('fr-FR')})`
      );
    },
    [savedDirs, refreshSavedDir]
  );

  const removeSavedDir = useCallback((id: string) => {
    GithubDirsStore.remove(id);
    setSavedDirs(GithubDirsStore.get());
  }, []);

  return {
    currentRepo,
    files,
    isLoading,
    status,
    isError,
    savedDirs,
    lastInput,
    setLastInput,
    isCurrentSaved,
    scan,
    openFile,
    saveCurrentDirectory,
    refreshSavedDir,
    loadSavedDir,
    removeSavedDir,
  };
}

export const useGithubBrowser = useGitHubBrowser;
export default useGitHubBrowser;
