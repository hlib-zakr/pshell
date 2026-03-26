import { showToast, unlockAchievement } from './notifications.js';

const STORAGE_PREFIX = 'pshell_notepad_';
const FILES_KEY = 'pshell_notepad_files';

const DEFAULT_FILES = {
  'untitled.txt': '',
  'notes.txt': `TODO:
- Fix that one bug (which one?)
- Update dependencies (scary)
- Write tests (lol)
- Document the API (double lol)
- Figure out what PID 31337 is
- Take a vacation (denied)
- Learn Kubernetes (in progress since 2019)`,
  'README.md': `# STOP THE CODE

A terminal reaction game.
Spot dangerous commands. Press Ctrl+C.
Don't press it on safe ones.

Built with Claude, tears, and Hlib Zakrevskyi.

github.com/hlib-zakr/pshell`,
};

function getAllFileNames() {
  const defaults = Object.keys(DEFAULT_FILES);
  try {
    const custom = JSON.parse(localStorage.getItem(FILES_KEY)) || [];
    return [...new Set([...defaults, ...custom])];
  } catch { return defaults; }
}

function saveFileList(names) {
  const custom = names.filter(n => !DEFAULT_FILES[n]);
  localStorage.setItem(FILES_KEY, JSON.stringify(custom));
}

