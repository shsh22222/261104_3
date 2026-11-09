// ランダムな鐘をカレンダーファイル（RFC 5545）として書き出す。
// サーバーも通知権限も要らない。鳴らすのは端末のカレンダー。消すのも利用者の自由。

const MIN = 60000;

/**
 * 日ごとに、指定の時間帯の中でランダムな時刻を選ぶ。鐘と鐘の間は minGapMin 分以上あける。
 * 「最小間隔つき一様分布」を使う: 余白の中で一様に点を置き、i 番目に i*gap を足す。
 */
export function planBells({
  days = 7,
  perDay = 5,
  startMin = 9 * 60,
  endMin = 21 * 60,
  minGapMin = 40,
  from = new Date(),
  rand = Math.random,
  leadMin = 10,
} = {}) {
  const out = [];
  const span = Math.max(0, endMin - startMin);
  const n = Math.max(1, Math.min(perDay, Math.floor(span / minGapMin) + 1));
  const slack = span - (n - 1) * minGapMin;
  const earliest = from.getTime() + leadMin * MIN;
  for (let d = 0; d < days; d++) {
    const base = new Date(from.getFullYear(), from.getMonth(), from.getDate() + d);
    const picks = Array.from({ length: n }, () => rand() * slack).sort((a, b) => a - b);
    picks.forEach((p, i) => {
      const minute = Math.round(startMin + p + i * minGapMin);
      const t = new Date(base.getFullYear(), base.getMonth(), base.getDate(), 0, minute);
      if (t.getTime() >= earliest) out.push(t);
    });
  }
  return out;
}

export function escapeText(s) {
  return String(s)
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

/** 75オクテットで折り返す。マルチバイト文字の途中では切らない。 */
export function foldLine(line) {
  const enc = new TextEncoder();
  const parts = [];
  let cur = '';
  let bytes = 0;
  for (const ch of line) {
    const b = enc.encode(ch).length;
    const limit = parts.length === 0 ? 75 : 74; // 継続行は先頭の空白も1オクテット
    if (bytes + b > limit) {
      parts.push(cur);
      cur = ch;
      bytes = b;
    } else {
      cur += ch;
      bytes += b;
    }
  }
  parts.push(cur);
  return parts.join('\r\n ');
}

const pad = (n) => String(n).padStart(2, '0');

/** 浮動時刻（タイムゾーンなし＝端末の現地時刻として解釈される） */
export function floating(d) {
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;
}

export function utcStamp(d) {
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
}

/**
 * @param {Date[]} times
 * @param {{appUrl?:string, prompts?:string[], now?:Date, rand?:()=>number}} opts
 */
export function buildICS(times, { appUrl = '', prompts = [], now = new Date(), rand = Math.random } = {}) {
  const stamp = utcStamp(now);
  const seed = Math.floor(rand() * 1e9).toString(36);
  const bellUrl = appUrl ? `${appUrl}#bell` : '';
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//MA Presence//Bells//JA',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:間 鐘',
  ];
  times.forEach((t, i) => {
    const prompt = prompts.length ? prompts[Math.floor(rand() * prompts.length)] : '一呼吸。';
    const desc = bellUrl ? `${prompt}\n\n${bellUrl}` : prompt;
    lines.push(
      'BEGIN:VEVENT',
      `UID:${stamp}-${seed}-${i}@ma.presence`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${floating(t)}`,
      'DURATION:PT1M',
      `SUMMARY:${escapeText('🔔 一呼吸')}`,
      `DESCRIPTION:${escapeText(desc)}`,
      ...(bellUrl ? [`URL:${bellUrl}`] : []),
      'TRANSP:TRANSPARENT',
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      'TRIGGER:PT0S',
      `DESCRIPTION:${escapeText('🔔 一呼吸')}`,
      'END:VALARM',
      'END:VEVENT',
    );
  });
  lines.push('END:VCALENDAR');
  return lines.map(foldLine).join('\r\n') + '\r\n';
}
