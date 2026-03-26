import { formatUptime } from '../state/simulation-state.js';
import { parseCommand } from './parse.js';
import { stateEvents } from '../state/events.js';

export const systemCommands = [

  // ══════════════════════════════════════
  // EXIT / CLEAR
  // ══════════════════════════════════════

  {
    meta: { name: 'exit', desc: 'Disconnect terminal', category: 'system' },
    match: cmd => cmd === 'exit' || cmd === 'quit' || cmd === 'logout',
    handler: async (cmd, { term, sleep, win, unregisterWindow, isMainTerminal }) => {
      if (isMainTerminal) {
        term.addLine('You can\'t escape. This terminal is your life now.', 'about-text');
        term.addLine('Type "help" for commands, or "play" to start the game.', 'about-access');
        return;
      }
      await term.typeLine('Disconnecting...', 'about-access', 15);
      await sleep(300);
      await term.typeLine('Connection closed.', 'about-access', 12);
      await sleep(500);
      unregisterWindow(win);
      win.remove();
    },
  },

  {
    meta: { name: 'clear', desc: 'Clear terminal', category: 'system' },
    match: 'clear',
    handler: async (cmd, { term }) => {
      term.clear();
    },
  },

  // ══════════════════════════════════════
  // SYSTEM INFO
  // ══════════════════════════════════════

  {
    meta: { name: 'whoami', desc: 'Current user', category: 'system' },
    match: 'whoami',
    handler: async (cmd, { term }) => {
      term.addLine('root', 'about-text');
    },
  },

  {
    match: 'pwd',
    handler: async (cmd, { term, state }) => {
      term.addLine(state.cwd, 'about-text');
    },
  },

  {
    meta: { name: 'uptime', desc: 'System uptime', category: 'system' },
    match: 'uptime',
    handler: async (cmd, { term, state }) => {
      const diff = Date.now() - (state.sim?.startedAt || Date.now());
      const days = Math.floor(diff / 86400000);
      const hours = Math.floor((diff % 86400000) / 3600000);
      const mins = Math.floor((diff % 3600000) / 60000);
      const upStr = days > 0 ? `${days} day${days !== 1 ? 's' : ''}, ${hours}:${String(mins).padStart(2, '0')}` : `${hours}:${String(mins).padStart(2, '0')}`;
      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`;
      term.addLine(` ${timeStr} up ${upStr},  1 user,  load average: 0.42, 0.69, 1.34`, 'about-text');
    },
  },

  {
    meta: { name: 'neofetch', desc: 'System info with ASCII art', category: 'system' },
    match: 'neofetch',
    handler: async (cmd, { term, state }) => {
      const diff = Date.now() - (state.sim?.startedAt || Date.now());
      const days = Math.floor(diff / 86400000);
      const hours = Math.floor((diff % 86400000) / 3600000);
      const mins = Math.floor((diff % 3600000) / 60000);
      const upStr = days > 0 ? `${days} days, ${hours}h ${mins}m` : `${hours}h ${mins}m`;
      term.addLine('', 'blank');
      const lines = [
        ['        .---.        ', 'classified@pshell.internal'],
        ['       /     \\       ', '\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500'],
        ['      |  >_  |      ', `OS: PShell OS v2.0`],
        ['      |       |      ', `Host: Your Browser`],
        ['       \\     /       ', `Kernel: Vanilla JS`],
        ['        \'---\'        ', `Shell: classified-bash`],
        ['       PShell        ', `Terminal: about://pshell`],
        ['                     ', `CPU: ${navigator.hardwareConcurrency || '?'} cores`],
        ['                     ', `Memory: ${Math.round(performance?.memory?.usedJSHeapSize/1024/1024 || 42)}MB / unlimited`],
        ['                     ', `Uptime: ${upStr}`],
        ['                     ', `Theme: Matrix Green on Black`],
      ];
      for (const [art, info] of lines) {
        const el = term.addLine(`${art} ${info}`, 'about-text');
        if (el && el.innerHTML !== undefined) {
          el.innerHTML = `<span style="color:var(--term-green)">${term._escapeHtml(art)}</span> ${term._escapeHtml(info)}`;
          el.style.textAlign = 'left';
          el.style.whiteSpace = 'pre';
        }
      }
      term.addLine('', 'blank');
    },
  },

  {
    meta: { name: 'date', desc: 'Current date/time', category: 'system' },
    match: 'date',
    handler: async (cmd, { term }) => {
      term.addLine(new Date().toString(), 'about-text');
    },
  },

  {
    match: 'id',
    handler: async (cmd, { term }) => {
      term.addLine('uid=0(root) gid=0(root) groups=0(root),42(pshell),1337(hackers)', 'about-text');
    },
  },

  {
    match: cmd => cmd === 'uname' || cmd === 'uname -a',
    handler: async (cmd, { term }) => {
      term.addLine('PShell OS 2.0.0 classified x86_64 PShell/Claude', 'about-text');
    },
  },

  {
    match: 'hostname',
    handler: async (cmd, { term }) => {
      term.addLine('pshell-classified-001', 'about-text');
    },
  },

  {
    match: 'w',
    handler: async (cmd, { term, state }) => {
      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`;
      const diff = Date.now() - (state.sim?.startedAt || Date.now());
      const days = Math.floor(diff / 86400000);
      const hours = Math.floor((diff % 86400000) / 3600000);
      const mins = Math.floor((diff % 3600000) / 60000);
      const upStr = days > 0 ? `${days} day${days !== 1 ? 's' : ''}, ${hours}:${String(mins).padStart(2,'0')}` : `${hours}:${String(mins).padStart(2,'0')}`;

      term.addLine(` ${timeStr} up ${upStr},  1 user,  load average: 0.42, 0.69, 1.34`, 'about-text');
      term.addLine('USER     TTY      FROM             LOGIN@   IDLE   JCPU   PCPU WHAT', 'about-text');
      term.addLine(`root     pts/0    ${state.cwd === '/home/classified' ? 'your-browser' : state.cwd.padEnd(16)} ${timeStr}    0.00s  0.01s  0.00s w`, 'about-text');
    },
  },

  // ══════════════════════════════════════
  // PROCESSES
  // ══════════════════════════════════════

  {
    match: cmd => cmd === 'top' || cmd === 'htop',
    handler: async (cmd, { term, sleep, state }) => {
      const procs = state.sim.processes;
      if (procs.kernelPanic) {
        term.addLine('Kernel panic - not syncing: Attempted to kill init!', 'danger-text');
        return;
      }

      // Summary header (real top has this)
      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`;
      const diff = Date.now() - (state.sim?.startedAt || Date.now());
      const days = Math.floor(diff / 86400000);
      const hours = Math.floor((diff % 86400000) / 3600000);
      const mins = Math.floor((diff % 3600000) / 60000);
      const upStr = days > 0 ? `${days} day${days !== 1 ? 's' : ''}, ${hours}:${String(mins).padStart(2, '0')}` : `${hours}:${String(mins).padStart(2, '0')}`;
      const activeProcs = procs.list.filter(p => !procs.killedPids.has(p.pid));

      term.addLine(`top - ${timeStr} up ${upStr},  1 user,  load average: 0.42, 0.69, 1.34`, 'about-text');
      term.addLine(`Tasks: ${activeProcs.length} total,   1 running, ${activeProcs.length - 1} sleeping,   0 stopped,   0 zombie`, 'about-text');
      term.addLine('', 'blank');
      term.addLine('  PID USER      %CPU  %MEM   COMMAND', 'about-text');

      // Sort by CPU descending (like real top)
      const sorted = [...activeProcs].sort((a, b) => b.cpu - a.cpu);
      for (const p of sorted) {
        const cpu = (p.cpu + (Math.random() - 0.5) * 0.5).toFixed(1);
        term.addLine(`${String(p.pid).padStart(5)} ${p.user.padEnd(10)}${cpu.padStart(5)}  ${p.mem.toFixed(1).padStart(5)}   ${p.command}`, 'about-text');
        await sleep(20);
      }
    },
  },

  {
    meta: { name: 'ps aux', desc: 'Process list (stateful)', category: 'system' },
    match: cmd => cmd === 'ps aux' || cmd === 'ps',
    handler: async (cmd, { term, sleep, state }) => {
      const procs = state.sim.processes;
      if (procs.kernelPanic) {
        term.addLine('Kernel panic - not syncing: Attempted to kill init!', 'danger-text');
        term.addLine('(reboot to recover)', 'about-access');
        return;
      }

      if (cmd === 'ps') {
        // Bare ps: minimal output — PID TTY TIME CMD
        term.addLine('  PID TTY          TIME CMD', 'about-text');
        term.addLine(' 9999 pts/0    00:00:00 bash', 'about-text');
        term.addLine(`${String(Math.floor(Math.random() * 9000) + 10000).padStart(5)} pts/0    00:00:00 ps`, 'about-text');
        return;
      }

      // ps aux: full process list from state
      term.addLine('USER       PID  %CPU %MEM  COMMAND', 'about-text');
      for (const p of procs.list) {
        if (procs.killedPids.has(p.pid)) continue;
        const cpu = (p.cpu + (Math.random() - 0.5) * 0.5).toFixed(1);
        term.addLine(`${p.user.padEnd(10)} ${String(p.pid).padStart(5)} ${cpu.padStart(5)} ${p.mem.toFixed(1).padStart(4)}   ${p.command}`, 'about-text');
        await sleep(20);
      }
    },
  },

  // ══════════════════════════════════════
  // SYSTEM RESOURCES
  // ══════════════════════════════════════

  {
    meta: { name: 'free', desc: 'Memory usage', category: 'system' },
    match: cmd => cmd === 'free' || cmd === 'free -m',
    handler: async (cmd, { term }) => {
      term.addLine('               total        used        free      shared  buff/cache   available', 'about-text');
      term.addLine('Mem:           16384        8192        4096        1024        4096       12288', 'about-text');
      term.addLine('Swap:           4096           0        4096', 'about-text');
    },
  },

  {
    meta: { name: 'df', desc: 'Disk usage', category: 'system' },
    match: cmd => cmd === 'df' || cmd === 'df -h',
    handler: async (cmd, { term }) => {
      term.addLine('', 'blank');
      term.addLine('Filesystem      Size  Used  Avail  Use%  Mounted on', 'about-text');
      term.addLine('/dev/sda1        50G   23G    25G   48%  /', 'about-text');
      term.addLine('/dev/dreams     \u221E     42G      \u221E    0%  /home/classified', 'about-text');
      term.addLine('tmpfs/regrets    8G    8G      0   100%  /var/log/mistakes', 'about-text');
      term.addLine('', 'blank');
    },
  },

  {
    meta: { name: 'env', desc: 'Environment variables', category: 'system' },
    match: 'env',
    handler: async (cmd, { term, sleep, state }) => {
      term.addLine('', 'blank');
      const baseVars = [
        'USER=classified',
        'HOME=/home/classified',
        'SHELL=/bin/bash',
        'PATH=/usr/local/bin:/usr/bin:/bin:/sbin',
        'NODE_ENV=production',
        'PORT=3000',
        'DATABASE_URL=postgres://prod:\u2022\u2022\u2022\u2022\u2022\u2022@db.internal:5432/pshell',
        'REDIS_URL=redis://cache.internal:6379',
        'SECRET_KEY=\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022',
        'AWS_REGION=us-east-1',
        'AWS_ACCESS_KEY_ID=AKIA\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022',
        'SENTRY_DSN=https://\u2022\u2022\u2022\u2022\u2022\u2022@sentry.io/420',
        'SLACK_WEBHOOK=https://hooks.slack.com/services/\u2022\u2022\u2022\u2022\u2022\u2022',
        'VIBE=immaculate',
        'COFFEE_LEVEL=critical',
        'BUGS_IN_PROD=yes',
      ];
      for (const v of baseVars) {
        term.addLine(v, 'about-text');
        await sleep(30);
      }
      // Show user-set env vars from state
      const userEnv = state.sim.env || {};
      for (const [k, v] of Object.entries(userEnv)) {
        term.addLine(`${k}=${v}`, 'about-text');
      }
      term.addLine('', 'blank');
    },
  },

  {
    meta: { name: 'dmesg', desc: 'Kernel messages', category: 'system' },
    match: cmd => cmd === 'dmesg' || cmd === 'dmesg | tail',
    handler: async (cmd, { term, sleep }) => {
      term.addLine('', 'blank');
      const msgs = [
        '[    0.000000] Linux version 6.1.0-pshell (classified@build)',
        '[    0.042069] Command line: BOOT_IMAGE=/vmlinuz root=/dev/sda1 quiet vibes=on',
        '[    1.337000] CPU: 0 PID: 1 Comm: systemd Tainted: P          6.1.0-pshell',
        '[    2.000000] Memory: 16384MB available',
        '[    3.140000] EXT4-fs (sda1): mounted filesystem with ordered data mode',
        '[   42.000000] pshell: module loaded successfully',
        '[   42.001000] pshell: warning - developer sanity levels low',
        '[ 1337.000000] NOTICE: if you\'re reading kernel logs in a game, you might be a sysadmin',
      ];
      for (const m of msgs) { term.addLine(m, 'about-text'); await sleep(40); }
      term.addLine('', 'blank');
    },
  },

  {
    meta: { name: 'journalctl', desc: 'System journal', category: 'system' },
    match: cmd => cmd.startsWith('journalctl'),
    handler: async (cmd, { term, sleep, state }) => {
      term.addLine('', 'blank');
      const apiProc = state.sim.processes.list.find(p => p.linkedContainer === 'pshell-api');
      const apiPid = apiProc ? apiProc.pid : 1337;
      const apiContainer = state.sim.docker.containers['pshell-api'];
      const apiPort = apiContainer ? Object.values(apiContainer.ports || {})[0]?.HostPort || '3000' : '3000';
      const startDate = new Date(state.sim.startedAt || Date.now());
      const mon = startDate.toDateString().slice(4, 7);
      const day = String(startDate.getDate()).padStart(2, '0');
      const datePrefix = `${mon} ${day}`;
      const entries = [
        `${datePrefix} 08:00:00 systemd[1]: Started PShell Game Server.`,
        `${datePrefix} 08:00:01 node[${apiPid}]: Server listening on port ${apiPort}`,
        `${datePrefix} 08:00:02 node[${apiPid}]: Database connected`,
        `${datePrefix} 08:00:03 node[${apiPid}]: Redis cache warmed`,
        `${datePrefix} 08:00:04 node[${apiPid}]: Ready to judge your terminal skills`,
        `${datePrefix} 09:15:00 node[${apiPid}]: New player connected`,
        `${datePrefix} 09:15:42 node[${apiPid}]: Player failed to catch: rm -rf /`,
        `${datePrefix} 09:15:42 node[${apiPid}]: RIP production. Incident #4242 created.`,
      ];
      for (const e of entries) { term.addLine(e, 'about-text'); await sleep(40); }
      term.addLine('', 'blank');
    },
  },

  {
    match: 'last',
    handler: async (cmd, { term, state }) => {
      const startDate = new Date(state.sim.startedAt || Date.now());
      const dateStr = startDate.toDateString().slice(0, 10); // "Mon Mar 24"
      const prevDate = new Date(startDate.getTime() - 86400000);
      const prevDateStr = prevDate.toDateString().slice(0, 10);
      const year = startDate.getFullYear();
      term.addLine(`classified pts/0  your-browser  ${dateStr} 09:15  still logged in`, 'about-text');
      term.addLine(`root       pts/1  10.0.42.1     ${dateStr} 08:00  still logged in`, 'about-text');
      term.addLine(`ghost      pts/2  ???           ${dateStr} 03:00  still logged in`, 'about-text');
      term.addLine(`classified pts/0  your-browser  ${prevDateStr} 22:00 - 23:59 (01:59)`, 'about-text');
      term.addLine(`reboot     system boot   6.1.0-pshell  ${dateStr} 00:00  still running`, 'about-text');
      term.addLine('', 'blank');
      term.addLine(`wtmp begins ${dateStr} 00:00:00 ${year}`, 'about-text');
    },
  },

  {
    meta: { name: 'systemctl <action> <svc>', desc: 'Service management (stateful)', category: 'system' },
    match: cmd => cmd === 'systemctl' || cmd === 'systemctl status' || cmd.startsWith('systemctl '),
    handler: async (cmd, { term, state, rawCmd }) => {
      const { args } = parseCommand(rawCmd || cmd);
      const action = args[0] || 'status';
      const svc = args[1];
      const services = state.sim.services;

      // Bare "systemctl" or "systemctl status" without service name
      if (!svc && (action === 'status' || !args[0])) {
        term.addLine('', 'blank');
        for (const [name, s] of Object.entries(services)) {
          term.addLine(`  ${s.active ? '\u25CF' : '\u25CB'} ${name.padEnd(12)} ${s.active ? 'active' : 'inactive'}`, s.active ? 'about-text' : 'danger-text');
        }
        term.addLine('', 'blank');
        term.addLine('Usage: systemctl [start|stop|restart|status] <service>', 'about-access');
        term.addLine('', 'blank');
        return;
      }

      if (action === 'start' || action === 'stop' || action === 'restart') {
        const svcState = services[svc];
        if (!svcState) {
          term.addLine(`Failed to ${action} ${svc}.service: Unit ${svc}.service not found.`, 'about-text');
          return;
        }
        if (action === 'stop') {
          svcState.active = false;
          if (state.sim.docker.containers[svc]) {
            const c = state.sim.docker.containers[svc];
            c.status = 'exited';
            c.exitCode = 0;
            c.finishedAt = Date.now();
            c.manuallyStopped = true;
          }
          stateEvents.emit('container:stop', { name: svc, state });
          term.addLine(`${svc}.service stopped.`, 'about-text');
        } else if (action === 'start') {
          svcState.active = true;
          svcState.startedAt = Date.now();
          if (state.sim.docker.containers[svc]) {
            state.sim.docker.containers[svc].status = 'running';
            state.sim.docker.containers[svc].startedAt = Date.now();
          }
          stateEvents.emit('container:start', { name: svc, state });
          term.addLine(`${svc}.service started.`, 'about-text');
        } else {
          svcState.active = true;
          svcState.startedAt = Date.now();
          if (state.sim.docker.containers[svc]) {
            state.sim.docker.containers[svc].status = 'running';
            state.sim.docker.containers[svc].startedAt = Date.now();
          }
          stateEvents.emit('container:start', { name: svc, state });
          term.addLine(`${svc}.service restarted.`, 'about-text');
        }
        return;
      }

      // status
      const svcName = action === 'status' ? svc : action;
      const svcState = services[svcName];
      const isActive = svcState ? svcState.active : true;
      const pid = svcState ? svcState.pid : 1337;
      const tasks = svcState ? svcState.tasks : 8;
      const mem = svcState ? svcState.memory : 128;
      const startDate = svcState ? new Date(svcState.startedAt).toISOString().replace('T', ' ').slice(0, 19) : '2026-03-24 08:00:00';

      term.addLine(`\u25CF ${svcName}.service - ${svcName} service`, isActive ? 'about-text' : 'danger-text');
      term.addLine(`     Loaded: loaded (/lib/systemd/system/${svcName}.service; enabled; vendor preset: enabled)`, 'about-text');
      term.addLine(`     Active: ${isActive ? 'active (running)' : 'inactive (dead)'} since ${startDate}`, isActive ? 'about-text' : 'danger-text');
      term.addLine(`   Main PID: ${pid} (${svcName})`, 'about-text');
      term.addLine(`      Tasks: ${tasks}`, 'about-text');
      term.addLine(`     Memory: ${mem}.0M`, 'about-text');
      term.addLine(`      CGroup: /system.slice/${svcName}.service`, 'about-text');
      term.addLine(`              \u2514\u2500${pid} /usr/sbin/${svcName}`, 'about-text');
    },
  },

  {
    meta: { name: 'service <svc> <action>', desc: 'SysV service control', category: 'system' },
    match: cmd => cmd.startsWith('service '),
    handler: async (cmd, { term, state, rawCmd }) => {
      const { args } = parseCommand(rawCmd || cmd);
      const svc = args[0] || 'unknown';
      const action = args[1] || 'status';
      const svcState = state.sim.services[svc];
      if (!svcState) {
        term.addLine(`${svc}: unrecognized service`, 'about-text');
        return;
      }
      if (action === 'status') {
        term.addLine(`${svc} is ${svcState.active ? 'running' : 'stopped'}.`, svcState.active ? 'about-text' : 'danger-text');
      } else if (action === 'start' && svcState) {
        svcState.active = true;
        svcState.startedAt = Date.now();
        if (state.sim.docker.containers[svc]) {
          state.sim.docker.containers[svc].status = 'running';
          state.sim.docker.containers[svc].startedAt = Date.now();
        }
        stateEvents.emit('container:start', { name: svc, state });
        term.addLine(`${svc}: started`, 'about-text');
      } else if (action === 'stop' && svcState) {
        svcState.active = false;
        if (state.sim.docker.containers[svc]) {
          const c = state.sim.docker.containers[svc];
          c.status = 'exited';
          c.exitCode = 0;
          c.finishedAt = Date.now();
          c.manuallyStopped = true;
        }
        stateEvents.emit('container:stop', { name: svc, state });
        term.addLine(`${svc}: stopped`, 'about-text');
      } else if (action === 'restart' && svcState) {
        svcState.active = true;
        svcState.startedAt = Date.now();
        if (state.sim.docker.containers[svc]) {
          state.sim.docker.containers[svc].status = 'running';
          state.sim.docker.containers[svc].startedAt = Date.now();
        }
        stateEvents.emit('container:start', { name: svc, state });
        term.addLine(`${svc}: restarted`, 'about-text');
      } else {
        term.addLine(`${svc}: ${action} — read-only mode`, 'about-text');
      }
    },
  },

  {
    meta: { name: 'crontab -l', desc: 'List cron jobs (stateful)', category: 'system' },
    match: 'crontab -l',
    handler: async (cmd, { term, state }) => {
      const crontab = state.sim.crontab;
      term.addLine('', 'blank');
      if (crontab.length === 0) {
        term.addLine('no crontab for classified', 'about-text');
      } else {
        term.addLine('# m  h  dom mon dow   command', 'about-text');
        for (const entry of crontab) {
          term.addLine(`${entry.schedule}     ${entry.command}`, 'about-text');
        }
      }
      term.addLine('', 'blank');
    },
  },

  {
    match: 'passwd',
    handler: async (cmd, { term, sleep }) => {
      term.addLine('Changing password for classified.', 'about-text');
      await sleep(200);
      term.addLine('Current password: ********', 'about-text');
      await sleep(200);
      term.addLine('New password: ********', 'about-text');
      await sleep(200);
      term.addLine('passwd: password unchanged (read-only system)', 'about-text');
      term.addLine('Your password is still "password123".', 'about-text');
      term.addLine('Just kidding. ...or am I?', 'about-text');
    },
  },

  {
    meta: { name: 'alias name=cmd', desc: 'Create command alias', category: 'system' },
    match: cmd => cmd.startsWith('alias ') || cmd === 'alias',
    handler: async (cmd, { term, state, rawCmd }) => {
      const raw = rawCmd || cmd;
      if (raw === 'alias' || raw === 'alias ') {
        const aliases = state.sim.aliases || {};
        if (Object.keys(aliases).length === 0) {
          term.addLine('No aliases defined.', 'about-text');
        } else {
          for (const [name, val] of Object.entries(aliases)) {
            term.addLine(`alias ${name}='${val}'`, 'about-text');
          }
        }
      } else {
        const match = raw.match(/^alias\s+(\S+?)=(.+)$/);
        if (match) {
          const [, name, val] = match;
          const value = val.replace(/^["']|["']$/g, '');
          if (!state.sim.aliases) state.sim.aliases = {};
          state.sim.aliases[name] = value;
          term.addLine(`alias ${name}='${value}'`, 'about-text');
        } else {
          term.addLine('Usage: alias name=\'command\'', 'about-text');
        }
      }
    },
  },

  {
    meta: { name: 'export VAR=val', desc: 'Set environment variable', category: 'system' },
    match: cmd => cmd.startsWith('export ') || cmd === 'export',
    handler: async (cmd, { term, state, rawCmd }) => {
      const raw = rawCmd || cmd;
      if (raw === 'export' || raw === 'export ') {
        // Show all exported vars
        const env = state.sim.env || {};
        for (const [k, v] of Object.entries(env)) {
          term.addLine(`declare -x ${k}="${v}"`, 'about-text');
        }
        if (Object.keys(env).length === 0) term.addLine('No custom environment variables set.', 'about-text');
        return;
      }
      const match = raw.match(/^export\s+(\w+)=(.*)$/);
      if (match) {
        const [, key, val] = match;
        const value = val.replace(/^["']|["']$/g, ''); // strip quotes
        if (!state.sim.env) state.sim.env = {};
        state.sim.env[key] = value;
        term.addLine(`${key}=${value}`, 'about-text');
      } else {
        term.addLine('Usage: export VAR=value', 'about-text');
      }
    },
  },

  {
    match: cmd => cmd.startsWith('unset '),
    handler: async (cmd, { term, state, rawCmd }) => {
      const varName = (rawCmd || cmd).slice(6).trim();
      if (state.sim.env && state.sim.env[varName] !== undefined) {
        delete state.sim.env[varName];
        term.addLine(`Unset: ${varName}`, 'about-text');
      } else {
        term.addLine(`${varName}: not set`, 'about-text');
      }
    },
  },

  {
    match: cmd => cmd.startsWith('unalias '),
    handler: async (cmd, { term, state, rawCmd }) => {
      const name = (rawCmd || cmd).slice(8).trim();
      if (state.sim.aliases && state.sim.aliases[name] !== undefined) {
        delete state.sim.aliases[name];
        term.addLine(`Removed alias: ${name}`, 'about-text');
      } else {
        term.addLine(`unalias: ${name}: not found`, 'about-text');
      }
    },
  },

  {
    match: cmd => cmd === 'screen' || cmd === 'tmux',
    handler: async (cmd, { term }) => {
      term.addLine('', 'blank');
      term.addLine(`${cmd}: You\'re already in a terminal`, 'about-text');
      term.addLine('inside a game inside a browser.', 'about-text');
      term.addLine('How deep do you want to go?', 'about-text');
      term.addLine('', 'blank');
    },
  },

  {
    match: cmd => cmd === 'make' || cmd === 'make install',
    handler: async (cmd, { term, sleep }) => {
      term.addLine('', 'blank');
      await term.typeLine('Compiling pshell...', 'about-access', 10);
      await sleep(200);
      const files = ['engine.c', 'terminal.c', 'commands.c', 'scoring.c', 'sounds.c', 'ui.c', 'matrix.c', 'fun.c', 'tears.c'];
      for (const f of files) {
        term.addLine(`  CC    ${f}`, 'about-access');
        await sleep(60);
      }
      await sleep(100);
      term.addLine('  LD    pshell', 'about-text');
      await sleep(100);
      term.addLine('', 'blank');
      term.addLine('fun.c:42:1: warning: implicit declaration of', 'about-access-warn');
      term.addLine('  function \'sleep\' [-Wimplicit-function-declaration]', 'about-access-warn');
      term.addLine('tears.c:69:1: warning: variable \'hope\' set but', 'about-access-warn');
      term.addLine('  not used [-Wunused-variable]', 'about-access-warn');
      term.addLine('matrix.c:1:1: warning: \'reality\' may be used', 'about-access-warn');
      term.addLine('  uninitialized [-Wmaybe-uninitialized]', 'about-access-warn');
      await sleep(200);
      term.addLine('', 'blank');
      term.addLine('Build successful.', 'about-text');
      term.addLine('  9 files compiled, 0 errors, 3 warnings,', 'about-text');
      term.addLine('  infinite regrets.', 'about-text');
      term.addLine('', 'blank');
    },
  },

];
