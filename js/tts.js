/* ==========================================================================
   English Reboot — Шаг 6: озвучка
   Файл: tts.js — SpeechSynthesis с graceful degradation.
   Голоса грузятся асинхронно: пустой список — не ошибка, говорим дефолтным.
   Кнопки скрываются только при полном отсутствии API (body.tts-unavailable).
   ========================================================================== */

const TTS = (() => {
  'use strict';

  let voices = [];

  function isTTSAvailable() { return 'speechSynthesis' in window; }

  // Лучший голос — первым: en-US/en-GB, затем «естественные» (Natural/Google/Siri), затем локальные
  function voiceScore(v) {
    const lang = (v.lang || '').toLowerCase().replace('_', '-');
    let score = 0;
    if (lang === 'en-us') score += 30;
    else if (lang === 'en-gb') score += 25;
    if (/natural|neural|google|siri|samantha|daniel/i.test(v.name)) score += 20;
    if (v.localService) score += 5;
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
    if (voices.length) u.voice = voices[0]; // иначе — системный дефолт
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

  function speak(text, rate = 0.7, lang = 'en-US') {
    if (!isTTSAvailable() || !text) return false;
    stopSpeaking();
    splitLong(text).forEach((chunk) => speechSynthesis.speak(makeUtterance(chunk, rate, lang)));
    return true;
  }

  // Вариант с событиями — для караоке-подсветки в shadowing
  function speakWithEvents(text, rate, handlers = {}) {
    if (!isTTSAvailable()) return null;
    stopSpeaking();
    const u = makeUtterance(text, rate);
    if (handlers.onboundary) u.onboundary = handlers.onboundary;
    if (handlers.onend) u.onend = handlers.onend;
    if (handlers.onerror) u.onerror = handlers.onerror;
    speechSynthesis.speak(u);
    return u;
  }

  function speakWord(word, rate = 0.7) { return speak(word, rate); }

  function stopSpeaking() {
    if (isTTSAvailable()) speechSynthesis.cancel();
  }

  return { isTTSAvailable, initTTS, speak, speakWithEvents, speakWord, stopSpeaking, getAvailableVoices };
})();