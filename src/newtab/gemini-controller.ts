/** DOM wiring for the Gemini form; delivery is handled by the injected service. */
import type { GeminiService } from '../services/gemini';

export type GeminiAction = 'ask-gemini' | 'copy-gemini-prompt';

export function attachGeminiForm(service: GeminiService): () => void {
  const form = document.getElementById('geminiForm') as HTMLFormElement | null;
  const input = document.getElementById('geminiPrompt') as HTMLInputElement | null;
  const button = document.getElementById('geminiSubmit') as HTMLButtonElement | null;
  const copy = document.getElementById('geminiCopy') as HTMLButtonElement | null;
  const status = document.getElementById('geminiStatus');
  if (!form || !input || !button || !copy || !status) return () => {};
  let busy = false;
  let composing = false;
  let lastPrompt = '';
  const compositionStart = (): void => { composing = true; };
  const compositionEnd = (): void => { composing = false; };
  const onKeydown = (event: KeyboardEvent): void => {
    if (event.key === 'Enter' && (event.isComposing || composing)) event.preventDefault();
  };
  const onSubmit = (event: SubmitEvent): void => {
    event.preventDefault();
    if (busy || composing) return;
    const prompt = input.value;
    if (!prompt.trim()) {
      status.textContent = 'Enter a question first.';
      input.focus();
      return;
    }
    busy = true;
    button.disabled = true;
    copy.hidden = true;
    lastPrompt = prompt;
    status.textContent = 'Opening Gemini…';
    void (async () => {
      try {
        const result = await service.ask(prompt);
        if (result === 'sent') {
          status.textContent = 'Question sent. View the answer in the Gemini tab.';
          if (input.value === prompt) input.value = '';
        } else {
          copy.hidden = false;
          status.textContent = result === 'filled'
            ? 'Question filled in Gemini. Click Send there to continue.'
            : result === 'too-long'
              ? 'Your question is too long. Shorten it and try again.'
              : 'Couldn’t send automatically. Sign in to Gemini if needed, then copy your question or try again.';
        }
      } catch {
        copy.hidden = false;
        status.textContent = 'Couldn’t open Gemini. Your question is still here; copy it or try again.';
      } finally {
        busy = false;
        button.disabled = false;
      }
    })();
  };
  const onCopy = (): void => {
    void (async () => {
      try {
        await navigator.clipboard.writeText(lastPrompt);
        status.textContent = 'Question copied. Paste it into Gemini.';
      } catch {
        input.focus();
        input.select();
        status.textContent = 'Select and copy your question with Cmd/Ctrl+C.';
      }
    })();
  };
  form.addEventListener('submit', onSubmit);
  input.addEventListener('compositionstart', compositionStart);
  input.addEventListener('compositionend', compositionEnd);
  input.addEventListener('keydown', onKeydown);
  copy.addEventListener('click', onCopy);
  return () => {
    form.removeEventListener('submit', onSubmit);
    input.removeEventListener('compositionstart', compositionStart);
    input.removeEventListener('compositionend', compositionEnd);
    input.removeEventListener('keydown', onKeydown);
    copy.removeEventListener('click', onCopy);
  };
}
