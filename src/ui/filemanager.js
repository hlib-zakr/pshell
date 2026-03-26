import { showToast } from './notifications.js';

const FS = {
  '/': ['bin', 'etc', 'home', 'var', 'tmp', 'usr', 'dev', 'proc', 'root'],
  '/home': ['classified'],
  '/home/classified': ['about.classified', 'secrets.enc', 'team.dat', 'README.md', '.bash_history', '.ssh', 'notes.txt', 'todo.md', 'Applications'],
  '/home/classified/Applications': ['pshell.app', 'about.app', 'settings.app', 'notepad.app', 'files.app'],
  '/home/classified/.ssh': ['id_rsa', 'id_rsa.pub', 'known_hosts', 'authorized_keys'],
  '/etc': ['passwd', 'shadow', 'hosts', 'nginx', 'ssh', 'resolv.conf', 'crontab', 'motd'],
  '/etc/nginx': ['nginx.conf', 'sites-enabled', 'mime.types'],
  '/var': ['log', 'lib', 'www', 'run', 'tmp'],
  '/var/log': ['syslog', 'auth.log', 'nginx', 'kern.log', 'dmesg', 'wtmp'],
  '/var/log/nginx': ['access.log', 'error.log'],
  '/tmp': ['build-a1b2c3', 'session_expired.tmp', 'debug.log', '.secret_note'],
  '/root': ['DO_NOT_READ.txt'],
  '/proc': ['cpuinfo', 'meminfo', 'uptime', 'version', 'loadavg'],
  '/usr': ['bin', 'lib', 'share', 'local'],
  '/usr/bin': ['node', 'python3', 'bash', 'git', 'docker', 'npm', 'curl', 'ssh', 'vim', 'notepad', 'pshell'],
  '/dev': ['sda', 'sda1', 'null', 'zero', 'random', 'urandom'],
};

// File content for read-only files (shown in notepad)
const FILE_CONTENT = {
  '/etc/passwd': 'root:x:0:0:root:/root:/bin/bash\nwww-data:x:33:33:www-data:/var/www:/usr/sbin/nologin\npostgres:x:108:113:PostgreSQL:/var/lib/postgresql:/bin/bash\nnode:x:1000:1000:Node.js:/home/node:/bin/bash\nclassified:x:1337:1337:CLASSIFIED:/home/classified:/bin/bash\nghost:x:31337:31337:???:/dev/null:/bin/false',
  '/etc/hosts': '127.0.0.1       localhost\n10.0.42.1       pshell.internal\n10.0.42.2       db.internal\n0.0.0.0         social-media.com    # focus mode\n0.0.0.0         reddit.com          # seriously\n0.0.0.0         youtube.com         # stop it',
  '/etc/motd': '╔══════════════════════════════════════╗\n║  Welcome to PShell Classified Box    ║\n║  Rule 1: Don\'t talk about prod       ║\n║  Rule 2: DON\'T talk about prod       ║\n╚══════════════════════════════════════╝',
  '/etc/resolv.conf': 'nameserver 10.0.42.1\nnameserver 8.8.8.8\nsearch pshell.internal',
  '/etc/crontab': '# m  h  dom mon dow   command\n0  3  *   *   *     /usr/local/bin/backup.sh\n*/5 *  *   *   *     /usr/local/bin/health-check.sh\n0  9  *   *   1     echo "Monday." | mail classified',
  '/root/DO_NOT_READ.txt': 'Dear future sysadmin,\n\nIf you\'re reading this, I\'ve already left.\nThe servers are yours now.\nThe password to the production database is\nwritten on a sticky note under the— wait,\nno, I shouldn\'t put that here.\n\nGood luck. You\'ll need it.\n\n— The last engineer',
  '/tmp/.secret_note': 'The password to everything is swordfish.\nJust kidding. It\'s hunter2.',
  '/home/classified/.bash_history': 'ssh prod-server\ngit pull origin main\nnpm run deploy\ntail -f /var/log/syslog\nsudo systemctl restart nginx\necho "I should really automate this"\ncowsay "deploy #847, what could go wrong"\nsudo rm -rf /tmp/test   # definitely /tmp/test',
  '/home/classified/about.classified': '[ENCRYPTED]\n[ACCESS LEVEL: TOP SECRET]\n\nUse the About app to decrypt this file.',
  '/home/classified/secrets.enc': 'a7f3b2c1d4e5f6a8b9c0d1e2f3a4b5c6\n9e8d7c6b5a4f3e2d1c0b9a8f7e6d5c4b\n[INSUFFICIENT CLEARANCE]',
  '/home/classified/team.dat': '[BINARY DATA]\n01010000 01010011 01001000\n50 53 48',
  '/proc/cpuinfo': 'processor\t: 0\nmodel name\t: PShell Classified Processor\ncpu MHz\t\t: 4200.420\ncache size\t: 69420 KB\nflags\t\t: fpu vme vibes coffee',
  '/proc/version': 'PShell OS version 2.0.0 (classified@pshell)',
  '/proc/meminfo': 'MemTotal:    16777216 kB\nMemFree:      4194304 kB\nMemAvailable: 8388608 kB\nSwapTotal:    4194304 kB\nVibes:        unlimited',
};

