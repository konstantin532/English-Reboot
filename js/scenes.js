/* ==========================================================================
   English Reboot — Этап 3: сцены с выбором и открытыми репликами (логика, без DOM)
   Файл: scenes.js — проверка открытой реплики по «смыслам», валидатор эпизода,
   прогресс по эпизодам, промпт «Разобрать с ИИ».

   ЧЕСТНАЯ проверка офлайн: у реплики есть набор смыслов (согласие, вопрос про
   Wi-Fi, «я только приземлился»…), у каждого — ключевые фразы. Смысл засчитан,
   только если ключевая фраза реально есть в ответе (с допуском опечаток и
   сокращений: I'm = I am) и перед ней нет отрицания («not sure» ≠ «sure»).
   Не нашли — не хвалим: показываем образцы и просим самооценку.

   Схема эпизода (scenes_us.js):
   { id, title, place, intro, start, phrases: [фразы content_us.js],
     nodes: { <id>: { who, say, ru?,
       next?   — реплика без ответа ученика, сразу дальше;
       end?    — последняя реплика эпизода;
       reply?: { type: 'choice', options: [{ tone: natural|formal|rude, text,
                   react: { say, mood, who? }, coach, next }] }
             | { type: 'open', prompt, meanings: [{ id, label, keys: [..],
                   react: { say, mood }, next }], samples: [3–5], fallbackNext } } } }
   Узел ветвления: выбор «грубо» может вести на свою ветку, которая потом
   сходится к основной.
   Загружается после ladder.js (normText, levenshtein).
   ========================================================================== */

