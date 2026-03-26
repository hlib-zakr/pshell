import { showToast } from './notifications.js';

const THEMES = {
  green:  { name: 'Matrix Green', primary: '#00ff41', bright: '#33ff66' },
  amber:  { name: 'Retro Amber',  primary: '#ffb000', bright: '#ffc833' },
  cyan:   { name: 'Cyberpunk',    primary: '#00e5ff', bright: '#33ecff' },
  red:    { name: 'Red Alert',    primary: '#ff3333', bright: '#ff6666' },
  purple: { name: 'Vaporwave',    primary: '#bf5af2', bright: '#d17ff5' },
  white:  { name: 'Classic',      primary: '#cccccc', bright: '#ffffff' },
};

const STORAGE_KEY = 'pshell_settings';

let currentSettings = {
  theme: 'green',
  crt: true,
  matrixSpeed: 1,
  matrixOn: true,
  volume: 0.7,
  fontSize: 14,
};

export function loadSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved) Object.assign(currentSettings, saved);
  } catch {}
  applySettings();
}

export function getSettings() { return currentSettings; }

function saveSettings() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(currentSettings));
}

function applySettings() {
  const root = document.documentElement;
  const theme = THEMES[currentSettings.theme] || THEMES.green;

  root.style.setProperty('--term-green', theme.primary);
  root.style.setProperty('--term-bright-green', theme.bright);

  // CRT
  document.querySelectorAll('#terminal, .game-terminal').forEach(el => {
    el.classList.toggle('no-crt', !currentSettings.crt);
  });

  // Font size
  root.style.setProperty('--term-font-size', currentSettings.fontSize + 'px');

  // Matrix
  if (window._matrixRain) {
    window._matrixRain.speedMultiplier = currentSettings.matrixSpeed;
    if (!currentSettings.matrixOn) {
      document.getElementById('matrix-rain').style.opacity = '0';
    }
  }
}

export function createSettingsWindow(terminalManager) {
  const existing = document.getElementById('settings-window');
  if (existing) {
    if (typeof window._bringToFront === 'function') window._bringToFront(existing);
    return;
  }

  const win = document.createElement('div');
  win.className = 'game-terminal settings-window';
  win.id = 'settings-window';
  win.dataset.dragged = '1';
  win.style.position = 'fixed';
  const sw = Math.min(440, window.innerWidth * 0.4);
  const sh = Math.min(500, window.innerHeight * 0.7);
  win.style.left = (window.innerWidth / 2 - sw / 2) + 'px';
  win.style.top = (window.innerHeight / 2 - sh / 2) + 'px';
  win.style.width = sw + 'px';
  win.style.height = sh + 'px';

  const s = currentSettings;

  win.innerHTML = `
    <div class="gt-header">
      <div class="gt-header-left">
        <span class="dot red"></span>
        <span class="dot yellow" style="display:none"></span>
        <span class="dot green"></span>
      </div>
      <span class="gt-title">Settings</span>
      <a href="https://github.com/hlib-zakr/pshell" target="_blank" class="header-brand">PShell</a>
    </div>
    <div class="gt-body settings-body">
      <div class="settings-content">

        <div class="settings-section">THEME</div>
        <div class="settings-row theme-row">
          ${Object.entries(THEMES).map(([id, t]) =>
            `<button class="theme-btn${s.theme === id ? ' active' : ''}" data-theme="${id}" style="color:${t.primary};border-color:${t.primary}" title="${t.name}">${t.name.split(' ')[0]}</button>`
          ).join('')}
        </div>

        <div class="settings-section">DISPLAY</div>
        <div class="settings-row">
          <label>CRT Scanlines</label>
          <input type="checkbox" class="settings-check" data-key="crt" ${s.crt ? 'checked' : ''}>
        </div>
        <div class="settings-row">
          <label>Font Size</label>
          <input type="range" class="settings-range" data-key="fontSize" min="10" max="20" value="${s.fontSize}">
          <span class="settings-val" data-for="fontSize">${s.fontSize}px</span>
        </div>

        <div class="settings-section">MATRIX RAIN</div>
        <div class="settings-row">
          <label>Enabled</label>
          <input type="checkbox" class="settings-check" data-key="matrixOn" ${s.matrixOn ? 'checked' : ''}>
        </div>
        <div class="settings-row">
          <label>Speed</label>
          <input type="range" class="settings-range" data-key="matrixSpeed" min="0.5" max="3" step="0.1" value="${s.matrixSpeed}">
          <span class="settings-val" data-for="matrixSpeed">${s.matrixSpeed}x</span>
        </div>

        <div class="settings-section">AUDIO</div>
        <div class="settings-row">
          <label>Volume</label>
          <input type="range" class="settings-range" data-key="volume" min="0" max="1" step="0.1" value="${s.volume}">
          <span class="settings-val" data-for="volume">${Math.round(s.volume * 100)}%</span>
        </div>

        <div class="settings-section">ABOUT</div>
        <div class="settings-row">
          <a href="https://github.com/hlib-zakr/pshell" target="_blank" class="promptup-link" style="flex:none">PShell by Hlib Zakrevskyi</a>
        </div>

      </div>
    </div>
  `;

  document.body.appendChild(win);
  terminalManager._makeDraggable(win, win.querySelector('.gt-header'), false);
  terminalManager._makeResizable(win, false);

  // Register in window stack for proper z-index management
  // Use mousedown to bring to front on click
  win.addEventListener('mousedown', () => { if (window._bringToFront) window._bringToFront(win); });
  if (typeof window._bringToFront === 'function') window._bringToFront(win);

  // Traffic lights
  win.querySelector('.dot.red').addEventListener('click', (e) => {
    e.stopPropagation();
    win.remove();
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

  // Theme buttons
  win.querySelectorAll('.theme-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      win.querySelectorAll('.theme-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentSettings.theme = btn.dataset.theme;
      applySettings();
      saveSettings();
      showToast('Theme changed', THEMES[btn.dataset.theme].name);
      if (window._unlockAchievement) window._unlockAchievement('theme_changer');
    });
  });

  // Checkboxes
  win.querySelectorAll('.settings-check').forEach(chk => {
    chk.addEventListener('change', () => {
      currentSettings[chk.dataset.key] = chk.checked;
      applySettings();
      saveSettings();
    });
  });

  // Sliders
  win.querySelectorAll('.settings-range').forEach(range => {
    range.addEventListener('input', () => {
      const key = range.dataset.key;
      currentSettings[key] = parseFloat(range.value);
      const valEl = win.querySelector(`.settings-val[data-for="${key}"]`);
      if (valEl) {
        if (key === 'volume') valEl.textContent = Math.round(range.value * 100) + '%';
        else if (key === 'fontSize') valEl.textContent = range.value + 'px';
        else valEl.textContent = range.value + 'x';
      }
      applySettings();
      saveSettings();
    });
  });
}
