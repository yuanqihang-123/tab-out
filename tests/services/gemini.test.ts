import { describe, expect, it, vi } from 'vitest';
import { GeminiService } from '@/services/gemini';
import { createFakeBrowser } from '../helpers/fake-browser';

describe('GeminiService', () => {
  it('does not open a page for blank input', async () => {
    const browser = createFakeBrowser();
    const launch = vi.spyOn(browser, 'openGeminiPrompt');
    expect(await new GeminiService(browser).ask('   ')).toBe('empty');
    expect(launch).not.toHaveBeenCalled();
  });
  it('preserves the prompt and reports injection failure without throwing', async () => {
    const browser = createFakeBrowser();
    const launch = vi.spyOn(browser, 'openGeminiPrompt').mockRejectedValue(new Error('permission denied'));
    expect(await new GeminiService(browser).ask(' 中文 <b> ')).toBe('failed');
    expect(launch).toHaveBeenCalledWith('中文 <b>');
  });
});
