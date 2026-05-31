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

const getSpeechRecognitionConstructor = (): SpeechRecognitionStatic | null => {
  const win = window as any;
  return win.SpeechRecognition || win.webkitSpeechRecognition || null;
};

export const useSpeechRecognition = (options: UseSpeechRecognitionOptions = {}) => {
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const [supported, setSupported] = useState(true);
  const [status, setStatus] = useState<SpeechRecognitionState['status']>('idle');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [finalTranscript, setFinalTranscript] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);

  const reset = useCallback(() => {
    setInterimTranscript('');
    setFinalTranscript('');
    setErrorMessage(undefined);
    setStatus('idle');
  }, []);

  const updateTranscripts = useCallback(
    (finalText: string, interimText: string) => {
      setFinalTranscript(finalText);
      setInterimTranscript(interimText);
      options.onResult?.(finalText, interimText);
    },
    [options]
  );

  const stop = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setStatus('paused');
  }, []);

  const start = useCallback(() => {
    const SpeechRecognition = getSpeechRecognitionConstructor();
    if (!SpeechRecognition) {
      setSupported(false);
      setErrorMessage('このブラウザは音声認識に対応していません');
      setStatus('error');
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
        let final = finalTranscript;
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
  }, [options, finalTranscript, updateTranscripts]);

  useEffect(() => {
    const SpeechRecognition = getSpeechRecognitionConstructor();
    if (!SpeechRecognition) {
      setSupported(false);
      setStatus('error');
      setErrorMessage('SpeechRecognition is not available');
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
    };
  }, []);

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
