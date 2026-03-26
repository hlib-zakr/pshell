// Shared file abstraction — single source of truth for all file operations
// Eliminates duplicated file access patterns across fs.js, git.js, dangerous.js, etc.

import { FS } from './filesystem.js';

// ─── Hardcoded sizes for system files (deterministic, no random) ───
const SYSTEM_FILE_SIZES = {
  'passwd': 1247, 'shadow': 892, 'hosts': 438, 'resolv.conf': 89, 'crontab': 312, 'motd': 256,
  'nginx.conf': 1842, 'mime.types': 5120, 'access.log': 24576, 'error.log': 8192,
  'syslog': 102400, 'auth.log': 51200, 'kern.log': 32768, 'dmesg': 16384, 'wtmp': 4096,
  'README.md': 2048, 'secrets.enc': 4096, 'team.dat': 512, 'about.classified': 1024,
  '.bash_history': 3072, 'notes.txt': 768, 'todo.md': 1536, 'DO_NOT_READ.txt': 2560,
  'id_rsa': 3243, 'id_rsa.pub': 742, 'known_hosts': 1580, 'authorized_keys': 742,
  'debug.log': 8192, 'session_expired.tmp': 64, '.secret_note': 256,
  'pshell.app': 0, 'about.app': 0, 'settings.app': 0, 'notepad.app': 0, 'files.app': 0,
};

// ─── Read ───

export function readFile(path, state) {
  // Priority 1: in-memory created files
  const created = state?.sim?.fs?.createdFiles?.[path];
  if (created) return created.content;

  // Priority 2: notepad localStorage
  try {
    const notepad = localStorage.getItem('pshell_notepad_' + path);
    if (notepad !== null) return notepad;
  } catch {}

  return null;
}

export function fileExists(path, state) {
  if (state?.sim?.fs?.deletedFiles?.has(path)) return false;
  if (state?.sim?.fs?.createdFiles?.[path]) return true;
  try {
    if (localStorage.getItem('pshell_notepad_' + path) !== null) return true;
  } catch {}
  return false;
}

export function getFileSize(path, state, isDir = false) {
  if (isDir) return 4096;
  // Created files: actual content length
  const created = state?.sim?.fs?.createdFiles?.[path];
  if (created) return (created.content || '').length;
  // Notepad files
  try {
    const notepad = localStorage.getItem('pshell_notepad_' + path);
    if (notepad !== null) return notepad.length;
  } catch {}
  // System files: hardcoded
  return SYSTEM_FILE_SIZES[path] || 1024;
}

// ─── Write ───

export function writeFile(path, content, state) {
  const cwd = state?.cwd || '/home/classified';
  state.sim.fs.createdFiles[path] = {
    content,
    createdAt: state.sim.fs.createdFiles[path]?.createdAt || Date.now(),
    dir: cwd,
  };
  state.sim.fs.modifiedFiles[path] = Date.now();
  // Persist to localStorage
  try {
    localStorage.setItem('pshell_notepad_' + path, content);
    const files = JSON.parse(localStorage.getItem('pshell_notepad_files') || '[]');
    if (!files.includes(path)) { files.push(path); localStorage.setItem('pshell_notepad_files', JSON.stringify(files)); }
  } catch {}
}

export function appendFile(path, content, state) {
  const existing = readFile(path, state) || '';
  const newContent = existing + content;
  writeFile(path, newContent, state);
}

// ─── Delete ───

export function deleteFile(path, state) {
  delete state.sim.fs.createdFiles[path];
  delete state.sim.fs.modifiedFiles[path];
  state.sim.fs.deletedFiles.add(path);
  try {
    localStorage.removeItem('pshell_notepad_' + path);
    const files = JSON.parse(localStorage.getItem('pshell_notepad_files') || '[]');
    const idx = files.indexOf(path);
    if (idx !== -1) { files.splice(idx, 1); localStorage.setItem('pshell_notepad_files', JSON.stringify(files)); }
  } catch {}
}

// ─── Directories ───

export function createDir(dirPath, fullPath, state) {
  state.sim.fs.createdDirs.add(fullPath);
  state.sim.fs.createdDirs.add(dirPath); // bare name for relative cd
  try {
    const dirs = JSON.parse(localStorage.getItem('pshell_user_dirs') || '[]');
    if (!dirs.includes(fullPath)) { dirs.push(fullPath); localStorage.setItem('pshell_user_dirs', JSON.stringify(dirs)); }
  } catch {}
}

export function dirExists(path, state) {
  if (FS[path]) return true;
  if (state?.sim?.fs?.createdDirs?.has(path)) return true;
  try {
    const dirs = JSON.parse(localStorage.getItem('pshell_user_dirs') || '[]');
    if (dirs.includes(path)) return true;
  } catch {}
  return false;
}

// ─── List directory (merges all sources) ───

export function listDir(dirPath, state) {
  const entries = new Set();
  const sim = state?.sim;

  // Static FS
  if (FS[dirPath]) {
    for (const e of FS[dirPath]) entries.add(e);
  }

  // Notepad files (in home)
  if (dirPath === '/home/classified' || dirPath.startsWith('/home/classified/')) {
    try {
      const notepadFiles = JSON.parse(localStorage.getItem('pshell_notepad_files') || '[]');
      for (const f of notepadFiles) entries.add(f);
    } catch {}
  }

  // Created files in this directory
  if (sim?.fs?.createdFiles) {
    for (const [name, info] of Object.entries(sim.fs.createdFiles)) {
      const fileDir = info.dir || '/home/classified';
      if (fileDir === dirPath) entries.add(name);
    }
  }

  // Created directories
  if (sim?.fs?.createdDirs) {
    for (const d of sim.fs.createdDirs) {
      const parent = d.substring(0, d.lastIndexOf('/')) || '/';
      if (parent === dirPath) {
        const name = d.split('/').pop();
        if (name) entries.add(name);
      }
    }
  }

  // User directories from localStorage
  try {
    const userDirs = JSON.parse(localStorage.getItem('pshell_user_dirs') || '[]');
    for (const d of userDirs) {
      const parent = d.substring(0, d.lastIndexOf('/')) || '/';
      if (parent === dirPath) {
        const name = d.split('/').pop();
        if (name && !entries.has(name)) entries.add(name);
      }
    }
  } catch {}

  // Filter deleted files
  if (sim?.fs?.deletedFiles) {
    for (const d of sim.fs.deletedFiles) entries.delete(d);
  }

  return [...entries].sort();
}
