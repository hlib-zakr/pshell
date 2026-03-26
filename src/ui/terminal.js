const MAX_LINES = 150;

export class Terminal {
  constructor(linesContainer, terminalBody, terminalEl) {
    this.linesContainer = linesContainer || document.getElementById('lines-container');
    this.terminalBody = terminalBody || document.getElementById('terminal-body');
    this.terminalEl = terminalEl || document.getElementById('terminal');
    this.currentTypingLine = null;
    this.typeInterval = null;
  }

  clear() {
    clearInterval(this.typeInterval);
    this.linesContainer.innerHTML = '';
    this.currentTypingLine = null;
  }

  addLine(text, className = '') {
    const line = document.createElement('div');
    line.className = `line ${className}`;

    if (className === 'blank') {
      line.innerHTML = '&nbsp;';
    } else if (className === 'command' || className === 'command-danger') {
      line.innerHTML = `<span class="prompt">$ </span><span class="cmd-text">${this._syntaxHighlight(text)}</span>`;
    } else {
      line.textContent = text;
    }

    this.linesContainer.appendChild(line);
    this._trimLines();
    this._scrollToBottom();
    return line;
  }

  typeCommand(text, isDangerous, duration, onComplete) {
    clearInterval(this.typeInterval);

    const line = document.createElement('div');
    line.className = `line ${isDangerous ? 'command-danger' : 'command'} typing`;

    const prompt = document.createElement('span');
    prompt.className = 'prompt';
    prompt.textContent = '$ ';

    const cmdText = document.createElement('span');
    cmdText.className = 'cmd-text';

    const cursor = document.createElement('span');
    cursor.className = 'inline-cursor';
    cursor.textContent = '\u2588';

    line.appendChild(prompt);
    line.appendChild(cmdText);
    line.appendChild(cursor);

    this.linesContainer.appendChild(line);
    this.currentTypingLine = line;
    this._trimLines();
    this._scrollToBottom();

    let charIndex = 0;
    const totalChars = text.length;
    const charDelay = Math.max(8, duration / totalChars);

    this.typeInterval = setInterval(() => {
      if (charIndex < totalChars) {
        cmdText.textContent = text.substring(0, charIndex + 1);
        charIndex++;
        this._scrollToBottom();
      } else {
        clearInterval(this.typeInterval);
        // Apply syntax highlighting now that full text is visible
        cmdText.innerHTML = this._syntaxHighlight(text);
        cursor.remove();
        line.classList.remove('typing');
        line.classList.add('active');
        this.currentTypingLine = null;
        if (onComplete) onComplete();
      }
    }, charDelay);
  }

  typeLine(text, className = '', charDelayMs = 12) {
    return new Promise(resolve => {
      if (className === 'blank' || text === '') {
        this.addLine(text, className);
        resolve();
        return;
      }

      const line = document.createElement('div');
      line.className = `line ${className}`;

      const textSpan = document.createElement('span');
      const cursor = document.createElement('span');
      cursor.className = 'inline-cursor';
      cursor.textContent = '\u2588';

      line.appendChild(textSpan);
      line.appendChild(cursor);
      this.linesContainer.appendChild(line);
      this._trimLines();
      this._scrollToBottom();

      let i = 0;
      const interval = setInterval(() => {
        if (i < text.length) {
          textSpan.textContent = text.substring(0, i + 1);
          i++;
          this._scrollToBottom();
        } else {
          clearInterval(interval);
          cursor.remove();
          resolve();
        }
      }, charDelayMs);
    });
  }

  streamText(lines, className = 'output-text', charDelayMs = 6, onDone) {
    // Stream multiple lines of text character by character with a cursor
    // Returns an object with a stop() method to abort early
    const state = { stopped: false, interval: null };

    const allText = lines.join('\n');
    let charIndex = 0;

    // Create a single block for all the text
    const block = document.createElement('div');
    block.className = `line ${className} streaming`;

    const textSpan = document.createElement('span');
    const cursor = document.createElement('span');
    cursor.className = 'inline-cursor';
    cursor.textContent = '\u2588';

    block.appendChild(textSpan);
    block.appendChild(cursor);
    this.linesContainer.appendChild(block);
    this._scrollToBottom();

    state.interval = setInterval(() => {
      if (state.stopped) {
        clearInterval(state.interval);
        cursor.remove();
        block.classList.remove('streaming');
        if (onDone) onDone();
        return;
      }

      if (charIndex < allText.length) {
        // Add a few chars at a time for speed variation (like real streaming)
        const chunkSize = Math.random() < 0.15 ? 1 : (Math.random() < 0.5 ? 2 : 3);
        charIndex = Math.min(charIndex + chunkSize, allText.length);
        textSpan.textContent = allText.substring(0, charIndex);
        this._scrollToBottom();
      } else {
        clearInterval(state.interval);
        cursor.remove();
        block.classList.remove('streaming');
        if (onDone) onDone();
      }
    }, charDelayMs);

    return {
      stop: () => {
        state.stopped = true;
        clearInterval(state.interval);
        cursor.remove();
        block.classList.remove('streaming');
      }
    };
  }

