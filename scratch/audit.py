import asyncio
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(channel="chrome")
        for f in ["index.html", "primary-care.html"]:
            pg = await b.new_page(viewport={"width": 1440, "height": 900})
            await pg.goto(f"http://localhost:4321/{f}?static=1", wait_until="load")
            await pg.wait_for_timeout(900)
            res = await pg.evaluate("""() => {
              // every class present in the markup
              const used = new Set();
              document.querySelectorAll('[class]').forEach(el => {
                (typeof el.className === 'string' ? el.className : '').trim().split(/\\s+/)
                  .forEach(c => c && used.add(c));
              });
              // every class mentioned by any rule in any stylesheet
              const styled = new Set();
              for (const sheet of document.styleSheets) {
                let rules; try { rules = sheet.cssRules; } catch (e) { continue; }
                const walk = rs => { for (const r of rs) {
                  if (r.selectorText) (r.selectorText.match(/\\.[A-Za-z0-9_-]+/g) || [])
                    .forEach(s => styled.add(s.slice(1)));
                  if (r.cssRules) walk(r.cssRules);
                } };
                walk(rules);
              }
              const unstyled = [...used].filter(c => !styled.has(c)).sort();
              const unused = [...styled].filter(c => !used.has(c)).sort();
              // elements that ended up with zero size
              const collapsed = [];
              document.querySelectorAll('section, .cut, .icard, .pcard, .loc, .prov, .value, .collage figure, .foot__item').forEach(el => {
                const r = el.getBoundingClientRect();
                if (r.width < 2 || r.height < 2)
                  collapsed.push((el.className || el.tagName) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height));
              });
              // broken <use> references
              const badUse = [...document.querySelectorAll('use')]
                .map(u => u.getAttribute('href'))
                .filter(h => h && h.startsWith('#') && !document.getElementById(h.slice(1)));
              return {unstyled, unused, collapsed, badUse: [...new Set(badUse)]};
            }""")
            print("=== " + f)
            print("  classes in markup with no CSS rule:", res["unstyled"] or "none")
            print("  CSS classes not used on this page:", len(res["unused"]), res["unused"][:60])
            print("  collapsed elements:", res["collapsed"] or "none")
            print("  broken <use> refs:", res["badUse"] or "none")
            await pg.close()
        await b.close()
asyncio.run(main())
