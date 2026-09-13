import asyncio, json, os, urllib.request
from playwright.async_api import async_playwright
UA=("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36")
OUT="scratch/dl"; os.makedirs(OUT, exist_ok=True)
urls={}; shas=set()

async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(channel="chrome", args=["--disable-blink-features=AutomationControlled"])
        ctx=await b.new_context(viewport={"width":1440,"height":1600}, user_agent=UA, locale="en-US")
        await ctx.add_init_script("Object.defineProperty(navigator,'webdriver',{get:()=>undefined});")
        pg=await ctx.new_page()

        async def on_resp(r):
            if "/image/batch" not in r.url: return
            try:
                rq=r.request
                pd=rq.post_data
                if pd:
                    try: shas.update(json.loads(pd).get("sha1s",[]))
                    except Exception: pass
                d=await r.json()
                s=(d.get("meta") or {}).get("s3_urls") or d.get("s3_urls") or {}
                urls.update(s); shas.update(s.keys())
            except Exception: pass
        pg.on("response", lambda r: asyncio.ensure_future(on_resp(r)))

        for node in ("203-210","63-99"):
            url=("https://www.figma.com/proto/7rce8erEmasyoXCQ1Zhvn8/Alamo-Primary-Care"
                 f"?node-id={node}&scaling=scale-down-width&content-scaling=fixed&page-id=0%3A1&hide-ui=1")
            await pg.goto(url, wait_until="domcontentloaded", timeout=120000)
            await pg.wait_for_timeout(30000)
            for i in range(16):
                await pg.mouse.wheel(0, 1200); await pg.wait_for_timeout(1100)
            await pg.wait_for_timeout(3000)
            print(node, "shas", len(shas), "urls", len(urls), flush=True)

        # one big batch for anything missing
        missing=[s for s in shas if s not in urls or not urls[s]]
        if missing:
            got = await pg.evaluate("""async (shas) => {
              const r = await fetch('/file/7rce8erEmasyoXCQ1Zhvn8/image/batch', {
                method:'POST', headers:{'Content-Type':'application/json'},
                body: JSON.stringify({sha1s: shas}), credentials:'include'});
              return await r.json();
            }""", missing)
            s=(got.get("meta") or {}).get("s3_urls") or {}
            urls.update(s)
            print("bulk filled", len(s), flush=True)
        await b.close()

    json.dump(urls, open("scratch/urls.json","w"), indent=1)
    n=0
    for sha,u in urls.items():
        if not isinstance(u,str) or not u.startswith("http"): continue
        path=os.path.join(OUT, sha[:12]+".png")
        if os.path.exists(path) and os.path.getsize(path)>1000: continue
        try:
            req=urllib.request.Request(u, headers={"User-Agent":UA})
            open(path,"wb").write(urllib.request.urlopen(req, timeout=90).read()); n+=1
        except Exception as e: print("fail", sha[:8], e)
    print("TOTAL urls", len(urls), "downloaded", n, "files", len(os.listdir(OUT)))
asyncio.run(main())
