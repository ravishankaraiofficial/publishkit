const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function exportSlides() {
    const htmlFile = path.resolve('carousel.html');
    if (!fs.existsSync(htmlFile)) {
        console.error("carousel.html not found. Please run generate_carousel.js first.");
        return;
    }

    const outputDir = path.resolve('slides');
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir);
    }

    console.log("Launching Playwright...");
    const browser = await chromium.launch();
    // Set scale factor to 1 because slides are exactly 1080x1350 in CSS
    const context = await browser.newContext({
        deviceScaleFactor: 1
    });
    const page = await context.newPage();
    
    console.log(`Loading ${htmlFile}...`);
    await page.goto(`file://${htmlFile}`);
    
    // Wait for any external fonts to load
    await page.evaluate(() => document.fonts.ready);
    
    const slides = await page.$$(".slide");
    console.log(`Found ${slides.length} slides to export.`);
    
    for (let i = 0; i < slides.length; i++) {
        const slide = slides[i];
        const num = String(i + 1).padStart(2, '0');
        const outputPath = path.join(outputDir, `slide_${num}.png`);
        
        await slide.screenshot({ path: outputPath });
        console.log(`Saved ${outputPath}`);
    }
        
    await browser.close();
    console.log("Export complete! Check the 'slides' folder.");
}

exportSlides();
