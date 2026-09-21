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

  /* -------------------------------------------------------------- count-up */
  // Numbers already read correctly in the HTML; this only animates them.
  if (hasGSAP && !still && ScrollTrigger) {
    document.querySelectorAll('[data-count]').forEach(function (el) {
      var to = parseFloat(el.getAttribute('data-count'));
      var suffix = el.getAttribute('data-suffix') || '';
      var o = { v: 0 };
      var render = function () { el.textContent = Math.round(o.v).toLocaleString('en-US') + suffix; };
      render();
      gsap.to(o, {
        v: to, duration: 1.8, ease: 'power2.out', onUpdate: render,
        scrollTrigger: { trigger: el, start: 'top 90%', once: true }
      });
    });
  }

  /* ------------------------------------------------ service page widgets */
  // Pill tabs (symptom checker): a sliding pill under the
  // selected button, arrow keys to move, panels toggled by aria-controls.
  function pillTabs(list, onChange) {
    var tabs = Array.prototype.slice.call(list.querySelectorAll('[role="tab"]'));
    var pill = list.querySelector('[class$="pill"]');
    function place() {
      var on = tabs.filter(function (t) { return t.getAttribute('aria-selected') === 'true'; })[0];
      if (!on || !pill) return;
      pill.style.setProperty('--pw', on.offsetWidth + 'px');
      pill.style.setProperty('--px', (on.offsetLeft - 5) + 'px');
    }
    function select(i, focus) {
      tabs.forEach(function (t, k) {
        var on = k === i;
        t.setAttribute('aria-selected', on ? 'true' : 'false');
        t.tabIndex = on ? 0 : -1;
        var panel = document.getElementById(t.getAttribute('aria-controls'));
        if (panel) panel.hidden = !on;
        if (on && panel && hasGSAP && !still) {
          gsap.fromTo(panel, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out', overwrite: true });
        }
      });
      if (focus) tabs[i].focus();
      place();
      if (onChange) onChange(i);
    }
    tabs.forEach(function (t, i) {
      t.addEventListener('click', function () { select(i); });
      t.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowRight') { e.preventDefault(); select((i + 1) % tabs.length, true); }
        if (e.key === 'ArrowLeft') { e.preventDefault(); select((i - 1 + tabs.length) % tabs.length, true); }
      });
    });
    window.addEventListener('resize', place);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(place);
    select(0);
    return select;
  }

  document.querySelectorAll('[data-hcheck]').forEach(function (box) {
    var count = box.querySelector('[data-hcheck-count]');
    var msg = box.querySelector('[data-hcheck-msg]');
    function tally() {
      var visible = box.querySelector('[role="tabpanel"]:not([hidden])');
      var n = visible ? visible.querySelectorAll('input:checked').length : 0;
      count.textContent = n;
      msg.textContent = n === 0 ? 'Select any that apply.'
        : n < 3 ? 'Worth mentioning at your next visit.'
        : 'A hormone panel could tell you a lot. Let’s test.';
      if (hasGSAP && !still) gsap.fromTo(count, { scale: 1.35 }, { scale: 1, duration: 0.45, ease: 'back.out(3)' });
    }
    box.addEventListener('change', tally);
    pillTabs(box.querySelector('[role="tablist"]'), tally);
  });

  // Enquiry form: validated in the browser. There is no backend in this
  // prototype, so a valid submit shows the confirmation state only.
  document.querySelectorAll('[data-cform]').forEach(function (form) {
    var done = form.querySelector('.cform__done');
    function check(input) {
      var field = input.closest('.field');
      var bad = input.required && !input.value.trim();
      field.classList.toggle('is-bad', bad);
      input.setAttribute('aria-invalid', bad ? 'true' : 'false');
      var err = field.querySelector('.field__err');
      if (bad && !err) {
        err = document.createElement('span');
        err.className = 'field__err';
        err.id = input.id + '-err';
        err.textContent = 'Please fill this in.';
        field.appendChild(err);
        input.setAttribute('aria-describedby', err.id);
      } else if (!bad && err) {
        err.remove();
        input.removeAttribute('aria-describedby');
      }
      return !bad;
    }
    form.querySelectorAll('[required]').forEach(function (i) {
      i.addEventListener('blur', function () { check(i); });
      i.addEventListener('input', function () { if (i.closest('.field').classList.contains('is-bad')) check(i); });
    });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var ok = true, first = null;
      form.querySelectorAll('[required]').forEach(function (i) {
        if (!check(i)) { ok = false; first = first || i; }
      });
      if (!ok) { first.focus(); return; }
      done.hidden = false;
      if (hasGSAP && !still) gsap.fromTo(done, { opacity: 0, scale: 0.96 }, { opacity: 1, scale: 1, duration: 0.5, ease: 'power3.out' });
      form.reset();
    });
  });

  // Report bars, drawn lines and step rails: final state without motion,
  // animated on scroll with it.
  var scrollFx = hasGSAP && !still && ScrollTrigger;
  document.querySelectorAll('[data-bar]').forEach(function (em) {
    var w = em.getAttribute('data-bar') + '%';
    if (!scrollFx) { em.style.setProperty('--w', w); return; }
    gsap.fromTo(em, { '--w': '0%' }, {
      '--w': w, duration: 1.4, ease: 'power3.out',
      scrollTrigger: { trigger: em, start: 'top 92%', once: true }
    });
  });
  document.querySelectorAll('[data-draw]').forEach(function (path) {
    if (!scrollFx) return;
    gsap.fromTo(path, { strokeDasharray: 1, strokeDashoffset: 1 }, {
      strokeDashoffset: 0, duration: 1.6, ease: 'power2.inOut',
      scrollTrigger: { trigger: path, start: 'top 92%', once: true }
    });
  });
  document.querySelectorAll('.deliver__path').forEach(function (path) {
    if (!scrollFx) return;
    gsap.to(path, { strokeDashoffset: -0.3, duration: 6, ease: 'none', repeat: -1 });
  });
  document.querySelectorAll('[data-steps], [data-tline]').forEach(function (rail) {
    if (!scrollFx) return;
    gsap.fromTo(rail, { '--p': 0 }, {
      '--p': 1, ease: 'none',
      scrollTrigger: { trigger: rail, start: 'top 80%', end: 'bottom 60%', scrub: true }
    });
  });

  /* ------------------------------------------------------ testimonial deck */
  // A stacked deck: the front card is flung off and the rest step forward.
  // Autoplays while on screen (paused on hover), swipeable, keyboard via the
  // buttons. Without motion it still pages, just without the tweens.
  document.querySelectorAll('[data-tdeck]').forEach(function (deck) {
    var cards = Array.prototype.slice.call(deck.querySelectorAll('[data-tcard]'));
    var n = cards.length;
    if (n < 2) return;
    var sec = deck.closest('section') || deck;
    var curEl = sec.querySelector('[data-tdeck-cur]');
    var totEl = sec.querySelector('[data-tdeck-total]');
    var bar = sec.querySelector('[data-tdeck-bar]');
    var motion = hasGSAP && !still;
    var DWELL = 6.5;
    var order = cards.slice();
    var busy = false, auto = null, inView = false, hovering = false;
    var pad = function (k) { return (k < 10 ? '0' : '') + k; };
    if (totEl) totEl.textContent = pad(n);

    cards.forEach(function (c) {
      var q = c.querySelector('.tcard__quote');
      if (!q) return;
      q.innerHTML = q.textContent.trim().split(/[ \t\r\n]+/).map(function (w) {
        return '<span class="tw">' + w + '</span>';
      }).join(' ');
    });

    function slot(d) {
      var k = deck.clientWidth < 520 ? 0.55 : 1;
      if (d === 0) return { x: 0, y: 0, rotate: 0, scale: 1, opacity: 1, zIndex: n + 1 };
      if (d === 1) return { x: 22 * k, y: 20 * k, rotate: 2.5, scale: 0.95, opacity: 1, zIndex: n };
      if (d === 2) return { x: 42 * k, y: 38 * k, rotate: 5, scale: 0.9, opacity: 0.85, zIndex: n - 1 };
      return { x: 54 * k, y: 50 * k, rotate: 7, scale: 0.86, opacity: 0, zIndex: 1 };
    }
    function apply(c, v) {
      if (hasGSAP) { gsap.set(c, v); return; }
      c.style.zIndex = v.zIndex;
      c.style.opacity = v.opacity;
      c.style.transform = 'translate(' + v.x + 'px,' + v.y + 'px) rotate(' + v.rotate + 'deg) scale(' + v.scale + ')';
    }
    function layout(tween, skip) {
      order.forEach(function (c, d) {
        var front = d === 0;
        c.classList.toggle('is-front', front);
        c.setAttribute('aria-hidden', front ? 'false' : 'true');
        if (c === skip) return;
        if (tween && motion) gsap.to(c, Object.assign({ duration: 0.8, ease: 'power3.out', overwrite: 'auto' }, slot(d)));
        else apply(c, slot(d));
      });
      if (curEl) curEl.textContent = pad(cards.indexOf(order[0]) + 1);
    }
    function words(c) {
      if (!motion) return;
      gsap.fromTo(c.querySelectorAll('.tw'), { opacity: 0.12, y: 8 },
        { opacity: 1, y: 0, duration: 0.55, ease: 'power2.out', stagger: 0.022, delay: 0.2, overwrite: true });
    }

    function go(dir) {
      if (busy) return;
      if (!motion) {
        if (dir > 0) order.push(order.shift()); else order.unshift(order.pop());
        layout(false);
        return;
      }
      busy = true;
      if (dir > 0) {
        var out = order.shift();
        order.push(out);
        layout(true, out);
        gsap.timeline({ onComplete: function () { busy = false; } })
          .to(out, { x: -160, y: -24, rotate: -12, opacity: 0, duration: 0.5, ease: 'power2.in', overwrite: 'auto' })
          .set(out, { zIndex: 0 })
          .to(out, Object.assign({ duration: 0.5, ease: 'power2.out' }, slot(n - 1)));
      } else {
        var back = order.pop();
        order.unshift(back);
        gsap.set(back, { x: -160, y: -24, rotate: -12, opacity: 0, scale: 1, zIndex: n + 2 });
        layout(true);
        gsap.delayedCall(0.8, function () { busy = false; });
      }
      words(order[0]);
      restart();
    }

    // autoplay, with the progress bar as its clock
    function restart() {
      if (!motion || !bar) return;
      if (auto) auto.kill();
      auto = gsap.fromTo(bar, { scaleX: 0 }, {
        scaleX: 1, duration: DWELL, ease: 'none', paused: true,
        onComplete: function () { go(1); }
      });
      sync();
    }
    function sync() {
      if (!auto) return;
      if (inView && !hovering && !document.hidden) auto.play(); else auto.pause();
    }
    sec.addEventListener('mouseenter', function () { hovering = true; sync(); });
    sec.addEventListener('mouseleave', function () { hovering = false; sync(); });
    document.addEventListener('visibilitychange', sync);
    if (motion && ScrollTrigger) {
      ScrollTrigger.create({
        trigger: deck, start: 'top 85%', end: 'bottom 15%',
        onToggle: function (self) { inView = self.isActive; sync(); }
      });
    }

    var prev = sec.querySelector('[data-tdeck-prev]');
    var next = sec.querySelector('[data-tdeck-next]');
    if (prev) prev.addEventListener('click', function () { go(-1); });
    if (next) next.addEventListener('click', function () { go(1); });

    // drag / swipe the front card
    var startX = null, dx = 0;
    deck.addEventListener('pointerdown', function (e) {
      if (busy) return;
      startX = e.clientX; dx = 0;
      deck.setPointerCapture(e.pointerId);
    });
    deck.addEventListener('pointermove', function (e) {
      if (startX === null) return;
      dx = e.clientX - startX;
      if (motion) gsap.set(order[0], { x: dx * 0.7, rotate: dx * 0.03 });
    });
    function release() {
      if (startX === null) return;
      startX = null;
      if (Math.abs(dx) > 60) go(dx < 0 ? 1 : -1);
      else if (motion) gsap.to(order[0], { x: 0, rotate: 0, duration: 0.5, ease: 'back.out(2)' });
    }
    deck.addEventListener('pointerup', release);
    deck.addEventListener('pointercancel', release);

    layout(false);
    window.addEventListener('resize', function () { if (!busy) layout(false); });
    restart();
  });

  // Snippet strip: an endless GSAP loop that speeds up with scroll velocity.
  document.querySelectorAll('[data-tmarq]').forEach(function (strip) {
    var track = strip.querySelector('.tmarq__track');
    if (!track || !motion()) return;
    track.innerHTML += track.innerHTML;
    var loop = gsap.to(track, { xPercent: -50, duration: 38, ease: 'none', repeat: -1 });
    strip.addEventListener('mouseenter', function () { gsap.to(loop, { timeScale: 0.25, duration: 0.6 }); });
    strip.addEventListener('mouseleave', function () { gsap.to(loop, { timeScale: 1, duration: 0.6 }); });
    if (ScrollTrigger) {
      ScrollTrigger.create({
        trigger: strip, start: 'top bottom', end: 'bottom top',
        onToggle: function (self) { if (self.isActive) loop.play(); else loop.pause(); },
        onUpdate: function (self) {
          var v = Math.min(Math.abs(self.getVelocity()) / 400, 4);
          gsap.to(loop, { timeScale: 1 + v, duration: 0.2, overwrite: true,
            onComplete: function () { gsap.to(loop, { timeScale: 1, duration: 0.9 }); } });
        }
      });
    }
    function motion() { return hasGSAP && !still; }
  });

  /* ------------------------------------------------------------ mega menu */
  // One panel per header, opened by any trigger in that header. CSS owns the
  // open/close state so the panel still works without JS; this manages intent
  // (hover with a close delay, click, keyboard) and staggers the contents.
  (function megaMenu() {
    var scopes = Array.prototype.slice.call(document.querySelectorAll('[data-mega-scope]'));
    if (!scopes.length) return;
    var CLOSE_DELAY = 200;

    // One scope (header) can hold several panels, one per service; each
    // trigger names its panel with data-mega-trigger="key".
    scopes.forEach(function (scope) {
      var panels = {};
      Array.prototype.slice.call(scope.querySelectorAll('[data-mega]')).forEach(function (p) {
        panels[p.getAttribute('data-mega') || 'pc'] = setupPanel(p);
      });
      var triggers = Array.prototype.slice.call(scope.querySelectorAll('[data-mega-trigger]'));
      if (!triggers.length || !Object.keys(panels).length) return;
      var current = null;
      var timer = null;
      var hideTimers = {};
      // Escape returns focus to the trigger, whose focus handler would otherwise
      // reopen the panel straight away.
      var suppress = false;
      var keyOf = function (t) { return t.getAttribute('data-mega-trigger') || 'pc'; };

      function setExpanded() {
        triggers.forEach(function (t) {
          var on = keyOf(t) === current;
          t.setAttribute('aria-expanded', on ? 'true' : 'false');
          var li = t.closest('.has-mega');
          if (li) li.classList.toggle('is-open', on);
        });
      }

      function hide(key, instant) {
        var p = panels[key];
        if (!p) return;
        p.el.classList.remove('is-open');
        clearTimeout(hideTimers[key]);
        var done = function () {
          if (current !== key) { p.el.hidden = true; p.reset(); }
        };
        if (instant) done(); else hideTimers[key] = setTimeout(done, 420);
      }

      function close() {
        clearTimeout(timer);
        if (!current) return;
        var was = current;
        current = null;
        scope.classList.remove('is-mega-open');
        setExpanded();
        hide(was);
      }

      function open(key) {
        if (suppress || !panels[key]) return;
        clearTimeout(timer);
        clearTimeout(hideTimers[key]);
        if (current === key) return;
        var prev = current;
        var switching = prev !== null;
        current = key;
        if (switching) hide(prev, true);
        var p = panels[key];
        p.el.hidden = false;
        void p.el.offsetWidth;            // flush layout so the transition runs
        p.el.classList.toggle('is-instant', switching);
        p.el.classList.add('is-open');
        scope.classList.add('is-mega-open');
        setExpanded();
        p.preload();

        if (!still && hasGSAP) {
          var cols = p.el.querySelectorAll('.mega__col');
          var items = p.el.querySelectorAll('.mega__link, .mega__explore a, .mega__loc');
          gsap.killTweensOf([cols, items]);
          gsap.fromTo(cols, { opacity: 0, y: switching ? 4 : 10 },
            { opacity: 1, y: 0, duration: switching ? 0.26 : 0.4, ease: 'power2.out', stagger: 0.05, overwrite: true });
          gsap.fromTo(items, { opacity: 0, y: 6 },
            { opacity: 1, y: 0, duration: 0.3, ease: 'power2.out',
              stagger: 0.012, delay: 0.04, overwrite: true });
        }
      }

      function scheduleClose() {
        clearTimeout(timer);
        timer = setTimeout(close, CLOSE_DELAY);
      }

      triggers.forEach(function (t) {
        var key = keyOf(t);
        var group = t.closest('.has-mega') || t;
        group.addEventListener('mouseenter', function () { open(key); });
        group.addEventListener('mouseleave', scheduleClose);
        // touch and keyboard: the first activation opens, the second follows the link
        t.addEventListener('click', function (e) {
          if (current !== key) { e.preventDefault(); open(key); }
        });
        t.addEventListener('focus', function () { open(key); });
      });
      Object.keys(panels).forEach(function (k) {
        panels[k].el.addEventListener('mouseenter', function () { clearTimeout(timer); });
        panels[k].el.addEventListener('mouseleave', scheduleClose);
      });

      scope.addEventListener('focusout', function (e) {
        if (!scope.contains(e.relatedTarget)) scheduleClose();
      });
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && current) {
          var back = triggers.filter(function (t) { return keyOf(t) === current; })[0];
          suppress = true;
          close();
          if (back) back.focus();
          setTimeout(function () { suppress = false; }, 320);
        }
      });
      document.addEventListener('click', function (e) {
        if (!scope.contains(e.target)) close();
      });
    });

    // Service preview: hovering or focusing a service swaps the promo card's
    // photo (crossfade) and copy to match; closing the panel restores it.
    function setupPanel(panel) {
      var promo = panel.querySelector('[data-mega-promo]');
      var svcLinks = Array.prototype.slice.call(panel.querySelectorAll('[data-promo-img]'));
      var promoTitle = promo && promo.querySelector('[data-promo-title]');
      var promoText = promo && promo.querySelector('[data-promo-text]');
      var promoDefault = promo && {
        img: promo.querySelector('img').getAttribute('src'),
        title: promoTitle.innerHTML, text: promoText.innerHTML
      };
      var promoKey = promoDefault && promoDefault.img;
      var preloaded = false;

      function setPromo(d, link) {
        if (!promo) return;
        svcLinks.forEach(function (l) { l.classList.toggle('is-active', l === link); });
        if (d.img === promoKey && promoTitle.innerHTML === d.title) return;
        var sameImg = d.img === promoKey;
        promoKey = d.img;
        var swap = function () {
          promoTitle.innerHTML = d.title;
          promoText.innerHTML = d.text;
        };
        var old = promo.querySelectorAll('img');
        var img = null;
        if (!sameImg) {
          img = document.createElement('img');
          img.src = d.img; img.alt = ''; img.setAttribute('aria-hidden', 'true');
          old[old.length - 1].after(img);
        }
        if (still || !hasGSAP) {
          swap();
          if (img) old.forEach(function (o) { o.remove(); });
          return;
        }
        if (img) {
          gsap.fromTo(img, { opacity: 0, scale: 1.08 }, {
            opacity: 1, scale: 1, duration: 0.55, ease: 'power2.out', overwrite: true,
            onComplete: function () { old.forEach(function (o) { o.remove(); }); }
          });
        }
        gsap.to([promoTitle, promoText], {
          opacity: 0, y: 6, duration: 0.14, ease: 'power1.in', overwrite: true,
          onComplete: function () {
            swap();
            gsap.to([promoTitle, promoText], { opacity: 1, y: 0, duration: 0.32, ease: 'power2.out', stagger: 0.05 });
          }
        });
      }
      function reset() {
        if (!promo) return;
        svcLinks.forEach(function (l) { l.classList.remove('is-active'); });
        if (hasGSAP) gsap.killTweensOf([promoTitle, promoText]);
        promoTitle.innerHTML = promoDefault.title;
        promoText.innerHTML = promoDefault.text;
        if (hasGSAP) gsap.set([promoTitle, promoText], { clearProps: 'opacity,transform' });
        if (promoKey === promoDefault.img) return;
        var old = promo.querySelectorAll('img');
        var img = document.createElement('img');
        img.src = promoDefault.img; img.alt = ''; img.setAttribute('aria-hidden', 'true');
        old[old.length - 1].after(img);
        old.forEach(function (o) { o.remove(); });
        promoKey = promoDefault.img;
      }
      svcLinks.forEach(function (link) {
        var d = {
          img: link.getAttribute('data-promo-img'),
          title: link.getAttribute('data-promo-title'),
          text: link.getAttribute('data-promo-text')
        };
        link.addEventListener('mouseenter', function () { setPromo(d, link); });
        link.addEventListener('focus', function () { setPromo(d, link); });
      });
      // warm the cache on first open so the first swap is instant
      function preload() {
        if (preloaded) return;
        preloaded = true;
        svcLinks.forEach(function (l) { new Image().src = l.getAttribute('data-promo-img'); });
      }
      return { el: panel, reset: reset, preload: preload };
    }
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

  /* ------------------------------------------------------- weight loss page */
  (function wellPage() {
    var root = document.querySelector('.well');
    if (!root) return;
    var motion = hasGSAP && !still;
    var fx = motion && ScrollTrigger;
    var q = function (sel, ctx) { return Array.prototype.slice.call((ctx || root).querySelectorAll(sel)); };

    // Intro loader: a ring fills while three words cycle, then the page is
    // uncovered through a closing circle. Once per visit.
    var loader = root.querySelector('[data-wl-loader]');
    var seen = false;
    try { seen = sessionStorage.getItem('wl-intro') === '1'; } catch (e) {}
    function ready() { document.dispatchEvent(new Event('wl:ready')); }
    if (!loader || seen || !motion) {
      if (loader) loader.remove();
      setTimeout(ready, 0);
    } else {
      try { sessionStorage.setItem('wl-intro', '1'); } catch (e) {}
      var words = ['Evaluate', 'Plan', 'Begin'];
      var wordEl = loader.querySelector('[data-wl-word]');
      var pctEl = loader.querySelector('[data-wl-pct]');
      var arc = loader.querySelector('.wl-loader__arc');
      var o = { p: 0 };
      document.documentElement.style.overflow = 'hidden';
      var intro = gsap.to(o, {
        p: 100, duration: 1.9, ease: 'power2.inOut',
        onUpdate: function () {
          pctEl.textContent = Math.round(o.p);
          arc.style.strokeDashoffset = 1 - o.p / 100;
          var w = words[Math.min(words.length - 1, Math.floor(o.p / 34))];
          if (wordEl.textContent !== w) {
            wordEl.textContent = w;
            gsap.fromTo(wordEl, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' });
          }
        },
        onComplete: function () {
          loader.classList.add('is-gone');
          document.documentElement.style.overflow = '';
          ready();
          setTimeout(function () { loader.remove(); }, 1100);
        }
      });
      // never hold the page if animation frames are throttled (background tab)
      setTimeout(function () { if (intro.progress() < 1) intro.progress(1); }, 4000);
    }

    // Hero entrance, after the loader.
    var hero = root.querySelector('[data-wl-hero]');
    if (motion && hero) {
      gsap.set(q('[data-wl-line]', hero), { yPercent: 110 });
      gsap.set(q('[data-wl-rise]', hero), { opacity: 0, y: 18 });
      document.addEventListener('wl:ready', function () {
        gsap.to(q('[data-wl-line]', hero), { yPercent: 0, duration: 1.2, ease: 'power4.out', stagger: 0.12, delay: 0.15 });
        gsap.to(q('[data-wl-rise]', hero), { opacity: 1, y: 0, duration: 0.9, ease: 'power3.out', stagger: 0.08, delay: 0.45 });
      }, { once: true });
    }

    // Pour: a small fluid simulation (velocity + dye, WebGL2). The dye is a
    // window onto the hero photo: inside it the photo shows through, its edge
    // tears like wet paper and a sage ink rim bleeds around it. The pour
    // enters from the left, then drifts on its own and follows the pointer.
    var cv = root.querySelector('[data-wl-ink]');
    var photo = root.querySelector('[data-wl-photo]');
    var fine = window.matchMedia('(hover:hover) and (pointer:fine)').matches;
    var wideEnough = window.matchMedia('(min-width:901px)').matches;
    var gl = motion && fine && wideEnough && cv ? cv.getContext('webgl2', { premultipliedAlpha: false, antialias: false }) : null;
    if (gl && !gl.getExtension('EXT_color_buffer_float')) gl = null;
    if (gl) (function pour() {
      var VS = '#version 300 es\nin vec2 p;out vec2 v;void main(){v=p*.5+.5;gl_Position=vec4(p,0.,1.);}';
      var SPLAT = '#version 300 es\nprecision highp float;in vec2 v;out vec4 o;' +
        'uniform sampler2D uVel,uSrc;uniform vec2 uPt,uForce,uAspect;uniform float uR,uAmt,uKeep,uDrop,uStep;uniform int uIsVel;' +
        'void main(){vec2 vel=texture(uVel,v).xy;vec2 back=v-vel*uStep;vec4 s=texture(uSrc,back)*uKeep;' +
        'vec2 d=(v-uPt)*uAspect;float g=exp(-dot(d,d)/uR);' +
        'if(uIsVel==1){s.xy+=uForce*g;s.xy=clamp(s.xy,-.6,.6);}else{s.x=clamp(max(s.x-uDrop,0.)+uAmt*g,0.,1.4);}' +
        'o=s;}';
      var DRAW = '#version 300 es\nprecision highp float;in vec2 v;out vec4 o;' +
        'uniform sampler2D uDye,uPhoto;uniform vec2 uRes;uniform vec4 uRect;uniform float uTime,uHas;' +
        'uniform vec3 uPaper,uClay,uInk;' +
        'float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}' +
        'float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);' +
        'return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}' +
        'void main(){float d=texture(uDye,v).x;' +
        // a soft, wide copy of the dye for the ink bleed
        'vec2 px=1./vec2(textureSize(uDye,0));float b=0.;' +
        'for(int i=0;i<12;i++){float a=float(i)*.5236;vec2 o=vec2(cos(a),sin(a));' +
        'b+=texture(uDye,v+o*px*3.).x+texture(uDye,v+o*px*7.).x;}b/=24.;' +
        'vec2 q=v*uRes;float lo=n(q/90.+uTime*.04);float t=lo*.55+n(q/16.)*.3+n(q/4.)*.15;' +
        'float m=d+(t-.5)*.3;' +
        'float rim=smoothstep(.03,.34,b+(lo-.5)*.16);float win=smoothstep(.50,.555,m);' +
        'float edge=smoothstep(.45,.50,m)*(1.-win);' +
        'vec2 uv=(v-uRect.xy)/uRect.zw;uv.y=1.-uv.y;' +
        'vec3 ph=texture(uPhoto,uv).rgb;ph=mix(ph,vec3(dot(ph,vec3(.3,.59,.11))),.22)*vec3(1.02,1.,.95);' +
        'ph=mix(uClay,ph,uHas);' +
        'vec3 c=uPaper;c=mix(c,uInk,rim*.9);c=mix(c,uClay,edge*.95);c=mix(c,ph,win);' +
        'c+=(h(q+fract(uTime*7.))-.5)*.035;' +
        'o=vec4(c,1.);}';

      function sh(type, src) {
        var o = gl.createShader(type); gl.shaderSource(o, src); gl.compileShader(o);
        if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(o));
        return o;
      }
      function prog(fs) {
        var pr = gl.createProgram();
        gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, fs));
        gl.bindAttribLocation(pr, 0, 'p'); gl.linkProgram(pr);
        var u = {}, n = gl.getProgramParameter(pr, gl.ACTIVE_UNIFORMS);
        for (var i = 0; i < n; i++) { var name = gl.getActiveUniform(pr, i).name; u[name] = gl.getUniformLocation(pr, name); }
        return { p: pr, u: u };
      }
      var splat, draw;
      try { splat = prog(SPLAT); draw = prog(DRAW); } catch (e) { return; }

      var buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

      function tex(w, h) {
        var t = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, t);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, w, h, 0, gl.RGBA, gl.HALF_FLOAT, null);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        var fb = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
        return { t: t, fb: fb };
      }
      function pair(w, h) { return { a: tex(w, h), b: tex(w, h), swap: function () { var x = this.a; this.a = this.b; this.b = x; } }; }

      var W, H, SW, SH, vel, dye;
      function size() {
        var r = cv.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 1.5);
        W = cv.width = Math.round(r.width * dpr); H = cv.height = Math.round(r.height * dpr);
        SW = 220; SH = Math.max(80, Math.round(220 * r.height / r.width));
        vel = pair(SW, SH); dye = pair(SW, SH);
      }
      size();
      window.addEventListener('resize', function () { size(); });

      var ptex = gl.createTexture(), hasPhoto = 0, pw = 1, ph = 1;
      gl.bindTexture(gl.TEXTURE_2D, ptex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([231, 233, 243, 255]));
      function loadPhoto() {
        try {
          gl.bindTexture(gl.TEXTURE_2D, ptex);
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, photo);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
          pw = photo.naturalWidth; ph = photo.naturalHeight; hasPhoto = 1;
        } catch (e) { hasPhoto = 0; }
      }
      if (photo) { if (photo.complete && photo.naturalWidth) loadPhoto(); else photo.addEventListener('load', loadPhoto); }

      function step(pt, force, amt, radius) {
        var aspect = [W / H, 1];
        gl.useProgram(splat.p);
        gl.viewport(0, 0, SW, SH);
        gl.uniform2f(splat.u.uAspect, aspect[0], aspect[1]);
        gl.uniform2f(splat.u.uPt, pt[0], pt[1]);
        gl.uniform1f(splat.u.uR, radius);
        gl.uniform1f(splat.u.uStep, 0.9 / 60);
        // velocity
        gl.uniform1i(splat.u.uIsVel, 1);
        gl.uniform2f(splat.u.uForce, force[0], force[1]);
        gl.uniform1f(splat.u.uKeep, 0.975);
        gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, vel.a.t); gl.uniform1i(splat.u.uVel, 0);
        gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, vel.a.t); gl.uniform1i(splat.u.uSrc, 1);
        gl.bindFramebuffer(gl.FRAMEBUFFER, vel.b.fb);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); vel.swap();
        // dye, carried by the new velocity
        gl.uniform1i(splat.u.uIsVel, 0);
        gl.uniform1f(splat.u.uAmt, amt);
        gl.uniform1f(splat.u.uKeep, 0.9985);
        gl.uniform1f(splat.u.uDrop, 0.0011);
        gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, vel.a.t);
        gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, dye.a.t);
        gl.bindFramebuffer(gl.FRAMEBUFFER, dye.b.fb);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); dye.swap();
      }
      function render(t) {
        gl.useProgram(draw.p);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, W, H);
        gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, dye.a.t); gl.uniform1i(draw.u.uDye, 0);
        gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, ptex); gl.uniform1i(draw.u.uPhoto, 1);
        gl.uniform2f(draw.u.uRes, W, H);
        // the photo sits on the right, a little taller than the hero, with
        // its subject (about 38% across the frame) under the drifting window
        var rh = 1.12, rw = (pw / ph) * rh * H / W;
        gl.uniform4f(draw.u.uRect, 0.66 - 0.38 * rw, (1 - rh) / 2 - 0.02, rw, rh);
        gl.uniform1f(draw.u.uTime, t);
        gl.uniform1f(draw.u.uHas, hasPhoto);
        gl.uniform3f(draw.u.uPaper, 0.953, 0.957, 0.976);
        gl.uniform3f(draw.u.uClay, 0.906, 0.914, 0.953);
        gl.uniform3f(draw.u.uInk, 0.165, 0.200, 0.475);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      }

      // pointer input, in sim space (0..1, y up)
      var ptr = null, lastPtr = null, lastMove = -1e9;
      hero.addEventListener('pointermove', function (e) {
        var r = cv.getBoundingClientRect();
        ptr = [(e.clientX - r.left) / r.width, 1 - (e.clientY - r.top) / r.height];
        lastMove = performance.now();
      });
      hero.addEventListener('pointerleave', function () { ptr = null; lastPtr = null; });

      var start = null, entered = false, running = false, wander = [0.68, 0.5], wPrev = null;
      document.addEventListener('wl:ready', function () { entered = true; start = null; }, { once: true });
      function frame(now) {
        if (!running) return;
        var t = now / 1000;
        if (entered) {
          if (start === null) start = now;
          var e = (now - start) / 1000;
          // entrance: a pour that sweeps in from the left
          if (e < 1.6) {
            var k = e / 1.6, x = 0.18 + 0.56 * (1 - Math.pow(1 - k, 3)), y = 0.62 - 0.16 * Math.sin(k * 3.1);
            step([x, y], [0.5, -0.1], 0.2, 0.012);
          }
          // idle drift keeps a window open on the right half
          var ang = t * 0.23;
          var target = [0.66 + 0.13 * Math.sin(ang * 1.3), 0.48 + 0.2 * Math.sin(ang * 2.1 + 1.2)];
          wander[0] += (target[0] - wander[0]) * 0.05; wander[1] += (target[1] - wander[1]) * 0.05;
          var f = wPrev ? [(wander[0] - wPrev[0]) * 8, (wander[1] - wPrev[1]) * 8] : [0, 0];
          wPrev = wander.slice();
          var idleAmt = now - lastMove > 1400 ? 0.05 : 0.02;
          step(wander, f, idleAmt, 0.02);
          if (ptr) {
            var fv = lastPtr ? [(ptr[0] - lastPtr[0]) * 14, (ptr[1] - lastPtr[1]) * 14] : [0, 0];
            var speed = Math.min(1, Math.abs(fv[0]) + Math.abs(fv[1]));
            step(ptr, fv, 0.05 + speed * 0.25, 0.006 + speed * 0.008);
            lastPtr = ptr.slice();
          }
        }
        render(t);
        requestAnimationFrame(frame);
      }
      hero.classList.add('is-gl');
      new IntersectionObserver(function (en) {
        var on = en[0].isIntersecting && !document.hidden;
        if (on && !running) { running = true; requestAnimationFrame(frame); }
        if (!on) running = false;
      }).observe(hero);
    }());

    // Cursor ring that follows the pointer over the hero.
    var cursor = root.querySelector('[data-wl-cursor]');
    if (cursor && hero && motion && fine) {
      var cx = 0, cy = 0, tx = 0, ty = 0, cOn = false;
      hero.addEventListener('pointermove', function (e) {
        var r = hero.getBoundingClientRect();
        tx = e.clientX - r.left; ty = e.clientY - r.top;
        if (!cOn) { cx = tx; cy = ty; cOn = true; hero.classList.add('has-cursor'); }
      });
      hero.addEventListener('pointerleave', function () { cOn = false; hero.classList.remove('has-cursor'); });
      gsap.ticker.add(function () {
        if (!cOn) return;
        cx += (tx - cx) * 0.2; cy += (ty - cy) * 0.2;
        cursor.style.transform = 'translate(' + cx + 'px,' + cy + 'px)';
      });
      q('a,button', hero).forEach(function (el) {
        el.addEventListener('mouseenter', function () { cursor.style.width = cursor.style.height = '44px'; cursor.style.margin = '-22px 0 0 -22px'; });
        el.addEventListener('mouseleave', function () { cursor.style.width = cursor.style.height = ''; cursor.style.margin = ''; });
      });
    }

    // Breath: inhale 4, hold 4, exhale 4 — the counter, the sage dot and the
    // ring round the photo all follow the same clock.
    var bWrap = root.querySelector('[data-wl-breath]');
    if (bWrap) {
      var bN = root.querySelector('[data-wl-breath-n]');
      var bW = root.querySelector('[data-wl-breath-w]');
      var ring = root.querySelector('[data-wl-ring]');
      var phases = [['Inhale', 0.5, 1], ['Hold', 1, 1], ['Exhale', 1, 0.5]];
      var t0 = performance.now(), lastWord = '';
      var breathe = function () {
        var el = (performance.now() - t0) / 1000;
        var cyc = el % 12, pi = Math.floor(cyc / 4), within = (cyc % 4) / 4;
        var ph = phases[pi];
        var eased = 0.5 - Math.cos(within * Math.PI) / 2;
        var sc = ph[1] + (ph[2] - ph[1]) * eased;
        bWrap.style.setProperty('--b', sc.toFixed(3));
        if (ring) ring.style.transform = 'scale(' + (0.9 + (sc - 0.5) * 0.2).toFixed(4) + ')';
        bN.textContent = 4 - Math.floor(cyc % 4);
        if (lastWord !== ph[0]) { lastWord = ph[0]; bW.textContent = ph[0]; }
        if (motion) requestAnimationFrame(breathe);
      };
      if (motion) requestAnimationFrame(breathe); else bWrap.style.setProperty('--b', '.8');
    }
    var openEl = root.querySelector('[data-wl-open]');
    if (openEl) {
      var dayEl = root.querySelector('[data-wl-day]');
      var countEl = root.querySelector('[data-wl-count]');
      var pill = openEl.closest('.wl-pill');
      // Mon–Thu 7–17, Fri 7–15, closed weekends
      var hours = { 1: [7, 17], 2: [7, 17], 3: [7, 17], 4: [7, 17], 5: [7, 15] };
      var fmt = function (h) { return (h > 12 ? h - 12 : h) + (h >= 12 ? ' pm' : ' am'); };
      var pad = function (n) { return (n < 10 ? '0' : '') + n; };
      var update = function () {
        var now = new Date(), d = now.getDay(), h = hours[d];
        var mins = now.getHours() * 60 + now.getMinutes();
        dayEl.textContent = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][d];
        if (h && mins >= h[0] * 60 && mins < h[1] * 60) {
          var left = h[1] * 3600 - (now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds());
          openEl.textContent = 'Open until ' + fmt(h[1]);
          countEl.textContent = 'closes in ' + pad(Math.floor(left / 3600)) + ':' + pad(Math.floor(left % 3600 / 60)) + ':' + pad(left % 60);
          pill.classList.remove('is-closed');
        } else {
          var nd = d, guard = 0;
          do { nd = (nd + 1) % 7; guard++; } while (!hours[nd] && guard < 7);
          var opensToday = h && mins < h[0] * 60;
          openEl.textContent = 'Closed now';
          countEl.textContent = 'opens ' + (opensToday ? 'today' : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][nd]) + ' at 7 am';
          pill.classList.add('is-closed');
        }
      };
      update();
      setInterval(update, 1000);
    }

    // Medication tabs
    q('[data-wl-tabs]').forEach(function (list) {
      var tabs = q('[role="tab"]', list);
      tabs.forEach(function (t, i) {
        t.addEventListener('click', function () {
          tabs.forEach(function (o) {
            var on = o === t;
            o.setAttribute('aria-selected', on ? 'true' : 'false');
            o.tabIndex = on ? 0 : -1;
            var panel = document.getElementById(o.getAttribute('aria-controls'));
            panel.hidden = !on;
            if (on && motion) {
              gsap.fromTo(q('.wl-row', panel), { opacity: 0, y: 16 },
                { opacity: 1, y: 0, duration: 0.55, ease: 'power3.out', stagger: 0.06, overwrite: true });
            }
          });
        });
        t.addEventListener('keydown', function (e) {
          var k = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
          if (!k) return;
          e.preventDefault();
          var n = tabs[(i + k + tabs.length) % tabs.length];
          n.focus(); n.click();
        });
      });
    });

    // FAQ: one answer open at a time, opening and closing smoothly.
    q('.wl-faq__list').forEach(function (list) {
      var items = q('.wl-q', list);
      function shut(d) {
        if (!d.open) return;
        var body = d.querySelector('.wl-q__body');
        if (!motion) { d.open = false; return; }
        gsap.fromTo(body, { height: body.offsetHeight }, { height: 0, duration: 0.45, ease: 'power3.inOut', overwrite: true,
          onComplete: function () { d.open = false; body.style.height = ''; } });
      }
      items.forEach(function (d) {
        d.querySelector('summary').addEventListener('click', function (e) {
          e.preventDefault();
          if (d.open) { shut(d); return; }
          items.forEach(function (o) { if (o !== d) shut(o); });
          d.open = true;
          if (!motion) return;
          var body = d.querySelector('.wl-q__body');
          gsap.fromTo(body, { height: 0 }, { height: 'auto', duration: 0.55, ease: 'power3.inOut', overwrite: true });
          gsap.fromTo(body.firstElementChild, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out', delay: 0.12 });
        });
      });
    });

    // Sticky steps: the step in the middle of the screen drives the photo.
    q('[data-wl-sticky]').forEach(function (wrap) {
      var items = q('[data-wl-stepitem]', wrap);
      var imgs = q('.wl-sticky__frame img', wrap);
      var cap = wrap.querySelector('[data-wl-sticky-cap]');
      var set = function (i) {
        items.forEach(function (el, k) { el.classList.toggle('is-on', k === i); });
        imgs.forEach(function (el, k) { el.classList.toggle('is-on', k === i); });
        if (cap) cap.textContent = items[i].querySelector('h3').textContent;
      };
      set(0);
      var io = new IntersectionObserver(function (en) {
        en.forEach(function (e) { if (e.isIntersecting) set(items.indexOf(e.target)); });
      }, { rootMargin: '-45% 0px -45% 0px' });
      items.forEach(function (el) { io.observe(el); });
    });

    if (motion && fine) {
      // the other large photos ease in a little on hover
      q('[data-wl-img]').forEach(function (fig) {
        fig.addEventListener('mouseenter', function () { gsap.to(fig, { '--h': 1.06, duration: 1.2, ease: 'power3.out' }); });
        fig.addEventListener('mouseleave', function () { gsap.to(fig, { '--h': 1, duration: 1.2, ease: 'power3.out' }); });
      });
    }

    if (!fx) return;

    // Scroll reveals
    q('[data-wl-rise]').filter(function (el) { return !hero || !hero.contains(el); }).forEach(function (el) {
      gsap.fromTo(el, { opacity: 0, y: 26 }, {
        opacity: 1, y: 0, duration: 1, ease: 'power3.out',
        scrollTrigger: { trigger: el, start: 'top 90%', once: true }
      });
    });
    q('[data-wl-heading]').forEach(function (h) {
      var em = h.querySelector('em');
      gsap.fromTo(h, { opacity: 0, y: 34 }, {
        opacity: 1, y: 0, duration: 1.1, ease: 'power3.out',
        scrollTrigger: { trigger: h, start: 'top 88%', once: true }
      });
      if (em) gsap.fromTo(em, { '--u': 0 }, {
        '--u': 1, duration: 1.1, ease: 'power3.inOut', delay: 0.5,
        scrollTrigger: { trigger: h, start: 'top 88%', once: true }
      });
    });
    q('[data-wl-img]').forEach(function (fig) {
      gsap.fromTo(fig, { '--s': 1.16 }, {
        '--s': 1, ease: 'none',
        scrollTrigger: { trigger: fig, start: 'top bottom', end: 'bottom top', scrub: true }
      });
      gsap.fromTo(fig, { clipPath: 'inset(12% 8% 0% 8% round 28px)' }, {
        clipPath: 'inset(0% 0% 0% 0% round 0px)', duration: 1.4, ease: 'power3.out',
        scrollTrigger: { trigger: fig, start: 'top 85%', once: true },
        onComplete: function () { fig.style.clipPath = ''; }
      });
    });
    var cardGroups = [];
    q('[data-wl-card]').forEach(function (c) {
      var g = cardGroups.filter(function (x) { return x.p === c.parentElement; })[0];
      if (!g) cardGroups.push(g = { p: c.parentElement, c: [] });
      g.c.push(c);
    });
    cardGroups.forEach(function (g) {
      gsap.fromTo(g.c, { opacity: 0, y: 50 }, {
        opacity: 1, y: 0, duration: 1.1, ease: 'power3.out', stagger: 0.12,
        scrollTrigger: { trigger: g.p, start: 'top 85%', once: true },
        clearProps: 'transform'
      });
    });
    // the navy hover fill on the plan steps carries a light that follows the pointer
    q('.wl-steps4 li').forEach(function (c) {
      c.addEventListener('pointermove', function (e) {
        var r = c.getBoundingClientRect();
        c.style.setProperty('--mx', (e.clientX - r.left) + 'px');
        c.style.setProperty('--my', (e.clientY - r.top) + 'px');
      });
    });
    q('[data-wl-letters]').forEach(function (h) {
      // split into characters, keeping words (and the italic accent) together
      var chars = [];
      Array.prototype.slice.call(h.childNodes).forEach(function (node) {
        var host = node.nodeType === 1 ? node : null;
        var text = node.textContent;
        var frag = document.createDocumentFragment();
        text.split(/(\s+)/).forEach(function (w) {
          if (!w) return;
          if (/^\s+$/.test(w)) { frag.appendChild(document.createTextNode(' ')); return; }
          var word = document.createElement('span');
          word.style.display = 'inline-block';
          word.style.whiteSpace = 'nowrap';
          w.split('').forEach(function (ch) {
            var c = document.createElement('span');
            c.className = 'wl-ch'; c.textContent = ch;
            word.appendChild(c); chars.push(c);
          });
          frag.appendChild(word);
        });
        if (host) { host.textContent = ''; host.appendChild(frag); }
        else { h.replaceChild(frag, node); }
      });
      gsap.fromTo(chars, { opacity: 0, yPercent: 60, rotate: 6 }, {
        opacity: 1, yPercent: 0, rotate: 0, duration: 0.9, ease: 'power3.out', stagger: 0.022,
        scrollTrigger: { trigger: h, start: 'top 85%', once: true }
      });
    });
    q('[data-wl-end]').forEach(function (end) {
      // photo drifts slower than the page, the copy a touch faster
      gsap.fromTo(end.querySelector('.wl-end__media'), { yPercent: -12 }, {
        yPercent: 12, ease: 'none',
        scrollTrigger: { trigger: end, start: 'top bottom', end: 'bottom top', scrub: true }
      });
      gsap.fromTo(end.querySelector('.wl-end__in'), { y: 60 }, {
        y: -40, ease: 'none',
        scrollTrigger: { trigger: end, start: 'top bottom', end: 'bottom top', scrub: true }
      });
    });
    var marq = root.querySelector('.wl-marq');
    if (marq) gsap.fromTo(marq, { borderRadius: '0px 0px 0 0' }, {
      borderRadius: '28px 28px 0 0', ease: 'none',
      scrollTrigger: { trigger: marq, start: 'top bottom', end: 'top 60%', scrub: true }
    });
  }());

  /* ------------------------------------------------------ hormone page */
  (function calmPage() {
    var root = document.querySelector('.calm');
    if (!root) return;
    var q = function (sel, ctx) { return Array.prototype.slice.call((ctx || root).querySelectorAll(sel)); };
    var fx = hasGSAP && !still && ScrollTrigger;

    // Wrap each character (keeping words and any <em> together) so it can be
    // animated on its own.
    function chars(el) {
      var out = [];
      Array.prototype.slice.call(el.childNodes).forEach(function (node) {
        var host = node.nodeType === 1 ? node : null;
        var frag = document.createDocumentFragment();
        node.textContent.split(/(\s+)/).forEach(function (w) {
          if (!w) return;
          if (/^\s+$/.test(w)) { frag.appendChild(document.createTextNode(' ')); return; }
          var word = document.createElement('span');
          word.style.display = 'inline-block';
          word.style.whiteSpace = 'nowrap';
          w.split('').forEach(function (c) {
            var sp = document.createElement('span');
            sp.className = 'cm-ch'; sp.textContent = c;
            word.appendChild(sp); out.push(sp);
          });
          frag.appendChild(word);
        });
        if (host) { host.textContent = ''; host.appendChild(frag); } else el.replaceChild(frag, node);
      });
      return out;
    }

    // FAQ: one open at a time, eased open and shut.
    q('[data-cm-faq]').forEach(function (list) {
      var items = q('.cm-q', list);
      function shut(d) {
        if (!d.open) return;
        var body = d.querySelector('.cm-q__body');
        if (!fx) { d.open = false; return; }
        gsap.fromTo(body, { height: body.offsetHeight }, { height: 0, duration: 0.45, ease: 'power3.inOut', overwrite: true,
          onComplete: function () { d.open = false; body.style.height = ''; } });
      }
      items.forEach(function (d) {
        d.querySelector('summary').addEventListener('click', function (e) {
          e.preventDefault();
          if (d.open) { shut(d); return; }
          items.forEach(function (o) { if (o !== d) shut(o); });
          d.open = true;
          if (!fx) return;
          var body = d.querySelector('.cm-q__body');
          gsap.fromTo(body, { height: 0 }, { height: 'auto', duration: 0.55, ease: 'power3.inOut', overwrite: true });
          gsap.fromTo(body.firstElementChild, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out', delay: 0.12 });
        });
      });
    });

    // Biote steps: the one in the middle of the screen is lit.
    var steps = q('[data-cm-step]');
    if (steps.length) {
      var io = new IntersectionObserver(function (en) {
        en.forEach(function (e) { if (e.isIntersecting) steps.forEach(function (s) { s.classList.toggle('is-on', s === e.target); }); });
      }, { rootMargin: '-45% 0px -45% 0px' });
      steps.forEach(function (s) { io.observe(s); });
      steps[0].classList.add('is-on');
    }

    if (!fx) return;

    // Hero: while the photo stays pinned, the title resolves out of blur one
    // letter at a time, the side copy follows and the big word rises in.
    var hero = root.querySelector('[data-cm-hero]');
    if (hero && window.matchMedia('(min-width:641px)').matches) {
      var t = root.querySelector('[data-cm-scrub]');
      var cs = chars(t);
      var tl = gsap.timeline({
        scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom bottom', scrub: 0.8 }
      });
      // the title resolves on arrival; scrolling brings in the rest
      gsap.fromTo(cs, { opacity: 0, filter: 'blur(12px)' }, {
        opacity: 1, filter: 'blur(0px)', duration: 1.1, ease: 'power2.out', stagger: 0.035, delay: 0.25 });
      tl.fromTo(root.querySelector('[data-cm-hero-img]'), { '--z': 1.12 }, { '--z': 1, ease: 'none', duration: 1 }, 0)
        .fromTo(q('[data-cm-scrub-p]', hero), { opacity: 0, y: 30, filter: 'blur(6px)' }, { opacity: 1, y: 0, filter: 'blur(0px)', stagger: 0.08, duration: 0.25 }, 0.1)
        .fromTo(root.querySelector('[data-cm-word]'), { yPercent: 70, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.4, ease: 'power2.out' }, 0.35);
    }

    // Statement: words darken as they pass through the viewport.
    q('[data-cm-words]').forEach(function (el) {
      var words = el.textContent.trim().split(/\s+/);
      el.innerHTML = words.map(function (w) { return '<span class="cm-w">' + w + '</span>'; }).join(' ');
      gsap.fromTo(el.querySelectorAll('.cm-w'), { color: '#C2C6DF' }, {
        color: '#11153A', stagger: 0.08, ease: 'none',
        scrollTrigger: { trigger: el, start: 'top 80%', end: 'bottom 45%', scrub: true }
      });
    });

    // Headings: letters sharpen in from a soft blur when they arrive.
    q('[data-cm-chars]').forEach(function (h) {
      var cs = chars(h);
      gsap.fromTo(cs, { opacity: 0, filter: 'blur(8px)', yPercent: 30 }, {
        opacity: 1, filter: 'blur(0px)', yPercent: 0, duration: 0.8, ease: 'power3.out', stagger: 0.018,
        scrollTrigger: { trigger: h, start: 'top 88%', once: true }
      });
    });
    q('[data-cm-up]').forEach(function (el) {
      gsap.fromTo(el, { opacity: 0, y: 28 }, {
        opacity: 1, y: 0, duration: 1, ease: 'power3.out',
        scrollTrigger: { trigger: el, start: 'top 92%', once: true }
      });
    });
    q('[data-cm-reveal]').forEach(function (fig) {
      var img = fig.querySelector('img');
      gsap.fromTo(fig, { clipPath: 'inset(18% 12% 18% 12% round 28px)' }, {
        clipPath: 'inset(0% 0% 0% 0% round 28px)', duration: 1.4, ease: 'power3.out',
        scrollTrigger: { trigger: fig, start: 'top 85%', once: true }
      });
      gsap.fromTo(img, { scale: 1.25 }, { scale: 1, duration: 1.6, ease: 'power3.out',
        scrollTrigger: { trigger: fig, start: 'top 85%', once: true } });
    });

    var ctaImg = root.querySelector('[data-cm-cta-img]');
    if (ctaImg) gsap.fromTo(ctaImg, { '--z': 1.18 }, { '--z': 1, ease: 'none',
      scrollTrigger: { trigger: ctaImg.parentElement, start: 'top bottom', end: 'bottom top', scrub: true } });
  }());

  /* ---------------------------------------------------- aesthetics page */
  (function dermPage() {
    var root = document.querySelector('.derm');
    if (!root) return;
    var q = function (sel, ctx) { return Array.prototype.slice.call((ctx || root).querySelectorAll(sel)); };
    var fx = hasGSAP && !still && ScrollTrigger;

    // FAQ: one open at a time, eased open and shut.
    var faq = q('.dm-q');
    function shut(d) {
      if (!d.open) return;
      var body = d.querySelector('.dm-q__body');
      if (!fx) { d.open = false; return; }
      gsap.fromTo(body, { height: body.offsetHeight }, { height: 0, duration: 0.5, ease: 'power3.inOut', overwrite: true,
        onComplete: function () { d.open = false; body.style.height = ''; } });
    }
    faq.forEach(function (d) {
      d.querySelector('summary').addEventListener('click', function (e) {
        e.preventDefault();
        if (d.open) { shut(d); return; }
        faq.forEach(function (o) { if (o !== d) shut(o); });
        d.open = true;
        if (!fx) return;
        var body = d.querySelector('.dm-q__body');
        gsap.fromTo(body, { height: 0 }, { height: 'auto', duration: 0.6, ease: 'power3.inOut', overwrite: true });
        gsap.fromTo(body.firstElementChild, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out', delay: 0.15 });
      });
    });

    // A service card fills in the treatment on the appointment form.
    var pick = root.querySelector('#ae-treatment');
    q('[data-treatment]').forEach(function (card) {
      card.addEventListener('click', function () { if (pick) pick.value = card.getAttribute('data-treatment'); });
    });

    if (!fx) return;

    function chars(el) {
      var out = [];
      Array.prototype.slice.call(el.childNodes).forEach(function (node) {
        var host = node.nodeType === 1 ? node : null;
        var frag = document.createDocumentFragment();
        node.textContent.split(/(\s+)/).forEach(function (w) {
          if (!w) return;
          if (/^\s+$/.test(w)) { frag.appendChild(document.createTextNode(' ')); return; }
          var word = document.createElement('span');
          word.style.display = 'inline-block';
          word.style.whiteSpace = 'nowrap';
          w.split('').forEach(function (c) {
            var sp = document.createElement('span');
            sp.style.display = 'inline-block';
            sp.textContent = c;
            word.appendChild(sp); out.push(sp);
          });
          frag.appendChild(word);
        });
        if (host) { host.textContent = ''; host.appendChild(frag); } else el.replaceChild(frag, node);
      });
      return out;
    }

    // Hero: the title rises letter by letter, the photo opens up and the
    // treatment wheel sweeps in, then turns as the page scrolls.
    var hero = root.querySelector('[data-dm-hero]');
    if (hero) {
      var title = hero.querySelector('[data-dm-title]');
      gsap.fromTo(chars(title), { opacity: 0, yPercent: 70, rotate: 5 }, {
        opacity: 1, yPercent: 0, rotate: 0, duration: 1, ease: 'power3.out', stagger: 0.025, delay: 0.1 });
      gsap.fromTo(q('[data-dm-up]', hero), { opacity: 0, y: 24 }, {
        opacity: 1, y: 0, duration: 0.9, ease: 'power3.out', stagger: 0.1, delay: 0.45 });
      var stage = hero.querySelector('[data-dm-stage]');
      var wheel = hero.querySelector('[data-dm-wheel]');
      gsap.fromTo(stage, { clipPath: 'inset(8% 5% 0% 5% round 30px)' }, {
        clipPath: 'inset(0% 0% 0% 0% round 30px)', duration: 1.5, ease: 'power3.out', delay: 0.3,
        onComplete: function () { stage.style.clipPath = ''; } });
      gsap.fromTo(stage.querySelector('.dm-stage__img'), { '--z': 1.25 }, { '--z': 1.04, duration: 2, ease: 'power3.out', delay: 0.3 });
      gsap.fromTo(wheel, { '--spin': '-60deg' }, { '--spin': '0deg', duration: 2.2, ease: 'expo.out', delay: 0.5 });
      gsap.fromTo(q('.dm-chip', wheel), { opacity: 0 }, { opacity: 1, duration: 0.8, ease: 'power2.out', stagger: 0.07, delay: 0.6 });
      // the scrub lags a little behind the scroll so the turn glides rather than ticks
      gsap.fromTo(wheel, { '--tilt': '10deg' }, { '--tilt': '-16deg', ease: 'none',
        scrollTrigger: { trigger: stage, start: 'top 75%', end: 'bottom top', scrub: 1.4 } });
      gsap.to(stage.querySelector('.dm-stage__img'), { yPercent: 8, ease: 'none',
        scrollTrigger: { trigger: stage, start: 'top top', end: 'bottom top', scrub: true } });
    }

    // Statement: words fill in as it scrolls through; the photos drift.
    q('[data-dm-words]').forEach(function (el) {
      var words = [];
      Array.prototype.slice.call(el.childNodes).forEach(function (node) {
        if (node.nodeType !== 3) return;
        var frag = document.createDocumentFragment();
        node.textContent.split(/(\s+)/).forEach(function (w) {
          if (!w) return;
          if (/^\s+$/.test(w)) { frag.appendChild(document.createTextNode(' ')); return; }
          var sp = document.createElement('span');
          sp.textContent = w;
          frag.appendChild(sp); words.push(sp);
        });
        el.replaceChild(frag, node);
      });
      gsap.fromTo(words, { color: '#C2C6DF' }, { color: '#11153A', ease: 'none', stagger: 0.1,
        scrollTrigger: { trigger: el, start: 'top 80%', end: 'bottom 45%', scrub: true } });
      gsap.fromTo(q('.dm-inline', el), { width: 0 }, { width: '1.9em', duration: 1, ease: 'power3.out', stagger: 0.2,
        scrollTrigger: { trigger: el, start: 'top 70%', once: true } });
    });
    q('[data-dm-float] [data-speed]').forEach(function (fig) {
      var sp = parseFloat(fig.getAttribute('data-speed'));
      gsap.fromTo(fig, { yPercent: sp * -100 }, { yPercent: sp * 100, ease: 'none',
        scrollTrigger: { trigger: fig.parentElement, start: 'top bottom', end: 'bottom top', scrub: true } });
    });

    q('[data-dm-chars]').forEach(function (h) {
      gsap.fromTo(chars(h), { opacity: 0, yPercent: 60, rotate: 6 }, {
        opacity: 1, yPercent: 0, rotate: 0, duration: 0.9, ease: 'power3.out', stagger: 0.02,
        scrollTrigger: { trigger: h, start: 'top 86%', once: true } });
    });
    q('[data-dm-up]').filter(function (el) { return !hero || !hero.contains(el); }).forEach(function (el) {
      gsap.fromTo(el, { opacity: 0, y: 28 }, { opacity: 1, y: 0, duration: 1, ease: 'power3.out',
        scrollTrigger: { trigger: el, start: 'top 90%', once: true } });
    });
    q('[data-dm-img]').forEach(function (fig) {
      gsap.fromTo(fig, { clipPath: 'inset(10% 8% 0% 8% round 30px)' }, {
        clipPath: 'inset(0% 0% 0% 0% round 30px)', duration: 1.4, ease: 'power3.out',
        scrollTrigger: { trigger: fig, start: 'top 85%', once: true },
        onComplete: function () { fig.style.clipPath = ''; } });
      gsap.fromTo(fig.querySelector('img'), { scale: 1.2 }, { scale: 1, duration: 1.8, ease: 'power3.out',
        scrollTrigger: { trigger: fig, start: 'top 85%', once: true } });
    });

    // Bento: cards rise in turn, bars fill, the little portraits bob.
    q('[data-dm-bento]').forEach(function (grid) {
      gsap.fromTo(grid.children, { opacity: 0, y: 50 }, { opacity: 1, y: 0, duration: 1.1, ease: 'power3.out', stagger: 0.1,
        clearProps: 'transform', scrollTrigger: { trigger: grid, start: 'top 82%', once: true } });
      gsap.fromTo(q('.dm-bars i', grid), { '--p': 0 }, { '--p': 1, duration: 1.4, ease: 'power3.out', stagger: 0.15,
        scrollTrigger: { trigger: grid.querySelector('.dm-bars'), start: 'top 85%', once: true } });
      q('.dm-bub', grid).forEach(function (b, i) {
        gsap.to(b, { y: i % 2 ? 8 : -8, duration: 2.4 + i * 0.4, ease: 'sine.inOut', yoyo: true, repeat: -1 });
      });
    });

    q('[data-dm-cta]').forEach(function (cta) {
      gsap.fromTo(cta.querySelector('.dm-cta__media'), { yPercent: -12 }, { yPercent: 12, ease: 'none',
        scrollTrigger: { trigger: cta, start: 'top bottom', end: 'bottom top', scrub: true } });
      gsap.fromTo(cta.querySelector('.dm-cta__in'), { y: 60 }, { y: -40, ease: 'none',
        scrollTrigger: { trigger: cta, start: 'top bottom', end: 'bottom top', scrub: true } });
    });
  }());

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
  ['.icard-grid', '.pcard-grid', '.loc-grid', '.prov-grid', '.values__grid', '.about-cards', '.mvp__grid', '.whygrid__cards', '.signs__grid', '.steps'].forEach(function (sel) {
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

  /* ------------------------------------------- about cards (restored) */
  // The feature card's photo leans toward the cursor; pointer-fine devices only.
  if (window.matchMedia('(hover:hover) and (pointer:fine)').matches) {
    document.querySelectorAll('[data-tilt]').forEach(function (card) {
      var bg = card.querySelector('[data-acard-bg]');
      if (!bg) return;
      card.addEventListener('mousemove', function (e) {
        var r = card.getBoundingClientRect();
        gsap.to(bg, {
          xPercent: ((e.clientX - (r.left + r.width / 2)) / r.width) * -6,
          yPercent: ((e.clientY - (r.top + r.height / 2)) / r.height) * -6,
          duration: 0.7, ease: 'power3.out', overwrite: 'auto'
        });
      });
      card.addEventListener('mouseleave', function () {
        gsap.to(bg, { xPercent: 0, yPercent: 0, duration: 0.9, ease: 'power3.out', overwrite: 'auto' });
      });
    });
  }
  // Service rows slide in one after another on hover.
  document.querySelectorAll('[data-asvc]').forEach(function (list) {
    var card = list.closest('.acard');
    var rows = list.querySelectorAll('.asvc__row');
    if (!card || !rows.length) return;
    card.addEventListener('mouseenter', function () {
      gsap.to(rows, { x: 7, duration: 0.5, ease: 'power3.out', stagger: 0.05, overwrite: 'auto' });
    });
    card.addEventListener('mouseleave', function () {
      gsap.to(rows, { x: 0, duration: 0.45, ease: 'power3.out', stagger: 0.03, overwrite: 'auto' });
    });
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
