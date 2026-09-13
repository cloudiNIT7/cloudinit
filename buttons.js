/* ==========================================================================
   Cloud iNIT — advanced button behaviour
   Owns every pointer/click effect for .btn elements. Pairs with buttons.css.

   Transform ownership is split so two effects never write the same property:
     .btn         → GSAP        (magnetic pull, tilt)
     .btn__inner  → CSS :hover  (lift + scale)
     .btn__label  → GSAP        (per-letter stagger)

   Degrades cleanly:
     · no JS      → semantic <a>/<button>, CSS hover still works
     · no GSAP    → CSS-only effects, JS effects silently skipped
     · reduced motion → pointer effects disabled, state effects kept
     · touch      → pointer effects skipped entirely
   ========================================================================== */

(() => {
  'use strict';

  // script.js installs a no-op shim when the GSAP CDN fails. It keeps the API
  // alive but cannot animate, so treat it as "no GSAP" and skip pointer effects
  // rather than burning mousemove handlers on calls that do nothing.
  const hasGSAP = typeof window.gsap !== 'undefined' && !window.gsap.__shim;
  const finePointer = matchMedia('(pointer:fine)').matches;
  const reduced = matchMedia('(prefers-reduced-motion:reduce)');
  const canMove = () => finePointer && !reduced.matches && hasGSAP;

  const SPARK_COLORS = ['#b8912b', '#9c7a22', '#d8b356', '#1d1d1f', '#f3e7cb'];

  const CHECK_SVG =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 12.5l5 5 10-10"/></svg>';

  /* ---------- markup upgrade -------------------------------------------------
     Wraps existing button content in the layered structure. Idempotent, so it
     is safe to call again after injecting markup dynamically. */
  function upgrade(root = document) {
    // legacy classes → new component, keeping the old class for any page CSS
    root.querySelectorAll('.btn-primary,.btn-ghost,.nav-cta').forEach(el => {
      el.classList.add('btn');
      if (el.classList.contains('btn-primary') || el.classList.contains('nav-cta')) {
        el.classList.add('btn--primary');
      }
      if (el.classList.contains('btn-ghost')) el.classList.add('btn--ghost');
      // sensible defaults if the author didn't opt in explicitly
      if (!el.hasAttribute('data-fx')) {
        el.setAttribute('data-fx', 'shimmer magnetic ripple glow');
      }
      // .magnetic was the old opt-in class; fold it into data-fx
      if (el.classList.contains('magnetic')) {
        const fx = el.getAttribute('data-fx');
        if (!/\bmagnetic\b/.test(fx)) el.setAttribute('data-fx', fx + ' magnetic');
        el.classList.remove('magnetic');
      }
    });

    root.querySelectorAll('.btn').forEach(build);
    root.querySelectorAll('.icon-btn').forEach(bindIconBtn);
  }

  function build(btn) {
    if (btn.dataset.btnReady === '1') return;
    btn.dataset.btnReady = '1';

    let inner = btn.querySelector(':scope > .btn__inner');
    if (!inner) {
      inner = document.createElement('span');
      inner.className = 'btn__inner';
      while (btn.firstChild) inner.appendChild(btn.firstChild);
      btn.appendChild(inner);
    }

    // wrap bare text nodes in .btn__label so GSAP has a safe target
    if (!inner.querySelector('.btn__label')) {
      const label = document.createElement('span');
      label.className = 'btn__label';
      [...inner.childNodes].forEach(n => {
        const isIcon = n.nodeType === 1 &&
          (n.classList.contains('btn__ico') || n.tagName === 'SVG');
        if (!isIcon) label.appendChild(n);
      });
      inner.insertBefore(label, inner.firstChild);
    }

    // state layers — only added when the button can actually enter that state
    if (btn.hasAttribute('data-async') && !inner.querySelector('.btn__spinner')) {
      const sp = document.createElement('span');
      sp.className = 'btn__spinner';
      sp.innerHTML = '<i></i>';
      inner.appendChild(sp);

      const ck = document.createElement('span');
      ck.className = 'btn__check';
      ck.innerHTML = CHECK_SVG;
      inner.appendChild(ck);
    }

    const fx = btn.getAttribute('data-fx') || '';
    const has = name => new RegExp('\\b' + name + '\\b').test(fx);

    if (has('glow')) bindGlow(btn, inner);
    if (has('ripple')) bindRipple(btn, inner);
    if (has('magnetic')) bindMagnetic(btn);
    if (has('tilt')) bindTilt(btn, inner);
    if (has('letters')) bindLetters(btn);
    if (has('confetti')) bindConfetti(btn);
    if (has('lottie')) queueLottie(btn, inner);
  }

  /* ---------- glow: CSS custom props follow the cursor (no GSAP needed) ---- */
  function bindGlow(btn, inner) {
    if (!finePointer) return;
    btn.addEventListener('mousemove', e => {
      const r = inner.getBoundingClientRect();
      inner.style.setProperty('--gx', ((e.clientX - r.left) / r.width * 100) + '%');
      inner.style.setProperty('--gy', ((e.clientY - r.top) / r.height * 100) + '%');
    }, { passive: true });
  }

  /* ---------- ripple: expands from the exact click point ------------------- */
  function bindRipple(btn, inner) {
    btn.addEventListener('pointerdown', e => {
      if (reduced.matches) return;
      const r = inner.getBoundingClientRect();
      const span = document.createElement('span');
      span.className = 'btn__ripple';
      // diameter must cover the far corner from the click point
      const dx = Math.max(e.clientX - r.left, r.right - e.clientX);
      const dy = Math.max(e.clientY - r.top, r.bottom - e.clientY);
      span.style.setProperty('--rs', (Math.hypot(dx, dy) * 2) + 'px');
      span.style.setProperty('--rx', (e.clientX - r.left) + 'px');
      span.style.setProperty('--ry', (e.clientY - r.top) + 'px');
      inner.appendChild(span);
      span.addEventListener('animationend', () => span.remove(), { once: true });
    });
  }

  /* ---------- magnetic: cursor pulls the outer shell ----------------------
     Strength scales with distance from centre and is capped so the button
     never detaches from its hit area. */
  function bindMagnetic(btn) {
    if (!canMove()) return;
    const pull = parseFloat(btn.dataset.pull) || 0.32;
    const cap = parseFloat(btn.dataset.pullMax) || 14;
    const xTo = gsap.quickTo(btn, 'x', { duration: 0.42, ease: 'power3.out' });
    const yTo = gsap.quickTo(btn, 'y', { duration: 0.42, ease: 'power3.out' });

    btn.addEventListener('mousemove', e => {
      const r = btn.getBoundingClientRect();
      const rx = e.clientX - (r.left + r.width / 2);
      const ry = e.clientY - (r.top + r.height / 2);
      xTo(clamp(rx * pull, -cap, cap));
      yTo(clamp(ry * pull, -cap, cap));
    }, { passive: true });

    btn.addEventListener('mouseleave', () => {
      gsap.to(btn, { x: 0, y: 0, duration: 0.7, ease: 'elastic.out(1,0.42)' });
    });
  }

  /* ---------- tilt: 3D rotation toward the cursor -------------------------- */
  function bindTilt(btn, inner) {
    if (!canMove()) return;
    const max = parseFloat(btn.dataset.tilt) || 11;
    gsap.set(inner, { transformPerspective: 620, transformStyle: 'preserve-3d' });

    btn.addEventListener('mousemove', e => {
      const r = btn.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      gsap.to(inner, {
        rotationY: px * max * 2,
        rotationX: -py * max * 2,
        duration: 0.45, ease: 'power2.out'
      });
    }, { passive: true });

    btn.addEventListener('mouseleave', () => {
      gsap.to(inner, { rotationX: 0, rotationY: 0, duration: 0.7, ease: 'elastic.out(1,0.5)' });
    });
  }

  /* ---------- letters: per-character lift on hover ------------------------
     Splits into spans once, then animates. aria-label preserves the original
     string so screen readers don't read it character by character. */
  function bindLetters(btn) {
    const label = btn.querySelector('.btn__label');
    if (!label || !canMove()) return;

    const text = label.textContent;
    if (!btn.getAttribute('aria-label')) btn.setAttribute('aria-label', text.trim());
    label.setAttribute('aria-hidden', 'true');
    label.textContent = '';

    const chars = [...text].map(ch => {
      const s = document.createElement('span');
      s.style.display = 'inline-block';
      s.style.willChange = 'transform';
      s.textContent = ch === ' ' ? '\u00A0' : ch;
      label.appendChild(s);
      return s;
    });

    btn.addEventListener('mouseenter', () => {
      gsap.to(chars, {
        y: -3, duration: 0.3, ease: 'power2.out',
        stagger: { each: 0.022, from: 'start' }
      });
    });
    btn.addEventListener('mouseleave', () => {
      gsap.to(chars, {
        y: 0, duration: 0.42, ease: 'elastic.out(1,0.55)',
        stagger: { each: 0.016, from: 'end' }
      });
    });
  }

  /* ---------- confetti: particle burst on click ---------------------------- */
  function bindConfetti(btn) {
    btn.addEventListener('click', () => burst(btn));
  }

  function burst(btn, count = 16) {
    if (!hasGSAP || reduced.matches) return;
    for (let i = 0; i < count; i++) {
      const s = document.createElement('span');
      s.className = 'btn__spark';
      s.style.background = SPARK_COLORS[i % SPARK_COLORS.length];
      s.style.left = (35 + Math.random() * 30) + '%';
      s.style.top = '50%';
      btn.appendChild(s);

      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.6;
      const dist = 42 + Math.random() * 52;

      gsap.timeline({ onComplete: () => s.remove() })
        .set(s, { scale: 0, opacity: 1 })
        .to(s, {
          x: Math.cos(angle) * dist,
          y: Math.sin(angle) * dist - 14,   // slight upward bias
          scale: 0.5 + Math.random(),
          rotation: Math.random() * 360,
          duration: 0.52 + Math.random() * 0.22,
          ease: 'power2.out'
        })
        .to(s, { y: '+=34', opacity: 0, duration: 0.42, ease: 'power1.in' }, '-=0.14');
    }
  }

  /* ---------- Lottie: loaded only if a page actually uses it --------------- */
  const lottieQueue = [];
  let lottieLoading = false;

  function queueLottie(btn, inner) {
    const src = btn.dataset.lottie;
    if (!src) return;
    let slot = inner.querySelector('.btn__lottie');
    if (!slot) {
      slot = document.createElement('span');
      slot.className = 'btn__lottie';
      slot.setAttribute('aria-hidden', 'true');
      inner.appendChild(slot);
    }
    lottieQueue.push({ btn, slot, src });
    loadLottie();
  }

  function loadLottie() {
    if (lottieLoading) return;
    lottieLoading = true;
    if (window.lottie) return void drainLottie();
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/lottie-web/5.12.2/lottie_svg.min.js';
    s.async = true;
    s.crossOrigin = 'anonymous';
    s.onload = drainLottie;
    s.onerror = () => {
      // library unreachable — drop the empty slots so nothing shifts layout
      lottieQueue.forEach(({ slot }) => slot.remove());
      lottieQueue.length = 0;
    };
    document.head.appendChild(s);
  }

  function drainLottie() {
    while (lottieQueue.length) {
      const { btn, slot, src } = lottieQueue.pop();
      const anim = window.lottie.loadAnimation({
        container: slot,
        renderer: 'svg',
        loop: btn.hasAttribute('data-lottie-loop'),
        autoplay: reduced.matches ? false : btn.hasAttribute('data-lottie-loop'),
        path: src
      });
      if (!btn.hasAttribute('data-lottie-loop')) {
        btn.addEventListener('mouseenter', () => { if (!reduced.matches) anim.goToAndPlay(0); });
      }
    }
  }

  /* ---------- icon buttons ------------------------------------------------ */
  function bindIconBtn(btn) {
    if (btn.dataset.btnReady === '1') return;
    btn.dataset.btnReady = '1';
    const tip = btn.querySelector('.icon-tip');
    if (!canMove()) return;

    // .magnetic was the legacy opt-in class; script.js no longer handles it.
    // scale/x/y are separate GSAP properties, so these tweens coexist safely.
    if (btn.classList.contains('magnetic')) {
      btn.dataset.pull = btn.dataset.pull || '0.45';
      btn.dataset.pullMax = btn.dataset.pullMax || '10';
      bindMagnetic(btn);
    }

    btn.addEventListener('mouseenter', () => {
      gsap.to(btn, { scale: 1.1, duration: 0.34, ease: 'back.out(2)' });
      if (tip) gsap.to(tip, { opacity: 1, y: 0, duration: 0.28, ease: 'power3.out' });
    });
    btn.addEventListener('mouseleave', () => {
      gsap.to(btn, { scale: 1, duration: 0.34, ease: 'power3.out' });
      if (tip) gsap.to(tip, { opacity: 0, y: 6, duration: 0.22, ease: 'power2.in' });
    });
  }

  /* ---------- async state API -------------------------------------------- */
  function setLoading(btn, on = true) {
    btn.dataset.loading = String(!!on);
    btn.setAttribute('aria-busy', String(!!on));
    if (on) btn.removeAttribute('data-state');
  }

  function setDone(btn, { confetti = false, revertAfter = 1900 } = {}) {
    setLoading(btn, false);
    btn.dataset.state = 'done';
    if (confetti) burst(btn, 20);
    if (revertAfter) {
      setTimeout(() => btn.removeAttribute('data-state'), revertAfter);
    }
  }

  const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);

  /* ---------- boot -------------------------------------------------------- */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => upgrade());
  } else {
    upgrade();
  }

  window.CloudBtn = { upgrade, burst, setLoading, setDone };
})();