// App launchers
const APP_ACTIONS = {
  'pshell.app': 'pshell-reopen',
  'about.app': null, // handled specially
  'settings.app': 'pshell-settings',
  'notepad.app': 'pshell-notepad',
  'files.app': 'pshell-filemanager',
};

function getFileIcon(name, isDir) {
  if (isDir) return '\uD83D\uDCC1'; // 📁
  if (name.endsWith('.app')) return '\uD83D\uDCBB'; // 💻
  if (name.endsWith('.enc') || name.endsWith('.classified')) return '\uD83D\uDD12'; // 🔒
  if (name.endsWith('.log')) return '\uD83D\uDCCB'; // 📋
  if (name.endsWith('.sh')) return '\u2699'; // ⚙
  if (name.endsWith('.conf') || name.endsWith('.cfg')) return '\u2699'; // ⚙
  if (name.endsWith('.md')) return '\uD83D\uDCD6'; // 📖
  if (name.endsWith('.txt') || name.endsWith('.dat')) return '\uD83D\uDCC4'; // 📄
  if (name.endsWith('.tmp')) return '\uD83D\uDDD1'; // 🗑
  if (['sda', 'sda1', 'null', 'zero', 'random', 'urandom'].includes(name)) return '\uD83D\uDD27'; // 🔧
  if (['wtmp', 'kern.log', 'dmesg'].includes(name)) return '\uD83D\uDCBE'; // 💾
  if (name.startsWith('.')) return '\uD83D\uDC7B'; // 👻
  if (name === 'id_rsa' || name === 'id_rsa.pub') return '\uD83D\uDD11'; // 🔑
  if ('/usr/bin' === name || ['node','python3','bash','git','docker','npm','curl','ssh','vim','notepad','pshell'].includes(name)) return '\u25B6'; // ▶
  return '\uD83D\uDCC4'; // 📄
}

