export const LEVELS = [
  { level: 1,  commandCount: 8,  intervalMs: 2500, terminals: 1 },
  { level: 2,  commandCount: 9,  intervalMs: 2200, terminals: 1 },
  { level: 3,  commandCount: 10, intervalMs: 1900, terminals: 1 },
  { level: 4,  commandCount: 10, intervalMs: 1600, terminals: 2 },
  { level: 5,  commandCount: 11, intervalMs: 1400, terminals: 2 },
  { level: 6,  commandCount: 12, intervalMs: 1200, terminals: 2 },
  { level: 7,  commandCount: 12, intervalMs: 1000, terminals: 3 },
  { level: 8,  commandCount: 13, intervalMs: 850,  terminals: 3 },
  { level: 9,  commandCount: 14, intervalMs: 750,  terminals: 4 },
  { level: 10, commandCount: 15, intervalMs: 650,  terminals: 4 },
];

export function getLevelConfig(level) {
  if (level <= LEVELS.length) {
    return LEVELS[level - 1];
  }
  return {
    level,
    commandCount: 15 + (level - 10),
    intervalMs: Math.max(500, 650 - (level - 10) * 30),
    terminals: 4,
  };
}
