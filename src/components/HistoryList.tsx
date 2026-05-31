import type { StoredNote } from '../types';

interface HistoryListProps {
  notes: StoredNote[];
  onRecall: (note: StoredNote) => void;
  onDelete: (noteId: string) => void;
}

export const HistoryList = ({ notes, onRecall, onDelete }: HistoryListProps) => (
  <div className="space-y-3">
    <div className="flex items-center justify-between gap-4">
      <h3 className="text-base font-semibold text-slate-900">保存済みの記録</h3>
      <span className="text-sm text-slate-500">{notes.length} 件</span>
    </div>
    <div className="grid gap-3">
      {notes.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-600">
          保存した看護記録がありません。
        </div>
      ) : (
        notes.map((note) => (
          <div
            key={note.id}
            className="group flex items-start gap-2 rounded-3xl border border-slate-200 bg-white p-4 transition hover:border-primary"
          >
            <button
              type="button"
              onClick={() => onRecall(note)}
              className="flex-1 text-left"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{note.title}</p>
                  <p className="text-xs text-slate-500">{note.patientName}</p>
                </div>
                <p className="text-xs text-slate-500">{new Date(note.createdAt).toLocaleString('ja-JP')}</p>
              </div>
              <p className="mt-3 max-h-20 overflow-hidden text-sm text-slate-700">{note.content}</p>
            </button>
            <button
              type="button"
              onClick={() => {
                if (confirm(`「${note.title}」を削除しますか？`)) {
                  onDelete(note.id);
                }
              }}
              className="mt-2 rounded-xl bg-red-50 px-2 py-1 text-xs font-semibold text-red-700 opacity-0 transition hover:bg-red-100 group-hover:opacity-100"
            >
              削除
            </button>
          </div>
        ))
      )}
    </div>
  </div>
);
