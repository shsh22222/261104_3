// 思考の雲。書いた思考が雲になって空を流れていく。
// 消すことはできない。つかむと指についてくる。離せば、また流れていく。

import { h, header, ICONS, closeButton, exitRitual, chip } from '../ui.js';
import { go, back } from '../nav.js';
import { CLOUD_DEFAULTS, CLOUD_GUIDE } from '../content.js';
import { addMoment } from '../store.js';
import { bell, keepAwake, unlockAudio } from '../audio.js';

const SPAWN_UNTIL = 84000; // これ以降は雲を出さない
const MAX_WORDS = 6;

function shuffle(a) {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
}

export function cloudsView(root) {
  const words = [];
  let raf = 0;
  let release = () => {};
  let exitEl = null;
  let alive = true;
  const timers = [];

  // ---- はじめる前 ----
  function setup() {
    document.body.classList.remove('immersive');
    const input = h('input', { type: 'text', id: 'cloud-word', maxlength: '24', placeholder: '例: 明日のプレゼン', autocomplete: 'off', enterkeyhint: 'done' });
    const list = h('div', { class: 'chips' });
    const draw = () =>
      list.replaceChildren(
        ...words.map((w, i) =>
          chip(`${w}  ×`, {
            selected: true,
            onclick: () => {
              words.splice(i, 1);
              draw();
            },
          }),
        ),
      );
    const add = () => {
      const v = input.value.trim();
      if (v && words.length < MAX_WORDS && !words.includes(v)) words.push(v);
      input.value = '';
      draw();
      input.focus();
    };
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.isComposing) {
        e.preventDefault();
        add();
      }
    });
    root.replaceChildren(
      header('思考の雲', '思考を止めなくていい。空に流して、ただ眺めます。', h('button', { class: 'icon-btn', 'aria-label': '戻る', onclick: () => go('practice'), svg: ICONS.close })),
      h(
        'div',
        { class: 'page' },
        h('p', { class: 'body-text' }, 'いま頭の中にあることを、一言ずつ書いてください。書いた言葉が雲になって流れていきます。書かなくても始められます。'),
        h('div', { class: 'add-row' }, h('label', { class: 'sr-only', for: 'cloud-word' }, '思考を一言'), input, h('button', { class: 'btn btn-quiet', type: 'button', onclick: add }, '加える')),
        list,
        h('button', { class: 'btn btn-primary btn-wide', id: 'clouds-start', onclick: run }, '空を見る'),
        h('p', { class: 'fine' }, '約2分。雲に触れることはできますが、消すことはできません。'),
      ),
    );
  }

  // ---- 空 ----
  async function run() {
    unlockAudio();
    document.body.classList.add('immersive');
    const guide = h('p', { class: 'cloud-guide in' }, CLOUD_GUIDE[0][1]);
    const layer = h('div', { class: 'cloud-layer' });
    const sky = h('div', { class: 'clouds-sky' }, layer, guide);
    root.replaceChildren(sky, h('div', { class: 'immersive-top over-sky' }, closeButton(() => finish(true))));
    bell('soft');
    keepAwake().then((r) => (alive ? (release = r) : r()));

    const pool = shuffle(words).concat(shuffle(CLOUD_DEFAULTS));
    let poolIndex = 0;
    const clouds = [];
    const started = Date.now();
    let nextSpawn = 400;
    let last = Date.now();
    let held = null;
    let guideIndex = 0;
    let override = 0;
    let ending = false;
    let lastLane = -1;

    function setGuide(text) {
      guide.classList.remove('in');
      void guide.offsetWidth;
      guide.textContent = text;
      guide.classList.add('in');
    }

    function spawn(t) {
      const text = pool[poolIndex % pool.length];
      poolIndex += 1;
      const el = h('span', { class: 'cloud' }, text);
      layer.append(el);
      const W = layer.clientWidth || 360;
      const H = layer.clientHeight || 640;
      // 横を3つの帯に分け、直前の雲とは別の帯に出す（重なりを避ける）
      const lanes = 3;
      let lane = Math.floor(Math.random() * lanes);
      if (lane === lastLane) lane = (lane + 1 + Math.floor(Math.random() * (lanes - 1))) % lanes;
      lastLane = lane;
      const room = Math.max(10, W - el.offsetWidth - 32);
      const c = {
        el,
        x: 16 + Math.min(room, (room / lanes) * (lane + Math.random())),
        y: H + 10,
        vy: 22 + Math.random() * 14, // px/秒
        sway: Math.random() * Math.PI * 2,
        born: t,
      };
      // 書いた言葉は、少しだけ大きく、ゆっくり
      if (words.includes(text)) {
        el.classList.add('own');
        c.vy *= 0.8;
      }
      el.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        held = c;
        c.el.classList.add('held');
        try {
          layer.setPointerCapture(e.pointerId);
        } catch {
          /* noop */
        }
        override = Date.now() + 4000;
        setGuide('つかまえると、ついていってしまう。');
      });
      clouds.push(c);
    }

    layer.addEventListener('pointermove', (e) => {
      if (!held) return;
      const r = layer.getBoundingClientRect();
      held.x = e.clientX - r.left - held.el.offsetWidth / 2;
      held.y = e.clientY - r.top - held.el.offsetHeight / 2;
    });
    const drop = () => {
      if (!held) return;
      held.el.classList.remove('held');
      held = null;
      override = Date.now() + 3500;
      setGuide('手を離すと、また流れていく。');
    };
    layer.addEventListener('pointerup', drop);
    layer.addEventListener('pointercancel', drop);

    function frame() {
      if (!alive) return;
      const now = Date.now();
      const t = now - started;
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;

      if (t < SPAWN_UNTIL && t >= nextSpawn) {
        spawn(t);
        // 後半ほど雲は少なく、空が広くなる
        nextSpawn = t + 2200 + (t / SPAWN_UNTIL) * 4200;
      }

      const H = layer.clientHeight || 640;
      for (let i = clouds.length - 1; i >= 0; i--) {
        const c = clouds[i];
        if (c !== held) {
          c.y -= c.vy * dt;
          c.sway += dt * 0.6;
        }
        const dx = c === held ? 0 : Math.sin(c.sway) * 6;
        const age = t - c.born;
        const top = Math.max(0, Math.min(1, c.y / (H * 0.35)));
        const op = Math.min(1, age / 1500) * (c === held ? 1 : top);
        c.el.style.transform = `translate(${c.x + dx}px, ${c.y}px)`;
        c.el.style.opacity = String(op);
        if (c.y < -60 && c !== held) {
          c.el.remove();
          clouds.splice(i, 1);
        }
      }

      if (now > override) {
        const nextGuide = CLOUD_GUIDE[guideIndex + 1];
        if (nextGuide && t >= nextGuide[0]) {
          guideIndex += 1;
          setGuide(nextGuide[1]);
        } else if (override) {
          override = 0; // 一時的な言葉のあとは、いまの段の言葉に戻す
          setGuide(CLOUD_GUIDE[guideIndex][1]);
        }
      }

      if (!ending && t > SPAWN_UNTIL && clouds.length === 0) {
        ending = true;
        override = Infinity;
        setGuide('雲が去っても、空は空のまま。');
        timers.push(setTimeout(() => finish(false), 7000));
      }
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
  }

  function finish(early) {
    cancelAnimationFrame(raf);
    release();
    release = () => {};
    if (early) {
      back();
      return;
    }
    addMoment('clouds');
    bell('bowl');
    exitEl = exitRitual({
      lines: ['雲は、いまも流れています。', 'あなたは、それを見ている空です。'],
      actions: [h('button', { class: 'btn', onclick: back }, '閉じる')],
    });
    root.replaceChildren(h('div', { class: 'stage' }, exitEl));
  }

  setup();
  return () => {
    alive = false;
    cancelAnimationFrame(raf);
    timers.forEach(clearTimeout);
    release();
    exitEl?._cleanup?.();
  };
}
