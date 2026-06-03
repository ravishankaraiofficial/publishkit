const fs = require('fs');

const CAROUSEL_SLIDES = [
    {
        bg: "assets/slide1.png",
        heading_bold: "Automate",
        heading_script: "Everything",
        h_pos: "top: 25%; left: 10%;",
        body1: "Save hours on production details.",
        b1_pos: "top: 50%; right: 10%; text-align: right;",
        body2: "Create once, publish everywhere.",
        b2_pos: "bottom: 25%; left: 10%; text-align: left;"
    },
    {
        bg: "assets/slide2.png",
        heading_bold: "YouTube",
        heading_script: "Metadata",
        h_pos: "top: 20%; left: 15%;",
        body1: "Instant SEO titles and chapters.",
        b1_pos: "top: 45%; left: 15%; text-align: left;",
        body2: "Stop wrestling with descriptions.",
        b2_pos: "bottom: 25%; right: 15%; text-align: right;"
    },
    {
        bg: "assets/slide3.png",
        heading_bold: "Multimodal",
        heading_script: "Script Writer",
        h_pos: "top: 30%; right: 10%; text-align: right;",
        body1: "Upload audio, PDF, or text.",
        b1_pos: "top: 55%; left: 10%; text-align: left;",
        body2: "Generate scripts in your authentic voice.",
        b2_pos: "bottom: 20%; center: true; text-align: center; width: 100%;"
    },
    {
        bg: "assets/slide4.png",
        heading_bold: "MultiPost",
        heading_script: "Distribution",
        h_pos: "top: 15%; center: true; text-align: center; width: 100%;",
        body1: "1 click generates posts for 4 platforms.",
        b1_pos: "top: 50%; right: 10%; text-align: right;",
        body2: "X, Instagram, LinkedIn, and YouTube.",
        b2_pos: "bottom: 25%; left: 10%; text-align: left;"
    },
    {
        bg: "assets/slide5.png",
        heading_bold: "Reliable",
        heading_script: "Localization",
        h_pos: "top: 25%; right: 10%; text-align: right;",
        body1: "Native scripts in 13 languages.",
        b1_pos: "top: 45%; left: 10%; text-align: left;",
        body2: "No more silent English fallbacks.",
        b2_pos: "bottom: 20%; center: true; text-align: center; width: 100%;"
    },
    {
        bg: "assets/slide6.png",
        heading_bold: "Reclaim Your",
        heading_script: "Freedom",
        h_pos: "top: 20%; center: true; text-align: center; width: 100%;",
        body1: "Focus on creating, not formatting.",
        b1_pos: "top: 50%; left: 15%; text-align: left;",
        body2: "Start automating today.",
        b2_pos: "bottom: 25%; right: 15%; text-align: right;"
    }
];

const sparkleSVG = `<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M20 0C20 11.0457 28.9543 20 40 20C28.9543 20 20 28.9543 20 40C20 28.9543 11.0457 20 0 20C11.0457 20 20 11.0457 20 0Z" fill="white"/>
</svg>`;
const sparkleSmallSVG = `<svg width="24" height="24" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M20 0C20 11.0457 28.9543 20 40 20C28.9543 20 20 28.9543 20 40C20 28.9543 11.0457 20 0 20C11.0457 20 20 11.0457 20 0Z" fill="white"/>
</svg>`;

