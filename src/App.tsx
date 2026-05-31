import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useClaudeAPI } from './hooks/useClaudeAPI';
import { useKeywordDetector } from './hooks/useKeywordDetector';
import { useSpeechRecognition } from './hooks/useSpeechRecognition';
import { createStoredNote, loadStorageState, saveStorageState } from './lib/localStorage';
import { ClaudePanel } from './components/ClaudePanel';
import { HistoryList } from './components/HistoryList';
import { KeywordsPanel } from './components/KeywordsPanel';
import { RecordControls } from './components/RecordControls';
import { StatusCard } from './components/StatusCard';
import type { StoredNote } from './types';

const keywordList = ['保存', '終了', '修正', '確認', '次へ', '患者'];

function App() {
  const [storageState, setStorageState] = useState(loadStorageState);
  const [noteText, setNoteText] = useState(storageState.lastNote);
  const [patientName, setPatientName] = useState(storageState.patientName);
  const [currentTitle, setCurrentTitle] = useState(storageState.currentTitle);
  const [aiOutput, setAiOutput] = useState('');
  const [statusMessage, setStatusMessage] = useState('タブレットChromeで動作する看護記録入力システム');

  const lastFinalRef = useRef('');
  const { available, generateCompletion, isLoading, response, error } = useClaudeAPI();

  const handleSave = useCallback(() => {
    const note = createStoredNote({
      patientName: patientName || '未設定の患者',
      title: currentTitle || '看護記録',
      content: noteText || '（記録なし）'
    });
    const nextState = {
      ...storageState,
      notes: [note, ...storageState.notes],
      lastNote: noteText,
      patientName,
      currentTitle
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
      notes: storageState.notes.filter((n) => n.id !== noteId)
    };
    setStorageState(nextState);
    saveStorageState(nextState);
    setStatusMessage('記録を削除しました');
  }, [storageState]);

  const { start, stop, reset, supported, status, interimTranscript, finalTranscript } = useSpeechRecognition({
    onResult: (finalText: string, interimText: string) => {
      const delta = finalText.slice(lastFinalRef.current.length);
      if (delta) {
        setNoteText((current) => `${current}${delta}`.trimStart());
        lastFinalRef.current = finalText;
      }
      if (interimText) {
        setStatusMessage('音声認識中: ' + interimText);
      }
    },
    onError: () => {
      setStatusMessage('音声認識に問題が発生しました。');
    }
  });

  const { matchedKeywords, lastDetectedKeyword } = useKeywordDetector(noteText, {
    keywords: keywordList,
    onDetect: (keyword: string) => {
      setStatusMessage(`キーワード検出: ${keyword}`);
      if (keyword.includes('保存')) {
        handleSave();
      }
      if (keyword.includes('終了')) {
        stop();
      }
      if (keyword.includes('修正')) {
        setStatusMessage('「修正」が検出されました。メモを編集してください。');
      }
    }
  });

  useEffect(() => {
    saveStorageState({
      ...storageState,
      lastNote: noteText,
      patientName,
      currentTitle,
      notes: storageState.notes
    });
  }, [noteText, patientName, currentTitle, storageState]);

  useEffect(() => {
    if (response) {
      setAiOutput(response);
    }
  }, [response]);

  const handleGenerate = useCallback(async () => {
    if (!available) {
      setStatusMessage('環境変数 VITE_ANTHROPIC_API_KEY が設定されていません');
      return;
    }
    try {
      await generateCompletion(`以下の看護記録を読みやすく整形してください。\n\n${noteText}`);
    } catch {
      // error state is handled by hook
    }
  }, [available, generateCompletion, noteText]);

  const derivedSpeechStatus = useMemo(() => {
    if (!supported) return '非対応';
    if (status === 'listening') return '録音中';
    if (status === 'paused') return '一時停止';
    if (status === 'error') return 'エラー';
    return '待機中';
  }, [supported, status]);

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <header className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-3xl font-bold text-slate-900">看護記録音声入力システム</h1>
          <p className="mt-3 text-slate-600">
            タブレットChrome向けに最適化された、音声入力・キーワード検出・AI整形を備えた看護記録ツール。
          </p>
        </header>

        <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
          <div className="space-y-6">
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm font-semibold text-slate-700">患者名</span>
                  <input
                    value={patientName}
                    onChange={(event) => setPatientName(event.target.value)}
                    placeholder="患者名を入力"
                    className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900"
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-semibold text-slate-700">記録タイトル</span>
                  <input
                    value={currentTitle}
                    onChange={(event) => setCurrentTitle(event.target.value)}
                    placeholder="例: 受診記録、経過"
                    className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900"
                  />
                </label>
              </div>

              <div className="mt-6">
                <RecordControls
                  isListening={status === 'listening'}
                  onStart={start}
                  onStop={stop}
                  onClear={() => {
                    setNoteText('');
                    setStatusMessage('下書きをクリアしました');
                    lastFinalRef.current = '';
                    reset();
                  }}
                  onSave={handleSave}
                />
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="grid gap-4 sm:grid-cols-2">
                <StatusCard title="認識状態">{derivedSpeechStatus}</StatusCard>
                <StatusCard title="最新ステータス">{statusMessage}</StatusCard>
              </div>

              <div className="mt-6 space-y-4">
                <div>
                  <h2 className="text-sm font-semibold text-slate-700">音声認識結果（確定）</h2>
                  <div className="mt-2 min-h-[120px] rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-800">
                    {finalTranscript || 'ここに確定した音声テキストが表示されます。'}
                  </div>
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-slate-700">音声認識結果（仮訳）</h2>
                  <div className="mt-2 min-h-[90px] rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm italic text-slate-500">
                    {interimTranscript || 'リアルタイムの途中結果が表示されます。'}
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-base font-semibold text-slate-900">下書きメモ</h2>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">保存用</span>
              </div>
              <textarea
                value={noteText}
                onChange={(event) => setNoteText(event.target.value)}
                placeholder="音声入力や手動編集で看護記録を残します。"
                rows={12}
                className="mt-4 w-full rounded-3xl border border-slate-300 bg-slate-50 p-4 text-sm text-slate-900 shadow-sm focus:border-primary"
              />
              <p className="mt-3 text-xs text-slate-500">音声認識結果は自動で下書きに反映されます。キーワード検出で保存・終了も自動化できます。</p>
            </section>

            <ClaudePanel
              transcription={noteText}
              output={aiOutput}
              isLoading={isLoading}
              error={error}
              onGenerate={handleGenerate}
            />
          </div>

          <div className="space-y-6">
            <KeywordsPanel detected={matchedKeywords} lastKeyword={lastDetectedKeyword} />
            <StatusCard title="Anthropic APIキー読み込み">{available ? '読み込み済み' : '未設定'}</StatusCard>
            <HistoryList notes={storageState.notes} onRecall={handleRecall} onDelete={handleDelete} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
