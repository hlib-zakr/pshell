import './style.css';

// Block mobile immediately — before anything else loads
if (/Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    || (navigator.maxTouchPoints > 0 && !window.matchMedia('(pointer: fine)').matches)) {
  document.body.innerHTML = `
    <div id="mobile-block">
      <div class="mobile-logo">&gt;_</div>
      <h1>PShell</h1>
      <p class="mobile-subtitle">by <a href="https://x.com/hlibzakrevskyi" target="_blank">Hlib Zakrevskyi</a></p>
      <div class="mobile-divider"></div>
      <p class="mobile-error">This game requires a physical keyboard.</p>
      <p class="mobile-desc">You need to press <strong>Ctrl+C</strong> to stop<br>dangerous commands before they execute.</p>
      <div class="mobile-divider"></div>
      <p class="mobile-cta">Visit on a desktop computer:</p>
      <a href="https://github.com/hlib-zakr/pshell" class="mobile-url">github.com/hlib-zakr/pshell</a>
      <p class="mobile-follow">Follow: <a href="https://x.com/hlibzakrevskyi" target="_blank">@hlibzakrevskyi</a></p>
    </div>
  `;
  throw new Error('Mobile blocked'); // Stop all further JS execution
}

import { Terminal } from './ui/terminal.js';
import { Screens } from './ui/screens.js';
import { GameEngine } from './game/engine.js';
import { SoundEngine } from './audio/sounds.js';
import { leaderboard } from './leaderboard/supabase.js';
import { initKeyboard } from './input/keyboard.js';
import { initCRTEffect } from './ui/effects.js';
import { MatrixRain } from './ui/matrix-rain.js';
import { TerminalManager } from './ui/terminal-manager.js';
import { initContextMenu } from './ui/context-menu.js';
import { initNotifications, unlockAchievement } from './ui/notifications.js';
import { loadSettings, createSettingsWindow } from './ui/settings.js';
import { createNotepadWindow } from './ui/notepad.js';
import { createFileManagerWindow } from './ui/filemanager.js';
import { createAchievementsWindow } from './ui/achievements.js';

const terminalManager = new TerminalManager();
const terminal = terminalManager.mainTerminal;
const screens = new Screens(terminal);
const sounds = new SoundEngine();
const matrixRain = new MatrixRain();
window._matrixRain = matrixRain; // For settings to control

const engine = new GameEngine({
  terminal, screens, sounds, leaderboard, matrixRain, terminalManager,
});

// Notifications
initNotifications(sounds);

// Load saved settings (theme, CRT, etc.)
loadSettings();

// Sound toggle
const muteBtn = document.getElementById('mute-toggle');
if (muteBtn) {
  muteBtn.addEventListener('click', () => {
    const enabled = sounds.toggle();
    muteBtn.textContent = enabled ? '\u266A' : '\u266A\u0338';
    muteBtn.classList.toggle('muted', !enabled);
  });
}

initCRTEffect();

// Hard mode toggle
const hardBtn = document.getElementById('hard-toggle');
if (hardBtn) {
  hardBtn.addEventListener('click', () => {
    engine.hardMode = !engine.hardMode;
    hardBtn.classList.toggle('hard-active', engine.hardMode);
    hardBtn.textContent = engine.hardMode ? 'HARD: ON' : 'HARD';
  });
}

// Right-click context menu
initContextMenu({
  'about': () => terminalManager._toggleAboutWindow(),
  'settings': () => createSettingsWindow(terminalManager),
  'notepad': () => createNotepadWindow(terminalManager),
  'files': () => createFileManagerWindow(terminalManager),
  'new-terminal': () => { if (!engine.isOpen) engine.reopen(); },
  'toggle-crt': () => {
    document.querySelectorAll('#terminal, .game-terminal').forEach(el =>
      el.classList.toggle('no-crt')
    );
  },
  'toggle-matrix': () => {
    const canvas = document.getElementById('matrix-rain');
    canvas.style.opacity = canvas.style.opacity === '0' ? '' : '0';
  },
  'bring-front': (ctx) => {
    if (ctx.win) window._bringToFront(ctx.win);
  },
  'minimize': (ctx) => {
    if (ctx.win) ctx.win.querySelector('.dot.yellow')?.click();
  },
  'maximize': (ctx) => {
    if (ctx.win) ctx.win.querySelector('.dot.green')?.click();
  },
  'close': (ctx) => {
    if (ctx.win) ctx.win.querySelector('.dot.red')?.click();
  },
  'copy': () => {
    const sel = window.getSelection();
    if (sel.toString()) navigator.clipboard?.writeText(sel.toString());
  },
  'select-all': (ctx) => {
    if (ctx.win) {
      const body = ctx.win.querySelector('#terminal-body, .gt-body');
      if (body) {
        const range = document.createRange();
        range.selectNodeContents(body);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
      }
    }
  },
  'clear': (ctx) => {
    if (ctx.win) {
      const lines = ctx.win.querySelector('#lines-container, .gt-lines');
      if (lines) lines.innerHTML = '';
    }
  },
  'open-icon': (ctx) => {
    if (ctx.icon) {
      ctx.icon.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    }
  },
});

// App events
window.addEventListener('pshell-close', () => engine.close());
window.addEventListener('pshell-reopen', () => {
  if (!engine.isOpen) engine.reopen();
  const hb = document.getElementById('hard-toggle');
  if (hb) {
    hb.classList.toggle('hard-active', engine.hardMode);
    hb.textContent = engine.hardMode ? 'HARD: ON' : 'HARD';
  }
});
window.addEventListener('pshell-minimize', (e) => {
  const { id, label, restore } = e.detail;
  terminalManager.minimizedWindows.set(id, { label, restore: () => {
    restore();
    terminalManager.minimizedWindows.delete(id);
    terminalManager._renderMinimizeBar();
  }});
  terminalManager._renderMinimizeBar();
});
window.addEventListener('pshell-settings', () => createSettingsWindow(terminalManager));
window.addEventListener('pshell-notepad', (e) => createNotepadWindow(terminalManager, e.detail?.file));
window.addEventListener('pshell-filemanager', () => createFileManagerWindow(terminalManager));
window.addEventListener('pshell-achievements', () => createAchievementsWindow(terminalManager));

// Expose achievement system for engine (with debounce guard)
const _achTimestamps = {};
window._unlockAchievement = (id) => {
  const now = Date.now();
  if (_achTimestamps[id] && now - _achTimestamps[id] < 2000) return; // debounce
  _achTimestamps[id] = now;
  unlockAchievement(id);
};

initKeyboard(engine);
matrixRain.start();
engine.showBootThenShell();
