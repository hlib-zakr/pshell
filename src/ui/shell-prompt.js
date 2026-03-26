// Shared prompt system — used by both main terminal and about window

import { getCompletions, commonPrefix } from './tab-complete.js';

export function createPromptInput(term, container, bodySelector, promptText, {
  history, onSubmit, onEmptyEnter, extraClasses = '', state = null,
}) {
  const inputLine = document.createElement('div');
  inputLine.className = `line input-line about-prompt-line ${extraClasses}`.trim();
  inputLine.innerHTML = `<span class="prompt">${promptText}</span>`;

  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'about-cmd-input';
  input.autocomplete = 'off';
  input.spellcheck = false;

  inputLine.appendChild(input);
  term.linesContainer.appendChild(inputLine);
  term._scrollToBottom();
  setTimeout(() => input.focus(), 50);

  // Click-to-focus on terminal body
  const body = container.querySelector(bodySelector);
  const bodyClickHandler = (e) => {
    if (e.target.closest('a')) return;
    if (e.target.closest('.dot')) return;
    input.focus();
  };
  if (body) {
    body.addEventListener('click', bodyClickHandler);
    const observer = new MutationObserver(() => {
      if (!inputLine.parentNode) {
        body.removeEventListener('click', bodyClickHandler);
        observer.disconnect();
      }
    });
    observer.observe(term.linesContainer, { childList: true });
  }

  // History navigation
  let historyIdx = history.length;

  // Tab completion state — zsh-style cycling
  let tabCompletions = null;  // current completion list
  let tabIndex = -1;          // current cycle index
  let tabOriginal = '';       // original input before cycling started
  let tabSuggestionLine = null;

  input.addEventListener('keydown', async (e) => {
    // Tab completion
    if (e.key === 'Tab') {
      e.preventDefault();
      e.stopPropagation();

      // If already cycling, advance to next
      if (tabCompletions && tabCompletions.length > 0) {
        tabIndex = (tabIndex + 1) % tabCompletions.length;
        const parts = tabOriginal.split(/\s+/);
        parts[parts.length - 1] = tabCompletions[tabIndex];
        input.value = parts.join(' ');

        // Update suggestion line to show all options with current highlighted
        if (tabSuggestionLine) tabSuggestionLine.remove();
        if (tabCompletions.length > 1) {
          tabSuggestionLine = document.createElement('div');
          tabSuggestionLine.className = 'line about-access tab-suggestions';
          tabSuggestionLine.innerHTML = tabCompletions.map((c, i) =>
            i === tabIndex ? `<span style="color:var(--term-bright-green);font-weight:bold">${term._escapeHtml(c)}</span>` : term._escapeHtml(c)
          ).join('  ');
          inputLine.parentNode.insertBefore(tabSuggestionLine, inputLine);
          term._scrollToBottom();
        }
        return;
      }

      // First Tab press — get completions
      const value = input.value;
      const completions = getCompletions(value, state);

      if (completions.length === 0) {
        return;
      } else if (completions.length === 1) {
        // Single match — auto-complete immediately
        const parts = value.split(/\s+/);
        parts[parts.length - 1] = completions[0];
        input.value = parts.join(' ') + ' ';
      } else {
        // Multiple matches — fill common prefix, then start cycling
        const parts = value.split(/\s+/);
        const cp = commonPrefix(completions);
        const currentWord = parts[parts.length - 1] || '';

        if (cp.length > currentWord.length) {
          // Fill common prefix first
          parts[parts.length - 1] = cp;
          input.value = parts.join(' ');
        }

        // Start cycling from first option
        tabCompletions = completions;
        tabIndex = 0;
        tabOriginal = input.value;

        const cycleParts = tabOriginal.split(/\s+/);
        cycleParts[cycleParts.length - 1] = tabCompletions[0];
        input.value = cycleParts.join(' ');

        // Show options with first highlighted
        tabSuggestionLine = document.createElement('div');
        tabSuggestionLine.className = 'line about-access tab-suggestions';
        tabSuggestionLine.innerHTML = tabCompletions.map((c, i) =>
          i === 0 ? `<span style="color:var(--term-bright-green);font-weight:bold">${term._escapeHtml(c)}</span>` : term._escapeHtml(c)
        ).join('  ');
        inputLine.parentNode.insertBefore(tabSuggestionLine, inputLine);
        term._scrollToBottom();
      }
      return;
    }

    // Any other key — reset tab cycling and remove suggestions
    if (e.key !== 'Shift') {
      tabCompletions = null;
      tabIndex = -1;
      tabOriginal = '';
      if (tabSuggestionLine) { tabSuggestionLine.remove(); tabSuggestionLine = null; }
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (historyIdx > 0) { historyIdx--; input.value = history[historyIdx]; }
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIdx < history.length - 1) { historyIdx++; input.value = history[historyIdx]; }
      else { historyIdx = history.length; input.value = ''; }
      return;
    }
    if (e.key !== 'Enter') return;
    e.stopPropagation();

    const rawCmd = input.value.trim();

    // Empty Enter
    if (!rawCmd) {
      if (onEmptyEnter) onEmptyEnter(inputLine);
      return;
    }

    // Push to history
    history.push(rawCmd);
    historyIdx = history.length;

    // Remove input and call submit handler
    inputLine.remove();
    await onSubmit(rawCmd, rawCmd.toLowerCase());
  });

  return { inputLine, input };
}
