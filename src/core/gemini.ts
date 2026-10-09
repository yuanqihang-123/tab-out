/** Pure validation for the dashboard's Gemini form. */
export const GEMINI_APP_URL = 'https://gemini.google.com/app';
export const MAX_GEMINI_PROMPT_LENGTH = 6000;

export function planGeminiPrompt(text: string):
  | { kind: 'open'; prompt: string }
  | { kind: 'empty' | 'too-long' } {
  const prompt = text.trim();
  if (!prompt) return { kind: 'empty' };
  if (prompt.length > MAX_GEMINI_PROMPT_LENGTH) return { kind: 'too-long' };
  return { kind: 'open', prompt };
}
