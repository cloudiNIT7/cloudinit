/* ==========================================================================
   Cloud iNIT — behavior
   ========================================================================== */

/* ---------- GSAP / ScrollTrigger fallback shim ----------------------------
   Animation libraries load from a third-party CDN, so they can be blocked by a
   network filter, an ad blocker, or a plain outage. Several things below are not
   decorative — the download-card filter and the platform detector both do real
   work inside gsap callbacks — so a missing library used to throw on the first
   bare `gsap.` call and kill every feature after it.

   Rather than guarding each call site, install a shim that keeps the same API
   and jumps straight to the end state:
     · tweens apply their final values immediately, then fire onComplete
     · gsap.from() is a no-op (its end state IS the element's natural state)
     · ScrollTrigger fires onEnter at once, so scroll-revealed content appears
   Result: no animation, but nothing is broken or invisible. */
(() => {
  if (typeof window.gsap !== 'undefined') return;
  document.documentElement.classList.add('no-motion');

  const list = t => typeof t === 'string' ? [...document.querySelectorAll(t)]
    : (t == null ? [] : (t.length !== undefined && !t.nodeType ? [...t] : [t]));

  const NUM_PX = { x: 1, y: 1 };                      // need a px unit
  const NUM_DEG = { rotate: 1, rotation: 1, rotateX: 1, rotateY: 1, rotationX: 1, rotationY: 1 };
  const SKIP = {
    duration: 1, delay: 1, ease: 1, stagger: 1, overwrite: 1, clearProps: 1,
    onComplete: 1, onStart: 1, onUpdate: 1, repeat: 1, yoyo: 1, paused: 1,
    transformPerspective: 1, transformStyle: 1, defaults: 1, immediateRender: 1
  };

  /* write a tween's end values straight to inline style */
  function applyEnd(targets, vars) {
    if (!vars) return;
    const tf = [];
    for (const k in vars) {
      if (SKIP[k]) continue;
      const v = vars[k];
      if (typeof v === 'function' || typeof v === 'object') continue;
      if (k === 'opacity') continue;                  // handled below
      if (NUM_PX[k]) tf.push(`translate${k.toUpperCase()}(${typeof v === 'number' ? v + 'px' : v})`);
      else if (k === 'xPercent') tf.push(`translateX(${v}%)`);
      else if (k === 'yPercent') tf.push(`translateY(${v}%)`);
      else if (k === 'scale') tf.push(`scale(${v})`);
      else if (NUM_DEG[k]) {
        const axis = /X$/.test(k) ? 'X' : /Y$/.test(k) ? 'Y' : 'Z';
        tf.push(`rotate${axis}(${typeof v === 'number' ? v + 'deg' : v})`);
      }
    }
    list(targets).forEach(el => {
      if (!el || !el.style) return;
      if ('opacity' in vars && typeof vars.opacity === 'number') el.style.opacity = vars.opacity;
      if (tf.length) el.style.transform = tf.join(' ');
      if (vars.clearProps) el.style.transform = '';
    });
  }

  /* fire callbacks asynchronously so behaviour matches the real library */
  const fire = vars => {
    if (!vars) return;
    if (typeof vars.onStart === 'function') { try { vars.onStart(); } catch (e) {} }
    if (typeof vars.onComplete === 'function') setTimeout(() => { try { vars.onComplete(); } catch (e) {} }, 0);
  };

  const tween = (targets, vars) => { applyEnd(targets, vars); fire(vars); return chain; };

  /* chainable stand-in for both tweens and timelines */
  const chain = {
    to: (t, v) => tween(t, v),
    from: (t, v) => { fire(v); return chain; },
    fromTo: (t, f, v) => tween(t, v),
    set: (t, v) => { applyEnd(t, v); return chain; },
    add: () => chain, call: fn => { if (typeof fn === 'function') setTimeout(fn, 0); return chain; },
    play: () => chain, pause: () => chain, kill: () => chain,
    progress: () => chain, seek: () => chain, restart: () => chain, eventCallback: () => chain
  };

  window.gsap = {
    __shim: true,
    to: tween,
    from: (t, v) => { fire(v); return chain; },
    fromTo: (t, f, v) => tween(t, v),
    set: (t, v) => { applyEnd(t, v); return chain; },
    timeline: () => chain,
    registerPlugin() {},
    /* quickTo returns a setter that positions instantly */
    quickTo: (target, prop) => val => applyEnd(target, { [prop]: val }),
    utils: {
      toArray: list,
      clamp: (lo, hi, v) => Math.min(Math.max(v, lo), hi),
      random: (a, b) => a + Math.random() * (b - a)
    }
  };

  if (typeof window.ScrollTrigger === 'undefined') {
    window.ScrollTrigger = {
      __shim: true,
      /* reveal immediately — never leave scroll-gated content hidden */
      create(v) {
        if (v && typeof v.onEnter === 'function') setTimeout(() => { try { v.onEnter(); } catch (e) {} }, 0);
        return { kill() {}, refresh() {} };
      },
      refresh() {}, update() {}, getAll: () => [], killAll() {}
    };
  }
})();