export function createNotepadWindow(terminalManager, openFile) {
  const existing = document.getElementById('notepad-window');
  if (existing) {
    if (typeof window._bringToFront === 'function') window._bringToFront(existing);
    // If a file was requested, switch to it
    if (openFile && existing._switchFile) existing._switchFile(openFile);
    return;
  }

  const win = document.createElement('div');
  win.className = 'game-terminal notepad-window';
  win.id = 'notepad-window';
  win.dataset.dragged = '1';
  win.style.position = 'fixed';
  const nw = Math.min(500, window.innerWidth * 0.45);
  const nh = Math.min(420, window.innerHeight * 0.6);
  win.style.left = (window.innerWidth / 2 - nw / 2) + 'px';
  win.style.top = (window.innerHeight / 2 - nh / 2) + 'px';
  win.style.width = nw + 'px';
  win.style.height = nh + 'px';

  let currentFile = openFile || 'untitled.txt';
  let currentDir = '/home/classified';
  let fileNames = getAllFileNames();

  // If the requested file isn't in the list, add it
  if (openFile && !fileNames.includes(openFile)) {
    fileNames.push(openFile);
    saveFileList(fileNames);
  }

  const SAVE_DIRS = [
    '/home/classified',
    '/home/classified/Applications',
    '/tmp',
    '/root',
    '/var/log',
  ];

  function loadFile(name) {
    const saved = localStorage.getItem(STORAGE_PREFIX + name);
    if (saved !== null) return saved;
    return DEFAULT_FILES[name] || '';
  }

  function saveFile() {
    const ta = win.querySelector('.notepad-textarea');
    if (ta) {
      localStorage.setItem(STORAGE_PREFIX + currentFile, ta.value);
      // Also store the path mapping
      try {
        const paths = JSON.parse(localStorage.getItem('pshell_notepad_paths') || '{}');
        paths[currentFile] = currentDir;
        localStorage.setItem('pshell_notepad_paths', JSON.stringify(paths));
      } catch {}
      showToast('Saved', `${currentDir}/${currentFile}`);
      unlockAchievement('notepad_user');
    }
  }

  function updateStatus() {
    const ta = win.querySelector('.notepad-textarea');
    const status = win.querySelector('.notepad-status');
    if (!ta || !status) return;
    const text = ta.value;
    const lines = text.split('\n').length;
    const chars = text.length;
    const pos = ta.selectionStart;
    const beforeCursor = text.substring(0, pos);
    const line = beforeCursor.split('\n').length;
    const col = pos - beforeCursor.lastIndexOf('\n');
    status.textContent = `Ln ${line}, Col ${col} | ${lines} lines, ${chars} chars | ${currentDir}/${currentFile}`;
  }

  function updateLineNumbers() {
    const ta = win.querySelector('.notepad-textarea');
    const gutter = win.querySelector('.notepad-gutter');
    if (!ta || !gutter) return;
    const lines = ta.value.split('\n').length;
    gutter.innerHTML = Array.from({ length: lines }, (_, i) =>
      `<div class="gutter-line">${i + 1}</div>`
    ).join('');
    gutter.scrollTop = ta.scrollTop;
  }

  function renderTabs() {
    const tabsEl = win.querySelector('.notepad-tabs');
    tabsEl.innerHTML = '';
    for (const name of fileNames) {
      const tab = document.createElement('button');
      tab.className = `notepad-tab${name === currentFile ? ' active' : ''}`;
      tab.dataset.file = name;

      const tabLabel = document.createElement('span');
      tabLabel.textContent = name;
      tab.appendChild(tabLabel);

      // Close button (x) — only show if more than 1 tab
      if (fileNames.length > 1) {
        const closeBtn = document.createElement('span');
        closeBtn.className = 'tab-close';
        closeBtn.textContent = '\u00D7';
        closeBtn.title = 'Close tab';
        closeBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          // Save before closing
          const ta = win.querySelector('.notepad-textarea');
          if (currentFile === name && ta) {
            localStorage.setItem(STORAGE_PREFIX + currentFile, ta.value);
          }
          // Remove from open tabs only (file stays in localStorage)
          const idx = fileNames.indexOf(name);
          if (idx !== -1) fileNames.splice(idx, 1);
          // DON'T call saveFileList — the file still exists, just the tab is closed
          // Switch to another tab if closing current
          if (currentFile === name) {
            currentFile = fileNames[Math.max(0, idx - 1)] || fileNames[0] || 'untitled.txt';
            if (!fileNames.includes(currentFile)) fileNames.push(currentFile);
            const textarea = win.querySelector('.notepad-textarea');
            if (textarea) textarea.value = loadFile(currentFile);
            win.querySelector('.gt-title').textContent = `${currentFile} - Notepad`;
            updateLineNumbers();
            updateStatus();
          }
          renderTabs();
        });
        tab.appendChild(closeBtn);
      }

      let clickTimer = null;
      tab.addEventListener('click', (e) => {
        if (e.target.closest('.tab-close')) return;
        if (e.target.closest('.notepad-rename-input')) return;
        if (clickTimer) clearTimeout(clickTimer);
        clickTimer = setTimeout(() => switchFile(name), 200);
      });

      // Double-click to rename — inline edit
      tab.addEventListener('dblclick', (e) => {
        if (clickTimer) { clearTimeout(clickTimer); clickTimer = null; }
        e.stopPropagation();
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'notepad-rename-input';
        input.value = name;
        tab.textContent = '';
        tab.appendChild(input);
        input.focus();
        input.select();

        const finishRename = () => {
          const newName = input.value.trim();
          if (!newName || newName === name) { renderTabs(); return; }
          const filename = newName.includes('.') ? newName : newName + '.txt';
          if (fileNames.includes(filename)) { showToast('Error', 'File already exists'); renderTabs(); return; }

          const content = localStorage.getItem(STORAGE_PREFIX + name);
          localStorage.removeItem(STORAGE_PREFIX + name);
          localStorage.setItem(STORAGE_PREFIX + filename, content || '');

          const idx = fileNames.indexOf(name);
          fileNames[idx] = filename;
          saveFileList(fileNames);

          if (currentFile === name) currentFile = filename;
          win.querySelector('.gt-title').textContent = `${currentFile} - Notepad`;
          renderTabs();
          showToast('Renamed', `${name} → ${filename}`);
        };

        input.addEventListener('keydown', (ev) => {
          ev.stopPropagation();
          if (ev.key === 'Enter') finishRename();
          if (ev.key === 'Escape') renderTabs();
        });
        input.addEventListener('blur', finishRename);
      });

      tabsEl.appendChild(tab);
    }
    // "+" button for new file
    const addBtn = document.createElement('button');
    addBtn.className = 'notepad-tab notepad-add-tab';
    addBtn.textContent = '+';
    addBtn.title = 'New file';
    addBtn.addEventListener('click', () => {
      // Replace + button with inline input
      addBtn.textContent = '';
      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'notepad-rename-input';
      input.placeholder = 'filename.txt';
      addBtn.appendChild(input);
      input.focus();

      const finishCreate = () => {
        const val = input.value.trim();
        if (!val) { renderTabs(); return; }
        const filename = val.includes('.') ? val : val + '.txt';
        if (fileNames.includes(filename)) { switchFile(filename); renderTabs(); return; }
        fileNames.push(filename);
        saveFileList(fileNames);
        localStorage.setItem(STORAGE_PREFIX + filename, '');
        switchFile(filename);
        renderTabs();
      };

      input.addEventListener('keydown', (ev) => {
        ev.stopPropagation();
        if (ev.key === 'Enter') finishCreate();
        if (ev.key === 'Escape') renderTabs();
      });
      input.addEventListener('blur', finishCreate);
    });
    tabsEl.appendChild(addBtn);
  }

  // Expose for external access
  win._switchFile = (name) => switchFile(name);

  function switchFile(name) {
    // Add to file list if new
    if (!fileNames.includes(name)) {
      fileNames.push(name);
      saveFileList(fileNames);
    }
    const ta = win.querySelector('.notepad-textarea');
    // Save current first
    localStorage.setItem(STORAGE_PREFIX + currentFile, ta.value);
    // Switch
    currentFile = name;
    ta.value = loadFile(name);
    win.querySelector('.gt-title').textContent = `${name} - Notepad`;
    renderTabs();
    updateLineNumbers();
    updateStatus();
  }

  win.innerHTML = `
    <div class="gt-header">
      <div class="gt-header-left">
        <span class="dot red"></span>
        <span class="dot yellow"></span>
        <span class="dot green"></span>
      </div>
      <span class="gt-title">${currentFile} - Notepad</span>
      <a href="https://github.com/hlib-zakr/pshell" target="_blank" class="header-brand">PShell</a>
    </div>
    <div class="notepad-toolbar">
      <button class="np-btn np-save" title="Save (Ctrl+S)">Save</button>
      <button class="np-btn np-saveas" title="Save As...">Save As</button>
      <span class="np-dir-label">Dir:</span>
      <select class="np-dir-select">
        ${SAVE_DIRS.map(d => `<option value="${d}"${d === currentDir ? ' selected' : ''}>${d}</option>`).join('')}
      </select>
    </div>
    <div class="notepad-tabs"></div>
    <div class="notepad-editor">
      <div class="notepad-gutter"></div>
      <textarea class="notepad-textarea" spellcheck="false">${loadFile(currentFile)}</textarea>
    </div>
    <div class="notepad-status">Ready · <a href="https://github.com/hlib-zakr/pshell" target="_blank" class="promptup-link" style="font-size:inherit!important">PShell</a></div>
  `;

  document.body.appendChild(win);
  if (typeof window._bringToFront === 'function') window._bringToFront(win);
  terminalManager._makeDraggable(win, win.querySelector('.gt-header'), false);
  terminalManager._makeResizable(win, false);

  // Traffic lights
  win.querySelector('.dot.red').addEventListener('click', (e) => {
    e.stopPropagation();
    const ta = win.querySelector('.notepad-textarea');
    if (ta) localStorage.setItem(STORAGE_PREFIX + currentFile, ta.value);
    win.remove();
  });

  win.querySelector('.dot.yellow').addEventListener('click', (e) => {
    e.stopPropagation();
    win.dataset.prevHeight = win.style.height;
    win.style.display = 'none';
    window.dispatchEvent(new CustomEvent('pshell-minimize', { detail: {
      id: 'notepad-window',
      label: 'Notepad',
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

  // Double-click header to maximize
  win.querySelector('.gt-header').addEventListener('dblclick', (e) => {
    if (e.target.closest('.dot')) return;
    win.querySelector('.dot.green')?.click();
  });

  // Bring to front
  win.addEventListener('mousedown', () => {
    if (typeof window._bringToFront === 'function') window._bringToFront(win);
  });

  // Toolbar
  win.querySelector('.np-save').addEventListener('click', () => saveFile());
  win.querySelector('.np-saveas').addEventListener('click', () => {
    // Inline rename for Save As
    const toolbar = win.querySelector('.notepad-toolbar');
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'notepad-rename-input';
    input.value = currentFile;
    input.style.width = '120px';
    toolbar.appendChild(input);
    input.focus();
    input.select();
    const finish = () => {
      const newName = input.value.trim();
      input.remove();
      if (!newName) return;
      const filename = newName.includes('.') ? newName : newName + '.txt';
      currentFile = filename;
      if (!fileNames.includes(filename)) {
        fileNames.push(filename);
        saveFileList(fileNames);
      }
      saveFile();
      win.querySelector('.gt-title').textContent = `${filename} - Notepad`;
      renderTabs();
      updateStatus();
    };
    input.addEventListener('keydown', (ev) => {
      ev.stopPropagation();
      if (ev.key === 'Enter') finish();
      if (ev.key === 'Escape') input.remove();
    });
    input.addEventListener('blur', finish);
  });
  win.querySelector('.np-dir-select').addEventListener('change', (e) => {
    currentDir = e.target.value;
    updateStatus();
  });

  // Render tabs
  renderTabs();

  // Textarea events
  const textarea = win.querySelector('.notepad-textarea');
  textarea.addEventListener('input', () => { updateLineNumbers(); updateStatus(); });
  textarea.addEventListener('click', updateStatus);
  textarea.addEventListener('keyup', updateStatus);
  textarea.addEventListener('scroll', () => {
    const gutter = win.querySelector('.notepad-gutter');
    if (gutter) gutter.scrollTop = textarea.scrollTop;
  });

  // Ctrl+S to save
  textarea.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      saveFile();
    }
    e.stopPropagation(); // Block game keyboard
  });

  updateLineNumbers();
  updateStatus();
  setTimeout(() => textarea.focus(), 100);
}
