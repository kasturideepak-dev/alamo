/* Alamo Primary Care — prototype interactions
   GSAP + ScrollTrigger + Lenis. No build step. */
(function () {
  'use strict';

  /* ?static=1 disables motion — handy for design review and print/PDF capture */
  var forcedStatic = /[?&]static=1/.test(location.search);
  var reduced = forcedStatic || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasGSAP = typeof window.gsap !== 'undefined';
  if (hasGSAP && window.ScrollTrigger) gsap.registerPlugin(ScrollTrigger);

  /* ---------------------------------------------------------------- scroll */
  var lenis = null;
  if (!reduced && typeof window.Lenis !== 'undefined') {
    lenis = new Lenis({ duration: 1.05, lerp: 0.1, wheelMultiplier: 0.95, smoothWheel: true });
    if (hasGSAP) {
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
      gsap.ticker.lagSmoothing(0);
    } else {
      requestAnimationFrame(function raf(t) { lenis.raf(t); requestAnimationFrame(raf); });
    }
  }

  /* Browsers pause requestAnimationFrame while a document is hidden — a background
     tab, or an embedded preview pane that is not on screen. GSAP, ScrollTrigger and
     Lenis all ride on rAF, so everything freezes and then, with lag smoothing off,
     lurches when the page comes back. Resync on return instead. */
  if (hasGSAP) {
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) return;
      if (lenis) { lenis.resize(); }
      if (window.ScrollTrigger) { ScrollTrigger.refresh(); ScrollTrigger.update(); }
    });
  }

  /* Backstop: keep scroll-linked animations updating even if Lenis is absent or
     its rAF loop stalls. ScrollTrigger.update is idempotent and cheap. */
  if (hasGSAP && window.ScrollTrigger) {
    window.addEventListener('scroll', function () { ScrollTrigger.update(); }, { passive: true });
  }

  function $(s, c) { return (c || document).querySelector(s); }
  function $$(s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); }

  /* ---------------------------------------------------------------- header */
  var header = $('.site-header');
  if (header) {
    var overlay = header.classList.contains('site-header--overlay');
    /* An overlay header is only transparent while it sits on untouched hero.
       As soon as anything scrolls under it, it becomes the solid bar. */
    var mark = overlay ? 64 : 8;
    var onScroll = function () {
      header.classList.toggle('is-stuck', window.scrollY > mark);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* Smooth in-page anchors */
  $$('a[href^="#"]').forEach(function (a) {
    var id = a.getAttribute('href');
    if (!id || id === '#' || !$(id)) return;
    a.addEventListener('click', function (e) {
      e.preventDefault();
      closeMenu();
      if (lenis) lenis.scrollTo(id, { offset: -90 });
      else $(id).scrollIntoView({ behavior: 'smooth' });
    });
  });

  /* -------------------------------------------------------------- megamenu */
  $$('.nav__item--menu').forEach(function (item) {
    var close;
    item.addEventListener('mouseenter', function () {
      clearTimeout(close);
      $$('.nav__item--menu').forEach(function (o) { if (o !== item) o.classList.remove('is-open'); });
      item.classList.add('is-open');
    });
    item.addEventListener('mouseleave', function () {
      close = setTimeout(function () { item.classList.remove('is-open'); }, 140);
    });
    var trigger = $('.nav__link--has-menu', item);
    if (trigger) trigger.addEventListener('click', function (e) {
      e.preventDefault();
      item.classList.toggle('is-open');
    });
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      $$('.nav__item--menu').forEach(function (i) { i.classList.remove('is-open'); });
      closeMenu();
    }
  });

  /* --------------------------------------------------------- mega menu */
  /* Open: columns and links stagger in. Hovering a service crossfades the
     preview card to that service's photo and caption. */
  $$('[data-megamenu]').forEach(function (menu) {
    var item = menu.closest('.nav__item--menu');
    var links = $$('.megamenu__link', menu);
    var cols = Array.prototype.slice.call(menu.children);
    var feature = $('[data-mm-feature]', menu);
    var capTitle = $('[data-mm-cap-title]', menu);
    var capSub = $('[data-mm-cap-sub]', menu);
    var slots = $$('[data-mm-slot]', menu);

    /* preview swap */
    if (feature && slots.length) {
      var shown = slots[0];
      var show = function (name, title, sub) {
        var next = slots.filter(function (im) { return im.dataset.mmSlot === name; })[0];
        if (!next || next === shown) { return; }
        if (hasGSAP && !reduced) {
          gsap.to(shown, { opacity: 0, duration: 0.32, ease: 'power2.out', overwrite: true });
          gsap.fromTo(next, { opacity: 0, scale: 1.06 },
            { opacity: 1, scale: 1, duration: 0.5, ease: 'power3.out', overwrite: true });
        } else {
          shown.classList.remove('is-on');
          next.classList.add('is-on');
        }
        shown = next;
        if (capTitle && title) {
          if (hasGSAP && !reduced) {
            gsap.fromTo([capTitle, capSub], { opacity: 0, y: 8 },
              { opacity: 1, y: 0, duration: 0.4, ease: 'power3.out', stagger: 0.05, overwrite: true });
          }
          capTitle.innerHTML = title;
          if (capSub && sub) capSub.innerHTML = sub + ' <svg><use href="#i-arrow-r"/></svg>';
        }
      };
      links.forEach(function (a) {
        if (!a.dataset.mmImg) return;
        a.addEventListener('mouseenter', function () {
          show(a.dataset.mmImg, a.dataset.mmTitle, a.dataset.mmSub);
        });
        a.addEventListener('focus', function () {
          show(a.dataset.mmImg, a.dataset.mmTitle, a.dataset.mmSub);
        });
      });
    }

    /* open animation */
    if (!hasGSAP || reduced || !item) return;
    var tl = gsap.timeline({ paused: true, defaults: { ease: 'power3.out' } });
    tl.from(cols, { opacity: 0, y: 14, duration: 0.45, stagger: 0.06 }, 0)
      .from(links, { opacity: 0, y: 10, duration: 0.38, stagger: 0.016 }, 0.06);
    var obs = new MutationObserver(function () {
      if (item.classList.contains('is-open')) tl.play(0);
      else tl.pause(0);
    });
    obs.observe(item, { attributes: true, attributeFilter: ['class'] });
  });

  /* ---------------------------------------------------------------- drawer */
  var toggle = $('.nav__toggle');
  function closeMenu() {
    document.body.classList.remove('menu-open');
    if (lenis) lenis.start();
  }
  if (toggle) {
    toggle.addEventListener('click', function () {
      var open = document.body.classList.toggle('menu-open');
      toggle.setAttribute('aria-expanded', String(open));
      if (lenis) open ? lenis.stop() : lenis.start();
    });
  }
  $$('.drawer__link[data-accordion]').forEach(function (link) {
    link.addEventListener('click', function (e) {
      e.preventDefault();
      var sub = link.nextElementSibling;
      if (!sub) return;
      var open = sub.hasAttribute('hidden');
      sub.toggleAttribute('hidden', !open);
    });
  });

  /* ------------------------------------------------------------ split text */
  function splitLines(el) {
    if (el.dataset.split === 'done') return $$('.split-word > span', el);

    var frag = document.createDocumentFragment();
    var addWord = function (text, cls) {
      var outer = document.createElement('span');
      outer.className = 'split-word' + (cls ? ' ' + cls : '');
      outer.style.display = 'inline-block';
      outer.style.overflow = 'hidden';
      outer.style.verticalAlign = 'top';
      var inner = document.createElement('span');
      inner.style.display = 'inline-block';
      inner.textContent = text;
      outer.appendChild(inner);
      frag.appendChild(outer);
      frag.appendChild(document.createTextNode(' '));
    };
    /* walk children rather than reading textContent, so an inline highlight
       (e.g. <span class="hl">) keeps its class on each of its words */
    Array.prototype.slice.call(el.childNodes).forEach(function (node) {
      var cls = node.nodeType === 1 ? (node.getAttribute('class') || '') : '';
      (node.textContent || '').split(/[ \t\r\n]+/).forEach(function (w) {
        if (w) addWord(w, cls);
      });
    });

    el.textContent = '';
    el.appendChild(frag);
    el.dataset.split = 'done';
    return $$('.split-word > span', el);
  }

  /* --------------------------------------------------------------- reveals */
  if (!hasGSAP || reduced) {
    $$('[data-reveal]').forEach(function (el) { el.style.opacity = 1; });
  } else {
    gsap.set('[data-reveal]', { opacity: 0 });

    /* headline word reveal */
    $$('[data-reveal="title"]').forEach(function (el) {
      var inner = splitLines(el);
      gsap.set(el, { opacity: 1 });
      gsap.set(inner, { yPercent: 115 });
      ScrollTrigger.create({
        trigger: el, start: 'top 88%', once: true,
        onEnter: function () {
          gsap.to(inner, { yPercent: 0, duration: 1.05, ease: 'power3.out', stagger: 0.035 });
        }
      });
    });

    /* generic fade-up, honours data-delay + data-stagger on children */
    $$('[data-reveal="up"]').forEach(function (el) {
      ScrollTrigger.create({
        trigger: el, start: 'top 90%', once: true,
        onEnter: function () {
          gsap.to(el, {
            opacity: 1, y: 0, duration: 0.9, ease: 'power3.out',
            delay: parseFloat(el.dataset.delay || 0)
          });
        }
      });
      gsap.set(el, { y: 26 });
    });

    /* staggered groups */
    $$('[data-reveal="group"]').forEach(function (group) {
      var kids = Array.prototype.slice.call(group.children);
      gsap.set(group, { opacity: 1 });
      gsap.set(kids, { opacity: 0, y: 30 });
      ScrollTrigger.create({
        trigger: group, start: 'top 88%', once: true,
        onEnter: function () {
          gsap.to(kids, { opacity: 1, y: 0, duration: 0.85, ease: 'power3.out', stagger: 0.075 });
        }
      });
    });

    /* image mask reveal + slow parallax on the inner img */
    $$('[data-reveal="img"]').forEach(function (el) {
      var img = el.querySelector('img');
      gsap.set(el, { opacity: 1, clipPath: 'inset(0 0 100% 0)' });
      /* rests at 1.14 rather than 1 so the +-5% parallax never uncovers an edge */
      if (img) gsap.set(img, { scale: 1.26 });
      ScrollTrigger.create({
        trigger: el, start: 'top 86%', once: true,
        onEnter: function () {
          gsap.to(el, { clipPath: 'inset(0 0 0% 0)', duration: 1.15, ease: 'power3.inOut' });
          if (img) gsap.to(img, { scale: 1.14, duration: 1.5, ease: 'power3.out' });
        }
      });
      if (img) {
        gsap.fromTo(img, { yPercent: -5 }, {
          yPercent: 5, ease: 'none',
          scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true }
        });
      }
    });

    /* floating cards drift */
    $$('.gcard').forEach(function (el, i) {
      gsap.to(el, {
        y: i % 2 ? 10 : -10, duration: 3.2 + i * 0.4,
        ease: 'sine.inOut', repeat: -1, yoyo: true
      });
    });
  }

  /* ------------------------------------------- scroll-scrubbed text reveal */
  /* Words brighten one by one, tied to scroll position rather than a timer. */
  if (hasGSAP && !reduced) {
    $$('[data-reveal="scrub"]').forEach(function (el) {
      var words = splitLines(el);
      el.classList.add('is-scrub');
      gsap.set(el, { opacity: 1 });

      /* Reversible: scrolling down lights the words and clears the blur,
         scrolling up puts both back. scrub:true maps scroll position straight to
         progress with no ticker frames involved, so this stays correct even where
         requestAnimationFrame is throttled (background tab, embedded preview).

         The window is deliberately tight — done by the time the heading reaches
         52% of the viewport — so the blurred state only ever shows while the
         heading is low on screen, never once it is the thing you are reading. */
      ScrollTrigger.create({
        trigger: el, start: 'top 88%', end: 'top 52%', scrub: true,
        animation: gsap.to(words, { opacity: 1, ease: 'none', stagger: 0.5 })
      });

      ScrollTrigger.create({
        trigger: el, start: 'top 94%', end: 'top 62%', scrub: true,
        animation: gsap.fromTo(el, { filter: 'blur(9px)' }, { filter: 'blur(0px)', ease: 'none' })
      });
    });

    /* hero image drifts and settles as the hero scrolls away */
    var heroImg = $('[data-hero-img]');
    var heroSection = $('.hero-full');
    if (heroImg && heroSection) {
      gsap.fromTo(heroImg,
        { scale: 1.06, yPercent: -2 },
        {
          scale: 1.01, yPercent: 7, ease: 'none',
          scrollTrigger: { trigger: heroSection, start: 'top top', end: 'bottom top', scrub: true }
        });
    }
  } else {
    $$('[data-reveal="scrub"]').forEach(function (el) { el.style.opacity = 1; });
  }

  /* ---------------------------------------------------- marquee (GSAP loop) */
  /* Seamless loop: the run of words is duplicated until it covers twice the
     viewport, then x wraps with a modifier. ScrollTrigger feeds scroll velocity
     back into timeScale, so the band leans into the direction you are scrolling. */
  $$('[data-marquee]').forEach(function (track) {
    var group = track.firstElementChild;
    if (!group) return;
    var need = Math.ceil((window.innerWidth * 2) / Math.max(1, group.offsetWidth)) + 1;
    for (var i = 0; i < need; i++) track.appendChild(group.cloneNode(true));

    if (!hasGSAP || reduced) return;
    var half = group.offsetWidth;
    var wrap = gsap.utils.wrap(-half, 0);
    var loop = gsap.to(track, {
      x: -half,
      duration: half / 165,   /* ~165px/sec — readable movement at this type size */
      ease: 'none',
      repeat: -1,
      modifiers: { x: function (x) { return wrap(parseFloat(x)) + 'px'; } }
    });

    if (!window.ScrollTrigger) return;
    var reset;
    ScrollTrigger.create({
      onUpdate: function (self) {
        var v = gsap.utils.clamp(-6, 6, self.getVelocity() / 260);
        if (!v) return;
        loop.timeScale(v < 0 ? Math.min(-0.4, v) : Math.max(0.4, v));
        clearTimeout(reset);
        reset = setTimeout(function () {
          gsap.to(loop, { timeScale: 1, duration: 0.8, ease: 'power2.out', overwrite: true });
        }, 130);
      }
    });
  });

  /* ------------------------------------------- services: pinned horizontal */
  /* The band pins to the viewport and the card track travels sideways in step
     with the wheel; once the last card is in, the pin releases and the page
     carries on to the next section. Desktop only — touch keeps native swiping. */
  $$('[data-carousel]').forEach(function (root) {
    var track = $('[data-carousel-track]', root);
    if (!track) return;
    var section = root.closest('.treatments') || root.parentElement;
    var cards = Array.prototype.slice.call(track.children);
    var prev = $('[data-carousel-prev]');
    var next = $('[data-carousel-next]');

    var currentX = function () {
      return (hasGSAP ? parseFloat(gsap.getProperty(track, 'x')) : 0) || 0;
    };
    /* How far the track must travel so the last card finishes inset by the same
       gutter the first card starts at. Measured live so resize stays honest. */
    var distance = function () {
      if (!cards.length) return 0;
      var x = currentX();
      var left = cards[0].getBoundingClientRect().left - x;
      var right = cards[cards.length - 1].getBoundingClientRect().right - x;
      return Math.max(0, Math.round(right - window.innerWidth + left));
    };
    var step = function () {
      if (cards.length < 2) return 320;
      return cards[1].getBoundingClientRect().left - cards[0].getBoundingClientRect().left;
    };

    /* card entrance — animates the cards, never the track, so it cannot fight
       the horizontal tween */
    if (hasGSAP && window.ScrollTrigger && !reduced) {
      gsap.set(cards, { opacity: 0, y: 46 });
      ScrollTrigger.create({
        trigger: section, start: 'top 70%', once: true,
        onEnter: function () {
          gsap.to(cards, { opacity: 1, y: 0, duration: 0.9, ease: 'power3.out', stagger: 0.09 });
        }
      });
    }

    if (!hasGSAP || !window.ScrollTrigger || reduced || !gsap.matchMedia) {
      root.classList.add('is-free');           /* fall back to a scrollable track */
      return;
    }

    gsap.matchMedia().add('(min-width: 981px)', function () {
      var travel = gsap.to(track, { x: function () { return -distance(); }, ease: 'none' });
      var st = ScrollTrigger.create({
        trigger: section,
        start: 'top top',
        end: function () { return '+=' + distance(); },
        pin: true,
        pinSpacing: true,
        anticipatePin: 1,
        scrub: 0.8,
        invalidateOnRefresh: true,
        refreshPriority: 1,   /* refresh before the triggers that sit after it */
        animation: travel
      });

      /* arrows nudge the page scroll — 1px of scroll is 1px of card travel here */
      var nudge = function (dir) {
        var y = window.scrollY + dir * step();
        if (lenis) lenis.scrollTo(y, { duration: 0.7 });
        else window.scrollTo({ top: y, behavior: 'smooth' });
      };
      var onPrev = function () { nudge(-1); };
      var onNext = function () { nudge(1); };
      if (prev) prev.addEventListener('click', onPrev);
      if (next) next.addEventListener('click', onNext);

      return function () {
        if (prev) prev.removeEventListener('click', onPrev);
        if (next) next.removeEventListener('click', onNext);
        st.kill();
        travel.kill();
        gsap.set(track, { clearProps: 'x' });
      };
    });
  });

  /* -------------------------------------------- feature card pointer drift */
  /* The background photo leans toward the cursor, so the card feels live
     rather than a static gradient. Pointer-fine devices only. */
  if (hasGSAP && !reduced && window.matchMedia('(hover:hover) and (pointer:fine)').matches) {
    $$('[data-tilt]').forEach(function (card) {
      var bg = $('[data-acard-bg]', card);
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

  /* ---------------------------------------------- about card service rows */
  /* Rows slide in from the left one after another on hover. */
  $$('[data-asvc]').forEach(function (list) {
    var card = list.closest('.acard');
    var rows = $$('.asvc__row', list);
    if (!card || !rows.length || !hasGSAP || reduced) return;
    card.addEventListener('mouseenter', function () {
      gsap.to(rows, { x: 7, duration: 0.5, ease: 'power3.out', stagger: 0.05, overwrite: 'auto' });
    });
    card.addEventListener('mouseleave', function () {
      gsap.to(rows, { x: 0, duration: 0.45, ease: 'power3.out', stagger: 0.03, overwrite: 'auto' });
    });
  });

  /* ------------------------------------------------------------- accordion */
  $$('[data-accordion]').forEach(function (group) {
    var rows = $$('.wrow', group);
    if (!rows.length) return;

    var current = rows[0];
    var setOpen = function (row, animate) {
      if (row === current && animate) return;
      current = row;
      rows.forEach(function (r) {
        var body = $('.wrow__body', r);
        var head = $('.wrow__head', r);
        var copy = $('p', r);
        var on = r === row;
        r.classList.toggle('is-open', on);
        if (head) head.setAttribute('aria-expanded', String(on));
        if (!body) return;
        if (hasGSAP && !reduced && animate) {
          gsap.to(body, {
            height: on ? 'auto' : 0,
            duration: 0.52, ease: 'power3.inOut', overwrite: true
          });
          if (copy) gsap.to(copy, {
            opacity: on ? 1 : 0, y: on ? 0 : -4,
            duration: on ? 0.45 : 0.2, ease: 'power2.out',
            delay: on ? 0.08 : 0, overwrite: true
          });
        } else {
          body.style.height = on ? 'auto' : '0px';
          if (copy) { copy.style.opacity = on ? 1 : ''; copy.style.transform = ''; }
        }
      });
    };

    var hoverable = window.matchMedia('(hover:hover) and (pointer:fine)').matches;
    rows.forEach(function (r, i) {
      var body = $('.wrow__body', r);
      var copy = $('p', r);
      if (body && i > 0) {
        body.style.height = '0px';
        if (copy && hasGSAP && !reduced) gsap.set(copy, { opacity: 0, y: -4 });
      }
      var head = $('.wrow__head', r);
      if (head) head.addEventListener('click', function () { setOpen(r, true); });
      if (head) head.addEventListener('focus', function () { setOpen(r, true); });
      /* open on hover on pointer devices; click still works everywhere */
      if (hoverable) r.addEventListener('mouseenter', function () { setOpen(r, true); });
    });
    setOpen(rows[0], false);
  });

  /* -------------------------------------------------------------- count-up */
  $$('[data-count]').forEach(function (el) {
    var target = parseFloat(el.dataset.count);
    var pad = el.dataset.pad === 'true';
    var suffix = el.dataset.suffix || '';
    var render = function (v) {
      var n = Math.round(v);
      var s = pad && n < 10 ? '0' + n : n.toLocaleString('en-US');
      el.textContent = s + suffix;
    };
    render(0);
    if (!hasGSAP || reduced) { render(target); return; }
    var obj = { v: 0 };
    ScrollTrigger.create({
      trigger: el, start: 'top 92%', once: true,
      onEnter: function () {
        gsap.to(obj, { v: target, duration: 1.8, ease: 'power2.out', onUpdate: function () { render(obj.v); } });
      }
    });
  });

  /* ------------------------------------------------- services hover preview */
  var preview = $('.services__preview');
  if (preview && window.matchMedia('(hover:hover) and (min-width:981px)').matches) {
    var imgs = $$('img', preview);
    var px = 0, py = 0, cx = 0, cy = 0, shown = false, raf = null;
    var tick = function () {
      cx += (px - cx) * 0.14;
      cy += (py - cy) * 0.14;
      preview.style.transform = 'translate3d(' + (cx - preview.offsetWidth / 2) + 'px,' + (cy - preview.offsetHeight / 2) + 'px,0)';
      raf = requestAnimationFrame(tick);
    };
    var show = function (i) {
      imgs.forEach(function (im, j) { im.classList.toggle('is-on', j === i); });
      if (!shown) {
        shown = true;
        preview.style.opacity = 1;
        preview.style.transition = 'opacity .35s ease';
        if (!raf) raf = requestAnimationFrame(tick);
      }
    };
    var hide = function () {
      shown = false;
      preview.style.opacity = 0;
    };
    $$('.srow').forEach(function (row, i) {
      row.addEventListener('mouseenter', function () { show(i); });
      row.addEventListener('mousemove', function (e) { px = e.clientX + 38; py = e.clientY; });
    });
    var list = $('.services__list');
    if (list) {
      list.addEventListener('mousemove', function (e) { px = e.clientX + 38; py = e.clientY; });
      list.addEventListener('mouseleave', hide);
    }
  }

  /* --------------------------------------------------------- GSAP buttons */
  /* Every .btn gets a GSAP hover timeline; those tagged data-magnetic also
     lean toward the cursor. Pointer-fine devices only, motion settings honoured. */
  if (!reduced && hasGSAP && window.matchMedia('(hover:hover) and (pointer:fine)').matches) {
    $$('.btn').forEach(function (el) {
      var ico = el.querySelector('.btn__ico');
      var label = el.firstChild;
      var tl = gsap.timeline({ paused: true, defaults: { ease: 'power3.out' } });
      tl.to(el, { scale: 1.035, duration: 0.42 }, 0);
      if (ico) {
        tl.to(ico, { scale: 1.14, rotate: 10, duration: 0.5, ease: 'back.out(2.4)' }, 0);
      }
      el.addEventListener('mouseenter', function () { tl.play(); });
      el.addEventListener('mouseleave', function () { tl.reverse(); });
      el.addEventListener('mousedown', function () { gsap.to(el, { scale: 0.97, duration: 0.15 }); });
      el.addEventListener('mouseup', function () { gsap.to(el, { scale: 1.035, duration: 0.25 }); });

      var strength = parseFloat(el.dataset.magnetic);
      if (!strength) return;
      el.addEventListener('mousemove', function (e) {
        var r = el.getBoundingClientRect();
        gsap.to(el, {
          x: (e.clientX - (r.left + r.width / 2)) * strength,
          y: (e.clientY - (r.top + r.height / 2)) * strength,
          duration: 0.6, ease: 'power3.out'
        });
      });
      el.addEventListener('mouseleave', function () {
        gsap.to(el, { x: 0, y: 0, duration: 0.8, ease: 'elastic.out(1,0.45)' });
      });
    });
  }

  /* ------------------------------------------------------ hero intro (page) */
  var intro = $('[data-intro]');
  if (intro && hasGSAP && !reduced) {
    var tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
    var title = $('[data-intro-title]', intro);
    var bits = $$('[data-intro-item]', intro);
    if (title) {
      var w = splitLines(title);
      gsap.set(title, { opacity: 1 });
      gsap.set(w, { yPercent: 115 });
      tl.to(w, { yPercent: 0, duration: 1.1, stagger: 0.035 }, 0.15);
    }
    gsap.set(bits, { opacity: 0, y: 22 });
    tl.to(bits, { opacity: 1, y: 0, duration: 0.9, stagger: 0.08 }, 0.4);
    var media = $('[data-intro-media]', intro);
    if (media) {
      gsap.set(media, { opacity: 1, clipPath: 'inset(0 0 100% 0)' });
      tl.to(media, { clipPath: 'inset(0 0 0% 0)', duration: 1.2, ease: 'power3.inOut' }, 0.2);
      var mi = media.querySelector('img');
      if (mi) { gsap.set(mi, { scale: 1.2 }); tl.to(mi, { scale: 1, duration: 1.6 }, 0.2); }
    }
  } else if (intro) {
    $$('[data-intro-item],[data-intro-title],[data-intro-media]', intro).forEach(function (e) { e.style.opacity = 1; });
  }

  /* Last-resort sweep: if any reveal was skipped for any reason, show it rather
     than leave the section blank. */
  window.addEventListener('load', function () {
    $$('[data-reveal]').forEach(function (el) {
      if (parseFloat(getComputedStyle(el).opacity) < 0.02) {
        gsap.set ? gsap.set(el, { opacity: 1, filter: 'none' }) : (el.style.opacity = 1);
      }
    });
  });

  /* Fonts and images change layout after DOMContentLoaded, and the pinned section
     shifts every trigger below it — recalculate once everything has landed. */
  if (hasGSAP && window.ScrollTrigger) {
    window.addEventListener('load', function () { ScrollTrigger.refresh(); });
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () { ScrollTrigger.refresh(); });
    }
  }

  /* year */
  $$('[data-year]').forEach(function (e) { e.textContent = new Date().getFullYear(); });
})();
