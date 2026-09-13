import asyncio
from playwright.async_api import async_playwright
UA=("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36")
async def main():
    url=("https://www.figma.com/proto/7rce8erEmasyoXCQ1Zhvn8/Alamo-Primary-Care"
         "?node-id=63-99&scaling=scale-down-width&content-scaling=fixed&page-id=0%3A1&hide-ui=1")
    async with async_playwright() as p:
        b=await p.chromium.launch(channel="chrome", args=["--disable-blink-features=AutomationControlled"])
        ctx=await b.new_context(viewport={"width":1440,"height":2000}, user_agent=UA, locale="en-US")
        await ctx.add_init_script("Object.defineProperty(navigator,'webdriver',{get:()=>undefined});")
        pg=await ctx.new_page()
        await pg.goto(url, wait_until="domcontentloaded", timeout=120000)
        await pg.wait_for_timeout(26000)
        try:
            await pg.click("text=Do not allow cookies", timeout=3000); await pg.wait_for_timeout(1000)
        except Exception: pass
        # jump toward the end of the frame
        for i in range(9):
            await pg.mouse.wheel(0, 1900); await pg.wait_for_timeout(1500)
        await pg.screenshot(path="scratch/f1-end.png")
        await pg.mouse.wheel(0, 2600); await pg.wait_for_timeout(2200)
        await pg.screenshot(path="scratch/f1-end2.png")
        await b.close()
asyncio.run(main())
