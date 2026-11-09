import { h, closeButton, chip, exitRitual } from '../ui.js';
import { orb, runBreath } from './breath.js';
import { back, go } from '../nav.js';
import { addMoment } from '../store.js';
import { EMOTIONS, BODY_PARTS, WITNESS_LINES, THREE_OPTIONS, CRISIS, CRISIS_LINK } from '../content.js';
import { bell, haptic, unlockAudio } from '../audio.js';

const WITNESS_MS = 44000;

/**
 * #sos いま、揺れている。
 * 順序が大切: 外（足裏）→ 名づける → 体で感じる → 見守る → 三つの選択肢。
 */
export function sosView(root) {
  unlockAudio();
  const stage = h('div', { class: 'stage sos' });
  const footer = h(
    'div',
    { class: 'sos-foot' },
    h('p', { class: 'fine' }, '目は開けたままで。いつでもやめて大丈夫です。'),
    h('button', { class: 'link-btn', onclick: () => go('crisis') }, 'つらさがとても強いときは'),
  );
  root.append(h('div', { class: 'immersive-top' }, closeButton(back)), stage, footer);

  let stopBreath = () => {};
  let timers = [];
  let exitEl = null;
  const picked = { emotion: null, part: null };
  const clearTimers = () => {
    timers.forEach(clearTimeout);
    timers = [];
  };

  // 0. グラウンディング
  function ground() {
    const o = orb('orb-breath orb-small');
    const label = h('p', { class: 'breath-label' });
    const nextBtn = h('button', { class: 'btn btn-primary', onclick: name, hidden: true }, '次へ');
    stage.replaceChildren(
      h('p', { class: 'eyebrow' }, 'まず、外へ'),
      h('h1', { class: 'sos-q', tabindex: '-1' }, '足の裏を感じてください。床に触れている感覚。'),
      h('div', { class: 'orb-wrap' }, o),
      label,
      nextBtn,
    );
    stopBreath = runBreath(o, label, { onDone: () => (nextBtn.hidden = false) });
  }

  // 1. 名づける
  function name() {
    stopBreath();
    const box = h('div', { class: 'chips' });
    const draw = () =>
      box.replaceChildren(
        ...EMOTIONS.map((e) =>
          chip(e, {
            selected: picked.emotion === e,
            onclick: () => {
              picked.emotion = e;
              draw();
              timers.push(setTimeout(body, 450));
            },
          }),
        ),
      );
    draw();
    stage.replaceChildren(h('p', { class: 'eyebrow' }, '名づける'), h('h1', { class: 'sos-q', tabindex: '-1' }, 'いま、何が起きていますか。'), box, h('p', { class: 'fine' }, '名前をつけるだけで、少し距離が生まれます。'));
  }

  // 2. 体で感じる
  function body() {
    clearTimers();
    const box = h('div', { class: 'chips' });
    const draw = () =>
      box.replaceChildren(
        ...BODY_PARTS.map((p) =>
          chip(p, {
            selected: picked.part === p,
            onclick: () => {
              picked.part = p;
              draw();
              timers.push(setTimeout(witness, 450));
            },
          }),
        ),
      );
    draw();
    stage.replaceChildren(
      h('p', { class: 'eyebrow' }, '体で感じる'),
      h('h1', { class: 'sos-q', tabindex: '-1' }, `その${picked.emotion && picked.emotion !== 'わからない' ? picked.emotion : '感覚'}は、体のどこにありますか。`),
      box,
    );
  }

  // 3. 見守る（物語に燃料を与えない）
  function witness() {
    clearTimers();
    const line = h('p', { class: 'witness-line in' }, WITNESS_LINES[0]);
    const bar = h('div', { class: 'progress' }, h('div', { class: 'progress-fill' }));
    const actions = h('div', { class: 'exit-actions', hidden: true }, h('button', { class: 'btn btn-quiet', onclick: witness }, 'もう少し'), h('button', { class: 'btn btn-primary', onclick: options }, '次へ'));
    const where = picked.part && picked.part !== 'わからない' ? `${picked.part}に、` : '';
    stage.replaceChildren(
      h('p', { class: 'eyebrow' }, '見守る'),
      h('h1', { class: 'sos-q', tabindex: '-1' }, `${where}そっと注意を向けます。説明しなくていい。エネルギーとして感じます。`),
      bar,
      line,
      actions,
    );
    bell('soft');
    const step = WITNESS_MS / WITNESS_LINES.length;
    WITNESS_LINES.forEach((l, k) => {
      if (k === 0) return;
      timers.push(
        setTimeout(() => {
          line.classList.remove('in');
          void line.offsetWidth;
          line.textContent = l;
          line.classList.add('in');
          haptic(8);
        }, step * k),
      );
    });
    requestAnimationFrame(() => {
      bar.firstChild.style.transition = `transform ${WITNESS_MS}ms linear`;
      bar.firstChild.style.transform = 'scaleX(1)';
    });
    timers.push(setTimeout(() => (actions.hidden = false), WITNESS_MS));
  }

  // 4. 三つの選択肢
  function options() {
    clearTimers();
    stage.replaceChildren(
      h('p', { class: 'eyebrow' }, '静けさから選ぶ'),
      h('h1', { class: 'sos-q', tabindex: '-1' }, 'この状況に、三つの道があります。'),
      h(
        'div',
        { class: 'gate-choices' },
        THREE_OPTIONS.map((o) => h('button', { class: 'choice', onclick: () => done(o) }, h('strong', null, o.title), h('span', null, o.body))),
      ),
      h('p', { class: 'fine' }, 'どれも選べないときは、選べない自分を受け入れる。それも一つの受容です。'),
    );
  }

  function done(opt) {
    addMoment('sos', { label: `${picked.emotion || '揺れ'} → ${opt.title}` });
    bell('bowl');
    exitEl = exitRitual({
      title: '揺れの中で、在ることができました。',
      lines: ['痛みに気づきの光が当たるとき、', 'それは少しずつ、意識に変わっていきます。'],
      actions: [h('button', { class: 'btn btn-quiet', onclick: () => go('haiku') }, '一句を書く'), h('button', { class: 'btn', onclick: back }, '閉じる')],
    });
    stage.replaceChildren(exitEl);
  }

  ground();
  return () => {
    stopBreath();
    clearTimers();
    exitEl?._cleanup?.();
  };
}

