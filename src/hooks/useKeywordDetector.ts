import { useEffect, useMemo, useState } from 'react';

export interface KeywordDetectorResult {
  matchedKeywords: string[];
  lastDetectedKeyword?: string;
  detections: string[];
}

export interface KeywordDetectorOptions {
  keywords: string[];
  onDetect?: (keyword: string) => void;
  matchCaseSensitive?: boolean;
}

export const useKeywordDetector = (
  transcript: string,
  options: KeywordDetectorOptions
): KeywordDetectorResult => {
  const normalizedInput = options.matchCaseSensitive ? transcript : transcript.toLowerCase();
  const keywordMap = useMemo(
    () => options.keywords.map((keyword) => options.matchCaseSensitive ? keyword : keyword.toLowerCase()),
    [options.keywords, options.matchCaseSensitive]
  );

  const [detections, setDetections] = useState<string[]>([]);
  const [lastDetectedKeyword, setLastDetectedKeyword] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!transcript.trim()) return;
    const newMatches = keywordMap.filter((keyword) => normalizedInput.includes(keyword));
    if (newMatches.length > 0) {
      const unique = Array.from(new Set(newMatches));
      const fresh = unique.filter((keyword) => !detections.includes(keyword));
      if (fresh.length > 0) {
        setDetections((prev) => [...prev, ...fresh]);
        setLastDetectedKeyword(fresh[fresh.length - 1]);
        fresh.forEach((keyword) => options.onDetect?.(keyword));
      }
    }
  }, [normalizedInput, detections, keywordMap, options]);

  return {
    matchedKeywords: detections,
    lastDetectedKeyword,
    detections
  };
};
