import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionStatic;
    webkitSpeechRecognition?: SpeechRecognitionStatic;
  }

  interface SpeechRecognitionErrorEvent extends Event {
    readonly error: string;
    readonly message: string;
  }

  interface SpeechRecognitionResult {
    readonly isFinal: boolean;
    readonly [index: number]: SpeechRecognitionAlternative;
    readonly length: number;
  }

  interface SpeechRecognitionAlternative {
    readonly transcript: string;
    readonly confidence: number;
  }

  interface SpeechRecognitionResultList {
    readonly length: number;
    readonly [index: number]: SpeechRecognitionResult;
  }

  interface SpeechRecognitionEvent extends Event {
    readonly resultIndex: number;
    readonly results: SpeechRecognitionResultList;
  }

  interface SpeechRecognition extends EventTarget {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    maxAlternatives: number;
    onresult: ((event: SpeechRecognitionEvent) => void) | null;
    onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
    onend: (() => void) | null;
    start(): void;
    stop(): void;
  }

  interface SpeechRecognitionStatic {
    prototype: SpeechRecognition;
    new (): SpeechRecognition;
  }
}

export interface SpeechRecognitionState {
  supported: boolean;
  status: 'idle' | 'listening' | 'paused' | 'error';
  interimTranscript: string;
  finalTranscript: string;
  errorMessage?: string;
}

export interface UseSpeechRecognitionOptions {
  lang?: string;
  onResult?: (finalText: string, interimText: string) => void;
  onError?: (error: SpeechRecognitionErrorEvent) => void;
}

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000';
const API_KEY = import.meta.env.VITE_APP_API_KEY ?? '';
const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true';

const getSpeechRecognitionConstructor = (): SpeechRecognitionStatic | null => {
  const win = window as any;
  return win.SpeechRecognition || win.webkitSpeechRecognition || null;
};

const getBestAudioMimeType = (): string | undefined => {
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
    'audio/mpeg',
  ];

  if (typeof MediaRecorder === 'undefined' || !MediaRecorder.isTypeSupported) {
    return undefined;
  }

  return candidates.find((mimeType) => MediaRecorder.isTypeSupported(mimeType));
};

const getFileExtension = (mimeType?: string): string => {
  if (!mimeType) return 'webm';
  if (mimeType.includes('mp4')) return 'm4a';
  if (mimeType.includes('mpeg')) return 'mp3';
  return 'webm';
};

const createErrorEvent = (error: string, message: string) => ({
  error,
  message,
} as SpeechRecognitionErrorEvent);

