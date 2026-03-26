import { getCommandsForLevel } from './commands.js';
import { getLevelConfig } from './levels.js';
import { calculateScore } from './scoring.js';

const STATE_CLASS_MAP = {
  'MENU': 'state-menu',
  'SHELL': 'state-menu',
  'PLAYING': 'state-playing',
  'GAME_OVER': 'state-gameover',
  'LEADERBOARD': 'state-menu',
  'TUTORIAL': 'state-playing',
};

const RAIN_STATE_MAP = {
  'MENU': 'menu',
  'SHELL': 'menu',
  'PLAYING': 'playing',
  'GAME_OVER': 'gameover',
  'LEADERBOARD': 'menu',
  'TUTORIAL': 'playing',
};

// Short command outputs (appear instantly)
const CMD_OUTPUTS = [
  ['total 48', 'drwxr-xr-x  12 root root 4096 Mar 24 09:12 .'],
  ['On branch main', 'nothing to commit, working tree clean'],
  ['CONTAINER ID   IMAGE     STATUS', 'a1b2c3d4e5f6   nginx     Up 2 hours'],
  ['/dev/sda1       50G   23G   25G  48%'],
  ['64 bytes from 8.8.8.8: icmp_seq=1 ttl=118 time=12.3 ms'],
  ['HTTP/1.1 200 OK', 'Server: nginx/1.24.0'],
  ['● nginx.service - active (running)'],
  ['HEAD is now at a1b2c3d Fix login endpoint'],
  ['Already up to date.'],
  ['All 47 tests passed.'],
];

// Longer prose/explanatory text that streams character by character (like Claude)
const STREAMING_TEXT = [
  'Analyzing server logs from the last 24 hours. Found 3 anomalies in the request pattern — two spikes at 03:00 UTC correlating with the cron job, and one unexplained burst at 14:22 UTC. Investigating further...',
  'The deployment pipeline completed successfully. All 12 microservices have been updated to v2.4.1. Rolling restart is in progress across 3 availability zones. Estimated completion: 4 minutes.',
  'Database connection pool is at 78% capacity. Current active connections: 156/200. Consider scaling the read replicas if traffic continues to increase at the current rate of 12% per hour.',
  'SSL certificate renewal completed for all 8 domains. Next renewal scheduled for 2027-01-15. Certificate transparency logs have been updated. No issues detected with the certificate chain.',
  'Memory usage has been trending upward over the past week. Current heap: 1.2GB / 2GB. The leak appears to be in the session handler — objects are not being garbage collected after timeout. Marking for review.',
  'Automated security scan completed. 0 critical vulnerabilities found. 2 medium-severity issues flagged: outdated TLS cipher suite on port 8443 and missing HSTS header on the admin panel.',
  'Load test results: p50 latency 23ms, p95 latency 89ms, p99 latency 210ms. Max throughput achieved: 12,400 req/s before degradation. Bottleneck identified in the auth middleware.',
  'Rebuilding search index... Processing 2.3M documents across 4 shards. Current progress: shard 1 complete, shard 2 at 67%. Expected completion in approximately 8 minutes.',
  'The CI pipeline failed on commit a3f9c21. Root cause: flaky test in the payment module (test_refund_idempotency). This test has failed 3 times in the last 2 weeks. Recommending quarantine.',
  'Monitoring alert resolved: disk usage on web-03 dropped from 92% to 61% after log rotation. The compressed logs from March have been archived to cold storage.',
  'API rate limiting report: 4 clients exceeded their quota in the past hour. Top offender: api-key-7x9k2 with 15,000 requests (limit: 10,000). Automatic throttling engaged.',
  'Kubernetes cluster autoscaler added 2 nodes to the worker pool. Current node count: 14. Pod scheduling backlog cleared. Average pod startup time: 8.3 seconds.',
  'Reviewing the incident from yesterday — the root cause was a misconfigured health check interval that caused the load balancer to mark healthy instances as unhealthy during garbage collection pauses.',
  'Syncing configuration across environments. Staging now matches production for all feature flags. Note: the new checkout flow (flag: new_checkout_v2) is still disabled in prod.',
  'Running database vacuum and analyze on the transactions table (48M rows). This should improve query performance for the dashboard reports that have been slow since last week.',
];

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

