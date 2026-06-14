import { useCallback, useEffect, useRef, useState } from 'react';
import { useNurseIntakeAPI } from './hooks/useNurseIntakeAPI';
import { useKeywordDetector } from './hooks/useKeywordDetector';
import { useSpeechRecognition } from './hooks/useSpeechRecognition';
import { clearStorageState, createStoredNote, loadStorageState, saveStorageState } from './lib/localStorage';
import { HistoryList } from './components/HistoryList';
import { KeywordsPanel } from './components/KeywordsPanel';
import { RecordControls } from './components/RecordControls';
import { StatusCard } from './components/StatusCard';
import type { StoredNote } from './types';
import type { IntakeResponse } from './hooks/useNurseIntakeAPI';

const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true';
const keywordList = ['保存', '終了', '修正', '確認', '次へ', '緊急'];
type ResultTab = 'soap' | 'structured' | 'followup' | 'urgency' | 'raw';

function App() {
  const [storageState, setStorageState] = useState(loadStorageState);
  const [noteText, setNoteText] = useState(storageState.lastNote);
  const [patientName, setPatientName] = useState(storageState.patientName);
  const [currentTitle, setCurrentTitle] = useState(storageState.currentTitle);
  const [statusMessage, setStatusMessage] = useState('音声またはテキストで入力してください');
  const [activeTab, setActiveTab] = useState<ResultTab>('soap');
  const [inputMode, setInputMode] = useState<'voice' | 'text'>('text');
  const lastFinalRef = useRef('');

  const { available, isLoading, result, error, postIntake } = useNurseIntakeAPI();

  const handleSave = useCallback(() => {
    const note = createStoredNote({
      patientName: patientName || '未設定の患者',
      title: currentTitle || '新規記録',
      content: noteText || '（記録なし）',
    });
    const nextState = {
      ...storageState,
      notes: [note, ...storageState.notes],
      lastNote: noteText,
      patientName,
      currentTitle,
    };
    setStorageState(nextState);
    saveStorageState(nextState);
    setStatusMessage('記録を保存しました');
  }, [currentTitle, noteText, patientName, storageState]);

  const handleRecall = useCallback((note: StoredNote) => {
    setNoteText(note.content);
    setPatientName(note.patientName);
    setCurrentTitle(note.title);
    setStatusMessage('保存済み記録を読み込みました');
  }, []);

  const handleDelete = useCallback((noteId: string) => {
    const nextState = {
      ...storageState,
      notes: storageState.notes.filter((n) => n.id !== noteId),
    };
    setStorageState(nextState);
    saveStorageState(nextState);
    setStatusMessage('記録を削除しました');
  }, [storageState]);

  const handleClearAll = useCallback(() => {
    clearStorageState();
    setStorageState({ lastNote: '', patientName: '', currentTitle: '新規記録', notes: [], keywordFilters: [] });
    setStatusMessage('全データを削除しました');
  }, []);

  const { start, stop, reset, supported, status, interimTranscript, finalTranscript } = useSpeechRecognition({
    onResult: (finalText: string, interimText: string) => {
      const delta = finalText.slice(lastFinalRef.current.length);
      if (delta) {
        setNoteText((current) => `${current}${delta}`.trimStart());
        lastFinalRef.current = finalText;
        setInputMode('voice');
      }
      if (interimText) setStatusMessage('音声認識中: ' + interimText);
    },
    onError: () => setStatusMessage('音声認識にエラーが発生しました'),
  });

  const { matchedKeywords, lastDetectedKeyword } = useKeywordDetector(noteText, {
    keywords: keywordList,
    onDetect: (keyword: string) => {
      setStatusMessage(`キーワード検出: ${keyword}`);
      if (keyword.includes('保存')) handleSave();
      if (keyword.includes('終了')) stop();
    },
  });

  useEffect(() => {
    saveStorageState({ ...storageState, lastNote: noteText, patientName, currentTitle, notes: storageState.notes });
  }, [noteText, patientName, currentTitle, storageState]);

  const handleGenerate = useCallback(async () => {
    if (!noteText.trim()) {
      setStatusMessage('テキストを入力してください');
      return;
    }
    try {
      setStatusMessage('AI処理中...');
      await postIntake(noteText, inputMode);
      setStatusMessage('AI整理が完了しました');
      setActiveTab('soap');
    } catch {
      setStatusMessage('AI処理に失敗しました');
    }
  }, [noteText, inputMode, postIntake]);

  const tabs: { key: ResultTab; label: string }[] = [
    { key: 'soap',       label: 'SOAP下書き' },
    { key: 'structured', label: '構造化情報' },
    { key: 'followup',   label: '追加問診' },
    { key: 'urgency',    label: '優先度' },
    { key: 'raw',        label: '元メモ' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">

        <header className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-bold text-slate-900">Nurselink Prototype</h1>
          <p className="mt-2 rounded-xl bg-amber-50 border border-amber-200 px-4 py-2 text-sm text-amber-800">
            ⚠️ デモ用システムです。実患者の個人情報は入力しないでください。AI出力は診断ではありません。
          </p>
          {DEMO_MODE && (
            <p className="mt-2 text-xs text-slate-400">デモモード: データはこの端末のみに一時保存されます</p>
          )}
        </header>

        <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
          <div className="space-y-6">

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm font-semibold text-slate-700">患者ID／仮名</span>
                  <input
                    value={patientName}
                    onChange={(e) => setPatientName(e.target.value)}
                    placeholder="例: 患者A、ID-001（実名不可）"
                    className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm"
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-semibold text-slate-700">記録タイトル</span>
                  <input
                    value={currentTitle}
                    onChange={(e) => setCurrentTitle(e.target.value)}
                    placeholder="例: 朝の巡回、入院時"
                    className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm"
                  />
                </label>
              </div>
              <div className="mt-6">
                <RecordControls
                  isListening={status === 'listening'}
                  onStart={() => { setInputMode('voice'); start(); }}
                  onStop={stop}
                  onClear={() => { setNoteText(''); lastFinalRef.current = ''; reset(); setStatusMessage('クリアしました'); }}
                  onSave={handleSave}
                />
                {!supported && (
                  <p className="mt-2 text-xs text-amber-600">⚠️ このブラウザは音声入力非対応です。Chrome/Edgeを推奨します。テキスト入力は使えます。</p>
                )}
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="grid gap-4 sm:grid-cols-2">
                <StatusCard title="認識状態">
                  {!supported ? '非対応' : status === 'listening' ? '録音中' : status === 'paused' ? '一時停止' : status === 'error' ? 'エラー' : '待機中'}
                </StatusCard>
                <StatusCard title="ステータス">{statusMessage}</StatusCard>
              </div>
              {status === 'listening' && (
                <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm italic text-slate-500">
                  {interimTranscript || '音声を認識しています...'}
                </div>
              )}
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-slate-900">入力メモ</h2>
                <span className="text-xs text-slate-400">入力モード: {inputMode === 'voice' ? '🎤 音声' : '⌨️ テキスト'}</span>
              </div>
              <textarea
                value={noteText}
                onChange={(e) => { setNoteText(e.target.value); setInputMode('text'); }}
                placeholder="音声入力またはテキストで患者の訴えを入力..."
                rows={8}
                className="mt-4 w-full rounded-3xl border border-slate-300 bg-slate-50 p-4 text-sm shadow-sm"
              />
              <div className="mt-4 flex gap-3">
                <button
                  onClick={handleGenerate}
                  disabled={!noteText.trim() || isLoading}
                  className="rounded-2xl bg-blue-600 px-6 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {isLoading ? 'AI処理中...' : 'AIで整理する'}
                </button>
                {DEMO_MODE && (
                  <button
                    onClick={handleClearAll}
                    className="rounded-2xl border border-red-200 px-4 py-2 text-sm text-red-600"
                  >
                    全データ削除
                  </button>
                )}
              </div>
            </section>

            {(result || error) && (
              <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-1 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                  ⚠️ このAI出力は記録補助です。診断・トリアージの代替ではありません。緊急時は院内の緊急対応フローを使用してください。
                </div>
                {result?.parse_error && (
                  <p className="mt-2 text-xs text-red-600">AI整形に失敗しました。元テキストを保存しました。</p>
                )}
                <div className="mt-3 flex gap-2 flex-wrap">
                  {tabs.map((t) => (
                    <button
                      key={t.key}
                      onClick={() => setActiveTab(t.key)}
                      className={`rounded-full px-4 py-1 text-sm font-medium transition-colors ${activeTab === t.key ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
                <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-800 whitespace-pre-wrap min-h-[120px]">
                  {activeTab === 'soap' && (result?.soap_text || '（データなし）')}
                  {activeTab === 'structured' && (result?.structured ? JSON.stringify(result.structured, null, 2) : '（データなし）')}
                  {activeTab === 'followup' && (result?.followup_questions?.length ? result.followup_questions.map((q, i) => `${i + 1}. ${q}`).join('\n') : '（データなし）')}
                  {activeTab === 'urgency' && result?.urgency && (
                    `優先度: ${result.urgency.level}\n理由: ${result.urgency.reason ?? 'なし'}\n\n⚠️ これは診断・トリアージの代替ではありません。最終判断は医療従事者が行ってください。`
                  )}
                  {activeTab === 'urgency' && !result?.urgency && '（データなし）'}
                  {activeTab === 'raw' && (noteText || '（データなし）')}
                </div>
                {error && <p className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
              </section>
            )}

          </div>

          <div className="space-y-6">
            <KeywordsPanel detected={matchedKeywords} lastKeyword={lastDetectedKeyword} />
            <HistoryList notes={storageState.notes} onRecall={handleRecall} onDelete={handleDelete} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
