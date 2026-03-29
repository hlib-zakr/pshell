import { Terminal } from './terminal.js';
import { executeCommand, FS, resolvePath } from '../commands/index.js';
import { createSimState } from '../state/simulation-state.js';
import { bringToFront, registerWindow, unregisterWindow } from './window-manager.js';
import { startCronInterval, stopCronInterval } from './cron-scheduler.js';
import { createPromptInput } from './shell-prompt.js';

const TERMINAL_NAMES = ['prod-server', 'db-backup', 'api-gateway', 'worker-node'];

function calcPositions(count, mainRect) {
  const pad = 16;
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  if (count === 1 && mainRect && mainRect.w > 50 && mainRect.h > 50) {
    return [{ x: mainRect.x, y: mainRect.y, w: mainRect.w, h: mainRect.h }];
  }
  if (count === 1) {
    const w = Math.min(850, vw - pad * 2);
    const h = vh * 0.8;
    return [{ x: (vw - w) / 2, y: (vh - h) / 2, w, h }];
  }
  if (count === 2) {
    const w = (vw - pad * 3) / 2;
    return [
      { x: pad, y: pad, w, h: vh - pad * 2 },
      { x: pad * 2 + w, y: pad, w, h: vh - pad * 2 },
    ];
  }
  if (count === 3) {
    const w = (vw - pad * 3) / 2;
    const hRow = (vh - pad * 3) / 2;
    return [
      { x: pad, y: pad, w, h: hRow },
      { x: pad * 2 + w, y: pad, w, h: hRow },
      { x: pad, y: pad * 2 + hRow, w: vw - pad * 2, h: hRow },
    ];
  }
  const w = (vw - pad * 3) / 2;
  const h = (vh - pad * 3) / 2;
  return [
    { x: pad, y: pad, w, h },
    { x: pad * 2 + w, y: pad, w, h },
    { x: pad, y: pad * 2 + h, w, h },
    { x: pad * 2 + w, y: pad * 2 + h, w, h },
  ];
}

function saveMainSize(el) {
  if (!el.dataset.dragged) return;
  try {
    localStorage.setItem('pshell_main_size', JSON.stringify({
      left: el.style.left, top: el.style.top,
      width: el.style.width, height: el.style.height,
    }));
  } catch {}
}

function restoreMainSize(el) {
  try {
    const saved = JSON.parse(localStorage.getItem('pshell_main_size'));
    if (!saved || !saved.width) return;
    const x = parseInt(saved.left) || 0;
    const y = parseInt(saved.top) || 0;
    const w = parseInt(saved.width) || 850;
    const h = parseInt(saved.height) || 500;
    // Discard if off-screen or too big for current viewport
    if (x + w < 50 || y + h < 50 || x > window.innerWidth - 50 || y > window.innerHeight - 50
        || w > window.innerWidth || h > window.innerHeight) {
      localStorage.removeItem('pshell_main_size');
      return;
    }
    el.dataset.dragged = '1';
    el.style.position = 'absolute';
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    el.style.width = w + 'px';
    el.style.height = h + 'px';
    el.style.maxWidth = 'none';
    el.style.maxHeight = 'none';
  } catch { localStorage.removeItem('pshell_main_size'); }
}

export class TerminalManager {
  constructor() {
    this.terminals = [];
    this.app = document.getElementById('app');
    this.mainTerminal = new Terminal();
    this.mainTerminalEl = document.getElementById('terminal');
    this.gameContainer = null;
    this.minimizedWindows = new Map(); // id -> { label, restore() }

    restoreMainSize(this.mainTerminalEl);
    this._makeDraggable(this.mainTerminalEl, this.mainTerminalEl.querySelector('#terminal-header'), true);
    this._makeResizable(this.mainTerminalEl, true);
    this._wireTrafficLights(this.mainTerminalEl, 'PShell');
    registerWindow(this.mainTerminalEl);
    this._createDesktopIcon();
    this._createMinimizeBar();
  }

  _getMainRect() {
    const el = this.mainTerminalEl;
    if (el.dataset.dragged) {
      return {
        x: parseInt(el.style.left) || 0, y: parseInt(el.style.top) || 0,
        w: parseInt(el.style.width) || 850, h: parseInt(el.style.height) || 500,
      };
    }
    const rect = el.getBoundingClientRect();
    return { x: rect.left, y: rect.top, w: rect.width, h: rect.height };
  }

  showMainTerminal() {
    this._removeGameContainer();
    this._clearTerminalIcons();
    // Only clear game-terminal minimized entries, keep app windows
    for (const id of [...this.minimizedWindows.keys()]) {
      if (id === 'main' || /^t\d+$/.test(id)) this.minimizedWindows.delete(id);
    }
    this._renderMinimizeBar();
    this.mainTerminalEl.style.display = '';
    return this.mainTerminal;
  }

