// 端末内だけに保存する。送信はしない。
// localStorage が使えない環境（プライベートブラウズ等）ではメモリだけで動く。

import { pruneMoments } from './lib/sky.js';

const KEY = 'ma.v1';
const SAMPLE_DAYS = 30;
const DAY = 86400000;

export const DEFAULT_SETTINGS = {
  bell: true,
  volume: 0.7,
  voice: true,
  voiceRate: 0.9,
  haptics: true,
  theme: 'auto', // auto | dark | light
  fadeDays: 7, // 1 | 7 | 30
  showCounts: false,
  minimal: false,
};

function fresh() {
  return {
    v: 1,
    onboarded: false,
    settings: { ...DEFAULT_SETTINGS },
    anchors: ['phone', 'handwash', 'door'],
    moments: [],
    samples: [],
  };
}

function read() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return fresh();
    const data = JSON.parse(raw);
    const base = fresh();
    return {
      ...base,
      ...data,
      settings: { ...base.settings, ...(data.settings || {}) },
      moments: Array.isArray(data.moments) ? data.moments : [],
      samples: Array.isArray(data.samples) ? data.samples : [],
      anchors: Array.isArray(data.anchors) ? data.anchors : base.anchors,
    };
  } catch {
    return fresh();
  }
}

let state = read();
const listeners = new Set();

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* 保存できなくても動き続ける */
  }
  listeners.forEach((fn) => fn(state));
}

export function onChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export const get = () => state;
export const settings = () => state.settings;

export function setSetting(key, value) {
  state.settings[key] = value;
  if (key === 'fadeDays') prune();
  save();
}

export function update(fn) {
  fn(state);
  save();
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

/** 在った瞬間を一つ、夜空に置く。 */
export function addMoment(type, extra = {}) {
  const m = { id: uid(), t: Date.now(), type };
  if (extra.label) m.label = String(extra.label).slice(0, 60);
  if (extra.text) m.text = String(extra.text).slice(0, 200);
  state.moments.push(m);
  prune();
  save();
  return m;
}

export function addSample(answer) {
  state.samples.push({ t: Date.now(), a: answer });
  prune();
  save();
}

/** 消えた星を消す。消えたものは、端末からも消える。 */
export function prune(now = Date.now()) {
  state.moments = pruneMoments(state.moments, now, state.settings.fadeDays);
  state.samples = state.samples.filter((s) => now - s.t < SAMPLE_DAYS * DAY);
}

export function exportJSON() {
  return JSON.stringify({ exportedAt: new Date().toISOString(), app: '間 MA', ...state }, null, 2);
}

export function resetAll() {
  state = fresh();
  state.onboarded = true;
  save();
}

prune();
