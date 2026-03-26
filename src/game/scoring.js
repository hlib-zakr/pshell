export function calculateScore(reactionTimeMs, reactionWindow, level) {
  const speedFactor = Math.max(0, 1 - (reactionTimeMs / reactionWindow));
  const basePoints = Math.round(100 * Math.pow(speedFactor, 1.5));
  const levelMultiplier = 1 + (level - 1) * 0.3;
  return Math.round(basePoints * levelMultiplier);
}
