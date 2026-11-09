import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rhythmTrend } from '../../app/js/lib/rhythm.js';
import { PRACTICES, ENTRIES, holdSequence } from '../../app/js/content.js';

const REGIONS = new Set(['head', 'chest', 'belly', 'arms', 'hands', 'legs', 'feet', 'whole']);
const cyc = (sec) => ({ inhale: sec * 400, exhale: sec * 600 });

test('rhythm: 呼吸が少ないうちは判断しない', () => {
  assert.equal(rhythmTrend([cyc(5), cyc(5)]), 'too-short');
});

test('rhythm: ゆっくりになった・速くなった・同じ', () => {
  assert.equal(rhythmTrend([cyc(4), cyc(4), cyc(4), cyc(5), cyc(6), cyc(6), cyc(6)]), 'deepening');
  assert.equal(rhythmTrend([cyc(8), cyc(8), cyc(8), cyc(6), cyc(5), cyc(5), cyc(5)]), 'quickening');
  assert.equal(rhythmTrend([cyc(6), cyc(6), cyc(6), cyc(6), cyc(6), cyc(6)]), 'steady');
});

test('rhythm: 押しただけの呼吸（吐く長さがない）は数えない', () => {
  assert.equal(rhythmTrend([...Array(6)].map(() => ({ inhale: 3000, exhale: 0 }))), 'too-short');
});

test('body: ワークの光らせる場所はすべて図にある', () => {
  for (const p of PRACTICES) for (const st of p.steps) for (const r of [].concat(st.r || [])) assert.ok(REGIONS.has(r), `${p.id}: ${r}`);
});

test('body: インナーボディが軸（いちばん多い入口）', () => {
  const body = PRACTICES.filter((p) => p.portal === 'body').length;
  assert.ok(body >= 8, `インナーボディのワークが少ない: ${body}`);
  assert.equal(PRACTICES[0].portal, 'body');
});

test('body: どの入口からでも、指を置く流れは全身へひろがる', () => {
  for (const e of ENTRIES) {
    const seq = holdSequence(e.id);
    assert.ok(seq.length >= 5);
    for (const [, regions] of seq) for (const r of regions) assert.ok(REGIONS.has(r));
    assert.deepEqual(seq.at(-1)[1], ['whole']);
    for (let i = 1; i < seq.length; i++) assert.ok(seq[i][0] > seq[i - 1][0]);
  }
});
