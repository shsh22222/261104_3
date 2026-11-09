import { h, header, ICONS } from '../ui.js';
import { go } from '../nav.js';
import { get, settings } from '../store.js';
import { starPosition, starAlpha, starRadius } from '../lib/sky.js';
import { MOMENT_LABELS, BELL_ANSWERS } from '../content.js';
import { relativeDay, hhmm } from '../lib/day.js';

const DAY = 86400000;

function css(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

/** 鐘への応答から、数字ではなく一文の振り返りを返す。 */
export function bellReflection(samples, now = Date.now()) {
  const recent = samples.filter((s) => now - s.t < 14 * DAY);
  if (recent.length < 5) return null;
  const count = {};
  for (const s of recent) count[s.a] = (count[s.a] || 0) + 1;
  const top = Object.entries(count).sort((a, b) => b[1] - a[1])[0][0];
  const map = {
    here: '鐘のとき、いまに居たことが多かったようです。その静けさは、いつもここにあります。',
    thought: '鐘のとき、思考の中にいたことが多かったようです。それに気づけたこと自体が、目覚めの瞬間です。',
    emotion: '鐘のとき、感情の中にいたことが多かったようです。感情に気づくたび、あなたは感情より広い側にいます。',
    unknown: '「わからない」が多かったようです。わからないと気づくことも、気づきです。',
  };
  return map[top];
}

/** #sky 夜空。在った瞬間が星になり、日がたつにつれて消えていく。 */
export function skyView(root) {
  const s = settings();
  const fade = s.fadeDays;
  root.append(header('夜空', `在った瞬間が、星になります。星は${fade}日かけて消えていきます。`, h('button', { class: 'icon-btn', 'aria-label': '日常に戻る', onclick: () => go('daily'), svg: ICONS.close })));

  const now = Date.now();
  const moments = get().moments.filter((m) => starAlpha(m.t, now, fade) > 0);

  const canvas = h('canvas', { class: 'sky-canvas', role: 'img', 'aria-label': `夜空。見えている星は${moments.length}個です。` });
  const detail = h('p', { class: 'sky-detail', 'aria-live': 'polite' }, moments.length ? '星に触れると、その瞬間が見えます。' : '');
  const wrap = h('div', { class: 'sky-wrap' }, canvas);

  if (!moments.length) {
    wrap.append(
      h(
        'div',
        { class: 'sky-empty' },
        h('p', null, 'まだ星はありません。'),
        h('p', null, 'いまの一呼吸が、最初の星になります。'),
        h('button', { class: 'btn btn-quiet', onclick: () => go('breath') }, '一呼吸する'),
      ),
    );
  }

  root.append(wrap, detail);
  if (s.showCounts && moments.length) root.append(h('p', { class: 'fine pad' }, `いま見えている星: ${moments.length}`));

  const refl = bellReflection(get().samples);
  if (refl) {
    root.append(
      h(
        'section',
        { class: 'group' },
        h('h2', { class: 'group-title' }, '鐘が教えてくれたこと', h('span', { class: 'group-note' }, '最近14日')),
        h('p', { class: 'body-text' }, refl),
        h(
          'p',
          { class: 'sample-dots', 'aria-hidden': 'true' },
          get()
            .samples.slice(-40)
            .map((x) => h('span', { class: 'dot dot-' + x.a, title: BELL_ANSWERS.find((b) => b.id === x.a)?.label })),
        ),
      ),
    );
  }

  const words = moments.filter((m) => m.text).slice(-8).reverse();
  if (words.length) {
    root.append(
      h(
        'section',
        { class: 'group' },
        h('h2', { class: 'group-title' }, '星に残った言葉'),
        h(
          'ul',
          { class: 'words' },
          words.map((m) => h('li', { style: { opacity: String(0.35 + 0.65 * starAlpha(m.t, now, fade)) } }, h('p', { class: 'words-text' }, m.text), h('p', { class: 'fine' }, `${relativeDay(m.t, now)}・${MOMENT_LABELS[m.type]}`))),
        ),
      ),
    );
  }

  // ---- 描画 ----
  const ctx = canvas.getContext('2d');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let raf = 0;
  let w = 0;
  let hgt = 0;
  let selected = null;
  const stars = moments.map((m) => ({ m, ...starPosition(m.id), a: starAlpha(m.t, now, fade), r: starRadius(m.type) }));

  function resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    w = canvas.clientWidth;
    hgt = canvas.clientHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(hgt * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function draw(time) {
    const top = css('--sky-top');
    const bottom = css('--sky-bottom');
    const star = css('--sky-star');
    const glow = css('--sky-glow');
    const g = ctx.createLinearGradient(0, 0, 0, hgt);
    g.addColorStop(0, top);
    g.addColorStop(1, bottom);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, hgt);
    for (const st of stars) {
      const tw = reduce ? 1 : 0.82 + 0.18 * Math.sin(time / 1400 + st.phase);
      const alpha = st.a * tw;
      const x = st.x * w;
      const y = st.y * hgt;
      const r = st.r * (st === selected ? 1.6 : 1);
      const halo = ctx.createRadialGradient(x, y, 0, x, y, r * 6);
      halo.addColorStop(0, glow);
      halo.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.globalAlpha = alpha * (st.m.type === 'sos' ? 0.9 : 0.55);
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(x, y, r * 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = star;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    if (!reduce) raf = requestAnimationFrame(draw);
  }

  canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    let best = null;
    let bd = 26 * 26;
    for (const st of stars) {
      const dx = st.x * w - px;
      const dy = st.y * hgt - py;
      const d = dx * dx + dy * dy;
      if (d < bd) {
        bd = d;
        best = st;
      }
    }
    selected = best;
    if (best) {
      const m = best.m;
      const label = m.text ? `「${m.text}」` : m.label ? `${MOMENT_LABELS[m.type]}（${m.label}）` : MOMENT_LABELS[m.type];
      detail.textContent = `${relativeDay(m.t)} ${hhmm(new Date(m.t))}・${label}`;
    }
    if (reduce) draw(0);
  });

  const onResize = () => {
    resize();
    if (reduce) draw(0);
  };
  requestAnimationFrame(() => {
    resize();
    draw(performance.now());
  });
  window.addEventListener('resize', onResize);
  return () => {
    cancelAnimationFrame(raf);
    window.removeEventListener('resize', onResize);
  };
}
