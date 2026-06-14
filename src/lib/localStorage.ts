import type { StoredNote, StorageState } from '../types';

const STORAGE_KEY = 'nurse-voice-record-state';
const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true';

const defaultState: StorageState = {
  lastNote: '',
  patientName: '',
  currentTitle: '新規記録',
  notes: [],
  keywordFilters: ['保存', '終了', '修正', '確認', '次へ'],
};

export const loadStorageState = (): StorageState => {
  if (!DEMO_MODE) return defaultState;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState;
    const parsed = JSON.parse(raw) as Partial<StorageState>;
    return {
      ...defaultState,
      ...parsed,
      notes: Array.isArray(parsed.notes) ? parsed.notes : defaultState.notes,
    };
  } catch {
    return defaultState;
  }
};

export const saveStorageState = (state: StorageState): void => {
  if (!DEMO_MODE) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // プライベートブラウジングやクォータ超過時は無視
  }
};

export const clearStorageState = (): void => {
  localStorage.removeItem(STORAGE_KEY);
};

export const createStoredNote = (note: Omit<StoredNote, 'id' | 'createdAt'>): StoredNote => ({
  id: crypto.randomUUID(),
  createdAt: new Date().toISOString(),
  ...note,
});
