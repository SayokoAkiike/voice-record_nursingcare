export type SpeechStatus = 'idle' | 'listening' | 'paused' | 'error';

export interface StoredNote {
  id: string;
  createdAt: string;
  patientName: string;
  title: string;
  content: string;
}

export interface StorageState {
  lastNote: string;
  patientName: string;
  currentTitle: string;
  notes: StoredNote[];
  keywordFilters: string[];
}
