/* ==========================================================================
   English Reboot — Этап 6: лига темпов (пейсеры) по фразам вслух
   Файл: pacers.js — чистые функции (тестируются в node) + HTML блока
   «🗣 Фразы вслух» для вкладки «Прогресс».
   ЧЕСТНО: соперники — боты-пейсеры с открытым правилом «N фраз в день»,
   без человеческих имён и без случайностей. Неделя — с понедельника,
   сегодняшняя норма пейсера уже учтена (это цель на конец дня).
   Источник — study_log.spoken (запись голоса от 1 секунды / распознанная речь).
   ========================================================================== */

const Pacers = (() => {
  'use strict';

  const LIST = [
    { id: 'warmup', name: 'Разминка', perDay: 5 },
    { id: 'norm', name: 'Норма', perDay: 10 },
    { id: 'goal90', name: '90 дней', perDay: 15, goal: true }, // ориентир программы: свободная речь за 90 дней
    { id: 'marathon', name: 'Марафон', perDay: 25 },
  ];
  const GOAL = LIST.find((p) => p.goal);
  const WEEKDAYS = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];

  /* ---------- даты (строки YYYY-MM-DD, без часовых поясов) ---------- */
  const toDate = (s) => new Date(s + 'T00:00:00Z');
  const toStr = (d) => d.toISOString().slice(0, 10);
  const addDays = (s, n) => { const d = toDate(s); d.setUTCDate(d.getUTCDate() + n); return toStr(d); };
  const dayDiff = (a, b) => Math.round((toDate(b) - toDate(a)) / 86400000);
  const weekday = (s) => toDate(s).getUTCDay();

  // Понедельник недели, в которой лежит день
  function weekStart(s) {
    return addDays(s, -((weekday(s) + 6) % 7));
  }

  // { date: spoken } из записей study_log
  function spokenMap(logs) {
    const m = {};
    (logs || []).forEach((r) => { if (r && r.date) m[r.date] = (m[r.date] || 0) + (Number(r.spoken) || 0); });
    return m;
  }

  /**
   * Таблица лиги на неделю, где лежит today.
   * @returns {{ weekStart, days, me, rows: [{id,name,count,perDay,me}], goal: {name, diff} }}
   */
  function table(logs, today) {
    const m = spokenMap(logs);
    const ws = weekStart(today);
    const days = dayDiff(ws, today) + 1;
    let me = 0;
    for (let i = 0; i < days; i++) me += m[addDays(ws, i)] || 0;
    const rows = [{ id: 'me', name: 'Ты', count: me, perDay: null, me: true },
      ...LIST.map((p) => ({ id: p.id, name: p.name, count: p.perDay * days, perDay: p.perDay, me: false }))];
    // при равенстве ты выше: догнал темп — значит, идёшь в нём
    rows.sort((a, b) => b.count - a.count || (b.me ? 1 : 0) - (a.me ? 1 : 0));
    return { weekStart: ws, days, me, rows, goal: { name: GOAL.name, diff: me - GOAL.perDay * days } };
  }

  // Последние n дней (по возрастанию даты) для графика
  function lastDays(logs, today, n) {
    const m = spokenMap(logs);
    const out = [];
    for (let i = (n || 7) - 1; i >= 0; i--) {
      const date = addDays(today, -i);
      out.push({ date, spoken: m[date] || 0, label: WEEKDAYS[weekday(date)], today: i === 0 });
    }
    return out;
  }

  // Факты для реплики дня (Coach.dayLine)
  function facts(logs, today) {
    const m = spokenMap(logs);
    const prev = Object.keys(m).filter((d) => d < today && m[d] > 0).sort();
    const last = prev[prev.length - 1];
    return {
      today: m[today] || 0,
      yesterday: m[addDays(today, -1)] || 0,
      bestPrevDay: prev.reduce((b, d) => Math.max(b, m[d]), 0),
      hadBefore: prev.length > 0,
      gapDays: last ? dayDiff(last, today) : null,
    };
  }

  /* ---------- HTML ---------- */

  function chartHtml(days) {
    const max = Math.max(GOAL.perDay, ...days.map((d) => d.spoken));
    const goalPct = Math.round((GOAL.perDay / max) * 100);
    const label = days.map((d) => `${d.label}: ${d.spoken}`).join(', ');
    return `
      <div class="spoken-chart" role="img" aria-label="Фразы вслух за 7 дней — ${label}">
        <div class="spoken-goal" style="bottom:calc(22px + ${(goalPct * 1.1).toFixed(1)}px)"><span>темп «${GOAL.name}» · ${GOAL.perDay}</span></div>
        ${days.map((d) => `
          <div class="spoken-col${d.today ? ' is-today' : ''}${d.spoken >= GOAL.perDay ? ' is-goal' : ''}" data-date="${d.date}">
            <span class="spoken-bar" style="height:${Math.round((d.spoken / max) * 100)}%"><span class="spoken-val">${d.spoken}</span></span>
            <span class="spoken-day">${d.label}</span>
          </div>`).join('')}
      </div>`;
  }

  function leagueHtml(t) {
    const C = typeof globalThis !== 'undefined' ? globalThis.Coach : null;
    return `
      <div class="league-section pacer-league" id="pacer-league">
        <div class="league-header">
          <span class="league-name">Лига темпов</span>
          <span class="league-xp">неделя с ${t.weekStart.slice(8, 10)}.${t.weekStart.slice(5, 7)} · день ${t.days} из 7</span>
        </div>
        <div class="league-table">
          ${t.rows.map((r, i) => `
            <div class="league-row ${r.me ? 'me' : 'is-bot'}" data-id="${r.id}">
              <span class="rank">${i + 1}</span>
              <span class="name">${r.me ? 'Ты' : `<span class="bot-tag">🤖 бот</span> Темп «${r.name}» <small>${r.perDay} в день</small>`}</span>
              <span class="xp">${r.count}</span>
            </div>`).join('')}
        </div>
        <p class="pacer-line" id="pacer-line">${C ? C.paceLine(t.goal) : ''}</p>
        <p class="setting-hint">${C ? C.line('league', 'hint') : ''}</p>
      </div>`;
  }

  function sectionHtml(logs, today) {
    const C = typeof globalThis !== 'undefined' ? globalThis.Coach : null;
    const f = facts(logs, today);
    return `
      <section class="spoken-section" id="spoken-section">
        <h3 class="card-title">🗣 Фразы вслух</h3>
        <p class="today-coach" id="spoken-coach">${C ? C.dayLine(f).text : ''}</p>
        ${chartHtml(lastDays(logs, today, 7))}
        ${leagueHtml(table(logs, today))}
      </section>`;
  }

  return { LIST, GOAL, weekStart, addDays, dayDiff, spokenMap, table, lastDays, facts, chartHtml, leagueHtml, sectionHtml };
})();

if (typeof globalThis !== 'undefined') globalThis.Pacers = Pacers;
