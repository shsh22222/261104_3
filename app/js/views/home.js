import { h, ICONS, toast } from '../ui.js';
import { bodyFigure, entryRegions } from './body.js';
import { attachHold, showOutward } from './presence.js';
import { go } from '../nav.js';
import { get, settings, addMoment } from '../store.js';
import { INQUIRIES, ANCHORS, ENTRIES } from '../content.js';
import { seasonFor } from '../lib/seasons.js';
import { partOfDay, pickDaily, skyTone } from '../lib/day.js';

function anchorRows() {
  const chosen = get().anchors.map((id) => ANCHORS.find((a) => a.id === id)).filter(Boolean);
  if (!chosen.length) return null;
  return h(
    'ul',
    { class: 'anchor-mini' },
    chosen.map((a) =>
      h(
        'li',
        null,
        h('div', { class: 'anchor-mini-text' }, h('strong', null, a.when), h('span', null, a.what)),
        h(
          'button',
          {
            class: 'btn btn-small btn-quiet',
            onclick: (e) => {
              addMoment('anchor', { label: a.when });
              e.currentTarget.textContent = '感じた';
              e.currentTarget.disabled = true;
            },
          },
          'いま感じた',
        ),
      ),
    ),
  );
}

/** 時間帯に合ったワークを、一つだけ差し出す。 */
function nextWork(now) {
  const part = partOfDay(now);
  const W = {
    morning: { when: '朝のワーク', title: '目覚めの体', note: '起き上がる前に、体の内側を感じてから一日を始める。', min: '1分', to: 'play-waking', extra: anchorRows },
    day: { when: '昼のワーク', title: '目を開けたまま', note: '体の内側に根を下ろしたまま、目の前の世界を見る。', min: '2分', to: 'play-eyes-open' },
    evening: { when: '夕べのワーク', title: '呼吸とともに', note: '吸うあいだ指を置き、吐くあいだ離す。体の呼吸に、指がついていく。', min: '2分', to: 'breathe-with' },
    night: { when: '夜のワーク', title: '眠る前に', note: '横になって、体の内側へ。終わりの鐘は鳴りません。', min: '3分', to: 'play-sleep' },
  }[part];
  return h(
    'section',
    { class: 'work' },
    h(
      'button',
      { class: 'work-main', onclick: () => go(W.to) },
      h('span', { class: 'eyebrow' }, W.when),
      h('span', { class: 'work-title' }, W.title, h('span', { class: 'work-min' }, W.min)),
      h('span', { class: 'work-note' }, W.note),
      h('span', { class: 'work-go', svg: ICONS.arrow }),
    ),
    W.extra ? W.extra() : null,
  );
}

export function homeView(root) {
  const now = new Date();
  const s = settings();
  const season = seasonFor(now);
  root.style.setProperty('--now-glow', skyTone(now).glow);

  const entry = ENTRIES.find((e) => e.id === s.bodyEntry) || ENTRIES[0];
  const fig = bodyFigure('resting');
  fig.light(entryRegions(entry.id));
  const line = h('p', { class: 'hold-line', 'aria-live': 'polite' });
  const hint = h('p', { class: 'hold-hint' }, '指を置いて、体の内側へ');
  const orbBtn = h('button', { class: 'figure-btn', 'aria-label': '指を置く（長押し）。体の内側を感じる' }, fig.el);
  const entryLink = h('button', { class: 'entry-link', onclick: () => go('body-entry') }, `入口: ${entry.label}`);
  let closeOutward = () => {};
  const detach = attachHold(orbBtn, {
    figure: fig,
    line,
    onTap: () => toast('指を置いたまま、待ってみてください。'),
    onRelease: (held) => {
      if (held > 2500) closeOutward = showOutward();
    },
  });

  const top = h(
    'div',
    { class: 'home-top' },
    h('p', { class: 'home-date' }, h('span', { class: 'home-day' }, `${now.getMonth() + 1}月${now.getDate()}日`), h('span', null, season.sekki), h('span', { class: 'home-ko' }, season.ko)),
    h('button', { class: 'icon-btn', 'aria-label': '設定', onclick: () => go('prefs'), svg: ICONS.gear }),
  );

  const center = h('div', { class: 'home-center hold-keep' }, orbBtn, line, h('div', { class: 'hold-meta' }, hint, entryLink));
  const inquiry = h('button', { class: 'inquiry', onclick: () => go('inquiry') }, h('span', { class: 'eyebrow' }, '今日の問い'), h('span', { class: 'inquiry-text' }, pickDaily(INQUIRIES, now)));

  if (s.minimal) {
    root.append(h('div', { class: 'home home-minimal hold-scope' }, top, h('h1', { class: 'sr-only', tabindex: '-1' }, 'いま'), center, inquiry));
  } else {
    root.append(
      h(
        'div',
        { class: 'home hold-scope' },
        top,
        h('h1', { class: 'sr-only', tabindex: '-1' }, 'いま'),
        center,
        inquiry,
        nextWork(now),
        h(
          'div',
          { class: 'side-doors' },
          h('button', { class: 'side-door', onclick: () => go('play-hands') }, '手のいのち'),
          h('button', { class: 'side-door', onclick: () => go('play-body-breath') }, '体が呼吸している'),
          h('button', { class: 'side-door is-sos', onclick: () => go('sos') }, 'いま、揺れている'),
          h('button', { class: 'side-door', onclick: () => go('clouds') }, '思考の雲'),
        ),
        h(
          'section',
          { class: 'season', 'aria-label': '今日の候' },
          h('p', { class: 'eyebrow' }, '七十二候（目安）'),
          h('p', { class: 'season-name' }, h('ruby', null, season.ko, h('rt', null, season.koKana))),
          h('p', { class: 'season-gloss' }, season.gloss + '頃。窓の外に、この季節のしるしを一つ探してみる。'),
        ),
      ),
    );
  }
  return () => {
    detach();
    closeOutward();
  };
}