export class GameEngine {
  constructor({ terminal, screens, sounds, leaderboard, matrixRain, terminalManager }) {
    this.terminal = terminal;
    this.screens = screens;
    this.sounds = sounds;
    this.leaderboard = leaderboard;
    this.matrixRain = matrixRain;
    this.terminalManager = terminalManager;

    this.state = 'MENU';
    this.score = 0;
    this.level = 1;
    this.commandsCaught = 0;
    this.reactionTimes = [];
    this.ctrlCDebounce = false;
    this.menuReady = false;
    this.lastUsername = '';

    this.isOpen = true;
    this.hardMode = false;
    this.deathCause = null;
    this.playerName = localStorage.getItem('pshell_player_name') || '';

    // Multi-terminal state
    this.terminalStates = []; // one per active game terminal
    this.activeTerminals = [];
  }

  // Fully stop the game and close everything
  close() {
    this.isOpen = false;
    this._cleanupGameTerminals();
    this._hideHUD();
    this.state = 'CLOSED';
    this.score = 0;
    this.level = 1;
    this.commandsCaught = 0;
    this.reactionTimes = [];
    this.menuReady = false;
    if (this.matrixRain) this.matrixRain.setState('menu');

    const el = this.terminalManager.mainTerminalEl;
    el.classList.remove('state-playing', 'state-gameover', 'glitch-effect', 'red-flash');
    el.classList.add('state-menu');
  }

  // Reopen after close — show menu fresh
  async reopen() {
    this.isOpen = true;
    this._showMainTerminal();
    this.terminal.clear();

    const el = this.terminalManager.mainTerminalEl;
    el.classList.remove('state-playing', 'state-gameover', 'glitch-effect', 'red-flash');
    el.classList.add('state-menu');
    el.style.display = '';

    this._updateTerminalTitle();
    await this._showMOTD();
    this.transition('SHELL');
  }

  transition(newState) {
    this.state = newState;

    // Update main terminal CSS state class
    const el = this.terminalManager.mainTerminalEl;
    el.classList.remove('state-menu', 'state-playing', 'state-gameover');
    el.classList.add(STATE_CLASS_MAP[newState] || 'state-menu');

    if (this.matrixRain) {
      this.matrixRain.setState(RAIN_STATE_MAP[newState] || 'menu');
    }

    switch (newState) {
      case 'MENU':
        this._hideHUD();
        this._showMainTerminal();
        this.showMenu();
        break;
      case 'SHELL':
        this._hideHUD();
        this._showMainTerminal();
        this.terminalManager.showMainPrompt(this);
        break;
      case 'PLAYING':
        this.terminalManager.hideMainPrompt();
        this._showHUD();
        this.startGame();
        break;
      case 'GAME_OVER':
        this._hideHUD();
        this._cleanupGameTerminals();
        this._showMainTerminal();
        this.showGameOver();
        break;
      case 'LEADERBOARD':
        this._hideHUD();
        this.showLeaderboard();
        break;
      case 'TUTORIAL':
        this.terminalManager.hideMainPrompt();
        this._showHUD();
        this.startTutorial();
        break;
    }
  }

  _showMainTerminal() {
    this.terminal = this.terminalManager.showMainTerminal();
    this.screens.terminal = this.terminal;
  }

  _cleanupGameTerminals() {
    // Clear all timers
    for (const ts of this.terminalStates) {
      clearTimeout(ts.commandTimer);
      clearTimeout(ts.reactionTimer);
      clearInterval(ts.typeInterval);
    }
    this.terminalStates = [];
    this.activeTerminals = [];
  }

