// ─── 2048 Mini-Game for the About Terminal CLI ───

export async function run2048(ctx) {
  const { term } = ctx;

  // ── Game state ──
  const SIZE = 4;
  let grid = Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
  let score = 0;
  let won = false;
  let gameOver = false;

  // Spawn initial two tiles
  spawnTile(grid);
  spawnTile(grid);

  // ── Create the <pre> element for the board ──
  term.addLine('', 'blank');
  term.addLine('  ══════ 2048 ══════', 'about-heading');

  const pre = document.createElement('pre');
  pre.className = 'about-text';
  pre.style.margin = '0';
  pre.style.padding = '0';
  pre.style.fontFamily = 'inherit';
  pre.style.fontSize = 'inherit';
  pre.style.lineHeight = '1.3';
  pre.style.color = 'inherit';
  term.linesContainer.appendChild(pre);
  term._scrollToBottom();

  render();

  // ── Keyboard handling ──
  return new Promise(resolve => {
    function onKey(e) {
      if (gameOver || won) {
        if (e.key === 'q' || e.key === 'Q') {
          cleanup();
        }
        return;
      }

      let moved = false;

      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          e.stopPropagation();
          moved = moveUp();
          break;
        case 'ArrowDown':
          e.preventDefault();
          e.stopPropagation();
          moved = moveDown();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          e.stopPropagation();
          moved = moveLeft();
          break;
        case 'ArrowRight':
          e.preventDefault();
          e.stopPropagation();
          moved = moveRight();
          break;
        case 'q':
        case 'Q':
          cleanup();
          return;
        default:
          return;
      }

      if (moved) {
        spawnTile(grid);

        // Check win
        if (hasValue(2048)) {
          won = true;
          render();
          if (window._unlockAchievement) window._unlockAchievement('2048_winner');
          return;
        }

        // Check lose
        if (!hasValidMoves()) {
          gameOver = true;
        }
      }

      render();
    }

    function cleanup() {
      document.removeEventListener('keydown', onKey, true);
      term.addLine('', 'blank');
      resolve();
    }

    document.addEventListener('keydown', onKey, true);
  });

  // ── Rendering ──
  function render() {
    const CELL_W = 6;
    const lines = [];

    // Score line
    lines.push(`  Score: ${score}`);
    lines.push('');

    // Top border: ┌──────┬──────┬──────┬──────┐
    const topBorder =
      '\u250C' +
      Array(SIZE).fill('\u2500'.repeat(CELL_W)).join('\u252C') +
      '\u2510';
    lines.push('  ' + topBorder);

    for (let r = 0; r < SIZE; r++) {
      // Data row: │  xx  │  xx  │  xx  │  xx  │
      let row = '\u2502';
      for (let c = 0; c < SIZE; c++) {
        const val = grid[r][c];
        const txt = val === 0 ? '' : String(val);
        const pad = CELL_W - txt.length;
        const left = Math.floor(pad / 2);
        const right = pad - left;
        row += ' '.repeat(left) + txt + ' '.repeat(right) + '\u2502';
      }
      lines.push('  ' + row);

      // Row separator or bottom border
      if (r < SIZE - 1) {
        const mid =
          '\u251C' +
          Array(SIZE).fill('\u2500'.repeat(CELL_W)).join('\u253C') +
          '\u2524';
        lines.push('  ' + mid);
      } else {
        const bot =
          '\u2514' +
          Array(SIZE).fill('\u2500'.repeat(CELL_W)).join('\u2534') +
          '\u2518';
        lines.push('  ' + bot);
      }
    }

    lines.push('');

    if (won) {
      lines.push('  YOU WIN! Congratulations!');
      lines.push('  Press Q to quit.');
    } else if (gameOver) {
      lines.push('  GAME OVER! No moves left.');
      lines.push('  Press Q to quit.');
    } else {
      lines.push('  Arrow keys to play, Q to quit');
    }

    pre.textContent = lines.join('\n');
    term._scrollToBottom();
  }

  // ── Tile spawning ──
  function spawnTile(g) {
    const empty = [];
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        if (g[r][c] === 0) empty.push([r, c]);
      }
    }
    if (empty.length === 0) return;
    const [r, c] = empty[Math.floor(Math.random() * empty.length)];
    g[r][c] = Math.random() < 0.9 ? 2 : 4;
  }

  // ── Helpers ──
  function hasValue(val) {
    for (let r = 0; r < SIZE; r++)
      for (let c = 0; c < SIZE; c++)
        if (grid[r][c] === val) return true;
    return false;
  }

  function hasValidMoves() {
    for (let r = 0; r < SIZE; r++)
      for (let c = 0; c < SIZE; c++) {
        if (grid[r][c] === 0) return true;
        if (c < SIZE - 1 && grid[r][c] === grid[r][c + 1]) return true;
        if (r < SIZE - 1 && grid[r][c] === grid[r + 1][c]) return true;
      }
    return false;
  }

  // ── Slide & merge a single row left ──
  function slideRow(row) {
    // Remove zeros
    let arr = row.filter(v => v !== 0);
    let moved = arr.length !== row.length || arr.some((v, i) => v !== row[i]);

    // Merge adjacent equal tiles
    for (let i = 0; i < arr.length - 1; i++) {
      if (arr[i] === arr[i + 1]) {
        arr[i] *= 2;
        score += arr[i];
        arr.splice(i + 1, 1);
        moved = true;
      }
    }

    // Pad with zeros
    while (arr.length < SIZE) arr.push(0);

    return { result: arr, moved };
  }

  // ── Move functions ──
  function moveLeft() {
    let anyMoved = false;
    for (let r = 0; r < SIZE; r++) {
      const { result, moved } = slideRow(grid[r]);
      if (moved) anyMoved = true;
      grid[r] = result;
    }
    return anyMoved;
  }

  function moveRight() {
    let anyMoved = false;
    for (let r = 0; r < SIZE; r++) {
      const reversed = [...grid[r]].reverse();
      const { result, moved } = slideRow(reversed);
      if (moved) anyMoved = true;
      grid[r] = result.reverse();
    }
    return anyMoved;
  }

  function moveUp() {
    let anyMoved = false;
    for (let c = 0; c < SIZE; c++) {
      const col = [];
      for (let r = 0; r < SIZE; r++) col.push(grid[r][c]);
      const { result, moved } = slideRow(col);
      if (moved) anyMoved = true;
      for (let r = 0; r < SIZE; r++) grid[r][c] = result[r];
    }
    return anyMoved;
  }

  function moveDown() {
    let anyMoved = false;
    for (let c = 0; c < SIZE; c++) {
      const col = [];
      for (let r = 0; r < SIZE; r++) col.push(grid[r][c]);
      col.reverse();
      const { result, moved } = slideRow(col);
      if (moved) anyMoved = true;
      const final = result.reverse();
      for (let r = 0; r < SIZE; r++) grid[r][c] = final[r];
    }
    return anyMoved;
  }
}