/* ---------- service worker (PWA + offline page) ---------- */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}

/* ---------- nav active state ---------- */
(() => {
  const here = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-links a[href]').forEach(a => {
    const href = a.getAttribute('href');
    if (href === here || (here === '' && href === 'index.html')) a.classList.add('active');
  });
})();

/* ---------- mobile nav toggle ---------- */
(() => {
  const burger = document.getElementById('navBurger');
  const links = document.getElementById('navLinks');
  const scrim = document.getElementById('navScrim');
  if (!burger || !links || !scrim) return;

  let open = false;

  function setOpen(next) {
    open = next;
    burger.classList.toggle('open', open);
    burger.setAttribute('aria-expanded', String(open));
    links.classList.toggle('open', open);
    scrim.classList.toggle('show', open);
    document.documentElement.style.overflow = open ? 'hidden' : '';
    if (open && window.gsap) {
      gsap.fromTo(
        links.querySelectorAll('a, .nav-cta'),
        { opacity: 0, y: -10 },
        { opacity: 1, y: 0, duration: .35, stagger: .045, ease: 'power3.out' }
      );
    }
  }

  burger.addEventListener('click', () => setOpen(!open));
  scrim.addEventListener('click', () => setOpen(false));
  links.querySelectorAll('a, .nav-cta').forEach(el => el.addEventListener('click', () => setOpen(false)));
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && open) setOpen(false); });
  window.addEventListener('resize', () => { if (open && window.innerWidth > 768) setOpen(false); });
})();

/* ---------- uptime bar chart (status.html) ---------- */
(() => {
  const el = document.getElementById('uptimeBars');
  if (!el) return;
  const days = 60;
  for (let i = 0; i < days; i++) {
    const bar = document.createElement('i');
    const low = Math.random() < 0.04;
    bar.style.height = low ? (40 + Math.random() * 30) + '%' : (86 + Math.random() * 14) + '%';
    if (low) bar.classList.add('low');
    bar.title = low ? 'Degraded performance' : 'Fully operational';
    el.appendChild(bar);
  }
})();

/* ---------- toast system ---------- */
function toast(msg, d = 3500) {
  const wrap = document.getElementById('toasts');
  const t = document.createElement('div');
  t.className = 'tst';
  t.textContent = msg;
  wrap.appendChild(t);
  requestAnimationFrame(() => t.classList.add('in'));
  setTimeout(() => {
    t.classList.remove('in');
    setTimeout(() => t.remove(), 300);
  }, d);
}
document.querySelectorAll('[data-toast]').forEach(el => {
  el.addEventListener('click', () => toast(el.dataset.toast, parseInt(el.dataset.toastMs || '3500', 10)));
});

