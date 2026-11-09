// 呼吸とともに。吸うあいだ指を置き、吐くあいだ離す。
// アプリが呼吸を導くのではなく、体の呼吸に、指と光がついていく。

import { h, closeButton, exitRitual } from '../ui.js';
import { back } from '../nav.js';
import { bodyFigure } from './body.js';
import { addMoment } from '../store.js';
import { bell, haptic, keepAwake, unlockAudio } from '../audio.js';
import { rhythmTrend, RHYTHM_WORDS } from '../lib/rhythm.js';

const MAX_CYCLES = 12;
const MAX_MS = 180000;

export function breatheWithView(root) {
  const stage = h('div', { class: 'stage breathe-with' });
  root.append(h('div', { class: 'immersive-top' }, closeButton(() => done(true))), stage);
  let release = () => {};
  let exitEl = null;
  let alive = true;
  let timer = null;

  stage.append(
    h('p', { class: 'eyebrow' }, '呼吸とともに'),
    h('h1', { class: 'sos-q', tabindex: '-1' }, '吸うあいだ、指を置く。吐くあいだ、離す。'),
    h('p', { class: 'body-text' }, '呼吸を変えなくていい。体がしている呼吸に、指がついていくだけです。お腹の内側の、ふくらみとしぼみを感じながら。'),
    h('button', { class: 'btn btn-primary', id: 'bw-start', onclick: run }, 'はじめる'),
  );

  const cycles = [];
  let fig;

  function run() {
    unlockAudio();
    keepAwake().then((r) => (alive ? (release = r) : r()));
    fig = bodyFigure('breathing');
    fig.light(['belly', 'chest']);
    const line = h('p', { class: 'hold-line in' }, 'ここに指を置いて、吸いはじめる。');
    const pad = h('button', { class: 'breath-pad', id: 'bw-pad', 'aria-label': '吸うあいだ押さえ、吐くあいだ離す' }, fig.el);
    stage.replaceChildren(pad, line, h('button', { class: 'btn btn-quiet', onclick: () => done(false) }, 'おわる'));
    bell('soft');

    let downAt = 0;
    let upAt = 0;
    let cur = null;
    const say = (t) => {
      line.classList.remove('in');
      void line.offsetWidth;
      line.textContent = t;
      line.classList.add('in');
    };
    const avgIn = () => {
      const l = cycles.slice(-3);
      return l.length ? Math.min(7, Math.max(1.5, l.reduce((a, c) => a + c.inhale, 0) / l.length / 1000)) : 3.5;
    };
    const avgOut = () => {
      const l = cycles.slice(-3).filter((c) => c.exhale);
      return l.length ? Math.min(9, Math.max(2, l.reduce((a, c) => a + c.exhale, 0) / l.length / 1000)) : 4.5;
    };

    const press = (e) => {
      e.preventDefault();
      if (downAt) return;
      try {
        pad.setPointerCapture(e.pointerId);
      } catch {
        /* noop */
      }
      const now = Date.now();
      if (cur && upAt) {
        cur.exhale = now - upAt;
        cycles.push(cur);
      }
      downAt = now;
      cur = { inhale: 0, exhale: 0 };
      fig.phase('in', avgIn());
      haptic(12);
      if (cycles.length === 2) say('お腹の内側が、満ちていく。');
      if (cycles.length === 5) say('体が呼吸しているのを、指が追いかけています。');
      if (cycles.length === 8) say('呼吸の波の、いちばん奥の静けさ。');
      if (cycles.length >= MAX_CYCLES) done(false);
    };
    const lift = () => {
      if (!downAt) return;
      upAt = Date.now();
      cur.inhale = upAt - downAt;
      downAt = 0;
      fig.phase('out', avgOut());
    };
    pad.addEventListener('pointerdown', press);
    pad.addEventListener('pointerup', lift);
    pad.addEventListener('pointercancel', lift);
    pad.addEventListener('contextmenu', (e) => e.preventDefault());
    timer = setTimeout(() => done(false), MAX_MS);
  }

  function done(early) {
    clearTimeout(timer);
    release();
    release = () => {};
    if (early) {
      back();
      return;
    }
    if (exitEl) return;
    addMoment('breath', { label: '呼吸とともに' });
    bell('bowl');
    exitEl = exitRitual({
      title: '体が、呼吸していました。',
      lines: [RHYTHM_WORDS[rhythmTrend(cycles)]],
      actions: [h('button', { class: 'btn', onclick: back }, '閉じる')],
    });
    stage.replaceChildren(exitEl);
  }

  return () => {
    alive = false;
    clearTimeout(timer);
    release();
    exitEl?._cleanup?.();
  };
}
