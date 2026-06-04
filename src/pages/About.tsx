import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

/**
 * About page. Public route (no auth required) so crawlers and new visitors
 * can learn what PublishKit is before signing in. Mirrors the plain-div
 * layout used by PrivacyPolicy / TermsOfService.
 */
export function About() {
  return (
    <div className="min-h-screen bg-white dark:bg-[#0D0D0D] text-gray-900 dark:text-[#F5F5F5]">
      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Back link */}
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-8 text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to PublishKit
        </Link>

        {/* Header */}
        <h1 className="text-4xl md:text-5xl font-bold mb-4">About PublishKit</h1>
        <p className="text-gray-400 mb-12">
          The AI publishing assistant for YouTube creators.
        </p>

        <div className="prose prose-invert max-w-none space-y-8 text-gray-200 leading-relaxed">
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">What PublishKit Does</h2>
            <p>
              PublishKit turns raw audio, PDFs, and images into ready-to-publish YouTube
              content. Upload your recording or notes and PublishKit uses Google&rsquo;s
              Gemini AI to generate optimized titles, descriptions, chapter timestamps,
              thumbnail prompts, full scripts, and social-media posts &mdash; in your own
              voice and language.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Why We Built It</h2>
            <p>
              Publishing a video is more than hitting upload. Creators spend hours writing
              titles that rank, descriptions that convert, timestamps that retain viewers,
              and posts to promote each video across platforms. PublishKit collapses that
              busywork into a few clicks so you can spend your time creating, not formatting.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">What Makes It Different</h2>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>
                <strong>Multimodal input</strong> &mdash; works from audio, PDFs, or images,
                not just text prompts.
              </li>
              <li>
                <strong>Creator profile aware</strong> &mdash; output is tailored to your
                niche, tone, brand, and audience.
              </li>
              <li>
                <strong>Native multilingual</strong> &mdash; generate in your language with
                proper native scripts.
              </li>
              <li>
                <strong>Privacy first</strong> &mdash; uploaded media is auto-deleted within
                3 hours and never used to train AI models.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Who Builds It</h2>
            <p>
              PublishKit is an independent product built and maintained from India. We ship
              improvements continuously based on creator feedback. Have an idea or found a
              bug? We&rsquo;d love to hear from you on the{' '}
              <Link to="/feedback" className="text-orange-500 hover:underline">
                Feedback
              </Link>{' '}
              page, or email{' '}
              <a
                href="mailto:ravishankaraiofficial@gmail.com"
                className="text-orange-500 hover:underline"
              >
                ravishankaraiofficial@gmail.com
              </a>
              .
            </p>
          </section>
        </div>

        {/* Footer nav */}
        <div className="mt-16 pt-8 border-t border-gray-800 flex flex-wrap gap-6 text-sm">
          <Link to="/" className="text-gray-400 hover:text-white">
            Home
          </Link>
          <Link to="/pricing" className="text-gray-400 hover:text-white">
            Pricing
          </Link>
          <Link to="/privacy" className="text-gray-400 hover:text-white">
            Privacy Policy
          </Link>
          <Link to="/terms" className="text-gray-400 hover:text-white">
            Terms of Service
          </Link>
        </div>
      </div>
    </div>
  );
}

export default About;
