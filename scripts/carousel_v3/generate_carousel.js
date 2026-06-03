const fs = require('fs');

const CAROUSEL_SLIDES = [
    {
        num: "01",
        headline: "The Journey to<br>Total Automation.",
        subtext: "",
        h_pos: "top: 150px; left: 100px;",
        s_pos: "display: none;",
        path: "M-50 800 Q 540 800, 1130 500", 
        cx: 540, cy: 725
    },
    {
        num: "02",
        headline: "Perfect Your<br>YouTube Metadata.",
        subtext: "Instant SEO titles and chapters.",
        h_pos: "bottom: 150px; left: 100px;",
        s_pos: "bottom: 100px; left: 100px;",
        path: "M-50 500 Q 540 200, 1130 700",
        cx: 300, cy: 392
    },
    {
        num: "03",
        headline: "Write Scripts<br>With Your Voice.",
        subtext: "Upload audio, PDF, or text.",
        h_pos: "top: 150px; left: 100px;",
        s_pos: "top: 350px; left: 100px;",
        path: "M-50 700 Q 540 1000, 1130 400",
        cx: 800, cy: 664
    },
    {
        num: "04",
        headline: "Distribute<br>Everywhere at Once.",
        subtext: "1 click for X, IG, LinkedIn, & YT.",
        h_pos: "bottom: 250px; right: 100px; text-align: right;",
        s_pos: "bottom: 180px; right: 100px; text-align: right;",
        path: "M-50 400 Q 540 -100, 1130 200",
        cx: 400, cy: 133
    },
    {
        num: "05",
        headline: "Speak Their<br>Local Language.",
        subtext: "Native scripts in 13 languages.",
        h_pos: "bottom: 250px; left: 100px;",
        s_pos: "bottom: 180px; left: 100px;",
        path: "M-50 200 Q 540 500, 1130 800",
        cx: 700, cy: 581
    },
    {
        num: "06",
        headline: "Reclaim Your<br>Creative Freedom.",
        subtext: "Start automating today.",
        h_pos: "top: 150px; left: 100px;",
        s_pos: "top: 350px; left: 100px;",
        path: "M-50 800 Q 540 1000, 1130 540",
        cx: 900, cy: 697
    }
];

function generateHtml() {
    let slidesHtml = '';

    CAROUSEL_SLIDES.forEach((slide) => {
        slidesHtml += `
        <div class="slide">
            <div class="svg-container">
                <svg width="1080" height="1080" viewBox="0 0 1080 1080" xmlns="http://www.w3.org/2000/svg">
                    <path d="${slide.path}" stroke="#C8BC9A" stroke-width="5" stroke-dasharray="40 20" fill="none" stroke-linecap="round"/>
                </svg>
            </div>
            
            <div class="header">Publishkit.in</div>

            <div class="headline" style="${slide.h_pos}">
                ${slide.headline}
            </div>
            
            <div class="subtext" style="${slide.s_pos}">
                ${slide.subtext}
            </div>

            <div class="circle" style="left: ${slide.cx}px; top: ${slide.cy}px; transform: translate(-50%, -50%);">
                ${slide.num}
            </div>

            <div class="footer">www.publishkit.in</div>
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
<link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600&display=swap" rel="stylesheet">
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
        height: 1080px;
        flex-shrink: 0;
        border-radius: 40px;
        overflow: hidden;
        background-color: #2B2520;
    }
    .svg-container {
        position: absolute;
        top: 0; left: 0; right: 0; bottom: 0;
        z-index: 1;
    }
    .header {
        position: absolute;
        top: 50px;
        left: 50px;
        font-family: 'Nunito', sans-serif;
        font-weight: 600;
        font-size: 24px;
        color: #D4C8B0;
        letter-spacing: 2px;
        text-transform: uppercase;
        z-index: 5;
    }
    .footer {
        position: absolute;
        bottom: 50px;
        left: 50px;
        font-family: 'Nunito', sans-serif;
        font-weight: 600;
        font-size: 24px;
        color: #D4C8B0;
        letter-spacing: 2px;
        text-transform: uppercase;
        z-index: 5;
    }
    .headline {
        position: absolute;
        font-family: 'Nunito', sans-serif;
        font-weight: 400;
        font-size: 80px;
        color: #E8DCC8;
        line-height: 1.2;
        letter-spacing: 1px;
        z-index: 10;
        max-width: 800px;
    }
    .subtext {
        position: absolute;
        font-family: 'Nunito', sans-serif;
        font-weight: 400;
        font-size: 40px;
        color: #D4C8B0;
        line-height: 1.4;
        z-index: 10;
        max-width: 800px;
    }
    .circle {
        position: absolute;
        width: 100px;
        height: 100px;
        background-color: #F5F0E8;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: 'Nunito', sans-serif;
        font-weight: 600;
        font-size: 32px;
        color: #2B2520;
        z-index: 20;
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
