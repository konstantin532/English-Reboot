/* ==========================================================================
   English Reboot — Шаг 7: онбординг
   Файл: onboarding.js — входной тест (20 вопросов), определение уровня,
   ручной выбор, дневная цель. Показывается один раз (settings.onboarding_complete).
   ========================================================================== */

const Onboarding = (() => {
  'use strict';

  let ER = null;

  const QUESTIONS = [
    /* A1 (5) */
    { id: 'ob_01', type: 'grammar', level: 'A1', q: 'She ___ a teacher.', options: ['am', 'is', 'are', 'be'], correct: 1 },
    { id: 'ob_02', type: 'grammar', level: 'A1', q: 'I can ___ very fast.', options: ['to run', 'run', 'runs', 'ran'], correct: 1 },
    { id: 'ob_03', type: 'grammar', level: 'A1', q: '___ you like pizza?', options: ['Do', 'Does', 'Are', 'Is'], correct: 0 },
    { id: 'ob_04', type: 'vocab', level: 'A1', q: 'Как сказать «мне 10 лет»?', options: ["I have 10 years", 'I am 10 years old', 'I is 10', 'Me 10 years'], correct: 1 },
    { id: 'ob_05', type: 'vocab', level: 'A1', q: 'Слово «small» означает:', options: ['большой', 'маленький', 'высокий', 'длинный'], correct: 1 },
    /* A2 (5) */
    { id: 'ob_06', type: 'grammar', level: 'A2', q: 'I ___ to the gym yesterday.', options: ['go', 'going', 'went', 'gone'], correct: 2 },
    { id: 'ob_07', type: 'grammar', level: 'A2', q: 'She ___ TV when I called.', options: ['watched', 'was watching', 'watches', 'is watching'], correct: 1 },
    { id: 'ob_08', type: 'grammar', level: 'A2', q: 'We ___ in London since 2019.', options: ['live', 'lived', 'have lived', 'are living'], correct: 2 },
    { id: 'ob_09', type: 'vocab', level: 'A2', q: '«pick up» означает:', options: ['подбирать, забирать', 'отменять', 'откладывать', 'уступать'], correct: 0 },
    { id: 'ob_10', type: 'vocab', level: 'A2', q: 'Правильно: «принять решение» —', options: ['make a decision', 'make a decide', 'do a decision', 'take decide'], correct: 0 },
    /* B1 (5) */
    { id: 'ob_11', type: 'grammar', level: 'B1', q: 'If I ___ rich, I would travel the world.', options: ['am', 'was', 'were', 'had been'], correct: 2 },
    { id: 'ob_12', type: 'grammar', level: 'B1', q: 'He denied ___ the money.', options: ['to steal', 'stealing', 'steal', 'stolen'], correct: 1 },
    { id: 'ob_13', type: 'grammar', level: 'B1', q: 'The report ___ by Friday.', options: ['will finish', 'will have finished', 'will be finished', 'finishes'], correct: 2 },
    { id: 'ob_14', type: 'vocab', level: 'B1', q: '«put off» означает:', options: ['надевать', 'выключать', 'откладывать', 'мириться'], correct: 2 },
    { id: 'ob_15', type: 'vocab', level: 'B1', q: 'Идиома «piece of cake» означает:', options: ['очень легко', 'очень вкусно', 'дорого', 'очень редко'], correct: 0 },
    /* B2 (5) */
    { id: 'ob_16', type: 'grammar', level: 'B2', q: 'By the time we arrived, the meeting ___.', options: ['ended', 'had ended', 'has ended', 'was ending'], correct: 1 },
    { id: 'ob_17', type: 'grammar', level: 'B2', q: "Hardly ___ home when the phone rang.", options: ['I had got', 'had I got', 'I got', 'had I get'], correct: 1 },
    { id: 'ob_18', type: 'grammar', level: 'B2', q: "I'd rather you ___ smoke here.", options: ["don't", "didn't", "won't", "wouldn't"], correct: 1 },
    { id: 'ob_19', type: 'vocab', level: 'B2', q: '«take the bull by the horns» означает:', options: ['паниковать', 'действовать решительно', 'отступить', 'рисковать деньгами'], correct: 1 },
    { id: 'ob_20', type: 'vocab', level: 'B2', q: '«in the red» означает:', options: ['в плюсе', 'в ярости', 'в долгах', 'на виду'], correct: 2 },
  ];

  const LEVEL_DESC = { A1: 'Начинающий', A2: 'Базовый', B1: 'Средний', B2: 'Продвинутый' };

  let answers = [];
  let qIndex = 0;
  let chosenLevel = null;
  let chosenGoal = null;

  function init(er) { ER = er; }

  async function needsOnboarding() {
    const r = await DB.getSetting('onboarding_complete');
    return !(r.success && r.data === true);
  }

  function startOnboarding() {
    answers = []; qIndex = 0; chosenLevel = null; chosenGoal = null;
    renderWelcome();
  }

  const container = () => document.getElementById('onboarding-container');

  /* ---------- Шаги ---------- */

  function renderWelcome() {
    container().innerHTML = `
      <div class="onboarding-overlay">
        <div class="onboarding-card">
          <h1>English Reboot</h1>
          <p>Давай определим твой уровень английского.</p>
          <p>20 вопросов займут ~5 минут. Без оценки — просто стартовая точка.</p>
          <button id="ob-start" type="button">Начать тест</button>
          <button id="ob-skip" type="button">Я определю сам</button>
        </div>
      </div>`;
    document.getElementById('ob-start').addEventListener('click', renderTest);
    document.getElementById('ob-skip').addEventListener('click', renderManual);
  }

  function renderTest() {
    const q = QUESTIONS[qIndex];
    const pct = Math.round((qIndex / QUESTIONS.length) * 100);
    container().innerHTML = `
      <div class="onboarding-overlay">
        <div class="onboarding-card">
          <div class="ob-progress"><div class="ob-progress-fill" style="width:${pct}%"></div></div>
          <p class="ob-counter">Вопрос ${qIndex + 1} из ${QUESTIONS.length}</p>
          <p class="ob-question">${q.q}</p>
          <div class="ob-options">
            ${q.options.map((opt, i) => `
              <button class="ob-option" type="button" data-i="${i}">${opt}</button>`).join('')}
          </div>
        </div>
      </div>`;

    container().querySelectorAll('.ob-option').forEach((btn) => {
      btn.addEventListener('click', () => {
        const i = Number(btn.dataset.i);
        const isCorrect = i === q.correct;
        answers.push({ questionId: q.id, level: q.level, correct: isCorrect });
        btn.classList.add(isCorrect ? 'correct' : 'wrong');
        if (!isCorrect) {
          const right = container().querySelector(`.ob-option[data-i="${q.correct}"]`);
          if (right) right.classList.add('correct');
        }
        container().querySelectorAll('.ob-option').forEach((b) => { b.disabled = true; });
        setTimeout(() => {
          qIndex++;
          if (qIndex < QUESTIONS.length) renderTest();
          else renderResult(calculateLevel(answers));
        }, 550);
      });
    });
  }

  // Уровень = последний блок (по 5 вопросов), где правильных >= 60% (3 из 5).
  // Ниже порога на A1 → A1. Все блоки пройдены → B2.
  function calculateLevel(ans) {
    const blocks = ['A1', 'A2', 'B1', 'B2'];
    let level = 'A1';
    for (let b = 0; b < blocks.length; b++) {
      const part = ans.filter((a) => a.level === blocks[b]);
      const right = part.filter((a) => a.correct).length;
      if (part.length && right / part.length >= 0.6) level = blocks[b];
      else break;
    }
    return level;
  }

  function goalButtonsHtml() {
    return `
      <div class="ob-goal-options">
        ${[[10, '~5 минут'], [20, '~10 минут'], [30, '~15 минут']].map(([g, t]) => `
          <button class="ob-goal${chosenGoal === g ? ' selected' : ''}" data-goal="${g}" type="button">
            <strong>${g}</strong><small>в день · ${t}</small>
          </button>`).join('')}
      </div>`;
  }

  function bindGoalButtons(afterPick) {
    container().querySelectorAll('.ob-goal').forEach((btn) => {
      btn.addEventListener('click', () => {
        chosenGoal = Number(btn.dataset.goal);
        container().querySelectorAll('.ob-goal').forEach((b) => b.classList.remove('selected'));
        btn.classList.add('selected');
        const fin = document.getElementById('ob-finish');
        if (fin) fin.disabled = false;
        if (afterPick) afterPick();
      });
    });
  }

  function renderResult(level) {
    chosenLevel = level;
    container().innerHTML = `
      <div class="onboarding-overlay">
        <div class="onboarding-card">
          <h2>Твой уровень: <span class="ob-level-badge">${level}</span></h2>
          <p>${LEVEL_DESC[level]} · фильтры и материалы сориентируются на него.</p>
          <p>Сколько карточек в день хочешь учить?</p>
          ${goalButtonsHtml()}
          <button id="ob-finish" type="button" disabled>Поехали!</button>
        </div>
      </div>`;
    bindGoalButtons();
    document.getElementById('ob-finish').addEventListener('click', finish);
  }

  function renderManual() {
    container().innerHTML = `
      <div class="onboarding-overlay">
        <div class="onboarding-card">
          <h2>Выбери свой уровень</h2>
          <div class="ob-level-options">
            ${Object.keys(LEVEL_DESC).map((lv) => `
              <button class="ob-level${chosenLevel === lv ? ' selected' : ''}" data-level="${lv}" type="button">
                <strong>${lv}</strong><small>${LEVEL_DESC[lv]}</small>
              </button>`).join('')}
          </div>
          <p>Сколько карточек в день?</p>
          ${goalButtonsHtml()}
          <button id="ob-finish" type="button" disabled>Поехали!</button>
        </div>
      </div>`;

    container().querySelectorAll('.ob-level').forEach((btn) => {
      btn.addEventListener('click', () => {
        chosenLevel = btn.dataset.level;
        container().querySelectorAll('.ob-level').forEach((b) => b.classList.remove('selected'));
        btn.classList.add('selected');
        checkFinishReady();
      });
    });
    bindGoalButtons(checkFinishReady);
    document.getElementById('ob-finish').addEventListener('click', finish);

    function checkFinishReady() {
      document.getElementById('ob-finish').disabled = !(chosenLevel && chosenGoal);
    }
    checkFinishReady();
  }

  async function finish() {
    if (!chosenLevel || !chosenGoal) return;
    await DB.saveSetting('onboarding_complete', true);
    await DB.saveSetting('currentLevel', chosenLevel);
    await DB.saveSetting('daily_goal', chosenGoal);
    container().innerHTML = '';
    if (ER && ER.applyOnboarding) ER.applyOnboarding(chosenLevel, chosenGoal);
  }

  return { init, needsOnboarding, startOnboarding, calculateLevel };
})();
