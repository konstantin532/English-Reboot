/**
 * Шим vitest на node:test — только для облачной сессии, где реестр npm закрыт.
 * Ставит его scripts/er-test-env.sh в node_modules/vitest. На CI и у автора работает настоящий vitest.
 * Не хватает матчера — добавить сюда, а не переписывать тест под шим.
 */
import { describe, it, test, beforeEach, afterEach, before, after } from 'node:test';
import { inspect } from 'node:util';

export { describe, it, test, beforeEach, afterEach };
export const beforeAll = before;
export const afterAll = after;

const ASYM = Symbol('asymmetric');
const show = (v) => inspect(v, { depth: 4, maxArrayLength: 20, maxStringLength: 200, breakLength: 120 });
const tag = (v) => Object.prototype.toString.call(v);

function asym(name, match) {
  return { [ASYM]: true, match, [inspect.custom]: () => name };
}

/* Глубокое сравнение как у toEqual: без прототипов (массивы из vm-контекста равны обычным),
   свойства со значением undefined не учитываются. */
export function equals(a, b, strict = false) {
  if (b && b[ASYM]) return b.match(a);
  if (a && a[ASYM]) return a.match(b);
  if (Object.is(a, b)) return true;
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (tag(a) !== tag(b)) return false;
  if (a instanceof Date || tag(a) === '[object Date]') return a.getTime() === b.getTime();
  if (tag(a) === '[object RegExp]') return String(a) === String(b);
  if (tag(a) === '[object Map]') {
    if (a.size !== b.size) return false;
    for (const [k, v] of a) if (!b.has(k) || !equals(v, b.get(k), strict)) return false;
    return true;
  }
  if (tag(a) === '[object Set]') {
    if (a.size !== b.size) return false;
    for (const v of a) if (![...b].some((w) => equals(v, w, strict))) return false;
    return true;
  }
  if (Array.isArray(a)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) if (!equals(a[i], b[i], strict)) return false;
    return true;
  }
  const keys = (o) => Object.keys(o).filter((k) => strict || o[k] !== undefined);
  const ka = keys(a), kb = keys(b);
  if (ka.length !== kb.length) return false;
  return ka.every((k) => Object.prototype.hasOwnProperty.call(b, k) && equals(a[k], b[k], strict));
}

function matchObject(actual, expected) {
  if (typeof actual !== 'object' || actual === null) return false;
  return Object.keys(expected).every((k) => {
    const e = expected[k];
    if (e && typeof e === 'object' && !e[ASYM] && !Array.isArray(e)) return matchObject(actual[k], e);
    return equals(actual[k], e);
  });
}

function lengthOf(v) { return v == null ? undefined : v.length; }

