export const TARGET_MS = 10_000;

/** @typedef {{name: string, elapsedMs: number, errorMs: number, score: number, achievedAt: number}} RecordEntry */

/** @param {number} elapsedMs @param {string} name @param {number} achievedAt @returns {RecordEntry} */
export function createResult(elapsedMs, name, achievedAt) {
  const milliseconds = Math.max(0, Math.round(elapsedMs));
  const errorMs = Math.abs(milliseconds - TARGET_MS);
  return {
    name: normalizeName(name), elapsedMs: milliseconds, errorMs, achievedAt,
    score: errorMs === 0 ? 1000 : Math.min(999, Math.max(0, Math.round(1000 * Math.exp(-errorMs / 350)))),
  };
}

/** @param {string} name */
export function normalizeName(name) {
  return name.trim().slice(0, 12) || '玩家一号';
}

/** @param {RecordEntry[]} entries @param {RecordEntry} result */
export function updateLeaderboard(entries, result) {
  return [...entries, result]
    .sort((a, b) => a.errorMs - b.errorMs || a.achievedAt - b.achievedAt);
}

/** @param {number} errorMs */
export function resultMessage(errorMs) {
  if (errorMs === 0) return ['完美命中！', '这一刻，你和时间完全同步。'];
  if (errorMs <= 30) return ['就差一眨眼。', '这手感，已经精准得有点离谱。'];
  if (errorMs <= 100) return ['漂亮，稳稳拿捏！', '离完美只剩一点点，再试一次？'];
  if (errorMs <= 500) return ['差一点，就刚好。', '找到节奏，下次一定更接近。'];
  return ['时间有自己的想法。', '放轻松，看准数字，再来一局。'];
}