/* ---------- scroll progress bar (rAF-throttled, GPU transform, cached layout) ---------- */
(() => {
  const prog = document.getElementById('prog');
  if (!prog) return;
  let maxScroll = 0, ticking = false;
  const measure = () => { maxScroll = document.documentElement.scrollHeight - innerHeight; };
  const update = () => {
    ticking = false;
    const p = maxScroll > 0 ? scrollY / maxScroll : 0;
    prog.style.transform = 'scaleX(' + Math.min(Math.max(p, 0), 1) + ')';
  };
  measure();
  update();
  window.addEventListener('load', measure);
  window.addEventListener('resize', measure, { passive: true });
  window.addEventListener('scroll', () => {
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
  }, { passive: true });
})();

/* ---------- suspend expensive backdrop-filter blur while scrolling ---------- */
(() => {
  const body = document.body;
  let scrollTimer = 0;
  window.addEventListener('scroll', () => {
    if (!body.classList.contains('is-scrolling')) body.classList.add('is-scrolling');
    clearTimeout(scrollTimer);
    scrollTimer = setTimeout(() => body.classList.remove('is-scrolling'), 160);
  }, { passive: true });
})();

/* ---------- boot log terminal ---------- */
(() => {
  const el = document.getElementById('bootLog');
  if (!el) return;
  const lines = [
    { tag: 'OK', cls: 'tag--ok', text: 'mounted /infra … 3 clouds detected' },
    { tag: 'OK', cls: 'tag--ok', text: 'aes-256 keystore unlocked' },
    { tag: 'INFO', cls: 'tag--info', text: 'routing tables synced · 12 regions' },
    { tag: 'OK', cls: 'tag--ok', text: 'ai orchestration daemon started' },
    { tag: 'WARN', cls: 'tag--warn', text: 'sandbox review queue: 1 pending' },
    { tag: 'OK', cls: 'tag--ok', text: 'api gateway listening on :443' },
    { tag: 'OK', cls: 'tag--ok', text: 'cloud iNIT ready — welcome back' },
  ];
  let i = 0;
  function typeLine() {
    if (i >= lines.length) {
      const cursor = document.createElement('span');
      cursor.className = 'boot-cursor';
      el.appendChild(cursor);
      return;
    }
    const { tag, cls, text } = lines[i];
    const row = document.createElement('div');
    row.className = 'boot-line';
    const stamp = document.createElement('span');
    stamp.className = 'dim';
    const t = new Date();
    stamp.textContent = `[${t.toTimeString().slice(0, 8)}] `;
    const tagEl = document.createElement('span');
    tagEl.className = 'tag ' + cls;
    tagEl.textContent = `[ ${tag} ]`;
    const rest = document.createElement('span');
    row.appendChild(stamp);
    row.appendChild(tagEl);
    row.appendChild(rest);
    el.appendChild(row);
    gsap.to(row, { opacity: 1, duration: .25 });

    let c = 0;
    const iv = setInterval(() => {
      rest.textContent = ' ' + text.slice(0, c);
      c++;
      if (c > text.length) {
        clearInterval(iv);
        i++;
        setTimeout(typeLine, 220);
      }
    }, 14);
  }
  setTimeout(typeLine, 900);
})();

/* ---------- hero typing tagline already static; cloud switch cycle ---------- */
(() => {
  const items = document.querySelectorAll('#cloudList li');
  if (!items.length) return;
  let idx = 0;
  setInterval(() => {
    items.forEach(li => li.classList.remove('on'));
    idx = (idx + 1) % items.length;
    items[idx].classList.add('on');
  }, 2600);
})();

