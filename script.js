/* ==========================================================================
   Cloud iNIT — behavior
   ========================================================================== */

/* ---------- nav active state ---------- */
(() => {
  const here = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-links a[href]').forEach(a => {
    const href = a.getAttribute('href');
    if (href === here || (here === '' && href === 'index.html')) a.classList.add('active');
  });
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

/* ---------- scroll progress bar ---------- */
window.addEventListener('scroll', () => {
  const p = scrollY / (document.body.scrollHeight - innerHeight) * 100;
  document.getElementById('prog').style.width = Math.min(p, 100) + '%';
}, { passive: true });

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
  const colOk = 0x4ee6a0, colInfo = 0x6fd3ff;

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
window.addEventListener('scroll', onScroll, { passive: true });
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

/* ---------- download batches ---------- */
const batches = [{ label: '7:30 AM', id: '730' }, { label: '9:00 AM', id: '900' }, { label: '10:30 AM', id: '1030' }];
const platforms = { 'pc-batches': { suffix: 'pc' }, 'mac-batches': { suffix: '' } };
Object.entries(platforms).forEach(([cid, plat]) => {
  const container = document.getElementById(cid);
  if (!container) return;
  batches.forEach(b => {
    const block = document.createElement('div');
    block.className = 'batch-block';
    const key = plat.suffix || 'mac';
    const onId = `r-${key}-${b.id}-on`, offId = `r-${key}-${b.id}-off`;
    const onH = `https://github.com/CloudTechDevOps/CloudTechDevOps/releases/tag/${b.id}online${plat.suffix}`;
    const offH = `https://github.com/CloudTechDevOps/CloudTechDevOps/releases/tag/${b.id}offline${plat.suffix}`;
    block.innerHTML = `
      <div class="batch-head">RELEASE WINDOW · ${b.label}</div>
      <div class="batch-row">
        <button class="btn-tog btn-online" type="button" data-target="${onId}">Online</button>
        <button class="btn-tog btn-offline" type="button" data-target="${offId}">Offline</button>
      </div>
      <div class="reveal" id="${onId}"><a class="dl-link" href="${onH}" target="_blank" rel="noopener">Download from GitHub →</a></div>
      <div class="reveal" id="${offId}"><a class="dl-link" href="${offH}" target="_blank" rel="noopener">Download from GitHub →</a></div>
    `;
    container.appendChild(block);
  });
});
document.addEventListener('click', e => {
  const btn = e.target.closest('.btn-tog');
  if (!btn) return;
  const id = btn.dataset.target;
  const panel = document.getElementById(id);
  if (!panel) return;
  const open = panel.classList.contains('open');
  const block = btn.closest('.batch-block');
  block.querySelectorAll('.reveal').forEach(x => x.classList.remove('open'));
  block.querySelectorAll('.btn-tog').forEach(x => x.classList.remove('on'));
  if (!open) { panel.classList.add('open'); btn.classList.add('on'); }
});

/* ---------- auto-detect device platform ---------- */
(function () {
  const detectWrap = document.getElementById('dlDetect');
  const grid = document.getElementById('dlGrid');
  if (!detectWrap || !grid) return;

  function detectPlatform() {
    const uaData = navigator.userAgentData;
    const platformStr = (uaData && uaData.platform ? uaData.platform : (navigator.platform || '')).toLowerCase();
    const ua = navigator.userAgent.toLowerCase();

    if (platformStr.includes('mac') || ua.includes('mac os') || ua.includes('macintosh')) {
      // iPadOS 13+ reports as Mac but has touch support — treat as unknown/mobile
      if (navigator.maxTouchPoints > 1 && !ua.includes('macintosh os x 10_')) return 'unknown';
      return 'mac';
    }
    if (platformStr.includes('win') || ua.includes('windows')) return 'pc';
    return 'unknown';
  }

  const detected = detectPlatform();
  const cardPc = document.getElementById('dlpc');
  const cardMac = document.getElementById('dlmac');
  const tag = document.getElementById('dlDetectTag');
  const tagLabel = document.getElementById('dlDetectLabel');
  const toggle = document.getElementById('dlDetectToggle');
  let filtered = detected !== 'unknown';
  let firstRun = true;

  function showCard(card, show) {
    if (show) {
      card.classList.remove('dl-card--hidden');
      gsap.fromTo(card, { opacity: 0, y: 18, scale: .96 }, { opacity: 1, y: 0, scale: 1, duration: .55, ease: 'back.out(1.7)' });
    } else {
      gsap.to(card, { opacity: 0, y: 12, scale: .96, duration: .3, ease: 'power2.in', onComplete: () => card.classList.add('dl-card--hidden') });
    }
  }

  function applyFilter() {
    const showPc = !filtered || detected === 'pc';
    const showMac = !filtered || detected === 'mac';

    if (firstRun) {
      cardPc.classList.toggle('dl-card--hidden', !showPc);
      cardMac.classList.toggle('dl-card--hidden', !showMac);
    } else {
      showCard(cardPc, showPc);
      showCard(cardMac, showMac);
    }
    grid.classList.toggle('dl-grid--single', filtered && detected !== 'unknown');

    const label = detected === 'unknown' ? 'could not auto-detect your OS' : `detected · ${detected === 'mac' ? 'macOS' : 'Windows'}`;
    gsap.to(tag, {
      opacity: 0, y: -4, duration: .18, ease: 'power2.in', onComplete: () => {
        tagLabel.textContent = label;
        toggle.textContent = filtered ? 'show all platforms' : 'show only my platform';
        gsap.to(tag, { opacity: 1, y: 0, duration: .3, ease: 'power3.out' });
      }
    });
    firstRun = false;
  }

  if (detected !== 'unknown') {
    detectWrap.style.display = 'flex';
    gsap.from(detectWrap, { opacity: 0, y: -10, duration: .6, delay: .3, ease: 'power3.out' });
    applyFilter();
    toggle.addEventListener('click', () => { filtered = !filtered; applyFilter(); });
  } else {
    detectWrap.style.display = 'flex';
    filtered = false;
    applyFilter();
    toggle.style.display = 'none';
  }
})();

