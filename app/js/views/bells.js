import { h, header, ICONS, toast, closeButton, exitRitual } from '../ui.js';
import { go, back } from '../nav.js';
import { planBells, buildICS } from '../lib/ics.js';
import { INQUIRIES, BELL_ANSWERS } from '../content.js';
import { bell, haptic, keepAwake, unlockAudio } from '../audio.js';
import { addMoment, addSample } from '../store.js';
import { orb, runBreath } from './breath.js';
import { appUrl } from './daily.js';
import { hhmm, mmss } from '../lib/day.js';

let sessionAvgMin = 20;

function select(id, label, options, value) {
  return h(
    'label',
    { class: 'field', for: id },
    h('span', { class: 'field-label' }, label),
    h('select', { id }, options.map(([v, t]) => h('option', { value: v, selected: String(v) === String(value) }, t))),
  );
}

function timeToMin(v, fallback) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(v || '');
  return m ? Number(m[1]) * 60 + Number(m[2]) : fallback;
}

/** #bells ランダムな鐘の設定。 */
export function bellsView(root) {
  root.append(
    header('ランダムな鐘', '予測できない時刻の鐘が、そのときの心の居場所を照らします。', h('button', { class: 'icon-btn', 'aria-label': '日常に戻る', onclick: () => go('daily'), svg: ICONS.close })),
  );

  const preview = h('p', { class: 'fine' });
  const form = h(
    'form',
    { class: 'form', id: 'bell-form' },
    h('div', { class: 'form-grid' }, select('bf-days', '期間', [[7, '7日'], [14, '14日'], [30, '30日']], 7), select('bf-per', '1日の回数', [[3, '3回'], [5, '5回'], [7, '7回']], 5)),
    h(
      'div',
      { class: 'form-grid' },
      h('label', { class: 'field', for: 'bf-start' }, h('span', { class: 'field-label' }, 'はじまり'), h('input', { type: 'time', id: 'bf-start', value: '09:00' })),
      h('label', { class: 'field', for: 'bf-end' }, h('span', { class: 'field-label' }, 'おわり'), h('input', { type: 'time', id: 'bf-end', value: '21:00' })),
    ),
    h('button', { class: 'btn btn-primary btn-wide', type: 'submit' }, 'カレンダーファイルをつくる'),
    preview,
  );

  function readForm() {
    return {
      days: Number(form.querySelector('#bf-days').value),
      perDay: Number(form.querySelector('#bf-per').value),
      startMin: timeToMin(form.querySelector('#bf-start').value, 540),
      endMin: timeToMin(form.querySelector('#bf-end').value, 1260),
    };
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const opts = readForm();
    if (opts.endMin - opts.startMin < 60) {
      toast('時間帯は1時間以上にしてください');
      return;
    }
    const times = planBells({ ...opts, minGapMin: 40 });
    const ics = buildICS(times, { appUrl: appUrl(), prompts: INQUIRIES });
    const first = times.slice(0, 4).map((t) => `${t.getMonth() + 1}/${t.getDate()} ${hhmm(t)}`);
    preview.textContent = `${times.length}回の鐘をつくりました。最初は ${first.join('、')} …`;
    if (window.__MA_PREVIEW) {
      preview.textContent += ' このプレビューではファイルを保存できません。ホーム画面に追加したアプリ版でお試しください。';
      return;
    }
    const file = new File([ics], 'ma-bells.ics', { type: 'text/calendar' });
    try {
      if (navigator.canShare?.({ files: [file] }) && /iPhone|iPad|Android/i.test(navigator.userAgent)) {
        await navigator.share({ files: [file], title: '間 鐘' });
        return;
      }
    } catch {
      /* 共有をやめた場合などはダウンロードへ */
    }
    const url = URL.createObjectURL(file);
    const a = h('a', { href: url, download: 'ma-bells.ics' });
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  });

  root.append(
    h(
      'section',
      { class: 'group' },
      h('h2', { class: 'group-title' }, 'カレンダーに鐘を置く', h('span', { class: 'group-note' }, 'アプリを閉じていても鳴ります')),
      h('p', { class: 'body-text' }, 'ランダムな時刻の鐘を、カレンダーの予定として書き出します。鳴らすのは端末のカレンダーなので、サーバーも通知の許可も要りません。'),
      form,
      h(
        'details',
        { class: 'howto' },
        h('summary', null, '取り込み方と消し方'),
        h(
          'ul',
          null,
          h('li', null, 'iPhone: ファイルを開くと「すべてを追加」が表示されます。先にカレンダーアプリで「間」という専用カレンダーを作っておくと、あとでまとめて消せます。'),
          h('li', null, 'Android: Googleカレンダーのアプリは直接取り込めないことがあります。その場合はパソコンのGoogleカレンダーの「インポート」から取り込みます。'),
          h('li', null, '鐘が鳴ったら、予定の中のリンクから「鐘に応える」画面を開けます。'),
        ),
      ),
    ),
  );

  const avgSel = select('bs-avg', '平均の間隔', [[10, '約10分'], [20, '約20分'], [30, '約30分'], [45, '約45分']], sessionAvgMin);
  root.append(
    h(
      'section',
      { class: 'group' },
      h('h2', { class: 'group-title' }, '開いている間の鐘', h('span', { class: 'group-note' }, '机に向かう時間に')),
      h('p', { class: 'body-text' }, '作業中、画面をつけたまま置いておくと、ランダムな間隔で鐘が鳴ります。画面を消したり別のアプリに移ったりすると、鳴らないことがあります。'),
      h(
        'div',
        { class: 'form' },
        avgSel,
        h(
          'button',
          {
            class: 'btn btn-quiet btn-wide',
            onclick: () => {
              unlockAudio();
              sessionAvgMin = Number(avgSel.querySelector('select').value);
              go('bell-session');
            },
          },
          '鐘を待つ',
        ),
      ),
    ),
  );
}

