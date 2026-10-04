/* ==========================================================================
   English Reboot — озвучка с резервными источниками
   Файл: tts.js

   Цепочка (режим «auto», по умолчанию):
     1. Системный голос браузера (SpeechSynthesis) — работает офлайн.
     2. Если английского голоса нет, синтез вернул ошибку или не начался
        за 1,5 с — онлайн-резерв:
        • одно слово → живая запись американского произношения из Wiktionary
          (через открытый https://api.dictionaryapi.dev);
        • фраза или слово без записи → онлайн-синтез Google Translate
          (неофициальный адрес; может перестать работать — тогда только п. 1).
   Режимы задаются в Настройки → Звук и хранятся в localStorage:
     'auto' | 'system' (только голос системы) | 'online' (только онлайн).
   ========================================================================== */

const TTS = (() => {
  'use strict';

  const LS_MODE = 'er_tts_mode';
  const LS_VOICE = 'er_tts_voice';
  const START_TIMEOUT = 1500;

  let voices = [];
  let systemBroken = false;   // системный синтез уже подвёл в этой сессии → сразу онлайн
  let lastError = '';
  let lastEngine = '';
  let noticeShown = false;
  const live = new Set();     // держим ссылки: Chrome собирает «мусорные» utterance
  let gen = 0;                // поколение: stop отменяет отложенный старт и онлайн-очередь
  let audioEl = null;
  const wordAudioCache = new Map(); // слово → url записи | null

  const lsGet = (k, d) => { try { return localStorage.getItem(k) || d; } catch (e) { return d; } };
  const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* storage недоступен */ } };

  function getMode() { return lsGet(LS_MODE, 'auto'); }
  function setMode(m) { lsSet(LS_MODE, m); systemBroken = false; }

  const hasSynth = () => 'speechSynthesis' in window;
  function isTTSAvailable() { return hasSynth() || 'Audio' in window; }

  function notice(msg) {
    if (noticeShown) return;
    noticeShown = true;
    if (window.ER && window.ER.toast) window.ER.toast(msg, 'warning');
  }

  /* ---------- Голоса ---------- */
  // Нейронные голоса звучат естественно и разборчиво: Edge — «… Online (Natural)»,
  // macOS/iOS — Premium/Enhanced, Chrome — Google US English. Локальные Zira/David — «роботы».
  const NATURAL = /natural|neural|premium|enhanced|multilingual/i;
  const NICE = /\b(aria|jenny|ava|andrew|emma|brian|guy|michelle|christopher|eric|roger|steffan|ana|samantha|allison|evan|nathan|zoe|joelle|nicky|noelle)\b/i;
  function isNatural(v) { return NATURAL.test(v.name || '') || /google us english/i.test(v.name || ''); }

  function voiceScore(v, online) {
    const lang = (v.lang || '').toLowerCase().replace('_', '-');
    let score = 0;
    if (lang === 'en-us') score += 30;           // учим американский английский
    else if (lang === 'en-ca') score += 14;
    else if (lang === 'en-gb' || lang === 'en-au') score += 10;
    if (NATURAL.test(v.name || '')) score += 60;
    else if (/google us english/i.test(v.name || '')) score += 40;
    if (NICE.test(v.name || '')) score += 12;
    if (/zira|david|mark|hazel|george/i.test(v.name || '') && !NATURAL.test(v.name || '')) score -= 8;
    // офлайн онлайн-голоса молчат — тогда главное, чтобы голос был локальным
    if (!online && !v.localService) score -= 200;
    else if (v.localService) score += 5;
    return score;
  }

  function loadVoices() {
    if (!hasSynth()) return;
    const online = navigator.onLine !== false;
    voices = speechSynthesis.getVoices()
      .filter((v) => v.lang && v.lang.toLowerCase().startsWith('en'))
      .sort((a, b) => voiceScore(b, online) - voiceScore(a, online));
  }

  function chosenVoice() {
    const uri = lsGet(LS_VOICE, '');
    const picked = uri && voices.find((v) => v.voiceURI === uri);
    // выбранный вручную онлайн-голос офлайн не заговорит — берём лучший локальный
    if (picked && (picked.localService || navigator.onLine !== false)) return picked;
    const online = navigator.onLine !== false;
    return voices.slice().sort((a, b) => voiceScore(b, online) - voiceScore(a, online))[0] || null;
  }

  function getAvailableVoices() { if (!voices.length) loadVoices(); return voices.slice(); }
  function getVoiceURI() { const v = chosenVoice(); return v ? v.voiceURI : ''; }
  function setVoice(uri) { lsSet(LS_VOICE, uri || ''); systemBroken = false; }

  function initTTS() {
    if (hasSynth()) {
      loadVoices();
      if (typeof speechSynthesis.onvoiceschanged !== 'undefined') speechSynthesis.onvoiceschanged = loadVoices;
      if (window.addEventListener) { window.addEventListener('online', loadVoices); window.addEventListener('offline', loadVoices); }
    }
    if (!isTTSAvailable()) { document.body.classList.add('tts-unavailable'); return false; }
    return true;
  }

  function getStatus() {
    if (!voices.length) loadVoices();
    const v = chosenVoice();
    return {
      mode: getMode(), synth: hasSynth(),
      allVoices: hasSynth() ? speechSynthesis.getVoices().length : 0,
      englishVoices: voices.length, voice: v ? `${v.name} (${v.lang})` : null,
      systemBroken, lastError, lastEngine, online: navigator.onLine !== false,
    };
  }

  /* ---------- Текст ---------- */
  // Chrome обрывает одну длинную фразу примерно через 15 секунд, онлайн-TTS
  // принимает ~200 символов — режем на предложения
  function splitLong(text, max = 180) {
    const t = String(text || '').trim();
    if (t.length <= max) return [t];
    const parts = t.match(/[^.!?\n]+[.!?]*["'»”)]*\s*/g) || [t];
    const chunks = [];
    let buf = '';
    for (const p of parts) {
      if ((buf + p).length > max && buf) { chunks.push(buf.trim()); buf = ''; }
      buf += p;
    }
    if (buf.trim()) chunks.push(buf.trim());
    return chunks.flatMap((c) => (c.length > max ? (c.match(new RegExp(`.{1,${max}}(\\s|$)`, 'g')) || [c]) : [c]));
  }

  /* ---------- Онлайн-источники ---------- */
  async function wordRecording(word) {
    const w = word.toLowerCase();
    if (wordAudioCache.has(w)) return wordAudioCache.get(w);
    let url = null;
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 2500);
      const r = await fetch('https://api.dictionaryapi.dev/api/v2/entries/en/' + encodeURIComponent(w), { signal: ctrl.signal });
      clearTimeout(t);
      if (r.ok) {
        const data = await r.json();
        const all = data.flatMap((e) => e.phonetics || []).map((p) => p.audio).filter(Boolean);
        url = all.find((a) => /-us\.mp3$/.test(a)) || all.find((a) => /-(ca|au)\.mp3$/.test(a)) || all[0] || null;
      }
    } catch (e) { url = null; }
    wordAudioCache.set(w, url);
    return url;
  }

  function onlineTtsUrl(chunk) {
    return 'https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=en-US&q=' + encodeURIComponent(chunk);
  }

  function playUrls(urls, rate, my, handlers, isRecording) {
    let i = 0;
    const next = () => {
      if (my !== gen) return;
      if (i >= urls.length) { if (handlers.onend) handlers.onend(); return; }
      const url = urls[i++];
      audioEl = new Audio(url);
      audioEl.playbackRate = Math.min(1.1, Math.max(0.6, (Number(rate) || 0.7) + 0.15));
      audioEl.onended = next;
      audioEl.onerror = () => {
        if (my !== gen) return;
        // запись слова не загрузилась → пробуем онлайн-синтез
        if (isRecording) { playUrls([onlineTtsUrl(handlers.text || '')], rate, my, handlers, false); return; }
        lastError = 'онлайн-озвучка недоступна';
        notice('Не удалось воспроизвести звук. Проверь интернет или установи английский голос (Настройки → Звук).');
        if (handlers.onerror) handlers.onerror({ error: 'online-failed' });
      };
      audioEl.play().then(() => { lastEngine = isRecording ? 'запись носителя (Wiktionary)' : 'онлайн-синтез'; })
        .catch((e) => { lastError = 'браузер заблокировал воспроизведение: ' + e.name; if (handlers.onerror) handlers.onerror(e); });
    };
    next();
  }

  async function speakOnline(text, rate, my, handlers = {}) {
    if (navigator.onLine === false) {
      lastError = 'нет интернета для онлайн-озвучки';
      notice('Нет английского голоса в системе и нет интернета. Установи голос: Настройки → Звук.');
      if (handlers.onerror) handlers.onerror({ error: 'offline' });
      return;
    }
    const t = String(text).trim();
    if (/^[A-Za-z][A-Za-z'-]*$/.test(t)) {
      const rec = await wordRecording(t);
      if (my !== gen) return;
      if (rec) { playUrls([rec], rate, my, { ...handlers, text: t }, true); return; }
    }
    if (my !== gen) return;
    playUrls(splitLong(t).map(onlineTtsUrl), rate, my, handlers, false);
  }

  /* ---------- Системный синтез со «сторожем» ---------- */
  function makeUtterance(text, rate) {
    const u = new SpeechSynthesisUtterance(text);
    u.rate = Number(rate) || 0.7;
    u.lang = 'en-US';
    u.pitch = 1;
    u.volume = 1;
    const v = chosenVoice();
    if (v) u.voice = v;
    live.add(u);
    const done = () => live.delete(u);
    u.addEventListener('end', done);
    u.addEventListener('error', done);
    return u;
  }

  function speakSystem(text, rate, my, handlers = {}) {
    const chunks = splitLong(text);
    let started = false, failed = false;
    const fallback = (why) => {
      if (failed || my !== gen) return;
      failed = true;
      lastError = why;
      speechSynthesis.cancel();
      if (getMode() === 'auto') {
        systemBroken = true;
        notice('Системный голос не работает — включена онлайн-озвучка. Подробнее: Настройки → Звук.');
        speakOnline(text, rate, my, handlers);
      } else if (handlers.onerror) handlers.onerror({ error: why });
    };
    chunks.forEach((chunk, idx) => {
      const u = makeUtterance(chunk, rate);
      u.addEventListener('start', () => { started = true; lastEngine = 'голос системы'; });
      u.addEventListener('error', (e) => { if (e.error !== 'interrupted' && e.error !== 'canceled') fallback('ошибка синтеза: ' + e.error); });
      if (idx === 0 && handlers.onboundary) u.onboundary = handlers.onboundary;
      if (idx === chunks.length - 1 && handlers.onend) u.addEventListener('end', () => { if (!failed) handlers.onend(); });
      speechSynthesis.speak(u);
    });
    setTimeout(() => { if (!started && !failed && my === gen) fallback('голос не начал говорить'); }, START_TIMEOUT);
  }

  function stopSpeaking() {
    gen++;
    if (audioEl) { try { audioEl.pause(); } catch (e) { /* нет */ } audioEl = null; }
    if (hasSynth()) speechSynthesis.cancel();
  }

  // speak() сразу после cancel() Chrome «проглатывает» — даём паузу; снимаем залипшую паузу
  function run(text, rate, handlers) {
    if (!text) return false;
    const busy = hasSynth() && (speechSynthesis.speaking || speechSynthesis.pending);
    stopSpeaking();
    const my = gen;
    const go = () => {
      if (my !== gen) return;
      if (!voices.length) loadVoices();
      const mode = getMode();
      const useOnline = mode === 'online' || !hasSynth() ||
        (mode === 'auto' && (systemBroken || !voices.length));
      if (useOnline) {
        if (mode === 'auto' && hasSynth() && !voices.length) {
          notice('В системе нет английского голоса — включена онлайн-озвучка. Подробнее: Настройки → Звук.');
        }
        speakOnline(text, rate, my, handlers);
      } else {
        speechSynthesis.resume();
        speakSystem(text, rate, my, handlers);
      }
    };
    if (busy) setTimeout(go, 80); else go();
    return true;
  }

  function speak(text, rate = 0.7) { return run(String(text || '').trim(), rate, {}); }
  function speakWord(word, rate = 0.7) { return speak(word, rate); }

  // Для shadowing: onboundary приходит только от системного голоса,
  // при онлайн-озвучке shadowing подсвечивает слова по таймерам
  function speakWithEvents(text, rate, handlers = {}) {
    run(String(text || '').trim(), rate, handlers);
    return {};
  }

  // Кнопка «Проверить звук» в настройках
  function test() {
    noticeShown = false;
    speak('Hello! This is how English Reboot sounds.', 0.9);
  }

  return {
    isNatural,
    isTTSAvailable, initTTS, speak, speakWithEvents, speakWord, stopSpeaking,
    getAvailableVoices, getVoiceURI, getStatus, getMode, setMode, setVoice, test,
  };
})();

// Экспорт для юнит-тестов (vitest): в браузере ничего не меняет.
if (typeof globalThis !== 'undefined') globalThis.TTS = TTS;
