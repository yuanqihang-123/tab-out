/** Chrome effects for opening Gemini and injecting its page-specific editor adapter. */
import { GEMINI_APP_URL } from '../core/gemini';
import { fillAndSendGeminiPrompt } from '../content/gemini';
import type { GeminiDelivery } from '../types/gemini';

function isGeminiApp(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.origin === 'https://gemini.google.com' && /^\/(?:u\/\d+\/)?app\/?$/.test(parsed.pathname);
  } catch { return false; }
}

/** Subscribe before checking the tab, so a fast load cannot slip between them. */
function waitForPage(tabId: number): Promise<boolean> {
  return new Promise((resolve) => {
    const finish = (ready: boolean): void => {
      clearTimeout(timer);
      chrome.tabs.onUpdated.removeListener(onUpdated);
      chrome.tabs.onRemoved.removeListener(onRemoved);
      resolve(ready);
    };
    const inspect = (tab: chrome.tabs.Tab): void => {
      if (tab.status === 'complete') finish(isGeminiApp(tab.url ?? ''));
    };
    const onUpdated = (id: number, _change: chrome.tabs.TabChangeInfo, tab: chrome.tabs.Tab): void => {
      if (id === tabId) inspect(tab);
    };
    const onRemoved = (id: number): void => { if (id === tabId) finish(false); };
    const timer = setTimeout(() => finish(false), 15000);
    chrome.tabs.onUpdated.addListener(onUpdated);
    chrome.tabs.onRemoved.addListener(onRemoved);
    void (async () => {
      try { inspect(await chrome.tabs.get(tabId)); }
      catch { finish(false); }
    })();
  });
}

export async function openGeminiPrompt(prompt: string): Promise<GeminiDelivery> {
  const tab = await chrome.tabs.create({ url: GEMINI_APP_URL, active: true });
  if (tab.id === undefined || !await waitForPage(tab.id)) return 'unavailable';
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: fillAndSendGeminiPrompt,
      args: [prompt],
    });
    return results[0]?.result ?? 'failed';
  } catch { return 'failed'; }
}
