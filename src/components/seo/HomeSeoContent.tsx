import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FAQ_ITEMS } from '../../lib/seo-schema';

/**
 * SEO content block for the home page. Google/Bing need substantial textual
 * content to understand and rank a page — a bare tool UI rarely ranks. This
 * renders ~600 words about the product (keyword: "AI YouTube content
 * generator") plus an FAQ accordion. The FAQ text is sourced from the same
 * FAQ_ITEMS used to build the FAQPage JSON-LD, so structured data matches the
 * visible content (required for valid rich results).
 *
 * Rendered at the bottom of the landing view so it doesn't interfere with the
 * upload / processing / results flow.
 */
export function HomeSeoContent() {
  return (
    <section className="max-w-3xl mx-auto mt-16 mb-8 px-1 text-left">
      <article className="prose prose-invert max-w-none text-[#B5B5B5] leading-relaxed space-y-6">
        <h2 className="text-2xl font-bold text-white">
          The AI YouTube Content Generator for Faster Publishing
        </h2>
        <p>
          PublishKit is an{' '}
          <strong className="text-white">AI YouTube content generator</strong>{' '}
          built for creators who would rather make videos than spend hours on
          metadata. Upload your raw audio, a PDF, or an image, and PublishKit
          turns it into everything you need to publish: click-worthy titles, an
          SEO-optimized description, accurate chapter timestamps, thumbnail
          prompts, a full script, and ready-to-post social captions — in about
          90 seconds.
        </p>

        <h3 className="text-xl font-semibold text-white">
          Generate YouTube titles, descriptions, and timestamps
        </h3>
        <p>
          Writing a good YouTube title is part art, part SEO. PublishKit reads
          what is actually said in your video and proposes titles designed to
          earn clicks while staying true to your topic. The{' '}
          <strong className="text-white">YouTube description generator</strong>{' '}
          produces a structured, keyword-aware description with the right
          context, links section, and call-to-action — no blank-page staring.
          The built-in{' '}
          <strong className="text-white">timestamp generator</strong> listens to
          your audio and creates clean, clickable chapters so viewers can jump
          to the part they want, which improves watch time and retention.
        </p>

        <h3 className="text-xl font-semibold text-white">
          Turn one video into a full content kit
        </h3>
        <p>
          Modern creators publish everywhere. With PublishKit's repurposing,
          one upload becomes posts for X, Instagram, LinkedIn, and YouTube
          Community — each adapted to the platform instead of copy-pasted. The{' '}
          <strong className="text-white">AI script generator</strong> can also
          draft or tighten your script, so your next video starts from a strong
          outline rather than a blank document. Everything is generated from
          your actual content, keeping the message consistent across channels.
        </p>

        <h3 className="text-xl font-semibold text-white">
          Sounds like you, in your language
        </h3>
        <p>
          Generic AI output reads like a robot. PublishKit uses your Creator
          Profile — your niche, tone, brand, and audience — to keep results in
          your voice. It is natively multilingual, supporting 13 languages
          including Hinglish, Hindi, Telugu, Tamil, Marathi, Punjabi, and
          Bhojpuri with proper native scripts, so you can publish for the
          audience you actually serve.
        </p>

        <h3 className="text-xl font-semibold text-white">
          Private, fast, and free to start
        </h3>
        <p>
          You can try PublishKit free with a session that needs no sign-in.
          Your uploaded media is processed only for your generation and
          automatically deleted within three hours, and it is never used to
          train AI models. Paid plans unlock higher monthly limits and extra
          features when you are ready to scale. Whether you are a new creator
          publishing your first video or a studio shipping content daily, an{' '}
          <strong className="text-white">AI YouTube content generator</strong>{' '}
          like PublishKit removes the busywork so you can focus on creating.
          Learn more on our{' '}
          <Link to="/about" className="text-[#E05A1E] hover:underline">
            about page
          </Link>{' '}
          or see plans on{' '}
          <Link to="/pricing" className="text-[#E05A1E] hover:underline">
            pricing
          </Link>
          .
        </p>
      </article>

      <HomeFaq />
    </section>
  );
}

function HomeFaq() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <div className="mt-12">
      <h2 className="text-2xl font-bold text-white mb-6">
        Frequently asked questions
      </h2>
      <div className="space-y-3">
        {FAQ_ITEMS.map((item, i) => {
          const isOpen = open === i;
          return (
            <div
              key={i}
              className="border border-[#2A2A2A] rounded-xl bg-[#1A1A1A] overflow-hidden"
            >
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : i)}
                aria-expanded={isOpen}
                className="w-full flex items-center justify-between gap-4 px-4 py-3.5 text-left"
              >
                <span className="text-sm sm:text-base font-semibold text-white">
                  {item.q}
                </span>
                <span
                  className={`text-[#E05A1E] text-xl leading-none transition-transform ${
                    isOpen ? 'rotate-45' : ''
                  }`}
                >
                  +
                </span>
              </button>
              {isOpen && (
                <div className="px-4 pb-4 text-sm text-[#B5B5B5] leading-relaxed">
                  {item.a}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default HomeSeoContent;
