interface KeywordsPanelProps {
  detected: string[];
  lastKeyword?: string;
}

export const KeywordsPanel = ({ detected, lastKeyword }: KeywordsPanelProps) => (
  <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
    <h2 className="text-sm font-semibold text-slate-700">キーワード検出</h2>
    <div className="mt-3 space-y-3 text-sm text-slate-700">
      <p>
        <span className="font-semibold text-slate-800">最後に検出したキーワード:</span>{' '}
        <span className="text-slate-900">{lastKeyword || 'まだ検出されていません'}</span>
      </p>
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
        <p className="text-xs uppercase tracking-[0.16em] text-slate-500">検出履歴</p>
        <p className="mt-2 text-sm text-slate-800">{detected.length > 0 ? detected.join('、') : 'なし'}</p>
      </div>
    </div>
  </section>
);
