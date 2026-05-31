/**
 * SEO Schema Utility
 * 
 * Generates JSON-LD structured data for Google Rich Results.
 */

/**
 * Generates Product and Offer schema for the Pricing page.
 * This allows Google to show the price (e.g., ₹299) directly in search results.
 */
export const getPricingSchema = () => {
  return {
    "@context": "https://schema.org/",
    "@type": "Product",
    "name": "PublishKit Pro Plan",
    "image": "https://publishkit.in/hero.png",
    "description": "Professional AI metadata and script generation for YouTube creators. 100 uploads per month, 13 language support, and social repurposing.",
    "brand": {
      "@type": "Brand",
      "name": "PublishKit"
    },
    "offers": {
      "@type": "AggregateOffer",
      "priceCurrency": "INR",
      "lowPrice": "299",
      "highPrice": "1000",
      "offerCount": "2",
      "offers": [
        {
          "@type": "Offer",
          "name": "Pro Plan",
          "price": "299",
          "priceCurrency": "INR",
          "availability": "https://schema.org/InStock",
          "url": "https://publishkit.in/pricing"
        },
        {
          "@type": "Offer",
          "name": "Max Plan",
          "price": "1000",
          "priceCurrency": "INR",
          "availability": "https://schema.org/InStock",
          "url": "https://publishkit.in/pricing"
        }
      ]
    }
  };
};

/**
 * Shared FAQ list — single source of truth used by BOTH the visible FAQ
 * accordion on the home page AND the FAQPage JSON-LD. Keeping them in sync
 * is required for valid rich results (the structured data must match the
 * on-page content). Questions target long-tail search demand around the
 * "AI YouTube content generator" keyword.
 */
export const FAQ_ITEMS: { q: string; a: string }[] = [
  {
    q: "What is an AI YouTube content generator?",
    a: "An AI YouTube content generator is a tool that turns your raw video material — audio, PDFs, or images — into ready-to-publish YouTube assets like titles, descriptions, chapter timestamps, thumbnail prompts, scripts, and social posts. PublishKit does all of this in about 90 seconds.",
  },
  {
    q: "How does PublishKit generate YouTube titles and descriptions?",
    a: "You upload your recording or notes and PublishKit's AI analyzes the content, then writes click-worthy titles, an SEO-optimized description, and accurate timestamps based on what's actually said in your video — not generic templates.",
  },
  {
    q: "Can it create YouTube chapter timestamps automatically?",
    a: "Yes. PublishKit listens to your audio and produces accurate, clickable chapter timestamps so viewers can jump to sections — which improves watch time and retention.",
  },
  {
    q: "Will the AI sound like a robot?",
    a: "No. Unlike generic AI, PublishKit uses your Creator Profile. By telling us about your brand, tone, and style, you tune the output to sound like you, not a template.",
  },
  {
    q: "Why use PublishKit instead of ChatGPT for free?",
    a: "PublishKit is purpose-built for creators. It works directly from audio/PDF/image (no prompt engineering or transcript cleaning), generates timestamps automatically, and keeps your voice consistent — saving 20+ hours a month.",
  },
  {
    q: "Does it support Indian and other languages?",
    a: "Yes. PublishKit supports 13 languages including Hinglish, Hindi, Telugu, Tamil, Marathi, Punjabi, and Bhojpuri, with proper native scripts.",
  },
  {
    q: "Is PublishKit free to use?",
    a: "You can start for free with a session that needs no sign-in. Paid plans unlock higher monthly limits and extra features like social repurposing.",
  },
  {
    q: "Is my uploaded audio or video private?",
    a: "Yes. Uploaded media is processed for your generation and automatically deleted within 3 hours, and it is never used to train AI models.",
  },
];

/**
 * Generates FAQPage schema from the shared FAQ_ITEMS list.
 * This allows Google/Bing to show an accordion of questions in the snippet.
 */
export const getFaqSchema = () => {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": FAQ_ITEMS.map((item) => ({
      "@type": "Question",
      "name": item.q,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": item.a,
      },
    })),
  };
};

/**
 * Generates SoftwareApplication schema for the Home page.
 */
export const getWebAppSchema = () => {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "PublishKit",
    "operatingSystem": "Web",
    "applicationCategory": "MultimediaApplication",
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "4.9",
      "ratingCount": "124"
    },
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "INR"
    }
  };
};
