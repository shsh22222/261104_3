import { h } from '../ui.js';
import { go } from '../nav.js';
import { update } from '../store.js';
import { orb } from './breath.js';
import { unlockAudio } from '../audio.js';

const SLIDES = [
  {
    title: '間',
    kana: 'ま',
    lines: ['思考と思考のあいだには、', '静かな「間」があります。', 'このアプリは、それを思い出すための', '小さな鐘です。'],
  },
  {
    title: 'あなたを、画面に引き留めません。',
    lines: ['使うのは一日に数回、数十秒。', '終わったら、画面から目を上げてください。'],
  },
  {
    title: '記録は、星になって消えていきます。',
    lines: ['数えず、比べず、競いません。', '在ることは、記録の中ではなく、', 'いま、ここにあります。'],
    fine: '医療や心理療法の代わりにはなれません。つらさが強いときは、専門家や相談窓口を頼ってください。',
  },
];

/** #welcome はじめの案内。 */
export function welcomeView(root) {
  let k = 0;
  const stage = h('div', { class: 'stage welcome' });
  root.append(stage);

  const finish = (target) => {
    update((st) => (st.onboarded = true));
    unlockAudio();
    go(target);
  };

  function draw() {
    const s = SLIDES[k];
    const last = k === SLIDES.length - 1;
    const parts = [
      k === 0 ? h('div', { class: 'orb-wrap orb-wrap-small' }, orb('orb-rest')) : null,
      s.kana
        ? h('h1', { class: 'welcome-mark', tabindex: '-1' }, h('ruby', null, s.title, h('rt', null, s.kana)))
        : h('h1', { class: 'welcome-title', tabindex: '-1' }, s.title),
      h('p', { class: 'welcome-lines' }, s.lines.map((l) => h('span', null, l))),
      s.fine ? h('p', { class: 'fine' }, s.fine) : null,
      h('div', { class: 'dots', 'aria-hidden': 'true' }, SLIDES.map((_, i) => h('span', { class: i === k ? 'on' : '' }))),
      h(
        'div',
        { class: 'exit-actions' },
        last
          ? h('button', { class: 'btn btn-primary', id: 'welcome-start', onclick: () => finish('breath') }, '最初の一呼吸へ')
          : h('button', { class: 'btn btn-primary', id: 'welcome-next', onclick: () => ((k += 1), draw()) }, '次へ'),
        !last ? h('button', { class: 'link-btn', onclick: () => finish('home') }, 'とばす') : null,
      ),
    ];
    // replaceChildren は null を文字列 "null" にしてしまうので、取り除いてから渡す
    stage.replaceChildren(...parts.filter(Boolean));
    stage.querySelector('h1')?.focus({ preventScroll: true });
  }
  draw();
}
