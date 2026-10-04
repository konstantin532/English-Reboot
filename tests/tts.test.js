import { describe, it, expect, beforeEach } from 'vitest';

/* Озвучка: цепочка «голос системы → запись носителя → онлайн-синтез».
   Браузерные API подменяются: SpeechSynthesis, Audio, fetch, localStorage. */
const log = [];
let voices = [];
let synthStarts = true;

class FakeUtterance {
  constructor(text) { this.text = text; this.listeners = {}; }
  addEventListener(type, fn) { (this.listeners[type] ||= []).push(fn); }
  fire(type, ev = {}) { (this.listeners[type] || []).forEach((fn) => fn(ev)); if (this['on' + type]) this['on' + type](ev); }
}
class FakeAudio {
  constructor(src) { this.src = src; }
  play() { log.push('audio:' + this.src); setTimeout(() => this.onended && this.onended(), 5); return Promise.resolve(); }
  pause() {}
}

globalThis.window = globalThis;
globalThis.SpeechSynthesisUtterance = FakeUtterance;
globalThis.Audio = FakeAudio;
Object.defineProperty(globalThis, 'navigator', { value: { onLine: true }, configurable: true });
const store = {};
globalThis.localStorage = { getItem: (k) => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); } };
globalThis.speechSynthesis = {
  speaking: false, pending: false, onvoiceschanged: null,
  getVoices: () => voices,
  speak(u) { log.push('synth:' + u.text); if (synthStarts) setTimeout(() => { u.fire('start'); u.fire('end'); }, 5); },
  cancel() {}, resume() {},
};
globalThis.fetch = async (url) => {
  log.push('fetch:' + (String(url).includes('dictionaryapi') ? 'dict' : url));
  return { ok: true, json: async () => [{ phonetics: [{ audio: 'https://upload.wikimedia.org/x/hello-uk.mp3' }, { audio: 'https://upload.wikimedia.org/x/hello-us.mp3' }] }] };
};

await import('../js/tts.js');
const TTS = globalThis.TTS;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
TTS.initTTS();
// Как в браузере: смена списка голосов приходит событием voiceschanged
const setVoices = (list) => { voices = list; speechSynthesis.onvoiceschanged && speechSynthesis.onvoiceschanged(); };

beforeEach(() => {
  log.length = 0;
  TTS.setMode('auto');
  TTS.stopSpeaking();
});

describe('Озвучка: выбор источника', () => {
  it('есть английский голос → говорит система (офлайн)', async () => {
    setVoices([{ name: 'Microsoft Irina', lang: 'ru-RU', localService: true, voiceURI: 'ru' },
      { name: 'Microsoft Zira', lang: 'en-US', localService: true, voiceURI: 'zira' }]);
    synthStarts = true;
    TTS.speak('hello');
    await wait(50);
    expect(log).toEqual(['synth:hello']);
    expect(TTS.getStatus().englishVoices).toBe(1);
    expect(TTS.getStatus().voice).toContain('Zira');
  });

  it('только русский голос → слово звучит живой американской записью', async () => {
    setVoices([{ name: 'Microsoft Irina', lang: 'ru-RU', localService: true, voiceURI: 'ru' }]);
    TTS.speak('hello');
    await wait(50);
    expect(log[0]).toBe('fetch:dict');
    expect(log).toContain('audio:https://upload.wikimedia.org/x/hello-us.mp3'); // US, а не UK
    expect(log.some((x) => x.startsWith('synth:'))).toBe(false);
  });

  it('только русский голос → фраза идёт в онлайн-синтез', async () => {
    setVoices([]);
    TTS.speak('How is it going?');
    await wait(50);
    expect(log.some((x) => x.startsWith('audio:https://translate.google.com/translate_tts'))).toBe(true);
  });

  it('голос есть, но молчит 1.5 с → автоматический переход в онлайн', async () => {
    setVoices([{ name: 'Google US English', lang: 'en-US', localService: false, voiceURI: 'g' }]);
    synthStarts = false;
    TTS.speak('hello');
    await wait(1700);
    synthStarts = true;
    expect(log[0]).toBe('synth:hello');
    // запись слова уже в кэше с прошлого теста — запроса нет, но звучит она
    expect(log).toContain('audio:https://upload.wikimedia.org/x/hello-us.mp3');
    expect(TTS.getStatus().lastError).toContain('не начал');
  });

  it('режим «только система» не уходит в интернет', async () => {
    setVoices([]);
    TTS.setMode('system');
    TTS.speak('hello');
    await wait(50);
    expect(log.some((x) => x.startsWith('fetch') || x.startsWith('audio'))).toBe(false);
  });

  it('офлайн без голоса — честная ошибка, а не тишина без причины', async () => {
    setVoices([]);
    navigator.onLine = false;
    TTS.speak('hello');
    await wait(50);
    navigator.onLine = true;
    expect(TTS.getStatus().lastError).toContain('нет интернета');
  });
});

describe('Озвучка: выбор самого приятного голоса', () => {
  const zira = { name: 'Microsoft Zira - English (United States)', lang: 'en-US', localService: true, voiceURI: 'zira' };
  const ava = { name: 'Microsoft Ava Online (Natural) - English (United States)', lang: 'en-US', localService: false, voiceURI: 'ava' };
  const libby = { name: 'Microsoft Libby Online (Natural) - English (United Kingdom)', lang: 'en-GB', localService: false, voiceURI: 'libby' };
  const google = { name: 'Google US English', lang: 'en-US', localService: false, voiceURI: 'google' };

  it('онлайн: нейронный американский голос выше локального Zira и британского', () => {
    setVoices([zira, libby, google, ava]);
    expect(TTS.getStatus().voice).toContain('Ava');
    expect(TTS.isNatural(ava)).toBe(true);
    expect(TTS.isNatural(zira)).toBe(false);
  });

  it('Chrome без нейронных голосов: Google US English выше Zira', () => {
    setVoices([zira, google]);
    expect(TTS.getStatus().voice).toContain('Google US English');
  });

  it('офлайн: выбирается локальный голос, онлайн-голос бы промолчал', () => {
    navigator.onLine = false;
    setVoices([ava, google, zira]);
    expect(TTS.getStatus().voice).toContain('Zira');
    navigator.onLine = true;
  });
});
