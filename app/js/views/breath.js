import { h, closeButton, exitRitual } from '../ui.js';
import { bell, haptic } from '../audio.js';
import { addMoment, settings } from '../store.js';
import { back } from '../nav.js';

const SMALL = 0.62;

/** 呼吸の速さ（秒）。吐く息を吸う息より長くすると、体は落ち着く方へ向かう。 */
export const PACES = {
  calm: { inhale: 4, exhale: 6, label: 'ゆったり（吸う4秒・吐く6秒）' },
  deep: { inhale: 5, exhale: 7, label: 'さらにゆっくり（吸う5秒・吐く7秒）' },
  even: { inhale: 5, exhale: 5, label: '均等（吸う5秒・吐く5秒）' },
};
export function pace() {
  return PACES[settings().breathPace] || PACES.calm;
}

/** 呼吸の拍。吸う・吐くの切り替わりで呼ばれる。 */
export function breathLoop({ onInhale, onExhale, onDone, cycles = Infinity, delay = 1300 } = {}) {
  let cancelled = false;
  const timers = [];
  const wait = (ms, fn) => timers.push(setTimeout(() => !cancelled && fn(), ms));
  const { inhale: IN, exhale: OUT } = pace();
  let count = 0;
  const inhale = () => {
    onInhale?.(IN);
    wait(IN * 1000, exhale);
  };
  const exhale = () => {
    onExhale?.(OUT);
    wait(OUT * 1000, () => {
      count += 1;
      if (count < cycles) inhale();
      else onDone?.();
    });
  };
  wait(delay, inhale);
  return () => {
    cancelled = true;
    timers.forEach(clearTimeout);
  };
}

/** 呼吸の円。 */
export function orb(extraClass = '') {
  return h('div', { class: 'orb ' + extraClass, 'aria-hidden': 'true' }, h('div', { class: 'orb-halo' }), h('div', { class: 'orb-core' }));
}

export function runBreath(orbEl, labelEl, { cycles = 1, onDone } = {}) {
  orbEl.style.transition = 'transform 1.2s ease';
  orbEl.style.transform = `scale(${SMALL})`;
  labelEl.textContent = '';
  return breathLoop({
    cycles,
    onInhale: (s) => {
      labelEl.textContent = '吸って';
      haptic(18);
      orbEl.style.transition = `transform ${s}s cubic-bezier(.37,0,.63,1)`;
      orbEl.style.transform = 'scale(1)';
    },
    onExhale: (s) => {
      labelEl.textContent = '吐いて';
      haptic(8);
      orbEl.style.transition = `transform ${s}s cubic-bezier(.37,0,.63,1)`;
      orbEl.style.transform = `scale(${SMALL})`;
    },
    onDone: () => {
      labelEl.textContent = '';
      onDone?.();
    },
  });
}

/** #breath 意識的な一呼吸。 */
export function breathView(root) {
  let stop = () => {};
  let exitEl = null;

  const stage = h('div', { class: 'stage' });
  root.append(
    h('div', { class: 'immersive-top' }, closeButton(back)),
    stage,
  );

  function start() {
    stage.replaceChildren();
    exitEl?._cleanup?.();
    const o = orb('orb-breath');
    const label = h('p', { class: 'breath-label', 'aria-live': 'polite' });
    const hint = h('p', { class: 'breath-hint' }, 'ただ、一つの呼吸を感じます。');
    stage.append(h('div', { class: 'orb-wrap' }, o), label, hint);
    stop = runBreath(o, label, {
      onDone: () => {
        addMoment('breath');
        bell('soft');
        finish();
      },
    });
  }

  function finish() {
    stage.replaceChildren();
    exitEl = exitRitual({
      actions: [
        h('button', { class: 'btn btn-quiet', onclick: start }, 'もう一呼吸'),
        h('button', { class: 'btn', onclick: back }, '閉じる'),
      ],
    });
    stage.append(exitEl);
  }

  start();
  return () => {
    stop();
    exitEl?._cleanup?.();
  };
}