  createGameTerminals(count) {
    let mainRect = null;
    if (this.terminals.length > 0 && this.terminals[0].terminalEl) {
      const el = this.terminals[0].terminalEl;
      const rect = el.getBoundingClientRect();
      if (rect.width > 0) {
        mainRect = { x: rect.left, y: rect.top, w: rect.width, h: rect.height };
      }
    }
    if (!mainRect) {
      mainRect = this._getMainRect();
      if (mainRect.w < 50 || mainRect.h < 50) {
        mainRect = null;
      }
    }
    this.mainTerminalEl.style.display = 'none';
    this._removeGameContainer();
    this._clearTerminalIcons();
    // Only clear game-terminal minimized entries, keep app windows
    for (const id of [...this.minimizedWindows.keys()]) {
      if (id === 'main' || /^t\d+$/.test(id)) this.minimizedWindows.delete(id);
    }
    this._renderMinimizeBar();

    this.gameContainer = document.createElement('div');
    this.gameContainer.id = 'game-container';
    this.app.appendChild(this.gameContainer);

    this.terminals = [];
    const positions = calcPositions(count, mainRect);

    for (let i = 0; i < count; i++) {
      const id = `game-term-${Date.now()}-${i}`;
      const name = TERMINAL_NAMES[i];
      const pos = positions[i];
      const termEl = this._createTerminalElement(id, name, i, count, pos);
      this.gameContainer.appendChild(termEl);

      const terminal = new Terminal(
        termEl.querySelector('.gt-lines'),
        termEl.querySelector('.gt-body'),
        termEl
      );
      terminal.id = id;
      terminal.name = name;
      terminal.index = i;
      this.terminals.push(terminal);
    }

    return this.terminals;
  }

  _createTerminalElement(id, name, index, total, pos) {
    const el = document.createElement('div');
    el.className = 'game-terminal';
    el.id = id;
    el.dataset.index = index;
    el.dataset.dragged = '1';
    el.style.position = 'absolute';
    el.style.left = pos.x + 'px';
    el.style.top = pos.y + 'px';
    el.style.width = pos.w + 'px';
    el.style.height = pos.h + 'px';

    const label = `T${index + 1}`;
    el.innerHTML = `
      <div class="gt-header">
        <div class="gt-header-left">
          <span class="dot red"></span>
          <span class="dot yellow"></span>
          <span class="dot green"></span>
        </div>
        <span class="gt-label">${label}</span>
        <span class="gt-title">root@${name}:~$</span>
        <a href="https://github.com/hlib-zakr/pshell" target="_blank" class="header-brand">PShell</a>
        <span class="gt-key">[${index + 1}]</span>
      </div>
      <div class="gt-body">
        <div class="gt-lines"></div>
      </div>
    `;

    this._makeDraggable(el, el.querySelector('.gt-header'), false);
    this._makeResizable(el, false);
    this._wireTrafficLights(el, label);
    registerWindow(el);
    return el;
  }

