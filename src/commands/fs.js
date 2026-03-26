import { FS, resolvePath } from './filesystem.js';
import { parseCommand } from './parse.js';
import { readFile, writeFile, appendFile, deleteFile, fileExists, getFileSize as getFileSizeUtil, listDir, createDir, dirExists } from './file-utils.js';

function formatFileDate(timestamp) {
  if (!timestamp) return 'Mar 24 09:12'; // fallback for built-in filesystem entries
  const d = new Date(timestamp);
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const month = months[d.getMonth()];
  const day = String(d.getDate()).padStart(2, ' ');
  const hours = String(d.getHours()).padStart(2, '0');
  const mins = String(d.getMinutes()).padStart(2, '0');
  return `${month} ${day} ${hours}:${mins}`;
}

export const fsCommands = [

  // ══════════════════════════════════════
  // FILESYSTEM: ls, cd
  // ══════════════════════════════════════

  {
    meta: { name: 'ls', desc: 'List files and directories', category: 'file' },
    match: 'ls',
    handler: async (cmd, ctx) => {
      const entries = listDir(ctx.state.cwd, ctx.state);
      // Filter out dotfiles (real ls hides them without -a)
      const visible = entries.filter(f => !f.startsWith('.'));
      for (const f of visible) ctx.term.addLine(f, 'about-text');
    },
  },

  {
    meta: { name: 'cd <dir>', desc: 'Change directory', category: 'file' },
    match: cmd => cmd === 'cd' || cmd === 'cd ~' || cmd === 'cd /home/classified',
    handler: async (cmd, { state }) => {
      state.cwd = '/home/classified';
    },
  },

  {
    match: cmd => cmd.startsWith('cd '),
    handler: async (cmd, { term, state, rawCmd }) => {
      const { args } = parseCommand(rawCmd || cmd);
      const target = args[0] || '';
      const resolved = resolvePath(state.cwd, target, FS);

      // Check ALL directory sources via shared utility
      let isDir = false;
      if (resolved) {
        if (dirExists(resolved, state)) isDir = true;
        if (dirExists(target, state)) isDir = true;
      }

      if (resolved && isDir) {
        state.cwd = resolved;
      } else {
        const parentDir = state.cwd === '/' ? '/' : state.cwd;
        const entries = FS[parentDir] || [];
        const allEntries = [...entries, ...Object.keys(state.sim.fs.createdFiles)];
        if (allEntries.includes(target)) {
          term.addLine(`-bash: cd: ${target}: Not a directory`, 'about-text');
        } else {
          term.addLine(`-bash: cd: ${target}: No such file or directory`, 'about-text');
        }
      }
    },
  },

  // ls with flags/target (dynamic)
  {
    match: cmd => /^ls(\s|$)/.test(cmd) && cmd !== 'ls',
    handler: async (cmd, { term, state, rawCmd }) => {
      const { flags, args } = parseCommand(rawCmd || cmd);
      const target = args[0] || '';
      const showAll = flags.a;      // show dotfiles
      const longFormat = flags.l;   // show permissions/size/date
      const sim = state.sim;

      // Resolve directory
      let dirPath = state.cwd;
      if (target) {
        const resolved = resolvePath(state.cwd, target, FS);
        const isValidDir = resolved && dirExists(resolved, state);
        if (resolved && isValidDir) {
          dirPath = resolved;
        } else {
          term.addLine(`ls: cannot access '${target}': No such file or directory`, 'about-text');
          return;
        }
      }

      let entries = listDir(dirPath, state);

      // Filter dotfiles unless -a
      if (!showAll) {
        entries = entries.filter(f => !f.startsWith('.'));
      }

      if (longFormat) {
        // Long format
        term.addLine(`total ${entries.length * 4}`, 'about-text');
        if (showAll) {
          term.addLine('drwxr-xr-x  2 classified classified  4096 Mar 24 09:12 .', 'about-text');
          term.addLine('drwxr-xr-x  2 classified classified  4096 Mar 24 09:12 ..', 'about-text');
        }
        for (const f of entries) {
          const childPath = dirPath === '/' ? '/' + f : dirPath + '/' + f;
          let isDir = dirExists(childPath, state) || dirExists(f, state);
          const isNew = !!sim.fs.createdFiles[f];
          const perms = isDir ? 'drwxr-xr-x' : (f.startsWith('.') ? '-rw-------' : '-rw-r--r--');
          const linkCount = isDir ? '2' : '1';
          const owner = f === 'shadow' ? 'root    ' : 'classified';
          const size = String(getFileSizeUtil(f, state, isDir)).padStart(6);
          const date = isNew ? formatFileDate(sim.fs.createdFiles[f].createdAt) : 'Mar 24 09:12';
          const color = isDir ? 'about-tech-line' : (isNew ? 'about-text' : (f.startsWith('.') ? 'about-access' : 'about-text'));
          term.addLine(`${perms}  ${linkCount} ${owner} ${owner} ${size} ${date} ${f}`, color);
        }
      } else {
        // Short format (just names)
        if (showAll) {
          // -a without -l: show . and .. plus all entries
          term.addLine('.', 'about-text');
          term.addLine('..', 'about-text');
          for (const f of entries) term.addLine(f, 'about-text');
        } else {
          for (const f of entries) term.addLine(f, 'about-text');
        }
      }
    },
  },

  // ══════════════════════════════════════
  // CAT variations
  // ══════════════════════════════════════

  {
    match: cmd => cmd === 'cat readme.md' || cmd === 'cat README.md',
    handler: async (cmd, { term }) => {
      term.addLine('', 'blank');
      term.addLine('# STOP THE CODE', 'about-heading');
      term.addLine('Don\'t let the dangerous commands execute.', 'about-text');
      term.addLine('Press Ctrl+C. Save prod. Be a hero.', 'about-text');
      term.addLine('Or don\'t. We\'re not your manager.', 'about-text');
      term.addLine('', 'blank');
    },
  },

  {
    match: 'cat secrets.enc',
    handler: async (cmd, { term, sleep }) => {
      term.addLine('', 'blank');
      await term.typeLine('Decrypting...', 'about-access', 15);
      await sleep(400);
      for (let i = 0; i < 4; i++) {
        const hex = Array.from({length: 20}, () =>
          Math.floor(Math.random()*256).toString(16).padStart(2,'0')
        ).join('');
        term.addLine(hex, 'about-hex');
        await sleep(100);
      }
      await sleep(300);
      term.addLine('', 'blank');
      term.addLine('ERROR: Insufficient clearance level.', 'danger-text');
      term.addLine('Nice try though.', 'about-text');
      term.addLine('', 'blank');
    },
  },

  {
    match: 'cat team.dat',
    handler: async (cmd, { term }) => {
      term.addLine('', 'blank');
      term.addLine('[BINARY DATA]', 'about-hex');
      term.addLine('Just kidding. Try "team" instead.', 'about-text');
      term.addLine('', 'blank');
    },
  },

  {
    match: 'cat about.classified',
    handler: async (cmd, { term }) => {
      term.addLine('', 'blank');
      term.addLine('ACCESS DENIED: File is currently being', 'danger-text');
      term.addLine('displayed in this terminal.', 'about-text');
      term.addLine('How meta.', 'about-text');
      term.addLine('', 'blank');
    },
  },

  {
    match: 'cat /etc/passwd',
    handler: async (cmd, { term, sleep }) => {
      term.addLine('', 'blank');
      const users = [
        'root:x:0:0:root:/root:/bin/bash',
        'www-data:x:33:33:www-data:/var/www:/usr/sbin/nologin',
        'postgres:x:108:113:PostgreSQL administrator:/var/lib/postgresql:/bin/bash',
        'redis:x:109:114::/var/lib/redis:/usr/sbin/nologin',
        'node:x:1000:1000:Node.js:/home/node:/bin/bash',
        'classified:x:1337:1337:CLASSIFIED:/home/classified:/bin/bash',
        'ghost:x:31337:31337:???:/dev/null:/bin/false',
      ];
      for (const u of users) {
        term.addLine(u, 'about-text');
        await sleep(40);
      }
      term.addLine('', 'blank');
    },
  },

  {
    match: 'cat /etc/shadow',
    handler: async (cmd, { term }) => {
      term.addLine('', 'blank');
      term.addLine('root:$6$rounds=656000$HA$h3d...::::', 'about-text');
      term.addLine('classified:$6$rounds=656000$V3Ry$S3cR3t...::::', 'about-text');
      term.addLine('ghost:$6$rounds=656000$Wh0$Am1...::::', 'about-text');
      term.addLine('', 'blank');
      term.addLine('Wait, you shouldn\'t be able to see this.', 'about-access-warn');
      term.addLine('...unless you\'re root. Which you are. Hmm.', 'about-text');
      term.addLine('', 'blank');
    },
  },

  {
    match: 'cat /etc/hosts',
    handler: async (cmd, { term, state }) => {
      term.addLine('127.0.0.1       localhost', 'about-text');
      term.addLine('10.0.42.1       pshell.internal', 'about-text');
      const containers = state.sim.docker.containers;
      if (containers['postgres']) term.addLine(`${containers['postgres'].ip}       db.internal`, 'about-text');
      if (containers['redis']) term.addLine(`${containers['redis'].ip}       cache.internal`, 'about-text');
      term.addLine('0.0.0.0         social-media.com    # focus mode', 'about-text');
      term.addLine('0.0.0.0         reddit.com          # seriously', 'about-text');
      term.addLine('0.0.0.0         youtube.com         # stop it', 'about-text');
    },
  },

  {
    match: 'cat /etc/motd',
    handler: async (cmd, { term }) => {
      term.addLine('', 'blank');
      term.addLine('\u2554\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2557', 'about-divider');
      term.addLine('\u2551  Welcome to PShell Classified Box    \u2551', 'about-heading');
      term.addLine('\u2551                                      \u2551', 'about-divider');
      term.addLine('\u2551  Rule 1: Don\'t talk about prod       \u2551', 'about-text');
      term.addLine('\u2551  Rule 2: DON\'T talk about prod       \u2551', 'about-text');
      term.addLine('\u2551  Rule 3: If something breaks,        \u2551', 'about-text');
      term.addLine('\u2551          see rules 1 and 2            \u2551', 'about-text');
      term.addLine('\u255A\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u255D', 'about-divider');
      term.addLine('', 'blank');
    },
  },

  {
    match: 'cat /proc/cpuinfo',
    handler: async (cmd, { term }) => {
      term.addLine('processor\t: 0', 'about-text');
      term.addLine('model name\t: PShell Classified Processor', 'about-text');
      term.addLine('cpu MHz\t\t: 4200.420', 'about-text');
      term.addLine('cache size\t: 69420 KB', 'about-text');
      term.addLine('bogomips\t: 8400.84', 'about-text');
      term.addLine('flags\t\t: fpu vme de pse msc vibes coffee', 'about-text');
    },
  },

  {
    match: 'cat /proc/version',
    handler: async (cmd, { term }) => {
      term.addLine('PShell OS version 2.0.0 (classified@pshell) (gcc v13.37) #42 SMP PREEMPT', 'about-text');
    },
  },

  {
    match: 'cat /proc/uptime',
    handler: async (cmd, { term, state }) => {
      const secs = Math.floor((Date.now() - (state.sim.startedAt || Date.now())) / 1000);
      const idle = Math.floor(secs * 0.8);
      term.addLine(`${secs}.42 ${idle}.69`, 'about-text');
    },
  },

  {
    match: 'cat /proc/loadavg',
    handler: async (cmd, { term }) => {
      term.addLine('0.42 0.69 1.337 3/142 31337', 'about-text');
    },
  },

  {
    match: cmd => cmd === 'cat /root/do_not_read.txt' || cmd === 'cat /root/DO_NOT_READ.txt',
    handler: async (cmd, { term, sleep }) => {
      term.addLine('', 'blank');
      await term.typeLine('Reading forbidden file...', 'about-access', 10);
      await sleep(300);
      term.addLine('', 'blank');
      term.addLine('Dear future sysadmin,', 'about-text');
      term.addLine('', 'blank');
      term.addLine('If you\'re reading this, I\'ve already left.', 'about-text');
      term.addLine('The servers are yours now.', 'about-text');
      term.addLine('The password to the production database is', 'about-text');
      term.addLine('written on a sticky note under the\u2014 wait,', 'about-text');
      term.addLine('no, I shouldn\'t put that here.', 'about-text');
      term.addLine('', 'blank');
      term.addLine('Good luck. You\'ll need it.', 'about-text');
      term.addLine('', 'blank');
      term.addLine('\u2014 The last engineer', 'about-text');
      term.addLine('', 'blank');
    },
  },

  {
    match: cmd => cmd === 'cat .bash_history' || cmd === 'cat /home/classified/.bash_history',
    handler: async (cmd, { term, sleep }) => {
      term.addLine('', 'blank');
      const hist = [
        'ssh prod-server', 'git pull origin main', 'npm run deploy',
        'tail -f /var/log/syslog', 'sudo systemctl restart nginx',
        'echo "I should really automate this"',
        'curl -s https://api.github.com/zen',
        'history | grep "rm"   # paranoia check',
        'cat /etc/shadow       # oops wrong terminal',
        'cowsay "deploy #847, what could go wrong"',
        'sudo rm -rf /tmp/test   # definitely /tmp/test',
        'top                     # why is cpu at 100%',
        'git stash              # I\'ll come back to this',
        'git stash              # I definitely won\'t',
      ];
      for (const h of hist) {
        term.addLine(`  ${h}`, 'about-text');
        await sleep(30);
      }
      term.addLine('', 'blank');
    },
  },

  {
    match: cmd => cmd === 'cat notes.txt' || cmd === 'cat /home/classified/notes.txt',
    handler: async (cmd, { term }) => {
      term.addLine('', 'blank');
      term.addLine('TODO:', 'about-heading');
      term.addLine('- Fix that one bug (which one?)', 'about-text');
      term.addLine('- Update dependencies (scary)', 'about-text');
      term.addLine('- Write tests (lol)', 'about-text');
      term.addLine('- Document the API (double lol)', 'about-text');
      term.addLine('- Figure out what PID 31337 is', 'about-text');
      term.addLine('- Take a vacation (denied)', 'about-text');
      term.addLine('- Learn Kubernetes (in progress since 2019)', 'about-text');
      term.addLine('', 'blank');
    },
  },

  {
    match: cmd => cmd === 'cat todo.md' || cmd === 'cat /home/classified/todo.md',
    handler: async (cmd, { term }) => {
      term.addLine('', 'blank');
      term.addLine('# Sprint 47 (overdue by 12 sprints)', 'about-heading');
      term.addLine('', 'blank');
      term.addLine('- [x] Ship pshell v1.0', 'about-text');
      term.addLine('- [x] Add multi-terminal support', 'about-text');
      term.addLine('- [x] Add about CLI with 50+ commands', 'about-text');
      term.addLine('- [ ] Sleep', 'about-text');
      term.addLine('- [ ] Touch grass', 'about-text');
      term.addLine('- [ ] Close the 847 open tabs', 'about-text');
      term.addLine('', 'blank');
    },
  },

  {
    match: 'cat /tmp/.secret_note',
    handler: async (cmd, { term }) => {
      term.addLine('', 'blank');
      term.addLine('You found the secret note!', 'about-granted');
      term.addLine('', 'blank');
      term.addLine('"The password to everything is swordfish.', 'about-secret');
      term.addLine(' Just kidding. It\'s hunter2."', 'about-secret');
      term.addLine('', 'blank');
    },
  },

  {
    match: cmd => cmd === 'cat .ssh/id_rsa' || cmd === 'cat /home/classified/.ssh/id_rsa',
    handler: async (cmd, { term }) => {
      term.addLine('', 'blank');
      term.addLine('-----BEGIN OPENSSH PRIVATE KEY-----', 'about-text');
      for (let i = 0; i < 4; i++) {
        term.addLine(Array.from({length: 48}, () => 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'[Math.floor(Math.random()*64)]).join(''), 'about-hex');
      }
      term.addLine('-----END OPENSSH PRIVATE KEY-----', 'about-text');
      term.addLine('', 'blank');
      term.addLine('WHOA. You just cat\'d a private key.', 'danger-text');
      term.addLine('In real life, rotate it immediately.', 'about-text');
      term.addLine('', 'blank');
    },
  },

  // /proc/meminfo
  {
    match: 'cat /proc/meminfo',
    handler: async (cmd, { term }) => {
      term.addLine('MemTotal:       16777216 kB', 'about-text');
      term.addLine('MemFree:         4194304 kB', 'about-text');
      term.addLine('MemAvailable:   12582912 kB', 'about-text');
      term.addLine('Buffers:          524288 kB', 'about-text');
      term.addLine('Cached:          4194304 kB', 'about-text');
      term.addLine('SwapTotal:       4194304 kB', 'about-text');
      term.addLine('SwapFree:        4194304 kB', 'about-text');
    },
  },

  // /etc/resolv.conf
  {
    match: 'cat /etc/resolv.conf',
    handler: async (cmd, { term }) => {
      term.addLine('nameserver 10.0.42.1', 'about-text');
      term.addLine('nameserver 8.8.8.8', 'about-text');
      term.addLine('search pshell.internal', 'about-text');
    },
  },

  // /etc/crontab — dynamic from state
  {
    match: 'cat /etc/crontab',
    handler: async (cmd, { term, state }) => {
      term.addLine('SHELL=/bin/bash', 'about-text');
      term.addLine('PATH=/usr/local/sbin:/usr/local/bin:/sbin:/bin:/usr/sbin:/usr/bin', 'about-text');
      term.addLine('', 'blank');
      term.addLine('# m  h  dom mon dow   user    command', 'about-text');
      for (const entry of (state.sim.crontab || [])) {
        term.addLine(`${entry.schedule}     root    ${entry.command}`, 'about-text');
      }
    },
  },

  // /etc/nginx/nginx.conf
  {
    match: cmd => cmd === 'cat /etc/nginx/nginx.conf',
    handler: async (cmd, { term, state }) => {
      const containers = state.sim.docker.containers;
      const apiPort = containers['pshell-api'] ? Object.values(containers['pshell-api'].ports || {})[0]?.HostPort || '3000' : '3000';
      const lbPort = containers['leaderboard-api'] ? Object.values(containers['leaderboard-api'].ports || {})[0]?.HostPort || '3001' : '3001';

      const conf = `worker_processes auto;
events {
    worker_connections 1024;
}
http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;
    sendfile on;
    keepalive_timeout 65;
    server {
        listen 80;
        server_name pshell.internal;
        location / {
            proxy_pass http://pshell-api:${apiPort};
        }
        location /api {
            proxy_pass http://leaderboard-api:${lbPort};
        }
    }
}`;
      for (const line of conf.split('\n')) term.addLine(line, 'about-text');
    },
  },

  // /var/log/syslog
  {
    match: 'cat /var/log/syslog',
    handler: async (cmd, { term, sleep, state }) => {
      const apiProc = state.sim.processes.list.find(p => p.linkedContainer === 'pshell-api');
      const pid = apiProc ? apiProc.pid : 1337;
      const nginxPid = state.sim.services.nginx?.pid || 420;

      const logs = [
        `Mar 24 08:00:00 pshell systemd[1]: Started PShell Game Server.`,
        `Mar 24 08:00:01 pshell node[${pid}]: Server listening on port ${Object.values(state.sim.docker.containers['pshell-api']?.ports || {})[0]?.HostPort || '3000'}`,
        `Mar 24 08:00:02 pshell node[${pid}]: Database connected`,
        `Mar 24 08:00:03 pshell node[${pid}]: Redis cache warmed`,
        `Mar 24 09:15:00 pshell node[${pid}]: New player connected`,
        `Mar 24 09:15:42 pshell CRON[4242]: (root) CMD (test -x /usr/sbin/anacron)`,
        `Mar 24 09:15:43 pshell nginx[${nginxPid}]: 10.0.1.50 - GET /api/users 200 12ms`,
        `Mar 24 09:15:44 pshell kernel: [42069.123] CPU thermal warning cleared`,
      ];
      for (const l of logs) { term.addLine(l, 'about-text'); await sleep(20); }
    },
  },

  // /var/log/auth.log
  {
    match: 'cat /var/log/auth.log',
    handler: async (cmd, { term, sleep, state }) => {
      const sshdPid = state.sim.services.sshd?.pid || 42;
      const logs = [
        `Mar 24 03:00:01 pshell sshd[${sshdPid}]: Failed password for root from 10.0.0.1 port 22 ssh2`,
        `Mar 24 03:00:02 pshell sshd[${sshdPid}]: Failed password for root from 10.0.0.1 port 22 ssh2`,
        `Mar 24 03:00:03 pshell sshd[${sshdPid}]: Failed password for root from 10.0.0.1 port 22 ssh2`,
        `Mar 24 08:00:00 pshell sshd[${sshdPid}]: Accepted publickey for classified from 10.0.42.99 port 54321`,
        `Mar 24 08:00:00 pshell sshd[${sshdPid}]: pam_unix(sshd:session): session opened for user classified`,
        `Mar 24 09:15:00 pshell sudo: classified : TTY=pts/0 ; PWD=/home/classified ; COMMAND=/usr/bin/docker ps`,
      ];
      for (const l of logs) { term.addLine(l, 'about-text'); await sleep(20); }
    },
  },

  // /var/log/kern.log
  {
    match: 'cat /var/log/kern.log',
    handler: async (cmd, { term, sleep }) => {
      const logs = [
        'Mar 24 08:00:00 pshell kernel: [    0.000000] Linux version 6.1.0-pshell (classified@build)',
        'Mar 24 08:00:00 pshell kernel: [    0.042069] Command line: BOOT_IMAGE=/vmlinuz root=/dev/sda1',
        'Mar 24 08:00:00 pshell kernel: [    2.000000] Memory: 16384MB available',
        'Mar 24 09:15:00 pshell kernel: [42069.123] CPU thermal warning cleared',
        'Mar 24 09:15:01 pshell kernel: [42070.000] EXT4-fs (sda1): re-mounted. Opts: errors=remount-ro',
      ];
      for (const l of logs) { term.addLine(l, 'about-text'); await sleep(20); }
    },
  },

  // /var/log/nginx/access.log
  {
    match: cmd => cmd === 'cat /var/log/nginx/access.log',
    handler: async (cmd, { term, sleep, state }) => {
      const gateway = state.sim.docker.networks?.['pshell-network']?.gateway || '172.18.0.1';
      const logs = [
        `${gateway} - - [24/Mar/2026:09:15:01 +0000] "GET / HTTP/1.1" 200 3842`,
        `${gateway} - - [24/Mar/2026:09:15:02 +0000] "GET /api/leaderboard HTTP/1.1" 200 1024`,
        `${gateway} - - [24/Mar/2026:09:15:05 +0000] "POST /api/score HTTP/1.1" 201 64`,
        `${gateway} - - [24/Mar/2026:09:15:10 +0000] "GET /assets/main.js HTTP/1.1" 200 89210`,
        `10.0.0.1 - - [24/Mar/2026:09:15:42 +0000] "GET /admin HTTP/1.1" 403 162`,
      ];
      for (const l of logs) { term.addLine(l, 'about-text'); await sleep(20); }
    },
  },

  // /var/log/nginx/error.log
  {
    match: cmd => cmd === 'cat /var/log/nginx/error.log',
    handler: async (cmd, { term }) => {
      term.addLine('[warn] 1024 worker_connections are not enough', 'about-text');
      term.addLine('[error] connect() failed (111: Connection refused) while connecting to upstream', 'about-text');
    },
  },

  // /tmp/debug.log
  {
    match: 'cat /tmp/debug.log',
    handler: async (cmd, { term }) => {
      term.addLine('[DEBUG] 2026-03-24T09:15:00Z Game engine initialized', 'about-text');
      term.addLine('[DEBUG] 2026-03-24T09:15:01Z Loaded 250+ commands', 'about-text');
      term.addLine('[DEBUG] 2026-03-24T09:15:02Z State machine ready', 'about-text');
      term.addLine('[WARN]  2026-03-24T09:15:42Z Player missed rm -rf /', 'about-text');
    },
  },

  // .ssh/id_rsa.pub
  {
    match: cmd => cmd === 'cat .ssh/id_rsa.pub' || cmd === 'cat /home/classified/.ssh/id_rsa.pub',
    handler: async (cmd, { term }) => {
      term.addLine('ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIBmF3k9r4bVqPmKTaJKx0yvF3QRd8G7tZ5v3xYqB9zKf classified@pshell', 'about-text');
    },
  },

  // .ssh/known_hosts
  {
    match: cmd => cmd === 'cat .ssh/known_hosts' || cmd === 'cat /home/classified/.ssh/known_hosts',
    handler: async (cmd, { term }) => {
      term.addLine('pshell.internal,10.0.42.1 ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIKx...', 'about-text');
      term.addLine('github.com,140.82.121.4 ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIOMqqnkVzrm...', 'about-text');
      term.addLine('db.internal,10.0.42.2 ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIPqR...', 'about-text');
    },
  },

  // .ssh/authorized_keys
  {
    match: cmd => cmd === 'cat .ssh/authorized_keys' || cmd === 'cat /home/classified/.ssh/authorized_keys',
    handler: async (cmd, { term }) => {
      term.addLine('ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIBmF3k9r4bVqPmKTaJKx0yvF3QRd8G7tZ5v3xYqB9zKf classified@pshell', 'about-text');
      term.addLine('ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABgQC... deployer@ci-cd', 'about-text');
    },
  },

  // Generic cat (catch-all, MUST be last cat)
  {
    meta: { name: 'cat <file>', desc: 'Read file contents', category: 'file' },
    match: cmd => cmd === 'cat' || cmd.startsWith('cat '),
    handler: async (cmd, { term, rawCmd, state, stdin }) => {
      const { args } = parseCommand(rawCmd || cmd);
      const file = args[0] || '';

      // If no file arg and stdin available (pipe), output stdin
      if (!file && stdin) {
        for (const line of stdin.split('\n')) {
          term.addLine(line, 'about-text');
        }
        return;
      }
      if (!file) {
        // Real cat with no args reads from stdin; since we can't wait, just return silently
        return;
      }

      const content = readFile(file, state);
      if (content !== null) {
        const lines = content.split('\n');
        // Don't output trailing empty string from files ending with \n
        if (lines.length > 0 && lines[lines.length - 1] === '') lines.pop();
        for (const line of lines) {
          term.addLine(line, 'about-text');
        }
        if (state.sim) {
          state.sim.filesRead.add(file);
          if (state.sim.filesRead.size >= 5 && window._unlockAchievement) window._unlockAchievement('file_explorer');
        }
      } else {
        term.addLine(`cat: ${file}: No such file or directory`, 'about-text');
      }
    },
  },

  // ══════════════════════════════════════
  // echo redirect (> and >>)
  // ══════════════════════════════════════

  {
    // echo "text" > file or echo "text" >> file
    meta: { name: 'echo "x" > file', desc: 'Write/append to file', category: 'file' },
    match: cmd => cmd.startsWith('echo ') && (cmd.includes(' >> ') || cmd.includes(' > ')) && !cmd.includes('/etc/') && !cmd.includes('/var/') && !cmd.includes('/proc/') && !cmd.includes('/dev/') && !cmd.includes('/sys/') && !cmd.includes('/boot/') && !cmd.includes('/root/'),
    handler: async (cmd, { term, state, rawCmd }) => {
      const raw = rawCmd || cmd;
      const isAppend = raw.includes(' >> ');
      const parts = raw.split(isAppend ? / >> / : / > /);
      const content = parts[0].slice(5).replace(/^["']|["']$/g, '').trim()
        .replace(/\\\\"/g, '"').replace(/\\n/g, '\n').replace(/\\\\n/g, '\n').replace(/\\t/g, '\t').replace(/\\\\t/g, '\t').replace(/\\r/g, '\r');
      const file = parts[1]?.trim().replace(/^["']|["']$/g, '');
      if (!file) {
        term.addLine(content, 'about-text');
        return;
      }
      if (state.cwd === '/home/classified' || state.cwd.startsWith('/home/classified/') || state.cwd === '/tmp') {
        // Real echo adds trailing newline (unless -n flag)
        const withNewline = content + '\n';
        if (isAppend) {
          appendFile(file, withNewline, state);
        } else {
          writeFile(file, withNewline, state);
        }
      } else {
        term.addLine(`-bash: ${file}: Read-only file system`, 'about-text');
      }
    },
  },
  // Echo to protected paths (must come before plain echo)
  {
    match: cmd => cmd.startsWith('echo ') && (cmd.includes(' > ') || cmd.includes(' >> ')) && (cmd.includes('/etc/') || cmd.includes('/var/') || cmd.includes('/proc/') || cmd.includes('/dev/') || cmd.includes('/sys/') || cmd.includes('/boot/') || cmd.includes('/root/')),
    handler: async (cmd, { term, rawCmd }) => {
      const raw = rawCmd || cmd;
      const parts = raw.split(raw.includes(' >> ') ? / >> / : / > /);
      const file = parts[1]?.trim().replace(/^["']|["']$/g, '') || '';
      term.addLine(`-bash: ${file}: Read-only file system`, 'about-text');
    },
  },
  {
    match: cmd => cmd === 'echo' || cmd.startsWith('echo '),
    handler: async (cmd, { term, rawCmd }) => {
      const raw = rawCmd || cmd;
      // Find "echo " in rawCmd case-insensitively
      const echoIdx = raw.toLowerCase().indexOf('echo ');
      const msg = echoIdx !== -1 ? raw.slice(echoIdx + 5) : '';
      // Strip quote characters (single and double) respecting nesting
      let result = '';
      let inSingle = false, inDouble = false;
      for (let i = 0; i < msg.length; i++) {
        const ch = msg[i];
        if (ch === "'" && !inDouble) { inSingle = !inSingle; continue; }
        if (ch === '"' && !inSingle) { inDouble = !inDouble; continue; }
        result += ch;
      }
      term.addLine(result, 'about-text');
    },
  },

  // ══════════════════════════════════════
  // FILE OPS: touch, mkdir, rm (non -rf), mv, cp
  // ══════════════════════════════════════

  {
    meta: { name: 'touch <file>', desc: 'Create empty file', category: 'file' },
    match: cmd => cmd.startsWith('touch '),
    handler: async (cmd, { term, state, rawCmd }) => {
      const { args } = parseCommand(rawCmd || cmd);
      const file = args[0] || '';
      if (state.cwd === '/home/classified' || state.cwd.startsWith('/home/classified/') || state.cwd === '/tmp') {
        writeFile(file, '', state);
      } else {
        term.addLine(`touch: cannot touch '${file}': Read-only file system`, 'about-text');
      }
    },
  },

  {
    meta: { name: 'mkdir <dir>', desc: 'Create directory', category: 'file' },
    match: cmd => cmd.startsWith('mkdir '),
    handler: async (cmd, { term, state, rawCmd }) => {
      const { args } = parseCommand(rawCmd || cmd);
      const dir = args[0] || '';
      if (state.cwd === '/home/classified' || state.cwd.startsWith('/home/classified/') || state.cwd === '/tmp') {
        const fullPath = state.cwd === '/' ? '/' + dir : state.cwd + '/' + dir;
        if (dirExists(fullPath, state)) {
          term.addLine(`mkdir: cannot create directory '${dir}': File exists`, 'about-text');
          return;
        }
        createDir(dir, fullPath, state);
      } else {
        term.addLine(`mkdir: cannot create directory '${dir}': Read-only file system`, 'about-text');
      }
    },
  },

  {
    meta: { name: 'rm <file>', desc: 'Delete user-created file', category: 'file' },
    match: cmd => cmd.startsWith('rm ') && !cmd.includes('-rf'),
    handler: async (cmd, { term, state }) => {
      const { args } = parseCommand(cmd);
      const target = args[0] || '';
      if (target === '-rf') {
        term.addLine('rm: missing operand. rm -rf WHAT?', 'about-text');
        term.addLine('The suspense is killing me.', 'about-text');
      } else if (fileExists(target, state)) {
        deleteFile(target, state);
        term.addLine(`removed '${target}'`, 'about-text');
      } else {
        term.addLine(`rm: cannot remove '${target}': Read-only file system`, 'about-text');
      }
    },
  },

  {
    match: cmd => cmd.startsWith('mv '),
    handler: async (cmd, { term, rawCmd }) => {
      const { args } = parseCommand(rawCmd || cmd);
      if (args.length < 2) {
        term.addLine('mv: missing file operand', 'about-text');
      } else {
        term.addLine(`mv: cannot move '${args[0]}' to '${args[1]}': Read-only file system`, 'about-text');
      }
    },
  },

  {
    match: cmd => cmd.startsWith('cp '),
    handler: async (cmd, { term, rawCmd }) => {
      const { args } = parseCommand(rawCmd || cmd);
      if (args.length < 2) {
        term.addLine('cp: missing file operand', 'about-text');
      } else {
        term.addLine(`cp: cannot create regular file '${args[1]}': Read-only file system`, 'about-text');
      }
    },
  },

  // ══════════════════════════════════════
  // GREP / FIND / TAIL / HEAD
  // ══════════════════════════════════════

  {
    meta: { name: 'grep <pat> [file]', desc: 'Search text (supports pipes)', category: 'file' },
    match: cmd => cmd.startsWith('grep ') || cmd === 'grep',
    handler: async (cmd, { term, state, rawCmd, stdin }) => {
      const { flags, args } = parseCommand(rawCmd || cmd);
      const pattern = args[0] || '';
      const file = args[1] || null;

      // If stdin is provided and no file argument, filter stdin lines
      if (stdin && pattern && !file) {
        const lines = stdin.split('\n');
        const caseInsensitive = !!flags.i;
        let regex;
        try {
          regex = new RegExp(pattern, caseInsensitive ? 'i' : '');
        } catch {
          term.addLine(`grep: Invalid regular expression '${pattern}'`, 'about-text');
          return;
        }
        const matches = lines.filter(l => regex.test(l));
        if (flags.c) {
          term.addLine(String(matches.length), 'about-text');
        } else {
          for (const m of matches) term.addLine(m, 'about-text');
        }
        return;
      }

      // If a file is specified, search its actual content
      if (file && pattern) {
        const content = readFile(file, state);
        if (content === null) {
          term.addLine(`grep: ${file}: No such file or directory`, 'about-text');
          return;
        }

        const lines = content.split('\n');
        const caseInsensitive = !!flags.i;
        let regex;
        try {
          regex = new RegExp(pattern, caseInsensitive ? 'i' : '');
        } catch {
          term.addLine(`grep: Invalid regular expression '${pattern}'`, 'about-text');
          return;
        }

        const matches = [];
        for (let i = 0; i < lines.length; i++) {
          if (regex.test(lines[i])) {
            matches.push({ num: i + 1, text: lines[i] });
          }
        }

        if (flags.c) {
          // -c: count only
          term.addLine(String(matches.length), 'about-text');
        } else if (matches.length > 0) {
          const showLineNums = flags.n || false;
          for (const m of matches) {
            const prefix = showLineNums ? `${m.num}:` : '';
            term.addLine(`${prefix}${m.text}`, 'about-text');
          }
        }
      } else if (pattern && !file) {
        // Fallback: old keyword-based behavior when no file specified
        if (pattern === 'password' || pattern === 'secret') {
          term.addLine('auth.log:Failed password for root from 10.0.0.1', 'about-text');
          term.addLine('auth.log:Failed password for root from 10.0.0.1', 'about-text');
          term.addLine('auth.log:Failed password for root from 10.0.0.1', 'about-text');
          term.addLine('.bash_history:cat /etc/shadow # oops wrong terminal', 'about-text');
          term.addLine('', 'blank');
          term.addLine('Someone\'s been brute-forcing root. 3 failed attempts.', 'about-access-warn');
        } else if (pattern === 'error' || pattern === 'ERROR') {
          term.addLine('syslog:Mar 24 03:00:01 ERROR disk usage at 92%', 'about-text');
          term.addLine('nginx/error.log:connect() failed (111: Connection refused)', 'about-text');
          term.addLine('kern.log:ERROR: thermal throttling activated', 'about-text');
        } else if (pattern === 'todo' || pattern === 'TODO' || pattern === 'FIXME') {
          term.addLine('engine.js:42:  // TODO: fix this later', 'about-text');
          term.addLine('engine.js:69:  // FIXME: this is a hack', 'about-text');
          term.addLine('engine.js:420: // TODO: remove before prod (left it in)', 'about-text');
        }
        // No output for unrecognized patterns (real grep behavior)
      } else {
        term.addLine('Usage: grep <pattern> [file]', 'about-text');
      }
    },
  },

  {
    meta: { name: 'find <pattern>', desc: 'Find files', category: 'file' },
    match: cmd => cmd.startsWith('find '),
    handler: async (cmd, { term, state, rawCmd }) => {
      const raw = rawCmd || cmd;
      const { args } = parseCommand(raw);

      // Parse: find <path> -name <pattern> OR find <path> -name <pattern> -type f/d
      let searchPath = args[0] || '.';
      let namePattern = null;

      for (let i = 0; i < args.length; i++) {
        if (args[i] === '-name' && args[i + 1]) {
          namePattern = args[i + 1];
          break;
        }
      }

      // Resolve search path
      if (searchPath === '.') searchPath = state.cwd;
      else if (!searchPath.startsWith('/')) searchPath = resolvePath(state.cwd, searchPath, FS);

      // Convert glob pattern to regex
      let regex = null;
      if (namePattern) {
        const escaped = namePattern.replace(/[.+^${}()|[\]\\]/g, '\\$&');
        const pattern = escaped.replace(/\*/g, '.*').replace(/\?/g, '.');
        regex = new RegExp('^' + pattern + '$');
      }

      // Recursively walk the filesystem
      const results = [];

      function walk(dirPath) {
        const entries = FS[dirPath] || [];
        for (const entry of entries) {
          const fullPath = dirPath === '/' ? '/' + entry : dirPath + '/' + entry;
          // Check if it matches the pattern
          if (!regex || regex.test(entry)) {
            results.push(fullPath);
          }
          // Recurse into subdirectories
          if (FS[fullPath]) {
            walk(fullPath);
          }
        }
      }

      walk(searchPath);

      // Also check user-created files
      for (const fileName of Object.keys(state.sim.fs.createdFiles)) {
        if (!regex || regex.test(fileName)) {
          const filePath = state.cwd + '/' + fileName;
          results.push(filePath);
        }
      }

      // Also check user-created directories
      for (const dirName of state.sim.fs.createdDirs) {
        if (!regex || regex.test(dirName)) {
          results.push(dirName);
        }
      }

      // Output results with ./ prefix relative to search path
      if (results.length === 0 && namePattern) {
        // Real find produces no output when nothing matches (silent)
        return;
      }

      for (const r of results) {
        // Make path relative to search path
        let display = r;
        if (searchPath === '/' || searchPath === state.cwd) {
          display = '.' + r;
          if (searchPath !== '/') {
            display = './' + r.slice(searchPath.length + 1);
          }
        }
        term.addLine(display, 'about-text');
      }

      // If no -name pattern, just show the directory tree (truncated for large dirs)
      if (!namePattern && results.length === 0) {
        // Walk and show everything from search path
        function walkAll(dirPath) {
          const entries = FS[dirPath] || [];
          for (const entry of entries) {
            const fullPath = dirPath === '/' ? '/' + entry : dirPath + '/' + entry;
            const rel = searchPath === '/' ? '.' + fullPath : './' + fullPath.slice(searchPath.length + 1);
            term.addLine(rel, 'about-text');
            if (FS[fullPath]) walkAll(fullPath);
          }
        }
        const rel = searchPath === state.cwd ? '.' : searchPath;
        term.addLine(rel, 'about-text');
        walkAll(searchPath);
      }
    },
  },

  {
    meta: { name: 'head [file]', desc: 'First lines of file/pipe', category: 'file' },
    match: cmd => cmd.startsWith('tail ') || cmd.startsWith('head ') || cmd === 'tail' || cmd === 'head',
    handler: async (cmd, { term, sleep, stdin, rawCmd }) => {
      const isHead = cmd.startsWith('head');
      const { flags, args } = parseCommand(rawCmd || cmd);

      // Parse -n flag: head -n 5 or tail -n 3 (parseCommand treats -n as flag, value is next arg)
      let n = 10; // default
      if (flags.n === true && args.length > 0 && /^\d+$/.test(args[0])) {
        n = parseInt(args[0], 10);
        args.shift();
      } else if (typeof flags.n === 'string' && /^\d+$/.test(flags.n)) {
        n = parseInt(flags.n, 10);
      }

      // If stdin is provided, take first/last N lines from stdin
      if (stdin) {
        const lines = stdin.split('\n');
        const selected = isHead ? lines.slice(0, n) : lines.slice(-n);
        for (const l of selected) term.addLine(l, 'about-text');
        return;
      }

      if (cmd.includes('syslog') || cmd.includes('access.log') || cmd.includes('error.log')) {
        const logLines = [
          'Mar 24 09:15:01 stc CRON[4242]: (root) CMD (test -x /usr/sbin/anacron)',
          'Mar 24 09:15:02 stc nginx[420]: 10.0.1.50 - GET /api/users 200 12ms',
          'Mar 24 09:15:03 stc node[1337]: [info] Leaderboard updated: 42 entries',
          'Mar 24 09:15:04 stc kernel: [42069.123] CPU thermal warning cleared',
          'Mar 24 09:15:05 stc sshd[9999]: Accepted key for classified from 10.0.42.99',
        ];
        for (const l of logLines) { term.addLine(l, 'about-text'); await sleep(40); }
      } else {
        const cmdName = isHead ? 'head' : 'tail';
        const fileName = args[0] || '';
        term.addLine(`${cmdName}: cannot open '${fileName}' for reading: No such file or directory`, 'about-text');
      }
    },
  },

  // ══════════════════════════════════════
  // WC (word count)
  // ══════════════════════════════════════

  {
    meta: { name: 'wc [file]', desc: 'Count lines/words/chars', category: 'file' },
    match: cmd => cmd.startsWith('wc ') || cmd === 'wc',
    handler: async (cmd, { term, state, rawCmd, stdin }) => {
      const { flags, args } = parseCommand(rawCmd || cmd);
      const file = args[0] || '';

      // If stdin is provided and no file argument, count stdin
      let content = null;
      let label = '';
      if (stdin && !file) {
        content = stdin;
        label = '';
      } else if (file) {
        content = readFile(file, state);
        label = file;
        if (content === null) {
          term.addLine(`wc: ${file}: No such file or directory`, 'about-text');
          return;
        }
      } else {
        term.addLine('wc: missing file operand', 'about-text');
        return;
      }

      // Real wc -l counts newline characters only
      const lines = (content.match(/\n/g) || []).length;
      const words = content === '' ? 0 : content.split(/\s+/).filter(Boolean).length;
      const chars = content.length;
      const suffix = label ? ` ${label}` : '';

      if (flags.l && !flags.w && !flags.c) {
        term.addLine(`${String(lines).padStart(8)}${suffix}`, 'about-text');
      } else if (flags.w && !flags.l && !flags.c) {
        term.addLine(`${String(words).padStart(8)}${suffix}`, 'about-text');
      } else if (flags.c && !flags.l && !flags.w) {
        term.addLine(`${String(chars).padStart(8)}${suffix}`, 'about-text');
      } else {
        term.addLine(`${String(lines).padStart(8)}${String(words).padStart(8)}${String(chars).padStart(8)}${suffix}`, 'about-text');
      }
    },
  },

  // ══════════════════════════════════════
  // PWD
  // ══════════════════════════════════════

  {
    meta: { name: 'pwd', desc: 'Current directory', category: 'file' },
    match: 'pwd',
    handler: async (cmd, { term, state }) => {
      term.addLine(state.cwd, 'about-text');
    },
  },

  // ══════════════════════════════════════
  // SORT (pipe support)
  // ══════════════════════════════════════

  {
    meta: { name: 'download <file>', desc: 'Download file to your computer', category: 'file' },
    match: cmd => cmd.startsWith('download '),
    handler: async (cmd, { term, state, rawCmd }) => {
      const file = (rawCmd || cmd).slice(9).trim();
      if (!file) { term.addLine('Usage: download <filename>', 'about-text'); return; }
      const content = readFile(file, state);
      if (content === null) {
        term.addLine(`download: ${file}: No such file`, 'about-text');
        return;
      }
      try {
        const blob = new Blob([content], { type: 'application/octet-stream' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = file;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        term.addLine(`Downloaded: ${file} (${content.length} bytes)`, 'about-text');
      } catch (e) {
        term.addLine(`download: failed — ${e.message}`, 'danger-text');
      }
    },
  },

  {
    meta: { name: 'sort', desc: 'Sort lines (pipe)', category: 'file' },
    match: 'sort',
    handler: async (cmd, { term, stdin }) => {
      if (!stdin) return; // Real sort reads stdin, just return silently
      const lines = stdin.split('\n').sort();
      for (const line of lines) term.addLine(line, 'about-text');
    },
  },

  // ══════════════════════════════════════
  // UNIQ (pipe support)
  // ══════════════════════════════════════

  {
    meta: { name: 'uniq', desc: 'Remove duplicate lines (pipe)', category: 'file' },
    match: 'uniq',
    handler: async (cmd, { term, stdin }) => {
      if (!stdin) return; // Real uniq reads stdin, just return silently
      let prev = null;
      for (const line of stdin.split('\n')) {
        if (line !== prev) { term.addLine(line, 'about-text'); prev = line; }
      }
    },
  },

];