/** #crisis 相談窓口。番号は選択してコピーできるテキストとしても表示する。 */
export function crisisView(root) {
  root.append(
    h('div', { class: 'immersive-top' }, closeButton(() => go('sos'), '戻る')),
    h(
      'div',
      { class: 'page crisis' },
      h('h1', { class: 'page-title', tabindex: '-1' }, 'ひとりで抱えないでください'),
      h('p', { class: 'body-text' }, 'このアプリは、医療や心理療法の代わりにはなれません。強い苦しみが続くとき、自分を傷つけたい気持ちがあるときは、専門の窓口や身近な人を頼ってください。'),
      h(
        'ul',
        { class: 'crisis-list' },
        CRISIS.map((c) =>
          h(
            'li',
            null,
            h('p', { class: 'crisis-name' }, c.name),
            h('p', { class: 'crisis-tel' }, h('a', { href: 'tel:' + c.tel.replace(/-/g, '') }, c.tel)),
            h('p', { class: 'fine' }, c.note),
          ),
        ),
      ),
      h('p', { class: 'body-text' }, h('a', { href: CRISIS_LINK.url, target: '_blank', rel: 'noopener' }, CRISIS_LINK.label)),
      h('p', { class: 'fine' }, '番号や受付時間は変わることがあります。最新の情報は上のリンクで確認してください。'),
    ),
  );
}
