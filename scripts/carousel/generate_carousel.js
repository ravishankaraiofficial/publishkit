const fs = require('fs');

const CAROUSEL_SLIDES = [
    {
        bg: "assets/slide1.png",
        heading_normal1: "Automate Your",
        heading_italic: "Workflow",
        heading_normal2: "",
        subtext1: "Save hours on production details.",
        subtext2: "Create once, publish everywhere."
    },
    {
        bg: "assets/slide2.png",
        heading_normal1: "Perfect YouTube",
        heading_italic: "Metadata",
        heading_normal2: "",
        subtext1: "Instant SEO titles and chapters.",
        subtext2: "Stop wrestling with descriptions."
    },
    {
        bg: "assets/slide3.png",
        heading_normal1: "Multimodal",
        heading_italic: "Script Writer",
        heading_normal2: "",
        subtext1: "Upload audio, PDF, or text.",
        subtext2: "Generate scripts in your authentic voice."
    },
    {
        bg: "assets/slide4.png",
        heading_normal1: "MultiPost",
        heading_italic: "Distribution",
        heading_normal2: "",
        subtext1: "1 click generates posts for 4 platforms.",
        subtext2: "X, Instagram, LinkedIn, and YouTube."
    },
    {
        bg: "assets/slide5.png",
        heading_normal1: "Reliable",
        heading_italic: "Localization",
        heading_normal2: "",
        subtext1: "Native scripts in 13 languages.",
        subtext2: "No more silent English fallbacks."
    },
    {
        bg: "assets/slide6.png",
        heading_normal1: "Reclaim Your",
        heading_italic: "Freedom",
        heading_normal2: "",
        subtext1: "Focus on creating, not formatting.",
        subtext2: "Start automating today."
    }
];

const arrowSVG = `<svg width="80" height="80" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M20 20 C 50 10, 80 40, 60 70 S 10 90, 80 80" stroke="#C9A84C" stroke-width="4" fill="transparent" stroke-linecap="round"/>
  <path d="M70 70 L85 80 L70 90" stroke="#C9A84C" stroke-width="4" fill="transparent" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

const ellipseSVG = `<svg class="ellipse" viewBox="0 0 300 100" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
  <ellipse cx="150" cy="50" rx="145" ry="45" stroke="#C9A84C" stroke-width="6" fill="transparent" />
</svg>`;

function generateHtml() {
    let slidesHtml = '';

    CAROUSEL_SLIDES.forEach((slide, index) => {
        const slideNum = (index + 1).toString().padStart(2, '0');
        
        slidesHtml += `
        <div class="slide">
            <div class="background-image" style="background-image: url('${slide.bg}');"></div>
            <div class="overlay"></div>
            
            <div class="border-frame">
                <div class="top-bar">
                    <span class="brand">Publishkit.in</span>
                    <span class="slide-number">Slide ${slideNum}</span>
                </div>

                <div class="content">
                    <h1 class="heading">
                        ${slide.heading_normal1} 
                        <span class="italic-wrapper">
                            ${ellipseSVG}
                            <span class="italic-text">${slide.heading_italic}</span>
                        </span> 
                        ${slide.heading_normal2}
                    </h1>

                    <div class="subtext-container left-subtext">
                        <div class="arrow arrow-down">${arrowSVG}</div>
                        <p>${slide.subtext1}</p>
                    </div>

                    <div class="subtext-container right-subtext">
                        <div class="arrow arrow-up" style="transform: scaleX(-1) rotate(90deg);">${arrowSVG}</div>
                        <p>${slide.subtext2}</p>
                    </div>
                </div>

                <div class="bottom-bar">
                    <span class="url">www.publishkit.in</span>
                    <div class="cta-button">
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#0D0A05" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                            <polyline points="12 5 19 12 12 19"></polyline>
                        </svg>
                    </div>
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
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,700;1,400&family=Inter:wght@400&display=swap" rel="stylesheet">
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
        overflow: hidden;
        background-color: #100D08;
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
        background-color: rgba(26, 18, 8, 0.65); /* #1A1208 dark brown overlay */
        z-index: 2;
    }
    .border-frame {
        position: absolute;
        top: 24px; left: 24px; right: 24px; bottom: 24px;
        border: 2px solid rgba(255, 255, 255, 0.15);
        border-radius: 12px;
        z-index: 3;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        padding: 40px;
    }
    
    .top-bar {
        display: flex;
        justify-content: space-between;
        font-family: 'Inter', sans-serif;
        font-size: 32px;
        color: #F5EDD6;
        font-weight: 400;
        border-bottom: 2px solid rgba(255, 255, 255, 0.15);
        padding-bottom: 20px;
        margin-top: -10px; /* Offset to bring it closer to the border */
        margin-left: -40px;
        margin-right: -40px;
        padding-left: 40px;
        padding-right: 40px;
    }

    .bottom-bar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-family: 'Inter', sans-serif;
        font-size: 32px;
        color: #F5EDD6;
        font-weight: 400;
        border-top: 2px solid rgba(255, 255, 255, 0.15);
        padding-top: 20px;
        margin-bottom: -10px;
        margin-left: -40px;
        margin-right: -40px;
        padding-left: 40px;
        padding-right: 40px;
    }

    .cta-button {
        background-color: #C9A84C;
        width: 80px;
        height: 60px;
        border-radius: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .content {
        flex-grow: 1;
        display: flex;
        flex-direction: column;
        justify-content: center;
        padding: 0 40px;
        position: relative;
    }

    .heading {
        font-family: 'Cormorant Garamond', serif;
        font-size: 140px;
        line-height: 1.1;
        color: #F5EDD6;
        font-weight: 700;
        margin-bottom: 60px;
        text-align: left;
        max-width: 900px;
    }

    .italic-wrapper {
        position: relative;
        display: inline-block;
    }
    
    .italic-text {
        font-style: italic;
        font-weight: 400;
        color: #C9A84C;
        padding: 0 20px;
    }

    .ellipse {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 120%;
        height: 120%;
        pointer-events: none;
    }

    .subtext-container {
        font-family: 'Inter', sans-serif;
        font-size: 40px;
        color: #C8B99A;
        line-height: 1.4;
        max-width: 450px;
        position: absolute;
    }

    .left-subtext {
        bottom: 100px;
        left: 40px;
    }

    .right-subtext {
        bottom: 250px;
        right: 40px;
        text-align: right;
    }

    .arrow {
        position: absolute;
    }
    .arrow-down {
        top: -100px;
        left: 60px;
    }
    .arrow-up {
        bottom: -90px;
        right: 60px;
    }

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