/* ---------- three.js hero background (grid + node globe + rising particles) ---------- */
(function () {
  const canvas = document.getElementById('hero-canvas');
  if (!canvas || typeof THREE === 'undefined') return;
  const isMobile = window.innerWidth < 768;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setClearColor(0x000000, 0);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 1000);
  camera.position.set(0, 6, 30);

  function resize() {
    const w = canvas.parentElement.clientWidth;
    const h = canvas.parentElement.clientHeight;
    renderer.setSize(w, h, false);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2));
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener('resize', resize);

  const density = isMobile ? 0.55 : 1;
  const colOk = 0x38e1ff, colInfo = 0x8b7bff;

  const gridSize = 70, gridSeg = isMobile ? 24 : 40;
  const waveGeo = new THREE.PlaneGeometry(gridSize, gridSize * 0.75, gridSeg, Math.round(gridSeg * 0.75));
  waveGeo.rotateX(-Math.PI / 2.35);
  const waveMat = new THREE.MeshBasicMaterial({ color: colOk, wireframe: true, transparent: true, opacity: 0.10 });
  const waveMesh = new THREE.Mesh(waveGeo, waveMat);
  waveMesh.position.set(0, -9, -6);
  scene.add(waveMesh);
  const waveBasePos = waveGeo.attributes.position.array.slice();

  const globeGroup = new THREE.Group();
  scene.add(globeGroup);
  const icoGeo = new THREE.IcosahedronGeometry(8.5, 1);
  const edgesGeo = new THREE.EdgesGeometry(icoGeo);
  const edgesMat = new THREE.LineBasicMaterial({ color: colInfo, transparent: true, opacity: 0.14 });
  globeGroup.add(new THREE.LineSegments(edgesGeo, edgesMat));
  const nodeMat = new THREE.PointsMaterial({ color: colOk, size: 0.32, transparent: true, opacity: 0.7, sizeAttenuation: true });
  globeGroup.add(new THREE.Points(icoGeo, nodeMat));
  globeGroup.position.set(0, 2, -4);

  const dataCount = Math.round((isMobile ? 80 : 150) * density);
  const dataGeo = new THREE.BufferGeometry();
  const dataPos = new Float32Array(dataCount * 3);
  const dataSpeed = new Float32Array(dataCount);
  for (let i = 0; i < dataCount; i++) {
    dataPos[i * 3] = (Math.random() - 0.5) * 54;
    dataPos[i * 3 + 1] = (Math.random() - 0.5) * 30;
    dataPos[i * 3 + 2] = (Math.random() - 0.5) * 22 - 4;
    dataSpeed[i] = 0.014 + Math.random() * 0.028;
  }
  dataGeo.setAttribute('position', new THREE.BufferAttribute(dataPos, 3));
  const dataMat = new THREE.PointsMaterial({ color: colInfo, size: 0.13, transparent: true, opacity: 0.38, sizeAttenuation: true });
  const dataPts = new THREE.Points(dataGeo, dataMat);
  scene.add(dataPts);

  let mx = 0, my = 0;
  document.addEventListener('mousemove', e => {
    mx = (e.clientX / window.innerWidth - 0.5) * 2;
    my = (e.clientY / window.innerHeight - 0.5) * 2;
  }, { passive: true });

  let t = 0;
  const posAttr = waveGeo.attributes.position;
  (function animate() {
    requestAnimationFrame(animate);
    t += 0.008;
    camera.position.x += (mx * 3 - camera.position.x) * 0.04;
    camera.position.y += (6 - my * 2 - camera.position.y) * 0.04;
    camera.lookAt(0, 1, -4);

    const arr = posAttr.array;
    for (let i = 0; i < arr.length; i += 3) {
      const x = waveBasePos[i], z = waveBasePos[i + 2];
      arr[i + 1] = Math.sin(x * 0.18 + t) * 0.9 + Math.cos(z * 0.22 + t * 0.8) * 0.7;
    }
    posAttr.needsUpdate = true;

    globeGroup.rotation.y += 0.0018;
    globeGroup.rotation.x = Math.sin(t * 0.2) * 0.08;

    const dp = dataPts.geometry.attributes.position.array;
    for (let i = 0; i < dataCount; i++) {
      dp[i * 3 + 1] += dataSpeed[i];
      if (dp[i * 3 + 1] > 18) dp[i * 3 + 1] = -18;
    }
    dataPts.geometry.attributes.position.needsUpdate = true;

    renderer.render(scene, camera);
  })();
})();

