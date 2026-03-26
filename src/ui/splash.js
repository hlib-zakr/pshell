export function showSplash() {
  return new Promise(resolve => {
    const splash = document.createElement('div');
    splash.id = 'splash-screen';
    splash.innerHTML = `
      <canvas id="splash-canvas"></canvas>
      <div class="splash-text">PromptUp</div>
    `;
    document.body.appendChild(splash);

    const canvas = document.getElementById('splash-canvas');
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;

    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    canvas.style.width = window.innerWidth + 'px';
    canvas.style.height = window.innerHeight + 'px';
    ctx.scale(dpr, dpr);

    const W = window.innerWidth;
    const H = window.innerHeight;
    const CHARS = 'アイウエオカキクケコサシスセソタチツテト0123456789>_';
    const FONT_SIZE = 10;
    const cols = Math.ceil(W / FONT_SIZE);

    // Build logo mask
    const maskCanvas = document.createElement('canvas');
    maskCanvas.width = W;
    maskCanvas.height = H;
    const maskCtx = maskCanvas.getContext('2d');

    const size = Math.min(W, H) * 0.35;
    const cx = W / 2;
    const cy = H / 2 - 20;

    maskCtx.lineCap = 'round';
    maskCtx.lineJoin = 'round';
    maskCtx.lineWidth = size * 0.22;

    const grad = maskCtx.createLinearGradient(
      cx - size * 0.4, cy - size * 0.35,
      cx + size * 0.2, cy + size * 0.35
    );
    grad.addColorStop(0, '#4040ff');
    grad.addColorStop(0.5, '#6a3de8');
    grad.addColorStop(1, '#7b2ff2');
    maskCtx.strokeStyle = grad;

    maskCtx.beginPath();
    // Top arm from upper-left down to upper-right, then diagonal down
    maskCtx.moveTo(cx - size * 0.35, cy - size * 0.38);
    maskCtx.lineTo(cx + size * 0.35, cy - size * 0.25);
    maskCtx.lineTo(cx - size * 0.05, cy + size * 0.3);
    maskCtx.stroke();

    const maskData = maskCtx.getImageData(0, 0, W, H);

    function sampleMask(x, y) {
      const px = Math.floor(x);
      const py = Math.floor(y);
      if (px < 0 || px >= W || py < 0 || py >= H) return null;
      const idx = (py * W + px) * 4;
      if (maskData.data[idx + 3] < 50) return null;
      return [maskData.data[idx], maskData.data[idx + 1], maskData.data[idx + 2]];
    }

    // Multiple drops per column for density
    const DROPS_PER_COL = 3;
    const drops = [];
    for (let i = 0; i < cols; i++) {
      for (let d = 0; d < DROPS_PER_COL; d++) {
        drops.push({
          col: i,
          y: Math.random() * -60 - d * 20,
          speed: Math.random() * 0.6 + 0.4,
          trail: 20 + Math.floor(Math.random() * 20),
          chars: Array.from({ length: 50 }, () => CHARS[Math.floor(Math.random() * CHARS.length)]),
          phase: Math.random() * Math.PI * 2,
        });
      }
    }

    let frame = 0;
    const HOLD_FRAME = 220;
    let fadeOut = false;
    let fadeAlpha = 1;
    let textShown = false;

    function draw() {
      frame++;

      // Full clear each frame — no ghosting/grid artifacts
      ctx.fillStyle = '#050505';
      ctx.fillRect(0, 0, W, H);

      ctx.font = `bold ${FONT_SIZE}px monospace`;

      for (let i = 0; i < drops.length; i++) {
        const drop = drops[i];
        const baseX = drop.col * FONT_SIZE;

        const wave = Math.sin(frame * 0.03 + drop.phase) * 1.5;

        for (let t = 0; t < drop.trail; t++) {
          const row = Math.floor(drop.y) - t;
          const py = row * FONT_SIZE;
          const x = baseX + wave * (1 - t / drop.trail);
          const sampleX = baseX + FONT_SIZE / 2;
          const sampleY = py + FONT_SIZE / 2;

          const color = sampleMask(sampleX, sampleY);
          if (!color) continue;

          if (Math.random() < 0.08) {
            drop.chars[t % drop.chars.length] = CHARS[Math.floor(Math.random() * CHARS.length)];
          }
          const char = drop.chars[t % drop.chars.length];
          const fade = 1 - (t / drop.trail);

          if (t === 0) {
            ctx.shadowColor = `rgba(${color[0]}, ${color[1]}, ${color[2]}, 0.8)`;
            ctx.shadowBlur = 6;
            ctx.fillStyle = `rgba(255, 255, 255, ${fade * 0.95})`;
          } else if (t < 3) {
            ctx.shadowBlur = 3;
            ctx.shadowColor = `rgba(${color[0]}, ${color[1]}, ${color[2]}, 0.4)`;
            ctx.fillStyle = `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${fade * 0.85})`;
          } else {
            ctx.shadowBlur = 0;
            ctx.shadowColor = 'transparent';
            ctx.fillStyle = `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${fade * fade * 0.6})`;
          }

          ctx.fillText(char, x, py);
        }

        ctx.shadowBlur = 0;
        ctx.shadowColor = 'transparent';

        drop.y += drop.speed + Math.sin(frame * 0.02 + drop.col) * 0.05;

        if (drop.y * FONT_SIZE > H + drop.trail * FONT_SIZE + 50) {
          drop.y = Math.random() * -30;
          drop.speed = Math.random() * 0.6 + 0.4;
        }
      }

      // Show text
      if (frame > 60 && !textShown) {
        textShown = true;
        splash.querySelector('.splash-text').classList.add('splash-text-visible');
      }

      if (frame > HOLD_FRAME && !fadeOut) {
        fadeOut = true;
      }

      if (fadeOut) {
        fadeAlpha -= 0.015;
        splash.style.opacity = Math.max(0, fadeAlpha);
        if (fadeAlpha <= 0) {
          splash.remove();
          resolve();
          return;
        }
      }

      requestAnimationFrame(draw);
    }

    ctx.fillStyle = '#050505';
    ctx.fillRect(0, 0, W, H);
    requestAnimationFrame(draw);
  });
}
