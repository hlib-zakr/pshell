const STORAGE_KEY = 'pshell_leaderboard';

// API calls (works on both Vite dev server and Cloudflare Pages)
async function apiFetch(limit = 20) {
  try {
    const res = await fetch(`/api/leaderboard?limit=${limit}`);
    if (res.ok) return await res.json();
  } catch {}
  return null;
}

async function apiSubmit(entry) {
  try {
    const res = await fetch('/api/leaderboard', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry),
    });
    if (res.ok) return await res.json();
  } catch {}
  return null;
}

// Local storage fallback
function getLocalScores() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
  catch { return []; }
}

function saveLocalScores(scores) {
  try {
    scores.sort((a, b) => b.score - a.score);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(scores.slice(0, 50)));
  } catch {}
}

export const leaderboard = {
  async fetchLeaderboard(limit = 20) {
    // Try API first (Cloudflare D1 in prod, Vite plugin in dev)
    const remote = await apiFetch(limit);
    if (remote) return remote;

    // Fallback to local
    return getLocalScores().slice(0, limit);
  },

  async submitScore({ username, score, levelReached, avgReactionMs, commandsCaught }) {
    const entry = {
      username: username.trim().substring(0, 20),
      score,
      level_reached: levelReached,
      avg_reaction_ms: avgReactionMs,
      commands_caught: commandsCaught,
    };

    // Save locally always
    const local = getLocalScores();
    local.push({ ...entry, created_at: new Date().toISOString() });
    saveLocalScores(local);

    // Submit to API
    await apiSubmit(entry);

    return entry;
  },
};
