import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { openGeminiPrompt } from '@/platform/gemini-browser';

type UpdateListener = (id: number, change: chrome.tabs.TabChangeInfo, tab: Partial<chrome.tabs.Tab>) => void;
const updates = new Set<UpdateListener>();
const removals = new Set<(id: number) => void>();
const create = vi.fn();
const get = vi.fn();
const executeScript = vi.fn();

beforeEach(() => {
  vi.useFakeTimers();
  updates.clear(); removals.clear();
  create.mockReset().mockResolvedValue({ id: 42 });
  get.mockReset().mockResolvedValue({ id: 42, status: 'loading' });
  executeScript.mockReset().mockResolvedValue([{ result: 'sent' }]);
  vi.stubGlobal('chrome', {
    tabs: { create, get,
      onUpdated: { addListener: (fn: UpdateListener) => updates.add(fn), removeListener: (fn: UpdateListener) => updates.delete(fn) },
      onRemoved: { addListener: (fn: (id: number) => void) => removals.add(fn), removeListener: (fn: (id: number) => void) => removals.delete(fn) },
    },
    scripting: { executeScript },
  });
});
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

it('waits for Gemini to load, passes the prompt as an argument and cleans up listeners', async () => {
  const delivery = openGeminiPrompt('中文 & secret');
  await vi.advanceTimersByTimeAsync(1);
  expect(executeScript).not.toHaveBeenCalled();
  for (const fn of updates) fn(42, {}, { id: 42, status: 'complete', url: 'https://gemini.google.com/app' });
  expect(await delivery).toBe('sent');
  expect(create).toHaveBeenCalledWith({ url: 'https://gemini.google.com/app', active: true });
  expect(executeScript.mock.calls[0]?.[0].args).toEqual(['中文 & secret']);
  expect(updates.size + removals.size).toBe(0);
});

it.each(['https://accounts.google.com/login', 'https://gemini.google.com/app/existing-chat'])('does not inject after redirecting to %s', async (url) => {
  get.mockResolvedValue({ status: 'complete', url });
  expect(await openGeminiPrompt('question')).toBe('unavailable');
  expect(executeScript).not.toHaveBeenCalled();
});

it('stops waiting when the tab is closed', async () => {
  const delivery = openGeminiPrompt('question');
  await vi.advanceTimersByTimeAsync(1);
  for (const fn of removals) fn(42);
  expect(await delivery).toBe('unavailable');
  expect(executeScript).not.toHaveBeenCalled();
  expect(updates.size + removals.size).toBe(0);
});


it('times out and removes listeners when a page never finishes loading', async () => {
  const delivery = openGeminiPrompt('question');
  await vi.advanceTimersByTimeAsync(16000);
  expect(await delivery).toBe('unavailable');
  expect(executeScript).not.toHaveBeenCalled();
  expect(updates.size + removals.size).toBe(0);
});
