import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PRACTICES, PORTALS, TEACHINGS, ANCHORS, INQUIRIES, MOMENT_LABELS, practiceMinutes } from '../../app/js/content.js';

test('content: 実践はすべて入口に属し、段階と長さを持つ', () => {
  const portals = new Set(PORTALS.map((p) => p.id));
  const ids = new Set();
  for (const p of PRACTICES) {
    assert.ok(portals.has(p.portal), p.id);
    assert.ok(!ids.has(p.id), `重複: ${p.id}`);
    ids.add(p.id);
    assert.match(p.id, /^[a-z0-9-]+$/);
    assert.ok(p.steps.length >= 3);
    for (const s of p.steps) assert.ok(s.d > 0);
    const m = practiceMinutes(p);
    assert.ok(m >= 1 && m <= 6, `${p.id}: ${m}分`);
  }
});

test('content: 教えの地図のリンク先が存在する', () => {
  const routes = new Set(['breath', 'sos', 'samu', ...PRACTICES.map((p) => 'play-' + p.id)]);
  for (const t of TEACHINGS) assert.ok(routes.has(t.practice), `${t.id} → ${t.practice}`);
});

test('content: 一画面一文の原則（長すぎる段がない）', () => {
  for (const p of PRACTICES) for (const s of p.steps) assert.ok(s.t.length <= 48, `${p.id}: ${s.t}`);
  for (const q of INQUIRIES) assert.ok(q.length <= 48, q);
});

test('content: アンカーと記録の種類', () => {
  assert.equal(new Set(ANCHORS.map((a) => a.id)).size, ANCHORS.length);
  for (const k of ['breath', 'practice', 'anchor', 'bell', 'gate', 'haiku', 'samu', 'sos', 'evening', 'inquiry']) assert.ok(MOMENT_LABELS[k], k);
});