  _createDesktopIcon() {
    this.iconContainer = document.createElement('div');
    this.iconContainer.id = 'desktop-icons';

    const appIcon = document.createElement('div');
    appIcon.className = 'desktop-icon';
    appIcon.id = 'app-icon';
    appIcon.innerHTML = `<div class="desktop-icon-img">&gt;_</div><div class="desktop-icon-label">PShell<br><span class="icon-brand">by Hlib Zakrevskyi</span></div>`;
    appIcon.title = 'Double-click to open';
    this._makeIconDraggable(appIcon);
    appIcon.addEventListener('dblclick', () => {
      window.dispatchEvent(new CustomEvent('pshell-reopen'));
    });
    this.iconContainer.appendChild(appIcon);

    const aboutIcon = document.createElement('div');
    aboutIcon.className = 'desktop-icon';
    aboutIcon.id = 'about-icon';
    aboutIcon.innerHTML = `<div class="desktop-icon-img about-icon-img">?</div><div class="desktop-icon-label">About</div>`;
    aboutIcon.title = 'Double-click to open';
    this._makeIconDraggable(aboutIcon);
    aboutIcon.addEventListener('dblclick', () => { this._toggleAboutWindow(); });
    this.iconContainer.appendChild(aboutIcon);

    const settingsIcon = document.createElement('div');
    settingsIcon.className = 'desktop-icon';
    settingsIcon.id = 'settings-icon';
    settingsIcon.innerHTML = `<div class="desktop-icon-img settings-icon-img">#</div><div class="desktop-icon-label">Settings</div>`;
    settingsIcon.title = 'Double-click to open';
    this._makeIconDraggable(settingsIcon);
    settingsIcon.addEventListener('dblclick', () => { window.dispatchEvent(new CustomEvent('pshell-settings')); });
    this.iconContainer.appendChild(settingsIcon);

    const filesIcon = document.createElement('div');
    filesIcon.className = 'desktop-icon';
    filesIcon.id = 'files-icon';
    filesIcon.innerHTML = `<div class="desktop-icon-img files-icon-img">/</div><div class="desktop-icon-label">Files</div>`;
    filesIcon.title = 'Double-click to open';
    this._makeIconDraggable(filesIcon);
    filesIcon.addEventListener('dblclick', () => { window.dispatchEvent(new CustomEvent('pshell-filemanager')); });
    this.iconContainer.appendChild(filesIcon);

    const notepadIcon = document.createElement('div');
    notepadIcon.className = 'desktop-icon';
    notepadIcon.id = 'notepad-icon';
    notepadIcon.innerHTML = `<div class="desktop-icon-img notepad-icon-img">=</div><div class="desktop-icon-label">Notepad</div>`;
    notepadIcon.title = 'Double-click to open';
    this._makeIconDraggable(notepadIcon);
    notepadIcon.addEventListener('dblclick', () => { window.dispatchEvent(new CustomEvent('pshell-notepad')); });
    this.iconContainer.appendChild(notepadIcon);

    const achievementsIcon = document.createElement('div');
    achievementsIcon.className = 'desktop-icon';
    achievementsIcon.id = 'achievements-icon';
    achievementsIcon.innerHTML = `<div class="desktop-icon-img achievements-icon-img">&#9733;</div><div class="desktop-icon-label">Achievements</div>`;
    achievementsIcon.title = 'Double-click to open';
    this._makeIconDraggable(achievementsIcon);
    achievementsIcon.addEventListener('dblclick', () => { window.dispatchEvent(new CustomEvent('pshell-achievements')); });
    this.iconContainer.appendChild(achievementsIcon);

    this.termIconsContainer = document.createElement('div');
    this.termIconsContainer.id = 'term-icons';
    this.iconContainer.appendChild(this.termIconsContainer);

    document.body.appendChild(this.iconContainer);
  }

  _toggleAboutWindow() {
    const existing = document.getElementById('about-window');
    if (existing) { bringToFront(existing); return; }

    const win = document.createElement('div');
    win.className = 'game-terminal about-window';
    win.id = 'about-window';
    win.dataset.dragged = '1';
    win.style.position = 'fixed';
    const aw = Math.min(600, window.innerWidth * 0.5);
    const ah = Math.min(560, window.innerHeight * 0.75);
    win.style.left = (window.innerWidth / 2 - aw / 2) + 'px';
    win.style.top = (window.innerHeight / 2 - ah / 2) + 'px';
    win.style.width = aw + 'px';
    win.style.height = ah + 'px';
    win.innerHTML = `
      <div class="gt-header">
        <div class="gt-header-left">
          <span class="dot red"></span>
          <span class="dot yellow"></span>
          <span class="dot green"></span>
        </div>
        <span class="gt-title">classified@pshell.internal</span>
        <a href="https://github.com/hlib-zakr/pshell" target="_blank" class="header-brand">PShell</a>
      </div>
      <div class="gt-body">
        <div class="gt-lines about-content"></div>
      </div>
    `;

    document.body.appendChild(win);
    this._makeDraggable(win, win.querySelector('.gt-header'), false);
    registerWindow(win);
    this._wireAboutTrafficLights(win);

    const aboutTerm = new Terminal(
      win.querySelector('.gt-lines'),
      win.querySelector('.gt-body'),
      win
    );

    this._showAboutLogin(aboutTerm, win);
  }

  _wireAboutTrafficLights(win) {
    const red = win.querySelector('.dot.red');
    if (red) {
      red.title = 'Close';
      red.addEventListener('click', (e) => {
        e.stopPropagation();
        // Clear cron interval when about window is closed
        stopCronInterval(this._cronIntervalId);
        this._cronIntervalId = null;
        unregisterWindow(win);
        win.remove();
      });
    }
    const green = win.querySelector('.dot.green');
    if (green) green.style.display = 'none';
    const yellow = win.querySelector('.dot.yellow');
    if (yellow) yellow.style.display = 'none';
  }

