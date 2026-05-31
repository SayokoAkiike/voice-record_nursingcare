interface RecordControlsProps {
  isListening: boolean;
  onStart: () => void;
  onStop: () => void;
  onClear: () => void;
  onSave: () => void;
}

export const RecordControls = ({
  isListening,
  onStart,
  onStop,
  onClear,
  onSave
}: RecordControlsProps) => (
  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
    <button
      type="button"
      onClick={isListening ? onStop : onStart}
      className={`rounded-2xl px-4 py-3 text-sm font-semibold text-white transition ${
        isListening ? 'bg-slate-600 hover:bg-slate-700' : 'bg-primary hover:bg-blue-700'
      }`}
    >
      {isListening ? '録音停止' : '音声入力開始'}
    </button>
    <button
      type="button"
      onClick={onClear}
      className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-50"
    >
      下書きをクリア
    </button>
    <button
      type="button"
      onClick={onSave}
      className="rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-white hover:bg-blue-600"
    >
      記録を保存
    </button>
  </div>
);
