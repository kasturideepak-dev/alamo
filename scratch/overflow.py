import asyncio, sys
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(channel="chrome")
        for f in ["index.html","primary-care.html"]:
            for w in [360, 390, 430, 620, 768, 900, 1024, 1180, 1280, 1440, 1920]:
                pg = await b.new_page(viewport={"width": w, "height": 900})
                await pg.goto(f"http://localhost:4321/{f}?static=1", wait_until="load")
                await pg.wait_for_timeout(700)
                res = await pg.evaluate("""(vw) => {
                  const out = [];
                  document.querySelectorAll('*').forEach(el => {
                    const r = el.getBoundingClientRect();
                    if (r.width === 0) return;
                    if (r.right > vw + 1 || r.left < -1) {
                      out.push([el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\\s+/).join('.') : ''),
                                Math.round(r.left), Math.round(r.right)]);
                    }
                  });
                  return [document.documentElement.scrollWidth, out.slice(0, 6)];
                }""", w)
                if res[0] > w:
                    print(f, w, "scrollW", res[0])
                    for r in res[1]: print("   ", r)
                await pg.close()
        await b.close()
        print("scan done")
asyncio.run(main())
