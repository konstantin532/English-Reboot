/* ==========================================================================
   English Reboot — PRO: достижения
   Файл: achievements.js — 12 достижений (8 базовых + 4 PRO), уровни.
   getUserLevel оставлен по «Изучено» (используется вкладкой Прогресс);
   XP-ранг считается в gamify.js.
   ========================================================================== */

const Achievements = (() => {
  'use strict';

  const ACHIEVEMENTS = [
    { id: 'first_step',     title: 'Первый шаг',      description: 'Изучи первую карточку',            icon: '👟', condition: (s) => s.total >= 1 },
    { id: 'week_streak',    title: 'Неделя силы',     description: '7 дней подряд',                    icon: '🔥', condition: (s) => s.streak >= 7 },
    { id: 'month_streak',   title: 'Месяц упорства',  description: '30 дней подряд',                   icon: '💪', condition: (s) => s.streak >= 30 },
    { id: 'grammar_master', title: 'Грамматик',       description: 'Освой 55 тем грамматики',          icon: '📖', condition: (s) => s.grammarMastered >= 55 },
    { id: 'phrasal_master', title: 'Фразовый мастер', description: 'Освой 100 фразовых глаголов',      icon: '🔗', condition: (s) => s.phrasalMastered >= 100 },
    { id: 'talker',         title: 'Говорун',         description: 'Освой 50 разговорных фраз',        icon: '💬', condition: (s) => s.conversationMastered >= 50 },
    { id: 'hundred',        title: 'Сотня',           description: 'Освой 100 карточек',               icon: '💯', condition: (s) => s.mastered >= 100 },
    { id: 'thousand',       title: 'Тысячник',        description: 'Освой 1000 карточек',              icon: '🏆', condition: (s) => s.mastered >= 1000 },
    { id: 'combo_10',       title: 'На волне',        description: '10 правильных ответов подряд',     icon: '🌊', condition: (s) => s.maxCombo >= 10 },
    { id: 'dictation_master', title: 'Слушатель',     description: '10 диктантов без ошибок',          icon: '👂', condition: (s) => s.perfectDictations >= 10 },
    { id: 'shadow_master',  title: 'Эхо',             description: 'Запиши себя 20 раз',               icon: '🎤', condition: (s) => s.shadowCount >= 20 },
    { id: 'league_gold',    title: 'Золотая лига',    description: 'Достигни Gold-лиги',               icon: '🥇', condition: (s) => s.leagueLevel >= 2 },
  ];

  const ALIASES = { week_streak: 'week_power' };

  const USER_LEVELS = [
    { min: 0,    title: 'Новичок',  icon: '🌱' },
    { min: 20,   title: 'Ученик',   icon: '📚' },
    { min: 50,   title: 'Практик',  icon: '✏️' },
    { min: 100,  title: 'Знаток',   icon: '🎯' },
    { min: 200,  title: 'Говорун',  icon: '💬' },
    { min: 400,  title: 'Мастер',   icon: '⚡' },
    { min: 700,  title: 'Эксперт',  icon: '🌟' },
    { min: 1000, title: 'Полиглот', icon: '👑' },
  ];

  async function unlockedIds() {
    const res = await DB.getAllAchievements();
    const set = new Set(((res.success && res.data) || []).map((r) => r.id));
    for (const [newId, oldId] of Object.entries(ALIASES)) if (set.has(oldId)) set.add(newId);
    return set;
  }

  async function check(stats) {
    const have = await unlockedIds();
    const fresh = [];
    for (const def of ACHIEVEMENTS) {
      if (have.has(def.id)) continue;
      let ok = false;
      try { ok = !!def.condition(stats); } catch (e) { ok = false; }
      if (ok) {
        await DB.saveAchievement(def.id, SRS.todayStr());
        fresh.push(def);
      }
    }
    return fresh;
  }

  function toast(achievement) {
    const el = document.createElement('div');
    el.className = 'achievement-toast';
    el.innerHTML = `<span class="ach-icon">${achievement.icon}</span>` +
      `<span class="ach-text">Достижение: <strong>${achievement.title}</strong>!</span>`;
    document.body.appendChild(el);
    setTimeout(() => { el.classList.add('hide'); setTimeout(() => el.remove(), 300); }, 3000);
  }

  function getUserLevel(mastered) {
    let current = USER_LEVELS[0];
    for (const lv of USER_LEVELS) if (mastered >= lv.min) current = lv;
    const idx = USER_LEVELS.indexOf(current);
    const next = USER_LEVELS[idx + 1] || null;
    const progress = next
      ? Math.min(Math.round(((mastered - current.min) / (next.min - current.min)) * 100), 100)
      : 100;
    return { ...current, index: idx, next, progress };
  }

  async function getAll() {
    const have = await unlockedIds();
    const res = await DB.getAllAchievements();
    const records = {};
    ((res.success && res.data) || []).forEach((r) => { records[r.id] = r; });
    return ACHIEVEMENTS.map((def) => {
      const rec = records[def.id] || (ALIASES[def.id] ? records[ALIASES[def.id]] : null);
      return {
        ...def,
        unlocked: have.has(def.id),
        date: rec ? (rec.date || (rec.earnedAt || '').slice(0, 10) || null) : null,
      };
    });
  }

  return { check, toast, getUserLevel, getAll, ACHIEVEMENTS };
})();