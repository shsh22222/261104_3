import { h, toast } from '../ui.js';
import { go } from '../nav.js';
import { update } from '../store.js';
import { bodyFigure, entryRegions } from './body.js';
import { attachHold, pickOutward } from './presence.js';

/** #welcome はじめの30秒は、説明ではなく体験。 */
export function welcomeView(root) {
  const stage = h('div', { class: 'stage welcome hold-scope' });
  root.append(stage);
  let detach = () => {};

  const finish = () => {
    update((st) => (st.onboarded = true));
    go('home');
  };

  function first() {
    const line = h('p', { class: 'hold-line', 'aria-live': 'polite' });
    const fig = bodyFigure('resting');
    fig.light(entryRegions('hands'));
    const btn = h('button', { class: 'figure-btn', id: 'welcome-orb', 'aria-label': '指を置く（長押し）' }, fig.el);
    stage.replaceChildren(
      h('h1', { class: 'welcome-mark', tabindex: '-1' }, h('ruby', null, '間', h('rt', null, 'ま'))),
      h('p', { class: 'welcome-lead' }, '画面に指を置いて、そのままに。'),
      h('div', { class: 'home-center hold-keep' }, btn, line),
      h('button', { class: 'link-btn', onclick: finish }, 'とばす'),
    );
    detach = attachHold(btn, {
      figure: fig,
      line,
      onTap: () => toast('指を置いたまま、待ってみてください。'),
      onRelease: (held) => {
        if (held < 3500) {
          toast('もう少しだけ、そのままで。');
          return;
        }
        detach();
        second();
      },
    });
  }

  function second() {
    stage.replaceChildren(
      h('h1', { class: 'welcome-title', tabindex: '-1' }, '手の内側に、何か感じましたか。'),
      h('p', { class: 'welcome-lines' }, h('span', null, 'その生きている感じが、インナーボディです。'), h('span', null, '体の内側は、いつも「いま」にしかありません。'), h('span', null, 'このアプリは、そこへ一日に何度も戻るための'), h('span', null, '小さな道具です。')),
      h('p', { class: 'exit-outward' }, pickOutward()),
      h('div', { class: 'exit-actions' }, h('button', { class: 'btn btn-primary', id: 'welcome-start', onclick: finish }, 'はじめる')),
    );
    stage.querySelector('h1')?.focus({ preventScroll: true });
  }

  first();
  return () => detach();
}
