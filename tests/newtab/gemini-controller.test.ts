// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { renderGeminiForm } from '@/ui/render/gemini';
import { attachGeminiForm } from '@/newtab/gemini-controller';
import { GeminiService } from '@/services/gemini';
import { createFakeBrowser } from '../helpers/fake-browser';
import type { GeminiDelivery } from '@/types/gemini';

let teardown = () => {};
beforeEach(() => { document.body.innerHTML = renderGeminiForm(); });
afterEach(() => { teardown(); vi.unstubAllGlobals(); });
const input = () => document.getElementById('geminiPrompt') as HTMLInputElement;
const submit = () => document.getElementById('geminiForm')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

it('submits once while delivery is pending and clears only the question that was sent', async () => {
  const browser = createFakeBrowser();
  let resolve!: (result: GeminiDelivery) => void;
  const launch = vi.spyOn(browser, 'openGeminiPrompt').mockReturnValue(new Promise((r) => { resolve = r; }));
  teardown = attachGeminiForm(new GeminiService(browser));
  input().value = 'First question';
  submit();
  submit();
  expect(launch).toHaveBeenCalledOnce();
  input().value = 'Next question';
  resolve('sent');
  await vi.waitFor(() => expect(document.getElementById('geminiStatus')?.textContent).toContain('Question sent'));
  expect(input().value).toBe('Next question');
});

it('preserves and copies the original question after a page/permission failure', async () => {
  const browser = createFakeBrowser();
  vi.spyOn(browser, 'openGeminiPrompt').mockResolvedValue('failed');
  const writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
  teardown = attachGeminiForm(new GeminiService(browser));
  input().value = '中文 <literal markup>';
  submit();
  const copy = document.getElementById('geminiCopy') as HTMLButtonElement;
  await vi.waitFor(() => expect(copy.hidden).toBe(false));
  expect(input().value).toBe('中文 <literal markup>');
  copy.click();
  await vi.waitFor(() => expect(writeText).toHaveBeenCalledWith('中文 <literal markup>'));
});

it('does not send when Enter is used to finish Chinese IME composition', () => {
  const browser = createFakeBrowser();
  const launch = vi.spyOn(browser, 'openGeminiPrompt');
  teardown = attachGeminiForm(new GeminiService(browser));
  input().value = '中文';
  input().dispatchEvent(new CompositionEvent('compositionstart'));
  const key = new KeyboardEvent('keydown', { key: 'Enter', isComposing: true, cancelable: true });
  input().dispatchEvent(key);
  expect(key.defaultPrevented).toBe(true);
  submit();
  expect(launch).not.toHaveBeenCalled();
});
