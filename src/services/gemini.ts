/** Validates questions and delegates page delivery through the browser seam. */
import type { BrowserTabs } from '../platform/browser';
import type { GeminiAskResult } from '../types/gemini';
import { planGeminiPrompt } from '../core/gemini';

export class GeminiService {
  constructor(private readonly browser: BrowserTabs) {}

  async ask(text: string): Promise<GeminiAskResult> {
    const plan = planGeminiPrompt(text);
    if (plan.kind !== 'open') return plan.kind;
    try {
      return await this.browser.openGeminiPrompt(plan.prompt);
    } catch {
      return 'failed';
    }
  }
}
