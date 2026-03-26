import { getAchievementList } from './notifications.js';

export function createAchievementsWindow(terminalManager) {
  const existing = document.getElementById('achievements-window');
  if (existing) {
    if (typeof window._bringToFront === 'function') window._bringToFront(existing);
    return;
  }

  const win = document.createElement('div');
  win.className = 'game-terminal achievements-window';
  win.id = 'achievements-window';
  win.dataset.dragged = '1';
  win.style.position = 'fixed';
  const aw = Math.min(520, window.innerWidth * 0.45);
  const ah = Math.min(500, window.innerHeight * 0.7);
  win.style.left = (window.innerWidth / 2 - aw / 2) + 'px';
  win.style.top = (window.innerHeight / 2 - ah / 2) + 'px';
  win.style.width = aw + 'px';
  win.style.height = ah + 'px';

  const achievements = getAchievementList();
  const unlocked = achievements.filter(a => a.unlocked).length;
  const total = achievements.length;
  const pct = Math.round((unlocked / total) * 100);

  // Progress bar visual
  const barLen = 20;
  const filled = Math.round((unlocked / total) * barLen);
  const barFilled = '\u2588'.repeat(filled);
  const barEmpty = '\u2591'.repeat(barLen - filled);

  win.innerHTML = `
    <div class="gt-header">
      <div class="gt-header-left">
        <span class="dot red"></span>
        <span class="dot yellow"></span>
        <span class="dot green"></span>
      </div>
      <span class="gt-title">Achievements</span>
      <a href="https://github.com/hlib-zakr/pshell" target="_blank" class="header-brand">PShell</a>
    </div>
    <div class="gt-body achievements-body">
      <div class="achievements-progress">
        <span class="achievements-progress-text">${unlocked} / ${total} unlocked</span>
        <span class="achievements-progress-bar">[${barFilled}${barEmpty}]</span>
        <span class="achievements-progress-pct">${pct}%</span>
      </div>
      <div class="achievements-list">
        ${achievements.map(a => `
          <div class="achievement-card ${a.unlocked ? 'achievement-unlocked' : 'achievement-locked'}">
            <div class="achievement-icon">${a.unlocked ? a.icon : '\uD83D\uDD12'}</div>
            <div class="achievement-info">
              <div class="achievement-title">${a.title}</div>
              <div class="achievement-desc">${a.unlocked ? a.desc : a.hint}</div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;

  document.body.appendChild(win);
  if (typeof window._bringToFront === 'function') window._bringToFront(win);
  terminalManager._makeDraggable(win, win.querySelector('.gt-header'), false);
  terminalManager._makeResizable(win, false);

  // Traffic lights
  win.querySelector('.dot.red').addEventListener('click', (e) => {
    e.stopPropagation();
    win.remove();
  });

  win.querySelector('.dot.yellow').addEventListener('click', (e) => {
    e.stopPropagation();
    win.dataset.prevHeight = win.style.height;
    win.style.display = 'none';
    window.dispatchEvent(new CustomEvent('pshell-minimize', { detail: {
      id: 'achievements-window',
      label: 'Achievements',
      restore: () => { win.style.display = ''; if (win.dataset.prevHeight) win.style.height = win.dataset.prevHeight; if (window._bringToFront) window._bringToFront(win); },
    }}));
  });

  win.querySelector('.dot.green').addEventListener('click', (e) => {
    e.stopPropagation();
    if (win.dataset.maximized === '1') {
      win.style.left = win.dataset.restoreLeft;
      win.style.top = win.dataset.restoreTop;
      win.style.width = win.dataset.restoreWidth;
      win.style.height = win.dataset.restoreHeight;
      win.dataset.maximized = '0';
    } else {
      const rect = win.getBoundingClientRect();
      win.dataset.restoreLeft = rect.left + 'px';
      win.dataset.restoreTop = rect.top + 'px';
      win.dataset.restoreWidth = rect.width + 'px';
      win.dataset.restoreHeight = rect.height + 'px';
      win.style.left = '0px';
      win.style.top = '0px';
      win.style.width = window.innerWidth + 'px';
      win.style.height = window.innerHeight + 'px';
      win.dataset.maximized = '1';
    }
  });

  // Double-click header to maximize
  win.querySelector('.gt-header').addEventListener('dblclick', (e) => {
    if (e.target.closest('.dot')) return;
    win.querySelector('.dot.green')?.click();
  });

  // Bring to front
  win.addEventListener('mousedown', () => {
    if (typeof window._bringToFront === 'function') window._bringToFront(win);
  });
}
