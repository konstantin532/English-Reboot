import { describe, it, expect } from 'vitest';
import '../js/ielts.js';
const { analyse } = globalThis.IELTS;

describe('IELTS.analyse', () => {
  it('flags short, informal essays', () => {
    const a = analyse("I think it's good. I think people don't care. I think so.", 2);
    expect(a.words).toBeLessThan(250);
    expect(a.tips.some((t) => t.includes('250'))).toBe(true);
    expect(a.tips.some((t) => t.includes('Сокращения'))).toBe(true);
  });
  it('counts linkers and AWL words', () => {
    const a = analyse('However, the research indicates a significant impact. Moreover, the policy requires sufficient resources. Therefore, governments should evaluate this approach.', 2);
    expect(a.linkers).toEqual(expect.arrayContaining(['however', 'moreover', 'therefore']));
    expect(a.awl).toEqual(expect.arrayContaining(['research', 'significant', 'impact', 'policy']));
  });
  it('requires an overview in Task 1', () => {
    expect(analyse('The graph shows sales. Sales rose.', 1).tips.some((t) => t.includes('overview'))).toBe(true);
  });
});
