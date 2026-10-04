/* ==========================================================================
   English Reboot — PRO: микроэффекты
   Файл: effects.js — вибрация, звуки (Web Audio, без файлов), конфетти,
   skeleton, flip. Уважает settings.effects_enabled и prefers-reduced-motion.
   ========================================================================== */

const Effects = (() => {
  'use strict';

  let audioCtx = null;
  let enabled = () => true; // gamify.js подменит на чтение settings

  function setEnabledGetter(fn) { enabled = fn || enabled; }
  const on = () => { try { return !!enabled(); } catch (e) { return false; } };

  /* ---------- Вибрация ---------- */
  function vibrate(pattern) {
    if (!on()) return;
    try { if ('vibrate' in navigator) navigator.vibrate(pattern); } catch (e) {}
  }

  /* ---------- Звук ---------- */
  function initAudio() {
    if (!audioCtx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) audioCtx = new AC();
    }
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
    return audioCtx;
  }

  function playTone(freq, duration, type) {
    if (!on()) return;
    const ctx = initAudio();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type || 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (e) {}
  }

  const playCorrect = () => { playTone(880, 0.12); setTimeout(() => playTone(1320, 0.14), 80); };
  const playWrong = () => playTone(200, 0.2, 'sawtooth');
  const playAchievement = () => {
    playTone(523, 0.1); setTimeout(() => playTone(659, 0.1), 100); setTimeout(() => playTone(784, 0.2), 200);
  };
  const playCombo = (m) => playTone(440 + m * 110, 0.1, 'triangle');
  const playLevelUp = () => {
    [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => playTone(f, 0.15), i * 120));
  };

  /* ---------- Конфетти ---------- */
  function launchConfetti() {
    if (!on() || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const canvas = document.createElement('canvas');
    canvas.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:999;';
    document.body.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const colors = ['#E67E22', '#2ECC71', '#3498DB', '#9B59B6', '#F1C40F', '#E74C3C'];
    const parts = [];
    for (let i = 0; i < 90; i++) {
      parts.push({
        x: canvas.width / 2 + (Math.random() - 0.5) * 220,
        y: canvas.height / 2,
        vx: (Math.random() - 0.5) * 13,
        vy: -Math.random() * 12 - 5,
        size: Math.random() * 6 + 3,
        color: colors[(Math.random() * colors.length) | 0],
        rot: Math.random() * 360,
        rs: (Math.random() - 0.5) * 12,
      });
    }
    const t0 = Date.now();
    (function animate() {
      if (Date.now() - t0 > 2800) { canvas.remove(); return; }
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      parts.forEach((p) => {
        p.x += p.vx; p.y += p.vy; p.vy += 0.38; p.rot += p.rs;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot * Math.PI / 180);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.55);
        ctx.restore();
      });
      requestAnimationFrame(animate);
    })();
  }

  /* ---------- Skeleton / flip ---------- */
  function showSkeleton(container, count) {
    const n = count || 6;
    let html = '';
    for (let i = 0; i < n; i++) {
      html += '<div class="skeleton-card"><div class="skeleton-line w70"></div>' +
        '<div class="skeleton-line w40"></div><div class="skeleton-line w90"></div></div>';
    }
    if (container) container.innerHTML = html;
  }

  function flipCard(cardEl, callback) {
    if (!cardEl) { if (callback) callback(); return; }
    cardEl.classList.add('flipping');
    setTimeout(() => { if (callback) callback(); }, 150);
    setTimeout(() => cardEl.classList.remove('flipping'), 320);
  }

  return { setEnabledGetter, vibrate, playCorrect, playWrong, playAchievement,
    playCombo, playLevelUp, launchConfetti, showSkeleton, flipCard };
})();