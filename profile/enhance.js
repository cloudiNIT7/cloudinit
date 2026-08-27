/* ==========================================================================
   Cloud iNIT · profile — shared enhancements
   Smooth-scroll performance + consistent behaviour across every profile page.
   Loaded with `defer`, so the DOM is ready when this runs.
   ========================================================================== */
(function () {
  'use strict';

  var body = document.body;

  /* 1) Suspend costly backdrop-filter blur while the page is actively scrolling.
        A short timeout restores it once scrolling settles. */
  var scrollTimer = 0;
  window.addEventListener('scroll', function () {
    if (!body.classList.contains('is-scrolling')) body.classList.add('is-scrolling');
    clearTimeout(scrollTimer);
    scrollTimer = setTimeout(function () { body.classList.remove('is-scrolling'); }, 160);
  }, { passive: true });

  /* 2) Scroll progress bar → GPU transform, rAF-throttled, cached page height.
        (Replaces the old per-event `width` writes that thrashed layout.) */
  var bar = document.getElementById('progressBar');
  if (bar) {
    var maxScroll = 0, ticking = false;
    var measure = function () {
      maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    };
    var update = function () {
      ticking = false;
      var p = maxScroll > 0 ? window.scrollY / maxScroll : 0;
      bar.style.transform = 'scaleX(' + Math.min(Math.max(p, 0), 1) + ')';
    };
    measure();
    update();
    window.addEventListener('load', measure);
    window.addEventListener('resize', measure, { passive: true });
    window.addEventListener('scroll', function () {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }, { passive: true });
  }

  /* 3) Nav shrink-on-scroll (index.html #siteNav) → rAF-throttled.
        Only adjusts padding on wide screens so mobile keeps its CSS padding. */
  var siteNav = document.getElementById('siteNav');
  if (siteNav) {
    var navTicking = false;
    var navUpdate = function () {
      navTicking = false;
      if (window.innerWidth > 810) {
        siteNav.style.padding = window.scrollY > 40 ? '14px 64px' : '22px 64px';
      } else {
        siteNav.style.padding = '';
      }
    };
    navUpdate();
    window.addEventListener('resize', function () {
      if (!navTicking) { navTicking = true; requestAnimationFrame(navUpdate); }
    }, { passive: true });
    window.addEventListener('scroll', function () {
      if (!navTicking) { navTicking = true; requestAnimationFrame(navUpdate); }
    }, { passive: true });
  }
})();
