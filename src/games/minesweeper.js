// ─── Minesweeper mini-game for the About terminal ───

export async function runMinesweeper(ctx) {
  const { term } = ctx;
  const ROWS = 9;
  const COLS = 9;
  const MINE_COUNT = 10;

  // State
  let grid = [];       // 2D: { mine, revealed, flagged, adjacent }
  let cursorR = 4;
  let cursorC = 4;
  let gameOver = false;
  let won = false;
  let firstReveal = true;
  let revealedCount = 0;
  const totalSafe = ROWS * COLS - MINE_COUNT;

  // Initialize grid (mines placed on first reveal)
  function initGrid() {
    grid = [];
    for (let r = 0; r < ROWS; r++) {
      grid[r] = [];
      for (let c = 0; c < COLS; c++) {
        grid[r][c] = { mine: false, revealed: false, flagged: false, adjacent: 0 };
      }
    }
  }

  function placeMines(safeR, safeC) {
    let placed = 0;
    while (placed < MINE_COUNT) {
      const r = Math.floor(Math.random() * ROWS);
      const c = Math.floor(Math.random() * COLS);
      // Keep safe zone: the first-clicked cell and its neighbors
      if (Math.abs(r - safeR) <= 1 && Math.abs(c - safeC) <= 1) continue;
      if (grid[r][c].mine) continue;
      grid[r][c].mine = true;
      placed++;
    }
    // Calculate adjacency numbers
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (grid[r][c].mine) continue;
        let count = 0;
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            if (dr === 0 && dc === 0) continue;
            const nr = r + dr, nc = c + dc;
            if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && grid[nr][nc].mine) count++;
          }
        }
        grid[r][c].adjacent = count;
      }
    }
  }

  function floodFill(r, c) {
    if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return;
    const cell = grid[r][c];
    if (cell.revealed || cell.flagged || cell.mine) return;
    cell.revealed = true;
    revealedCount++;
    if (cell.adjacent === 0) {
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          floodFill(r + dr, c + dc);
        }
      }
    }
  }

  function reveal(r, c) {
    const cell = grid[r][c];
    if (cell.revealed || cell.flagged) return;

    if (firstReveal) {
      firstReveal = false;
      placeMines(r, c);
    }

    if (cell.mine) {
      // Game over — lose
      gameOver = true;
      won = false;
      // Reveal all mines
      for (let rr = 0; rr < ROWS; rr++) {
        for (let cc = 0; cc < COLS; cc++) {
          if (grid[rr][cc].mine) grid[rr][cc].revealed = true;
        }
      }
      return;
    }

    floodFill(r, c);

    if (revealedCount >= totalSafe) {
      gameOver = true;
      won = true;
    }
  }

  function toggleFlag(r, c) {
    const cell = grid[r][c];
    if (cell.revealed) return;
    cell.flagged = !cell.flagged;
  }

  function getFlagCount() {
    let count = 0;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (grid[r][c].flagged) count++;
      }
    }
    return count;
  }

  function renderGrid() {
    const lines = [];

    // Status line
    const flags = getFlagCount();
    let status = 'Playing...';
    if (gameOver && won) status = 'YOU WIN!';
    else if (gameOver) status = 'GAME OVER!';
    lines.push(`Mines: ${MINE_COUNT}  Flags: ${flags}  Status: ${status}`);
    lines.push('');

    // Column numbers
    lines.push('    ' + Array.from({ length: COLS }, (_, i) => (i + 1).toString()).join(' '));
    lines.push('   ' + '-'.repeat(COLS * 2 + 1));

    for (let r = 0; r < ROWS; r++) {
      let row = (r + 1).toString().padStart(2) + ' |';
      for (let c = 0; c < COLS; c++) {
        const cell = grid[r][c];
        const isCursor = r === cursorR && c === cursorC;
        let ch;

        if (cell.revealed) {
          if (cell.mine) {
            ch = '*';
          } else if (cell.adjacent > 0) {
            ch = cell.adjacent.toString();
          } else {
            ch = ' ';
          }
        } else if (cell.flagged) {
          ch = '\u2691';
        } else {
          ch = '\u25A0';
        }

        if (isCursor && !gameOver) {
          row += '[' + ch + ']';
        } else {
          row += ' ' + ch + ' ';
        }
      }
      row += '|';
      lines.push(row);
    }

    lines.push('   ' + '-'.repeat(COLS * 2 + 1));
    lines.push('');
    if (gameOver && won) {
      lines.push('Congratulations! You cleared the minefield!');
    } else if (gameOver) {
      lines.push('BOOM! You hit a mine!');
    }
    lines.push('Arrows: move | Space: reveal | F: flag | Q: quit');

    return lines.join('\n');
  }

  // Set up the game
  initGrid();

  // Create <pre> element for the game display
  term.addLine('', 'blank');
  term.addLine('MINESWEEPER', 'about-heading');
  term.addLine('', 'blank');

  const pre = document.createElement('pre');
  pre.className = 'about-text';
  pre.style.margin = '0';
  pre.style.padding = '4px 8px';
  pre.style.fontFamily = 'inherit';
  pre.style.fontSize = 'inherit';
  pre.style.lineHeight = '1.4';
  pre.style.color = 'inherit';
  pre.style.whiteSpace = 'pre';
  pre.style.userSelect = 'none';
  term.linesContainer.appendChild(pre);

  function draw() {
    pre.textContent = renderGrid();
    term._scrollToBottom();
  }

  draw();

  // Keyboard handler
  return new Promise(resolve => {
    function onKey(e) {
      const key = e.key;

      // Game keys that we handle
      const gameKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
                        ' ', 'Enter', 'f', 'F', 'q', 'Q'];
      if (!gameKeys.includes(key)) return;

      e.preventDefault();
      e.stopPropagation();

      if (gameOver) {
        if (key === 'q' || key === 'Q' || key === ' ' || key === 'Enter') {
          cleanup();
        }
        return;
      }

      switch (key) {
        case 'ArrowUp':
          cursorR = Math.max(0, cursorR - 1);
          break;
        case 'ArrowDown':
          cursorR = Math.min(ROWS - 1, cursorR + 1);
          break;
        case 'ArrowLeft':
          cursorC = Math.max(0, cursorC - 1);
          break;
        case 'ArrowRight':
          cursorC = Math.min(COLS - 1, cursorC + 1);
          break;
        case ' ':
        case 'Enter':
          reveal(cursorR, cursorC);
          if (gameOver && won) {
            if (window._unlockAchievement) window._unlockAchievement('minesweeper_pro');
          }
          break;
        case 'f':
        case 'F':
          toggleFlag(cursorR, cursorC);
          break;
        case 'q':
        case 'Q':
          cleanup();
          return;
      }

      draw();
    }

    function cleanup() {
      document.removeEventListener('keydown', onKey, true);
      term.addLine('', 'blank');
      if (won) {
        term.addLine('Minefield cleared! Well done.', 'about-secret');
      } else if (gameOver) {
        term.addLine('Better luck next time.', 'about-text');
      } else {
        term.addLine('Minesweeper exited.', 'about-text');
      }
      term.addLine('', 'blank');
      resolve();
    }

    document.addEventListener('keydown', onKey, true);
  });
}
