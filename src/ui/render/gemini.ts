/** Static, pure markup for the Gemini launcher. */
import { MAX_GEMINI_PROMPT_LENGTH } from '../../core/gemini';

export function renderGeminiForm(): string {
  return `<form class="gemini-form" id="geminiForm" data-action="ask-gemini" method="post">
    <label for="geminiPrompt">Ask Gemini</label>
    <div class="gemini-input-row">
      <input id="geminiPrompt" name="prompt" type="text" required maxlength="${MAX_GEMINI_PROMPT_LENGTH}"
        placeholder="What would you like to know?" autocomplete="off" enterkeyhint="send"
        aria-describedby="geminiHint geminiStatus">
      <button type="submit" id="geminiSubmit">Ask Gemini <span aria-hidden="true">↗</span></button>
    </div>
    <p id="geminiHint">Press Enter to send your question to Gemini in a new tab.</p>
    <p id="geminiStatus" role="status" aria-live="polite"></p>
    <button type="button" id="geminiCopy" data-action="copy-gemini-prompt" hidden>Copy question</button>
  </form>`;
}