function generateHtml() {
    let slidesHtml = '';

    CAROUSEL_SLIDES.forEach((slide, index) => {
        const slideNum = (index + 1).toString().padStart(2, '0');
        
        slidesHtml += `
        <div class="slide">
            <div class="background-image" style="background-image: url('${slide.bg}');"></div>
            <!-- Minimal overlay -->
            <div class="overlay"></div>
            
            <div class="frame">
                <div class="top-bar">
                    <span class="brand">PUBLISHKIT.IN</span>
                    <span class="menu">
                        <svg width="32" height="8" viewBox="0 0 32 8" fill="white" xmlns="http://www.w3.org/2000/svg">
                            <circle cx="4" cy="4" r="4"/>
                            <circle cx="16" cy="4" r="4"/>
                            <circle cx="28" cy="4" r="4"/>
                        </svg>
                    </span>
                </div>

                <div class="content">
                    <div class="heading-block" style="${slide.h_pos}">
                        <div class="heading-bold">${slide.heading_bold}</div>
                        <div class="heading-script">${slide.heading_script}</div>
                        <div class="sparkle s1">${sparkleSVG}</div>
                        <div class="sparkle s2">${sparkleSmallSVG}</div>
                    </div>

                    <div class="body-text" style="${slide.b1_pos}">
                        ${slide.body1}
                        <div class="sparkle s3">${sparkleSmallSVG}</div>
                    </div>
                    <div class="body-text" style="${slide.b2_pos}">
                        ${slide.body2}
                    </div>
                </div>

                <div class="bottom-bar">
                    <span class="handle">@publishkit</span>
                    <span class="slide-number">SLIDE ${slideNum}</span>
                </div>
            </div>
        </div>
        `;
    });

    const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Anton&family=Great+Vibes&family=Outfit:wght@300;400&display=swap" rel="stylesheet">
<style>
    * {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
    }
    body {
        background: #000;
        display: flex;
        gap: 20px;
        padding: 20px;
        overflow-x: auto;
    }
    .slide {
        position: relative;
        width: 1080px;
        height: 1350px;
        flex-shrink: 0;
        border-radius: 40px;
        overflow: hidden;
        background-color: #0d0d0d;
        box-shadow: 0 20px 40px rgba(0,0,0,0.4);
    }
    .background-image {
        position: absolute;
        top: 0; left: 0; right: 0; bottom: 0;
        background-size: cover;
        background-position: center;
        z-index: 1;
    }
    .overlay {
        position: absolute;
        top: 0; left: 0; right: 0; bottom: 0;
        background: linear-gradient(to bottom, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.1) 30%, rgba(0,0,0,0.1) 70%, rgba(0,0,0,0.4) 100%);
        z-index: 2;
    }
    .frame {
        position: absolute;
        top: 0; left: 0; right: 0; bottom: 0;
        z-index: 3;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
    }
    
    .top-bar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: #1a1a1a;
        height: 100px;
        padding: 0 50px;
        border-bottom: 2px solid rgba(255,255,255,0.05);
    }
    .top-bar .brand {
        font-family: 'Outfit', sans-serif;
        font-weight: 600;
        font-size: 28px;
        letter-spacing: 4px;
        color: #FFFFFF;
    }

    .bottom-bar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: #1a1a1a;
        height: 100px;
        padding: 0 50px;
        border-top: 2px solid rgba(255,255,255,0.05);
    }
    .bottom-bar .handle, .bottom-bar .slide-number {
        font-family: 'Outfit', sans-serif;
        font-weight: 400;
        font-size: 26px;
        letter-spacing: 2px;
        color: #AAAAAA;
        text-transform: uppercase;
    }

    .content {
        flex-grow: 1;
        position: relative;
    }

    .heading-block {
        position: absolute;
        z-index: 10;
        max-width: 900px;
    }
    .heading-block[style*="center: true;"] {
        left: 50%;
        transform: translateX(-50%);
    }

    .heading-bold {
        font-family: 'Anton', sans-serif;
        font-size: 160px;
        color: #F5C518;
        line-height: 1.0;
        text-shadow: 2px 4px 10px rgba(0,0,0,0.5);
    }
    .heading-script {
        font-family: 'Great Vibes', cursive;
        font-size: 190px;
        color: #D4A800;
        line-height: 0.6;
        margin-top: -20px;
        margin-left: 40px;
        text-shadow: 2px 4px 10px rgba(0,0,0,0.5);
    }

    .body-text {
        position: absolute;
        font-family: 'Outfit', sans-serif;
        font-weight: 300;
        font-size: 44px;
        color: #FFFFFF;
        line-height: 1.5;
        max-width: 650px;
        text-shadow: 1px 2px 8px rgba(0,0,0,0.8);
        z-index: 10;
    }
    .body-text[style*="center: true;"] {
        left: 50%;
        transform: translateX(-50%);
    }

    .sparkle {
        position: absolute;
        filter: drop-shadow(0 0 8px rgba(255,255,255,0.8));
    }
    .s1 { top: -20px; right: -50px; }
    .s2 { top: 30px; right: -80px; }
    .s3 { top: -30px; left: -40px; }

</style>
</head>
<body>
    ${slidesHtml}
</body>
</html>`;

    fs.writeFileSync('carousel.html', fullHtml);
    console.log('Self-contained preview HTML successfully written to: carousel.html');
}

generateHtml();
