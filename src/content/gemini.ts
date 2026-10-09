/**
 * Runs only in a newly opened Gemini page, via scripting.executeScript.
 * Keep this function self-contained: Chrome serializes it without its imports.
 * Site-specific selectors and DOM effects belong here, not in services/core.
 */
import type { GeminiDelivery } from '../types/gemini';

export async function fillAndSendGeminiPrompt(
  prompt: string,
  timeoutMs = 20000,
): Promise<GeminiDelivery> {
  const deadline = Date.now() + timeoutMs;
  // Functions and constants needed by the injected function must stay inside it.
  const waitFor = <T>(find: () => T | null): Promise<T | null> => new Promise((resolve) => {
    const initial = find();
    if (initial) { resolve(initial); return; }
    const observer = new MutationObserver(() => {
      const value = find();
      if (value) { observer.disconnect(); clearTimeout(timer); resolve(value); }
    });
    const timer = setTimeout(() => { observer.disconnect(); resolve(null); }, Math.max(0, deadline - Date.now()));
    observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, characterData: true });
  });

  const editor = await waitFor(() => document.querySelector<HTMLElement>(
    '.ql-editor[contenteditable="true"][role="textbox"], rich-textarea [contenteditable="true"]',
  ));
  if (!editor || editor.textContent?.trim()) return 'unavailable';

  editor.focus();
  const paragraphs = prompt.split('\n').map((line) => {
    const paragraph = document.createElement('p');
    if (line) paragraph.textContent = line;
    else paragraph.append(document.createElement('br'));
    return paragraph;
  });
  editor.replaceChildren(...paragraphs);
  const expected = paragraphs.map((p) => p.textContent).join('');
  // Quill observes its editable DOM; the input event also notifies the surrounding UI.
  editor.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: prompt }));

  // Give the site's editor observers a turn to update their internal draft.
  await new Promise((resolve) => setTimeout(resolve, 0));

  const send = await waitFor(() => {
    const button = document.querySelector<HTMLButtonElement>(
      '.send-button button, button[aria-label="Send message"], button[data-test-id="send-button"]',
    );
    return button && !button.disabled && button.getAttribute('aria-disabled') !== 'true' ? button : null;
  });
  // Never send if the user edited or removed the draft while we were waiting.
  if (!send || !editor.isConnected || editor.textContent !== expected) return 'filled';
  send.click();
  // A click alone does not prove that Gemini accepted it (e.g. account restrictions).
  const accepted = await waitFor(() => !editor.isConnected || !editor.textContent?.trim() ? true : null);
  return accepted ? 'sent' : 'filled';
}
