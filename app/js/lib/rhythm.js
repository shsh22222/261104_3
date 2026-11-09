// 呼吸とともに: 利用者自身の呼吸のリズムから、数字ではなく一文の気づきを返す。

/**
 * @param {{inhale:number, exhale:number}[]} cycles  1呼吸ごとの吸う・吐くの長さ（ミリ秒）
 * @returns {'too-short'|'deepening'|'quickening'|'steady'}
 */
export function rhythmTrend(cycles) {
  const full = cycles.filter((c) => c.inhale > 300 && c.exhale > 300);
  if (full.length < 5) return 'too-short';
  const len = (c) => c.inhale + c.exhale;
  const n = Math.min(3, Math.floor(full.length / 2));
  const avg = (list) => list.reduce((a, c) => a + len(c), 0) / list.length;
  const first = avg(full.slice(0, n));
  const last = avg(full.slice(-n));
  if (last > first * 1.15) return 'deepening';
  if (last < first * 0.85) return 'quickening';
  return 'steady';
}

export const RHYTHM_WORDS = {
  'too-short': '呼吸を変えなくていい。体が呼吸しているのを、感じているだけで。',
  deepening: '呼吸が、ひとりでにゆっくりになっていきました。あなたが何かをしたのではなく、体がそうしたのです。',
  quickening: '呼吸が少し速くなっていたかもしれません。気づいたことで、もう十分です。',
  steady: '呼吸は、同じ波で続いていました。その波を、内側から感じていました。',
};
