import base64
import re
import urllib.request
from pathlib import Path

# Config definitions matching system instructions
GOOGLE_FONTS_URL = "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap"
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"

# Slide Content Data derived safely from project repositories
CAROUSEL_SLIDES = [
    {
        "type": "hook",
        "headline": "Most creators burn hours on production details.",
        "body": "Here is the exact roadmap to automate your metadata and multiply your reach across four platforms in 90 seconds flat.",
        "cta": "Swipe to see the system →"
    },
    {
        "type": "body",
        "step": "Step 1",
        "headline": "Perfect YouTube Metadata Instantly",
        "body": "Stop wrestling with titles and descriptions. Upload raw video or audio files directly to generate SEO-optimized options that rank[cite: 2, 3]. You get timestamped chapters and thumbnail prompts engineered natively to maximize click-through rate[cite: 2, 3]."
    },
    {
        "type": "body",
        "step": "Step 2",
        "headline": "Multimodal Script Writer",
        "body": "Don't let your AI sound robotic. The advanced Script Writer handles raw audio diaries, lengthy PDFs, or screenshots as direct prompt sources[cite: 2]. It structures standard hooks, natural introductions, and clear calls-to-action entirely in your distinct creator voice[cite: 2]."
    },
    {
        "type": "body",
        "step": "Step 3",
        "headline": "MultiPost Social Distribution",
        "body": "Repurpose your primary content immediately[cite: 2, 3]. One single click transforms an asset into tailored, platform-specific variations for X threads, Instagram descriptions, LinkedIn thought leadership, and conversational YouTube Community posts[cite: 2, 3]."
    },
    {
        "type": "body",
        "step": "Step 4",
        "headline": "Reliable Regional Localization",
        "body": "Bridge global audiences seamlessly. PublishKit explicitly injects native scripts like देवनागरी, বাংলা, and தமிழ் directly into the system instructions to force correct regional execution[cite: 2, 3]. No silent fallback to English[cite: 2]."
    },
    {
        "type": "block",
        "headline": "Production-Grade Creator Toolkit",
        "body": "Everything runs synchronously on standard models to maximize execution margin while maintaining a hard cap on system tokens[cite: 2, 3]. Your assets stay isolated and are securely deleted automatically 3 hours after processing completes[cite: 2, 3]."
    },
    {
        "type": "cta",
        "headline": "Reclaim your creative freedom.",
        "body": "Stop wasting precious hours on operations. Get professional, highly personalized assets for your entire pipeline instantly.",
        "cta": "Get started for free at publishkit.in"
    }
]

def fetch_embedded_fonts_css(fonts_url):
    print("Fetching and base64-encoding Google Fonts for visual parity...")
    try:
        req = urllib.request.Request(fonts_url, headers={"User-Agent": UA})
        css = urllib.request.urlopen(req).read().decode("utf-8")
        
        for font_url in set(re.findall(r"url\((https://[^)]+\.woff2)\)", css)):
            font_data = urllib.request.urlopen(font_url).read()
            b64 = base64.b64encode(font_data).decode("ascii")
            css = css.replace(font_url, f"data:font/woff2;base64,{b64}")
            
        css = css.replace("font-display: swap;", "font-display: block;")
        return css
    except Exception as e:
        print(f"Warning: CDN font embedding failed ({e}). Falling back to live fonts links.")
        return f"@import url('{fonts_url}');"