  _showAboutLogin(term, win) {
    term.addLine('', 'blank');
    const hintLine = term.addLine('Press [ENTER] to connect...', 'about-enter-hint');
    term.addLine('', 'blank');

    const inputLine = document.createElement('div');
    inputLine.className = 'line input-line about-prompt-line';
    inputLine.innerHTML = `<span class="prompt">$ </span>`;

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'about-cmd-input';
    input.value = 'ssh classified@pshell.internal';
    input.autocomplete = 'off';
    input.spellcheck = false;

    inputLine.appendChild(input);
    term.linesContainer.appendChild(inputLine);
    term._scrollToBottom();
    setTimeout(() => { input.focus(); input.setSelectionRange(input.value.length, input.value.length); }, 100);

    const body = win.querySelector('.gt-body');
    const loginClickHandler = (e) => { if (e.target.closest('a') || e.target.closest('.dot')) return; input.focus(); };
    body.addEventListener('click', loginClickHandler);

    input.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter') return;
      e.stopPropagation();
      body.removeEventListener('click', loginClickHandler);
      hintLine.remove();
      term.addLine('$ ' + input.value, 'about-cmd');
      inputLine.remove();
      this._runAboutSequence(term, win);
    });
  }

  async _runAboutSequence(term, win) {
    const sleep = ms => new Promise(r => setTimeout(r, ms));

    await sleep(300);
    await term.typeLine('Connecting to 10.0.42.1...', 'about-access', 10);
    await sleep(400);
    await term.typeLine('Authenticating.............. OK', 'about-access', 15);
    await sleep(200);
    await term.typeLine('Access level: TOP SECRET', 'about-access-warn', 12);
    await sleep(300);
    await term.typeLine('Decrypting file: /about/pshell.classified', 'about-access', 8);
    await sleep(200);

    const barLine = document.createElement('div');
    barLine.className = 'line about-access';
    const barText = document.createElement('span');
    barLine.appendChild(barText);
    term.linesContainer.appendChild(barLine);

    for (let i = 0; i <= 20; i++) {
      const filled = '\u2593'.repeat(i);
      const empty = '\u2591'.repeat(20 - i);
      const pct = Math.round(i * 100 / 20);
      barText.textContent = `[${filled}${empty}] ${pct}%`;
      term._scrollToBottom();
      await sleep(40);
    }

    await sleep(300);
    term.addLine('', 'blank');
    await term.typeLine('ACCESS GRANTED', 'about-granted', 25);
    await sleep(500);
    term.addLine('', 'blank');

    const contentLines = [
      { t: '═══════════════════════════════════════', c: 'about-divider' },
      { t: '', c: 'blank' },
      { t: '  ██████╗  ███████╗ ██╗  ██╗ ███████╗ ██╗      ██╗', c: 'about-logo' },
      { t: '  ██╔══██╗ ██╔════╝ ██║  ██║ ██╔════╝ ██║      ██║', c: 'about-logo' },
      { t: '  ██████╔╝ ███████╗ ███████║ █████╗   ██║      ██║', c: 'about-logo' },
      { t: '  ██╔═══╝  ╚════██║ ██╔══██║ ██╔══╝   ██║      ██║', c: 'about-logo' },
      { t: '  ██║      ███████║ ██║  ██║ ███████╗ ███████╗ ███████╗', c: 'about-logo' },
      { t: '  ╚═╝      ╚══════╝ ╚═╝  ╚═╝ ╚══════╝ ╚══════╝ ╚══════╝', c: 'about-logo' },
      { t: '', c: 'blank' },
      { t: '  PShell — by Hlib Zakrevskyi', c: 'about-tagline' },
      { t: '', c: 'blank' },
      { t: '═══════════════════════════════════════════════════════', c: 'about-divider' },
      { t: '', c: 'blank' },
      { t: 'PROJECT: PSHELL v2.0', c: 'about-heading' },
      { t: '', c: 'blank' },
    ];

    for (const { t, c } of contentLines) { term.addLine(t, c); await sleep(25); }

    term.streamText([
      'A reaction game for people who think they can',
      'handle production. Spoiler: they can\'t.',
      '',
      'Dangerous bash commands scroll through your',
      'terminal. You have milliseconds to press Ctrl+C.',
      'Miss one? Congrats, you just took down prod.',
    ], 'about-text', 5, () => {});
    await sleep(1800);

    term.addLine('', 'blank');
    term.addLine('═══════════════════════════════════════', 'about-divider');
    term.addLine('', 'blank');
    term.addLine('CLASSIFIED INTEL:', 'about-heading');
    term.addLine('', 'blank');

    const builtWith = [
      ['Claude', 'the mass destruction weapon'],
      ['Tears', 'the mass production fuel'],
      ['Hlib Zakrevskyi', 'the one who started it all'],
    ];
    for (const [tech, desc] of builtWith) {
      const line = document.createElement('div');
      line.className = 'line about-builtwith';
      line.innerHTML = `  &gt; <span class="about-tech">${tech}</span> ........ ${desc}`;
      term.linesContainer.appendChild(line);
      term._scrollToBottom();
      await sleep(100);
    }

    term.addLine('', 'blank');
    term.addLine('═══════════════════════════════════════', 'about-divider');
    term.addLine('', 'blank');
    term.addLine('FIELD CONTACT:', 'about-heading');
    term.addLine('', 'blank');

    const socialLine = document.createElement('div');
    socialLine.className = 'line about-social';
    socialLine.innerHTML = `<span class="about-x-art">\u2572 \u2571\n X\n\u2571 \u2572</span><a href="https://x.com/hlibzakrevskyi" target="_blank" class="about-x-link">@hlibzakrevskyi</a>`;
    term.linesContainer.appendChild(socialLine);
    term._scrollToBottom();

    await sleep(200);
    term.addLine('', 'blank');
    term.addLine('═══════════════════════════════════════', 'about-divider');
    term.addLine('', 'blank');
    term.addLine('STATUS: active | no servers harmed*', 'about-footer');
    term.addLine('         *yours might be though', 'about-footer-sub');
    term.addLine('', 'blank');

    await sleep(300);
    term.addLine('Type "help" for available commands.', 'about-access');
    term.addLine('', 'blank');
    this._showAboutPrompt(term, win);

    // Start cron job simulation — every 15s, pick a random crontab entry and show a toast
    this._startCronInterval();
  }

  _startCronInterval() {
    this._cronIntervalId = startCronInterval(this._aboutState, this._cronIntervalId);
  }

  _showAboutPrompt(term, win) {
    if (!this._aboutHistory) this._aboutHistory = [];
    const cwdDisplay = (this._aboutState?.cwd || '~').replace('/home/classified', '~');

    createPromptInput(term, win, '.gt-body', `classified@pshell:${cwdDisplay}$ `, {
      history: this._aboutHistory,
      state: this._aboutState,
      onSubmit: async (rawCmd, cmd) => {
        if (this._aboutState?.sim) {
          if (!this._aboutState.sim._history) this._aboutState.sim._history = [];
          this._aboutState.sim._history.push(rawCmd);
        }
        const cwdShow = (this._aboutState?.cwd || '~').replace('/home/classified', '~');
        term.addLine(`classified@pshell:${cwdShow}$ ${rawCmd}`, 'about-cmd');
        await this._handleAboutCommand(cmd, term, win, rawCmd);
        if (document.getElementById('about-window')) {
          this._showAboutPrompt(term, win);
        }
      },
    });
  }

  // ─── Main Terminal Prompt (Shell Mode) ───

  showMainPrompt(engine) {
    if (engine) this._shellEngine = engine;
    this._initAboutState();
    if (!this._mainPromptShown) {
      this._aboutState.cwd = '/home/classified';
      this._mainPromptShown = true;
    }
    if (!this._aboutHistory) this._aboutHistory = [];
    const term = this.mainTerminal;
    const win = this.mainTerminalEl;
    const name = this._shellEngine?.playerName || 'user';
    const cwdDisplay = (this._aboutState?.cwd || '~').replace('/home/classified', '~');

    createPromptInput(term, win, '#terminal-body', `${name}@pshell:${cwdDisplay}$ `, {
      history: this._aboutHistory,
      state: this._aboutState,
      extraClasses: 'main-prompt-line',
      onEmptyEnter: (inputLine) => {
        if (this._shellEngine) {
          const cwdShow = (this._aboutState?.cwd || '~').replace('/home/classified', '~');
          const nameShow = this._shellEngine?.playerName || 'user';
          term.addLine(`${nameShow}@pshell:${cwdShow}$`, 'about-cmd');
          inputLine.remove();
          this._shellEngine.sounds.init();
          this._shellEngine.transition('PLAYING');
        }
      },
      onSubmit: async (rawCmd, cmd) => {
        if (this._aboutState?.sim) {
          if (!this._aboutState.sim._history) this._aboutState.sim._history = [];
          this._aboutState.sim._history.push(rawCmd);
        }
        const cwdShow = (this._aboutState?.cwd || '~').replace('/home/classified', '~');
        const nameShow = this._shellEngine?.playerName || 'user';
        term.addLine(`${nameShow}@pshell:${cwdShow}$ ${rawCmd}`, 'about-cmd');
        await this._handleMainCommand(cmd, rawCmd);
        if (this._shellEngine?.state === 'SHELL') {
          this.showMainPrompt();
        }
      },
    });
  }

  hideMainPrompt() {
    const existing = this.mainTerminalEl?.querySelector('.main-prompt-line');
    if (existing) existing.remove();
  }

  async _handleMainCommand(cmd, rawCmd) {
    this._initAboutState();
    const term = this.mainTerminal;
    const win = this.mainTerminalEl;
    const engine = this._shellEngine;

    const ctx = {
      term, win, state: this._aboutState,
      sleep: ms => new Promise(r => setTimeout(r, ms)),
      FS,
      rawCmd: rawCmd || cmd,
      isMainTerminal: true,
      unregisterWindow: (w) => { unregisterWindow(w); },
    };

    // Add game callbacks
    if (engine) {
      ctx.onPlay = (termCount) => {
        if (termCount) window._selectedTerminals = termCount;
        engine.sounds.init();
        engine.transition('PLAYING');
      };
      ctx.onTutorial = () => {
        engine.sounds.init();
        engine.transition('TUTORIAL');
      };
    }

    await executeCommand(cmd, ctx);
  }

  // ─── Shared State Initialization ───

  _initAboutState() {
    if (!this._aboutState) {
      const sim = createSimState();
      this._aboutState = {
        get cwd() { return sim.session.cwd; },
        set cwd(v) { sim.session.cwd = v; },
        get hackedMainframe() { return sim.session.hackedMainframe; },
        set hackedMainframe(v) { sim.session.hackedMainframe = v; },
        get foundPort() { return sim.session.foundPort; },
        set foundPort(v) { sim.session.foundPort = v; },
        get sudoCount() { return sim.session.sudoCount; },
        set sudoCount(v) { sim.session.sudoCount = v; },
        get rmCount() { return sim.session.rmCount; },
        set rmCount(v) { sim.session.rmCount = v; },
        get exitAttempts() { return sim.session.exitAttempts; },
        set exitAttempts(v) { sim.session.exitAttempts = v; },
        sim,
      };
    }
  }

  // Resolve a path relative to cwd, handling .., ~, absolute, relative
  _resolvePath(cwd, target, fs) {
    return resolvePath(cwd, target, fs);
  }

  async _handleAboutCommand(cmd, term, win, rawCmd) {
    this._initAboutState();
    const ctx = {
      term, win, state: this._aboutState,
      sleep: ms => new Promise(r => setTimeout(r, ms)),
      FS,
      rawCmd: rawCmd || cmd,
      unregisterWindow: (w) => { unregisterWindow(w); },
    };
    await executeCommand(cmd, ctx);
  }

  _addTerminalIcons(count) {
    this._clearTerminalIcons();
    for (let i = 0; i < count; i++) {
      const icon = document.createElement('div');
      icon.className = 'desktop-icon term-icon';
      icon.dataset.index = i;
      icon.innerHTML = `<div class="desktop-icon-img term-icon-img">&gt;_</div><div class="desktop-icon-label">T${i + 1}</div>`;
      icon.title = `Double-click to open T${i + 1}`;
      this._makeIconDraggable(icon);
      icon.addEventListener('dblclick', () => {
        const termEl = this.terminals[i]?.terminalEl;
        if (!termEl) return;
        termEl.style.display = '';
        for (const t of this.terminals) t.terminalEl.classList.remove('term-focused');
        termEl.classList.add('term-focused');
        bringToFront(termEl);
        this.minimizedWindows.delete(`t${i}`);
        this._renderMinimizeBar();
      });
      this.termIconsContainer.appendChild(icon);
    }
  }

  _clearTerminalIcons() {
    if (this.termIconsContainer) this.termIconsContainer.innerHTML = '';
  }

  _syncTermIcons() {
    if (!this.termIconsContainer) return;
    const icons = this.termIconsContainer.querySelectorAll('.term-icon');
    icons.forEach((icon) => {
      const idx = parseInt(icon.dataset.index);
      const termEl = this.terminals[idx]?.terminalEl;
      if (termEl) { icon.classList.toggle('icon-visible', termEl.style.display === 'none'); }
    });
  }

  _createMinimizeBar() {
    this.minimizeBar = document.createElement('div');
    this.minimizeBar.id = 'minimize-bar';
    this.minimizeBar.style.display = 'flex';

    this.minimizeTabs = document.createElement('div');
    this.minimizeTabs.className = 'minimize-tabs';
    this.minimizeBar.appendChild(this.minimizeTabs);

    const tray = document.createElement('div');
    tray.className = 'system-tray';
    // PShell branding in tray
    const brand = document.createElement('a');
    brand.className = 'tray-brand';
    brand.href = 'https://github.com/hlib-zakr/pshell';
    brand.target = '_blank';
    brand.textContent = 'PShell';
    tray.appendChild(brand);

    const traySep = document.createElement('span');
    traySep.className = 'tray-sep';
    traySep.textContent = '|';
    tray.appendChild(traySep);

    const clock = document.createElement('span');
    clock.className = 'tray-clock';
    clock.textContent = new Date().toLocaleTimeString();
    setInterval(() => { clock.textContent = new Date().toLocaleTimeString(); }, 1000);
    tray.appendChild(clock);

    const copySep = document.createElement('span');
    copySep.className = 'tray-sep';
    copySep.textContent = '|';
    tray.appendChild(copySep);

    const copyright = document.createElement('span');
    copyright.className = 'tray-copyright';
    copyright.textContent = '© 2026 Hlib Zakrevskyi';
    tray.appendChild(copyright);

    this.minimizeBar.appendChild(tray);
    document.body.appendChild(this.minimizeBar);
  }

  _renderMinimizeBar() {
    this.minimizeTabs.innerHTML = '';
    for (const [id, info] of this.minimizedWindows) {
      const tab = document.createElement('button');
      tab.className = 'minimize-tab';
      tab.innerHTML = `<span class="minimize-tab-icon">&gt;_</span> ${info.label}`;
      tab.addEventListener('click', () => { info.restore(); this.minimizedWindows.delete(id); this._renderMinimizeBar(); });
      this.minimizeTabs.appendChild(tab);
    }
  }

  _makeIconDraggable(icon) {
    let isDown = false;
    let hasMoved = false;
    let startX, startY, origRect;
    let placeholder = null;

    icon.addEventListener('mousedown', (e) => {
      isDown = true; hasMoved = false;
      startX = e.clientX; startY = e.clientY;
      origRect = icon.getBoundingClientRect();
      e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
      if (!isDown) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      if (!hasMoved && (Math.abs(dx) > 4 || Math.abs(dy) > 4)) {
        hasMoved = true;
        placeholder = document.createElement('div');
        placeholder.style.width = origRect.width + 'px';
        placeholder.style.height = origRect.height + 'px';
        placeholder.style.visibility = 'hidden';
        icon.parentElement.insertBefore(placeholder, icon);
        document.body.appendChild(icon);
        icon.style.position = 'fixed';
        icon.style.left = origRect.left + 'px';
        icon.style.top = origRect.top + 'px';
        icon.style.zIndex = '0';
      }
      if (hasMoved) {
        icon.style.left = (origRect.left + dx) + 'px';
        icon.style.top = (origRect.top + dy) + 'px';
      }
    });

    document.addEventListener('mouseup', () => {
      if (isDown) {
        isDown = false;
        if (hasMoved) { icon.dataset.justDragged = '1'; setTimeout(() => delete icon.dataset.justDragged, 300); }
      }
    });

    icon.addEventListener('dblclick', (e) => {
      if (icon.dataset.justDragged) { e.stopImmediatePropagation(); e.preventDefault(); }
    }, true);
  }

  _wireTrafficLights(el, label) {
    const red = el.querySelector('.dot.red');
    const yellow = el.querySelector('.dot.yellow');
    const green = el.querySelector('.dot.green');

    if (red) {
      red.title = 'Close';
      red.addEventListener('click', (e) => {
        e.stopPropagation();
        el.style.display = 'none';
        el.classList.remove('term-focused');
        const id = el.id || 'main';
        this.minimizedWindows.delete(id);
        this._renderMinimizeBar();
        if (!el.classList.contains('game-terminal')) {
          window.dispatchEvent(new CustomEvent('pshell-close'));
        } else {
          // Check if all game terminals are now closed
          const visibleTerms = this.terminals.filter(t => t.terminalEl.style.display !== 'none');
          if (visibleTerms.length === 0) {
            window.dispatchEvent(new CustomEvent('pshell-close'));
          }
        }
      });
    }

    if (yellow) {
      yellow.title = 'Minimize';
      yellow.addEventListener('click', (e) => {
        e.stopPropagation();
        if (el.style.height) el.dataset.prevHeight = el.style.height;
        el.style.display = 'none';
        el.classList.remove('term-focused');
        const id = el.id || 'main';
        this.minimizedWindows.set(id, {
          label: label || 'Terminal',
          restore: () => { el.style.display = ''; if (el.dataset.prevHeight) el.style.height = el.dataset.prevHeight; bringToFront(el); },
        });
        this._renderMinimizeBar();
      });
    }

    if (green) {
      green.title = 'Maximize';
      green.addEventListener('click', (e) => {
        e.stopPropagation();
        if (el.dataset.maximized === '1') {
          el.style.left = el.dataset.restoreLeft;
          el.style.top = el.dataset.restoreTop;
          el.style.width = el.dataset.restoreWidth;
          el.style.height = el.dataset.restoreHeight;
          el.dataset.maximized = '0';
        } else {
          const rect = el.getBoundingClientRect();
          el.dataset.restoreLeft = rect.left + 'px';
          el.dataset.restoreTop = rect.top + 'px';
          el.dataset.restoreWidth = rect.width + 'px';
          el.dataset.restoreHeight = rect.height + 'px';
          if (!el.dataset.dragged) {
            el.dataset.dragged = '1';
            el.style.position = 'absolute';
            el.style.maxWidth = 'none';
            el.style.maxHeight = 'none';
          }
          el.style.left = '0px';
          el.style.top = '0px';
          el.style.width = window.innerWidth + 'px';
          el.style.height = window.innerHeight + 'px';
          el.dataset.maximized = '1';
        }
      });
    }
  }

  _makeDraggable(el, handle, saveSize) {
    handle.addEventListener('dblclick', (e) => {
      if (e.target.closest('.dot') || e.target.closest('.header-btn') || e.target.closest('.hud')) return;
      e.preventDefault();
      const greenDot = el.querySelector('.dot.green');
      if (greenDot && greenDot.style.display !== 'none') greenDot.click();
    });

    let isDragging = false;
    let startX, startY, origX, origY;

    handle.addEventListener('mousedown', (e) => {
      if (e.target.closest('.dot') || e.target.closest('.header-btn') || e.target.closest('.hud')) return;
      isDragging = true;
      if (!el.dataset.dragged) {
        const rect = el.getBoundingClientRect();
        el.dataset.dragged = '1';
        el.style.position = 'absolute';
        el.style.left = rect.left + 'px';
        el.style.top = rect.top + 'px';
        el.style.width = rect.width + 'px';
        el.style.height = rect.height + 'px';
        el.style.maxWidth = 'none';
        el.style.maxHeight = 'none';
      }
      startX = e.clientX; startY = e.clientY;
      origX = parseInt(el.style.left); origY = parseInt(el.style.top);
      bringToFront(el);
      el.classList.add('dragging');
      e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      el.style.left = (origX + e.clientX - startX) + 'px';
      el.style.top = (origY + e.clientY - startY) + 'px';
    });

    document.addEventListener('mouseup', () => {
      if (isDragging) { isDragging = false; el.classList.remove('dragging'); if (saveSize) saveMainSize(el); }
    });
  }

  _makeResizable(el, saveOnEnd) {
    const edges = ['n', 'e', 's', 'w', 'ne', 'se', 'sw', 'nw'];
    for (const edge of edges) {
      const handle = document.createElement('div');
      handle.className = `resize-handle resize-${edge}`;
      el.appendChild(handle);

      handle.addEventListener('mousedown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!el.dataset.dragged) {
          const rect = el.getBoundingClientRect();
          el.dataset.dragged = '1';
          el.style.position = 'absolute';
          el.style.left = rect.left + 'px';
          el.style.top = rect.top + 'px';
          el.style.width = rect.width + 'px';
          el.style.height = rect.height + 'px';
          el.style.maxWidth = 'none';
          el.style.maxHeight = 'none';
        }
        const startX = e.clientX, startY = e.clientY;
        const origW = parseInt(el.style.width), origH = parseInt(el.style.height);
        const origX = parseInt(el.style.left), origY = parseInt(el.style.top);
        bringToFront(el);

        const onMove = (e) => {
          const dx = e.clientX - startX, dy = e.clientY - startY;
          if (edge.includes('e')) el.style.width = Math.max(300, origW + dx) + 'px';
          if (edge.includes('s')) el.style.height = Math.max(200, origH + dy) + 'px';
          if (edge.includes('w')) { const nw = Math.max(300, origW - dx); el.style.width = nw + 'px'; el.style.left = (origX + origW - nw) + 'px'; }
          if (edge.includes('n')) { const nh = Math.max(200, origH - dy); el.style.height = nh + 'px'; el.style.top = (origY + origH - nh) + 'px'; }
        };
        const onUp = () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); if (saveOnEnd) saveMainSize(el); };
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
      });
    }
  }

  _removeGameContainer() {
    for (const t of this.terminals) {
      if (t.terminalEl) unregisterWindow(t.terminalEl);
    }
    if (this.gameContainer) {
      this.gameContainer.remove();
      this.gameContainer = null;
    }
    this.terminals = [];
  }
}
