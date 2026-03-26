// Snake mini-game for the about terminal CLI

const COLS = 20;
const ROWS = 15;
const TICK_MS = 150;
const WIN_SCORE = 10;

// Box-drawing characters
const CH_TL = '\u250C'; // ┌
const CH_TR = '\u2510'; // ┐
const CH_BL = '\u2514'; // └
const CH_BR = '\u2518'; // ┘
const CH_H  = '\u2500'; // ─
const CH_V  = '\u2502'; // │
const CH_BODY = '\u2588'; // █
const CH_FOOD = '\u25C6'; // ◆

const DIR = {
  UP:    { x:  0, y: -1 },
  DOWN:  { x:  0, y:  1 },
  LEFT:  { x: -1, y:  0 },
  RIGHT: { x:  1, y:  0 },
};

function randomPos(snake) {
  let pos;
  do {
    pos = {
      x: Math.floor(Math.random() * COLS),
      y: Math.floor(Math.random() * ROWS),
    };
  } while (snake.some(s => s.x === pos.x && s.y === pos.y));
  return pos;
}

function buildFrame(snake, food, score, message) {
  const lines = [];

  // Score line
  lines.push(`  Score: ${score}` + (message ? `    ${message}` : ''));
  lines.push('');

  // Top border
  lines.push(CH_TL + CH_H.repeat(COLS) + CH_TR);

  // Grid rows
  const snakeSet = new Set(snake.map(s => `${s.x},${s.y}`));
  for (let y = 0; y < ROWS; y++) {
    let row = CH_V;
    for (let x = 0; x < COLS; x++) {
      if (snakeSet.has(`${x},${y}`)) {
        row += CH_BODY;
      } else if (food && food.x === x && food.y === y) {
        row += CH_FOOD;
      } else {
        row += ' ';
      }
    }
    row += CH_V;
    lines.push(row);
  }

  // Bottom border
  lines.push(CH_BL + CH_H.repeat(COLS) + CH_BR);

  return lines.join('\n');
}

export async function runSnake(ctx) {
  const { term } = ctx;

  // Initial snake: 3 segments in the middle, facing right
  let snake = [
    { x: 4, y: 7 },
    { x: 3, y: 7 },
    { x: 2, y: 7 },
  ];
  let direction = null;  // null = not started yet
  let nextDirection = null;
  let food = randomPos(snake);
  let score = 0;
  let gameOver = false;
  let intervalId = null;

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

  // Render initial frame with instructions
  pre.textContent = buildFrame(snake, food, score, 'Press arrow key to start, Q to quit');
  term._scrollToBottom();

  return new Promise(resolve => {
    function cleanup() {
      if (intervalId !== null) {
        clearInterval(intervalId);
        intervalId = null;
      }
      document.removeEventListener('keydown', onKey, true);
    }

    function endGame(won) {
      gameOver = true;
      cleanup();

      const status = won ? 'YOU WIN!' : 'GAME OVER';
      pre.textContent = buildFrame(snake, food, score, status);
      term._scrollToBottom();

      // Show final score below the grid
      term.addLine('', 'blank');
      term.addLine(`Final score: ${score}`, 'about-text');
      if (won) {
        term.addLine('Congratulations, Snake Charmer!', 'about-secret');
        if (window._unlockAchievement) window._unlockAchievement('snake_master');
      }
      term.addLine('', 'blank');

      resolve();
    }

    function tick() {
      if (gameOver) return;

      // Apply queued direction
      if (nextDirection) {
        direction = nextDirection;
        nextDirection = null;
      }

      if (!direction) return; // game hasn't started yet

      // Calculate new head position
      const head = snake[0];
      const newHead = {
        x: head.x + direction.x,
        y: head.y + direction.y,
      };

      // Check wall collision
      if (newHead.x < 0 || newHead.x >= COLS || newHead.y < 0 || newHead.y >= ROWS) {
        endGame(false);
        return;
      }

      // Check self collision
      if (snake.some(s => s.x === newHead.x && s.y === newHead.y)) {
        endGame(false);
        return;
      }

      // Move snake
      snake.unshift(newHead);

      // Check food
      if (newHead.x === food.x && newHead.y === food.y) {
        score++;
        if (score >= WIN_SCORE) {
          endGame(true);
          return;
        }
        food = randomPos(snake);
      } else {
        snake.pop();
      }

      // Render
      pre.textContent = buildFrame(snake, food, score, '');
      term._scrollToBottom();
    }

    function onKey(e) {
      if (gameOver) return;

      // Quit
      if (e.key === 'q' || e.key === 'Q') {
        e.preventDefault();
        e.stopPropagation();
        endGame(false);
        return;
      }

      let newDir = null;
      switch (e.key) {
        case 'ArrowUp':    newDir = DIR.UP;    break;
        case 'ArrowDown':  newDir = DIR.DOWN;  break;
        case 'ArrowLeft':  newDir = DIR.LEFT;  break;
        case 'ArrowRight': newDir = DIR.RIGHT; break;
        default: return; // Don't prevent default for non-game keys
      }

      e.preventDefault();
      e.stopPropagation();

      // Prevent 180-degree reversal
      if (direction) {
        if (newDir.x + direction.x === 0 && newDir.y + direction.y === 0) {
          return;
        }
      }

      nextDirection = newDir;

      // Start the game on first arrow press
      if (intervalId === null) {
        direction = newDir;
        nextDirection = null;
        intervalId = setInterval(tick, TICK_MS);
        // Run first tick immediately
        tick();
      }
    }

    document.addEventListener('keydown', onKey, true);
  });
}
