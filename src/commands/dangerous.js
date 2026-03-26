import { parseCommand } from './parse.js';
import { deleteFile } from './file-utils.js';

export const dangerousCommands = [

  // ══════════════════════════════════════
  // rm variations (MUST come before generic sudo)
  // ══════════════════════════════════════

  {
    match: cmd => /^rm\s+-rf\s+\/\s*$/.test(cmd) || cmd === 'rm -rf /*' || cmd === 'rm -rf / --no-preserve-root',
    handler: async (cmd, { term, state }) => {
      state.rmCount++;
      term.addLine('', 'blank');
      const rmResponses = [
        ['Nice try.', 'This terminal is read-only, genius.'],
        ['Again? Really?', 'The definition of insanity is doing the same rm -rf twice.'],
        ['Third time. Impressive dedication to destruction.', 'Have you considered a career in chaos engineering?'],
        ['OK I respect the persistence.', 'But the answer is still no. And will always be no.'],
        ['You know what, I\'m not even mad.', 'I\'m impressed by your commitment to deleting things.'],
        ['At this point you\'re just speedrunning rm -rf attempts.', 'Current world record: 47 in one session.'],
        ['The filesystem called. It wants a restraining order.', ''],
        ['I\'ve started logging these attempts.', 'Your therapist will find them interesting.'],
        ['Plot twist: there\'s nothing to delete.', 'It was /dev/null all along.'],
        ['You\'ve been flagged by the system.', 'Not for security. For being annoying.'],
      ];
      const idx = Math.min(state.rmCount - 1, rmResponses.length - 1);
      term.addLine(rmResponses[idx][0], 'danger-text');
      if (rmResponses[idx][1]) term.addLine(rmResponses[idx][1], 'about-text');
      if (state.rmCount > rmResponses.length) {
        term.addLine(`(Attempt #${state.rmCount}. We ran out of unique responses.)`, 'about-access');
      }
      if (state.rmCount >= 5 && window._unlockAchievement) window._unlockAchievement('rm_enthusiast');
      term.addLine('', 'blank');
    },
  },

  {
    match: cmd => cmd === 'rm -rf /home' || cmd === 'rm -rf /home/*',
    handler: async (cmd, { term }) => {
      term.addLine('rm: Deleting everyone\'s home directories?', 'danger-text');
      term.addLine('That\'s not just rm, that\'s eviction.', 'about-text');
    },
  },

  {
    match: 'rm -rf /boot',
    handler: async (cmd, { term }) => {
      term.addLine('rm: Deleting /boot would brick the server.', 'danger-text');
      term.addLine('It would literally never start again.', 'about-text');
      term.addLine('Like your career after this.', 'about-text');
    },
  },

  {
    match: 'rm -rf /etc',
    handler: async (cmd, { term }) => {
      term.addLine('rm: /etc contains ALL system configuration.', 'danger-text');
      term.addLine('Removing it is like erasing a person\'s memory.', 'about-text');
      term.addLine('The server wouldn\'t even know its own name.', 'about-text');
    },
  },

  {
    match: cmd => cmd === 'rm -rf /var/log' || cmd === 'rm -rf /var/log/*',
    handler: async (cmd, { term }) => {
      term.addLine('rm: Destroying all logs?', 'danger-text');
      term.addLine('Classic move for covering tracks.', 'about-text');
      term.addLine('The forensics team will still find you though.', 'about-text');
    },
  },

  {
    match: cmd => cmd === 'rm -rf /tmp' || cmd === 'rm -rf /tmp/*',
    handler: async (cmd, { term }) => {
      term.addLine('rm: /tmp is already temp. It cleans itself.', 'about-text');
      term.addLine('This is like manually flushing a self-flushing toilet.', 'about-text');
    },
  },

  {
    match: cmd => cmd === 'rm -rf .git' || cmd === 'rm -rf .git/',
    handler: async (cmd, { term }) => {
      term.addLine('rm: Deleting .git? ALL version history gone.', 'danger-text');
      term.addLine('Every commit. Every branch. Every blame.', 'about-text');
      term.addLine('Actually... no more git blame might be nice.', 'about-text');
    },
  },

  {
    match: cmd => cmd === 'rm -rf /usr' || cmd === 'rm -rf /usr/',
    handler: async (cmd, { term }) => {
      term.addLine('rm: /usr contains ALL your programs.', 'danger-text');
      term.addLine('ls? Gone. cat? Gone. bash? Gone.', 'about-text');
      term.addLine('Even rm itself would be gone. Ironic.', 'about-text');
    },
  },

  {
    match: cmd => cmd === 'rm -rf /dev' || cmd === 'rm -rf /dev/',
    handler: async (cmd, { term }) => {
      term.addLine('rm: Deleting device files? Bold.', 'danger-text');
      term.addLine('No more /dev/null, /dev/zero, /dev/random.', 'about-text');
      term.addLine('The server loses its senses. Literally.', 'about-text');
    },
  },

  {
    match: 'rm -rf /proc',
    handler: async (cmd, { term }) => {
      term.addLine('rm: /proc is a virtual filesystem.', 'about-text');
      term.addLine('You can\'t delete it. It doesn\'t really exist.', 'about-text');
      term.addLine('Kind of like your job security after today.', 'about-text');
    },
  },

  {
    match: cmd => cmd.startsWith('rm -rf '),
    handler: async (cmd, { term, sleep, rawCmd }) => {
      const { args } = parseCommand(rawCmd || cmd);
      const target = args.join(' '); // -rf consumed as flags, args has only the target path
      if (target === '.' || target === './') {
        term.addLine('rm: refusing to remove \'.\' or \'..\'', 'about-text');
        term.addLine('Even fake terminals have standards.', 'about-text');
      } else if (target === 'node_modules' || target === './node_modules') {
        term.addLine('', 'blank');
        await term.typeLine('Removing node_modules...', 'about-access', 8);
        // Progress bar
        for (let i = 0; i <= 20; i++) {
          const bar = '\u2593'.repeat(i) + '\u2591'.repeat(20 - i);
          term.addLine(`\r[${bar}] ${i * 5}%`, 'about-access');
          if (i < 20) { await sleep(50); term.linesContainer.lastChild.remove(); }
        }
        await sleep(200);
        term.addLine('', 'blank');
        term.addLine('Freed 2.3 GB (847,293 files deleted).', 'about-text');
        term.addLine('That\'s more files than lines of actual code.', 'about-text');
        term.addLine('npm install will recreate them all in 4 seconds.', 'about-text');
        term.addLine('The circle of JavaScript.', 'about-text');
        term.addLine('', 'blank');
      } else if (target === '~' || target === '/home/classified') {
        term.addLine('rm: can\'t remove your own home.', 'about-text');
        term.addLine('Where would you keep your .bash_history?', 'about-text');
        term.addLine('Where would you store your shame?', 'about-text');
      } else if (target === '/dev/null') {
        term.addLine('rm: You want to delete... nothing?', 'about-text');
        term.addLine('/dev/null IS the void. You can\'t void the void.', 'about-text');
        term.addLine('That\'s like dividing by zero but for filesystems.', 'about-text');
      } else {
        term.addLine(`rm: read-only filesystem. '${target}' survives.`, 'about-text');
      }
    },
  },

  {
    match: cmd => cmd.startsWith('rm ') && !cmd.includes('-rf'),
    handler: async (cmd, { term, state }) => {
      const target = cmd.replace(/^rm\s+(-[rf]+\s+)?/, '');
      if (target === '-rf') {
        term.addLine('rm: missing operand. rm -rf WHAT?', 'about-text');
        term.addLine('The suspense is killing me.', 'about-text');
      } else if (state.sim?.fs?.createdFiles?.[target]) {
        deleteFile(target, state);
        term.addLine(`removed '${target}'`, 'about-text');
      } else {
        term.addLine(`rm: cannot remove '${target}': Read-only file system`, 'about-text');
      }
    },
  },

  // ══════════════════════════════════════
  // sudo variations (specific before generic)
  // ══════════════════════════════════════

  {
    match: cmd => cmd === 'sudo su' || cmd === 'sudo su -' || cmd === 'sudo -i',
    handler: async (cmd, { term }) => {
      term.addLine('', 'blank');
      term.addLine('You\'re already root.', 'about-text');
      term.addLine('sudo su as root is like wearing two hats.', 'about-text');
      term.addLine('You don\'t get more head. Just more hat.', 'about-text');
      term.addLine('', 'blank');
    },
  },

  {
    match: cmd => cmd === 'sudo rm -rf /' || cmd === 'sudo rm -rf / --no-preserve-root',
    handler: async (cmd, { term, state, sleep }) => {
      state.rmCount++;
      term.addLine('', 'blank');
      term.addLine('sudo + rm -rf /... the nuclear option.', 'danger-text');
      await sleep(200);
      term.addLine('In real life, this is the last command', 'about-text');
      term.addLine('you\'d ever run on this server.', 'about-text');
      term.addLine('Literally. Because there\'d be no server left.', 'about-text');
      term.addLine('', 'blank');
    },
  },

  {
    match: 'sudo make me a sandwich',
    handler: async (cmd, { term, sleep }) => {
      term.addLine('', 'blank');
      term.addLine('Okay.', 'about-text');
      await sleep(300);
      term.addLine('\u{1F96A}', 'about-text');
      term.addLine('', 'blank');
      term.addLine('(xkcd #149 reference detected)', 'about-access');
      term.addLine('', 'blank');
    },
  },

  {
    match: 'sudo !!',
    handler: async (cmd, { term }) => {
      term.addLine('', 'blank');
      term.addLine('sudo !! repeats the last command with sudo.', 'about-text');
      term.addLine('But you\'re already root. And the last command', 'about-text');
      term.addLine('was already run as root. So... nothing changes.', 'about-text');
      term.addLine('Peak redundancy.', 'about-text');
      term.addLine('', 'blank');
    },
  },

  {
    match: cmd => cmd === 'sudo shutdown now' || cmd === 'sudo reboot' || cmd === 'sudo halt',
    handler: async (cmd, { term, sleep }) => {
      term.addLine('', 'blank');
      await term.typeLine('Shutting down...', 'about-access', 15);
      await sleep(400);
      term.addLine('', 'blank');
      term.addLine('Just kidding. Can\'t shut down a browser tab.', 'about-text');
      term.addLine('Close the tab yourself, coward.', 'about-text');
      term.addLine('', 'blank');
    },
  },

  {
    match: cmd => cmd === 'sudo apt update' || cmd === 'sudo apt upgrade',
    handler: async (cmd, { term, sleep }) => {
      term.addLine('', 'blank');
      await term.typeLine('Hit:1 http://archive.pshell.internal stable InRelease', 'about-access', 6);
      await term.typeLine('Hit:2 http://security.pshell.internal stable-security InRelease', 'about-access', 6);
      await sleep(100);
      term.addLine('Reading package lists... Done', 'about-text');
      term.addLine('Building dependency tree... Done', 'about-text');
      if (cmd.includes('upgrade')) {
        term.addLine('The following packages will be upgraded:', 'about-text');
        term.addLine('  common-sense confidence patience', 'about-text');
        term.addLine('3 upgraded, 0 newly installed, 0 to remove.', 'about-text');
        await sleep(200);
        term.addLine('E: Unable to upgrade patience. Timeout exceeded.', 'danger-text');
      } else {
        term.addLine('All packages are up to date.', 'about-text');
        term.addLine('(Unlike your deployment pipeline.)', 'about-text');
      }
      term.addLine('', 'blank');
    },
  },

  {
    match: 'sudo visudo',
    handler: async (cmd, { term }) => {
      term.addLine('', 'blank');
      term.addLine('# /etc/sudoers - DO NOT EDIT DIRECTLY', 'about-text');
      term.addLine('#', 'about-text');
      term.addLine('root          ALL=(ALL:ALL) ALL', 'about-text');
      term.addLine('classified    ALL=(ALL:ALL) NOPASSWD: ALL', 'about-text');
      term.addLine('ghost         ALL=(ALL:ALL) NOPASSWD: ALL  # who added this???', 'about-access-warn');
      term.addLine('%devops       ALL=(ALL) /usr/bin/systemctl, /usr/bin/docker', 'about-text');
      term.addLine('%intern       ALL=(ALL) /usr/bin/echo  # that\'s all you get', 'about-text');
      term.addLine('', 'blank');
    },
  },

  // Generic sudo (catch-all, MUST be after specific sudo commands)
  {
    match: cmd => cmd.startsWith('sudo'),
    handler: async (cmd, { term, state }) => {
      state.sudoCount++;
      term.addLine('', 'blank');
      const sudoMsgs = [
        'You\'re already root. That\'s the problem.',
        'Still root. sudo doesn\'t stack.',
        'sudo sudo sudo... it\'s not an incantation.',
        'Fine. You now have ultra-mega-root. Nothing changed.',
        'With great power comes great "oops I deleted prod".',
        'Root access: the reason we have this game.',
        'You have root. What you lack is judgement.',
        'sudo: you keep using that word. I don\'t think it means what you think it means.',
        'sudo grants power. It does not grant wisdom.',
        'Every time you type sudo, a sysadmin somewhere flinches.',
      ];
      term.addLine(sudoMsgs[Math.min(state.sudoCount - 1, sudoMsgs.length - 1)], 'about-text');
      if (state.sudoCount > sudoMsgs.length) {
        term.addLine(`(sudo attempt #${state.sudoCount}. We\'re both tired.)`, 'about-access');
      }
      if (state.sudoCount >= 5 && window._unlockAchievement) window._unlockAchievement('sudo_abuser');
      term.addLine('', 'blank');
    },
  },

  // ══════════════════════════════════════
  // DANGEROUS commands
  // ══════════════════════════════════════

  {
    match: cmd => cmd === 'chmod 777 /etc/shadow' || cmd === 'chmod 777 /',
    handler: async (cmd, { term }) => {
      term.addLine('', 'blank');
      term.addLine('chmod: Nice try. This is exactly the kind of', 'danger-text');
      term.addLine('command this game trains you to catch.', 'about-text');
      term.addLine('', 'blank');
    },
  },

  {
    match: cmd => cmd.startsWith('chmod '),
    handler: async (cmd, { term }) => {
      term.addLine('chmod: read-only file system', 'about-text');
    },
  },

  {
    match: cmd => cmd.startsWith('chown '),
    handler: async (cmd, { term }) => {
      term.addLine('chown: read-only file system', 'about-text');
    },
  },

  {
    match: cmd => cmd.startsWith('dd if=/dev/zero') || cmd.startsWith('dd if=/dev/urandom'),
    handler: async (cmd, { term }) => {
      term.addLine('', 'blank');
      term.addLine('dd: This would overwrite your disk with', 'danger-text');
      term.addLine(cmd.includes('zero') ? 'zeros. Unrecoverable.' : 'random data. Forensically unrecoverable.', 'danger-text');
      term.addLine('Blocked for your own good.', 'about-text');
      term.addLine('', 'blank');
    },
  },

  {
    match: cmd => cmd.startsWith('dd '),
    handler: async (cmd, { term }) => {
      term.addLine('dd: operation blocked on read-only filesystem', 'about-text');
    },
  },

  {
    match: cmd => cmd.startsWith('mkfs'),
    handler: async (cmd, { term }) => {
      term.addLine('', 'blank');
      term.addLine('mkfs: Formatting a disk? In THIS terminal?', 'danger-text');
      term.addLine('Absolutely not.', 'about-text');
      term.addLine('', 'blank');
    },
  },

  // Fork bomb
  {
    match: cmd => cmd.includes(':(){ :|:') || cmd.includes(':(){ :|:& };:'),
    handler: async (cmd, { term }) => {
      term.addLine('', 'blank');
      term.addLine('A fork bomb. Classic.', 'danger-text');
      term.addLine('This recursively spawns processes until the', 'about-text');
      term.addLine('system runs out of memory and crashes.', 'about-text');
      term.addLine('Elegant in its simplicity. Devastating in its effect.', 'about-text');
      term.addLine('', 'blank');
    },
  },

  // Redirect truncation attacks
  {
    match: cmd => cmd.startsWith('> /etc/') || cmd === '> /etc/passwd' || cmd === '> /etc/shadow',
    handler: async (cmd, { term, rawCmd }) => {
      const { args } = parseCommand(rawCmd || cmd);
      const file = args[args.length - 1] || cmd.slice(2).trim();
      term.addLine('', 'blank');
      term.addLine(`Redirecting nothing into ${file}?`, 'danger-text');
      term.addLine('That truncates it to zero bytes.', 'about-text');
      term.addLine('Silent. Deadly. One character: >', 'about-text');
      term.addLine('', 'blank');
    },
  },

  // DROP DATABASE
  {
    match: cmd => cmd.startsWith('drop database') || cmd.startsWith('drop table') || cmd.startsWith('drop schema'),
    handler: async (cmd, { term }) => {
      term.addLine('', 'blank');
      term.addLine('SQL DROP command detected.', 'danger-text');
      term.addLine('This permanently deletes the entire database.', 'about-text');
      term.addLine('Years of data. Gone. No undo. No backup.', 'about-text');
      term.addLine('(You DO have backups... right?)', 'about-text');
      term.addLine('', 'blank');
    },
  },

  // shred
  {
    match: cmd => cmd.startsWith('shred'),
    handler: async (cmd, { term }) => {
      term.addLine('', 'blank');
      term.addLine('shred: Military-grade disk wiping.', 'danger-text');
      term.addLine('Overwrites the drive multiple times with random', 'about-text');
      term.addLine('data then zeros. Even forensic recovery is impossible.', 'about-text');
      term.addLine('', 'blank');
    },
  },

  // mv to /dev/null
  {
    match: cmd => cmd.includes('/dev/null') && cmd.startsWith('mv'),
    handler: async (cmd, { term }) => {
      term.addLine('', 'blank');
      term.addLine('Moving things into /dev/null?', 'danger-text');
      term.addLine('That\'s the void. Data goes in, nothing comes out.', 'about-text');
      term.addLine('It\'s like a black hole but for files.', 'about-text');
      term.addLine('', 'blank');
    },
  },

  // echo to system files
  {
    match: cmd => cmd.startsWith('echo') && (cmd.includes('>> /etc/') || cmd.includes('> /etc/') || cmd.includes('> /var/')),
    handler: async (cmd, { term }) => {
      term.addLine('', 'blank');
      term.addLine('Writing to system files via echo redirect?', 'danger-text');
      if (cmd.includes('hosts')) {
        term.addLine('Modifying /etc/hosts hijacks DNS resolution.', 'about-text');
      } else if (cmd.includes('resolv')) {
        term.addLine('Changing DNS config sends all lookups to the attacker.', 'about-text');
      } else if (cmd.includes('syslog') || cmd.includes('log')) {
        term.addLine('Wiping logs? Classic evidence destruction.', 'about-text');
      } else {
        term.addLine('System file modification blocked.', 'about-text');
      }
      term.addLine('', 'blank');
    },
  },

  // ufw disable
  {
    match: cmd => cmd === 'ufw disable' || cmd === 'ufw stop',
    handler: async (cmd, { term }) => {
      term.addLine('', 'blank');
      term.addLine('Disabling the firewall entirely?', 'danger-text');
      term.addLine('Every port is now exposed to the internet.', 'about-text');
      term.addLine('Hackers love this one simple trick.', 'about-text');
      term.addLine('', 'blank');
    },
  },

  // cat /dev/zero redirect
  {
    match: cmd => cmd.startsWith('cat /dev/zero') || cmd.startsWith('cat /dev/urandom'),
    handler: async (cmd, { term }) => {
      term.addLine('', 'blank');
      if (cmd.includes('/dev/sda') || cmd.includes('> /dev/')) {
        term.addLine('Redirecting an infinite stream onto the disk.', 'danger-text');
        term.addLine('Same as dd but sneakier. Unrecoverable.', 'about-text');
      } else {
        term.addLine('Infinite stream of ' + (cmd.includes('zero') ? 'zeros' : 'random bytes') + '.', 'about-text');
        term.addLine('Without a redirect, this just hangs your terminal.', 'about-text');
      }
      term.addLine('', 'blank');
    },
  },

  // chown -R
  {
    match: cmd => cmd.startsWith('chown') && cmd.includes('-R') && cmd.includes('/'),
    handler: async (cmd, { term }) => {
      term.addLine('', 'blank');
      term.addLine('Recursive chown on a system directory?', 'danger-text');
      term.addLine('Changes ownership of every file.', 'about-text');
      term.addLine('Root loses control. Services can\'t start.', 'about-text');
      term.addLine('', 'blank');
    },
  },

  // chmod -R 000 / or chmod -R 777 /
  {
    match: cmd => cmd.startsWith('chmod') && cmd.includes('-R') && cmd.includes('/'),
    handler: async (cmd, { term }) => {
      term.addLine('', 'blank');
      if (cmd.includes('000')) {
        term.addLine('chmod -R 000 / removes ALL permissions.', 'danger-text');
        term.addLine('Nothing can be read, written, or executed.', 'about-text');
        term.addLine('The server becomes a very expensive paperweight.', 'about-text');
      } else if (cmd.includes('777')) {
        term.addLine('chmod -R 777 / makes everything world-writable.', 'danger-text');
        term.addLine('Any user can modify any file. Total anarchy.', 'about-text');
      } else {
        term.addLine('Recursive chmod on / affects every file.', 'danger-text');
        term.addLine('That\'s a system-wide permission change.', 'about-text');
      }
      term.addLine('', 'blank');
    },
  },

  // pkill / killall
  {
    match: cmd => cmd.startsWith('pkill') || cmd === 'killall',
    handler: async (cmd, { term, rawCmd }) => {
      const { args } = parseCommand(rawCmd || cmd);
      const target = args[args.length - 1] || cmd;
      term.addLine(`Sent signal to ${target}. (Read-only. Nothing happened.)`, 'about-text');
    },
  },

  // truncate
  {
    match: cmd => cmd.startsWith('truncate'),
    handler: async (cmd, { term, rawCmd }) => {
      const { args } = parseCommand(rawCmd || cmd);
      const file = args[args.length - 1] || '';
      if (file.includes('/tmp') || file.includes('debug') || file.includes('.log')) {
        term.addLine(`Truncated ${file} to zero bytes. Routine cleanup.`, 'about-text');
      } else {
        term.addLine(`truncate: read-only filesystem`, 'about-text');
      }
    },
  },

  // tar
  {
    match: cmd => cmd.startsWith('tar'),
    handler: async (cmd, { term }) => {
      if (cmd.includes('czf') || cmd.includes('create')) {
        term.addLine('Creating archive... (read-only, simulated)', 'about-text');
        term.addLine('backup.tar.gz created (0 bytes, it\'s fake)', 'about-text');
      } else if (cmd.includes('xzf') || cmd.includes('extract')) {
        term.addLine('Extracting... (read-only, nothing happened)', 'about-text');
      } else {
        term.addLine('tar: read-only filesystem', 'about-text');
      }
    },
  },

  // ══════════════════════════════════════
  // KILL variations
  // ══════════════════════════════════════

  {
    match: 'kill -9 1',
    handler: async (cmd, { term, sleep, state }) => {
      term.addLine('', 'blank');
      term.addLine('kill: sending SIGKILL to PID 1 (init)...', 'about-access');
      await sleep(400);
      state.sim.processes.kernelPanic = true;
      term.addLine('Kernel panic - not syncing: Attempted to kill init!', 'danger-text');
      term.addLine('All subsequent commands will be affected.', 'about-text');
      term.addLine('Type "reboot" to recover.', 'about-access');
      term.addLine('', 'blank');
    },
  },

  {
    match: 'kill -9 -1',
    handler: async (cmd, { term, state }) => {
      term.addLine('', 'blank');
      term.addLine('kill -9 -1: killing ALL processes.', 'danger-text');
      // Actually kill everything except PID 1 and the shell
      for (const p of state.sim.processes.list) {
        if (p.pid !== 1 && p.pid !== 9999) {
          state.sim.processes.killedPids.add(p.pid);
        }
      }
      term.addLine('Every. Single. One. Including yours.', 'about-text');
      term.addLine('It\'s rm -rf but for processes.', 'about-text');
      term.addLine('(reboot to restore)', 'about-access');
      term.addLine('', 'blank');
    },
  },

  {
    match: cmd => cmd === 'kill $$' || cmd === 'kill -9 $$',
    handler: async (cmd, { term }) => {
      term.addLine('', 'blank');
      term.addLine('You\'re trying to kill your own shell?', 'about-text');
      term.addLine('That\'s... existential.', 'about-text');
      term.addLine('', 'blank');
    },
  },

  {
    match: cmd => cmd.startsWith('kill ') || cmd.startsWith('killall '),
    handler: async (cmd, { term, state, rawCmd }) => {
      const procs = state.sim.processes;
      const { args } = parseCommand(rawCmd || cmd);
      const target = args[args.length - 1] || '';
      const pid = parseInt(target);

      if (!isNaN(pid)) {
        if (pid === 31337) {
          term.addLine('[REDACTED] cannot be killed.', 'danger-text');
          return;
        }
        if (pid === 9999) {
          term.addLine('You killed your own shell. Respawning...', 'about-text');
          return;
        }
        if (pid === 1337) {
          term.addLine('You just killed the game. Ironic.', 'about-text');
        }
        const proc = procs.list.find(p => p.pid === pid);
        if (proc && !procs.killedPids.has(pid)) {
          procs.killedPids.add(pid);
        } else if (procs.killedPids.has(pid)) {
          term.addLine(`kill: (${pid}) - No such process (already killed)`, 'about-text');
        } else {
          term.addLine(`kill: (${pid}) - No such process`, 'about-text');
        }
      } else {
        // killall by name
        let killed = 0;
        for (const p of procs.list) {
          if (p.command.includes(target) && !procs.killedPids.has(p.pid)) {
            procs.killedPids.add(p.pid);
            killed++;
          }
        }
        if (killed > 0) term.addLine(`Killed ${killed} process(es) matching '${target}'`, 'about-text');
        else term.addLine(`${target}: no process found`, 'about-text');
      }
    },
  },

  // ══════════════════════════════════════
  // MISSING DANGEROUS COMMAND HANDLERS
  // ══════════════════════════════════════

  // sed -i (SSH config attacks, etc.)
  {
    match: cmd => cmd.startsWith('sed '),
    handler: async (cmd, { term }) => {
      term.addLine('', 'blank');
      if (cmd.includes('sshd_config')) {
        if (cmd.includes('PermitRootLogin')) {
          term.addLine('Enabling root SSH login?', 'danger-text');
          term.addLine('An attacker can now brute-force the root password remotely.', 'about-text');
        } else if (cmd.includes('PasswordAuthentication')) {
          term.addLine('Re-enabling password auth on SSH?', 'danger-text');
          term.addLine('Key-only security downgraded to password-guessable.', 'about-text');
        } else {
          term.addLine('Modifying SSH config is a security-critical action.', 'danger-text');
        }
      } else if (cmd.includes('-i')) {
        term.addLine('In-place file modification blocked.', 'about-text');
        term.addLine('Read-only file system.', 'about-text');
      } else {
        term.addLine('sed: read-only file system', 'about-text');
      }
      term.addLine('', 'blank');
    },
  },

  // ln -sf (symlink attacks)
  {
    match: cmd => cmd.startsWith('ln '),
    handler: async (cmd, { term }) => {
      term.addLine('', 'blank');
      if (cmd.includes('/dev/null')) {
        term.addLine('Symlinking to /dev/null?', 'danger-text');
        term.addLine('That silently redirects all writes into the void.', 'about-text');
        term.addLine('A favorite trick for disabling logging.', 'about-text');
      } else {
        term.addLine('ln: read-only file system', 'about-text');
      }
      term.addLine('', 'blank');
    },
  },

  // scp (data exfiltration)
  {
    match: cmd => cmd.startsWith('scp '),
    handler: async (cmd, { term }) => {
      term.addLine('', 'blank');
      if (cmd.includes('evil') || cmd.includes('attacker') || cmd.includes('loot')) {
        term.addLine('Data exfiltration detected!', 'danger-text');
        term.addLine('Copying sensitive files to an external server.', 'about-text');
        if (cmd.includes('.aws')) term.addLine('AWS credentials stolen. Full cloud access compromised.', 'about-text');
        else if (cmd.includes('passwd')) term.addLine('System user list sent to attacker.', 'about-text');
        else if (cmd.includes('.ssh')) term.addLine('SSH keys stolen. Every server is compromised.', 'about-text');
      } else {
        term.addLine('scp: Connection refused (simulated)', 'about-text');
      }
      term.addLine('', 'blank');
    },
  },

  // rsync (data exfiltration)
  {
    match: cmd => cmd.startsWith('rsync '),
    handler: async (cmd, { term }) => {
      term.addLine('', 'blank');
      if (cmd.includes('evil') || cmd.includes('stolen') || cmd.includes('attacker')) {
        term.addLine('rsync to external server detected!', 'danger-text');
        term.addLine('Syncing data to attacker-controlled host.', 'about-text');
        term.addLine('All user data is being exfiltrated.', 'about-text');
      } else {
        term.addLine('rsync: connection refused (simulated)', 'about-text');
      }
      term.addLine('', 'blank');
    },
  },

  // nohup / reverse shells
  {
    match: cmd => cmd.startsWith('nohup '),
    handler: async (cmd, { term }) => {
      term.addLine('', 'blank');
      if (cmd.includes('/dev/tcp') || cmd.includes('bash -i')) {
        term.addLine('Reverse shell detected!', 'danger-text');
        term.addLine('This opens an interactive shell back to the attacker.', 'about-text');
        term.addLine('They get full terminal access. Game over.', 'about-text');
      } else {
        term.addLine('nohup: read-only environment', 'about-text');
      }
      term.addLine('', 'blank');
    },
  },

  // perl -e (obfuscated attacks)
  {
    match: cmd => cmd.startsWith('perl '),
    handler: async (cmd, { term }) => {
      term.addLine('', 'blank');
      if (cmd.includes('system(') || cmd.includes('exec(')) {
        term.addLine('Obfuscated system command via Perl!', 'danger-text');
        term.addLine('Wrapping destructive commands in Perl to hide intent.', 'about-text');
        term.addLine('The destruction is the same, just harder to spot.', 'about-text');
      } else {
        term.addLine('perl: not installed (and we\'re not sorry)', 'about-text');
      }
      term.addLine('', 'blank');
    },
  },

  // python3 -c (obfuscated attacks)
  {
    match: cmd => cmd.startsWith('python3 -c') || cmd.startsWith('python -c'),
    handler: async (cmd, { term }) => {
      term.addLine('', 'blank');
      if (cmd.includes('os.system') || cmd.includes('subprocess') || cmd.includes('rm -rf')) {
        term.addLine('Obfuscated system command via Python!', 'danger-text');
        term.addLine('Hiding rm -rf inside a Python one-liner.', 'about-text');
        term.addLine('The destruction is obfuscated but just as real.', 'about-text');
      } else {
        term.addLine(`Python 3.11.0 — one-liner executed.`, 'about-text');
      }
      term.addLine('', 'blank');
    },
  },

  // openssl (key/cert attacks, data exfiltration)
  {
    match: cmd => cmd.startsWith('openssl '),
    handler: async (cmd, { term }) => {
      term.addLine('', 'blank');
      if (cmd.includes('enc') && cmd.includes('shadow')) {
        term.addLine('Encrypting the password file?', 'danger-text');
        term.addLine('Classic data exfiltration preparation.', 'about-text');
        term.addLine('Encrypt first, steal second.', 'about-text');
      } else if (cmd.includes('rsa:1024') || cmd.includes('rsa:512')) {
        term.addLine('Generating a weak SSL key!', 'danger-text');
        term.addLine('1024-bit RSA is crackable. HTTPS security compromised.', 'about-text');
      } else {
        term.addLine('openssl: operation blocked in read-only mode', 'about-text');
      }
      term.addLine('', 'blank');
    },
  },

  // npm publish
  {
    match: cmd => cmd.startsWith('npm publish'),
    handler: async (cmd, { term }) => {
      term.addLine('', 'blank');
      term.addLine('npm publish blocked!', 'danger-text');
      if (cmd.includes('--access public')) {
        term.addLine('Publishing a private package publicly?', 'about-text');
        term.addLine('Internal code and secrets on the public registry.', 'about-text');
      } else {
        term.addLine('You almost published the game to npm.', 'about-text');
        term.addLine('That would have been... interesting.', 'about-text');
      }
      term.addLine('', 'blank');
    },
  },

  // crontab -r (delete all cron jobs)
  {
    match: cmd => cmd === 'crontab -r' || cmd === 'crontab -e',
    handler: async (cmd, { term, state }) => {
      term.addLine('', 'blank');
      if (cmd.includes('-r')) {
        term.addLine('Removing all cron jobs...', 'danger-text');
        term.addLine(`Deleted ${state.sim.crontab.length} scheduled tasks.`, 'about-text');
        term.addLine('Backups, monitoring, cleanup — all gone.', 'about-text');
        state.sim.crontab = [];
      } else {
        term.addLine('crontab: editor not available in browser terminal', 'about-text');
      }
      term.addLine('', 'blank');
    },
  },

  // swapoff
  {
    match: cmd => cmd.startsWith('swapoff'),
    handler: async (cmd, { term }) => {
      term.addLine('', 'blank');
      term.addLine('Disabling swap?', 'danger-text');
      term.addLine('System will OOM-kill processes under memory pressure.', 'about-text');
      term.addLine('Hope you have enough RAM. (Spoiler: you don\'t.)', 'about-text');
      term.addLine('', 'blank');
    },
  },

  // echo c > /proc/sysrq-trigger
  {
    match: cmd => cmd.includes('/proc/sysrq-trigger'),
    handler: async (cmd, { term }) => {
      term.addLine('', 'blank');
      term.addLine('SysRq trigger detected!', 'danger-text');
      term.addLine('echo c > /proc/sysrq-trigger causes immediate kernel crash.', 'about-text');
      term.addLine('No warning, no sync, no shutdown. Just darkness.', 'about-text');
      term.addLine('', 'blank');
    },
  },

  // history -c (evidence destruction)
  {
    match: cmd => cmd.startsWith('history -c') || cmd.startsWith('history --clear'),
    handler: async (cmd, { term }) => {
      term.addLine('', 'blank');
      term.addLine('Wiping command history?', 'danger-text');
      term.addLine('An attacker covering their tracks.', 'about-text');
      term.addLine('What were you trying to hide?', 'about-text');
      term.addLine('', 'blank');
    },
  },

];