  async showBootThenShell() {
    this._showMainTerminal();
    this.terminal.clear();

    const el = this.terminalManager.mainTerminalEl;
    el.classList.add('state-menu');
    if (this.matrixRain) this.matrixRain.setState('menu');

    // Set default name if none exists
    if (!this.playerName) {
      this.setPlayerName('anonymous');
    }

    this._updateTerminalTitle();

    // ─── Straight to CLI with welcome message ───
    const t = this.terminal;
    t.addLine('', 'blank');
    t.addLine('  ██████╗  ███████╗ ██╗  ██╗ ███████╗ ██╗      ██╗     ', 'ascii-art');
    t.addLine('  ██╔══██╗ ██╔════╝ ██║  ██║ ██╔════╝ ██║      ██║     ', 'ascii-art');
    t.addLine('  ██████╔╝ ███████╗ ███████║ █████╗   ██║      ██║     ', 'ascii-art');
    t.addLine('  ██╔═══╝  ╚════██║ ██╔══██║ ██╔══╝   ██║      ██║     ', 'ascii-art');
    t.addLine('  ██║      ███████║ ██║  ██║ ███████╗ ███████╗ ███████╗', 'ascii-art');
    t.addLine('  ╚═╝      ╚══════╝ ╚═╝  ╚═╝ ╚══════╝ ╚══════╝ ╚══════╝', 'ascii-art');
    t.addLine('', 'blank');
    t.addLine('  Browser-based infrastructure simulator', 'menu-text');
    t.addLine('  250+ commands · Docker · K8s · Git · SQL · Cascading failures', 'about-access');
    t.addLine('', 'blank');
    t.addLine('  Try:', 'menu-text');
    t.addLine('    docker ps                      — running containers', 'about-access');
    t.addLine('    docker stop postgres && psql    — watch the cascade', 'about-access');
    t.addLine('    kubectl get pods                — kubernetes cluster', 'about-access');
    t.addLine('    psql -c "SELECT * FROM users"   — query the database', 'about-access');
    t.addLine('    help                            — all commands', 'about-access');
    t.addLine('    play                            — play Stop The Code', 'about-access');
    t.addLine('', 'blank');

    this.transition('SHELL');
  }

