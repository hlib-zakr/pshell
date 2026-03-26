const STORAGE_KEY = 'pshell_achievements';
let container = null;
let soundEngine = null;

const ACHIEVEMENTS = {
  first_blood: { title: 'First Blood', desc: 'Caught your first dangerous command', icon: '!', hint: 'Press Ctrl+C on a dangerous command' },
  speed_demon: { title: 'Speed Demon', desc: 'Reaction time under 200ms', icon: '>', hint: 'Be really fast with Ctrl+C' },
  level_5: { title: 'Halfway There', desc: 'Reached level 5', icon: '5', hint: 'Keep playing and survive' },
  level_10: { title: 'Terminal Veteran', desc: 'Reached level 10', icon: 'X', hint: 'Survive even longer...' },
  hard_mode: { title: 'Hard Mode Hero', desc: 'Caught a command in hard mode', icon: 'H', hint: 'Enable hard mode and catch one' },
  port_scanner: { title: 'Port Scanner', desc: 'Found the hidden service on 31337', icon: '#', hint: 'Try scanning some ports in About CLI' },
  rm_enthusiast: { title: 'rm -rf Enthusiast', desc: 'Tried rm -rf / five times', icon: '-', hint: 'Some people never learn...' },
  sudo_abuser: { title: 'sudo Abuser', desc: 'Used sudo five times', icon: '$', hint: 'With great power comes great abuse' },
  file_explorer: { title: 'File Explorer', desc: 'Read 5 different files', icon: '/', hint: 'Read files in the About CLI' },
  first_death: { title: 'First Incident', desc: 'Took down production for the first time', icon: 'F', hint: 'Miss a dangerous command' },
  multi_terminal: { title: 'Multi-Tasker', desc: 'Played with 4 terminals', icon: '4', hint: 'Play at the highest terminal count' },
  about_explorer: { title: 'Command Junkie', desc: 'Ran 20 commands in the about CLI', icon: '?', hint: 'Explore the About CLI extensively' },
  cowboy: { title: 'Cowboy Coder', desc: 'Used cowsay', icon: 'C', hint: 'Try a classic Unix command in About' },
  hacker: { title: 'Hackerman', desc: 'Hacked the mainframe', icon: '*', hint: 'Find a way to hack in About CLI' },
  notepad_user: { title: 'Taking Notes', desc: 'Saved something in notepad', icon: '=', hint: 'Open Notepad and save a file' },
  theme_changer: { title: 'Interior Designer', desc: 'Changed the terminal theme', icon: '~', hint: 'Check the Settings app' },
  konami: { title: 'Up Up Down Down', desc: 'Entered the Konami code', icon: 'K', hint: 'A classic cheat code sequence...' },
  '2048_winner': { title: '2048 Master', desc: 'Reach the 2048 tile', icon: '\uD83D\uDD22', hint: 'Try the 2048 command' },
  snake_master: { title: 'Snake Charmer', desc: 'Score 10+ in Snake', icon: '\uD83D\uDC0D', hint: 'Try the snake command' },
  minesweeper_pro: { title: 'Mine Sweeper', desc: 'Clear the minefield', icon: '\uD83D\uDCA3', hint: 'Try the minesweeper command' },
  wordle_solver: { title: 'Word Hacker', desc: 'Solve the Wordle', icon: '\uD83D\uDCDD', hint: 'Try the wordle command' },
};

function getUnlocked() {
  try { return new Set(JSON.parse(localStorage.getItem(STORAGE_KEY)) || []); }
  catch { return new Set(); }
}

function saveUnlocked(set) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...set]));
}

export function initNotifications(sounds) {
  soundEngine = sounds;
  container = document.createElement('div');
  container.id = 'toast-container';
  document.body.appendChild(container);
}

export function unlockAchievement(id) {
  const unlocked = getUnlocked();
  if (unlocked.has(id)) return false;
  if (!ACHIEVEMENTS[id]) return false;

  unlocked.add(id);
  saveUnlocked(unlocked);

  const ach = ACHIEVEMENTS[id];
  showToast(`ACHIEVEMENT: ${ach.title}`, ach.desc, 'achievement');

  if (soundEngine) soundEngine.achievement();
  return true;
}

export function showToast(title, message, type = 'info') {
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <div class="toast-title">${title}</div>
    ${message ? `<div class="toast-msg">${message}</div>` : ''}
  `;

  container.appendChild(toast);

  // Trigger slide-in
  requestAnimationFrame(() => toast.classList.add('toast-visible'));

  // Auto-dismiss
  setTimeout(() => {
    toast.classList.remove('toast-visible');
    toast.classList.add('toast-out');
    setTimeout(() => toast.remove(), 400);
  }, 4000);
}

export function getAchievementList() {
  const unlocked = getUnlocked();
  return Object.entries(ACHIEVEMENTS).map(([id, ach]) => ({
    ...ach, id, unlocked: unlocked.has(id),
  }));
}
