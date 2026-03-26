// Wordle mini-game for the about terminal CLI

const WORD_LENGTH = 5;
const MAX_GUESSES = 6;

const WORD_LIST = [
  'shell', 'linux', 'debug', 'error', 'stack',
  'patch', 'merge', 'chmod', 'regex', 'cache',
  'proxy', 'route', 'parse', 'token', 'queue',
  'table', 'index', 'query', 'admin', 'input',
  'array', 'class', 'print', 'bytes', 'model',
  'build', 'chain', 'field', 'float', 'graph',
  'mutex', 'point', 'scope', 'sleep', 'state',
  'abort', 'block', 'clone', 'crash', 'flush',
  'mount', 'panic', 'spawn', 'trace', 'yield',
  'write',
];

// Pick a random word
function pickWord() {
  return WORD_LIST[Math.floor(Math.random() * WORD_LIST.length)];
}

// Evaluate a guess against the target word
// Returns array of { letter, status } where status is 'correct' | 'present' | 'absent'
function evaluateGuess(guess, target) {
  const result = Array.from({ length: WORD_LENGTH }, (_, i) => ({
    letter: guess[i],
    status: 'absent',
  }));

  const targetLetters = target.split('');
  const used = new Array(WORD_LENGTH).fill(false);

  // First pass: mark correct positions
  for (let i = 0; i < WORD_LENGTH; i++) {
    if (guess[i] === target[i]) {
      result[i].status = 'correct';
      used[i] = true;
      targetLetters[i] = null; // consume this letter
    }
  }

  // Second pass: mark present (right letter, wrong position)
  for (let i = 0; i < WORD_LENGTH; i++) {
    if (result[i].status === 'correct') continue;
    const idx = targetLetters.indexOf(guess[i]);
    if (idx !== -1) {
      result[i].status = 'present';
      targetLetters[idx] = null; // consume this letter
    }
  }

  return result;
}

// Format a single evaluated row
// [A] = correct, (A) = present,  A  = absent
function formatRow(evaluation) {
  return evaluation
    .map(({ letter, status }) => {
      const ch = letter.toUpperCase();
      switch (status) {
        case 'correct': return `[${ch}]`;
        case 'present': return `(${ch})`;
        default:        return ` ${ch} `;
      }
    })
    .join(' ');
}

// Format an empty row
function formatEmptyRow() {
  return Array.from({ length: WORD_LENGTH }, () => ' _ ').join(' ');
}

// Format the current typing row
function formatCurrentRow(letters) {
  const cells = [];
  for (let i = 0; i < WORD_LENGTH; i++) {
    if (i < letters.length) {
      cells.push(` ${letters[i].toUpperCase()} `);
    } else if (i === letters.length) {
      cells.push(' \u2588 '); // cursor block character
    } else {
      cells.push(' _ ');
    }
  }
  return cells.join(' ');
}

// Keyboard layout rows
const KB_ROWS = [
  'QWERTYUIOP'.split(''),
  'ASDFGHJKL'.split(''),
  'ZXCVBNM'.split(''),
];

// Build the keyboard display
// letterStates: Map<string, 'correct'|'present'|'absent'>
function formatKeyboard(letterStates) {
  return KB_ROWS.map(row => {
    return '  ' + row.map(key => {
      const state = letterStates.get(key);
      if (state === 'correct') return `[${key}]`;
      if (state === 'present') return `(${key})`;
      if (state === 'absent')  return ` . `;
      return ` ${key} `;
    }).join('');
  }).join('\n');
}

// Build the full game display
function buildDisplay(guesses, currentLetters, letterStates, message, gameActive) {
  const lines = [];
  lines.push('');
  lines.push('  ====  W O R D L E  ====');
  lines.push('');

  // Render the 6 guess rows
  for (let i = 0; i < MAX_GUESSES; i++) {
    if (i < guesses.length) {
      // Completed guess
      lines.push('  ' + formatRow(guesses[i]));
    } else if (i === guesses.length && gameActive) {
      // Current typing row
      lines.push('  ' + formatCurrentRow(currentLetters));
    } else {
      // Future empty row
      lines.push('  ' + formatEmptyRow());
    }
  }

  lines.push('');
  lines.push(formatKeyboard(letterStates));
  lines.push('');
  lines.push('  ' + message);
  lines.push('');

  return lines.join('\n');
}

