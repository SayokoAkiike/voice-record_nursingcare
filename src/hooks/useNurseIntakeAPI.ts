import { useCallback, useState } from 'react';

export interface IntakeRequest {
  input_text: string;
  input_mode: 'voice' | 'text';
  prompt_version?: string;
}

export interface IntakeResponse {
  case_id: number;
  output_id: number;
  structured?: Record<string, unknown>;
  soap_text?: string;
  followup_questions: string[];
  urgency?: {
    level: string;
    score: number;
    reason?: string;
  };
  parse_error?: string;
  safety_notice: string;
}

export interface UseNurseIntakeAPIResult {
  available: boolean;
  isLoading: boolean;
  result?: IntakeResponse;
  error?: string;
  postIntake: (text: string, mode?: 'voice' | 'text') => Promise<IntakeResponse>;
}

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000';
const API_KEY  = import.meta.env.VITE_APP_API_KEY  ?? '';
const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true';

const sleep = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

const createDemoResponse = (text: string, mode: 'voice' | 'text'): IntakeResponse => {
  const normalizedText = text.trim();
  const hasPain = /痛|疼痛|pain/i.test(normalizedText);
  const hasFever = /熱|発熱|体温|fever/i.test(normalizedText);
  const hasFallRisk = /転倒|ふらつ|めまい|立てない|fall|dizzy/i.test(normalizedText);

  const symptoms = [
    hasPain ? '疼痛の訴え' : undefined,
    hasFever ? '発熱の可能性' : undefined,
    hasFallRisk ? '転倒リスクに関連する訴え' : undefined,
  ].filter(Boolean);

  const urgencyScore = hasFallRisk ? 0.82 : hasFever ? 0.62 : hasPain ? 0.48 : 0.32;
  const urgencyLevel = urgencyScore >= 0.8 ? '高' : urgencyScore >= 0.6 ? '中' : '低';

  return {
    case_id: Date.now(),
    output_id: Date.now() + 1,
    structured: {
      input_mode: mode,
      chief_complaint: normalizedText,
      detected_items: symptoms.length ? symptoms : ['自由記述メモ'],
      note: 'デモモードのため、実際のAI推論ではなくサンプル整形結果です。',
    },
    soap_text: [
      `【S】${normalizedText || '患者より訴えあり。'}`,
      '【O】音声またはテキスト入力から記録候補を作成。バイタル・観察所見は未入力。',
      `【A】${symptoms.length ? symptoms.join('、') : '現時点では詳細確認が必要'}。※診断ではなく記録補助`,
      '【P】追加問診、必要時の観察、担当看護師による内容確認を行う。',
    ].join('\n'),
    followup_questions: [
      'いつから症状がありますか？',
      '症状の強さや変化はありますか？',
      '歩行・移動時の不安や介助希望はありますか？',
    ],
    urgency: {
      level: urgencyLevel,
      score: urgencyScore,
      reason: hasFallRisk
        ? '転倒・ふらつきに関連する表現が含まれるため、優先確認が必要です。'
        : 'デモ用の簡易判定です。最終判断は医療従事者が行ってください。',
    },
    safety_notice: 'このAI出力は看護記録作成を支援する参考情報です。診断、治療方針、緊急度判定を代替するものではありません。',
  };
};

export const useNurseIntakeAPI = (): UseNurseIntakeAPIResult => {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult]       = useState<IntakeResponse | undefined>();
  const [error, setError]         = useState<string | undefined>();

  const available = DEMO_MODE || Boolean(API_BASE);

  const postIntake = useCallback(
    async (text: string, mode: 'voice' | 'text' = 'text'): Promise<IntakeResponse> => {
      setIsLoading(true);
      setError(undefined);

      try {
        if (DEMO_MODE) {
          await sleep(600);
          const demoData = createDemoResponse(text, mode);
          setResult(demoData);
          return demoData;
        }

        const res = await fetch(`${API_BASE}/api/intake`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-App-API-Key': API_KEY,
          },
          body: JSON.stringify({
            input_text: text,
            input_mode: mode,
          } satisfies IntakeRequest),
        });

        if (!res.ok) {
          const msg = `APIエラー: ${res.status}`;
          setError(msg);
          throw new Error(msg);
        }

        const data: IntakeResponse = await res.json();
        setResult(data);
        return data;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setError(msg);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  return { available, isLoading, result, error, postIntake };
};