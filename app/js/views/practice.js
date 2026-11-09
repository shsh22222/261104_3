import { h, header, ICONS } from '../ui.js';
import { go } from '../nav.js';
import { PRACTICES, PORTALS, practiceMinutes, TEACHINGS, BOOKS } from '../content.js';

function row({ title, sub, meta, onclick, cls = '' }) {
  return h(
    'li',
    null,
    h(
      'button',
      { class: 'list-row ' + cls, onclick },
      h('span', { class: 'list-main' }, h('span', { class: 'list-title' }, title), sub ? h('span', { class: 'list-sub' }, sub) : null),
      meta ? h('span', { class: 'list-meta' }, meta) : null,
      h('span', { class: 'list-arrow', svg: ICONS.arrow }),
    ),
  );
}

export function practiceView(root) {
  root.append(header('実践', 'いまへの入口。どれも数分で終わります。'));

  root.append(
    h(
      'section',
      { class: 'group' },
      h(
        'ul',
        { class: 'list' },
        row({ title: '意識的な一呼吸', sub: 'すべての実践の最小単位', meta: '10秒', onclick: () => go('breath') }),
        row({ title: 'いま、揺れている', sub: '怒り、不安、悲しみの中で', meta: '2分〜', onclick: () => go('sos'), cls: 'is-sos' }),
      ),
    ),
  );

  for (const portal of PORTALS) {
    const items = PRACTICES.filter((p) => p.portal === portal.id);
    if (!items.length) continue;
    root.append(
      h(
        'section',
        { class: 'group' },
        h('h2', { class: 'group-title' }, portal.title, h('span', { class: 'group-note' }, portal.note)),
        h(
          'ul',
          { class: 'list' },
          items.map((p) => row({ title: p.title, sub: p.sub, meta: `${practiceMinutes(p)}分`, onclick: () => go('play-' + p.id) })),
        ),
      ),
    );
  }

  root.append(
    h(
      'section',
      { class: 'group' },
      h('ul', { class: 'list' }, row({ title: '教えの地図', sub: 'いま、エゴ、ペインボディ、受容などの要約', onclick: () => go('learn') })),
    ),
  );
}

export function learnView(root) {
  root.append(
    header(
      '教えの地図',
      '実践のための要約です。原著の言葉ではなく、私たちの言葉で書いています。',
      h('button', { class: 'icon-btn', 'aria-label': '実践に戻る', onclick: () => go('practice'), svg: ICONS.close }),
    ),
  );
  root.append(
    h(
      'div',
      { class: 'teachings' },
      TEACHINGS.map((t) =>
        h(
          'details',
          { class: 'teaching' },
          h('summary', null, h('span', null, t.title)),
          h('p', null, t.body),
          h('button', { class: 'btn btn-quiet btn-small', onclick: () => go(t.practice) }, '実践する'),
        ),
      ),
    ),
  );
  root.append(
    h(
      'section',
      { class: 'group note-block' },
      h('h2', { class: 'group-title' }, '原著へ'),
      h('ul', { class: 'plain' }, BOOKS.map((b) => h('li', null, b))),
      h('p', { class: 'fine' }, 'このアプリは、エックハルト・トール氏および関係団体とは関係のない非公式のものです。'),
    ),
  );
}
