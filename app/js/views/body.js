// インナーボディの図。体の内側の「生きている感じ」を、やわらかな光として見せる。
// 光が当たる場所 = 注意を置く場所。吸う息で満ち、吐く息で広がる。

import { h, header, ICONS, chip } from '../ui.js';
import { go } from '../nav.js';
import { settings, setSetting } from '../store.js';
import { ENTRIES } from '../content.js';

export const REGIONS = ['head', 'chest', 'belly', 'arms', 'hands', 'legs', 'feet', 'whole'];

// [領域, cx, cy, r]
const SPOTS = [
  ['head', 100, 40, 24],
  ['chest', 100, 100, 30],
  ['belly', 100, 146, 30],
  ['arms', 58, 122, 20],
  ['arms', 142, 122, 20],
  ['hands', 45, 178, 22],
  ['hands', 155, 178, 22],
  ['legs', 87, 222, 22],
  ['legs', 113, 222, 22],
  ['feet', 85, 278, 20],
  ['feet', 115, 278, 20],
];

let uid = 0;

function svg() {
  uid += 1;
  const g = `ibg${uid}`;
  const f = `ibf${uid}`;
  const spots = SPOTS.map(([r, cx, cy, rad]) => `<circle class="glow" data-r="${r}" cx="${cx}" cy="${cy}" r="${rad}" fill="url(#${g})"/>`).join('');
  return `<svg viewBox="0 0 200 300" aria-hidden="true">
  <defs>
    <radialGradient id="${g}"><stop offset="0" style="stop-color:var(--glow-core)" stop-opacity="1"/><stop offset=".45" style="stop-color:var(--glow-mid)" stop-opacity=".7"/><stop offset="1" style="stop-color:var(--glow-mid)" stop-opacity="0"/></radialGradient>
    <radialGradient id="${f}" cx="50%" cy="52%" r="55%"><stop offset="0" style="stop-color:var(--glow-mid)" stop-opacity=".55"/><stop offset="1" style="stop-color:var(--glow-mid)" stop-opacity="0"/></radialGradient>
  </defs>
  <ellipse class="field" cx="100" cy="160" rx="96" ry="150" fill="url(#${f})"/>
  <g class="silhouette">
    <circle cx="100" cy="40" r="21"/>
    <rect x="72" y="68" width="56" height="106" rx="26"/>
    <path d="M74 80 L50 172" stroke-width="17" stroke-linecap="round"/>
    <path d="M126 80 L150 172" stroke-width="17" stroke-linecap="round"/>
    <path d="M89 168 L86 276" stroke-width="20" stroke-linecap="round"/>
    <path d="M111 168 L114 276" stroke-width="20" stroke-linecap="round"/>
  </g>
  ${spots}
</svg>`;
}

/**
 * インナーボディの図をつくる。
 * @returns {{ el: HTMLElement, light: (regions: string|string[]) => void, phase: (p: 'in'|'out'|null, sec?: number) => void }}
 */
export function bodyFigure(extraClass = '') {
  const el = h('div', { class: 'figure ' + extraClass, svg: svg() });
  const glows = [...el.querySelectorAll('.glow')];
  function light(regions) {
    const list = [].concat(regions || []);
    const whole = list.includes('whole');
    el.classList.toggle('is-whole', whole);
    for (const g of glows) g.classList.toggle('on', whole || list.includes(g.dataset.r));
  }
  function phase(p, sec = 4) {
    el.style.setProperty('--phase-dur', `${sec}s`);
    if (p) el.dataset.phase = p;
    else delete el.dataset.phase;
  }
  return { el, light, phase };
}

/** 入口の領域（手から入る人、足から入る人…）。 */
export function entryRegions(entry) {
  return entry === 'whole' ? ['whole'] : [entry];
}

/** #body-entry 感じやすい入口を選ぶ。 */
export function entryView(root) {
  const fig = bodyFigure('figure-preview resting');
  const box = h('div', { class: 'chips' });
  const note = h('p', { class: 'body-text entry-note' });
  const draw = () => {
    const cur = settings().bodyEntry;
    const e = ENTRIES.find((x) => x.id === cur) || ENTRIES[0];
    fig.light(entryRegions(e.id));
    note.textContent = e.note;
    box.replaceChildren(
      ...ENTRIES.map((x) =>
        chip(x.label, {
          selected: x.id === cur,
          onclick: () => {
            setSetting('bodyEntry', x.id);
            draw();
          },
        }),
      ),
    );
  };
  draw();
  root.append(
    header('体の入口', 'インナーボディは、感じやすい場所から入ると深まりやすくなります。指を置くとき、ここから光がひろがります。', h('button', { class: 'icon-btn', 'aria-label': 'いまに戻る', onclick: () => go('home'), svg: ICONS.close })),
    h('div', { class: 'page entry' }, fig.el, box, note, h('p', { class: 'fine' }, '日によって感じやすい場所は変わります。いつでも変えられます。')),
  );
}