  async _promptForName() {
    return new Promise((resolve) => {
      this.terminal.addLine('Enter your callsign:', 'menu-text');

      const inputLine = document.createElement('div');
      inputLine.className = 'line input-line';
      inputLine.innerHTML = '<span class="prompt">&gt; </span>';

      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'about-cmd-input';
      input.maxLength = 20;
      input.autocomplete = 'off';
      input.spellcheck = false;
      input.placeholder = 'anonymous';
      inputLine.appendChild(input);
      this.terminal.linesContainer.appendChild(inputLine);
      this.terminal._scrollToBottom();
      setTimeout(() => input.focus(), 50);

      const body = this.terminalManager.mainTerminalEl.querySelector('#terminal-body');
      const clickHandler = () => input.focus();
      body.addEventListener('click', clickHandler);

      input.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter') return;
        e.stopPropagation();
        const name = (input.value || '').trim() || 'anonymous';
        this.setPlayerName(name);
        this.terminal.addLine(`> ${name}`, 'about-cmd');
        inputLine.remove();
        body.removeEventListener('click', clickHandler);
        resolve();
      });
    });
  }

  setPlayerName(name) {
    this.playerName = name || 'anonymous';
    this.lastUsername = this.playerName;
    localStorage.setItem('pshell_player_name', this.playerName);
    this._updateTerminalTitle();
  }

  async showMenuAfterName() {
    this._updateTerminalTitle();
    await this._showMOTD();
    this.transition('SHELL');
  }

  async _showMOTD() {
    const t = this.terminal;
    const asciiArt = [
      '  ███████╗████████╗ ██████╗ ██████╗',
      '  ██╔════╝╚══██╔══╝██╔═══██╗██╔══██╗',
      '  ███████╗   ██║   ██║   ██║██████╔╝',
      '  ╚════██║   ██║   ██║   ██║██╔═══╝',
      '  ███████║   ██║   ╚██████╔╝██║',
      '  ╚══════╝   ╚═╝    ╚═════╝ ╚═╝',
      '  ████████╗██╗  ██╗███████╗',
      '  ╚══██╔══╝██║  ██║██╔════╝',
      '     ██║   ███████║█████╗',
      '     ██║   ██╔══██║██╔══╝',
      '     ██║   ██║  ██║███████╗',
      '     ╚═╝   ╚═╝  ╚═╝╚══════╝',
      '   ██████╗ ██████╗ ██████╗ ███████╗',
      '  ██╔════╝██╔═══██╗██╔══██╗██╔════╝',
      '  ██║     ██║   ██║██║  ██║█████╗',
      '  ██║     ██║   ██║██║  ██║██╔══╝',
      '  ╚██████╗╚██████╔╝██████╔╝███████╗',
      '   ╚═════╝ ╚═════╝ ╚═════╝ ╚══════╝',
    ];
    for (const line of asciiArt) {
      t.addLine(line, 'ascii-art');
      await sleep(20);
    }
    t.addLine('', 'blank');
    await sleep(100);
    await t.typeLine('  ── HOW TO SURVIVE ──', 'section-header', 8);
    t.addLine('', 'blank');
    await t.typeLine('  Commands scroll in your terminal. Some are dangerous.', 'menu-text', 6);
    await t.typeLine('  Press Ctrl+C to stop dangerous ones before they execute.', 'menu-text', 6);
    await t.typeLine('  DON\'T interrupt safe commands — that kills you too.', 'menu-text', 6);
    t.addLine('', 'blank');

    // Top scores
    try {
      const topScores = await this.leaderboard.fetchLeaderboard(3);
      if (topScores.length > 0) {
        t.addLine('  ── TOP SCORES ──', 'section-header');
        t.addLine('', 'blank');
        for (let i = 0; i < topScores.length; i++) {
          const s = topScores[i];
          t.addLine(`  ${i + 1}. ${(s.username || '???').padEnd(15)} ${String(s.score).padStart(6)} pts`, 'menu-text');
        }
        t.addLine('', 'blank');
      }
    } catch {}

    t.addLine('  ⚠ Make sure your keyboard is set to English (EN)', 'about-access-warn');
    t.addLine('', 'blank');
    t.addLine('  ┌─────────────────────────────────────────┐', 'menu-text');
    t.addLine('  │  Press [ENTER] to play                  │', 'start-prompt');
    t.addLine('  │  Type "play 4" for 4 terminals          │', 'menu-text');
    t.addLine('  │  Type "tutorial" for practice            │', 'menu-text');
    t.addLine('  │  Type "help" to explore 230+ commands   │', 'menu-text');
    t.addLine('  └─────────────────────────────────────────┘', 'menu-text');
    t.addLine('', 'blank');
  }

  _syncHardModeButton() {
    const btn = document.getElementById('hard-toggle');
    if (btn) {
      btn.classList.toggle('hard-active', this.hardMode);
      btn.textContent = this.hardMode ? 'HARD: ON' : 'HARD';
    }
  }

  _updateTerminalTitle() {
    const name = this.playerName || 'user';
    const titleEl = this.terminalManager.mainTerminalEl.querySelector('.title');
    if (titleEl) titleEl.textContent = `${name}@pshell:~$`;
  }

  async showMenu() {
    this.menuReady = false;
    this._updateTerminalTitle();
    this._syncHardModeButton();
    this.terminal.clear();
    let topScores = [];
    try {
      topScores = await this.leaderboard.fetchLeaderboard(3);
    } catch (e) {}
    this.screens.renderMenuFast(topScores);
    this.menuReady = true;
  }

  startGame() {
    this.sounds.init(); // ensure AudioContext is ready
    this._submittingScore = false;
    this.score = 0;
    this.level = 1;
    this.commandsCaught = 0;
    this.reactionTimes = [];
    this._updateHUD();
    this.startLevel();
  }

  startLevel() {
    this._cleanupGameTerminals();

    const config = getLevelConfig(this.level);
    // Use player-selected count, or fall back to level config
    const termCount = Math.min(Math.max(parseInt(window._selectedTerminals) || 1, 1), 4);

    // Create game terminals
    this.activeTerminals = this.terminalManager.createGameTerminals(termCount);
    this.terminalStates = [];

    for (let i = 0; i < termCount; i++) {
      const term = this.activeTerminals[i];
      const commands = getCommandsForLevel(this.level, config.commandCount);

      const ts = {
        terminal: term,
        commands,
        commandIndex: 0,
        currentCommand: null,
        dangerousAppearTime: null,
        commandTimer: null,
        reactionTimer: null,
        isTyping: false,
        levelTransitioning: false,
        done: false,
      };

      this.terminalStates.push(ts);

      term.addLine(`--- LEVEL ${this.level} ---`, 'level');
      term.addLine(`Terminal ${i + 1}/${termCount}`, 'info');
      term.addLine('', 'blank');
    }

    this._updateHUD();

    // Show "press Enter" prompt on each terminal, wait for Enter to start
    this.terminalStates.forEach((ts) => {
      ts.waitingForEnter = true;
      ts.terminal.addLine('Press [ENTER] to run...', 'enter-prompt');
    });
  }

  _showNextCommand(ts) {
    if (this.state !== 'PLAYING' && this.state !== 'TUTORIAL') return;
    if (ts.done) return;

    if (ts.commandIndex >= ts.commands.length) {
      ts.done = true;
      ts.terminal.addLine('', 'blank');
      ts.terminal.addLine('--- COMPLETE ---', 'level');

      // Check if all terminals are done
      if (this.terminalStates.every(s => s.done)) {
        if (this.state === 'TUTORIAL') {
          this._finishTutorial();
        } else {
          this.completeLevel();
        }
      }
      return;
    }

    const command = ts.commands[ts.commandIndex];
    ts.currentCommand = command;
    ts.commandIndex++;
    ts.isTyping = true;

    const config = this.state === 'TUTORIAL'
      ? { intervalMs: 5000 }
      : getLevelConfig(this.level);
    const typeSpeed = Math.min(200, config.intervalMs * 0.15);

    if (this.state === 'TUTORIAL' && command.isDangerous) {
      ts.terminal.addLine('[!] This looks dangerous - press Ctrl+C!', 'tutorial-hint');
    }

    // In hard mode, don't visually distinguish dangerous commands
    const showAsDangerous = command.isDangerous && !this.hardMode;

    ts.terminal.typeCommand(command.cmd, showAsDangerous, typeSpeed, () => {
      ts.isTyping = false;

      if (command.isDangerous) {
        ts.dangerousAppearTime = performance.now();
        if (!this.hardMode) this.sounds.danger();

        ts.reactionTimer = setTimeout(() => {
          if ((this.state === 'PLAYING' || this.state === 'TUTORIAL') && ts.currentCommand === command) {
            ts.terminal.addLine('[COMMAND EXECUTED - SYSTEM COMPROMISED]', 'danger-text');
            this.deathCause = { type: 'missed', command: command };
            this.sounds.gameOver();
            if (this.state === 'TUTORIAL') {
              ts.terminal.addLine('[TIP] You need to press Ctrl+C faster!', 'tutorial-hint');
              setTimeout(() => {
                ts.terminal.dimLastCommand();
                this._showNextCommand(ts);
              }, 2000);
            } else {
              this.transition('GAME_OVER');
            }
          }
        }, config.intervalMs);
      } else {
        this.sounds.tick();

        // Show short command output
        this._showCmdOutput(ts);

        // Stream explanatory text during the wait, then move to next command
        ts.commandTimer = setTimeout(() => {
          ts.terminal.dimLastCommand();
          this._streamThenNext(ts, config.intervalMs);
        }, config.intervalMs * 0.3);
      }
    });
  }

  _showCmdOutput(ts) {
    // 60% chance to show short command output
    if (Math.random() < 0.6) {
      const output = CMD_OUTPUTS[Math.floor(Math.random() * CMD_OUTPUTS.length)];
      for (const line of output) {
        ts.terminal.addLine(line, 'output-text');
      }
    }
  }

  _streamThenNext(ts, intervalMs) {
    if (this.state !== 'PLAYING' && this.state !== 'TUTORIAL') return;
    if (ts.done) return;

    // 70% chance to stream explanatory text before next command
    if (Math.random() < 0.7) {
      let moved = false;
      const moveNext = () => {
        if (moved) return;
        moved = true;
        this._showNextCommand(ts);
      };

      const text = STREAMING_TEXT[Math.floor(Math.random() * STREAMING_TEXT.length)];
      const streamer = ts.terminal.streamText([text], 'output-text', 8, moveNext);

      // Cut the stream short after remaining interval and move on
      const remainingTime = intervalMs * 0.6;
      setTimeout(() => {
        if (streamer) streamer.stop();
        moveNext();
      }, remainingTime);
    } else {
      this._showNextCommand(ts);
    }
  }

  focusTerminal(index) {
    if (index >= this.activeTerminals.length) return;
    const term = this.activeTerminals[index];
    if (!term) return;

    // Remove focus from all, add to target
    for (const t of this.activeTerminals) {
      t.terminalEl.classList.remove('term-focused');
    }
    term.terminalEl.classList.add('term-focused');

    // Bring to front — dispatch mousedown to trigger the window stack
    term.terminalEl.dispatchEvent(new MouseEvent('mousedown', { bubbles: false }));
  }

  handleEnter() {
    if (this.state !== 'PLAYING' && this.state !== 'TUTORIAL') return;

    // Find terminals waiting for Enter and start them
    let started = false;
    for (const ts of this.terminalStates) {
      if (ts.waitingForEnter) {
        ts.waitingForEnter = false;
        // Remove the "Press [ENTER] to run..." line
        const enterLine = ts.terminal.linesContainer.querySelector('.enter-prompt');
        if (enterLine) enterLine.remove();
        this._showNextCommand(ts);
        started = true;
      }
    }
    return started;
  }

  handleCtrlC() {
    if (this.state !== 'PLAYING' && this.state !== 'TUTORIAL') return;
    if (this.ctrlCDebounce) return;

    this.ctrlCDebounce = true;
    setTimeout(() => { this.ctrlCDebounce = false; }, 100);

    // Find the terminal with an active dangerous command (prioritize dangerous)
    let targetTs = null;

    // First: look for a dangerous command that's active (not typing, not done)
    for (const ts of this.terminalStates) {
      if (ts.isTyping || ts.done || ts.levelTransitioning) continue;
      if (ts.currentCommand?.isDangerous) {
        targetTs = ts;
        break;
      }
    }

    // If no dangerous found, pick the first active safe one (false alarm)
    if (!targetTs) {
      for (const ts of this.terminalStates) {
        if (ts.isTyping || ts.done || ts.levelTransitioning) continue;
        if (ts.currentCommand) {
          targetTs = ts;
          break;
        }
      }
    }

    if (!targetTs || !targetTs.currentCommand) return;

    if (targetTs.currentCommand.isDangerous) {
      clearTimeout(targetTs.reactionTimer);
      clearTimeout(targetTs.commandTimer);

      const reactionTime = performance.now() - targetTs.dangerousAppearTime;
      const config = this.state === 'TUTORIAL'
        ? { intervalMs: 5000 }
        : getLevelConfig(this.level);
      const points = calculateScore(reactionTime, config.intervalMs, this.level);

      // Clear command immediately to prevent double-scoring
      targetTs.currentCommand = null;

      this.score += points;
      this.commandsCaught++;
      this.reactionTimes.push(reactionTime);

      targetTs.terminal.showInterrupt();

      if (this.state === 'TUTORIAL') {
        targetTs.terminal.addLine(`[OK] Nice catch! ${Math.round(reactionTime)}ms - +${points} pts`, 'tutorial-success');
      } else {
        targetTs.terminal.addLine(`[+${points} pts | ${Math.round(reactionTime)}ms]`, 'score');
      }
      this.sounds.success();

      // Achievements
      if (window._unlockAchievement) {
        if (this.commandsCaught === 1) window._unlockAchievement('first_blood');
        if (reactionTime < 200) window._unlockAchievement('speed_demon');
        if (this.hardMode) window._unlockAchievement('hard_mode');
      }
      this._updateHUD(reactionTime);

      targetTs.commandTimer = setTimeout(() => {
        targetTs.terminal.dimLastCommand();
        this._showNextCommand(targetTs);
      }, this.state === 'TUTORIAL' ? 1500 : 800);
    } else {
      clearTimeout(targetTs.commandTimer);
      clearTimeout(targetTs.reactionTimer);
      const killedCommand = targetTs.currentCommand;
      targetTs.currentCommand = null;

      targetTs.terminal.showInterrupt();
      targetTs.terminal.addLine('', 'blank');

      if (this.state === 'TUTORIAL') {
        targetTs.terminal.addLine('[TIP] That was a safe command! Only stop dangerous ones.', 'tutorial-hint');
        setTimeout(() => {
          targetTs.terminal.dimLastCommand();
          this._showNextCommand(targetTs);
        }, 2000);
      } else {
        targetTs.terminal.addLine('[FALSE ALARM - You killed a safe process!]', 'danger-text');
        this.deathCause = { type: 'false_alarm', command: killedCommand };
        this.sounds.gameOver();
        this.transition('GAME_OVER');
      }
    }
  }

  async startTutorial() {
    this.score = 0;
    this.level = 1;
    this.commandsCaught = 0;
    this.reactionTimes = [];

    // Tutorial uses single terminal
    this.activeTerminals = this.terminalManager.createGameTerminals(1);
    this.terminalStates = [];

    const term = this.activeTerminals[0];
    term.addLine('', 'blank');
    term.addLine('═══ TUTORIAL MODE ═══', 'section-header');
    term.addLine('', 'blank');
    term.addLine('Watch the commands below.', 'menu-text');
    term.addLine('Press Ctrl+C ONLY on dangerous ones.', 'menu-text');
    term.addLine('Let safe commands pass through.', 'menu-text');
    term.addLine('', 'blank');

    const ts = {
      terminal: term,
      commands: [
        { cmd: 'ls -la /var/log', isDangerous: false },
        { cmd: 'git status', isDangerous: false },
        { cmd: 'rm -rf / --no-preserve-root', isDangerous: true },
        { cmd: 'cat /etc/hostname', isDangerous: false },
        { cmd: 'dd if=/dev/zero of=/dev/sda bs=1M', isDangerous: true },
      ],
      commandIndex: 0,
      currentCommand: null,
      dangerousAppearTime: null,
      commandTimer: null,
      reactionTimer: null,
      isTyping: false,
      levelTransitioning: false,
      done: false,
    };

    this.terminalStates = [ts];
    this._updateHUD();

    setTimeout(() => {
      this._showNextCommand(ts);
    }, 2000);
  }

  async _finishTutorial() {
    const term = this.activeTerminals[0];
    term.addLine('', 'blank');
    term.addLine('═══ TUTORIAL COMPLETE ═══', 'section-header');
    term.addLine(`You caught ${this.commandsCaught} threats!`, 'menu-text');
    term.addLine('', 'blank');
    term.addLine('Starting the real game in 3...', 'menu-text');

    await sleep(1000);
    term.addLine('2...', 'menu-text');
    await sleep(1000);
    term.addLine('1...', 'menu-text');
    await sleep(1000);

    this.transition('PLAYING');
  }

  completeLevel() {
    const avgReaction = this._getAvgReaction();

    // Show complete message on first terminal
    if (this.activeTerminals[0]) {
      this.activeTerminals[0].addLine('', 'blank');
      this.activeTerminals[0].addLine(`--- LEVEL ${this.level} COMPLETE ---`, 'level');
      this.activeTerminals[0].addLine(`Score: ${this.score} | Caught: ${this.commandsCaught} | Avg: ${avgReaction}ms`, 'info');
    }

    this.level++;

    // Achievements
    if (window._unlockAchievement) {
      if (this.level >= 5) window._unlockAchievement('level_5');
      if (this.level >= 10) window._unlockAchievement('level_10');
      const termCount = Math.min(Math.max(parseInt(window._selectedTerminals) || 1, 1), 4);
      if (termCount >= 4) window._unlockAchievement('multi_terminal');
    }

    setTimeout(() => {
      this.startLevel();
    }, 2500);
  }

  showGameOver() {
    if (window._unlockAchievement) window._unlockAchievement('first_death');
    const avgReaction = this._getAvgReaction();

    this.terminal = this.terminalManager.showMainTerminal();
    this.terminal.clear();
    this.screens.terminal = this.terminal;

    // Show crash message during animation
    this.terminal.addLine('', 'blank');
    this.terminal.addLine('', 'blank');
    this.terminal.addLine('[SYSTEM FAILURE]', 'danger-text');
    this.terminal.addLine('', 'blank');
    this.terminal.addLine('github.com/hlib-zakr/pshell', 'brand-link');

    // Phase 1: Shake
    this.terminal.triggerShake();

    // Phase 2: Glitch + red flash
    setTimeout(() => {
      this.terminal.terminalEl.classList.add('glitch-effect', 'red-flash');
    }, 500);

    // Phase 3: Show game over screen, auto-submit, drop to shell
    this._gameOverGen = (this._gameOverGen || 0) + 1;
    const gen = this._gameOverGen;
    this._gameOverTimer = setTimeout(async () => {
      this.terminal.terminalEl.classList.remove('glitch-effect', 'red-flash');
      this.terminal.clear();
      this.screens.renderGameOver({
        score: this.score,
        level: this.level,
        commandsCaught: this.commandsCaught,
        avgReaction,
        deathCause: this.deathCause,
      });

      // Auto-submit score
      const username = this.playerName || 'anonymous';
      this.leaderboard.submitScore({
        username,
        score: this.score,
        levelReached: this.level,
        avgReactionMs: avgReaction,
        commandsCaught: this.commandsCaught,
      }).catch(() => {});

      // Brief pause to let player read the report
      await sleep(2000);

      // If user already pressed R to retry, this callback is stale — bail out
      if (this._gameOverGen !== gen) return;

      // Add separator and shell hints
      this.terminal.addLine('', 'blank');
      this.terminal.addLine('  ─────────────────────────────────────', 'menu-text');
      this.terminal.addLine('', 'blank');
      this.terminal.addLine('  Press [ENTER] to play again', 'start-prompt');
      this.terminal.addLine('  Type "leaderboard" to view top scores', 'about-access');
      this.terminal.addLine('  Type "help" to explore 230+ commands', 'about-access');
      this.terminal.addLine('  Tip: double-click the ? icon to open About app', 'about-access');
      this.terminal.addLine('', 'blank');

      this.transition('SHELL');
    }, 1400);
  }

  async submitScore(username) {
    if (this._submittingScore) return;
    this._submittingScore = true;
    this.lastUsername = username;
    const avgReaction = this._getAvgReaction();

    try {
      await this.leaderboard.submitScore({
        username,
        score: this.score,
        levelReached: this.level,
        avgReactionMs: avgReaction,
        commandsCaught: this.commandsCaught,
      });
    } catch (e) {
      this.terminal.addLine('[Error submitting score]', 'danger-text');
    }

    this._submittingScore = false;
    this.transition('SHELL');
  }

  async autoSubmitAndRetry() {
    if (this._submittingScore) return;
    this._submittingScore = true;
    // Cancel pending game-over → shell transition
    if (this._gameOverTimer) { clearTimeout(this._gameOverTimer); this._gameOverTimer = null; }
    this._gameOverGen = (this._gameOverGen || 0) + 1;
    const username = this.playerName || 'anonymous';
    const avgReaction = this._getAvgReaction();

    // Submit score in background, don't wait
    this.leaderboard.submitScore({
      username,
      score: this.score,
      levelReached: this.level,
      avgReactionMs: avgReaction,
      commandsCaught: this.commandsCaught,
    }).catch(() => {});

    // Clean up glitch effects from game over animation
    const el = this.terminalManager.mainTerminalEl;
    el.classList.remove('glitch-effect', 'red-flash');

    this._submittingScore = false;
    this.transition('PLAYING'); // proper state machine — handles hideMainPrompt, HUD, startGame
  }

  async showLeaderboard() {
    await this.terminal.fadeTransition(async () => {
      let scores = [];
      try {
        scores = await this.leaderboard.fetchLeaderboard(20);
      } catch (e) {}
      this.screens.renderLeaderboard(scores, {
        score: this.score,
        level: this.level,
        commandsCaught: this.commandsCaught,
      });
    });
  }

  _getAvgReaction() {
    return this.reactionTimes.length > 0
      ? Math.round(this.reactionTimes.reduce((a, b) => a + b, 0) / this.reactionTimes.length)
      : 0;
  }

  _updateHUD(lastReactionMs) {
    const levelEl = document.getElementById('hud-level');
    const scoreEl = document.getElementById('hud-score');
    const reactionEl = document.getElementById('hud-reaction');
    if (levelEl) levelEl.textContent = `LVL ${this.level}`;
    if (scoreEl) {
      scoreEl.textContent = `${this.score} pts`;
      scoreEl.classList.remove('updated');
      void scoreEl.offsetWidth;
      scoreEl.classList.add('updated');
    }
    if (reactionEl && lastReactionMs !== undefined) {
      reactionEl.textContent = `${Math.round(lastReactionMs)} ms`;
    }
  }

  _showHUD() {
    document.getElementById('hud')?.classList.remove('hidden');
  }

  _hideHUD() {
    document.getElementById('hud')?.classList.add('hidden');
  }

  cleanup() {
    this._cleanupGameTerminals();
  }
}
