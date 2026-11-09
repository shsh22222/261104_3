import { test } from 'node:test';
import assert from 'node:assert/strict';
import { planBells, buildICS, foldLine, escapeText } from '../../app/js/lib/ics.js';

function seeded(seed = 42) {
  let s = seed;
  return () => ((s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296);
}

test('planBells: 指定の時間帯の中に収まり、最小間隔を守る', () => {
  const from = new Date(2026, 10, 9, 0, 0); // 0時なので当日分もすべて有効
  const times = planBells({ days: 14, perDay: 5, startMin: 540, endMin: 1260, minGapMin: 40, from, rand: seeded() });
  assert.equal(times.length, 14 * 5);
  const byDay = new Map();
  for (const t of times) {
    const m = t.getHours() * 60 + t.getMinutes();
    assert.ok(m >= 540 && m <= 1260, `時間帯の外: ${t}`);
    const key = t.toDateString();
    byDay.set(key, [...(byDay.get(key) || []), t.getTime()]);
  }
  assert.equal(byDay.size, 14);
  for (const list of byDay.values()) {
    list.sort((a, b) => a - b);
    for (let i = 1; i < list.length; i++) assert.ok(list[i] - list[i - 1] >= 39.5 * 60000, '間隔が短すぎる');
  }
});

test('planBells: すでに過ぎた時刻（と直後の10分）は含めない', () => {
  const from = new Date(2026, 10, 9, 15, 0);
  const times = planBells({ days: 1, perDay: 7, startMin: 540, endMin: 1260, from, rand: seeded(7) });
  for (const t of times) assert.ok(t.getTime() >= from.getTime() + 10 * 60000);
});

test('planBells: 狭い時間帯では回数を減らして間隔を守る', () => {
  const from = new Date(2026, 10, 9, 0, 0);
  const times = planBells({ days: 1, perDay: 7, startMin: 600, endMin: 660, minGapMin: 40, from, rand: seeded(3) });
  assert.equal(times.length, 2);
});

test('escapeText: RFC 5545 の特殊文字', () => {
  assert.equal(escapeText('a,b;c\\d\ne'), 'a\\,b\\;c\\\\d\\ne');
});

test('foldLine: 75オクテットを超えず、マルチバイト文字を割らない', () => {
  const line = 'DESCRIPTION:' + 'いま、この瞬間に、問題はありますか。'.repeat(6);
  const folded = foldLine(line);
  const enc = new TextEncoder();
  for (const part of folded.split('\r\n')) assert.ok(enc.encode(part).length <= 75, `長すぎる行: ${enc.encode(part).length}`);
  assert.equal(folded.replace(/\r\n /g, ''), line);
});

test('buildICS: 予定とアラームを含む正しい骨格', () => {
  const times = [new Date(2026, 10, 10, 9, 42), new Date(2026, 10, 10, 13, 5)];
  const ics = buildICS(times, { appUrl: 'https://example.com/ma/', prompts: ['問い,その一'], now: new Date(Date.UTC(2026, 10, 9, 3, 0, 0)), rand: seeded() });
  assert.ok(ics.startsWith('BEGIN:VCALENDAR\r\n'));
  assert.ok(ics.endsWith('END:VCALENDAR\r\n'));
  assert.equal((ics.match(/BEGIN:VEVENT/g) || []).length, 2);
  assert.equal((ics.match(/BEGIN:VALARM/g) || []).length, 2);
  assert.match(ics, /DTSTART:20261110T094200\r\n/);
  assert.match(ics, /DTSTAMP:20261109T030000Z/);
  assert.match(ics, /URL:https:\/\/example.com\/ma\/#bell/);
  assert.ok(ics.includes('問い\\,その一'));
  for (const line of ics.split('\r\n')) assert.ok(new TextEncoder().encode(line).length <= 75);
});