/* ---------- boot stages data ---------- */
const stages = [
  { title: 'Provision the <em>base image</em>', desc: 'Spin up a clean console the moment you sign in — no setup wizard, no dependency hunt. It boots the same way for a solo student as it does for a ten-person team.', gif: 'https://media.tenor.com/kdfWfHvqvy0AAAAj/utya-utya-duck.gif' },
  { title: 'Unlock the <em>keystore</em>', desc: 'Every credential is issued, rotated, and revoked through the Cloud iNIT Database — hardened storage with encryption at rest and erasure on request.', gif: 'https://c.tenor.com/jIY5ocmDN38AAAAC/tenor.gif' },
  { title: 'Start the <em>orchestration daemon</em>', desc: 'A network of AI-managed services watches routine tasks, validates changes, and re-routes around failures before you notice them.', gif: 'https://c.tenor.com/N45ON07E7mAAAAAC/tenor.gif' },
  { title: 'Sync the <em>routing table</em>', desc: 'A globally distributed edge with intelligent routing keeps latency under five milliseconds — wherever your users boot up from.', gif: 'https://media.tenor.com/TeM5g2MK6BEAAAAj/kaczka-duck.gif' },
  { title: 'Mount <em>elastic capacity</em>', desc: 'Scale a workload up or down mid-session with zero downtime and no environment swap — the sandbox just grows with you.', gif: 'https://media.tenor.com/FZR_GXmf-tcAAAAj/kaczka-duck.gif' },
  { title: 'Expose the <em>API surface</em>', desc: 'Every internal service is reachable through one open, documented API — build, integrate, and extend without touching the core.', gif: 'https://c.tenor.com/hhF-qFh-IMIAAAAd/tenor.gif' },
  { title: 'Harden every <em>layer</em>', desc: 'Strong encryption, layered authentication, and audited access sit under every request the platform serves — by default, not by upgrade.', gif: 'https://media1.tenor.com/m/eO5kL5ONh0IAAAAd/cxyduck-cxydck.gif' },
  { title: 'Apply the <em>monthly patch</em>', desc: 'Scheduled releases ship database hardening, performance tuning, and interface fixes automatically, so the platform you signed into stays the one you trust.', gif: 'https://media.tenor.com/qYMVanBDxI8AAAAi/utya-telegram.gif' },
  { title: 'Hand off to the <em>sandbox</em>', desc: 'Boot finishes into a live environment: free online sandboxes after a short review, or an offline build with everything — including 24/7 access for qualifying users — unlocked immediately.', gif: 'https://media.tenor.com/yU7NPQwMCQEAAAAM/utya-utya-duck.gif' },
];

const stickyTrack = document.getElementById('stickyTrack');
const stageCard = document.getElementById('stageCard');
const sdots = document.querySelectorAll('#sideDots .sdot');
const sideDotsEl = document.getElementById('sideDots');
let curStage = -1;
let stageTicking = false;

function showStage(i) {
  if (!stageCard || i === curStage) return;
  curStage = i;
  const s = stages[i];
  stageCard.classList.remove('show');
  setTimeout(() => {
    document.getElementById('fi-num').textContent = `PID ${String(i + 1).padStart(2, '0')} · stage ${String(i + 1).padStart(2, '0')}/09`;
    document.getElementById('fi-title').innerHTML = s.title;
    document.getElementById('fi-desc').textContent = s.desc;
    document.getElementById('fi-img').src = s.gif;
    document.getElementById('bgIndexNum').textContent = (i + 1 < 10 ? '0' : '') + (i + 1);
    stageCard.classList.add('show');
  }, 200);
  sdots.forEach((d, j) => d.classList.toggle('on', j === i));
}

