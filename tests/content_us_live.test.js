import { describe, it, expect } from 'vitest';
import { loadContent } from '../scripts/content_stats.mjs';

// Пакет A1+ «Первый месяц»: живые сокращения (kinda, lemme, 'em…) показываются вместе с полной формой
describe('Первый месяц: полная форма живых сокращений', () => {
  const cv = loadContent().sections.conversation;
  const byFront = (f) => cv.find((c) => c.payload.front === f);

  it('kinda → «Слитно: kind of → kinda»', () => {
    const c = byFront("It's kinda far");
    expect(c.sublevel).toBe('A1+');
    expect(c.payload.examples[0].connected).toBe('kind of → kinda');
  });

  it("'em и gonna распознаются с апострофом и регистром", () => {
    const withEm = cv.filter((c) => c.sublevel && /'em\b/.test(c.payload.examples[0].text));
    expect(withEm.length).toBeGreaterThan(0);
    for (const c of withEm) expect(c.payload.examples[0].connected).toContain('them → \'em');
    const gonna = byFront("I'm gonna be late");
    expect(gonna.payload.examples[0].connected).toBe('going to → gonna');
  });

  it('у каждой карточки «живой речи» с сокращением есть полная форма', () => {
    const forms = /\b(gonna|wanna|gotta|kinda|lemme|gimme|dunno|outta|lotta|c'mon|y'know)\b|'em\b|'cause\b/i;
    const live = cv.filter((c) => c.sublevel && forms.test(c.payload.examples[0].text));
    expect(live.length).toBeGreaterThan(20);
    for (const c of live) expect(c.payload.examples[0].connected, c.id).not.toBe('');
  });

  it('старые темы без подуровня не трогаем', () => {
    const old = cv.filter((c) => !c.sublevel);
    expect(old.every((c) => c.payload.examples[0].connected === '')).toBe(true);
  });
});