def generate_carousel_html():
    embedded_fonts = fetch_embedded_fonts_css(GOOGLE_FONTS_URL)
    total_slides = len(CAROUSEL_SLIDES)
    
    slides_html = ""
    dots_html = ""
    
    for idx, slide in enumerate(CAROUSEL_SLIDES):
        is_last = (idx == total_slides - 1)
        progress_pct = ((idx + 1) / total_slides) * 100
        
        # Structure elements conditional layout
        step_lbl = f'<div class="slide-step">{slide["step"]}</div>' if "step" in slide else ""
        
        body_content = ""
        if slide["type"] == "hook":
            body_content = f"""
                <div class="content-wrapper">
                    <h2 class="headline">{slide["headline"]}</h2>
                    <p class="body-text">{slide["body"]}</p>
                    <p class="accent-text">{slide["cta"]}</p>
                </div>
            """
        elif slide["type"] == "cta":
            body_content = f"""
                <div class="content-wrapper">
                    <h2 class="headline">{slide["headline"]}</h2>
                    <p class="body-text">{slide["body"]}</p>
                    <p class="accent-text font-bold" style="font-size: 16px; margin-top: 16px;">{slide["cta"]}</p>
                </div>
            """
        else:
            body_content = f"""
                <div class="content-wrapper">
                    {step_lbl}
                    <h2 class="headline">{slide["headline"]}</h2>
                    <p class="body-text">{slide["body"]}</p>
                </div>
            """

        swipe_arrow = "" if is_last else """
        <div class="swipe-arrow">
            <svg viewBox="0 0 24 24"><path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"/></svg>
        </div>
        """

        slides_html += f"""
        <div class="slide" id="slide-{idx}">
            <!-- Tweet Header -->
            <div class="tweet-header">
                <div class="avatar-col">
                    <div class="avatar-placeholder">PK</div>
                </div>
                <div class="meta-col">
                    <div class="name-row">
                        <span class="display-name">PublishKit Workspace</span>
                        <svg class="verified-badge" viewBox="0 0 22 22"><path d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.274-.586-.705-1.084-1.246-1.439-.54-.354-1.17-.551-1.816-.569-.646.018-1.275.215-1.816.57-.54.354-.972.852-1.246 1.438-.607-.223-1.264-.27-1.897-.14-.634.131-1.218.437-1.687.882-.445.47-.75 1.053-.882 1.687-.13.633-.083 1.29.14 1.897-.586.274-1.084.705-1.439 1.246-.354.54-.551 1.17-.569 1.816.018.646.215 1.275.57 1.816.354.54.852.972 1.438 1.246-.223.607-.27 1.264-.14 1.897.131.634.437 1.218.882 1.687.47.445 1.053.75 1.687.882.633.13 1.29.083 1.897-.14.274.586.705 1.084 1.246 1.439.54.354 1.17.551 1.816.569.646-.018 1.275-.215 1.816-.57.54-.354.972-.852 1.246-1.438.607.223 1.264.27 1.897.14.634-.131 1.218-.437 1.687-.882.445-.47.75-1.053.882-1.687.13-.633.083-1.29-.14-1.897.586-.274 1.084-.705 1.439-1.246.354-.54.551-1.17.569-1.816z" fill="#1d9bf0"/><path d="M9.585 14.929l-3.28-3.28 1.168-1.168 2.112 2.112 5.036-5.036 1.168 1.168z" fill="#fff"/></svg>
                    </div>
                    <div class="handle">@publishkit_in</div>
                </div>
            </div>
            
            <!-- Core Context Element -->
            {body_content}
            
            {swipe_arrow}
            
            <!-- Standard Footer Progress Elements -->
            <div class="progress-container">
                <div class="progress-bar-track">
                    <div class="progress-bar-fill" style="width: {progress_pct}%;"></div>
                </div>
                <div class="progress-counter">{idx + 1}/{total_slides}</div>
            </div>
        </div>
        """
        dots_html += f'<div class="dot {"active" if idx == 0 else ""}" onclick="goToSlide({idx})"></div>'

    html_payload = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>PublishKit Product Overview Carousel</title>
    <style>
        {embedded_fonts}
        
        * {{
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }}
        body {{
            font-family: 'Plus Jakarta Sans', -apple-system, sans-serif;
            background-color: #f3f4f6;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            padding: 20px;
        }}
        
        /* Instagram Shell Mockup Wrapper */
        .ig-frame {{
            width: 420px;
            background: #ffffff;
            border: 1px solid #dbdbdb;
            border-radius: 12px;
            box-shadow: 0 4px 24px rgba(0,0,0,0.06);
            overflow: hidden;
        }}
        .ig-header {{
            display: flex;
            align-items: center;
            padding: 12px 14px;
            border-bottom: 1px solid #f2f2f2;
        }}
        .ig-avatar {{
            width: 32px;
            height: 32px;
            border-radius: 50%;
            background: #2FAD64;
            color: white;
            font-weight: 700;
            font-size: 11px;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-right: 10px;
        }}
        .ig-header-meta {{
            flex-grow: 1;
        }}
        .ig-header-title {{
            font-size: 13px;
            weight: 600;
            color: #262626;
        }}
        
        /* Slide Viewport Frame Structure */
        .carousel-viewport {{
            width: 420px;
            height: 525px;
            overflow: hidden;
            position: relative;
            cursor: grab;
        }}
        .carousel-viewport:active {{
            cursor: grabbing;
        }}
        .carousel-track {{
            display: flex;
            width: {total_slides * 420}px;
            height: 100%;
            transition: transform 0.4s cubic-bezier(0.25, 1, 0.5, 1);
        }}
        
        /* Modular Slides */
        .slide {{
            width: 420px;
            height: 525px;
            background: #FFFFFF;
            position: relative;
            display: flex;
            flex-direction: column;
            justify-content: center;
            padding: 0 36px 52px 36px;
            flex-shrink: 0;
            user-select: none;
        }}
        
        /* Tweet Header Layout */
        .tweet-header {{
            display: flex;
            align-items: center;
            position: absolute;
            top: 36px;
            left: 36px;
            right: 36px;
        }}
        .avatar-placeholder {{
            width: 42px;
            height: 42px;
            border-radius: 50%;
            background: #f0f3f4;
            border: 1px solid #e1e8ed;
            color: #2FAD64;
            font-weight: 700;
            font-size: 14px;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-right: 12px;
        }}
        .meta-col {{
            display: flex;
            flex-direction: column;
        }}
        .name-row {{
            display: flex;
            align-items: center;
        }}
        .display-name {{
            font-size: 15px;
            font-weight: 700;
            color: #0f1419;
        }}
        .verified-badge {{
            width: 16px;
            height: 16px;
            margin-left: 4px;
        }}
        .handle {{
            font-size: 14px;
            color: #536471;
            font-weight: 400;
        }}
        
        /* Typography Elements */
        .content-wrapper {{
            width: 100%;
            margin-top: 40px;
        }}
        .slide-step {{
            font-size: 13px;
            font-weight: 700;
            color: #2FAD64;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 8px;
        }}
        .headline {{
            font-size: 18px;
            font-weight: 700;
            color: #0f1419;
            line-height: 1.35;
            margin-bottom: 12px;
        }}
        .body-text {{
            font-size: 14px;
            font-weight: 400;
            color: #333333;
            line-height: 1.55;
            text-align: justify;
        }}
        .accent-text {{
            font-size: 14px;
            font-weight: 700;
            color: #2FAD64;
            line-height: 1.5;
            margin-top: 12px;
        }}
        
        /* Arrow Indicators */
        .swipe-arrow {{
            position: absolute;
            right: 12px;
            top: 50%;
            transform: translateY(-50%);
            width: 28px;
            height: 28px;
            border-radius: 50%;
            background: rgba(47, 173, 100, 0.1);
            display: flex;
            align-items: center;
            justify-content: center;
            pointer-events: none;
        }}
        .swipe-arrow svg {{
            width: 18px;
            height: 18px;
            fill: #2FAD64;
        }}
        
        /* Functional Bottom Rails */
        .progress-container {{
            position: absolute;
            bottom: 20px;
            left: 36px;
            right: 36px;
            display: flex;
            align-items: center;
            justify-content: space-between;
        }}
        .progress-bar-track {{
            height: 3px;
            flex-grow: 1;
            background: rgba(0, 0, 0, 0.06);
            border-radius: 2px;
            margin-right: 16px;
            overflow: hidden;
        }}
        .progress-bar-fill {{
            height: 100%;
            background: #2FAD64;
            border-radius: 2px;
            transition: width 0.3s ease;
        }}
        .progress-counter {{
            font-size: 11px;
            font-weight: 600;
            color: rgba(0, 0, 0, 0.35);
            font-variant-numeric: tabular-nums;
        }}
        
        /* Shell Native Chrome Subsets */
        .ig-actions {{
            display: flex;
            justify-content: space-between;
            padding: 12px 14px 8px 14px;
        }}
        .ig-actions-left svg, .ig-actions-right svg {{
            width: 24px;
            height: 24px;
            fill: #262626;
            margin-right: 12px;
            cursor: pointer;
        }}
        .ig-actions-right svg {{
            margin-right: 0;
        }}
        .ig-dots {{
            display: flex;
            justify-content: center;
            align-items: center;
            gap: 4px;
            padding-bottom: 4px;
        }}
        .dot {{
            width: 6px;
            height: 6px;
            border-radius: 50%;
            background: #a8a8a8;
            transition: all 0.2s;
            cursor: pointer;
        }}
        .dot.active {{
            background: #0095f6;
            transform: scale(1.1);
        }}
        .ig-caption {{
            padding: 0 14px 14px 14px;
            font-size: 13px;
            color: #262626;
            line-height: 1.4;
        }}
        .ig-timestamp {{
            font-size: 10px;
            color: #8e8e8e;
            text-transform: uppercase;
            margin-top: 6px;
            letter-spacing: 0.2px;
        }}
    </style>
