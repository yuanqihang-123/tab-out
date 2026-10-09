// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fillAndSendGeminiPrompt } from '@/content/gemini';

afterEach(() => { document.body.innerHTML = ''; vi.useRealTimers(); });

function editorHtml() {
  return '<div class="ql-editor" role="textbox" contenteditable="true"><p><br></p></div>';
}

describe('Gemini page delivery', () => {
  it('waits for the editor and asynchronous Send control, inserts plain text and sends once', async () => {
    vi.useFakeTimers();
    let submittedText = '';
    const sent = vi.fn(() => {
      submittedText = document.querySelector('.ql-editor')?.textContent ?? '';
      document.querySelector('.ql-editor')?.replaceChildren();
    });
    const delivery = fillAndSendGeminiPrompt('中文 <img src=x>\nsecond line', 100);
    document.body.innerHTML = editorHtml();
    document.addEventListener('input', () => {
      const button = document.createElement('button');
      button.setAttribute('aria-label', 'Send message');
      button.addEventListener('click', sent);
      document.body.append(button);
    }, { once: true });
    await vi.advanceTimersByTimeAsync(10);
    expect(await delivery).toBe('sent');
    expect(sent).toHaveBeenCalledOnce();
    expect(submittedText).toContain('<img src=x>');
    expect(document.querySelector('.ql-editor img')).toBeNull();
  });
  it('does not overwrite an existing draft', async () => {
    document.body.innerHTML = '<div class="ql-editor" role="textbox" contenteditable="true">My draft</div>';
    expect(await fillAndSendGeminiPrompt('new question', 10)).toBe('unavailable');
    expect(document.querySelector('.ql-editor')?.textContent).toBe('My draft');
  });
  it('keeps the filled question when Send is unavailable', async () => {
    vi.useFakeTimers();
    document.body.innerHTML = editorHtml() + '<button aria-label="Send message" disabled></button>';
    const delivery = fillAndSendGeminiPrompt('keep this question', 10);
    await vi.advanceTimersByTimeAsync(20);
    expect(await delivery).toBe('filled');
    expect(document.querySelector('.ql-editor')?.textContent).toBe('keep this question');
  });
  it('does not submit a draft changed by the user while waiting for Send', async () => {
    vi.useFakeTimers();
    document.body.innerHTML = editorHtml();
    const delivery = fillAndSendGeminiPrompt('original question', 100);
    await vi.advanceTimersByTimeAsync(1);
    document.querySelector('.ql-editor p')!.textContent = 'user edit';
    const button = document.createElement('button');
    button.setAttribute('aria-label', 'Send message');
    const sent = vi.fn();
    button.addEventListener('click', sent);
    document.body.append(button);
    await vi.advanceTimersByTimeAsync(1);
    expect(await delivery).toBe('filled');
    expect(sent).not.toHaveBeenCalled();
  });

  it('does not report success when clicking Send leaves the question unsent', async () => {
    vi.useFakeTimers();
    document.body.innerHTML = editorHtml() + '<button aria-label="Send message"></button>';
    const sent = vi.fn();
    document.querySelector('button')!.addEventListener('click', sent);
    const delivery = fillAndSendGeminiPrompt('question', 20);
    await vi.advanceTimersByTimeAsync(30);
    expect(await delivery).toBe('filled');
    expect(sent).toHaveBeenCalledOnce();
  });

  it('times out safely on a login page', async () => {
    vi.useFakeTimers();
    const delivery = fillAndSendGeminiPrompt('question', 10);
    await vi.advanceTimersByTimeAsync(20);
    expect(await delivery).toBe('unavailable');
  });
});
