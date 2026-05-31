import type { StoredNote, StorageState } from '../types';

const STORAGE_KEY = 'nurse-voice-record-state';

const defaultState: StorageState = {
  lastNote: '',
  patientName: '',
  currentTitle: '看護記録',
  notes: [],
  keywordFilters: ['保存', '終了', '修正', '確認', '次へ']
};

export const loadStorageState = (): StorageState => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState;
    const parsed = JSON.parse(raw) as Partial<StorageState>;
    return {
      ...defaultState,
      ...parsed,
      notes: Array.isArray(parsed.notes) ? parsed.notes : defaultState.notes
    };
  } catch {
    return defaultState;
  }
};

export const saveStorageState = (state: StorageState): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore storage failures on private browsing or quota issues
  }
};

export const createStoredNote = (note: Omit<StoredNote, 'id' | 'createdAt'>): StoredNote => ({
  id: crypto.randomUUID(),
  createdAt: new Date().toISOString(),
  ...note
});
