import { h, header, ICONS, toast } from '../ui.js';
import { go } from '../nav.js';
import { analyzePerception } from '../lib/perception.js';
import { addMoment, get, settings } from '../store.js';
import { starAlpha } from '../lib/sky.js';
import { relativeDay } from '../lib/day.js';

/** #haiku 今の一句（写生）。評価や物語の言葉に、そっと気づく。 */
export function haikuView(root) {
  root.append(
    header('今の一句', '見えるもの、聞こえるもの、体の感覚だけで。評価や物語は、いったん脇に置きます。', h('button', { class: 'icon-btn', 'aria-label': '戻る', onclick: () => go('daily'), svg: ICONS.close })),
  );

  const example = h(
    'figure',
    { class: 'haiku-example' },
    h('blockquote', null, '古池や　蛙飛び込む　水の音'),
    h('figcaption', null, '芭蕉。感想は一語もなく、ただ音がある。'),
  );

  const ta = h('textarea', { id: 'haiku-text', rows: '3', maxlength: '200', placeholder: '例: 湯気がゆれる　窓の外で鳥の声', 'aria-describedby': 'haiku-mirror' });
  const mirror = h('div', { class: 'mirror', id: 'haiku-mirror', 'aria-live': 'polite' });
  const save = h('button', { class: 'btn btn-primary', disabled: true }, '夜空に置く');

  function reflect() {
    const v = ta.value.trim();
    save.disabled = !v;
    mirror.replaceChildren();
    if (!v) return;
    const { notes, senses } = analyzePerception(v);
    if (!notes.length) {
      mirror.append(h('p', { class: 'mirror-ok' }, senses ? '感覚の言葉が、そのまま生きています。' : '評価の言葉は見当たりません。'));
      return;
    }
    for (const n of notes) {
      mirror.append(
        h('div', { class: 'mirror-note' }, h('p', { class: 'mirror-label' }, n.label, h('span', { class: 'mirror-words' }, n.words.map((w) => h('mark', null, w)))), h('p', { class: 'mirror-hint' }, n.hint)),
      );
    }
  }
  ta.addEventListener('input', reflect);

  save.addEventListener('click', () => {
    const v = ta.value.trim();
    if (!v) return;
    addMoment('haiku', { text: v });
    ta.value = '';
    reflect();
    toast(`夜空に置きました。${settings().fadeDays}日で消えていきます。`);
    renderRecent();
  });

  const recent = h('ul', { class: 'words' });
  function renderRecent() {
    const now = Date.now();
    const items = get()
      .moments.filter((m) => m.type === 'haiku' && m.text)
      .slice(-12)
      .reverse();
    recent.replaceChildren(
      ...items.map((m) =>
        h('li', { style: { opacity: String(0.35 + 0.65 * starAlpha(m.t, now, settings().fadeDays)) } }, h('p', { class: 'words-text' }, m.text), h('p', { class: 'fine' }, relativeDay(m.t, now))),
      ),
    );
    recentWrap.hidden = !items.length;
  }
  const recentWrap = h('section', { class: 'group' }, h('h2', { class: 'group-title' }, 'まだ消えていない句', h('span', { class: 'group-note' }, '少しずつ薄れていきます')), recent);

  root.append(
    h('div', { class: 'page' }, example, h('label', { class: 'field', for: 'haiku-text' }, h('span', { class: 'field-label' }, 'いま、ここにあるもの'), ta), mirror, h('div', { class: 'daily-actions' }, save)),
    recentWrap,
  );
  renderRecent();
}
