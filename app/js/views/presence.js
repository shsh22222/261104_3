// 「指を置く」── このアプリで唯一の、何もしないための操作。
// 指を置いているあいだだけ、周りが消え、円が呼吸し、言葉が一つずつ現れる。

import { h } from '../ui.js';
import { runBreath } from './breath.js';
import { bell, haptic, unlockAudio } from '../audio.js';
import { addMoment } from '../store.js';
import { HOLD_LINES, OUTWARD } from '../content.js';

const ENTER_MS = 550; // これより短い接触は「タップ」として扱う

export function pickOutward() {
  return OUTWARD[Math.floor(Math.random() * OUTWARD.length)];
}

/**
 * @param {HTMLElement} btn  指を置く要素（中に .orb を含む）
 * @param {{ line?: HTMLElement, onEnter?: () => void, onRelease?: (heldMs:number) => void, onTap?: () => void }} opts
 * @returns {() => void} 後片付け
 */
export function attachHold(btn, { line, onEnter, onRelease, onTap } = {}) {
  const orbEl = btn.querySelector('.orb');
  let downAt = 0;
  let entered = false;
  let enterTimer = null;
  let restTimer = null;
  let lineTimers = [];
  let stopBreath = () => {};

  function showLine(text) {
    if (!line) return;
    line.classList.remove('in');
    void line.offsetWidth;
    line.textContent = text;
    line.classList.add('in');
  }

  function start(e) {
    if (downAt) return;
    unlockAudio();
    downAt = Date.now();
    if (e && e.pointerId != null) {
      try {
        btn.setPointerCapture(e.pointerId);
      } catch {
        /* noop */
      }
    }
    btn.classList.add('is-pressing');
    clearTimeout(restTimer);
    enterTimer = setTimeout(enter, ENTER_MS);
  }

  function enter() {
    entered = true;
    document.body.classList.add('holding');
    orbEl.classList.remove('orb-rest');
    bell('soft');
    haptic(20);
    stopBreath = runBreath(orbEl, document.createElement('span'), { cycles: 999 });
    lineTimers = HOLD_LINES.map(([at, text]) => setTimeout(() => showLine(text), at));
    onEnter?.();
  }

  function settle() {
    stopBreath();
    lineTimers.forEach(clearTimeout);
    lineTimers = [];
    document.body.classList.remove('holding');
    orbEl.style.transition = 'transform 1.6s cubic-bezier(.37,0,.63,1)';
    orbEl.style.transform = 'scale(0.76)';
    restTimer = setTimeout(() => {
      orbEl.style.transition = '';
      orbEl.style.transform = '';
      orbEl.classList.add('orb-rest');
    }, 1600);
    if (line) {
      line.classList.remove('in');
      line.textContent = '';
    }
  }

  function end() {
    if (!downAt) return;
    const held = Date.now() - downAt;
    downAt = 0;
    clearTimeout(enterTimer);
    btn.classList.remove('is-pressing');
    if (!entered) {
      onTap?.();
      return;
    }
    entered = false;
    settle();
    if (held > 3000) addMoment('hold');
    bell('soft');
    onRelease?.(held);
  }

  btn.addEventListener('pointerdown', (e) => {
    if (e.button > 0) return;
    e.preventDefault();
    start(e);
  });
  btn.addEventListener('pointerup', end);
  btn.addEventListener('pointercancel', end);
  btn.addEventListener('lostpointercapture', end);
  btn.addEventListener('contextmenu', (e) => e.preventDefault());
  btn.addEventListener('keydown', (e) => {
    if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) {
      e.preventDefault();
      start();
    }
  });
  btn.addEventListener('keyup', (e) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      end();
    }
  });

  return () => {
    clearTimeout(enterTimer);
    clearTimeout(restTimer);
    stopBreath();
    lineTimers.forEach(clearTimeout);
    document.body.classList.remove('holding');
  };
}

/** 指を離したあとの最後のカット。「目を上げて」と、具体的な知覚を一つ。 */
export function showOutward({ ms = 9000 } = {}) {
  const el = h(
    'div',
    { class: 'outward', role: 'status' },
    h('p', { class: 'outward-title' }, '目を上げて。'),
    h('p', { class: 'outward-line' }, pickOutward()),
  );
  const close = () => {
    el.classList.add('leaving');
    setTimeout(() => el.remove(), 1200);
  };
  el.addEventListener('pointerdown', close, { once: true });
  document.body.append(el);
  requestAnimationFrame(() => el.classList.add('show'));
  const t = setTimeout(close, ms);
  return () => {
    clearTimeout(t);
    el.remove();
  };
}
