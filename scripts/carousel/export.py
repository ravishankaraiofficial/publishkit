import asyncio
from playwright.async_api import async_playwright
import os
from pathlib import Path

async def export_slides():
    html_file = Path("carousel.html").absolute()
    if not html_file.exists():
        print("carousel.html not found. Please run generate_carousel.py first.")
        return

    output_dir = Path("slides")
    output_dir.mkdir(exist_ok=True)

    print("Launching Playwright...")
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        # Scale factor 2.5714 maps the 420x525 slide up to 1080x1350 for high-resolution
        page = await browser.new_page(device_scale_factor=2.5714) 
        
        print(f"Loading {html_file}...")
        await page.goto(f"file://{html_file}")
        
        # Wait for any external fonts to load
        await page.evaluate("document.fonts.ready")
        
        slides = await page.query_selector_all(".slide")
        print(f"Found {len(slides)} slides to export.")
        
        for i, slide in enumerate(slides):
            output_path = output_dir / f"slide_{i+1:02d}.png"
            # ElementHandle.screenshot() captures just that element
            await slide.screenshot(path=str(output_path))
            print(f"Saved {output_path}")
            
        await browser.close()
        print("Export complete! Check the 'slides' folder.")

if __name__ == "__main__":
    asyncio.run(export_slides())
