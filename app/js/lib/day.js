// 日付まわりの小さな純粋関数。

const DAY = 86400000;

/** 端末のローカル日付での通し日数。日替わりの選択に使う。 */
export function dayIndex(date = new Date()) {
  const local = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  return Math.floor(local / DAY);
}

/** 一日の時間帯。朝・昼・夕・夜。 */
export function partOfDay(date = new Date()) {
  const h = date.getHours();
  if (h >= 4 && h < 10) return 'morning';
  if (h >= 10 && h < 17) return 'day';
  if (h >= 17 && h < 22) return 'evening';
  return 'night';
}

/** 日付ごとに決まった要素を一つ選ぶ（同じ日は同じもの）。 */
export function pickDaily(list, date = new Date(), offset = 0) {
  if (!list.length) return undefined;
  const i = (dayIndex(date) + offset) % list.length;
  return list[(i + list.length) % list.length];
}

/** 「今日」「昨日」「3日前」のような相対表記。 */
export function relativeDay(t, now = Date.now()) {
  const d = dayIndex(new Date(now)) - dayIndex(new Date(t));
  if (d <= 0) return '今日';
  if (d === 1) return '昨日';
  return `${d}日前`;
}

export function hhmm(date) {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

export function mmss(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
