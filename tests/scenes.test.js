import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';

/* Этап 3: сцены — проверка смыслов, схема эпизода, прогресс. Грузим как в index.html. */
const ORDER = ['content_us', 'ladder', 'scenes', 'scenes_us'];
const ctx = { console: { log() {}, warn() {}, error() {} }, CONVERSATION_CARDS: [] };
ctx.window = ctx;
vm.createContext(ctx);
vm.runInContext(ORDER.map((f) => fs.readFileSync(path.resolve(process.cwd(), 'js', f + '.js'), 'utf8')).join('\n;\n'), ctx);

const { Scenes: S, SCENE_EPISODES: EPS, SCENE_CAST: CAST } = ctx;
const PHRASES = new Set(ctx.CONVERSATION_CARDS.map((c) => c.payload.front));
const meaning = (text, meanings) => { const m = S.matchMeaning(text, meanings); return m ? m.meaning.id : null; };

const YES_NO = [
  { id: 'agree', label: 'согласие', keys: ['sure', 'sounds good', 'i am down', 'yes', 'yeah'] },
  { id: 'refuse', label: 'отказ', keys: ['no thanks', 'not today', 'can not make it', 'i will pass'] },
  { id: 'unsure', label: 'сомнение', keys: ['not sure', 'maybe', 'let me check'] },
];

describe('Проверка открытой реплики по смыслам', () => {
  it('узнаёт смысл по ключевой фразе внутри ответа', () => {
    expect(meaning('Sure, why not!', YES_NO)).toBe('agree');
    expect(meaning("Yeah, I'm down for pizza", YES_NO)).toBe('agree');
    expect(meaning("Sorry, I can't make it tonight", YES_NO)).toBe('refuse');
  });
  it('сокращения и полные формы равны: I\'m = I am, can\'t = can not', () => {
    expect(meaning('I am down', YES_NO)).toBe('agree');
    expect(meaning('I cannot make it', YES_NO)).toBe('refuse');
  });
  it('отрицание снимает смысл: «not sure» — сомнение, а не согласие', () => {
    expect(meaning("I'm not sure", YES_NO)).toBe('unsure');
    expect(meaning("That doesn't sound good", [{ id: 'ok', keys: ['sounds good', 'sound good'] }])).toBe(null);
    expect(meaning("I haven't landed yet", [{ id: 'landed', keys: ['landed'] }])).toBe(null);
  });
  it('из нескольких подходящих побеждает более конкретный (длинный) ключ', () => {
    const ms = [{ id: 'first', keys: ['first time', 'yes'] }, { id: 'before', keys: ['been here before', 'not my first'] }];
    expect(meaning('Yes, I have been here before', ms)).toBe('before');
    expect(meaning("No, it's not my first time", ms)).toBe('before');
  });
  it('опечатка в длинном слове прощается, в коротком — нет', () => {
    expect(meaning('I need the pasword', [{ id: 'wifi', keys: ['password'] }])).toBe('wifi');
    expect(meaning('ys', YES_NO)).toBe(null);
  });
  it('пустой ответ и ответ не по теме — смысл не найден (никаких похвал)', () => {
    expect(meaning('', YES_NO)).toBe(null);
    expect(meaning('The weather is nice', YES_NO)).toBe(null);
  });
});

describe('Эпизоды: схема и данные', () => {
  it('партия 1 — 4 эпизода, id уникальны', () => {
    expect(EPS.length).toBe(4);
    expect(new Set(EPS.map((e) => e.id)).size).toBe(4);
  });
  EPS.forEach((ep) => {
    it(`«${ep.title}»: схема без ошибок (переходы, достижимость, образцы, фразы из content_us.js)`, () => {
      expect(S.validateEpisode(ep, { cast: new Set(Object.keys(CAST)), phrases: PHRASES })).toEqual([]);
    });
  });
  it('у каждого узла с выбором ≥2 варианта, у каждой открытой реплики 3–5 образцов', () => {
    EPS.forEach((ep) => Object.values(ep.nodes).forEach((n) => {
      if (!n.reply) return;
      if (n.reply.type === 'choice') expect(n.reply.options.length).toBeGreaterThanOrEqual(2);
      else {
        expect(n.reply.samples.length).toBeGreaterThanOrEqual(3);
        expect(n.reply.samples.length).toBeLessThanOrEqual(5);
      }
    }));
  });
  it('в каждом эпизоде есть и выбор с тремя тонами, и открытая реплика, и ветвление', () => {
    EPS.forEach((ep) => {
      const nodes = Object.values(ep.nodes);
      const choices = nodes.filter((n) => n.reply && n.reply.type === 'choice');
      expect(choices.some((n) => ['natural', 'formal', 'rude'].every((t) => n.reply.options.some((o) => o.tone === t)))).toBe(true);
      expect(nodes.some((n) => n.reply && n.reply.type === 'open')).toBe(true);
      expect(choices.some((n) => new Set(n.reply.options.map((o) => o.next)).size > 1)).toBe(true);
    });
  });
  it('валидатор ловит поломки: битый переход, образец, который не узнаётся, мало вариантов', () => {
    const broken = JSON.parse(JSON.stringify(EPS[0]));
    broken.nodes.n1.reply.options[0].next = 'nowhere';
    broken.nodes.n2.reply.samples.push('The weather is nice today.');
    broken.nodes.n3.reply.options = broken.nodes.n3.reply.options.slice(0, 1);
    const errors = S.validateEpisode(broken, { phrases: PHRASES }).join('\n');
    expect(errors).toMatch(/nowhere/);
    expect(errors).toMatch(/не узнаётся/);
    expect(errors).toMatch(/меньше 2 вариантов/);
  });
});

describe('Прогресс сцен', () => {
  it('эпизоды открываются по порядку, следующий для урока — первый непройденный', () => {
    let p = S.normalizeProgress(null, EPS);
    expect(S.nextEpisode(p, EPS)).toBe(EPS[0].id);
    expect(S.isUnlocked(p, EPS, 0)).toBe(true);
    expect(S.isUnlocked(p, EPS, 1)).toBe(false);
    p = S.recordPlay(p, EPS, EPS[0].id, { finished: true, opensOk: 1, opensTotal: 2, tones: { natural: 2, rude: 1 } }, '2026-10-05');
    expect(S.isUnlocked(p, EPS, 1)).toBe(true);
    expect(S.nextEpisode(p, EPS)).toBe(EPS[1].id);
    expect(p[EPS[0].id]).toEqual({ done: true, plays: 1, opensOk: 1, opensTotal: 2, tones: { natural: 2, formal: 0, rude: 1 }, date: '2026-10-05' });
  });
  it('незавершённое прохождение не открывает следующий эпизод; JSON-безопасно', () => {
    const p = S.recordPlay(null, EPS, EPS[0].id, { finished: false }, '2026-10-05');
    expect(p[EPS[0].id].done).toBe(false);
    expect(S.normalizeProgress(JSON.parse(JSON.stringify(p)), EPS)).toEqual(p);
  });
  it('промпт «Разобрать с ИИ» содержит ситуацию, реплику и ответ ученика', () => {
    const t = S.aiPrompt({ episode: 'Аэропорт JFK', who: 'Officer', say: 'How long are you staying?', answer: 'For one year', samples: ["I'm here for a year."] });
    expect(t).toContain('Аэропорт JFK');
    expect(t).toContain('How long are you staying?');
    expect(t).toContain('For one year');
  });
});
