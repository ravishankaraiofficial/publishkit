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
 * Generates FAQPage schema.
 * This allows Google to show an accordion of questions directly in the search snippet.
 */
export const getFaqSchema = () => {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "Will the AI sound like a robot?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "No. Unlike generic AI, PublishKit uses your Creator Profile. By telling us about your brand color, tone, and slang, you tune the system to sound exactly like you."
        }
      },
      {
        "@type": "Question",
        "name": "Why should I pay for this when I can use ChatGPT for free?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "PublishKit is specialized for creators. For ₹299, you save 20+ hours of manual labor every month by eliminating prompt engineering, transcript cleaning, and manual timestamping."
        }
      },
      {
        "@type": "Question",
        "name": "Do you support Indian languages?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Yes. We support 13 languages including Hinglish, Telugu, Tamil, Marathi, Punjabi, and Bhojpuri."
        }
      }
    ]
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