export const useSpeechRecognition = (options: UseSpeechRecognitionOptions = {}) => {
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const finalTranscriptRef = useRef('');

  const [supported, setSupported] = useState(true);
  const [status, setStatus] = useState<SpeechRecognitionState['status']>('idle');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [finalTranscript, setFinalTranscript] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);

  const updateTranscripts = useCallback(
    (finalText: string, interimText: string) => {
      finalTranscriptRef.current = finalText;
      setFinalTranscript(finalText);
      setInterimTranscript(interimText);
      options.onResult?.(finalText, interimText);
    },
    [options]
  );

  const cleanupMediaStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  const transcribeAudio = useCallback(
    async (audioBlob: Blob, mimeType?: string) => {
      if (DEMO_MODE) {
        throw new Error('音声文字起こしにはバックエンド接続が必要です。テキスト入力でデモを確認してください。');
      }

      const extension = getFileExtension(mimeType);
      const formData = new FormData();
      formData.append('file', audioBlob, `voice-note.${extension}`);

      const res = await fetch(`${API_BASE}/api/transcribe`, {
        method: 'POST',
        headers: {
          'X-App-API-Key': API_KEY,
        },
        body: formData,
      });

      if (!res.ok) {
        throw new Error(`文字起こしAPIエラー: ${res.status}`);
      }

      const data = await res.json() as { text?: string };
      return (data.text ?? '').trim();
    },
    []
  );

  const reset = useCallback(() => {
    finalTranscriptRef.current = '';
    setInterimTranscript('');
    setFinalTranscript('');
    setErrorMessage(undefined);
    setStatus('idle');
  }, []);

  const stop = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }

    setStatus('paused');
  }, []);

  const startServerRecording = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setSupported(false);
      setErrorMessage('このブラウザでは音声録音に対応していません');
      setStatus('error');
      options.onError?.(createErrorEvent('unsupported', 'MediaRecorder is not available'));
      return;
    }

    try {
      chunksRef.current = [];
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = getBestAudioMimeType();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onerror = () => {
        const message = '録音中にエラーが発生しました';
        setErrorMessage(message);
        setStatus('error');
        cleanupMediaStream();
        options.onError?.(createErrorEvent('recording-error', message));
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: mimeType || 'audio/webm' });
        cleanupMediaStream();

        try {
          setInterimTranscript('文字起こし中...');
          const text = await transcribeAudio(audioBlob, mimeType);
          const nextFinal = `${finalTranscriptRef.current}${text}`.trimStart();
          updateTranscripts(nextFinal, '');
          setStatus('paused');
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          setErrorMessage(message);
          setStatus('error');
          options.onError?.(createErrorEvent('transcription-error', message));
        }
      };

      recorder.start();
      setStatus('listening');
      setErrorMessage(undefined);
      setInterimTranscript('録音中です。停止すると文字起こしします。');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setErrorMessage(`録音開始エラー: ${message}`);
      setStatus('error');
      cleanupMediaStream();
      options.onError?.(createErrorEvent('permission-error', message));
    }
  }, [cleanupMediaStream, options, transcribeAudio, updateTranscripts]);

  const start = useCallback(() => {
    const SpeechRecognition = getSpeechRecognitionConstructor();

    if (!SpeechRecognition) {
      void startServerRecording();
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = options.lang || 'ja-JP';
      recognition.maxAlternatives = 1;

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let interim = '';
        let final = finalTranscriptRef.current;
        for (let i = event.resultIndex; i < event.results.length; i += 1) {
          const transcript = event.results[i][0]?.transcript || ' ';
          if (event.results[i].isFinal) {
            final += transcript;
          } else {
            interim += transcript;
          }
        }
        updateTranscripts(final, interim);
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        const errorCode = event?.error || 'unknown';
        const errorMsg = `音声認識エラー: ${errorCode}`;
        console.error('[SpeechRecognition]', errorMsg, event);

        // Safari (and some other browsers) expose webkitSpeechRecognition
        // but then fail it with "not-allowed"/"service-not-allowed" even
        // when microphone access itself is fine, or refuse to run it at
        // all ("audio-capture", "network"). In those cases, fall back to
        // recording locally and sending the audio to the backend instead
        // of just giving up.
        const shouldFallBackToServerRecording = [
          'not-allowed',
          'service-not-allowed',
          'audio-capture',
          'network',
        ].includes(errorCode);

        if (shouldFallBackToServerRecording) {
          console.warn('[SpeechRecognition] Falling back to server-side recording after error:', errorCode);
          void startServerRecording();
          return;
        }

        setErrorMessage(errorMsg);
        setStatus('error');
        options.onError?.(event);
      };

      recognition.onend = () => {
        console.log('[SpeechRecognition] onend called');
        setStatus('paused');
      };

      console.log('[SpeechRecognition] Starting recognition with lang:', options.lang || 'ja-JP');
      recognition.start();
      setStatus('listening');
      setErrorMessage(undefined);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('[SpeechRecognition] Exception:', message, error);
      setErrorMessage(`初期化エラー: ${message}`);
      setStatus('error');
    }
  }, [options, startServerRecording, updateTranscripts]);

  useEffect(() => {
    const SpeechRecognition = getSpeechRecognitionConstructor();
    const hasServerRecordingFallback = Boolean(navigator.mediaDevices?.getUserMedia) && typeof MediaRecorder !== 'undefined';

    if (!SpeechRecognition && !hasServerRecordingFallback) {
      setSupported(false);
      setStatus('error');
      setErrorMessage('SpeechRecognition and MediaRecorder are not available');
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }

      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }

      cleanupMediaStream();
    };
  }, [cleanupMediaStream]);

  const workingStatus = useMemo(
    () => ({ supported, status, interimTranscript, finalTranscript, errorMessage }),
    [supported, status, interimTranscript, finalTranscript, errorMessage]
  );

  return {
    start,
    stop,
    reset,
    ...workingStatus
  };
};
