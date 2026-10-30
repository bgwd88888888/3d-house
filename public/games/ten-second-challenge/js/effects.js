let enabled = false;
/** @type {AudioContext | undefined} */
let context;

export function toggleSound() {
  enabled = !enabled;
  return enabled;
}

/** @param {'start' | 'stop' | 'record'} kind */
export function playSound(kind) {
  if (!enabled) return;
  try {
    context ??= new AudioContext();
    void context.resume().catch(() => {});
    const notes = kind === 'record' ? [523, 659, 784, 1046] : kind === 'start' ? [440, 660] : [660, 440];
    notes.forEach((frequency, index) => {
      if (!context) return;
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const start = context.currentTime + index * 0.08;
      oscillator.type = 'sine';
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.08, start + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.24);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start(start);
      oscillator.stop(start + 0.25);
      oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
    });
  } catch { /* Audio is optional; timing remains available. */ }
}

/** @param {HTMLElement} container */
export function celebrate(container) {
  container.replaceChildren();
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const colors = ['#fc693e', '#a59ae4', '#f5c75c', '#73b6a2'];
  for (let index = 0; index < 30; index += 1) {
    const piece = document.createElement('i');
    piece.style.setProperty('--x', `${(Math.random() - 0.5) * 520}px`);
    piece.style.setProperty('--y', `${-90 - Math.random() * 230}px`);
    piece.style.setProperty('--rotation', `${Math.random() * 720}deg`);
    piece.style.background = colors[index % colors.length];
    piece.style.animationDelay = `${Math.random() * 0.12}s`;
    piece.addEventListener('animationend', () => piece.remove(), { once: true });
    container.append(piece);
  }
}
