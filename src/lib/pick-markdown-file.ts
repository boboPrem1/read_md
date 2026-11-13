import { ACCEPTED_EXTENSIONS, MARKDOWN_PICKER_TYPES } from './constants';

export interface PickedMarkdownFile {
  file: File;
  handle: FileSystemFileHandle | null;
}

export async function pickMarkdownFile(): Promise<PickedMarkdownFile | null> {
  if (typeof window !== 'undefined' && 'showOpenFilePicker' in window) {
    try {
      const [handle] = await (window as unknown as {
        showOpenFilePicker: (options: unknown) => Promise<FileSystemFileHandle[]>;
      }).showOpenFilePicker({
        types: MARKDOWN_PICKER_TYPES,
        excludeAcceptAllOption: false,
      });
      if (!handle) return null;
      return { file: await handle.getFile(), handle };
    } catch (err: unknown) {
      if (err && (err as { name?: string }).name === 'AbortError') return null;
    }
  }
  return pickWithInput();
}

function pickWithInput(): Promise<PickedMarkdownFile | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = ACCEPTED_EXTENSIONS.join(',');
    const finish = (file: File | null) => {
      input.remove();
      resolve(file ? { file, handle: null } : null);
    };
    input.addEventListener('change', () => finish(input.files?.[0] ?? null), { once: true });
    input.addEventListener('cancel', () => finish(null), { once: true });
    input.click();
  });
}
