function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

export class Screens {
  constructor(terminal) {
    this.terminal = terminal;
  }

  async renderBootSequence() {
    const bootLines = [
      { text: '[PShell v2.0]', delay: 300 },
      { text: '', delay: 100 },
      { text: 'BIOS v3.14 - System Check...', delay: 200 },
      { text: '', delay: 100 },
      { text: 'RAM: 8192 MB .............. OK', delay: 150 },
      { text: 'CPU: x86_64 ............... OK', delay: 120 },
      { text: 'DISK: /dev/sda ............ OK', delay: 130 },
      { text: 'NET: eth0 ................. OK', delay: 140 },
      { text: 'GPU: Terminal Renderer .... OK', delay: 100 },
      { text: '', delay: 200 },
      { text: 'Loading kernel modules..... OK', delay: 180 },
      { text: '', delay: 150 },
      { text: '[  0.001] Initializing terminal...', delay: 80 },
      { text: '[  0.042] Loading command database...', delay: 100 },
      { text: '[  0.127] Scanning threat signatures...', delay: 120 },
      { text: '[  0.318] Connecting to leaderboard...', delay: 150 },
      { text: '[  0.512] Starting pshell v1.0...', delay: 200 },
      { text: '', delay: 100 },
      { text: 'github.com/hlib-zakr/pshell', delay: 150 },
      { text: '', delay: 100 },
      { text: '> Ready.', delay: 0 },
    ];

    for (const { text, delay } of bootLines) {
      if (text === '') {
        this.terminal.addLine('', 'blank');
      } else {
        await this.terminal.typeLine(text, 'boot-text', 8);
      }
      await sleep(delay);
    }
  }

