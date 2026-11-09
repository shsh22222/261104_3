import { h, header, ICONS, toast, copyText } from '../ui.js';
import { go } from '../nav.js';
import { get, update, addMoment } from '../store.js';
import { ANCHORS, MAX_ANCHORS } from '../content.js';

export function appUrl() {
  return location.origin + location.pathname;
}

function card(title, note, actions) {
  return h('section', { class: 'daily-card' }, h('h2', { class: 'daily-title' }, title), h('p', { class: 'daily-note' }, note), actions ? h('div', { class: 'daily-actions' }, actions) : null);
}

export function dailyView(root) {
  root.append(header('日常', '鐘は、暮らしの中に置く。'));

  // 今日のアンカー
  const chosen = get().anchors.map((id) => ANCHORS.find((a) => a.id === id)).filter(Boolean);
  root.append(
    h(
      'section',
      { class: 'group' },
      h('h2', { class: 'group-title' }, '日常の鐘', h('span', { class: 'group-note' }, 'すでにある行為を、いまへの入口に')),
      chosen.length
        ? h(
            'ul',
            { class: 'anchor-list' },
            chosen.map((a) =>
              h(
                'li',
                { class: 'anchor-item' },
                h('div', { class: 'anchor-text' }, h('strong', null, a.when), h('span', null, a.what)),
                h(
                  'button',
                  {
                    class: 'btn btn-small btn-quiet',
                    onclick: (e) => {
                      addMoment('anchor', { label: a.when });
                      e.currentTarget.textContent = '感じた';
                      e.currentTarget.disabled = true;
                      toast('夜空に星が一つ。');
                    },
                  },
                  'いま感じた',
                ),
              ),
            ),
          )
        : h('p', { class: 'muted' }, 'まだ選ばれていません。'),
      h('button', { class: 'row-link', onclick: () => go('anchors') }, '日常の鐘を選びなおす', h('span', { svg: ICONS.arrow })),
    ),
  );

  // ゲート
  const gateUrl = appUrl() + '#gate';
  const urlEl = h('code', { class: 'url' }, gateUrl);
  root.append(
    h(
      'section',
      { class: 'daily-card is-feature' },
      h('p', { class: 'eyebrow' }, 'いちばん効く鐘'),
      h('h2', { class: 'daily-title' }, 'スマホを開く瞬間を、鐘に'),
      h('p', { class: 'daily-note' }, '人は一日に何十回もスマホを手に取ります。SNSやニュースを開く前に、この「ゲート」で一呼吸の間を挟みます。'),
      h('div', { class: 'daily-actions' }, h('button', { class: 'btn btn-primary', onclick: () => go('gate') }, 'ゲートを試す')),
      h(
        'details',
        { class: 'howto' },
        h('summary', null, 'iPhoneで自動化する'),
        h(
          'ol',
          null,
          h('li', null, '「ショートカット」アプリを開き、「オートメーション」を選びます。'),
          h('li', null, '新規作成で「App」を選び、つい開いてしまうアプリ（SNSなど）を指定し、「開いている」にチェックします。'),
          h('li', null, '「すぐに実行」を選び、アクション「URLを開く」に下のURLを入れます。'),
        ),
        window.__MA_PREVIEW
          ? h('p', { class: 'fine' }, 'このプレビューでは使えません。ホーム画面に追加したアプリ版のURL（末尾に #gate）を使ってください。')
          : h('div', { class: 'url-row' }, urlEl, h('button', { class: 'btn btn-small btn-quiet', onclick: () => copyText(gateUrl, urlEl) }, 'コピー')),
      ),
      h(
        'details',
        { class: 'howto' },
        h('summary', null, 'Androidで、または手動で'),
        h(
          'ol',
          null,
          h('li', null, 'このアプリをホーム画面に追加し、SNSアプリが置かれていた場所に置き換えます。指が覚えている場所に、鐘を置く工夫です。'),
          h('li', null, '自動化アプリ（MacroDroid など）を使う場合は、アプリ起動時に上のURLを開くよう設定します。'),
        ),
      ),
    ),
  );

  root.append(
    card('ランダムな鐘', '予測できない時刻に鐘を鳴らし、そのときの心の居場所に気づきます。', [h('button', { class: 'btn btn-quiet', onclick: () => go('bells') }, '鐘を設定する')]),
    card('今の一句', '見えるもの、聞こえるものを、評価を入れずに一行で写します。', [h('button', { class: 'btn btn-quiet', onclick: () => go('haiku') }, '書く')]),
    card('作務', '皿洗いや歩くことを、始まりと終わりの鐘で区切って修行にします。', [h('button', { class: 'btn btn-quiet', onclick: () => go('samu') }, 'はじめる')]),
    card('今日を手放す', '夜、今日ほんとうに在った一瞬を一行だけ書いて、手放します。', [h('button', { class: 'btn btn-quiet', onclick: () => go('evening') }, '一行を書く')]),
  );
}

/** #anchors 日常の鐘を選ぶ。三つまで。少ないほど続く。 */
export function anchorsView(root) {
  root.append(
    header(
      '日常の鐘を選ぶ',
      `毎日必ずする行為の中から、${MAX_ANCHORS}つまで。少ないほど続きます。`,
      h('button', { class: 'icon-btn', 'aria-label': '日常に戻る', onclick: () => go('daily'), svg: ICONS.close }),
    ),
  );
  const list = h('ul', { class: 'anchor-pick' });
  const render = () => {
    const sel = new Set(get().anchors);
    list.replaceChildren(
      ...ANCHORS.map((a) => {
        const on = sel.has(a.id);
        return h(
          'li',
          null,
          h(
            'button',
            {
              class: 'pick' + (on ? ' is-on' : ''),
              'aria-pressed': String(on),
              onclick: () => {
                update((st) => {
                  if (on) st.anchors = st.anchors.filter((x) => x !== a.id);
                  else if (st.anchors.length >= MAX_ANCHORS) toast(`${MAX_ANCHORS}つまでにしましょう。少ないほど、続きます。`);
                  else st.anchors = [...st.anchors, a.id];
                });
                render();
              },
            },
            h('span', { class: 'pick-mark', 'aria-hidden': 'true' }),
            h('span', { class: 'pick-text' }, h('strong', null, a.when), h('span', null, a.what)),
          ),
        );
      }),
    );
  };
  render();
  root.append(list, h('p', { class: 'fine pad' }, '「〔手を洗う〕とき、〔水の感覚を感じる〕」のように、すでにある行為に、ごく小さな気づきを結びつけます。'));
}
