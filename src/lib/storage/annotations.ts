import { ANNOTATIONS_KEY } from '../constants';

export type Annotation = { id: number; text: string; color: string; note: string; created: number };

export function loadAnnotations(hash: string): Annotation[] {
  try {
    const all = JSON.parse(localStorage.getItem(ANNOTATIONS_KEY) || '{}') as Record<string, Annotation[]>;
    return all[hash] || [];
  } catch { return []; }
}

export function saveAnnotations(hash: string, annotations: Annotation[]): void {
  try {
    const all = JSON.parse(localStorage.getItem(ANNOTATIONS_KEY) || '{}') as Record<string, Annotation[]>;
    if (annotations.length) all[hash] = annotations;
    else delete all[hash];
    localStorage.setItem(ANNOTATIONS_KEY, JSON.stringify(all));
  } catch { /* ignore */ }
}
