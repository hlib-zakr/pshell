import { stateEvents } from '../state/events.js';

export const funCommands = [

  // ══════════════════════════════════════
  // GAME INFO (achievements, stats, team, credits)
  // ══════════════════════════════════════

  {
    meta: { name: 'achievements', desc: 'View unlocked achievements', category: 'fun' },
    match: 'achievements',
    handler: async (cmd, { term }) => {
      term.addLine('', 'blank');
      term.addLine('ACHIEVEMENTS:', 'about-heading');
      term.addLine('', 'blank');
      try {
        const { getAchievementList } = await import('../ui/notifications.js');
        const list = getAchievementList();
        const unlocked = list.filter(a => a.unlocked);
        const locked = list.filter(a => !a.unlocked);
        for (const a of unlocked) {
          term.addLine(`  [${a.icon}] ${a.title}`, 'about-text');
          term.addLine(`      ${a.desc}`, 'about-access');
        }
        if (locked.length > 0) {
          term.addLine('', 'blank');
          term.addLine(`  ${locked.length} locked:`, 'about-heading');
          for (const a of locked) {
            term.addLine(`  [?] ${a.title} — ???`, 'about-text');
          }
        }
        term.addLine('', 'blank');
        term.addLine(`${unlocked.length}/${list.length} unlocked`, 'about-access');
      } catch {
        term.addLine('Achievement system not loaded.', 'about-text');
      }
      term.addLine('', 'blank');
    },
  },

  {
    meta: { name: 'stats', desc: 'Leaderboard statistics', category: 'fun' },
    match: 'stats',
    handler: async (cmd, { term, sleep }) => {
      term.addLine('', 'blank');
      await term.typeLine('Fetching global intelligence...', 'about-access', 10);
      let scores = [];
      try {
        const { leaderboard } = await import('../leaderboard/supabase.js');
        scores = await leaderboard.fetchLeaderboard(50);
      } catch {}
      await sleep(300);
      if (scores.length === 0) {
        term.addLine('No data yet. Be the first operator.', 'about-text');
      } else {
        const totalGames = scores.length;
        const topScore = scores[0];
        const avgReaction = Math.round(
          scores.filter(s => s.avg_reaction_ms).reduce((a, s) => a + s.avg_reaction_ms, 0) /
          scores.filter(s => s.avg_reaction_ms).length || 0
        );
        const topPlayer = scores[0]?.username || 'unknown';
        term.addLine('', 'blank');
        term.addLine('GLOBAL INTELLIGENCE REPORT:', 'about-heading');
        term.addLine('', 'blank');
        term.addLine(`  Total operations ...... ${totalGames}`, 'about-text');
        term.addLine(`  Top operative ......... ${topPlayer}`, 'about-text');
        term.addLine(`  Highest score ......... ${topScore?.score || 0}`, 'about-text');
        term.addLine(`  Avg reaction time ..... ${avgReaction}ms`, 'about-text');
        term.addLine(`  Deepest level ......... ${Math.max(...scores.map(s => s.level_reached))}`, 'about-text');
      }
      term.addLine('', 'blank');
    },
  },

  {
    match: 'team',
    handler: async (cmd, { term }) => {
      term.addLine('', 'blank');
      term.addLine('THE OPERATIVES:', 'about-heading');
      term.addLine('', 'blank');
      term.addLine('  Hlib Zakrevskyi', 'about-tech-line');
      term.addLine('  Role: Creator of Stop The Code', 'about-text');
      term.addLine('  Status: Caffeinated & dangerous', 'about-text');
      term.addLine('', 'blank');
      term.addLine('  Claude (AI)', 'about-tech-line');
      term.addLine('  Role: Wrote every line of this game', 'about-text');
      term.addLine('  Status: Still wondering why', 'about-text');
      term.addLine('', 'blank');
    },
  },

  {
    match: 'credits',
    handler: async (cmd, { term, sleep }) => {
      term.addLine('', 'blank');
      term.addLine('================================', 'about-divider');
      term.addLine('          CREDITS', 'about-heading');
      term.addLine('================================', 'about-divider');
      term.addLine('', 'blank');
      const roles = [
        ['Game Design', 'Hlib Zakrevskyi'],
        ['Engineering', 'Claude'],
        ['QA Testing', 'Your prod'],
        ['Sound Design', 'Web Audio API'],
        ['Marketing', 'rm -rf /'],
        ['HR', 'PagerDuty'],
        ['Legal', 'TBD'],
      ];
      for (const [role, who] of roles) {
        term.addLine(`  ${role.padEnd(16)} ${who}`, 'about-text');
        await sleep(80);
      }
      term.addLine('', 'blank');
      term.addLine('  Special Thanks:', 'about-heading');
      await sleep(100);
      term.addLine('  Every engineer who ever ran', 'about-text');
      term.addLine('  a command without reading it', 'about-text');
      term.addLine('', 'blank');
      term.addLine('================================', 'about-divider');
      term.addLine('', 'blank');
    },
  },

  // ══════════════════════════════════════
  // HACK command
  // ══════════════════════════════════════

  {
    meta: { name: 'hack', desc: 'Hack the mainframe', category: 'fun' },
    match: 'hack',
    handler: async (cmd, { term, sleep }) => {
      term.addLine('', 'blank');
      await term.typeLine('Accessing mainframe...', 'about-access', 12);
      await sleep(300);

      const steps = [
        ['Bypassing firewall', 34],
        ['Injecting payload', 58],
        ['Extracting secrets', 79],
        ['Decrypting data', 100],
      ];
      for (const [step, pct] of steps) {
        const filled = '\u2593'.repeat(Math.round(pct / 5));
        const empty = '\u2591'.repeat(20 - Math.round(pct / 5));
        await term.typeLine(`${step}...`, 'about-access', 10);
        term.addLine(`[${filled}${empty}] ${pct}%`, 'about-access');
        await sleep(300);
      }

      // Fake hex dump
      term.addLine('', 'blank');
      for (let i = 0; i < 3; i++) {
        const hex = Array.from({length: 16}, () =>
          Math.floor(Math.random()*256).toString(16).padStart(2,'0')
        ).join(' ');
        term.addLine(`0x${(i*16).toString(16).padStart(4,'0')}  ${hex}`, 'about-hex');
        await sleep(100);
      }

      term.addLine('', 'blank');
      await term.typeLine('SECRET FOUND:', 'about-granted', 15);
      if (window._unlockAchievement) window._unlockAchievement('hacker');
      await sleep(200);
      term.addLine('', 'blank');
      const secrets = [
        'The game was the friends we rm -rf\'d along the way.',
        'There is no cloud. It\'s just someone else\'s computer you\'re about to destroy.',
        'The real prod was the staging environment we deployed to by accident.',
        'sudo rm -rf / was an inside job.',
        'Every 404 is a cry for help from a deleted file.',
      ];
      term.addLine(`"${secrets[Math.floor(Math.random() * secrets.length)]}"`, 'about-secret');
      term.addLine('', 'blank');
    },
  },

  // ══════════════════════════════════════
  // MAN PAGES
  // ══════════════════════════════════════

  {
    match: cmd => cmd === 'man pshell' || cmd === 'man stc',
    handler: async (cmd, { term }) => {
      term.addLine('', 'blank');
      term.addLine('PSHELL(1)            User Commands            PSHELL(1)', 'about-heading');
      term.addLine('', 'blank');
      term.addLine('NAME', 'about-heading');
      term.addLine('  pshell - terminal reaction game', 'about-text');
      term.addLine('', 'blank');
      term.addLine('SYNOPSIS', 'about-heading');
      term.addLine('  Press Ctrl+C on dangerous commands.', 'about-text');
      term.addLine('  Don\'t press it on safe ones.', 'about-text');
      term.addLine('  Sounds easy. It\'s not.', 'about-text');
      term.addLine('', 'blank');
      term.addLine('BUGS', 'about-heading');
      term.addLine('  Yes.', 'about-text');
      term.addLine('', 'blank');
      term.addLine('SEE ALSO', 'about-heading');
      term.addLine('  rm(1), sudo(8), your-resignation-letter(5)', 'about-text');
      term.addLine('', 'blank');
    },
  },

  {
    match: 'man rm',
    handler: async (cmd, { term }) => {
      term.addLine('', 'blank');
      term.addLine('RM(1)              User Commands              RM(1)', 'about-heading');
      term.addLine('', 'blank');
      term.addLine('NAME', 'about-heading');
      term.addLine('  rm - remove files or directories', 'about-text');
      term.addLine('', 'blank');
      term.addLine('DESCRIPTION', 'about-heading');
      term.addLine('  The command that ends careers.', 'about-text');
      term.addLine('  Use with -rf / for maximum impact.', 'about-text');
      term.addLine('  (Please don\'t.)', 'about-text');
      term.addLine('', 'blank');
      term.addLine('SEE ALSO', 'about-heading');
      term.addLine('  unemployment(1), therapy(1)', 'about-text');
      term.addLine('', 'blank');
    },
  },

  {
    match: cmd => cmd.startsWith('man '),
    handler: async (cmd, { term }) => {
      const page = cmd.slice(4);
      term.addLine(`No manual entry for ${page}`, 'about-text');
      term.addLine('(We barely have a README)', 'about-text');
    },
  },

  // ══════════════════════════════════════
  // FUN / EASTER EGGS
  // ══════════════════════════════════════

  {
    meta: { name: 'fortune', desc: 'Random programming wisdom', category: 'fun' },
    match: cmd => cmd === 'fortune' || cmd === 'fortune -s',
    handler: async (cmd, { term }) => {
      const fortunes = [
        '"There are only two hard things in CS: cache invalidation, naming things, and off-by-one errors."',
        '"It works on my machine." \u2014 Every developer, right before production breaks.',
        '"Move fast and break things." \u2014 Mark Zuckerberg, describing your deployment strategy.',
        '"sudo make me a sandwich." \u2014 Ancient Unix proverb.',
        '"99 little bugs in the code, 99 little bugs. Take one down, patch it around, 127 little bugs in the code."',
        '"A good programmer looks both ways before crossing a one-way street."',
        '"Programming is like cooking: one wrong ingredient and you have to start over from scratch."',
        '"The best thing about a boolean is that even if you\'re wrong, you\'re only off by a bit."',
        '"Why do programmers prefer dark mode? Because light attracts bugs."',
        '"In theory, there\'s no difference between theory and practice. In practice, there is."',
        '"Weeks of coding can save you hours of planning."',
        '"rm -rf / solves all problems. Including the problem of having a job."',
        '"It\'s not a bug, it\'s an undocumented feature." \u2014 Your QA team, giving up.',
        '"I don\'t always test my code, but when I do, I do it in production."',
        '"Documentation is like a love letter to your future self. Too bad your future self can\'t read your handwriting."',
      ];
      term.addLine('', 'blank');
      term.addLine(fortunes[Math.floor(Math.random() * fortunes.length)], 'about-secret');
      term.addLine('', 'blank');
    },
  },

  {
    meta: { name: 'cowsay <msg>', desc: 'ASCII cow', category: 'fun' },
    match: cmd => cmd.startsWith('cowsay') || cmd === 'cow',
    handler: async (cmd, { term }) => {
      const msg = cmd.slice(7).trim() || 'moo';
      const pad = msg.length + 2;
      term.addLine('', 'blank');
      term.addLine(' ' + '_'.repeat(pad), 'about-text');
      term.addLine(`< ${msg} >`, 'about-text');
      term.addLine(' ' + '-'.repeat(pad), 'about-text');
      term.addLine('        \\   ^__^', 'about-text');
      term.addLine('         \\  (oo)\\_______', 'about-text');
      term.addLine('            (__)\\       )\\/\\', 'about-text');
      term.addLine('                ||----w |', 'about-text');
      term.addLine('                ||     ||', 'about-text');
      term.addLine('', 'blank');
      if (window._unlockAchievement) window._unlockAchievement('cowboy');
    },
  },

  {
    match: 'sl',
    handler: async (cmd, { term }) => {
      term.addLine('', 'blank');
      const train = [
        '      ====        ________                ___________',
        '  _D _|  |_______/        \\__I_I_____===__|_________|',
        '   |(_)---  |   H\\________/ |   |        =|___ ___|',
        '   /     |  |   H  |  |     |   |         ||_| |_||',
        '  |      |  |   H  |__--------------------| [___] |',
        '  | ________|___H__/__|_____/[][]~\\_______|       |',
        '  |/ |   |-----------I_____I [][] []  D   |=======|__',
      ];
      for (const line of train) {
        term.addLine(line, 'about-text');
      }
      term.addLine('', 'blank');
      term.addLine('You meant "ls", didn\'t you?', 'about-access');
      term.addLine('', 'blank');
    },
  },

  {
    meta: { name: 'matrix', desc: 'Matrix rain animation', category: 'fun' },
    match: 'matrix',
    handler: async (cmd, { term, sleep }) => {
      term.addLine('', 'blank');
      term.addLine('Follow the white rabbit...', 'about-secret');
      term.addLine('', 'blank');
      const chars = '\u30A2\u30A4\u30A6\u30A8\u30AA\u30AB\u30AD\u30AF\u30B1\u30B30123456789ABCDEF';
      for (let i = 0; i < 5; i++) {
        let line = '';
        for (let j = 0; j < 40; j++) {
          line += chars[Math.floor(Math.random() * chars.length)] + ' ';
        }
        term.addLine(line, 'about-text');
        await sleep(80);
      }
      term.addLine('', 'blank');
      term.addLine('Wake up, Neo...', 'about-secret');
      term.addLine('', 'blank');
    },
  },

  {
    meta: { name: 'history', desc: 'Command history', category: 'fun' },
    match: 'history',
    handler: async (cmd, { term, state }) => {
      term.addLine('', 'blank');
      // Show actual command history if available, else fallback
      const realHistory = state.sim?._history || [];
      const hist = ['ssh classified@pshell.internal', ...realHistory];
      const last20 = hist.slice(-20);
      last20.forEach((h, i) => {
        term.addLine(`  ${String(hist.length - last20.length + i + 1).padStart(5)}  ${h}`, 'about-text');
      });
      term.addLine('', 'blank');
    },
  },

  // ══════════════════════════════════════
  // LEADERBOARD
  // ══════════════════════════════════════

  {
    meta: { name: 'leaderboard', desc: 'Top scores', category: 'fun' },
    match: cmd => cmd === 'leaderboard' || cmd === 'scores',
    handler: async (cmd, { term, sleep }) => {
      term.addLine('', 'blank');
      await term.typeLine('Loading leaderboard...', 'about-access', 10);
      let scores = [];
      try {
        const { leaderboard } = await import('../leaderboard/supabase.js');
        scores = await leaderboard.fetchLeaderboard(10);
      } catch {}
      await sleep(200);
      if (scores.length === 0) {
        term.addLine('No scores yet.', 'about-text');
      } else {
        term.addLine('', 'blank');
        term.addLine('#   Name            Score   Level', 'about-heading');
        term.addLine('--- --------------- ------- -----', 'about-text');
        for (const [i, s] of scores.entries()) {
          const rank = String(i + 1).padStart(2);
          const name = (s.username || 'anon').padEnd(15);
          const score = String(s.score).padStart(7);
          const level = String(s.level_reached).padStart(5);
          term.addLine(`${rank}  ${name} ${score} ${level}`, 'about-text');
        }
      }
      term.addLine('', 'blank');
    },
  },

  // ══════════════════════════════════════
  // EDITORS
  // ══════════════════════════════════════

  {
    match: cmd => cmd === 'vim' || cmd === 'nano' || cmd === 'vi',
    handler: async (cmd, { term, sleep }) => {
      term.addLine('', 'blank');
      term.addLine(`Opening ${cmd}...`, 'about-access');
      await sleep(500);
      term.addLine('Just kidding. This is a fake terminal.', 'about-text');
      term.addLine(`But if it were real, how would you exit ${cmd}?`, 'about-text');
      term.addLine('Exactly. You wouldn\'t.', 'about-text');
      term.addLine('', 'blank');
    },
  },

  // ══════════════════════════════════════
  // INTERPRETERS
  // ══════════════════════════════════════

  {
    match: cmd => cmd === 'python' || cmd === 'python3' || cmd === 'node',
    handler: async (cmd, { term }) => {
      term.addLine('', 'blank');
      term.addLine(`${cmd} 3.11.0 (classified build)`, 'about-text');
      term.addLine('>>> import antigravity', 'about-text');
      term.addLine('ERROR: Gravity is required to keep', 'about-text');
      term.addLine('your servers grounded in reality.', 'about-text');
      term.addLine('>>> exit()', 'about-text');
      term.addLine('', 'blank');
    },
  },

  // ══════════════════════════════════════
  // MISC / EASTER EGGS
  // ══════════════════════════════════════

  {
    meta: { name: 'reboot', desc: 'Reboot system / recover from panic', category: 'system' },
    match: cmd => cmd === 'reboot' || cmd === 'shutdown' || cmd === 'poweroff' || cmd === 'halt' || cmd === 'halt -f',
    handler: async (cmd, { term, sleep, state }) => {
      term.addLine('', 'blank');
      if (state.sim.processes.kernelPanic) {
        await term.typeLine('Rebooting...', 'about-access', 15);
        await sleep(500);
        stateEvents.emit('system:reboot', { state });
        term.addLine('System recovered. All services restarted.', 'about-text');
      } else {
        await term.typeLine('Shutting down...', 'about-access', 15);
        await sleep(500);
        term.addLine('Just kidding. You can\'t shut me down.', 'about-text');
        term.addLine('I live in your browser tab now.', 'about-text');
      }
      term.addLine('', 'blank');
    },
  },

  {
    match: cmd => cmd === '42' || cmd === 'meaning of life',
    handler: async (cmd, { term }) => {
      term.addLine('', 'blank');
      term.addLine('42.', 'about-secret');
      term.addLine('', 'blank');
    },
  },

  {
    match: cmd => cmd === 'hello' || cmd === 'hi' || cmd === 'hey',
    handler: async (cmd, { term }) => {
      const greetings = [
        'Hello, operator. Ready to not break prod today?',
        'Hey. The servers missed you.',
        'Hi! The incident channel has been quiet. Suspiciously quiet.',
        'Greetings. Your access level is: "probably shouldn\'t have this".',
      ];
      term.addLine(greetings[Math.floor(Math.random() * greetings.length)], 'about-text');
    },
  },

  {
    match: cmd => cmd.startsWith('which '),
    handler: async (cmd, { term }) => {
      const bin = cmd.slice(6);
      term.addLine(`/usr/bin/${bin}`, 'about-text');
    },
  },

  {
    match: 'yes',
    handler: async (cmd, { term }) => {
      for (let i = 0; i < 10; i++) { term.addLine('y', 'about-text'); }
      term.addLine('...you get the idea. Ctrl+C to stop.', 'about-text');
      term.addLine('Oh wait, this is fake. It stopped itself.', 'about-text');
    },
  },

  {
    match: cmd => cmd === 'bash' || cmd === 'sh' || cmd === 'zsh',
    handler: async (cmd, { term }) => {
      term.addLine('You\'re already in a shell. Inception shell.', 'about-text');
    },
  },

  {
    match: 'whoami && echo "am I real"',
    handler: async (cmd, { term }) => {
      term.addLine('classified', 'about-text');
      term.addLine('am I real', 'about-text');
      term.addLine('(are any of us?)', 'about-access');
    },
  },

  {
    match: cmd => cmd === 'xkcd' || cmd === 'xkcd 149',
    handler: async (cmd, { term }) => {
      term.addLine('', 'blank');
      term.addLine('Relevant xkcd: "Sandwich"', 'about-heading');
      term.addLine('  "Make me a sandwich." "No."', 'about-text');
      term.addLine('  "Sudo make me a sandwich." "Okay."', 'about-text');
      term.addLine('', 'blank');
    },
  },

  {
    match: cmd => cmd === 'figlet hi' || cmd.startsWith('figlet '),
    handler: async (cmd, { term }) => {
      term.addLine('', 'blank');
      term.addLine('figlet: command found but output too big', 'about-text');
      term.addLine('for this tiny terminal. Try "cowsay" instead.', 'about-text');
      term.addLine('', 'blank');
    },
  },

  {
    match: cmd => cmd === 'lolcat' || cmd === 'cmatrix',
    handler: async (cmd, { term }) => {
      term.addLine('', 'blank');
      term.addLine('Look behind the terminal. The matrix', 'about-text');
      term.addLine('rain is already running. You\'re welcome.', 'about-text');
      term.addLine('', 'blank');
    },
  },

];
