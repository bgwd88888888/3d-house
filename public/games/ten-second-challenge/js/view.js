import { TARGET_MS, resultMessage } from './scoring.js';

/** @param {string} id */
export function element(id) {
  const node = document.getElementById(id);
  if (!node) throw new Error(`Missing element: ${id}`);
  return node;
}

const seconds = element('timer-seconds');
const fraction = element('timer-fraction');
const progress = element('timer-progress');

/** @param {number} milliseconds */
export function renderTime(milliseconds) {
  const value = Math.max(0, Math.floor(milliseconds));
  seconds.textContent = String(Math.floor(value / 1000)).padStart(2, '0');
  fraction.textContent = String(value % 1000).padStart(3, '0');
  progress.style.transform = `scaleX(${Math.min(1, value / TARGET_MS)})`;
  progress.classList.toggle('over-target', value > TARGET_MS);
}

/** @param {'idle' | 'running' | 'finished'} state */
export function renderPhase(state) {
  const running = state === 'running';
  element('stage').dataset.state = state;
  element('timer-status').textContent = running ? '时间正在流动…' : state === 'finished' ? '这一刻，定格了' : '准备好了吗？';
  element('button-label').textContent = running ? '就是现在' : state === 'finished' ? '再来一次' : '开始挑战';
  element('button-symbol').textContent = running ? '■' : state === 'finished' ? '↻' : '▶';
  element('button-micro').textContent = running ? 'STOP AT TEN' : state === 'finished' ? 'ONE MORE TRY' : 'LET’S GO';
  element('game-button').setAttribute('aria-label', running ? '停止计时' : '开始计时');
  element('stage-hint').textContent = running ? '盯住数字，在 10.000 秒按停' : '点击按钮，看看你的时间感';
  (/** @type {HTMLInputElement} */ (element('player-name'))).disabled = running;
}

/** @param {import('./scoring.js').RecordEntry} result @param {boolean} isBest */
export function renderResult(result, isBest) {
  const [title, description] = resultMessage(result.errorMs);
  const direction = result.elapsedMs < TARGET_MS ? '提前' : '超时';
  element('result-tag').textContent = result.errorMs === 0 ? 'PERFECT TEN · 完美 10 秒' : isBest ? 'NEW PERSONAL BEST · 个人新纪录' : 'NICE TRY · 挑战完成';
  element('result-title').textContent = title;
  element('result-description').textContent = result.errorMs === 0 ? description : `${direction} ${result.errorMs.toLocaleString()} 毫秒 · ${description}`;
  element('result-score').textContent = String(result.score);
  element('result-panel').classList.toggle('is-best', isBest);
}

/** @param {import('./storage.js').SavedState} state */
export function renderRecords(state) {
  const list = element('leaderboard-list');
  list.replaceChildren();
  const entries = state.entries.slice(0, 10);
  for (const [index, entry] of entries.entries()) {
    const row = document.createElement('li');
    row.className = entry.name === state.name ? 'current-player' : '';
    const rank = document.createElement('span');
    rank.className = `rank rank-${index + 1}`;
    rank.textContent = String(index + 1).padStart(2, '0');
    const player = document.createElement('div');
    player.className = 'rank-player';
    const name = document.createElement('strong');
    name.textContent = entry.name;
    const time = document.createElement('span');
    time.textContent = `${(entry.elapsedMs / 1000).toFixed(3)} 秒${entry.name === state.name ? ' · 你' : ''}`;
    player.append(name, time);
    const error = document.createElement('span');
    error.className = 'rank-error';
    error.textContent = `${entry.errorMs.toLocaleString()} `;
    const unit = document.createElement('small');
    unit.textContent = 'ms';
    error.append(unit);
    row.append(rank, player, error);
    list.append(row);
  }
  element('empty-board').hidden = entries.length > 0;
  element('attempt-count').textContent = String(state.attempts);
  const best = state.entries.find((entry) => entry.name === state.name);
  element('personal-best').replaceChildren(document.createTextNode(best ? String(best.errorMs) : '—'), unit(' ms'));
  element('last-time').replaceChildren(document.createTextNode(state.last ? (state.last.elapsedMs / 1000).toFixed(3) : '—'), unit(' s'));
}

/** @param {string} text */
function unit(text) {
  const small = document.createElement('small');
  small.textContent = text;
  return small;
}
