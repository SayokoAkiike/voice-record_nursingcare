import { useCallback, useMemo, useState } from 'react';

export interface ClaudeResult {
  response?: string;
  isLoading: boolean;
  error?: string;
}

export interface ClaudeOptions {
  temperature?: number;
  maxTokens?: number;
}

const ANTHROPIC_ENDPOINT = 'https://api.anthropic.com/v1/complete';

const buildPrompt = (input: string) => `\n\nHuman: ${input}\n\nAssistant:`;

export const useClaudeAPI = () => {
  const [response, setResponse] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);

  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY as string | undefined;

  const available = useMemo(() => Boolean(apiKey), [apiKey]);

  const generateCompletion = useCallback(
    async (input: string, options: ClaudeOptions = {}): Promise<string> => {
      setIsLoading(true);
      setError(undefined);
      setResponse(undefined);

      if (!apiKey) {
        const err = 'Anthropic APIキーが設定されていません。';
        setError(err);
        setIsLoading(false);
        throw new Error(err);
      }

      const body = {
        model: 'claude-3.5',
        prompt: buildPrompt(input),
        max_tokens_to_sample: options.maxTokens ?? 1000,
        temperature: options.temperature ?? 0.3,
        stop_sequences: ['\n\nHuman:']
      } as const;

      try {
        const result = await fetch(ANTHROPIC_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey
          },
          body: JSON.stringify(body)
        });

        if (!result.ok) {
          const payload = await result.text();
          const message = `Anthropic APIエラー: ${result.status} ${payload}`;
          setError(message);
          throw new Error(message);
        }

        const payload = await result.json();
        const completionText = payload.completion || payload.result || '';
        setResponse(completionText.trim());
        return completionText.trim();
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [apiKey]
  );

  return {
    available,
    response,
    isLoading,
    error,
    generateCompletion
  } as ClaudeResult & {
    available: boolean;
    generateCompletion: (input: string, options?: ClaudeOptions) => Promise<string>;
  };
};
