import { useMemo } from "react";

export type DetectedLanguage = "ru" | "en";

const CYRILLIC_REGEX = /[А-Яа-яЁё]/;

export function detectLanguageCode(input: string): DetectedLanguage {
  if (!input.trim()) return "en";
  return CYRILLIC_REGEX.test(input) ? "ru" : "en";
}

export function useLanguageDetect(input: string): DetectedLanguage {
  return useMemo(() => detectLanguageCode(input), [input]);
}
