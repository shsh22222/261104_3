import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analyzePerception } from '../../app/js/lib/perception.js';
import { seasonFor, KO_COUNT } from '../../app/js/lib/seasons.js';
import { starAlpha, pruneMoments, starPosition } from '../../app/js/lib/sky.js';
import { dayIndex, partOfDay, pickDaily, relativeDay, mmss } from '../../app/js/lib/day.js';

const DAY = 86400000;

test('perception: 感覚だけの句には指摘をしない', () => {
  const r = analyzePerception('湯気がゆれる　窓の外で鳥の声');
  assert.equal(r.notes.length, 0);
  assert.ok(r.senses >= 1);
});

test('perception: 評価・時間・物語の言葉を見分ける', () => {
  const r = analyzePerception('最悪だ、明日もどうせ雨だろう');
  const cats = r.notes.map((n) => n.cat).sort();
  assert.deepEqual(cats, ['judge', 'story', 'time']);
  const story = r.notes.find((n) => n.cat === 'story');
  assert.ok(story.words.includes('どうせ'));
});

test('perception: 「ものに」のような語を物語と誤認しない', () => {
  const r = analyzePerception('手が冷たいものに触れる');
  assert.equal(r.notes.length, 0);
});

test('seasons: 72候すべてがあり、代表的な日付で正しい候を返す', () => {
  assert.equal(KO_COUNT, 72);
  assert.equal(seasonFor(new Date(2026, 10, 9)).ko, '山茶始開');
  assert.equal(seasonFor(new Date(2026, 10, 9)).sekki, '立冬');
  assert.equal(seasonFor(new Date(2026, 0, 2)).ko, '雪下出麦');
  assert.equal(seasonFor(new Date(2026, 11, 31)).ko, '麋角解');
  assert.equal(seasonFor(new Date(2026, 1, 4)).sekki, '立春');
  assert.equal(seasonFor(new Date(2026, 2, 27)).ko, '櫻始開');
});

test('sky: 星は時間とともに暗くなり、期限で消える', () => {
  const now = Date.now();
  assert.equal(starAlpha(now, now, 7), 1);
  const mid = starAlpha(now - 3.5 * DAY, now, 7);
  assert.ok(mid > 0 && mid < 1);
  assert.equal(starAlpha(now - 7 * DAY, now, 7), 0);
  const kept = pruneMoments([{ t: now - 8 * DAY }, { t: now - DAY }], now, 7);
  assert.equal(kept.length, 1);
});

test('sky: 同じ id の星は同じ場所に光る', () => {
  const a = starPosition('abc');
  const b = starPosition('abc');
  assert.deepEqual(a, b);
  assert.ok(a.x > 0 && a.x < 1 && a.y > 0 && a.y < 1);
});

test('day: 日替わりの選択は同じ日なら同じ', () => {
  const d1 = new Date(2026, 10, 9, 7);
  const d2 = new Date(2026, 10, 9, 23);
  assert.equal(dayIndex(d1), dayIndex(d2));
  assert.equal(pickDaily(['a', 'b', 'c'], d1), pickDaily(['a', 'b', 'c'], d2));
  assert.notEqual(pickDaily(['a', 'b', 'c'], d1), pickDaily(['a', 'b', 'c'], new Date(2026, 10, 10)));
});

test('day: 時間帯と相対表記', () => {
  assert.equal(partOfDay(new Date(2026, 0, 1, 6)), 'morning');
  assert.equal(partOfDay(new Date(2026, 0, 1, 12)), 'day');
  assert.equal(partOfDay(new Date(2026, 0, 1, 19)), 'evening');
  assert.equal(partOfDay(new Date(2026, 0, 1, 2)), 'night');
  const now = new Date(2026, 10, 9, 12).getTime();
  assert.equal(relativeDay(now - 1000, now), '今日');
  assert.equal(relativeDay(now - DAY, now), '昨日');
  assert.equal(relativeDay(now - 3 * DAY, now), '3日前');
  assert.equal(mmss(65000), '1:05');
});
