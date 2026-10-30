import { createResult, normalizeName, updateLeaderboard } from './scoring.js';
import { loadState, saveState } from './storage.js';
import { ChallengeTimer } from './timer.js';
import { celebrate, playSound, toggleSound } from './effects.js';
import { element, renderTime, renderPhase, renderResult, renderRecords } from './view.js';

const loaded = loadState();
const state = loaded.state;
const nameInput = /** @type {HTMLInputElement} */ (element('player-name'));
const timer = new ChallengeTimer(renderTime);
nameInput.value = state.name;
renderRecords(state);
if (!loaded.available) showStorageNotice();

function showStorageNotice() {
  element('storage-notice').textContent = '本地存储暂不可用或历史数据无法读取，本次成绩仍可在当前页面查看。';
}

function persist() {
  if (!saveState(state)) showStorageNotice();
  else element('storage-notice').textContent = '';
}

function activate() {
  if (timer.running) {
    const elapsed = timer.stop();
    const result = createResult(elapsed, state.name, Date.now());
    const previous = state.entries.find((entry) => entry.name === state.name);
    const isBest = !previous || result.errorMs < previous.errorMs;
    state.entries = updateLeaderboard(state.entries, result);
    state.attempts += 1;
    state.last = result;
    renderPhase('finished');
    renderResult(result, isBest);
    renderRecords(state);
    persist();
    playSound(isBest ? 'record' : 'stop');
    if (isBest) celebrate(element('confetti'));
    return;
  }
  state.name = normalizeName(nameInput.value);
  nameInput.value = state.name;
  timer.start();
  element('confetti').replaceChildren();
  renderPhase('running');
  playSound('start');
}

element('game-button').addEventListener('click', activate);
nameInput.addEventListener('change', () => {
  state.name = normalizeName(nameInput.value);
  nameInput.value = state.name;
  renderRecords(state);
  persist();
});

document.addEventListener('keydown', (event) => {
  if (event.code !== 'Space' || event.altKey || event.ctrlKey || event.metaKey) return;
  const target = event.target;
  if (target instanceof HTMLElement && (target.isContentEditable || target.closest('input, textarea, select, a') || (target.closest('button') && target.closest('button')?.id !== 'game-button'))) return;
  event.preventDefault();
  if (!event.repeat) activate();
});

document.addEventListener('visibilitychange', () => {
  if (!document.hidden || !timer.running) return;
  timer.cancel();
  renderTime(0);
  renderPhase('idle');
  element('stage-hint').textContent = '刚才离开了页面，本轮已取消，点击重新开始';
});

element('sound-toggle').addEventListener('click', () => {
  const enabled = toggleSound();
  element('sound-toggle').setAttribute('aria-pressed', String(enabled));
  element('sound-toggle').setAttribute('aria-label', enabled ? '关闭音效' : '开启音效');
  element('sound-label').textContent = enabled ? '开' : '关';
  if (enabled) playSound('start');
});