function nextDelayMs(avgMin) {
  // 平均の半分〜1.5倍の範囲でランダム。慣れを防ぐ。
  return (avgMin * (0.5 + Math.random())) * 60000;
}

/** 鐘に応える UI。経験サンプリング。 */
function bellResponse(container, { onDone, doneLabel = '閉じる' } = {}) {
  let stop = () => {};
  container.replaceChildren(
    h('p', { class: 'gate-eyebrow' }, '鐘が鳴りました'),
    h('h1', { class: 'gate-q', tabindex: '-1' }, 'その瞬間、あなたはどこにいましたか。'),
    h(
      'div',
      { class: 'gate-choices' },
      BELL_ANSWERS.map((a) =>
        h(
          'button',
          {
            class: 'choice',
            onclick: () => {
              addSample(a.id);
              addMoment('bell', { label: a.label });
              reply(a);
            },
          },
          h('strong', null, a.label),
        ),
      ),
    ),
  );

  function reply(a) {
    const o = orb('orb-breath orb-small');
    const label = h('p', { class: 'breath-label' });
    container.replaceChildren(h('p', { class: 'gate-q' }, a.reply), h('div', { class: 'orb-wrap' }, o), label);
    stop = runBreath(o, label, {
      onDone: () => {
        container.append(h('div', { class: 'exit-actions' }, h('button', { class: 'btn', onclick: onDone }, doneLabel)));
      },
    });
  }
  return () => stop();
}

/** #bell 鐘に応える（カレンダーの予定から開かれる）。 */
export function bellView(root) {
  const stage = h('div', { class: 'stage' });
  root.append(h('div', { class: 'immersive-top' }, closeButton(back)), stage);
  let exitEl = null;
  const cancel = bellResponse(stage, {
    onDone: () => {
      exitEl = exitRitual({ actions: [h('button', { class: 'btn btn-quiet', onclick: back }, '閉じる')] });
      stage.replaceChildren(exitEl);
    },
  });
  return () => {
    cancel();
    exitEl?._cleanup?.();
  };
}

/** #bell-session 開いている間の鐘。 */
export function bellSessionView(root) {
  const stage = h('div', { class: 'stage session' });
  root.append(h('div', { class: 'immersive-top' }, closeButton(back, 'やめる')), stage);
  let timer = null;
  let tick = null;
  let release = () => {};
  let started = Date.now();
  let alive = true;
  let cancelResponse = () => {};

  function waiting() {
    if (!alive) return;
    const elapsedEl = h('p', { class: 'session-time' }, '0:00');
    stage.replaceChildren(
      h('div', { class: 'session-dot', 'aria-hidden': 'true' }),
      h('p', { class: 'session-title' }, '鐘を待っています'),
      h('p', { class: 'fine' }, `平均 約${sessionAvgMin}分ごと。次がいつかは、わかりません。`),
      elapsedEl,
    );
    started = Date.now();
    clearInterval(tick);
    tick = setInterval(() => (elapsedEl.textContent = mmss(Date.now() - started)), 1000);
    clearTimeout(timer);
    timer = setTimeout(ring, nextDelayMs(sessionAvgMin));
  }

  function ring() {
    if (!alive) return;
    clearInterval(tick);
    bell('bowl');
    haptic([30, 80, 30]);
    cancelResponse = bellResponse(stage, { onDone: waiting, doneLabel: '作業に戻る' });
  }

  keepAwake().then((r) => {
    if (alive) release = r;
    else r();
  });
  waiting();
  return () => {
    alive = false;
    clearTimeout(timer);
    clearInterval(tick);
    cancelResponse();
    release();
  };
}