</head>
<body>

    <div class="ig-frame">
        <div class="ig-header">
            <div class="ig-avatar">PK</div>
            <div class="ig-header-meta">
                <div class="ig-header-title">publishkit_in</div>
            </div>
            <svg style="fill:#262626;" height="24" viewBox="0 0 24 24" width="24"><circle cx="12" cy="12" r="1.5"></circle><circle cx="6" cy="12" r="1.5"></circle><circle cx="18" cy="12" r="1.5"></circle></svg>
        </div>

        <div class="carousel-viewport" id="viewport">
            <div class="carousel-track" id="track">
                {slides_html}
            </div>
        </div>

        <div class="ig-actions">
            <div class="ig-actions-left" style="display: flex;">
                <svg viewBox="0 0 24 24"><path d="M16.792 3.904A4.989 4.989 0 0121.5 9.122c0 3.072-2.652 4.959-5.197 7.222-2.512 2.243-3.865 3.469-4.303 3.752-.477-.309-2.143-1.823-4.303-3.752C5.141 14.07 2.5 12.194 2.5 9.122a4.989 4.989 0 014.708-5.218 4.21 4.21 0 013.675 1.941c.134.225.295.47.417.609.123-.14.283-.384.417-.609a4.21 4.21 0 013.675-1.941m0-2a6.075 6.075 0 00-4.792 2.282A6.075 6.075 0 007.208 1.904 6.966 6.966 0 00.5 8.878c0 5.8 4.67 8.676 7.412 11.125 2.825 2.522 3.6 3.033 3.6 3.033s.775-.511 3.6-3.033c2.742-2.449 7.412-5.32 7.412-11.125a6.966 6.966 0 00-6.708-6.974z"/></svg>
                <svg viewBox="0 0 24 24"><path d="M20.656 17.008a9.993 9.993 0 10-3.59 3.615l2.522.634z" fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="2"/></svg>
                <svg viewBox="0 0 24 24"><line fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="2" x1="22" x2="9.218" y1="3" y2="10.063"/><polygon fill="none" points="11.698 20.334 22 3.001 2 10.263 11.698 20.334" stroke="currentColor" stroke-linejoin="round" stroke-width="2"/></svg>
            </div>
            <div class="ig-dots">
                {dots_html}
            </div>
            <div class="ig-actions-right">
                <svg viewBox="0 0 24 24"><polygon fill="none" points="20 21 12 13.44 4 21 4 3 20 3 20 21" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/></svg>
            </div>
        </div>

        <div class="ig-caption">
            <strong>publishkit_in</strong> Simplify production workflows natively using optimized cross-platform generation. #SaaS #YouTube #Growth 
            <div class="ig-timestamp">2 hours ago</div>
        </div>
    </div>

    <script>
        const track = document.getElementById('track');
        const viewport = document.getElementById('viewport');
        const dots = document.querySelectorAll('.dot');
        const totalSlides = {total_slides};
        
        let currentIndex = 0;
        let startX = 0;
        let currentTranslate = 0;
        let prevTranslate = 0;
        let isDragging = false;
        
        // Pointer Handlers for Swipe Simulation
        viewport.addEventListener('pointerdown', (e) => {{
            isDragging = true;
            startX = e.clientX;
            track.style.transition = 'none';
            viewport.setPointerCapture(e.pointerId);
        }});
        
        viewport.addEventListener('pointermove', (e) => {{
            if (!isDragging) return;
            const currentX = e.clientX;
            const diff = currentX - startX;
            currentTranslate = prevTranslate + diff;
            track.style.transform = `translateX(${{currentTranslate}}px)`;
        }});
        
        viewport.addEventListener('pointerup', (e) => {{
            if (!isDragging) return;
            isDragging = false;
            viewport.releasePointerCapture(e.pointerId);
            
            const movedBy = currentTranslate - prevTranslate;
            if (movedBy < -50 && currentIndex < totalSlides - 1) {{
                currentIndex++;
            }} else if (movedBy > 50 && currentIndex > 0) {{
                currentIndex--;
            }}
            
            goToSlide(currentIndex);
        }});
        
        function goToSlide(index) {{
            currentIndex = index;
            prevTranslate = -currentIndex * 420;
            currentTranslate = prevTranslate;
            track.style.transition = 'transform 0.4s cubic-bezier(0.25, 1, 0.5, 1)';
            track.style.transform = `translateX(${{prevTranslate}}px)`;
            
            dots.forEach((dot, i) => {{
                dot.classList.toggle('active', i === currentIndex);
            }});
        }}
    </script>
</body>
</html>
"""
    
    output_html_path = Path("carousel.html")
    output_html_path.write_text(html_payload, encoding="utf-8")
    print(f"Self-contained preview HTML successfully written to: {output_html_path.resolve()}")

if __name__ == "__main__":
    generate_carousel_html()