function onScroll() {
  if (!stickyTrack) return;
  const rect = stickyTrack.getBoundingClientRect();
  const total = stickyTrack.offsetHeight - innerHeight;
  const scrolled = Math.max(0, -rect.top);
  const progress = Math.min(1, scrolled / total);
  const idx = Math.min(stages.length - 1, Math.floor(progress * stages.length));
  const inSticky = rect.top <= 0 && rect.bottom >= innerHeight;
  sideDotsEl.classList.toggle('vis', inSticky);
  if (inSticky) showStage(idx);
}
window.addEventListener('scroll', () => {
  if (stageTicking) return;
  stageTicking = true;
  requestAnimationFrame(() => { stageTicking = false; onScroll(); });
}, { passive: true });
showStage(0);

sdots.forEach(d => {
  d.addEventListener('click', () => {
    const i = parseInt(d.dataset.i, 10);
    const total = stickyTrack.offsetHeight - innerHeight;
    window.scrollTo({ top: stickyTrack.offsetTop + (i / stages.length) * total, behavior: 'smooth' });
  });
});

document.addEventListener('mousemove', e => {
  if (!stageCard || !stageCard.classList.contains('show')) return;
  const dx = (e.clientX / innerWidth - 0.5) * 12;
  const dy = (e.clientY / innerHeight - 0.5) * 7;
  gsap.to(stageCard, { rotateY: dx, rotateX: -dy, duration: .6, ease: 'power3.out', overwrite: 'auto' });
}, { passive: true });

/* ---------- download flow ----------
   The inline batch generator, the Online/Offline reveal toggle and the platform
   auto-detect UI all lived here. They built the download options client-side
   into #pc-batches / #mac-batches and filtered #dlGrid by detected OS.

   That is now a real page tree under download/, generated by
   scripts/gen_download.py — batch, then build, then platform, each with its own
   URL. The markup those blocks targeted no longer exists, so they have been
   removed rather than left to no-op on every page load.

   To change an installer URL or add a window, edit scripts/gen_download.py and
   re-run it, then commit the regenerated pages. Installers are served straight
   from the storage bucket, so the URLs in DOWNLOADS are the source of truth. */

/* ---------- GSAP motion system ---------- */
gsap.registerPlugin(ScrollTrigger);

if (document.querySelector('.hero-badge')) {
  gsap.timeline({ defaults: { ease: 'power3.out' } })
    .from('.hero-badge', { opacity: 0, y: -16, scale: .92, duration: .7 })
    .from('.hero-c', { opacity: 0, y: 24, duration: .55 }, '-=.35')
    .from('.hero-rest', { xPercent: -100, opacity: 0, duration: .9, ease: 'power4.out' }, '-=.15')
    .fromTo('.hero-tag',
        { opacity: 0, y: 10, filter: 'blur(16px)' },
        { opacity: 1, y: 0, filter: 'blur(0px)', duration: 1.5, ease: 'power2.out' },
        '-=.5')
    .from('.hero-btns > *', { opacity: 0, y: 16, scale: .95, duration: .55, stagger: .1 }, '-=.9')
    .from('.pill', { opacity: 0, y: 14, duration: .5, stagger: .06 }, '-=.35')
    .from('.terminal', { opacity: 0, y: 24, scale: .97, duration: .8 }, '-=.7')
    .from('.scroll-cue', { opacity: 0, duration: .6 }, '-=.2')
    .from('.hero-orb', { opacity: 0, scale: .5, duration: 1.4, stagger: .15, ease: 'power2.out' }, 0);
}

/* page-head fade-in for sub-pages (no hero terminal) */
if (document.querySelector('.page-head')) {
  gsap.from('.page-head > *', { opacity: 0, y: 22, duration: .7, stagger: .1, ease: 'power3.out' });
}

ScrollTrigger.create({
  start: 'top -60', end: 99999,
  toggleClass: { targets: 'nav', className: 'nav-scrolled' }
});

