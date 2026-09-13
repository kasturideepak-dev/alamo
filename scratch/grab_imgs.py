import asyncio, json, os, re, urllib.request
from playwright.async_api import async_playwright
UA=("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36")
OUT="scratch/dl"; seen={}

async def main():
    url=("https://www.figma.com/proto/7rce8erEmasyoXCQ1Zhvn8/Alamo-Primary-Care"
         "?node-id=203-210&scaling=scale-down-width&content-scaling=fixed&page-id=0%3A1&hide-ui=1")
    async with async_playwright() as p:
        b=await p.chromium.launch(channel="chrome", args=["--disable-blink-features=AutomationControlled"])
        ctx=await b.new_context(viewport={"width":1440,"height":1600}, user_agent=UA, locale="en-US")
        await ctx.add_init_script("Object.defineProperty(navigator,'webdriver',{get:()=>undefined});")
        pg=await ctx.new_page()

        async def on_resp(r):
            if "/image/batch" in r.url:
                try: data = await r.json()
                except Exception: return
                m = data.get("meta", data)
                imgs = m.get("images", m) if isinstance(m, dict) else {}
                if isinstance(imgs, dict):
                    seen.update(imgs)
                    print("batch +%d  total=%d" % (len(imgs), len(seen)), flush=True)
        pg.on("response", lambda r: asyncio.ensure_future(on_resp(r)))
        await pg.goto(url, wait_until="domcontentloaded", timeout=120000)
        await pg.wait_for_timeout(30000)
        for i in range(14):
            await pg.mouse.wheel(0, 1400); await pg.wait_for_timeout(1200)
        await pg.wait_for_timeout(4000)
        await b.close()
    json.dump(seen, open("scratch/shas.json","w"), indent=1)
    print("TOTAL", len(seen))
    for sha, u in seen.items():
        if not u: continue
        path=os.path.join(OUT, sha[:12]+".png")
        if os.path.exists(path): continue
        try:
            req=urllib.request.Request(u, headers={"User-Agent":UA})
            open(path,"wb").write(urllib.request.urlopen(req, timeout=60).read())
        except Exception as e:
            print("fail", sha[:8], e)
    print("downloaded", len(os.listdir(OUT)))
asyncio.run(main())
