// 夜空（無常の記録）のための純粋関数。

const DAY = 86400000;

/** FNV-1a 32bit。星の位置を id から決めるために使う。 */
export function hash32(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** id から 0〜1 の座標を決める。同じ星はいつも同じ場所に光る。 */
export function starPosition(id) {
  const a = hash32(id);
  const b = hash32(id + '·');
  return {
    x: 0.06 + (a / 0xffffffff) * 0.88,
    y: 0.08 + (b / 0xffffffff) * 0.84,
    phase: ((a ^ b) % 1000) / 1000 * Math.PI * 2,
  };
}

/** 経過時間に応じた明るさ。生まれた瞬間が 1、fadeDays 後に 0。 */
export function starAlpha(t, now, fadeDays) {
  const life = fadeDays * DAY;
  const age = Math.max(0, now - t);
  if (age >= life) return 0;
  return Math.pow(1 - age / life, 0.7);
}

/** 消えた星を取り除く。消えたものは、本当に消える。 */
export function pruneMoments(moments, now, fadeDays) {
  const life = fadeDays * DAY;
  return moments.filter((m) => now - m.t < life);
}

/** 種類ごとの星の大きさ。言葉を残した星は少し大きい。 */
export function starRadius(type) {
  switch (type) {
    case 'haiku':
    case 'evening':
      return 2.4;
    case 'sos':
      return 2.8;
    case 'practice':
    case 'samu':
      return 2;
    default:
      return 1.5;
  }
}
