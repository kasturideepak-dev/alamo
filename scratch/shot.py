import asyncio, os, sys
from playwright.async_api import async_playwright

async def settle(pg):
    """Scroll the whole page so lazy images decode, then return to the top."""
    h = await pg.evaluate("() => document.body.scrollHeight")
    y = 0
    while y < h and y < 40000:
        await pg.evaluate("y => window.scrollTo(0, y)", y)
        await pg.wait_for_timeout(140)
        y += 700
    await pg.evaluate("() => window.scrollTo(0,0)")
    await pg.wait_for_timeout(500)
    # every <img> must be decoded before the capture
    # a lazy image still outside the viewport never fires load, so race a timeout
    await pg.evaluate("""async () => {
      const wait = i => i.complete ? Promise.resolve() : Promise.race([
        new Promise(r => { i.addEventListener('load', r, {once:true});
                           i.addEventListener('error', r, {once:true}); }),
        new Promise(r => setTimeout(r, 4000)),
      ]);
      await Promise.all([...document.images].map(wait));
    }""")
    await pg.wait_for_timeout(300)

async def main():
    widths = {"d": (1440, 1200), "m": (390, 844), "t": (820, 1024)}
    only = sys.argv[1:] or ["d", "m"]
    os.makedirs("scratch/shots", exist_ok=True)
    async with async_playwright() as p:
        b = await p.chromium.launch(channel="chrome")
        for f, tag in [("index.html", "idx"), ("primary-care.html", "pc")]:
            for wtag in only:
                w, h = widths[wtag]
                pg = await b.new_page(viewport={"width": w, "height": h})
                errs = []
                pg.on("console", lambda m: errs.append((m.type, m.text[:140])) if m.type == "error" else None)
                pg.on("pageerror", lambda e: errs.append(("pageerror", str(e)[:140])))
                await pg.goto(f"http://localhost:4321/{f}?static=1", wait_until="load")
                await settle(pg)
                await pg.screenshot(path=f"scratch/shots/{tag}-{wtag}.png", full_page=True)
                sw, bh, broken = await pg.evaluate("""() => [
                  document.documentElement.scrollWidth, document.body.scrollHeight,
                  [...document.images].filter(i => !i.naturalWidth).map(i => i.currentSrc || i.src)
                ]""")
                print(f"{tag}-{wtag}: scrollW={sw}/{w} h={bh} broken={broken} errors={errs}")
                await pg.close()
        await b.close()
asyncio.run(main())
