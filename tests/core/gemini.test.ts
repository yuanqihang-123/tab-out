import { describe, expect, it } from 'vitest';
import { planGeminiPrompt, MAX_GEMINI_PROMPT_LENGTH } from '@/core/gemini';

describe('planGeminiPrompt', () => {
  it.each(['', '  \n '])('rejects an empty question', (text) => {
    expect(planGeminiPrompt(text)).toEqual({ kind: 'empty' });
  });
  it('keeps Unicode, newlines and literal markup out of the URL', () => {
    expect(planGeminiPrompt('  中文 & <script>\nsecond line  ')).toEqual({
      kind: 'open', prompt: '中文 & <script>\nsecond line',
    });
  });
  it('rejects questions beyond the form limit', () => {
    expect(planGeminiPrompt('x'.repeat(MAX_GEMINI_PROMPT_LENGTH + 1))).toEqual({ kind: 'too-long' });
  });
});
