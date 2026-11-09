// 音と声と振動。鐘は音源ファイルを使わず、倍音を合成してつくる。
// 鐘の本体は、音が消えたあとの静けさ。だから減衰を長く、音量は控えめに。

import { settings } from './store.js';

let ctx = null;

function getCtx() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  try {
    ctx = new AC();
  } catch {
    ctx = null;
  }
  return ctx;
}

/** iOS などは、ユーザー操作の中で一度鳴らしておかないと音が出ない。 */
export function unlockAudio() {
  const c = getCtx();
  if (!c) return;
  if (c.state === 'suspended') c.resume().catch(() => {});
  try {
    const b = c.createBuffer(1, 1, 22050);
    const s = c.createBufferSource();
    s.buffer = b;
    s.connect(c.destination);
    s.start(0);
  } catch {
    /* noop */
  }
}

// シンギングボウルに近い、非整数倍の倍音。わずかにずらした対でうなりをつくる。
const BOWL = [
  { r: 1, a: 1, d: 9 },
  { r: 1.0042, a: 0.55, d: 8.5 },
  { r: 2.71, a: 0.42, d: 6.5 },
  { r: 2.716, a: 0.22, d: 6 },
  { r: 5.15, a: 0.16, d: 4 },
  { r: 8.43, a: 0.07, d: 2.4 },
  { r: 12.3, a: 0.035, d: 1.4 },
];

const KINDS = {
  bowl: { f0: 196, gain: 0.22, partials: BOWL, decay: 1 },
  soft: { f0: 392, gain: 0.1, partials: BOWL.slice(0, 4), decay: 0.45 },
  deep: { f0: 130.8, gain: 0.26, partials: BOWL, decay: 1.25 },
};

/** 鐘を鳴らす。kind: bowl | soft | deep */
export function bell(kind = 'bowl') {
  const s = settings();
  if (!s.bell) return;
  const c = getCtx();
  if (!c) return;
  if (c.state === 'suspended') c.resume().catch(() => {});
  const k = KINDS[kind] || KINDS.bowl;
  const now = c.currentTime + 0.02;
  const master = c.createGain();
  master.gain.value = Math.max(0, Math.min(1, s.volume)) * k.gain;
  master.connect(c.destination);

  for (const p of k.partials) {
    const o = c.createOscillator();
    o.type = 'sine';
    o.frequency.value = k.f0 * p.r;
    const g = c.createGain();
    const dur = p.d * k.decay;
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(p.a, now + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    o.connect(g).connect(master);
    o.start(now);
    o.stop(now + dur + 0.05);
  }

  // 打つ瞬間の、ごく短いかすれ。
  try {
    const len = Math.floor(c.sampleRate * 0.03);
    const buf = c.createBuffer(1, len, c.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const n = c.createBufferSource();
    n.buffer = buf;
    const bp = c.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = k.f0 * 6;
    bp.Q.value = 2;
    const ng = c.createGain();
    ng.gain.value = 0.08;
    n.connect(bp).connect(ng).connect(master);
    n.start(now);
  } catch {
    /* noop */
  }
}

// ---- 声（端末の読み上げ）----

let jaVoice = null;
function pickVoice() {
  if (!('speechSynthesis' in window)) return null;
  const voices = window.speechSynthesis.getVoices();
  jaVoice = voices.find((v) => /^ja/i.test(v.lang)) || null;
  return jaVoice;
}
if ('speechSynthesis' in window) {
  pickVoice();
  window.speechSynthesis.addEventListener?.('voiceschanged', pickVoice);
}

export const canSpeak = () => 'speechSynthesis' in window;

export function speak(text) {
  if (!text || !canSpeak()) return;
  try {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'ja-JP';
    u.rate = settings().voiceRate || 0.9;
    u.pitch = 0.95;
    u.volume = 0.9;
    if (jaVoice || pickVoice()) u.voice = jaVoice;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  } catch {
    /* noop */
  }
}

export function stopSpeech() {
  try {
    if (canSpeak()) window.speechSynthesis.cancel();
  } catch {
    /* noop */
  }
}

// ---- 振動（Android など対応端末のみ）----

export function haptic(pattern = 12) {
  if (!settings().haptics) return;
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* noop */
  }
}

// ---- 画面を点けたままにする ----

export async function keepAwake() {
  let lock = null;
  let released = false;
  const request = async () => {
    try {
      if ('wakeLock' in navigator && document.visibilityState === 'visible') {
        lock = await navigator.wakeLock.request('screen');
      }
    } catch {
      lock = null;
    }
  };
  const onVis = () => {
    if (!released && document.visibilityState === 'visible') request();
  };
  await request();
  document.addEventListener('visibilitychange', onVis);
  return () => {
    released = true;
    document.removeEventListener('visibilitychange', onVis);
    lock?.release?.().catch(() => {});
  };
}
