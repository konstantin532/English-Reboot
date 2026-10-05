/* ==========================================================================
   English Reboot — Этап 5: интерфейс проверки голоса
   Файл: speech_ui.js — общие куски для лестницы, «Повтори вслух», сцен,
   импровизации и настроек:
   • согласие: при первой проверке объясняем, куда уходит звук, и спрашиваем
     один раз (settings.speech_check = 'on' | 'off'), поменять — в Настройках;
   • checkHtml/runCheck — «🎙 Сказать и проверить»: подсветка слов, оценка
     0–100, «Распознано: …»;
   • voiceToText — «🎙 Ответить голосом»: распознанный текст в поле ответа,
     дальше та же честная проверка по смыслам / условию;
   • блок «Проверка голоса» в Настройках.
   Без распознавания (нет API, выключено, нет сети) ничего не ломается:
   остаются запись, образец и самооценка.
   ========================================================================== */

const SpeechUI = (() => {
  'use strict';

  const KEY = 'speech_check';
  const MAX_MS = 9000;
  let ER = null;
  let consent = null;      // 'on' | 'off' | null — кэш настройки
  let sup = null;          // { available, local }

  async function init(er) {
    ER = er;
    sup = Speech.supportNow();
    const r = await DB.getSetting(KEY);
    consent = r.success && r.data ? r.data : null;
    // офлайн-режим уточняем фоном — запуск приложения не ждёт
    Speech.support().then((s) => {
      sup = s;
      const el = document.getElementById('speech-support');
      if (el) el.textContent = statusText();
    }).catch(() => {});
  }
  const esc = (s) => (ER ? ER.escapeHtml(String(s == null ? '' : s)) : String(s));
  const available = () => !!(sup && sup.available);
  // Можно предлагать проверку: API есть и ученик не отказался
  const offered = () => available() && consent !== 'off';
  // Можно включать без вопроса (например, фоном во время импровизации)
  const enabled = () => available() && consent === 'on';

  async function setConsent(v) {
    consent = v;
    await DB.saveSetting(KEY, v);
  }

  function statusText() {
    if (!available()) return 'Этот браузер не умеет распознавать речь — работают запись, образец и самооценка.';
    if (sup.local) return 'Распознавание работает на устройстве — без интернета.';
    return 'Распознавание, скорее всего, идёт через интернет (сервер разработчика браузера). Без сети — запись и самооценка.';
  }

  // Согласие спрашиваем один раз, при первой проверке
  function ensureConsent() {
    if (!available()) return Promise.resolve(false);
    if (consent === 'on') return Promise.resolve(true);
    if (consent === 'off') return Promise.resolve(false);
    return new Promise((resolve) => {
      ER.showModal(`
        <h3>Проверка голоса</h3>
        <p>Браузер распознает сказанное и сравнит с образцом: подсветит пропущенные слова и поставит оценку 0–100.</p>
        <p class="setting-hint">${esc(statusText())} В Chrome и Edge звук для распознавания обычно отправляется на сервер
          разработчика браузера. Без проверки всё работает как раньше. Решение можно поменять в Настройках.</p>
        <div class="session-actions">
          <button class="btn-primary" id="speech-yes" type="button">Включить проверку</button>
          <button class="btn btn-ghost" id="speech-no" type="button">Не сейчас</button>
        </div>`, {
        'speech-yes': async () => { await setConsent('on'); ER.closeModal(); resolve(true); },
        'speech-no': async () => { await setConsent('off'); ER.closeModal(); resolve(false); },
      });
    });
  }

  /* ---------- «Сказать и проверить» ---------- */

  function checkHtml(label) {
    if (!offered()) return '';
    return `<div class="speech-check">
      <button class="btn speech-btn" type="button" data-speech-check="1">🎙 ${esc(label || 'Сказать и проверить')}</button>
      <span class="speech-status" aria-live="polite"></span>
      <div class="speech-result"></div>
    </div>`;
  }

  const VERDICT = {
    pass: 'Понятно с первого раза!',
    almost: 'Почти — пару слов распознать не удалось.',
    miss: 'Пока распознаётся с трудом. Послушай образец и попробуй ещё раз.',
  };
  const STATUS_TITLE = { ok: 'распознано верно', wrong: 'услышано другое слово', missing: 'не расслышано' };

  function resultHtml(r) {
    const words = r.words.map((w) => `<span class="sp-word is-${w.status}" title="${STATUS_TITLE[w.status]}${w.heard ? ': ' + esc(w.heard) : ''}">${esc(w.word)}</span>`).join(' ');
    return `
      <div class="sp-score is-${r.verdict}"><b>${r.score}</b><span>/100</span></div>
      <div class="sp-body">
        <p class="sp-verdict">${VERDICT[r.verdict]}</p>
        <p class="sp-words">${words}</p>
        <p class="sp-heard">Распознано: «${esc(r.heard)}»${r.extra.length ? ` · лишнее: ${esc(r.extra.join(' '))}` : ''}</p>
        <p class="sp-note">Оценка показывает, поняли ли тебя, а не насколько чистый акцент: распознаватель иногда «додумывает» слова.</p>
      </div>`;
  }

  /**
   * Запустить проверку внутри блока .speech-check.
   * hooks: { onStart(), onEnd() } — например, параллельная запись для «послушай себя».
   * @returns {Promise<result|null>} null — проверить не удалось (нет согласия, ошибка, тишина)
   */
  async function runCheck(box, expected, hooks) {
    const h = hooks || {};
    const btn = box.querySelector('.speech-btn');
    const status = box.querySelector('.speech-status');
    const out = box.querySelector('.speech-result');
    if (!(await ensureConsent())) { box.remove(); return null; }
    if (btn) btn.disabled = true;
    status.textContent = 'Слушаю… скажи фразу';
    if (h.onStart) await h.onStart();
    const res = await Speech.listen({ maxMs: MAX_MS }).promise;
    if (h.onEnd) await h.onEnd();
    if (btn) { btn.disabled = false; btn.textContent = '🎙 Ещё раз'; }
    if (!res.alternatives.length) { status.textContent = Speech.errorText(res.error); return null; }
    status.textContent = '';
    const r = Speech.best(expected, res.alternatives);
    out.innerHTML = resultHtml(r);
    out.classList.add('is-shown');
    return r;
  }

  /* ---------- «Ответить голосом» → текст в поле ответа ---------- */

  function voiceBtnHtml() {
    if (!offered()) return '';
    return '<button class="btn btn-ghost speech-voice" type="button" data-speech-voice="1">🎙 Ответить голосом</button><span class="speech-status speech-voice-status" aria-live="polite"></span>';
  }

  // Распознать и вставить в textarea; возвращает распознанный текст или null
  async function voiceToText(btn, textarea, hooks) {
    const h = hooks || {};
    const status = btn.parentElement.querySelector('.speech-voice-status');
    if (!(await ensureConsent())) { btn.remove(); if (status) status.remove(); return null; }
    btn.disabled = true;
    if (status) status.textContent = 'Слушаю…';
    if (h.onStart) await h.onStart();
    const res = await Speech.listen({ maxMs: MAX_MS }).promise;
    if (h.onEnd) await h.onEnd();
    btn.disabled = false;
    if (!res.alternatives.length) { if (status) status.textContent = Speech.errorText(res.error); return null; }
    textarea.value = res.alternatives[0];
    if (status) status.textContent = 'Распознано — проверь текст и отправь ответ.';
    return res.alternatives[0];
  }

  // Фоновое распознавание на время ответа (импровизация): только с согласием
  function background() {
    if (!enabled()) return null;
    return Speech.listen({ continuous: true, maxMs: 70000 });
  }

  /* ---------- Настройки ---------- */

  function settingsHtml() {
    const val = consent || '';
    return `
      <section class="card settings-card" id="speech-card">
        <h3 class="card-title">Проверка голоса</h3>
        <p class="setting-hint" id="speech-support">${esc(statusText())}</p>
        <div class="setting-row">
          <div class="setting-info"><label for="set-speech">Распознавать речь и ставить оценку</label>
            <p class="setting-hint">Подсветка пропущенных слов, оценка 0–100, проверка голосовых ответов в сценах и импровизации.</p></div>
          <select id="set-speech" class="setting-select" ${available() ? '' : 'disabled'}>
            <option value="" ${val === '' ? 'selected' : ''}>Спросить при первой проверке</option>
            <option value="on" ${val === 'on' ? 'selected' : ''}>Включена</option>
            <option value="off" ${val === 'off' ? 'selected' : ''}>Выключена</option>
          </select>
        </div>
      </section>`;
  }

  function bindSettings() {
    const sel = document.getElementById('set-speech');
    if (!sel) return;
    sel.addEventListener('change', async () => {
      const v = sel.value || null;
      consent = v;
      await DB.saveSetting(KEY, v);
      ER.toast(v === 'on' ? 'Проверка голоса включена' : v === 'off' ? 'Проверка голоса выключена' : 'Спросим при первой проверке', 'success');
    });
  }

  return {
    init, ensureConsent, offered, enabled, available, statusText,
    checkHtml, runCheck, resultHtml, voiceBtnHtml, voiceToText, background, settingsHtml, bindSettings,
    _setConsent: setConsent,
  };
})();

if (typeof window !== 'undefined') window.SpeechUI = SpeechUI;