if (document.querySelector('.about-row')) {
  gsap.from('.about-text > *', {
    scrollTrigger: { trigger: '.about-row', start: 'top 78%' },
    opacity: 0, y: 30, duration: .8, stagger: .1, ease: 'power3.out'
  });
  gsap.from('.about-panel', {
    scrollTrigger: { trigger: '.about-row', start: 'top 75%' },
    opacity: 0, scale: .93, duration: .9, ease: 'back.out(1.4)'
  });
}

if (document.querySelector('.principle-card')) {
  gsap.from('.principle-card', {
    scrollTrigger: { trigger: '.principle-grid', start: 'top 82%' },
    opacity: 0, y: 24, duration: .6, stagger: .1, ease: 'power3.out'
  });
}

if (document.querySelector('.teaser-card')) {
  gsap.from('.teaser-card', {
    scrollTrigger: { trigger: '.teaser-grid', start: 'top 88%' },
    opacity: 0, y: 26, duration: .6, stagger: .09, ease: 'power3.out'
  });
}

if (document.querySelector('.feat-intro')) {
  gsap.from('.feat-intro > *', {
    scrollTrigger: { trigger: '.feat-intro', start: 'top 82%' },
    opacity: 0, y: 24, duration: .7, stagger: .1, ease: 'power3.out'
  });
}

if (document.querySelector('.stats-grid')) {
  gsap.from('.stat-cell', {
    scrollTrigger: { trigger: '.stats-grid', start: 'top 82%' },
    opacity: 0, y: 22, scale: .95, duration: .6, stagger: .08, ease: 'back.out(1.6)'
  });
}
if (document.querySelector('[data-val]')) {
  ScrollTrigger.create({
    trigger: '.stats-grid', start: 'top 82%', once: true,
    onEnter: () => {
      document.querySelectorAll('[data-val]').forEach(el => {
        const target = parseFloat(el.dataset.val);
        const suffix = el.dataset.suffix ?? '';
        const obj = { v: 0 };
        gsap.to(obj, {
          v: target, duration: 1.6, ease: 'power2.out',
          onUpdate: () => { el.textContent = obj.v.toFixed(target % 1 !== 0 ? 1 : 0) + suffix; }
        });
      });
    }
  });
}

if (document.querySelector('.region-grid')) {
  gsap.from('.region-cell', {
    scrollTrigger: { trigger: '.region-grid', start: 'top 85%' },
    opacity: 0, y: 18, duration: .5, stagger: .06, ease: 'power3.out'
  });
}
if (document.querySelector('.uptime-bars')) {
  gsap.from('.uptime-bars i', {
    scrollTrigger: { trigger: '.uptime-block', start: 'top 85%' },
    scaleY: 0, transformOrigin: 'bottom', duration: .5, stagger: .01, ease: 'power2.out'
  });
}
if (document.querySelector('.incident-row')) {
  gsap.from('.incident-row', {
    scrollTrigger: { trigger: '.incident-log', start: 'top 88%' },
    opacity: 0, x: -14, duration: .5, stagger: .08, ease: 'power3.out'
  });
}

if (document.querySelector('.req-table')) {
  gsap.from('.req-table tr', {
    scrollTrigger: { trigger: '.req-table', start: 'top 85%' },
    opacity: 0, y: 12, duration: .4, stagger: .06, ease: 'power3.out'
  });
}

if (document.querySelector('.dl-wrap')) {
  gsap.from('.dl-wrap > .eyebrow, .dl-wrap > h1, .dl-wrap > h2, .dl-wrap > .sub', {
    scrollTrigger: { trigger: '.dl-wrap', start: 'top 85%' },
    opacity: 0, y: 22, duration: .7, stagger: .1, ease: 'power3.out'
  });
  gsap.utils.toArray('.dl-card').forEach(card => {
    ScrollTrigger.create({ trigger: card, start: 'top 88%', onEnter: () => card.classList.add('show') });
  });
}