const Scenes = (() => {
  'use strict';

  const L = () => (typeof globalThis !== 'undefined' && globalThis.Ladder) || null;

  const MOODS = { smile: '🙂', laugh: '😄', warm: '😊', surprised: '😮', confused: '🤨', frown: '😠', neutral: '😐' };
  const TONES = { natural: 'естественно', formal: 'слишком официально', rude: 'грубовато' };
  // Отрицание перед ключом снимает смысл: «I'm not sure» ≠ «sure», «haven't landed» ≠ «landed»
  const NEG = new Set(['not', 'no', 'never', 'cannot', 'nope', 'nah', 'without']);
  const NEG_WINDOW = 3;

  function normalize(text) {
    const lib = L();
    if (lib) return lib.normText(text);
    return String(text || '').toLowerCase().replace(/[^a-z0-9' ]+/g, ' ').replace(/\s+/g, ' ').trim();
  }
  const tokens = (text) => normalize(text).split(' ').filter(Boolean);

  function lev(a, b) {
    const lib = L();
    if (lib) return lib.levenshtein(a, b);
    return a === b ? 0 : Math.max(a.length, b.length);
  }
  const allowance = (w) => (w.length <= 3 ? 0 : w.length <= 7 ? 1 : 2);
  const sameWord = (got, want) => got === want || lev(got, want) <= allowance(want);

  // Первое вхождение ключа (последовательности слов) в ответ, не под отрицанием. -1 — нет.
  function findKey(textTokens, keyTokens) {
    if (!keyTokens.length || textTokens.length < keyTokens.length) return -1;
    const keyHasNeg = keyTokens.some((t) => NEG.has(t));
    for (let i = 0; i + keyTokens.length <= textTokens.length; i++) {
      if (!keyTokens.every((w, j) => sameWord(textTokens[i + j], w))) continue;
      if (!keyHasNeg && textTokens.slice(Math.max(0, i - NEG_WINDOW), i).some((t) => NEG.has(t))) continue;
      return i;
    }
    return -1;
  }

  /**
   * Какой смысл есть в ответе. Если подходят несколько — побеждает более длинный
   * (более конкретный) ключ: «not my first time» сильнее, чем «first time».
   * @returns {{ meaning, key } | null}
   */
  function matchMeaning(text, meanings) {
    const tt = tokens(text);
    if (!tt.length) return null;
    let best = null;
    (meanings || []).forEach((m, mi) => (m.keys || []).forEach((key) => {
      const kt = tokens(key);
      if (findKey(tt, kt) < 0) return;
      if (!best || kt.length > best.len || (kt.length === best.len && mi < best.mi)) best = { meaning: m, key, len: kt.length, mi };
    }));
    return best ? { meaning: best.meaning, key: best.key } : null;
  }

  /* ---------- Валидатор эпизода (тест данных и защита интерфейса) ---------- */

  function validateEpisode(ep, opts) {
    const o = opts || {};
    const errors = [];
    const err = (m) => errors.push((ep && ep.id ? ep.id + ': ' : '') + m);
    if (!ep || typeof ep !== 'object') return ['эпизод не объект'];
    ['id', 'title', 'intro', 'start'].forEach((k) => { if (!ep[k]) err('нет поля ' + k); });
    const nodes = ep.nodes || {};
    const ids = Object.keys(nodes);
    if (!nodes[ep.start]) err('start ведёт на несуществующий узел ' + ep.start);
    const hasNode = (id) => Object.prototype.hasOwnProperty.call(nodes, id);

    ids.forEach((id) => {
      const n = nodes[id];
      const at = 'узел ' + id + ': ';
      if (!n.who || (o.cast && !o.cast.has(n.who))) err(at + 'неизвестный персонаж ' + n.who);
      if (!n.say) err(at + 'нет реплики');
      const kinds = ['reply', 'next', 'end'].filter((k) => n[k]);
      if (kinds.length !== 1) err(at + 'должно быть ровно одно из reply / next / end');
      if (n.next && !hasNode(n.next)) err(at + 'next → нет узла ' + n.next);
      const r = n.reply;
      if (!r) return;
      if (r.type === 'choice') {
        const opt = r.options || [];
        if (opt.length < 2) err(at + 'меньше 2 вариантов');
        if (!opt.some((x) => x.tone === 'natural')) err(at + 'нет естественного варианта');
        opt.forEach((x, i) => {
          if (!TONES[x.tone]) err(at + 'вариант ' + i + ': неизвестный тон ' + x.tone);
          if (!x.text) err(at + 'вариант ' + i + ': нет текста');
          if (!x.react || !x.react.say || !MOODS[x.react.mood]) err(at + 'вариант ' + i + ': нет реакции/настроения');
          if (!x.coach) err(at + 'вариант ' + i + ': нет комментария тренера');
          if (!hasNode(x.next)) err(at + 'вариант ' + i + ': next → нет узла ' + x.next);
        });
      } else if (r.type === 'open') {
        if (!r.prompt) err(at + 'нет подсказки prompt');
        const ms = r.meanings || [];
        if (!ms.length) err(at + 'нет смыслов');
        ms.forEach((m) => {
          if (!m.id || !m.label || !(m.keys || []).length) err(at + 'смысл без id/label/keys');
          if (!m.react || !m.react.say || !MOODS[m.react.mood]) err(at + 'смысл ' + m.id + ': нет реакции');
          if (!hasNode(m.next)) err(at + 'смысл ' + m.id + ': next → нет узла ' + m.next);
        });
        const s = r.samples || [];
        if (s.length < 3 || s.length > 5) err(at + 'образцов должно быть 3–5, сейчас ' + s.length);
        // каждый образец носителя должен засчитываться хотя бы одним смыслом — иначе проверка нечестная
        s.forEach((x) => { if (!matchMeaning(x, ms)) err(at + 'образец не узнаётся ни одним смыслом: ' + x); });
        if (!hasNode(r.fallbackNext)) err(at + 'fallbackNext → нет узла ' + r.fallbackNext);
      } else {
        err(at + 'неизвестный тип ответа ' + r.type);
      }
    });

    // Достижимость: из start доходим до каждого узла, и из каждого узла — до конца
    const edges = (n) => [n.next, ...(n.reply && n.reply.type === 'choice' ? n.reply.options.map((x) => x.next) : []),
      ...(n.reply && n.reply.type === 'open' ? [...n.reply.meanings.map((m) => m.next), n.reply.fallbackNext] : [])].filter(hasNode);
    if (hasNode(ep.start)) {
      const seen = new Set([ep.start]);
      const queue = [ep.start];
      while (queue.length) edges(nodes[queue.shift()]).forEach((x) => { if (!seen.has(x)) { seen.add(x); queue.push(x); } });
      ids.filter((id) => !seen.has(id)).forEach((id) => err('узел ' + id + ' недостижим'));
      const reachesEnd = new Set(ids.filter((id) => nodes[id].end));
      let grew = true;
      while (grew) {
        grew = false;
        ids.forEach((id) => { if (!reachesEnd.has(id) && edges(nodes[id]).some((x) => reachesEnd.has(x))) { reachesEnd.add(id); grew = true; } });
      }
      ids.filter((id) => !reachesEnd.has(id)).forEach((id) => err('из узла ' + id + ' нельзя дойти до конца'));
    }
    if (o.phrases) (ep.phrases || []).forEach((f) => { if (!o.phrases.has(f)) err('фразы нет в content_us.js: ' + f); });
    if (!(ep.phrases || []).length) err('нет списка фраз эпизода');
    return errors;
  }

  /* ---------- Прогресс: settings.scenes ---------- */

  function normalizeProgress(raw, episodes) {
    const src = raw && typeof raw === 'object' ? raw : {};
    const out = {};
    (episodes || []).forEach((ep) => {
      const e = src[ep.id] || {};
      out[ep.id] = {
        done: !!e.done,
        plays: Math.max(0, Number(e.plays) || 0),
        opensOk: Math.max(0, Number(e.opensOk) || 0),
        opensTotal: Math.max(0, Number(e.opensTotal) || 0),
        tones: e.tones && typeof e.tones === 'object' ? { natural: +e.tones.natural || 0, formal: +e.tones.formal || 0, rude: +e.tones.rude || 0 } : { natural: 0, formal: 0, rude: 0 },
        date: e.date || null,
      };
    });
    return out;
  }

  // Эпизоды открываются по порядку: следующий — после того, как пройден предыдущий
  const isUnlocked = (progress, episodes, i) => i === 0 || !!(progress[episodes[i - 1].id] && progress[episodes[i - 1].id].done);
  // Следующий непройденный эпизод (для урока «Сегодня»); всё пройдено — null
  function nextEpisode(progress, episodes) {
    const ep = (episodes || []).find((e) => !(progress[e.id] && progress[e.id].done));
    return ep ? ep.id : null;
  }

  // Итог одного прохождения эпизода → новый прогресс
  function recordPlay(raw, episodes, epId, result, today) {
    const p = normalizeProgress(raw, episodes);
    if (!p[epId]) return p;
    const e = p[epId];
    const t = (result && result.tones) || {};
    p[epId] = {
      done: e.done || !!(result && result.finished),
      plays: e.plays + 1,
      opensOk: e.opensOk + ((result && result.opensOk) || 0),
      opensTotal: e.opensTotal + ((result && result.opensTotal) || 0),
      tones: { natural: e.tones.natural + (t.natural || 0), formal: e.tones.formal + (t.formal || 0), rude: e.tones.rude + (t.rude || 0) },
      date: today || e.date,
    };
    return p;
  }

  /* ---------- «Разобрать с ИИ»: готовый промпт в буфер обмена ---------- */

  function aiPrompt({ episode, who, say, answer, samples }) {
    return [
      'Ты — дружелюбный преподаватель американского разговорного английского для русскоговорящих.',
      `Ситуация: ${episode}. Собеседник (${who}) говорит: "${say}"`,
      `Мой ответ: "${answer}"`,
      samples && samples.length ? `Примеры ответов носителя: ${samples.map((s) => `"${s}"`).join(', ')}.` : '',
      'Оцени, понятен ли мой ответ и насколько естественно он звучит для американца.',
      'Исправь ошибки, предложи 2–3 варианта, как сказал бы носитель, и объясни разницу по-русски — коротко, с примерами.',
    ].filter(Boolean).join('\n');
  }

  return { MOODS, TONES, normalize, findKey, matchMeaning, validateEpisode, normalizeProgress, isUnlocked, nextEpisode, recordPlay, aiPrompt };
})();

if (typeof globalThis !== 'undefined') globalThis.Scenes = Scenes;