export function createFileManagerWindow(terminalManager) {
  const existing = document.getElementById('fileman-window');
  if (existing) {
    if (typeof window._bringToFront === 'function') window._bringToFront(existing);
    return;
  }

  let cwd = '/home/classified';

  const win = document.createElement('div');
  win.className = 'game-terminal fileman-window';
  win.id = 'fileman-window';
  win.dataset.dragged = '1';
  win.style.position = 'fixed';
  const fw = Math.min(450, window.innerWidth * 0.4);
  const fh = Math.min(400, window.innerHeight * 0.55);
  win.style.left = (window.innerWidth / 2 - fw / 2) + 'px';
  win.style.top = (window.innerHeight / 2 - fh / 2) + 'px';
  win.style.width = fw + 'px';
  win.style.height = fh + 'px';

  win.innerHTML = `
    <div class="gt-header">
      <div class="gt-header-left">
        <span class="dot red"></span>
        <span class="dot yellow"></span>
        <span class="dot green"></span>
      </div>
      <span class="gt-title">File Manager</span>
      <a href="https://github.com/hlib-zakr/pshell" target="_blank" class="header-brand">PShell</a>
    </div>
    <div class="fm-toolbar">
      <button class="fm-btn fm-back" title="Go up">../</button>
      <button class="fm-btn fm-home" title="Home">~</button>
      <span class="fm-path">${cwd}</span>
      <button class="fm-btn fm-new-file" title="New File">+ File</button>
      <button class="fm-btn fm-new-dir" title="New Folder">+ Folder</button>
    </div>
    <div class="gt-body fm-body">
      <div class="fm-grid"></div>
    </div>
    <div class="fm-status">Ready · <a href="https://github.com/hlib-zakr/pshell" target="_blank" class="promptup-link" style="font-size:inherit!important">PShell</a></div>
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
      id: 'fileman-window',
      label: 'Files',
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
  win.querySelector('.gt-header').addEventListener('dblclick', (e) => {
    if (e.target.closest('.dot')) return;
    win.querySelector('.dot.green')?.click();
  });
  win.addEventListener('mousedown', () => {
    if (typeof window._bringToFront === 'function') window._bringToFront(win);
  });

  // Toolbar
  win.querySelector('.fm-back').addEventListener('click', () => {
    if (cwd === '/') return;
    const parts = cwd.split('/').filter(Boolean);
    parts.pop();
    cwd = '/' + parts.join('/') || '/';
    renderDir();
  });
  win.querySelector('.fm-home').addEventListener('click', () => {
    cwd = '/home/classified';
    renderDir();
  });

  // New File button
  win.querySelector('.fm-new-file').addEventListener('click', () => {
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'fm-inline-input';
    input.placeholder = 'filename.txt';
    const toolbar = win.querySelector('.fm-toolbar');
    toolbar.appendChild(input);
    input.focus();

    const finish = () => {
      const val = input.value.trim();
      input.remove();
      if (!val) return;
      const filename = val.includes('.') ? val : val + '.txt';
      // Save to notepad storage
      if (localStorage.getItem('pshell_notepad_' + filename) === null) {
        localStorage.setItem('pshell_notepad_' + filename, '');
      }
      // Add to notepad file list
      try {
        const files = JSON.parse(localStorage.getItem('pshell_notepad_files') || '[]');
        if (!files.includes(filename)) {
          files.push(filename);
          localStorage.setItem('pshell_notepad_files', JSON.stringify(files));
        }
      } catch {}
      showToast('Created', filename);
      renderDir();
    };

    input.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter') finish();
      if (e.key === 'Escape') input.remove();
    });
    input.addEventListener('blur', finish);
  });

  // New Folder button
  win.querySelector('.fm-new-dir').addEventListener('click', () => {
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'fm-inline-input';
    input.placeholder = 'folder-name';
    const toolbar = win.querySelector('.fm-toolbar');
    toolbar.appendChild(input);
    input.focus();

    const finish = () => {
      const val = input.value.trim();
      input.remove();
      if (!val) return;
      // Can only create in writable dirs
      if (cwd === '/home/classified' || cwd.startsWith('/home/classified/') || cwd === '/tmp') {
        // Store in localStorage so it persists
        try {
          const dirs = JSON.parse(localStorage.getItem('pshell_user_dirs') || '[]');
          const fullPath = cwd === '/' ? '/' + val : cwd + '/' + val;
          if (!dirs.includes(fullPath)) {
            dirs.push(fullPath);
            localStorage.setItem('pshell_user_dirs', JSON.stringify(dirs));
          }
        } catch {}
        showToast('Created folder', val);
        renderDir();
      } else {
        showToast('Cannot create', 'Read-only directory');
      }
    };

    input.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter') finish();
      if (e.key === 'Escape') input.remove();
    });
    input.addEventListener('blur', finish);
  });

  function renderDir() {
    const grid = win.querySelector('.fm-grid');
    const pathEl = win.querySelector('.fm-path');
    const statusEl = win.querySelector('.fm-status');
    grid.innerHTML = '';
    pathEl.textContent = cwd;

    // Merge all file sources
    let entries = FS[cwd] ? [...FS[cwd]] : [];

    // Notepad files in /home/classified
    if (cwd === '/home/classified') {
      try {
        const custom = JSON.parse(localStorage.getItem('pshell_notepad_files')) || [];
        for (const f of custom) {
          if (!entries.includes(f)) entries.push(f);
        }
      } catch {}
    }

    // User-created directories
    try {
      const dirs = JSON.parse(localStorage.getItem('pshell_user_dirs') || '[]');
      for (const d of dirs) {
        const parent = d.substring(0, d.lastIndexOf('/')) || '/';
        const name = d.substring(d.lastIndexOf('/') + 1);
        if (parent === cwd && !entries.includes(name)) {
          entries.push(name);
        }
      }
    } catch {}

    for (const name of entries) {
      const fullPath = cwd === '/' ? '/' + name : cwd + '/' + name;
      let isDir = !!FS[fullPath];
      // Check user-created dirs
      try {
        const userDirs = JSON.parse(localStorage.getItem('pshell_user_dirs') || '[]');
        if (userDirs.includes(fullPath)) isDir = true;
      } catch {}
      const icon = getFileIcon(name, isDir);

      const item = document.createElement('div');
      item.className = 'fm-item';
      const iconDiv = document.createElement('div');
      iconDiv.className = 'fm-icon';
      iconDiv.textContent = icon;
      const nameDiv = document.createElement('div');
      nameDiv.className = 'fm-name';
      nameDiv.textContent = name;
      item.appendChild(iconDiv);
      item.appendChild(nameDiv);

      item.addEventListener('dblclick', () => {
        if (isDir) {
          cwd = fullPath;
          renderDir();
        } else if (cwd === '/usr/bin') {
          // Executables — launch associated app or show toast
          const binActions = {
            'notepad': 'pshell-notepad',
            'pshell': 'pshell-reopen',
          };
          if (binActions[name]) {
            window.dispatchEvent(new CustomEvent(binActions[name]));
            showToast('Launched', `/usr/bin/${name}`);
          } else {
            showToast('Executed', `$ ${name} — running in background`);
          }
        } else if (name.endsWith('.app')) {
          // Launch app
          const action = APP_ACTIONS[name];
          if (action) {
            window.dispatchEvent(new CustomEvent(action));
          } else if (name === 'about.app') {
            // About uses terminal manager directly
            terminalManager._toggleAboutWindow();
          }
          showToast('Launched', name);
        } else {
          // Check if it's a special/binary/device file
          const noOpen = {
            '/dev/sda': 'Block device — this is your entire hard drive.',
            '/dev/sda1': 'Block device — primary partition.',
            '/dev/null': 'The void. Data goes in, nothing comes out.',
            '/dev/zero': 'Infinite stream of zeros. Not a text file.',
            '/dev/random': 'Kernel entropy pool. Opening this would freeze your browser.',
            '/dev/urandom': 'Unlimited random bytes. Not readable as text.',
          };
          const binFiles = ['wtmp', 'kern.log', 'dmesg', 'authorized_keys', 'known_hosts',
            'build-a1b2c3', 'session_expired.tmp', 'sites-enabled', 'mime.types',
            'node', 'python3', 'bash', 'git', 'docker', 'npm', 'curl', 'ssh', 'vim',
            'sda', 'sda1', 'null', 'zero', 'random', 'urandom',
            'loadavg', 'uptime'];

          if (noOpen[fullPath]) {
            showToast('Cannot open', noOpen[fullPath]);
          } else if (binFiles.includes(name)) {
            showToast('Cannot open', `${name} — binary file, not supported`);
          } else {
            // Open in notepad — load content if available
            const content = FILE_CONTENT[fullPath];
            if (content !== undefined) {
              const key = 'pshell_notepad_' + name;
              if (localStorage.getItem(key) === null) {
                localStorage.setItem(key, content);
              }
            }
            window.dispatchEvent(new CustomEvent('pshell-notepad', { detail: { file: name } }));
          }
        }
      });

      grid.appendChild(item);
    }

    statusEl.textContent = `${entries.length} items | ${cwd}`;
  }

  renderDir();
}