if (document.querySelector('.cta-banner')) {
  gsap.from('.cta-banner-inner', {
    scrollTrigger: { trigger: '.cta-banner', start: 'top 85%' },
    opacity: 0, y: 26, duration: .7, ease: 'power3.out'
  });
}

gsap.from('footer > *', {
  scrollTrigger: { trigger: 'footer', start: 'top 92%' },
  opacity: 0, y: 18, duration: .6, stagger: .08, ease: 'power3.out'
});

/* micro-interactions
   Button, icon-button and magnetic behaviour moved to buttons.js — it owns the
   layered transform model so hover-lift and magnetic-pull no longer both write
   `y` on the same element. */
document.querySelectorAll('.dl-card').forEach(card => {
  card.addEventListener('mouseenter', () => gsap.to(card, { y: -6, duration: .45, ease: 'power3.out' }));
  card.addEventListener('mouseleave', () => gsap.to(card, { y: 0, duration: .45, ease: 'power3.out' }));
});

/* profile button — entrance pop + click ripple */
const navProfileBtn = document.querySelector('.nav-profile-btn');
if (navProfileBtn) {
  gsap.from(navProfileBtn, { opacity: 0, scale: .4, duration: .7, delay: .5, ease: 'back.out(2.4)', clearProps: 'transform' });
  navProfileBtn.addEventListener('click', e => {
    const ripple = document.createElement('span');
    ripple.style.cssText = 'position:absolute;inset:0;border-radius:50%;background:radial-gradient(circle,rgba(139,108,240,.45),transparent 70%);pointer-events:none;';
    navProfileBtn.appendChild(ripple);
    gsap.fromTo(ripple, { scale: .2, opacity: 1 }, { scale: 1.8, opacity: 0, duration: .6, ease: 'power2.out', onComplete: () => ripple.remove() });
    gsap.to(navProfileBtn, { rotate: '+=360', duration: .6, ease: 'power3.inOut', onComplete: () => gsap.set(navProfileBtn, { rotate: 0 }) });
  });
}

/* trailing cursor glow */
const cursorGlow = document.getElementById('cursorGlow');
if (cursorGlow && matchMedia('(pointer:fine)').matches) {
  const glowX = gsap.quickTo(cursorGlow, 'x', { duration: .6, ease: 'power3.out' });
  const glowY = gsap.quickTo(cursorGlow, 'y', { duration: .6, ease: 'power3.out' });
  window.addEventListener('mousemove', e => { glowX(e.clientX); glowY(e.clientY); }, { passive: true });
}

/* cursor-tracked glass shine */
document.querySelectorAll('.glass-shine').forEach(el => {
  el.addEventListener('mousemove', e => {
    const r = el.getBoundingClientRect();
    el.style.setProperty('--mx', ((e.clientX - r.left) / r.width * 100) + '%');
    el.style.setProperty('--my', ((e.clientY - r.top) / r.height * 100) + '%');
  }, { passive: true });
});

/* magnetic pull — see buttons.js (opt in with data-fx="magnetic") */

/* hero parallax orbs */
if (matchMedia('(pointer:fine)').matches) {
  const orbs = gsap.utils.toArray('.hero-orb');
  window.addEventListener('mousemove', e => {
    const cx = (e.clientX / innerWidth - .5);
    const cy = (e.clientY / innerHeight - .5);
    orbs.forEach((orb, i) => {
      const depth = (i + 1) * 20;
      gsap.to(orb, { x: cx * depth, y: cy * depth, duration: 1, ease: 'power2.out' });
    });
  }, { passive: true });
}

/* welcome toasts — page-aware */
if (document.querySelector('.stage-card')) {
  setTimeout(() => toast('Scroll to walk through the boot sequence', 4200), 1600);
}
if (document.querySelector('.dlx-board')) {
  setTimeout(() => toast('Check the Windows / macOS support rules before you pick a window', 6800), 2200);
}
