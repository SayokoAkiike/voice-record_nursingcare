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

export const useNurseIntakeAPI = (): UseNurseIntakeAPIResult => {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult]       = useState<IntakeResponse | undefined>();
  const [error, setError]         = useState<string | undefined>();

  const available = Boolean(API_BASE);

  const postIntake = useCallback(
    async (text: string, mode: 'voice' | 'text' = 'text'): Promise<IntakeResponse> => {
      setIsLoading(true);
      setError(undefined);

      try {
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
