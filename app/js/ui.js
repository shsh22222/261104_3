// 小さな DOM ヘルパー。利用者の書いた文字は必ずテキストノードとして入れる。

export function h(tag, attrs, ...children) {
  const el = document.createElement(tag);
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'svg') el.innerHTML = v; // アプリ内の定数アイコンのみ
      else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
      else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
      else if (k === 'value' && 'value' in el) el.value = v;
      else if (v === true) el.setAttribute(k, '');
      else el.setAttribute(k, String(v));
    }
  }
  for (const c of children.flat(Infinity)) {
    if (c == null || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}

let toastTimer = null;
export function toast(msg) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.hidden = false;
  el.classList.remove('show');
  void el.offsetWidth;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    el.classList.remove('show');
    setTimeout(() => (el.hidden = true), 400);
  }, 2800);
}

/** 画面上部のタイトル行。 */
export function header(title, sub, right) {
  return h(
    'header',
    { class: 'page-head' },
    h('div', { class: 'page-head-text' }, h('h1', { class: 'page-title', tabindex: '-1' }, title), sub ? h('p', { class: 'page-sub' }, sub) : null),
    right || null,
  );
}

/** 没入画面の「閉じる」ボタン。 */
export function closeButton(onClick, label = '閉じる') {
  return h('button', { class: 'icon-btn close-btn', 'aria-label': label, onclick: onClick, svg: ICONS.close });
}

export function chip(label, { selected = false, onclick, id } = {}) {
  return h('button', { class: 'chip' + (selected ? ' is-on' : ''), 'aria-pressed': String(selected), onclick, id, type: 'button' }, label);
}

/** 練習の終わりの「退出の儀式」。しばらくすると画面そのものが静かになる。 */
export function exitRitual({ title = 'おかえりなさい。', lines = ['画面から目を上げて、', '周りを見てください。'], actions = [] } = {}) {
  const el = h(
    'div',
    { class: 'exit' },
    h('p', { class: 'exit-title' }, title),
    h('p', { class: 'exit-lines' }, lines.map((l) => h('span', null, l))),
    h('div', { class: 'exit-actions' }, actions),
    h('p', { class: 'exit-rest', 'aria-hidden': 'true' }, 'スマホを置いて、いまへ。'),
  );
  const timer = setTimeout(() => el.classList.add('resting'), 14000);
  el.addEventListener('pointerdown', () => {
    if (el.classList.contains('resting')) el.classList.remove('resting');
  });
  el._cleanup = () => clearTimeout(timer);
  return el;
}

export async function copyText(text, fallbackEl) {
  try {
    await navigator.clipboard.writeText(text);
    toast('コピーしました');
  } catch {
    if (fallbackEl) {
      const r = document.createRange();
      r.selectNodeContents(fallbackEl);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(r);
      toast('選択しました。長押しでコピーできます');
    }
  }
}

export const ICONS = {
  close:
    '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" fill="none"/></svg>',
  gear:
    '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><circle cx="12" cy="12" r="3.2" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4M5.5 5.5l1.7 1.7M16.8 16.8l1.7 1.7M5.5 18.5l1.7-1.7M16.8 7.2l1.7-1.7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" fill="none"/></svg>',
  pause:
    '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M9 6v12M15 6v12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" fill="none"/></svg>',
  play: '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M8 5.5l11 6.5-11 6.5z" fill="currentColor"/></svg>',
  voice:
    '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M4 10v4h3l4 3.5v-11L7 10z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M15 9.5c1.2 1.4 1.2 3.6 0 5M17.6 7.2c2.4 2.7 2.4 6.9 0 9.6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" fill="none"/></svg>',
  mute:
    '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M4 10v4h3l4 3.5v-11L7 10z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M15.5 9.5l5 5M20.5 9.5l-5 5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" fill="none"/></svg>',
  eye: '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M3 12c2.5-3.6 5.5-5.4 9-5.4s6.5 1.8 9 5.4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" fill="none"/><path d="M5 13.5l-1.2 1.7M9.2 15.4l-.6 2M14.8 15.4l.6 2M19 13.5l1.2 1.7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
  arrow:
    '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M9 6l6 6-6 6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>',
};
