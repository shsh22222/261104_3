import { h, closeButton, exitRitual } from '../ui.js';
import { orb, runBreath } from './breath.js';
import { addMoment } from '../store.js';
import { back } from '../nav.js';
import { bell } from '../audio.js';

/** 続けて開きたいアプリのURL（ショートカットから ?then=xxx:// で渡せる）。http(s) 以外のアプリ用スキームだけ許す。 */
function thenUrl() {
  try {
    const v = new URLSearchParams(location.search).get('then');
    if (v && /^[a-z][a-z0-9+.-]*:\/\//i.test(v) && !/^(https?|javascript|data|file):/i.test(v)) return v;
  } catch {
    /* noop */
  }
  return null;
}

/** #gate スマホを開く前の一呼吸。 */
export function gateView(root) {
  const stage = h('div', { class: 'stage' });
  root.append(h('div', { class: 'immersive-top' }, closeButton(back)), stage);
  let stop = () => {};
  let exitEl = null;

  const o = orb('orb-breath');
  const label = h('p', { class: 'breath-label', 'aria-live': 'polite' });
  stage.append(h('p', { class: 'gate-eyebrow' }, '開く前に'), h('div', { class: 'orb-wrap' }, o), label, h('p', { class: 'breath-hint' }, '一呼吸だけ、ここに。'));
  stop = runBreath(o, label, { onDone: ask });

  function ask() {
    stage.replaceChildren(
      h('h1', { class: 'gate-q', tabindex: '-1' }, 'いま、何を求めていますか。'),
      h(
        'div',
        { class: 'gate-choices' },
        h('button', { class: 'choice', onclick: () => answer('need') }, h('strong', null, '必要なことがある'), h('span', null, '連絡、調べもの、予定')),
        h('button', { class: 'choice', onclick: () => answer('habit') }, h('strong', null, 'なんとなく'), h('span', null, '気づいたら手に取っていた')),
        h('button', { class: 'choice', onclick: () => answer('escape') }, h('strong', null, '何かから離れたい'), h('span', null, '退屈、不安、疲れ')),
      ),
    );
  }

  function answer(kind) {
    const t = thenUrl();
    if (kind === 'need') {
      addMoment('gate', { label: '意識して開いた' });
      stage.replaceChildren(
        h('h1', { class: 'gate-q', tabindex: '-1' }, 'どうぞ。意識して使いましょう。'),
        h('p', { class: 'gate-note' }, '用が済んだら、画面を置いて、もう一呼吸。'),
        h('div', { class: 'exit-actions' }, t ? h('a', { class: 'btn btn-primary', href: t }, '続ける') : null, h('button', { class: 'btn btn-quiet', onclick: back }, '閉じる')),
      );
      return;
    }
    const note =
      kind === 'habit'
        ? '気づけました。その「なんとなく」の下に、どんな感覚がありますか。'
        : '離れたい気持ちに気づけました。その感覚は、体のどこにありますか。';
    stage.replaceChildren(
      h('h1', { class: 'gate-q', tabindex: '-1' }, note),
      h(
        'div',
        { class: 'exit-actions' },
        h(
          'button',
          {
            class: 'btn btn-primary',
            onclick: () => {
              addMoment('gate', { label: 'スマホを置いた' });
              bell('soft');
              exitEl = exitRitual({ title: 'スマホを置きましょう。', lines: ['顔を上げると、', 'いまがあります。'], actions: [h('button', { class: 'btn btn-quiet', onclick: back }, '閉じる')] });
              stage.replaceChildren(exitEl);
            },
          },
          'スマホを置く',
        ),
        t ? h('a', { class: 'btn btn-quiet', href: t, onclick: () => addMoment('gate', { label: '気づいて開いた' }) }, 'それでも開く') : h('button', { class: 'btn btn-quiet', onclick: () => { addMoment('gate', { label: '気づいて開いた' }); back(); } }, 'それでも開く'),
      ),
    );
  }

  return () => {
    stop();
    exitEl?._cleanup?.();
  };
}
