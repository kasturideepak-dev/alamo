import asyncio, sys
from playwright.async_api import async_playwright
UA=("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36")
async def grab(node, out, vh=2400):
    url=("https://www.figma.com/proto/7rce8erEmasyoXCQ1Zhvn8/Alamo-Primary-Care"
         f"?node-id={node}&scaling=scale-down-width&content-scaling=fixed&page-id=0%3A1&hide-ui=1")
    async with async_playwright() as p:
        b=await p.chromium.launch(channel="chrome", args=["--disable-blink-features=AutomationControlled"])
        ctx=await b.new_context(viewport={"width":1440,"height":vh}, user_agent=UA, locale="en-US")
        await ctx.add_init_script("Object.defineProperty(navigator,'webdriver',{get:()=>undefined});")
        pg=await ctx.new_page()
        await pg.goto(url, wait_until="domcontentloaded", timeout=120000)
        await pg.wait_for_timeout(26000)
        print("title:", await pg.title(), flush=True)
        await pg.screenshot(path=out)
        await b.close()
asyncio.run(grab(sys.argv[1], sys.argv[2], int(sys.argv[3]) if len(sys.argv)>3 else 2400))
