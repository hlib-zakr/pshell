const CHARS = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン0123456789ABCDEF$>_/\\|{}[]';
const FONT_SIZE = 14;
const TARGET_FPS = 15;
const FRAME_INTERVAL = 1000 / TARGET_FPS;

export class MatrixRain {
  constructor(canvasId = 'matrix-rain') {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;

    this.ctx = this.canvas.getContext('2d');
    this.columns = [];
    this.speedMultiplier = 1;
    this.color = '#00ff41';
    this.running = false;
    this.lastFrame = 0;

    this._resize();
    window.addEventListener('resize', () => this._resize());
  }

  start() {
    if (!this.canvas || this.running) return;
    this.running = true;
    this.canvas.classList.add('state-menu');
    this._animate(0);
  }

  setState(state) {
    if (!this.canvas) return;

    this.canvas.classList.remove('state-menu', 'state-playing', 'state-gameover');
    this.canvas.classList.add(`state-${state}`);

    switch (state) {
      case 'menu':
        this.speedMultiplier = 1;
        this.color = '#00ff41';
        break;
      case 'playing':
        this.speedMultiplier = 1.5;
        this.color = '#33ff66';
        break;
      case 'gameover':
        this.speedMultiplier = 2;
        this.color = '#ff3333';
        break;
    }
  }

  _resize() {
    if (!this.canvas) return;
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;

    const columnCount = Math.floor(this.canvas.width / FONT_SIZE);
    this.columns = new Array(columnCount).fill(0).map(() =>
      Math.random() * this.canvas.height / FONT_SIZE
    );
  }

  _animate(timestamp) {
    if (!this.running) return;
    requestAnimationFrame((t) => this._animate(t));

    if (timestamp - this.lastFrame < FRAME_INTERVAL / this.speedMultiplier) return;
    this.lastFrame = timestamp;

    this._draw();
  }

  _draw() {
    const { ctx, canvas, columns } = this;

    // Semi-transparent black overlay for trail effect
    ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = this.color;
    ctx.font = `${FONT_SIZE}px monospace`;

    for (let i = 0; i < columns.length; i++) {
      const char = CHARS[Math.floor(Math.random() * CHARS.length)];
      const x = i * FONT_SIZE;
      const y = columns[i] * FONT_SIZE;

      // Vary brightness
      const brightness = Math.random();
      if (brightness > 0.9) {
        ctx.fillStyle = '#ffffff';
      } else if (brightness > 0.6) {
        ctx.fillStyle = this.color;
      } else {
        // Dimmer version
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = this.color;
      }

      ctx.fillText(char, x, y);
      ctx.globalAlpha = 1;
      ctx.fillStyle = this.color;

      // Random reset to top
      if (y > canvas.height && Math.random() > 0.975) {
        columns[i] = 0;
      }

      columns[i]++;
    }
  }

  destroy() {
    this.running = false;
  }
}
