import { h, closeButton, exitRitual, ICONS } from '../ui.js';
import { bell, speak, stopSpeech, canSpeak, keepAwake, unlockAudio, haptic } from '../audio.js';
import { addMoment, settings, setSetting } from '../store.js';
import { back, go } from '../nav.js';
import { PRACTICES, practiceMinutes, INQUIRIES } from '../content.js';
import { pickDaily } from '../lib/day.js';
import { bodyFigure } from './body.js';
import { breathLoop } from './breath.js';

const LEAD_MS = 2600; // 最初の鐘から、最初の言葉まで

function inquiryPractice() {
  const q = pickDaily(INQUIRIES, new Date());
  return {
    id: 'inquiry',
    title: '今日の問い',
    sub: '答えを探さず、問いのあとの静けさへ',
    intro: '答えを出さなくていい問いです。',
    momentType: 'inquiry',
    steps: [
      { t: q, d: 14 },
      { t: '答えを探さなくていい。', d: 8 },
      { t: '問いのあとに訪れる、静けさを感じます。', d: 22 },
    ],
  };
}

export function playerView(root, id) {
  const p = id === 'inquiry' ? inquiryPractice() : PRACTICES.find((x) => x.id === id);
  if (!p) {
    go('practice');
    return;
  }
  const s = settings();
  let voice = s.voice && canSpeak();

  let i = -1;
  let timer = null;
  let stepStart = 0;
  let remaining = 0;
  let elapsed = 0;
  let paused = false;
  let running = false;
  let progressTimer = null;
  let release = () => {};
  let exitEl = null;
  let alive = true;
  const totalMs = p.steps.reduce((a, b) => a + b.d * 1000, 0) + LEAD_MS;

  const top = h('div', { class: 'immersive-top' }, closeButton(() => close()));
  const body = h('div', { class: 'stage' });
  root.append(top, body);

  // ---- はじめる前の画面（音声を有効にするための、利用者の操作でもある）----
  const voiceToggle = h('label', { class: 'switch-row' }, h('input', { type: 'checkbox', id: 'pv-voice', checked: voice, disabled: !canSpeak(), onchange: (e) => (voice = e.target.checked) }), h('span', null, '声のガイド'));
  const eyesToggle = h('label', { class: 'switch-row' }, h('input', { type: 'checkbox', id: 'pv-eyes' }), h('span', null, '目を閉じて行う（画面を暗くする）'));

  body.append(
    h(
      'div',
      { class: 'pre' },
      h('p', { class: 'eyebrow' }, `${practiceMinutes(p)}分`),
      h('h1', { class: 'pre-title', tabindex: '-1' }, p.title),
      h('p', { class: 'pre-intro' }, p.intro),
      h('div', { class: 'pre-options' }, voiceToggle, eyesToggle),
      h('button', { class: 'btn btn-primary btn-wide', id: 'pv-start', onclick: start }, 'はじめる'),
      h('p', { class: 'fine' }, '目は開けたままでも大丈夫です。いつでもやめられます。'),
    ),
  );

  // ---- 実行中 ----
  const bar = h('div', { class: 'progress', 'aria-hidden': 'true' }, h('div', { class: 'progress-fill' }));
  const text = h('p', { class: 'step-text', 'aria-live': 'polite' });
  // インナーボディの段があるワークでは、図の光が注意の場所を示す
  const fig = p.steps.some((st) => st.r) ? bodyFigure('figure-player') : null;
  let stopFigBreath = () => {};
  let figBreathing = false;
  function figureFor(st) {
    if (!fig) return;
    if (st.r) fig.light(st.r);
    if (st.breath && !figBreathing) {
      figBreathing = true;
      stopFigBreath = breathLoop({ delay: 200, onInhale: (sec) => fig.phase('in', sec), onExhale: (sec) => fig.phase('out', sec) });
    } else if (!st.breath && figBreathing) {
      figBreathing = false;
      stopFigBreath();
      fig.phase(null);
    }
  }
  const pauseBtn = h('button', { class: 'icon-btn', 'aria-label': '一時停止', onclick: togglePause, svg: ICONS.pause });
  const voiceBtn = h('button', { class: 'icon-btn', 'aria-label': '声のガイド', onclick: toggleVoice });
  const eyesBtn = h('button', { class: 'icon-btn', 'aria-label': '画面を暗くする', onclick: () => setVoid(true), svg: ICONS.eye });
  const voidEl = h('div', { class: 'void', hidden: true, onclick: () => setVoid(false) }, h('p', { class: 'void-text' }, ''), h('p', { class: 'void-hint' }, 'タップで戻る'));

  function setVoiceIcon() {
    voiceBtn.innerHTML = voice ? ICONS.voice : ICONS.mute;
    voiceBtn.setAttribute('aria-pressed', String(voice));
  }

  function setVoid(on) {
    voidEl.hidden = !on;
    document.body.classList.toggle('is-void', on);
  }

  function start() {
    unlockAudio();
    if (voice !== s.voice && canSpeak()) setSetting('voice', voice);
    const eyes = document.getElementById('pv-eyes')?.checked;
    body.classList.add('player');
    body.replaceChildren(
      bar,
      h('div', { class: 'step-wrap' + (fig ? ' has-figure' : '') }, fig ? fig.el : null, text),
      h('div', { class: 'player-controls' }, pauseBtn, voiceBtn, eyesBtn),
    );
    root.append(voidEl);
    setVoiceIcon();
    if (eyes) setVoid(true);
    // 画面の点灯維持は待たずに始める（許可の応答で開始が遅れないように）
    keepAwake().then((r) => {
      if (alive && running) release = r;
      else r();
    });
    running = true;
    bell('bowl');
    haptic([20, 60, 20]);
    elapsed = 0;
    remaining = LEAD_MS;
    i = -1;
    schedule();
    progressTimer = setInterval(drawProgress, 250);
    document.addEventListener('visibilitychange', onVisibility);
  }

  function schedule() {
    stepStart = Date.now();
    clearTimeout(timer);
    timer = setTimeout(() => {
      elapsed += remaining;
      next();
    }, remaining);
  }

  function next() {
    i += 1;
    if (i >= p.steps.length) return complete();
    const st = p.steps[i];
    text.classList.remove('in');
    void text.offsetWidth;
    text.textContent = st.t;
    voidEl.querySelector('.void-text').textContent = st.t;
    text.classList.add('in');
    figureFor(st);
    if (st.bell) bell('bowl');
    else if (i > 0) haptic(10);
    if (voice && st.t) speak(st.v || st.t);
    remaining = st.d * 1000;
    schedule();
  }

  function drawProgress() {
    const cur = paused ? elapsed : elapsed + (Date.now() - stepStart);
    bar.firstChild.style.transform = `scaleX(${Math.min(1, cur / totalMs)})`;
  }

  function togglePause() {
    if (!running) return;
    if (paused) {
      paused = false;
      pauseBtn.innerHTML = ICONS.pause;
      pauseBtn.setAttribute('aria-label', '一時停止');
      if (i >= 0 && p.steps[i]) figureFor(p.steps[i]);
      schedule();
    } else {
      paused = true;
      clearTimeout(timer);
      const used = Date.now() - stepStart;
      remaining = Math.max(0, remaining - used);
      elapsed += used;
      stopSpeech();
      stopFigBreath();
      figBreathing = false;
      fig?.phase(null);
      pauseBtn.innerHTML = ICONS.play;
      pauseBtn.setAttribute('aria-label', '再開');
    }
  }

  function toggleVoice() {
    voice = !voice;
    setSetting('voice', voice);
    if (!voice) stopSpeech();
    setVoiceIcon();
  }

  function onVisibility() {
    if (document.visibilityState === 'hidden' && running && !paused) togglePause();
  }

  function teardown() {
    stopFigBreath();
    figBreathing = false;
    running = false;
    clearTimeout(timer);
    clearInterval(progressTimer);
    stopSpeech();
    release();
    setVoid(false);
    document.removeEventListener('visibilitychange', onVisibility);
  }

  function complete() {
    teardown();
    if (!p.quietEnd) bell('bowl');
    addMoment(p.momentType || 'practice', { label: p.title });
    voidEl.remove();
    body.classList.remove('player');
    exitEl = exitRitual({
      ...(p.quietEnd ? { title: 'おやすみなさい。', lines: ['このまま、目を閉じて。'], outward: false } : {}),
      actions: [h('button', { class: 'btn', onclick: back }, '閉じる')],
    });
    body.replaceChildren(exitEl);
  }

  function close() {
    // 途中でやめても、30秒以上そこに居たなら、それは在った時間。
    const cur = paused ? elapsed : elapsed + (Date.now() - stepStart);
    if (running && cur > 30000) addMoment(p.momentType || 'practice', { label: p.title });
    teardown();
    back();
  }

  return () => {
    alive = false;
    teardown();
    exitEl?._cleanup?.();
  };
}
