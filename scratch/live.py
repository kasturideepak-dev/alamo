import asyncio, sys
from playwright.async_api import async_playwright
BASE = "https://alamo.bracktech.com"

async def settle(pg):
    h = await pg.evaluate("()=>document.body.scrollHeight"); y=0
    while y < h and y < 40000:
        await pg.evaluate("y=>window.scrollTo(0,y)", y); await pg.wait_for_timeout(200); y += 700
    await pg.evaluate("()=>window.scrollTo(0,0)"); await pg.wait_for_timeout(600)
    await pg.evaluate("""async()=>{const w=i=>i.complete?Promise.resolve():Promise.race([
      new Promise(r=>{i.addEventListener('load',r,{once:1});i.addEventListener('error',r,{once:1})}),
      new Promise(r=>setTimeout(r,6000))]);await Promise.all([...document.images].map(w));}""")
    await pg.wait_for_timeout(400)

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(channel="chrome")
        for page in ["/", "/primary-care.html"]:
            for w, h in [(1440, 900), (390, 844)]:
                pg = await b.new_page(viewport={"width": w, "height": h})
                errs, fails = [], []
                pg.on("console", lambda m: errs.append((m.type, m.text[:150])) if m.type == "error" else None)
                pg.on("pageerror", lambda e: errs.append(("pageerror", str(e)[:170])))
                pg.on("requestfailed", lambda r: fails.append(r.url.replace(BASE, "")))
                await pg.goto(BASE + page, wait_until="load", timeout=60000)
                await settle(pg)
                r = await pg.evaluate("""()=>({
                  scrollW: document.documentElement.scrollWidth, vw: innerWidth,
                  height: document.body.scrollHeight,
                  gsap: typeof gsap, st: typeof ScrollTrigger, lenis: typeof Lenis,
                  triggers: typeof ScrollTrigger !== 'undefined' ? ScrollTrigger.getAll().length : -1,
                  brokenImgs: [...document.images].filter(i=>!i.naturalWidth).map(i=>i.src.split('/').pop()),
                  badIcons: [...new Set([...document.querySelectorAll('use')].map(u=>u.getAttribute('href'))
                    .filter(x=>x&&x.startsWith('#')&&!document.getElementById(x.slice(1))))],
                  dimReveals: [...document.querySelectorAll('[data-reveal],[data-reveal-y]')]
                    .filter(e=>parseFloat(getComputedStyle(e).opacity)<0.5).length,
                  serifLoaded: document.fonts.check('700 40px Fraunces'),
                  sansLoaded: document.fonts.check('400 16px Inter'),
                })""")
                tag = "%s @ %dx%d" % (page, w, h)
                print("=== %s" % tag)
                print("   scrollW %d/%d  height %d  triggers %s" % (r["scrollW"], r["vw"], r["height"], r["triggers"]))
                print("   gsap=%s ScrollTrigger=%s Lenis=%s  fonts: Fraunces=%s Inter=%s"
                      % (r["gsap"], r["st"], r["lenis"], r["serifLoaded"], r["sansLoaded"]))
                print("   broken images:", r["brokenImgs"] or "none")
                print("   broken icon refs:", r["badIcons"] or "none")
                print("   reveals still hidden:", r["dimReveals"])
                print("   request failures:", fails or "none")
                print("   console errors:", errs or "none")
                await pg.close()
        await b.close()
asyncio.run(main())
