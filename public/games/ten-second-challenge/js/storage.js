import { createResult, normalizeName } from './scoring.js';

const STORAGE_KEY = 'perfect-ten.v1';
/** @typedef {import('./scoring.js').RecordEntry} RecordEntry */
/** @typedef {{name: string, entries: RecordEntry[], attempts: number, last: RecordEntry | null}} SavedState */

/** @param {unknown} value @returns {value is RecordEntry} */
function isRecord(value) {
  if (typeof value !== 'object' || value === null) return false;
  const row = /** @type {Record<string, unknown>} */ (value);
  return typeof row.name === 'string' && row.name.trim().length > 0 &&
    typeof row.elapsedMs === 'number' && Number.isSafeInteger(row.elapsedMs) && row.elapsedMs >= 0 &&
    typeof row.achievedAt === 'number' && Number.isFinite(row.achievedAt);
}

/** @returns {{state: SavedState, available: boolean}} */
export function loadState() {
  const fallback = { name: '玩家一号', entries: [], attempts: 0, last: null };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { state: fallback, available: true };
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.entries)) throw new Error('Invalid saved data');
    const entries = parsed.entries.filter(isRecord).map((/** @type {RecordEntry} */ row) => createResult(row.elapsedMs, row.name, row.achievedAt));
    return { state: {
      name: typeof parsed.name === 'string' ? normalizeName(parsed.name) : fallback.name,
      entries,
      attempts: Number.isSafeInteger(parsed.attempts) && parsed.attempts >= 0 ? parsed.attempts : 0,
      last: isRecord(parsed.last) ? createResult(parsed.last.elapsedMs, parsed.last.name, parsed.last.achievedAt) : null,
    }, available: true };
  } catch { return { state: fallback, available: false }; }
}

/** @param {SavedState} state */
export function saveState(state) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); return true; }
  catch { return false; }
}
