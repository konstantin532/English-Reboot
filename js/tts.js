/* ==========================================================================
   English Reboot — Шаг 6: озвучка
   Файл: tts.js — SpeechSynthesis с graceful degradation.
   Голоса грузятся асинхронно: пустой список — не ошибка, говорим дефолтным.
   Кнопки скрываются только при полном отсутствии API (body.tts-unavailable).
   ========================================================================== */

const TTS = (() => {
  'use strict';

  let voices = [];
  let badVoice = null;   // голос, на котором уже случилась ошибка синтеза
  const live = new Set(); // держим ссылки: Chrome собирает «мусорные» utterance и обрывает речь
  let gen = 0;            // поколение очереди — отменяет отложенный старт после stop

  function isTTSAvailable() { return 'speechSynthesis' in window; }

  // Лучший голос — первым: en-US/en-GB, затем «естественные» (Natural/Google/Siri), затем локальные
  function voiceScore(v) {
    const lang = (v.lang || '').toLowerCase().replace('_', '-');
    let score = 0;
    if (lang === 'en-us') score += 30;
    else if (lang === 'en-gb') score += 25;
    // Локальные голоса надёжнее: сетевые (Google, Microsoft Online) молчат офлайн
    if (v.localService) score += 25;
    if (/natural|neural|google|siri|samantha|daniel/i.test(v.name)) score += 10;
    return score;
  }

  function loadVoices() {
    if (!isTTSAvailable()) return;
    voices = speechSynthesis.getVoices()
      .filter((v) => v.lang && v.lang.toLowerCase().startsWith('en'))
      .sort((a, b) => voiceScore(b) - voiceScore(a));
  }

  function getAvailableVoices() { return voices.slice(); }

  function initTTS() {
    if (!isTTSAvailable()) {
      document.body.classList.add('tts-unavailable'); // CSS скроет все .audio-btn, включая будущие
      return false;
    }
    loadVoices();
    if (typeof speechSynthesis.onvoiceschanged !== 'undefined') {
      speechSynthesis.onvoiceschanged = loadVoices;
    }
    return true;
  }

  function makeUtterance(text, rate, lang) {
    const u = new SpeechSynthesisUtterance(text);
    u.rate = Number(rate) || 0.7;
    u.lang = lang || 'en-US';
    u.pitch = 1;
    u.volume = 1;
    const v = voices.find((x) => x !== badVoice);
    if (v) u.voice = v; // иначе — системный дефолт
    live.add(u);
    const done = () => live.delete(u);
    u.addEventListener('end', done);
    u.addEventListener('error', (e) => {
      done();
      // Сетевой голос недоступен → запоминаем и повторяем системным/следующим голосом
      if (e.error === 'synthesis-failed' || e.error === 'network' || e.error === 'voice-unavailable') {
        if (u.voice && badVoice !== u.voice) { badVoice = u.voice; speechSynthesis.speak(makeUtterance(text, rate, lang)); }
      }
    });
    return u;
  }

  // Chrome обрывает одну длинную фразу примерно через 15 секунд —
  // длинный текст режем на предложения и ставим в очередь
  function splitLong(text) {
    const t = String(text || '').trim();
    if (t.length <= 180) return [t];
    const parts = t.match(/[^.!?\n]+[.!?]*["'»”)]*\s*/g) || [t];
    const chunks = [];
    let buf = '';
    for (const p of parts) {
      if ((buf + p).length > 180 && buf) { chunks.push(buf.trim()); buf = ''; }
      buf += p;
    }
    if (buf.trim()) chunks.push(buf.trim());
    return chunks;
  }

  // Chrome/Edge: speak() сразу после cancel() часто «проглатывается» без звука,
  // а движок иногда залипает в паузе. Поэтому: cancel → resume → старт с паузой.
  function enqueue(fn) {
    const busy = speechSynthesis.speaking || speechSynthesis.pending;
    stopSpeaking();
    const my = gen;
    const run = () => { if (my !== gen) return; speechSynthesis.resume(); fn(); };
    if (busy) setTimeout(run, 80); else run();
  }

  function speak(text, rate = 0.7, lang = 'en-US') {
    if (!isTTSAvailable() || !text) return false;
    if (!voices.length) loadVoices(); // голоса могли догрузиться без события
    enqueue(() => splitLong(text).forEach((chunk) => speechSynthesis.speak(makeUtterance(chunk, rate, lang))));
    return true;
  }

  // Вариант с событиями — для караоке-подсветки в shadowing
  function speakWithEvents(text, rate, handlers = {}) {
    if (!isTTSAvailable()) return null;
    const u = makeUtterance(text, rate);
    if (handlers.onboundary) u.onboundary = handlers.onboundary;
    if (handlers.onend) u.onend = handlers.onend;
    if (handlers.onerror) u.onerror = handlers.onerror;
    enqueue(() => speechSynthesis.speak(u));
    return u;
  }

  function speakWord(word, rate = 0.7) { return speak(word, rate); }

  function stopSpeaking() {
    gen++;
    if (isTTSAvailable()) speechSynthesis.cancel();
  }

  return { isTTSAvailable, initTTS, speak, speakWithEvents, speakWord, stopSpeaking, getAvailableVoices };
})();