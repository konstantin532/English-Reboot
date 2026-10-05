import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';

/* Этап 5: сравнение распознанной речи с эталоном. */
const ORDER = ['content_grammar', 'content_vocab', 'content_extra', 'content_pro', 'content_us', 'lex_us', 'traps_us', 'ladder', 'speech'];
const ctx = { console: { log() {}, warn() {}, error() {} } };
ctx.window = ctx;
vm.createContext(ctx);
vm.runInContext(ORDER.map((f) => fs.readFileSync(path.resolve(process.cwd(), 'js', f + '.js'), 'utf8')).join('\n;\n') + ';this.__C = CONVERSATION_CARDS; this.__L = LEX_US;', ctx);
const { Speech: S, AccentTraps: T } = ctx;
const statuses = (r) => r.words.map((w) => w.status);

describe('Сравнение с эталоном', () => {
  it('точное совпадение — 100, регистр и пунктуация не важны', () => {
    const r = S.compare('Can you pass the salt?', 'can you pass the salt');
    expect(r.score).toBe(100);
    expect(r.verdict).toBe('pass');
    expect(statuses(r).every((s) => s === 'ok')).toBe(true);
  });
  it('сокращения равны полным формам: распознаватель пишет «what is up» вместо «What\'s up?»', () => {
    expect(S.compare("What's up?", 'what is up').score).toBe(100);
    expect(S.compare("I'm on my way", 'I am on my way').score).toBe(100);
  });
  it('разговорные слияния и числа: gonna = going to, 5 = five', () => {
    expect(S.compare("I'm gonna be late", "I'm going to be late").score).toBe(100);
    expect(S.compare("I'll be there in five", "I'll be there in 5").score).toBe(100);
  });
  it('замена слова: «sink» вместо «think» — слово помечено «не так», видно, что услышано', () => {
    const r = S.compare('I think so', 'I sink so');
    expect(statuses(r)).toEqual(['ok', 'wrong', 'ok']);
    expect(r.words[1].heard).toBe('sink');
    expect(r.score).toBe(67);
    expect(r.verdict).toBe('almost');
  });
  it('пропуск слова и лишние слова', () => {
    const miss = S.compare('Can you pass the salt?', 'can you the salt');
    expect(statuses(miss)).toEqual(['ok', 'ok', 'missing', 'ok', 'ok']);
    expect(miss.score).toBe(80);
    const extra = S.compare("What's up?", 'hey what is up man');
    expect(extra.extra).toEqual(['hey', 'man']);
    expect(extra.score).toBe(83); // (3 верных − 0.25·2 лишних) / 3 токена (what is up)
  });
  it('слово из двух токенов (I\'m = i am) получает худший статус своих частей', () => {
    const r = S.compare("I'm on my way", 'I on my way');
    expect(r.words[0].status).toBe('missing');
  });
  it('пусто или совсем не то — низкая оценка, «miss»', () => {
    expect(S.compare('Can you pass the salt?', '').score).toBe(0);
    expect(S.compare('Can you pass the salt?', 'the weather is nice').verdict).toBe('miss');
  });
  it('порог автозачёта — 80, «почти» — от 50', () => {
    expect(S.PASS).toBe(80);
    expect(S.ALMOST).toBe(50);
  });
});

describe('Альтернативы распознавания и ловушки акцента', () => {
  it('из альтернатив берётся лучшая для эталона', () => {
    const r = S.best('I think so', ['I sink so', 'I think so', 'eye think sew']);
    expect(r.score).toBe(100);
    expect(r.heard).toBe('I think so');
    expect(S.best('I think so', [])).toBe(null);
  });
  it('ловушка «пройдена», только если все её слова распознаны верно', () => {
    const look = T.makeLookup(ctx.__C, ctx.__L);
    const bad = S.trapResults(S.compare('I think so', 'I sink so'), 'I think so', look);
    expect(bad.th).toBe(false);
    const good = S.trapResults(S.compare('I think so', 'I think so'), 'I think so', look);
    expect(good.th).toBe(true);
  });
  it('выравнивание — корректная последовательность операций', () => {
    const ops = S.align(['a', 'b', 'c'], ['a', 'x', 'c', 'd']).map((o) => o.op);
    expect(ops).toEqual(['ok', 'wrong', 'ok', 'extra']);
  });
});