export async function runWordle(ctx) {
  const { term } = ctx;

  const target = pickWord();
  const guesses = [];       // Array of evaluated results
  let currentLetters = [];  // Letters being typed for current guess
  let gameActive = true;
  let message = 'Type a 5-letter word. Q to quit.';

  // Track letter states across all guesses
  // Priority: correct > present > absent
  const letterStates = new Map();

  function updateLetterStates(evaluation) {
    for (const { letter, status } of evaluation) {
      const key = letter.toUpperCase();
      const current = letterStates.get(key);
      // Only upgrade: absent -> present -> correct
      if (!current ||
          (current === 'absent' && (status === 'present' || status === 'correct')) ||
          (current === 'present' && status === 'correct')) {
        letterStates.set(key, status);
      }
    }
  }

  // Create <pre> element for the game
  const pre = document.createElement('pre');
  pre.className = 'about-text';
  pre.style.margin = '0';
  pre.style.padding = '0';
  pre.style.fontFamily = 'inherit';
  pre.style.fontSize = 'inherit';
  pre.style.lineHeight = '1.3';
  pre.style.color = 'inherit';
  term.linesContainer.appendChild(pre);

  function render() {
    pre.textContent = buildDisplay(guesses, currentLetters, letterStates, message, gameActive);
    term._scrollToBottom();
  }

  render();

  return new Promise(resolve => {
    function cleanup() {
      document.removeEventListener('keydown', onKey, true);
    }

    function endGame(won) {
      gameActive = false;
      cleanup();

      if (won) {
        const guessCount = guesses.length;
        message = `You got it in ${guessCount}/${MAX_GUESSES}! The word was "${target.toUpperCase()}".`;
      } else {
        message = `Game over! The word was "${target.toUpperCase()}".`;
      }

      render();

      term.addLine('', 'blank');
      if (won) {
        term.addLine(`Solved in ${guesses.length} guess${guesses.length === 1 ? '' : 'es'}!`, 'about-secret');
        if (window._unlockAchievement) window._unlockAchievement('wordle_solver');
      } else {
        term.addLine(`The word was: ${target.toUpperCase()}`, 'about-text');
      }
      term.addLine('', 'blank');

      resolve();
    }

    function submitGuess() {
      if (currentLetters.length !== WORD_LENGTH) {
        message = 'Not enough letters!';
        render();
        return;
      }

      const guess = currentLetters.join('').toLowerCase();

      const evaluation = evaluateGuess(guess, target);
      guesses.push(evaluation);
      updateLetterStates(evaluation);
      currentLetters = [];

      // Check win
      if (guess === target) {
        endGame(true);
        return;
      }

      // Check lose
      if (guesses.length >= MAX_GUESSES) {
        endGame(false);
        return;
      }

      message = `Guess ${guesses.length}/${MAX_GUESSES}. Keep going!`;
      render();
    }

    function onKey(e) {
      if (!gameActive) return;

      const key = e.key;

      // Quit
      if (key === 'q' || key === 'Q') {
        // Only quit if no letters typed (so player can type words with Q)
        if (currentLetters.length === 0) {
          e.preventDefault();
          e.stopPropagation();
          gameActive = false;
          cleanup();
          message = 'Quit. Q to quit.';
          render();
          term.addLine('', 'blank');
          term.addLine('Wordle abandoned.', 'about-text');
          term.addLine('', 'blank');
          resolve();
          return;
        }
        // Otherwise treat Q as a letter input (fall through below)
      }

      // Enter to submit
      if (key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        submitGuess();
        return;
      }

      // Backspace to delete
      if (key === 'Backspace') {
        e.preventDefault();
        e.stopPropagation();
        if (currentLetters.length > 0) {
          currentLetters.pop();
          message = `Type a 5-letter word. Q to quit.`;
          render();
        }
        return;
      }

      // Letter keys a-z
      if (key.length === 1 && ((key >= 'a' && key <= 'z') || (key >= 'A' && key <= 'Z'))) {
        e.preventDefault();
        e.stopPropagation();
        if (currentLetters.length < WORD_LENGTH) {
          currentLetters.push(key.toLowerCase());
          if (currentLetters.length === WORD_LENGTH) {
            message = 'Press ENTER to submit.';
          } else {
            message = `Type a 5-letter word. Q to quit.`;
          }
          render();
        }
        return;
      }

      // For any other keys during active game, prevent propagation
      // to stop Konami code listener and about window input interference
      if (key === 'ArrowUp' || key === 'ArrowDown' || key === 'ArrowLeft' || key === 'ArrowRight' ||
          key === 'Escape' || key === 'Tab') {
        e.preventDefault();
        e.stopPropagation();
      }
    }

    document.addEventListener('keydown', onKey, true);
  });
}