/* ---------- GSAP motion system ---------- */
gsap.registerPlugin(ScrollTrigger);

if (document.querySelector('.hero-badge')) {
  gsap.timeline({ defaults: { ease: 'power3.out' } })
    .from('.hero-badge', { opacity: 0, y: -16, scale: .92, duration: .7 })
    .from('.hero h1', { opacity: 0, y: 30, duration: .8 }, '-=.35')
    .from('.hero-tag', { opacity: 0, y: 16, duration: .7 }, '-=.5')
    .from('.hero-btns > *', { opacity: 0, y: 16, scale: .95, duration: .55, stagger: .1 }, '-=.4')
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

/* micro-interactions */
document.querySelectorAll('.btn-primary, .btn-ghost, .nav-cta').forEach(btn => {
  btn.addEventListener('mouseenter', () => gsap.to(btn, { scale: 1.04, y: -3, duration: .35, ease: 'power3.out' }));
  btn.addEventListener('mouseleave', () => gsap.to(btn, { scale: 1, y: 0, duration: .4, ease: 'power3.out' }));
});
document.querySelectorAll('.dl-card').forEach(card => {
  card.addEventListener('mouseenter', () => gsap.to(card, { y: -6, duration: .45, ease: 'power3.out' }));
  card.addEventListener('mouseleave', () => gsap.to(card, { y: 0, duration: .45, ease: 'power3.out' }));
});
document.querySelectorAll('.icon-btn').forEach(btn => {
  const tip = btn.querySelector('.icon-tip');
  btn.addEventListener('mouseenter', () => {
    gsap.to(btn, { scale: 1.08, y: -2, duration: .35, ease: 'back.out(2)' });
    gsap.to(tip, { opacity: 1, y: 0, duration: .3, ease: 'power3.out' });
  });
  btn.addEventListener('mouseleave', () => {
    gsap.to(btn, { scale: 1, y: 0, duration: .35, ease: 'power3.out' });
    gsap.to(tip, { opacity: 0, y: 6, duration: .25, ease: 'power2.in' });
  });
});

/* profile button — entrance pop + click ripple */
const navProfileBtn = document.querySelector('.nav-profile-btn');
if (navProfileBtn) {
  gsap.from(navProfileBtn, { opacity: 0, scale: .4, rotate: -60, duration: .7, delay: .5, ease: 'back.out(2.4)' });
  navProfileBtn.addEventListener('click', e => {
    const ripple = document.createElement('span');
    ripple.style.cssText = 'position:absolute;inset:0;border-radius:50%;background:radial-gradient(circle,rgba(78,230,160,.55),transparent 70%);pointer-events:none;';
    navProfileBtn.appendChild(ripple);
    gsap.fromTo(ripple, { scale: .2, opacity: 1 }, { scale: 1.8, opacity: 0, duration: .6, ease: 'power2.out', onComplete: () => ripple.remove() });
    gsap.to(navProfileBtn, { rotate: '+=360', duration: .6, ease: 'power3.inOut' });
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

/* magnetic pull */
if (matchMedia('(pointer:fine)').matches) {
  document.querySelectorAll('.magnetic').forEach(el => {
    const strength = el.classList.contains('icon-btn') ? .5 : .3;
    el.addEventListener('mousemove', e => {
      const r = el.getBoundingClientRect();
      const relX = e.clientX - (r.left + r.width / 2);
      const relY = e.clientY - (r.top + r.height / 2);
      gsap.to(el, { x: relX * strength, y: relY * strength, duration: .4, ease: 'power3.out' });
    }, { passive: true });
    el.addEventListener('mouseleave', () => {
      gsap.to(el, { x: 0, y: 0, duration: .6, ease: 'elastic.out(1,.4)' });
    });
  });
}

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
if (document.querySelector('.batch-row') || document.getElementById('pc-batches')) {
  setTimeout(() => toast('Pick Online or Offline to reveal a download link', 6800), 2200);
}
