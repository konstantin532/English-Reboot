import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

/* Палитра частей речи (css/style.css, блок POS-PALETTE): автор, 2026-10-08 — «палитра не должна быть почти вся
   одного цвета, даже если оттенки чуток разные». Проверяем цвета так, как их видит глаз: CIEDE2000.
   ΔE ≥ 20 — цвета различимы с первого взгляда; 0 — один и тот же цвет. */

function hexToLab(hex) {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  const X = (r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047;
  const Y = r * 0.2126 + g * 0.7152 + b * 0.0722;
  const Z = (r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883;
  const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  return [116 * f(Y) - 16, 500 * (f(X) - f(Y)), 200 * (f(Y) - f(Z))];
}

function de2000(x, y) {
  const [L1, a1, b1] = hexToLab(x);
  const [L2, a2, b2] = hexToLab(y);
  const rad = Math.PI / 180;
  const Cb = (Math.hypot(a1, b1) + Math.hypot(a2, b2)) / 2;
  const G = 0.5 * (1 - Math.sqrt(Cb ** 7 / (Cb ** 7 + 25 ** 7)));
  const a1p = (1 + G) * a1, a2p = (1 + G) * a2;
  const C1p = Math.hypot(a1p, b1), C2p = Math.hypot(a2p, b2);
  const hue = (p, q) => { if (p === 0 && q === 0) return 0; const v = Math.atan2(q, p) / rad; return v < 0 ? v + 360 : v; };
  const h1p = hue(a1p, b1), h2p = hue(a2p, b2);
  let dh = 0;
  if (C1p * C2p !== 0) { dh = h2p - h1p; if (dh > 180) dh -= 360; else if (dh < -180) dh += 360; }
  const dL = L2 - L1, dC = C2p - C1p, dH = 2 * Math.sqrt(C1p * C2p) * Math.sin((dh * rad) / 2);
  const Lb = (L1 + L2) / 2, Cbp = (C1p + C2p) / 2;
  let hb = h1p + h2p;
  if (C1p * C2p !== 0) hb = Math.abs(h1p - h2p) > 180 ? (h1p + h2p < 360 ? (h1p + h2p + 360) / 2 : (h1p + h2p - 360) / 2) : (h1p + h2p) / 2;
  const T = 1 - 0.17 * Math.cos((hb - 30) * rad) + 0.24 * Math.cos(2 * hb * rad) + 0.32 * Math.cos((3 * hb + 6) * rad) - 0.2 * Math.cos((4 * hb - 63) * rad);
  const dth = 30 * Math.exp(-(((hb - 275) / 25) ** 2));
  const Rc = 2 * Math.sqrt(Cbp ** 7 / (Cbp ** 7 + 25 ** 7));
  const Sl = 1 + (0.015 * (Lb - 50) ** 2) / Math.sqrt(20 + (Lb - 50) ** 2), Sc = 1 + 0.045 * Cbp, Sh = 1 + 0.015 * Cbp * T;
  const Rt = -Math.sin(2 * dth * rad) * Rc;
  return Math.sqrt((dL / Sl) ** 2 + (dC / Sc) ** 2 + (dH / Sh) ** 2 + Rt * (dC / Sc) * (dH / Sh));
}

const CSS = fs.readFileSync(path.resolve(process.cwd(), 'css/style.css'), 'utf8');
const block = (CSS.match(/\/\* POS-PALETTE:BEGIN[\s\S]*?\*\/([\s\S]*?)\/\* POS-PALETTE:END \*\//) || [])[1] || '';
const varsOf = (sel) => {
  const m = block.match(new RegExp(sel.replace(/[[\]().*:"=]/g, '\\$&') + '\\s*\\{([^}]*)\\}'));
  return Object.fromEntries([...((m && m[1]) || '').matchAll(/--pos-([a-z]+):\s*(#[0-9a-fA-F]{3,6})/g)].map((x) => [x[1], x[2]]));
};
const LIGHT = varsOf(':root');
const DARK = varsOf(':is([data-theme="dark"], [data-theme="amoled"])');
const BG = { light: '#FFFFFF', dark: '#1A1F26', amoled: '#0A0A0A' };
// Все части речи, которые выдаёт разметка (word_marks.js), и неправильный глагол
const POS = ['noun', 'verb', 'irr', 'adj', 'adv', 'pron', 'prep', 'conj', 'art', 'det', 'num', 'aux', 'modal', 'part'];
const ruleOf = (cls) => {
  const m = block.match(new RegExp('\\.pos-' + cls + '\\s*\\{\\s*border-bottom:\\s*([\\d.]+px)\\s+(solid|double|dashed|dotted)\\s+var\\(--pos-([a-z]+)\\)'));
  return m ? { width: m[1], style: m[2], color: m[3] } : null;
};

describe('Палитра частей речи: цвета различимы на глаз', () => {
  it('у каждой части речи — правило с цветом из палитры', () => {
    for (const p of POS) expect(ruleOf(p), '.pos-' + p).not.toBeNull();
  });

  for (const [theme, pal] of [['светлая', LIGHT], ['тёмная', DARK]]) {
    it(`${theme} тема: любые два цвета палитры различаются (ΔE2000 ≥ 20)`, () => {
      const names = Object.keys(pal);
      expect(names.length).toBeGreaterThanOrEqual(9);
      const close = [];
      for (let i = 0; i < names.length; i++) {
        for (let j = i + 1; j < names.length; j++) {
          const d = de2000(pal[names[i]], pal[names[j]]);
          if (d < 20) close.push(`${names[i]}/${names[j]} = ${d.toFixed(1)}`);
        }
      }
      expect(close).toEqual([]);
    });
  }

  it('линии видны на фоне карточки во всех темах (ΔE2000 ≥ 25)', () => {
    const weak = [];
    for (const [k, v] of Object.entries(LIGHT)) if (de2000(v, BG.light) < 25) weak.push('светлая ' + k);
    for (const [k, v] of Object.entries(DARK)) for (const bg of [BG.dark, BG.amoled]) if (de2000(v, bg) < 25) weak.push('тёмная ' + k + ' ' + bg);
    expect(weak).toEqual([]);
  });

  it('разные части речи выглядят по-разному (цвет + вид линии); служебные слова — намеренно одной группой', () => {
    const SERVICE = ['conj', 'art', 'det', 'num', 'part'];
    const look = (p) => { const r = ruleOf(p); return r.color + ' ' + r.style; };
    const groups = ['noun', 'verb', 'irr', 'adj', 'adv', 'pron', 'prep', 'aux', 'modal', 'service'];
    const looks = groups.map((g) => look(g === 'service' ? 'conj' : g));
    expect(new Set(looks).size).toBe(groups.length);
    for (const p of SERVICE) expect(look(p)).toBe(look('conj'));
    expect(ruleOf('irr').style).toBe('double');          // неправильный глагол — двойная линия
    expect(ruleOf('verb').style).toBe('solid');
  });

  it('выключенный слой «части речи» гасит все цвета, включая числительные, модальные и to', () => {
    const off = (CSS.match(/body\.layer-pos-off[^{]*\{[^}]*\}/g) || []).join(' ');
    for (const p of POS) expect(off, '.pos-' + p).toContain('.pos-' + p);
  });

  it('ударный слог не красный — красный занят глаголом', () => {
    const rules = CSS.match(/(^|\})\s*[^{}]*\.stress\s*\{[^}]*\}/g) || [];
    const colored = rules.filter((r) => /[^-]color:\s*var\(--(danger|stress-color)\)|color:\s*#(FB7185|FF3B30|FF453A)/i.test(r));
    expect(colored).toEqual([]);
  });
});