  async renderMenuAnimated(topScores = []) {
    const asciiArt = [
      '',
      '  ███████╗████████╗ ██████╗ ██████╗',
      '  ██╔════╝╚══██╔══╝██╔═══██╗██╔══██╗',
      '  ███████╗   ██║   ██║   ██║██████╔╝',
      '  ╚════██║   ██║   ██║   ██║██╔═══╝',
      '  ███████║   ██║   ╚██████╔╝██║',
      '  ╚══════╝   ╚═╝    ╚═════╝ ╚═╝',
      '',
      '  ████████╗██╗  ██╗███████╗',
      '  ╚══██╔══╝██║  ██║██╔════╝',
      '     ██║   ███████║█████╗',
      '     ██║   ██╔══██║██╔══╝',
      '     ██║   ██║  ██║███████╗',
      '     ╚═╝   ╚═╝  ╚═╝╚══════╝',
      '',
      '   ██████╗ ██████╗ ██████╗ ███████╗',
      '  ██╔════╝██╔═══██╗██╔══██╗██╔════╝',
      '  ██║     ██║   ██║██║  ██║█████╗',
      '  ██║     ██║   ██║██║  ██║██╔══╝',
      '  ╚██████╗╚██████╔╝██████╔╝███████╗',
      '   ╚═════╝ ╚═════╝ ╚═════╝ ╚══════╝',
    ];

    // ASCII art — fast
    for (const line of asciiArt) {
      const isArt = line.includes('█') || line.includes('╔') || line.includes('╚') || line.includes('║');
      this.terminal.addLine(line, isArt ? 'ascii-art' : 'blank');
      await sleep(15);
    }

    // Tagline
    await sleep(100);
    this.terminal.addLine('', 'blank');
    await this.terminal.typeLine('Can you stop the dangerous commands in time?', 'tagline', 15);
    this._addBrandLink(this.terminal);
    this.terminal.addLine('', 'blank');
    await sleep(200);

    // Instructions
    this.terminal.addLine('═══════════════════════════════════', 'section-header');
    await this.terminal.typeLine('HOW TO SURVIVE', 'section-header', 20);
    this.terminal.addLine('═══════════════════════════════════', 'section-header');
    this.terminal.addLine('', 'blank');
    await sleep(100);

    await this.terminal.typeLine('Commands scroll through your terminal.', 'menu-text', 12);
    await this.terminal.typeLine('Most are SAFE — let them pass:', 'menu-text', 12);
    this.terminal.addLine('', 'blank');
    await sleep(80);

    await this.terminal.typeLine('$ git status', 'safe-example', 18);
    await sleep(60);
    await this.terminal.typeLine('$ docker ps', 'safe-example', 18);
    this.terminal.addLine('', 'blank');
    await sleep(100);

    await this.terminal.typeLine('But some are DANGEROUS:', 'menu-text', 12);
    this.terminal.addLine('', 'blank');
    await sleep(80);

    await this.terminal.typeLine('$ rm -rf / --no-preserve-root', 'danger-example', 18);
    await sleep(60);
    await this.terminal.typeLine('$ dd if=/dev/zero of=/dev/sda', 'danger-example', 18);
    this.terminal.addLine('', 'blank');
    await sleep(150);

    // Ctrl+C box
    const boxLines = [
      { text: '┌─────────────────────────────────────┐', cls: 'keyhint-box' },
      { text: '│                                     │', cls: 'keyhint-box' },
      { text: '│   See danger?  Press  [ Ctrl + C ]  │', cls: 'keyhint-box' },
      { text: '│                                     │', cls: 'keyhint-box' },
      { text: '│   False alarm on safe command?       │', cls: 'keyhint-box' },
      { text: '│             GAME OVER.               │', cls: 'keyhint-box-danger' },
      { text: '│                                     │', cls: 'keyhint-box' },
      { text: '└─────────────────────────────────────┘', cls: 'keyhint-box' },
    ];
    for (const { text, cls } of boxLines) {
      await this.terminal.typeLine(text, cls, 4);
    }
    this.terminal.addLine('', 'blank');
    await sleep(200);

    // Top scores
    if (topScores.length > 0) {
      this.terminal.addLine('─── TOP SCORES ───', 'section-header');
      for (const [i, s] of topScores.entries()) {
        const name = s.username.padEnd(15);
        await this.terminal.typeLine(`${i + 1}. ${name} ${String(s.score).padStart(6)} pts  (lvl ${s.level_reached})`, 'menu-text', 10);
        await sleep(40);
      }
      this.terminal.addLine('', 'blank');
    }

    // Terminal count selector
    await sleep(100);
    this.terminal.addLine('─── TERMINALS ───', 'section-header');
    this.terminal.addLine('', 'blank');

    const selectorLine = document.createElement('div');
    selectorLine.className = 'line terminal-selector';
    selectorLine.innerHTML = `
      <span class="ts-label">Terminals: </span>
      <button class="ts-btn active" data-count="1">1</button>
      <button class="ts-btn" data-count="2">2</button>
      <button class="ts-btn" data-count="3">3</button>
      <button class="ts-btn" data-count="4">4</button>
      <span class="ts-hint">(or auto by level)</span>
    `;
    this.terminal.linesContainer.appendChild(selectorLine);
    this.terminal._scrollToBottom();

    // Wire up buttons
    selectorLine.querySelectorAll('.ts-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        selectorLine.querySelectorAll('.ts-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        window._selectedTerminals = btn.dataset.count === 'auto' ? null : parseInt(btn.dataset.count);
      });
    });
    window._selectedTerminals = 1;

    this.terminal.addLine('', 'blank');

    // Start prompt
    await sleep(100);
    await this.terminal.typeLine('[ENTER] Start  |  [T] Tutorial', 'start-prompt', 15);
    this._addBrandLink(this.terminal);
    this.terminal.addLine('', 'blank');
  }

  renderMenuFast(topScores = []) {
    const asciiArt = [
      '',
      '  ███████╗████████╗ ██████╗ ██████╗',
      '  ██╔════╝╚══██╔══╝██╔═══██╗██╔══██╗',
      '  ███████╗   ██║   ██║   ██║██████╔╝',
      '  ╚════██║   ██║   ██║   ██║██╔═══╝',
      '  ███████║   ██║   ╚██████╔╝██║',
      '  ╚══════╝   ╚═╝    ╚═════╝ ╚═╝',
      '',
      '  ████████╗██╗  ██╗███████╗',
      '  ╚══██╔══╝██║  ██║██╔════╝',
      '     ██║   ███████║█████╗',
      '     ██║   ██╔══██║██╔══╝',
      '     ██║   ██║  ██║███████╗',
      '     ╚═╝   ╚═╝  ╚═╝╚══════╝',
      '',
      '   ██████╗ ██████╗ ██████╗ ███████╗',
      '  ██╔════╝██╔═══██╗██╔══██╗██╔════╝',
      '  ██║     ██║   ██║██║  ██║█████╗',
      '  ██║     ██║   ██║██║  ██║██╔══╝',
      '  ╚██████╗╚██████╔╝██████╔╝███████╗',
      '   ╚═════╝ ╚═════╝ ╚═════╝ ╚══════╝',
    ];

    for (const line of asciiArt) {
      const isArt = line.includes('█') || line.includes('╔') || line.includes('╚') || line.includes('║');
      this.terminal.addLine(line, isArt ? 'ascii-art' : 'blank');
    }

    this.terminal.addLine('', 'blank');
    this.terminal.addLine('Can you stop the dangerous commands in time?', 'tagline');
    this._addBrandLink(this.terminal);
    this.terminal.addLine('', 'blank');

    if (topScores.length > 0) {
      this.terminal.addLine('─── TOP SCORES ───', 'section-header');
      for (const [i, s] of topScores.entries()) {
        const name = s.username.padEnd(15);
        this.terminal.addLine(`${i + 1}. ${name} ${String(s.score).padStart(6)} pts  (lvl ${s.level_reached})`, 'menu-text');
      }
      this.terminal.addLine('', 'blank');
    }

    // Terminal selector
    const selectorLine = document.createElement('div');
    selectorLine.className = 'line terminal-selector';
    selectorLine.innerHTML = `
      <span class="ts-label">Terminals: </span>
      <button class="ts-btn${window._selectedTerminals === 1 ? ' active' : ''}" data-count="1">1</button>
      <button class="ts-btn${window._selectedTerminals === 2 ? ' active' : ''}" data-count="2">2</button>
      <button class="ts-btn${window._selectedTerminals === 3 ? ' active' : ''}" data-count="3">3</button>
      <button class="ts-btn${window._selectedTerminals === 4 ? ' active' : ''}" data-count="4">4</button>
    `;
    this.terminal.linesContainer.appendChild(selectorLine);

    selectorLine.querySelectorAll('.ts-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        selectorLine.querySelectorAll('.ts-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        window._selectedTerminals = parseInt(btn.dataset.count);
      });
    });

    this.terminal.addLine('', 'blank');
    this.terminal.addLine('[ENTER] Start  |  [T] Tutorial', 'start-prompt');
    this._addBrandLink(this.terminal);
    this.terminal.addLine('', 'blank');
  }

  renderGameOver({ score, level, commandsCaught, avgReaction, deathCause }) {
    const roasts = [
      "Congrats! Your prod just went down.",
      "Hope you weren't on-call tonight.",
      "The CEO is calling. Don't pick up.",
      "Your SLA just became a suggestion.",
      "That's one way to do a zero-downtime deploy.",
      "Your resume has been auto-updated on LinkedIn.",
      "PagerDuty is screaming. So is your manager.",
      "The intern could have caught that one.",
      "Stack Overflow can't help you now.",
      "Your Kubernetes cluster just became a Kuberwrecks.",
      "HR is drafting your performance improvement plan.",
      "The board just called an emergency meeting about you.",
      "Your AWS bill just hit 7 figures. You're welcome.",
      "Investors are asking if this was a 'growth hack'.",
      "The CTO just mass-DM'd the eng team: 'who did this'.",
      "Your git blame just became a crime scene.",
      "Even ChatGPT would have caught that one.",
      "Your deployment pipeline is now evidence in a lawsuit.",
      "Congrats, you just created a case study for every DevOps bootcamp.",
      "The security team wants to know your location.",
      "Your uptime dashboard is now a modern art installation.",
      "That command just speedran infrastructure destruction.",
      "The postmortem doc is already 47 pages long.",
      "Slack is on fire. #incident has 200 unread messages.",
      "Your manager's manager just joined the war room.",
      "The status page now says 'Investigating' in 12 languages.",
      "Your on-call rotation just became a permanent assignment.",
      "Fun fact: the last person who did this got a Wikipedia page.",
      "The CEO's tweet says 'We are aware of a minor issue.' It's not minor.",
      "Your stock options just became stock disappointments.",
    ];
    const revenues = [
      '$1,000,000,000', '$847,293,102', '$2,100,000,000',
      '$500,000,000', '$1,337,420,069', '$999,999,999',
    ];
    const affected = [
      '12.4M users', '8.7M users', '23.1M users',
      '5.2M users', '41.0M users', '17.8M users',
    ];
    const downtimes = ['47 minutes', '2 hours 13 minutes', '1 hour 38 minutes', '23 minutes', '4 hours 7 minutes'];

    const roast = roasts[Math.floor(Math.random() * roasts.length)];
    const revenue = revenues[Math.floor(Math.random() * revenues.length)];
    const users = affected[Math.floor(Math.random() * affected.length)];
    const downtime = downtimes[Math.floor(Math.random() * downtimes.length)];

    const now = new Date();
    const fmt = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}:${String(d.getSeconds()).padStart(2,'0')}`;
    const t = (offsetSec) => { const d = new Date(now.getTime() + offsetSec * 1000); return fmt(d); };

    const lines = [
      { text: '', cls: 'blank' },
      { text: '╔════════════════════════════════════════════╗', cls: 'gameover-border' },
      { text: '║                                            ║', cls: 'gameover-border' },
      { text: '║     [CRITICAL] INCIDENT REPORT #' + Math.floor(Math.random()*9000+1000) + '       ║', cls: 'gameover-glitch' },
      { text: '║                                            ║', cls: 'gameover-border' },
      { text: '╚════════════════════════════════════════════╝', cls: 'gameover-border' },
      { text: '', cls: 'blank' },
      { text: roast, cls: 'roast-text' },
      { text: '', cls: 'blank' },
      { text: '─── IMPACT ───', cls: 'section-header' },
      { text: '', cls: 'blank' },
      { text: `Revenue lost ........ ${revenue}`, cls: 'revenue-text' },
      { text: `Users affected ...... ${users}`, cls: 'impact-text' },
      { text: `Estimated downtime .. ${downtime}`, cls: 'impact-text' },
      { text: '', cls: 'blank' },
      { text: '─── TIMELINE ───', cls: 'section-header' },
      { text: '', cls: 'blank' },
      { text: `${t(0)}  Dangerous command executed`, cls: 'timeline-bad' },
      { text: `${t(2)}  Grafana dashboards turn red`, cls: 'timeline-bad' },
      { text: `${t(5)}  All monitoring alerts firing`, cls: 'timeline-bad' },
      { text: `${t(12)}  PagerDuty incident created (SEV-0)`, cls: 'timeline-text' },
      { text: `${t(18)}  #incident channel: "what just happened"`, cls: 'timeline-text' },
      { text: `${t(30)}  Engineering team paged`, cls: 'timeline-text' },
      { text: `${t(45)}  Status page updated: "Investigating"`, cls: 'timeline-text' },
      { text: `${t(90)}  CEO: "Get me on the bridge call NOW"`, cls: 'timeline-bad' },
      { text: `${t(180)}  PR team drafting public apology`, cls: 'timeline-text' },
      { text: `${t(300)}  CEO: "Who. Did. This."`, cls: 'timeline-bad' },
      { text: `${t(600)}  Your Slack goes suspiciously quiet`, cls: 'timeline-bad' },
      { text: '', cls: 'blank' },
    ];

    // Add root cause analysis with the command that killed you
    if (deathCause) {
      lines.push({ text: '─── ROOT CAUSE ───', cls: 'section-header' });
      lines.push({ text: '', cls: 'blank' });

      if (deathCause.type === 'missed') {
        lines.push({ text: 'You failed to stop a dangerous command:', cls: 'menu-text' });
        lines.push({ text: '', cls: 'blank' });
        lines.push({ text: `$ ${deathCause.command.cmd}`, cls: 'death-cmd' });
        lines.push({ text: '', cls: 'blank' });
        lines.push({ text: deathCause.command.desc || 'This command was destructive.', cls: 'death-desc' });
      } else {
        lines.push({ text: 'You killed a perfectly safe process:', cls: 'menu-text' });
        lines.push({ text: '', cls: 'blank' });
        lines.push({ text: `$ ${deathCause.command.cmd}`, cls: 'death-cmd-safe' });
        lines.push({ text: '', cls: 'blank' });
        lines.push({ text: deathCause.command.desc || 'This command was harmless.', cls: 'death-desc-safe' });
        lines.push({ text: '', cls: 'blank' });
        lines.push({ text: 'Next time, read before you panic.', cls: 'roast-text' });
      }

      lines.push({ text: '', cls: 'blank' });
    }

    lines.push(
      { text: '─── YOUR PERFORMANCE ───', cls: 'section-header' },
      { text: '', cls: 'blank' },
      { text: `Score ............... ${score}`, cls: 'menu-text' },
      { text: `Level reached ....... ${level}`, cls: 'menu-text' },
      { text: `Threats stopped ..... ${commandsCaught}`, cls: 'menu-text' },
      { text: `Avg reaction time ... ${avgReaction}ms`, cls: 'menu-text' },
      { text: `Performance rating .. ${this._getRating(score, avgReaction)}`, cls: 'rating-text' },
      { text: '', cls: 'blank' },
      { text: '──────────────────────────────────────────', cls: 'menu-text' },
      { text: '', cls: 'blank' },
    );

    lines.forEach(({ text, cls }) => {
      this.terminal.addLine(text, cls);
    });

    // Share on X button
    const shareDiv = document.createElement('div');
    shareDiv.className = 'line share-row';
    const shareBtn = document.createElement('a');
    const tweetText = `I scored ${score} pts (Level ${level}) on Stop The Code by @hlibzakrevskyi!\n\nCan you spot the dangerous commands faster?\n\nPlay now: github.com/hlib-zakr/pshell`;
    shareBtn.href = `https://x.com/intent/tweet?text=${encodeURIComponent(tweetText)}`;
    shareBtn.target = '_blank';
    shareBtn.className = 'share-btn';
    shareBtn.textContent = 'Share on X';
    shareDiv.appendChild(shareBtn);
    this.terminal.linesContainer.appendChild(shareDiv);

    this.terminal.addLine('', 'blank');
    this.terminal.addLine('Score submitted.', 'about-access');
    this._addBrandLink(this.terminal);
    this.terminal.addLine('', 'blank');

    // Scroll to top so user sees the incident report header
    this.terminal.terminalBody.scrollTop = 0;
  }

  renderNameEntry() {
    this.terminal.addLine('', 'blank');
    this._addBrandLink(this.terminal);
    this.terminal.addLine('', 'blank');
    this.terminal.addLine('Welcome, operator.', 'menu-text');
    this.terminal.addLine('', 'blank');
    this.terminal.addLine('Enter your callsign:', 'menu-text');
    this.terminal.addLine('', 'blank');

    const inputLine = document.createElement('div');
    inputLine.className = 'line input-line';
    inputLine.innerHTML = `<span class="prompt"> > </span>`;

    const input = document.createElement('input');
    input.type = 'text';
    input.id = 'name-input';
    input.maxLength = 20;
    input.placeholder = 'anonymous';
    input.autocomplete = 'off';
    input.spellcheck = false;

    inputLine.appendChild(input);
    this.terminal.linesContainer.appendChild(inputLine);
    this.terminal._scrollToBottom();

    setTimeout(() => input.focus(), 100);
  }

  _addBrandLink(term) {
    const line = document.createElement('div');
    line.className = 'line brand-link';
    line.innerHTML = `<a href="https://x.com/hlibzakrevskyi" target="_blank" class="promptup-link">by Hlib Zakrevskyi</a>`;
    term.linesContainer.appendChild(line);
    term._scrollToBottom();
  }

  _getRating(score, avgReaction) {
    if (score >= 1000 && avgReaction < 300) return 'Linus Torvalds Would Be Proud';
    if (score >= 800 && avgReaction < 350) return 'Principal SRE (Netflix is hiring)';
    if (score >= 500 && avgReaction < 400) return 'Senior SRE Material';
    if (score >= 500) return 'Solid. Still got fired though.';
    if (score >= 300 && avgReaction < 500) return 'Decent On-Call Engineer';
    if (score >= 300) return 'Your reflexes need a CDN';
    if (score >= 200) return 'Mid. Like your code reviews.';
    if (score >= 100) return 'Needs More Coffee (and training)';
    if (score >= 50) return 'Intern-Level Awareness';
    if (score > 0) return 'Maybe Try QA Instead';
    return 'Promoted to Customer';
  }

  _showNameInput() {
    const inputLine = document.createElement('div');
    inputLine.className = 'line input-line';
    inputLine.innerHTML = `<span class="prompt">  > </span>`;

    const input = document.createElement('input');
    input.type = 'text';
    input.id = 'name-input';
    input.maxLength = 20;
    input.placeholder = 'anonymous';
    input.autocomplete = 'off';
    input.spellcheck = false;

    inputLine.appendChild(input);
    this.terminal.linesContainer.appendChild(inputLine);
    this.terminal._scrollToBottom();

    setTimeout(() => input.focus(), 100);
  }

  renderLeaderboard(scores, playerStats) {
    const lines = [
      '',
      '╔══════════════════════════════════════════════╗',
      '║              LEADERBOARD                     ║',
      '╚══════════════════════════════════════════════╝',
      '',
      '#   Name            Score    Level  Reaction',
      '─── ─────────────── ──────── ────── ────────',
    ];

    if (scores.length === 0) {
      lines.push('');
      lines.push('No scores yet. Be the first!');
    } else {
      scores.forEach((s, i) => {
        const rank = String(i + 1).padStart(2);
        const name = (s.username || 'anonymous').padEnd(15);
        const score = String(s.score).padStart(7);
        const level = String(s.level_reached).padStart(4);
        const reaction = s.avg_reaction_ms ? `${s.avg_reaction_ms}ms` : '-';
        const isPlayer = s.score === playerStats.score && s.username;
        const prefix = isPlayer ? '>' : ' ';
        lines.push(`${prefix}${rank}  ${name} ${score}    ${level}   ${reaction}`);
      });
    }

    lines.push('');
    lines.push(`Your score: ${playerStats.score} pts | Level ${playerStats.level}`);
    lines.push('');
    lines.push('Press [ENTER] to play again');
    lines.push('');

    lines.forEach(line => {
      const className = (line.includes('═') || line.includes('║'))
        ? 'gameover-border'
        : line.startsWith('>')
          ? 'highlight'
          : 'menu-text';
      this.terminal.addLine(line, className);
    });

    this._addBrandLink(this.terminal);
    this.terminal.addLine('', 'blank');
  }
}
