import asyncio, json
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(channel="chrome")
        for f in ["index.html", "primary-care.html"]:
            pg = await b.new_page(viewport={"width": 1440, "height": 900})
            errs = []
            pg.on("console", lambda m: errs.append((m.type, m.text[:160])) if m.type == "error" else None)
            pg.on("pageerror", lambda e: errs.append(("pageerror", str(e)[:200])))
            await pg.goto(f"http://localhost:4321/{f}", wait_until="load")
            await pg.wait_for_timeout(1800)
            print("=== " + f)
            print("  gsap:", await pg.evaluate("() => [typeof gsap, typeof ScrollTrigger, typeof Lenis, ScrollTrigger.getAll().length]"))

            # word splitting happened on every [data-split]
            print("  headings/words:", await pg.evaluate("""() => {
              const h = [...document.querySelectorAll('[data-split]')];
              return [h.length, h.filter(e => e.querySelectorAll('.word').length).length];
            }"""))

            # scroll to the bottom in real steps and watch for stuck reveals
            for i in range(1, 26):
                await pg.evaluate("i => window.scrollTo(0, i * document.body.scrollHeight / 25)", i)
                await pg.wait_for_timeout(180)
            await pg.wait_for_timeout(1200)
            stuck = await pg.evaluate("""() => {
              const bad = [];
              document.querySelectorAll('[data-reveal],[data-reveal-y]').forEach(e => {
                const r = e.getBoundingClientRect();
                if (parseFloat(getComputedStyle(e).opacity) < 0.5)
                  bad.push((e.className || e.tagName) + ' y=' + Math.round(r.top));
              });
              document.querySelectorAll('[data-split]').forEach(e => {
                const w = [...e.querySelectorAll('.word')];
                const dim = w.filter(x => parseFloat(getComputedStyle(x).opacity) < 0.5).length;
                if (dim) bad.push('WORDS ' + dim + '/' + w.length + ' "' + e.textContent.trim().slice(0,34) + '"');
              });
              return bad;
            }""")
            print("  stuck after full scroll:", stuck if stuck else "none")

            # scroll back up: headings must dim again (reversible scrub)
            await pg.evaluate("() => window.scrollTo(0,0)")
            await pg.wait_for_timeout(900)
            rev = await pg.evaluate("""() => {
              const e = [...document.querySelectorAll('[data-split]')].pop();
              const w = [...e.querySelectorAll('.word')];
              return [w.length, w.filter(x => parseFloat(getComputedStyle(x).opacity) < 0.5).length,
                      getComputedStyle(e).filter];
            }""")
            print("  reversed (last heading) words/dim/filter:", rev)

            # testimonial carousel
            car = await pg.evaluate("""async () => {
              const next = document.querySelector('[data-car-next]');
              if (!next) return 'no carousel on this page';
              const before = [...document.querySelectorAll('[data-slide]')].map(s => s.hidden);
              next.click();
              await new Promise(r => setTimeout(r, 900));
              const after = [...document.querySelectorAll('[data-slide]')].map(s => s.hidden);
              const dot = [...document.querySelectorAll('[data-car-dot]')].map(d => d.classList.contains('is-on'));
              const visible = [...document.querySelectorAll('[data-slide]')]
                .filter(s => s.getBoundingClientRect().height > 0).length;
              return {before, after, dot, visible};
            }""")
            print("  carousel:", json.dumps(car))

            # drawer at mobile width
            await pg.set_viewport_size({"width": 390, "height": 844})
            await pg.wait_for_timeout(400)
            dr = await pg.evaluate("""async () => {
              document.querySelector('[data-drawer-open]').click();
              await new Promise(r => setTimeout(r, 700));
              const d = document.getElementById('drawer');
              const open = d.classList.contains('is-open');
              const x = Math.round(d.querySelector('.drawer__panel').getBoundingClientRect().left);
              d.querySelector('[data-drawer-close]').click();
              await new Promise(r => setTimeout(r, 700));
              return {open, x, closed: !d.classList.contains('is-open'),
                      bodyOverflow: document.body.style.overflow};
            }""")
            print("  drawer:", json.dumps(dr))
            print("  errors:", errs if errs else "none")
            await pg.close()
        await b.close()
asyncio.run(main())