function makeMatchers(actual, message, negated) {
  const check = (pass, text) => {
    if (pass === negated) {
      const err = new Error((message ? message + ': ' : '') + (negated ? 'not ' : '') + text);
      err.name = 'AssertionError';
      throw err;
    }
  };
  const m = {
    toBe: (e) => check(Object.is(actual, e), `expected ${show(actual)} to be ${show(e)}`),
    toEqual: (e) => check(equals(actual, e), `expected ${show(actual)} to equal ${show(e)}`),
    toStrictEqual: (e) => check(equals(actual, e, true), `expected ${show(actual)} to strictly equal ${show(e)}`),
    toContain: (e) => check(
      typeof actual === 'string' ? actual.includes(e) : actual != null && Array.from(actual).includes(e),
      `expected ${show(actual)} to contain ${show(e)}`),
    toContainEqual: (e) => check(actual != null && Array.from(actual).some((x) => equals(x, e)),
      `expected ${show(actual)} to contain equal ${show(e)}`),
    toMatch: (e) => check(typeof actual === 'string' && (typeof e === 'string' ? actual.includes(e) : e.test(actual)),
      `expected ${show(actual)} to match ${show(e)}`),
    toMatchObject: (e) => check(matchObject(actual, e), `expected ${show(actual)} to match object ${show(e)}`),
    toHaveLength: (n) => check(lengthOf(actual) === n, `expected length ${show(lengthOf(actual))} to be ${n}`),
    toHaveProperty: (p, ...v) => {
      const path = Array.isArray(p) ? p : String(p).split('.');
      let cur = actual, ok = true;
      for (const k of path) { if (cur == null || !(k in Object(cur))) { ok = false; break; } cur = cur[k]; }
      if (ok && v.length) ok = equals(cur, v[0]);
      check(ok, `expected ${show(actual)} to have property ${show(p)}${v.length ? ' = ' + show(v[0]) : ''}`);
    },
    toBeTruthy: () => check(!!actual, `expected ${show(actual)} to be truthy`),
    toBeFalsy: () => check(!actual, `expected ${show(actual)} to be falsy`),
    toBeNull: () => check(actual === null, `expected ${show(actual)} to be null`),
    toBeUndefined: () => check(actual === undefined, `expected ${show(actual)} to be undefined`),
    toBeDefined: () => check(actual !== undefined, `expected ${show(actual)} to be defined`),
    toBeNaN: () => check(Number.isNaN(actual), `expected ${show(actual)} to be NaN`),
    toBeInstanceOf: (C) => check(actual instanceof C, `expected ${show(actual)} to be instance of ${C && C.name}`),
    toBeTypeOf: (t) => check(typeof actual === t, `expected typeof ${show(actual)} to be ${t}`),
    toBeGreaterThan: (n) => check(actual > n, `expected ${show(actual)} to be > ${show(n)}`),
    toBeGreaterThanOrEqual: (n) => check(actual >= n, `expected ${show(actual)} to be >= ${show(n)}`),
    toBeLessThan: (n) => check(actual < n, `expected ${show(actual)} to be < ${show(n)}`),
    toBeLessThanOrEqual: (n) => check(actual <= n, `expected ${show(actual)} to be <= ${show(n)}`),
    toBeCloseTo: (n, digits = 2) => check(Math.abs(actual - n) < Math.pow(10, -digits) / 2,
      `expected ${show(actual)} to be close to ${show(n)} (${digits} digits)`),
    toThrow: (e) => {
      let thrown = null;
      try { actual(); } catch (err) { thrown = err; }
      let ok = thrown !== null;
      if (ok && e !== undefined) {
        const msg = thrown && thrown.message !== undefined ? String(thrown.message) : String(thrown);
        if (typeof e === 'string') ok = msg.includes(e);
        else if (e instanceof RegExp) ok = e.test(msg);
        else if (typeof e === 'function') ok = thrown instanceof e;
        else if (e && typeof e === 'object') ok = msg === e.message;
      }
      check(ok, `expected function to throw${e !== undefined ? ' ' + show(e) : ''}` +
        (thrown ? `, got ${show(thrown && thrown.message)}` : ''));
    },
  };
  return m;
}

export function expect(actual, message) {
  const m = makeMatchers(actual, message, false);
  m.not = makeMatchers(actual, message, true);
  return m;
}

expect.arrayContaining = (exp) => asym(`ArrayContaining ${show(exp)}`,
  (a) => a != null && typeof a[Symbol.iterator] === 'function' && exp.every((e) => Array.from(a).some((x) => equals(x, e))));
expect.objectContaining = (exp) => asym(`ObjectContaining ${show(exp)}`, (a) => matchObject(a, exp));
expect.stringContaining = (s) => asym(`StringContaining ${show(s)}`, (a) => typeof a === 'string' && a.includes(s));
expect.stringMatching = (re) => asym(`StringMatching ${show(re)}`,
  (a) => typeof a === 'string' && (typeof re === 'string' ? new RegExp(re) : re).test(a));
expect.any = (C) => asym(`Any<${C && C.name}>`, (a) => {
  if (C === String) return typeof a === 'string' || a instanceof String;
  if (C === Number) return typeof a === 'number' || a instanceof Number;
  if (C === Boolean) return typeof a === 'boolean' || a instanceof Boolean;
  if (C === Function) return typeof a === 'function';
  if (C === Object) return a !== null && typeof a === 'object';
  if (C === Array) return Array.isArray(a);
  return a instanceof C;
});
expect.anything = () => asym('Anything', (a) => a != null);

export const vi = new Proxy({}, {
  get(_, name) { throw new Error(`vi.${String(name)} нет в шиме vitest — добавьте в scripts/er-shim/vitest/index.js`); },
});
