import { h, closeButton, exitRitual } from '../ui.js';
import { bell, haptic } from '../audio.js';
import { addMoment } from '../store.js';
import { back } from '../nav.js';

export const INHALE = 4;
export const EXHALE = 6;
const SMALL = 0.62;

/** 呼吸の円。吸って4秒、吐いて6秒。吐く息を長くすると体は落ち着く方へ向かう。 */
export function orb(extraClass = '') {
  return h('div', { class: 'orb ' + extraClass, 'aria-hidden': 'true' }, h('div', { class: 'orb-halo' }), h('div', { class: 'orb-core' }));
}

export function runBreath(orbEl, labelEl, { cycles = 1, onDone } = {}) {
  let cancelled = false;
  const timers = [];
  const wait = (ms, fn) => timers.push(setTimeout(() => !cancelled && fn(), ms));
  let count = 0;
  orbEl.style.transition = 'transform 1.2s ease';
  orbEl.style.transform = `scale(${SMALL})`;
  labelEl.textContent = '';

  const inhale = () => {
    labelEl.textContent = '吸って';
    haptic(18);
    orbEl.style.transition = `transform ${INHALE}s cubic-bezier(.37,0,.63,1)`;
    orbEl.style.transform = 'scale(1)';
    wait(INHALE * 1000, exhale);
  };
  const exhale = () => {
    labelEl.textContent = '吐いて';
    haptic(8);
    orbEl.style.transition = `transform ${EXHALE}s cubic-bezier(.37,0,.63,1)`;
    orbEl.style.transform = `scale(${SMALL})`;
    wait(EXHALE * 1000, () => {
      count += 1;
      if (count < cycles) inhale();
      else {
        labelEl.textContent = '';
        onDone?.();
      }
    });
  };
  wait(1300, inhale);
  return () => {
    cancelled = true;
    timers.forEach(clearTimeout);
  };
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
