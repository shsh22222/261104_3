import { h, toast } from '../ui.js';
import { go } from '../nav.js';
import { update } from '../store.js';
import { orb } from './breath.js';
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
    const btn = h('button', { class: 'orb-btn', id: 'welcome-orb', 'aria-label': '指を置く（長押し）' }, orb('orb-rest'), h('span', { class: 'orb-label' }, '指を置く'));
    stage.replaceChildren(
      h('h1', { class: 'welcome-mark', tabindex: '-1' }, h('ruby', null, '間', h('rt', null, 'ま'))),
      h('p', { class: 'welcome-lead' }, '指を、円の上に置いてください。'),
      h('div', { class: 'home-center hold-keep' }, btn, line),
      h('button', { class: 'link-btn', onclick: finish }, 'とばす'),
    );
    detach = attachHold(btn, {
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
      h('h1', { class: 'welcome-title', tabindex: '-1' }, 'いま、少し静かになりましたか。'),
      h('p', { class: 'welcome-lines' }, h('span', null, 'その静けさが、このアプリのすべてです。'), h('span', null, '思考と思考のあいだにある「間」を、'), h('span', null, '一日に何度も思い出すための小さな道具です。')),
      h('p', { class: 'exit-outward' }, pickOutward()),
      h('div', { class: 'exit-actions' }, h('button', { class: 'btn btn-primary', id: 'welcome-start', onclick: finish }, 'はじめる')),
    );
    stage.querySelector('h1')?.focus({ preventScroll: true });
  }

  first();
  return () => detach();
}
