interface ClaudePanelProps {
  transcription: string;
  output?: string;
  isLoading: boolean;
  error?: string;
  onGenerate: () => void;
}

export const ClaudePanel = ({ transcription, output, isLoading, error, onGenerate }: ClaudePanelProps) => (
  <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 className="text-sm font-semibold text-slate-700">AIで記録を整形</h2>
        <p className="mt-1 text-xs text-slate-500">Anthropic Claude API を使って内容を要約・整形します。</p>
      </div>
      <button
        type="button"
        onClick={onGenerate}
        disabled={!transcription || isLoading}
        className="rounded-2xl bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
      >
        {isLoading ? '生成中...' : 'AIで整形'}
      </button>
    </div>

    <div className="mt-4 space-y-3 text-sm text-slate-700">
      <p className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        {transcription || '音声入力した記録をもとにAI整形を実行できます。'}
      </p>
      {error ? <p className="rounded-2xl border border-red-200 bg-red-50 p-3 text-red-700">{error}</p> : null}
      {output ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <h3 className="text-sm font-semibold text-slate-800">AI出力</h3>
          <p className="mt-2 whitespace-pre-line text-slate-800">{output}</p>
        </div>
      ) : null}
    </div>
  </section>
);
