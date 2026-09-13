/* =============================================================================
   Alamo Primary Care — prototype interactions
   GSAP 3.13 + ScrollTrigger + Lenis. Append ?static=1 to any URL to freeze all
   motion (used for design review and screenshot capture).
   ========================================================================== */
(function () {
  'use strict';

  var html = document.documentElement;
  var forcedStatic = /[?&]static=1/.test(location.search);
  var prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var still = forcedStatic || prefersReduced;
  if (still) html.setAttribute('data-static', '');

  var hasGSAP = typeof window.gsap !== 'undefined';
  var gsap = window.gsap;
  var ScrollTrigger = window.ScrollTrigger;
  if (hasGSAP && ScrollTrigger) gsap.registerPlugin(ScrollTrigger);

  /* ---------------------------------------------------------------- drawer */
  (function drawer() {
    var el = document.getElementById('drawer');
    if (!el) return;
    var openers = document.querySelectorAll('[data-drawer-open]');
    var closers = el.querySelectorAll('[data-drawer-close]');
    var lastFocus = null;

    function open() {
      lastFocus = document.activeElement;
      el.classList.add('is-open');
      document.body.style.overflow = 'hidden';
      openers.forEach(function (b) { b.setAttribute('aria-expanded', 'true'); });
      var first = el.querySelector('.drawer__close');
      if (first) first.focus();
    }
    function close() {
      el.classList.remove('is-open');
      document.body.style.overflow = '';
      openers.forEach(function (b) { b.setAttribute('aria-expanded', 'false'); });
      if (lastFocus) lastFocus.focus();
    }
    openers.forEach(function (b) { b.addEventListener('click', open); });
    closers.forEach(function (b) { b.addEventListener('click', close); });
    el.querySelectorAll('a').forEach(function (a) { a.addEventListener('click', close); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && el.classList.contains('is-open')) close();
    });
  }());

  /* --------------------------------------------------------- sticky header */
  // Runs before the reduced-motion bail-out: the header must still gain its
  // stuck styling when all animation is switched off.
  (function stickyHeader() {
    var header = document.querySelector('.site-header--sticky');
    if (!header) return;
    var bar = document.querySelector('.topbar');
    var threshold = bar ? bar.offsetHeight : 8;
    var queued = false;

    function apply() {
      queued = false;
      header.classList.toggle('is-stuck', window.scrollY > threshold);
    }
    function onScroll() {
      if (queued) return;
      queued = true;
      requestAnimationFrame(apply);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', function () {
      threshold = bar ? bar.offsetHeight : 8;
      apply();
    });
    apply();
  }());

  /* ------------------------------------------------------------ mega menu */
  // One panel per header, opened by any trigger in that header. CSS owns the
  // open/close state so the panel still works without JS; this manages intent
  // (hover with a close delay, click, keyboard) and staggers the contents.
  (function megaMenu() {
    var scopes = Array.prototype.slice.call(document.querySelectorAll('[data-mega-scope]'));
    if (!scopes.length) return;
    var CLOSE_DELAY = 200;

    scopes.forEach(function (scope) {
      var panel = scope.querySelector('[data-mega]');
      var triggers = Array.prototype.slice.call(scope.querySelectorAll('[data-mega-trigger]'));
      if (!panel || !triggers.length) return;
      var timer = null;
      var hideTimer = null;
      // Escape returns focus to the trigger, whose focus handler would otherwise
      // reopen the panel straight away.
      var suppress = false;

      function close() {
        clearTimeout(timer);
        if (!scope.classList.contains('is-mega-open')) return;
        scope.classList.remove('is-mega-open');
        triggers.forEach(function (t) { t.setAttribute('aria-expanded', 'false'); });
        clearTimeout(hideTimer);
        hideTimer = setTimeout(function () {
          if (!scope.classList.contains('is-mega-open')) panel.hidden = true;
        }, 420);
      }

      function open() {
        if (suppress) return;
        clearTimeout(timer);
        clearTimeout(hideTimer);
        if (scope.classList.contains('is-mega-open')) return;
        panel.hidden = false;
        void panel.offsetWidth;           // flush layout so the transition runs
        scope.classList.add('is-mega-open');
        triggers.forEach(function (t) { t.setAttribute('aria-expanded', 'true'); });

        if (!still && hasGSAP) {
          var cols = panel.querySelectorAll('.mega__col');
          var items = panel.querySelectorAll('.mega__link, .mega__vert, .mega__loc');
          gsap.killTweensOf([cols, items]);
          gsap.fromTo(cols, { opacity: 0, y: 10 },
            { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out', stagger: 0.06, overwrite: true });
          gsap.fromTo(items, { opacity: 0, y: 6 },
            { opacity: 1, y: 0, duration: 0.34, ease: 'power2.out',
              stagger: 0.012, delay: 0.06, overwrite: true });
        }
      }

      function scheduleClose() {
        clearTimeout(timer);
        timer = setTimeout(close, CLOSE_DELAY);
      }

      triggers.forEach(function (t) {
        var group = t.closest('.has-mega') || t;
        group.addEventListener('mouseenter', open);
        group.addEventListener('mouseleave', scheduleClose);
        // touch and keyboard: the first activation opens, the second follows the link
        t.addEventListener('click', function (e) {
          if (!scope.classList.contains('is-mega-open')) { e.preventDefault(); open(); }
        });
        t.addEventListener('focus', open);
      });
      panel.addEventListener('mouseenter', function () { clearTimeout(timer); });
      panel.addEventListener('mouseleave', scheduleClose);

      scope.addEventListener('focusout', function (e) {
        if (!scope.contains(e.relatedTarget)) scheduleClose();
      });
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && scope.classList.contains('is-mega-open')) {
          suppress = true;
          close();
          triggers[0].focus();
          setTimeout(function () { suppress = false; }, 320);
        }
      });
      document.addEventListener('click', function (e) {
        if (!scope.contains(e.target)) close();
      });
    });
  }());

  /* ------------------------------------------------------------- carousel */
  (function carousel() {
    document.querySelectorAll('[data-carousel]').forEach(function (root) {
      var slides = Array.prototype.slice.call(root.querySelectorAll('[data-slide]'));
      if (slides.length < 2) return;
      var section = root.closest('section') || root;
      var dots = Array.prototype.slice.call(section.querySelectorAll('[data-car-dot]'));
      var i = 0;

      function show(next, dir) {
        next = (next + slides.length) % slides.length;
        if (next === i) return;
        var from = slides[i], to = slides[next];
        i = next;
        dots.forEach(function (d, k) {
          d.classList.toggle('is-on', k === i);
          d.setAttribute('aria-selected', k === i ? 'true' : 'false');
        });
        to.hidden = false;
        if (still || !hasGSAP) { from.hidden = true; return; }
        gsap.set(to, { position: 'absolute', inset: 0, opacity: 0, x: dir * 34 });
        gsap.to(from, { opacity: 0, x: -dir * 34, duration: 0.34, ease: 'power2.in' });
        gsap.to(to, {
          opacity: 1, x: 0, duration: 0.5, ease: 'power3.out', delay: 0.08,
          onComplete: function () {
            gsap.set(to, { clearProps: 'position,inset,opacity,x' });
            gsap.set(from, { clearProps: 'opacity,x' });
            from.hidden = true;
          }
        });
      }

      var prev = section.querySelector('[data-car-prev]');
      var next = section.querySelector('[data-car-next]');
      if (prev) prev.addEventListener('click', function () { show(i - 1, -1); });
      if (next) next.addEventListener('click', function () { show(i + 1, 1); });
      dots.forEach(function (d, k) {
        d.addEventListener('click', function () { show(k, k > i ? 1 : -1); });
      });
      root.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowRight') show(i + 1, 1);
        if (e.key === 'ArrowLeft') show(i - 1, -1);
      });
    });
  }());

  /* ------------------------------------------------------- anchor scrolling */
  var lenis = null;

  function jumpTo(target) {
    if (lenis) lenis.scrollTo(target, { offset: -90 });
    else target.scrollIntoView({ behavior: still ? 'auto' : 'smooth', block: 'start' });
  }
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href^="#"]');
    if (!a) return;
    var id = a.getAttribute('href');
    if (!id || id === '#') return;
    var t = document.querySelector(id);
    if (!t) return;
    e.preventDefault();
    jumpTo(t);
  });

  if (still || !hasGSAP || !ScrollTrigger) { unhideAll(); return; }

  /* ----------------------------------------------------------- smooth scroll */
  if (typeof window.Lenis !== 'undefined') {
    lenis = new window.Lenis({ duration: 1.05, smoothWheel: true, wheelMultiplier: 0.95 });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
    gsap.ticker.lagSmoothing(0);
  }

  /* ------------------------------------------------------- word splitting */
  // Splits on spaces/tabs/newlines only. JS \s also matches U+00A0, which would
  // break the &nbsp; used for orphan control.
  function splitWords(el) {
    if (el.dataset.splitDone) return Array.prototype.slice.call(el.querySelectorAll('.word'));
    var frag = document.createDocumentFragment();
    var words = [];

    function addWord(text, cls) {
      var s = document.createElement('span');
      s.className = 'word' + (cls ? ' ' + cls : '');
      s.textContent = text;
      frag.appendChild(s);
      frag.appendChild(document.createTextNode(' '));
      words.push(s);
    }
    Array.prototype.slice.call(el.childNodes).forEach(function (node) {
      if (node.nodeType === 1 && node.tagName === 'BR') { frag.appendChild(node.cloneNode()); return; }
      var cls = node.nodeType === 1 ? (node.getAttribute('class') || '') : '';
      (node.textContent || '').split(/[ \t\r\n]+/).forEach(function (w) { if (w) addWord(w, cls); });
    });
    el.innerHTML = '';
    el.appendChild(frag);
    el.dataset.splitDone = '1';
    return words;
  }

  /* --------------------------------------------------- scrub heading reveal */
  // Two scrubbed triggers per heading: word-by-word opacity and a whole-element
  // blur. scrub:true (never a number) keeps progress tied to scroll position,
  // so a throttled or backgrounded tab cannot leave a heading half-revealed.
  document.querySelectorAll('[data-split]').forEach(function (el) {
    var words = splitWords(el);
    if (!words.length) return;

    // A heading already on screen at load has no scroll runway ahead of it, so a
    // scrub would strand it at partial progress — permanently blurred until the
    // reader scrolls. Anything in the first fold gets a timed reveal instead.
    if (el.getBoundingClientRect().top < window.innerHeight * 0.94) {
      gsap.set(el, { filter: 'blur(8px)' });
      gsap.timeline({ delay: 0.12 })
        .to(el, { filter: 'blur(0px)', duration: 0.75, ease: 'power2.out' }, 0)
        .to(words, { opacity: 1, duration: 0.5, ease: 'none', stagger: 0.045 }, 0);
      return;
    }

    ScrollTrigger.create({
      trigger: el, start: 'top 90%', end: 'top 54%', scrub: true,
      animation: gsap.to(words, { opacity: 1, ease: 'none', stagger: 0.5 })
    });
    ScrollTrigger.create({
      trigger: el, start: 'top 96%', end: 'top 64%', scrub: true,
      animation: gsap.fromTo(el, { filter: 'blur(8px)' }, { filter: 'blur(0px)', ease: 'none' })
    });
  });

  /* ------------------------------------------------------- fade-in reveals */
  function reveal(sel, vars) {
    document.querySelectorAll(sel).forEach(function (el) {
      gsap.to(el, Object.assign({
        scrollTrigger: { trigger: el, start: 'top 90%', once: true },
        duration: 0.85, ease: 'power3.out'
      }, vars));
    });
  }
  reveal('[data-reveal]', { opacity: 1 });
  reveal('[data-reveal-y]', { opacity: 1, y: 0 });

  // grids stagger rather than firing all at once
  ['.icard-grid', '.pcard-grid', '.loc-grid', '.prov-grid', '.values__grid'].forEach(function (sel) {
    document.querySelectorAll(sel).forEach(function (grid) {
      var kids = grid.querySelectorAll('[data-reveal-y]');
      if (kids.length < 2) return;
      kids.forEach(function (k) { gsap.killTweensOf(k); });
      gsap.to(kids, {
        opacity: 1, y: 0, duration: 0.8, ease: 'power3.out', stagger: 0.08,
        scrollTrigger: { trigger: grid, start: 'top 88%', once: true }
      });
    });
  });

  /* ------------------------------------------------------------- parallax */
  // The image rests scaled up so the travel never exposes the frame edge.
  document.querySelectorAll('[data-parallax]').forEach(function (frame) {
    var img = frame.querySelector('img');
    if (!img) return;
    gsap.set(img, { scale: 1.14 });
    gsap.fromTo(img, { yPercent: -5 }, {
      yPercent: 5, ease: 'none',
      scrollTrigger: { trigger: frame, start: 'top bottom', end: 'bottom top', scrub: true }
    });
  });

  document.querySelectorAll('.phero__media img, .ctaband img, .band img').forEach(function (img) {
    gsap.set(img, { scale: 1.1 });
    gsap.fromTo(img, { yPercent: -4 }, {
      yPercent: 4, ease: 'none',
      scrollTrigger: { trigger: img.parentElement, start: 'top bottom', end: 'bottom top', scrub: true }
    });
  });

  // hero cut-out drifts up as the page settles, then eases on scroll
  document.querySelectorAll('[data-hero-art]').forEach(function (art) {
    gsap.from(art, { opacity: 0, y: 40, duration: 1.1, ease: 'power3.out', delay: 0.12 });
    gsap.to(art, {
      yPercent: -5, ease: 'none',
      scrollTrigger: { trigger: art, start: 'top bottom', end: 'bottom top', scrub: true }
    });
  });

  // collage circles settle in sequence
  document.querySelectorAll('.collage').forEach(function (c) {
    var figs = c.querySelectorAll('figure');
    var rules = c.querySelectorAll('.collage__rule');
    var tl = gsap.timeline({ scrollTrigger: { trigger: c, start: 'top 82%', once: true } });
    tl.from(figs, { opacity: 0, scale: 0.88, duration: 0.85, ease: 'power3.out', stagger: 0.12 })
      .from(rules, { scaleY: 0, transformOrigin: 'top center', duration: 0.7, ease: 'power2.out', stagger: 0.1 }, 0.25);
  });

  /* ------------------------------------------------------ magnetic buttons */
  document.querySelectorAll('[data-magnetic]').forEach(function (btn) {
    var ico = btn.querySelector('.btn__ico');
    var tl = gsap.timeline({ paused: true });
    if (ico) tl.to(ico, { rotate: 45, duration: 0.36, ease: 'power2.out' }, 0);
    tl.to(btn, { scale: 1.02, duration: 0.36, ease: 'power2.out' }, 0);
    btn.addEventListener('mouseenter', function () { tl.play(); });
    btn.addEventListener('mouseleave', function () { tl.reverse(); });
    btn.addEventListener('focus', function () { tl.play(); });
    btn.addEventListener('blur', function () { tl.reverse(); });
  });

  /* --------------------------------------------------------- housekeeping */
  function unhideAll() {
    document.querySelectorAll('[data-reveal],[data-reveal-y]').forEach(function (el) {
      if (parseFloat(getComputedStyle(el).opacity) < 0.05) {
        el.style.opacity = '1';
        el.style.transform = 'none';
      }
    });
    // Late fonts and images can shift a heading into the first fold after its
    // trigger was built. Resolve anything on screen that is still mid-reveal.
    document.querySelectorAll('[data-split]').forEach(function (el) {
      if (el.getBoundingClientRect().top >= window.innerHeight) return;
      var f = getComputedStyle(el).filter;
      if (f && f !== 'none' && !/blur\(0(px)?\)/.test(f)) {
        gsap.to(el, { filter: 'blur(0px)', duration: 0.4, ease: 'power2.out' });
      }
      var dim = [];
      el.querySelectorAll('.word').forEach(function (w) {
        if (parseFloat(getComputedStyle(w).opacity) < 0.95) dim.push(w);
      });
      if (dim.length) gsap.to(dim, { opacity: 1, duration: 0.4, stagger: 0.03 });
    });
  }

  // Late-loading fonts and images change element heights, which moves every
  // trigger below them. Recompute once the page is genuinely settled.
  function refresh() { ScrollTrigger.refresh(); }
  window.addEventListener('load', function () {
    refresh();
    setTimeout(function () { refresh(); unhideAll(); }, 420);
  });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(refresh);

  // A tab throttled in the background can stall mid-tween; resync on return.
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden) { refresh(); if (lenis) lenis.resize(); }
  });
}());
