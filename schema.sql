CREATE TABLE IF NOT EXISTS leaderboard (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL CHECK(length(username) >= 1 AND length(username) <= 20),
  score INTEGER NOT NULL CHECK(score >= 0 AND score <= 100000),
  level_reached INTEGER NOT NULL CHECK(level_reached >= 1 AND level_reached <= 50),
  avg_reaction_ms INTEGER,
  commands_caught INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_leaderboard_score ON leaderboard (score DESC);