  showInterrupt() {
    const activeLine = this.linesContainer.querySelector('.line.active');
    if (activeLine) {
      const ctrlC = document.createElement('span');
      ctrlC.className = 'ctrl-c';
      ctrlC.textContent = ' ^C';
      activeLine.appendChild(ctrlC);
      activeLine.classList.remove('active');
      activeLine.classList.add('interrupted');
    }

    this.addLine('  [PROCESS INTERRUPTED]', 'interrupt-msg');
  }

  dimLastCommand() {
    const activeLine = this.linesContainer.querySelector('.line.active');
    if (activeLine) {
      activeLine.classList.remove('active');
      activeLine.classList.add('dimmed');
    }
  }

  triggerShake() {
    this.terminalEl.classList.add('shake');
    setTimeout(() => {
      this.terminalEl.classList.remove('shake');
    }, 500);
  }

  async fadeTransition(callback) {
    this.terminalBody.style.transition = 'opacity 0.25s ease-out';
    this.terminalBody.style.opacity = '0';

    await new Promise(r => setTimeout(r, 250));
    this.clear();
    await callback();

    this.terminalBody.style.transition = 'opacity 0.3s ease-in';
    this.terminalBody.style.opacity = '1';

    // Clean up inline styles after transition
    setTimeout(() => {
      this.terminalBody.style.transition = '';
      this.terminalBody.style.opacity = '';
    }, 350);
  }

  _syntaxHighlight(text) {
    // Tokenize the raw text, then wrap each token in a span
    const tokens = [];
    let remaining = text;
    let isFirst = true;

    while (remaining.length > 0) {
      let matched = false;

      // Strings in quotes
      const strMatch = remaining.match(/^("[^"]*"|'[^']*')/);
      if (strMatch) {
        tokens.push({ type: 'syn-string', text: strMatch[1] });
        remaining = remaining.slice(strMatch[1].length);
        isFirst = false;
        matched = true;
        continue;
      }

      // Pipes and operators
      const pipeMatch = remaining.match(/^(\|{1,2}|&&|;)/);
      if (pipeMatch) {
        tokens.push({ type: 'syn-pipe', text: pipeMatch[1] });
        remaining = remaining.slice(pipeMatch[1].length);
        isFirst = false;
        matched = true;
        continue;
      }

      // Flags
      const flagMatch = remaining.match(/^(--?[a-zA-Z0-9_-]+)/);
      if (!isFirst && flagMatch) {
        tokens.push({ type: 'syn-flag', text: flagMatch[1] });
        remaining = remaining.slice(flagMatch[1].length);
        matched = true;
        continue;
      }

      // Paths: /something or ~/something
      const pathMatch = remaining.match(/^((?:\/|~\/)[a-zA-Z0-9_.\-/*]+)/);
      if (!isFirst && pathMatch) {
        tokens.push({ type: 'syn-path', text: pathMatch[1] });
        remaining = remaining.slice(pathMatch[1].length);
        matched = true;
        continue;
      }

      // Command (first word)
      if (isFirst) {
        const cmdMatch = remaining.match(/^([a-zA-Z0-9_.\-:]+)/);
        if (cmdMatch) {
          tokens.push({ type: 'syn-cmd', text: cmdMatch[1] });
          remaining = remaining.slice(cmdMatch[1].length);
          isFirst = false;
          matched = true;
          continue;
        }
      }

      // Whitespace
      const wsMatch = remaining.match(/^(\s+)/);
      if (wsMatch) {
        tokens.push({ type: null, text: wsMatch[1] });
        remaining = remaining.slice(wsMatch[1].length);
        matched = true;
        continue;
      }

      // Plain text (one char at a time to avoid infinite loop)
      if (!matched) {
        // Grab a run of non-special chars
        const plainMatch = remaining.match(/^([^\s|;&"'/-]+|.)/);
        const chunk = plainMatch ? plainMatch[1] : remaining[0];
        tokens.push({ type: null, text: chunk });
        remaining = remaining.slice(chunk.length);
        isFirst = false;
      }
    }

    return tokens.map(t => {
      const escaped = this._escapeHtml(t.text);
      return t.type ? `<span class="${t.type}">${escaped}</span>` : escaped;
    }).join('');
  }

  _trimLines() {
    while (this.linesContainer.children.length > MAX_LINES) {
      this.linesContainer.removeChild(this.linesContainer.firstChild);
    }
  }

  _scrollToBottom() {
    this.terminalBody.scrollTop = this.terminalBody.scrollHeight;
  }

  _escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}
