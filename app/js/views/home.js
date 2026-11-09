import { h, ICONS, toast } from '../ui.js';
import { orb } from './breath.js';
import { go } from '../nav.js';
import { get, settings, addMoment } from '../store.js';
import { INQUIRIES, ANCHORS } from '../content.js';
import { seasonFor } from '../lib/seasons.js';
import { partOfDay, pickDaily } from '../lib/day.js';
import { unlockAudio } from '../audio.js';

function dateLine(now) {
  const s = seasonFor(now);
  return h(
    'div',
    { class: 'home-date' },
    h('span', { class: 'home-day' }, `${now.getMonth() + 1}月${now.getDate()}日`),
    h('span', { class: 'home-sekki' }, s.sekki),
  );
}

function seasonCard(now) {
  const s = seasonFor(now);
  return h(
    'section',
    { class: 'season', 'aria-label': '今日の候' },
    h('p', { class: 'eyebrow' }, '七十二候（目安）'),
    h('p', { class: 'season-name' }, h('ruby', null, s.ko, h('rt', null, s.koKana))),
    h('p', { class: 'season-gloss' }, s.gloss + '頃。'),
    h('p', { class: 'season-invite' }, '窓の外に、この季節のしるしを一つ探してみてください。'),
  );
}

function anchorRows() {
  const chosen = get().anchors.map((id) => ANCHORS.find((a) => a.id === id)).filter(Boolean);
  if (!chosen.length) {
    return h('button', { class: 'row-link', onclick: () => go('anchors') }, '日常の鐘を選ぶ', h('span', { svg: ICONS.arrow }));
  }
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
              toast('夜空に星が一つ。');
            },
          },
          'いま感じた',
        ),
      ),
    ),
  );
}

function ritualCard(now) {
  const part = partOfDay(now);
  if (part === 'morning') {
    return h(
      'section',
      { class: 'ritual' },
      h('p', { class: 'eyebrow' }, '朝'),
      h('h2', { class: 'ritual-title' }, '今日の鐘'),
      h('p', { class: 'ritual-note' }, 'この三つの瞬間が、今日の鐘です。'),
      anchorRows(),
    );
  }
  if (part === 'day') {
    return h(
      'section',
      { class: 'ritual' },
      h('p', { class: 'eyebrow' }, '昼'),
      h('h2', { class: 'ritual-title' }, 'していることを、そのまま修行に'),
      h('p', { class: 'ritual-note' }, '次の皿洗いや歩く時間を、始まりと終わりの鐘で区切ってみる。'),
      h('div', { class: 'ritual-actions' }, h('button', { class: 'btn btn-quiet', onclick: () => go('samu') }, '作務をはじめる'), h('button', { class: 'btn btn-quiet', onclick: () => go('play-waiting') }, '待つ時間に')),
    );
  }
  if (part === 'evening') {
    return h(
      'section',
      { class: 'ritual' },
      h('p', { class: 'eyebrow' }, '夕べ'),
      h('h2', { class: 'ritual-title' }, '今日を手放す'),
      h('p', { class: 'ritual-note' }, '今日ほんとうに「在った」一瞬を一行だけ書いて、手放します。'),
      h('div', { class: 'ritual-actions' }, h('button', { class: 'btn btn-quiet', onclick: () => go('evening') }, '一行を書く')),
    );
  }
  return h(
    'section',
    { class: 'ritual' },
    h('p', { class: 'eyebrow' }, '夜'),
    h('h2', { class: 'ritual-title' }, '眠る前に'),
    h('p', { class: 'ritual-note' }, '横になって、体の内側へ。終わりの鐘は鳴りません。'),
    h('div', { class: 'ritual-actions' }, h('button', { class: 'btn btn-quiet', onclick: () => go('play-sleep') }, 'はじめる')),
  );
}

export function homeView(root) {
  const now = new Date();
  const s = settings();
  const inquiry = pickDaily(INQUIRIES, now);

  const orbBtn = h(
    'button',
    {
      class: 'orb-btn',
      'aria-label': '一呼吸する',
      onclick: () => {
        unlockAudio();
        go('breath');
      },
    },
    orb('orb-rest'),
    h('span', { class: 'orb-label' }, '一呼吸'),
  );

  const inquiryBtn = h(
    'button',
    { class: 'inquiry', onclick: () => go('inquiry') },
    h('span', { class: 'eyebrow' }, '今日の問い'),
    h('span', { class: 'inquiry-text' }, inquiry),
  );

  const top = h(
    'div',
    { class: 'home-top' },
    dateLine(now),
    h('button', { class: 'icon-btn', 'aria-label': '設定', onclick: () => go('prefs'), svg: ICONS.gear }),
  );

  if (s.minimal) {
    root.append(
      h(
        'div',
        { class: 'home home-minimal' },
        top,
        h('h1', { class: 'sr-only', tabindex: '-1' }, 'いま'),
        h('div', { class: 'home-center' }, orbBtn),
        inquiryBtn,
        h('p', { class: 'minimal-note' }, '閉じて、いまへ。'),
      ),
    );
    return;
  }

  root.append(
    h(
      'div',
      { class: 'home' },
      top,
      h('h1', { class: 'sr-only', tabindex: '-1' }, 'いま'),
      h('div', { class: 'home-center' }, orbBtn),
      inquiryBtn,
      h(
        'div',
        { class: 'home-quick' },
        h('button', { class: 'quick quick-sos', onclick: () => go('sos') }, h('strong', null, 'いま、揺れている'), h('span', null, '怒り・不安・悲しみの中で')),
        h('button', { class: 'quick', onclick: () => go('haiku') }, h('strong', null, '今の一句'), h('span', null, '評価せず、見たままを')),
      ),
      ritualCard(now),
      seasonCard(now),
    ),
  );
}
