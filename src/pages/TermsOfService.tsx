import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

/**
 * Terms of Service page. Public route (no auth required). Required for:
 *   - Google OAuth app verification
 *   - Razorpay business verification (refund policy section is critical)
 *   - Consumer Protection (E-Commerce) Rules 2020 (India)
 *
 * Content matches actual plan structure (Free 3 / Pro 100 / Max 350),
 * pricing (₹299 / ₹1,000), and refund window (no refunds on usage, full
 * refund within 7 days if no generation used — standard for SaaS in India).
 */
export function TermsOfService() {
  return (
    <div className="min-h-screen bg-[#0D0D0D] text-[#F5F5F5]">
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
        <h1 className="text-4xl md:text-5xl font-bold mb-4">Terms of Service</h1>
        <p className="text-gray-400 mb-12">Last updated: 21 May 2026</p>

        <div className="prose prose-invert max-w-none space-y-8 text-gray-200 leading-relaxed">
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">1. Acceptance of Terms</h2>
            <p>
              These Terms of Service (&ldquo;Terms&rdquo;) govern your use of PublishKit at{' '}
              <a href="https://publishkit.in" className="text-orange-500 hover:underline">
                https://publishkit.in
              </a>{' '}
              (the &ldquo;Service&rdquo;). By accessing or using the Service, you agree to be
              bound by these Terms and our{' '}
              <Link to="/privacy" className="text-orange-500 hover:underline">
                Privacy Policy
              </Link>
              . If you do not agree, do not use the Service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">2. Description of Service</h2>
            <p>
              PublishKit is an AI-powered content tool that helps YouTube creators generate:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4 mt-2">
              <li>Video titles, descriptions, timestamps, and hashtags</li>
              <li>Long-form video scripts</li>
              <li>Multi-platform social posts (X / Instagram / LinkedIn)</li>
              <li>Thumbnail concept prompts for Imagen and ChatGPT</li>
            </ul>
            <p className="mt-4">
              The Service uses Google Gemini AI for generation. AI output may contain errors,
              inaccuracies, or be unsuitable for some contexts. <strong>You are responsible
              for reviewing all output before publishing.</strong>
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">3. Eligibility &amp; Account</h2>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>You must be at least 13 years old to use the Service.</li>
              <li>You must sign in with a valid Google account.</li>
              <li>One person = one account. Creating multiple accounts to bypass free-tier limits is prohibited.</li>
              <li>You are responsible for all activity under your account.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">4. Plans &amp; Pricing</h2>
            <table className="w-full text-sm mt-2 border border-gray-800 rounded-lg overflow-hidden">
              <thead className="bg-gray-900">
                <tr>
                  <th className="text-left p-3 border-b border-gray-800">Plan</th>
                  <th className="text-left p-3 border-b border-gray-800">Price (INR)</th>
                  <th className="text-left p-3 border-b border-gray-800">Monthly Limit (per feature)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="p-3 border-b border-gray-800">Free</td>
                  <td className="p-3 border-b border-gray-800">₹0</td>
                  <td className="p-3 border-b border-gray-800">3</td>
                </tr>
                <tr>
                  <td className="p-3 border-b border-gray-800">Pro</td>
                  <td className="p-3 border-b border-gray-800">₹299</td>
                  <td className="p-3 border-b border-gray-800">100</td>
                </tr>
                <tr>
                  <td className="p-3">Max</td>
                  <td className="p-3">₹1,000</td>
                  <td className="p-3">350</td>
                </tr>
              </tbody>
            </table>
            <p className="mt-4">
              Prices are inclusive of GST where applicable. We offer two payment modes:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4 mt-2">
              <li>
                <strong>One-time (recommended)</strong> — pay once for 30 days of access. No
                autopay mandate. Renewal is manual.
              </li>
              <li>
                <strong>Auto-pay (subscription)</strong> — Razorpay charges your method every
                30 days until you cancel.
              </li>
            </ul>
            <p className="mt-4">
              We reserve the right to change prices with 30 days&rsquo; notice via in-app banner
              and email. Price changes do not affect already-paid plans until renewal.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">5. Refund Policy</h2>
            <p>
              We want you to be happy with PublishKit. Our refund policy:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4 mt-2">
              <li>
                <strong>Full refund within 7 days</strong> of purchase if you have used{' '}
                <strong>0 paid-tier generations</strong>. Email{' '}
                <a
                  href="mailto:ravishankaraiofficial@gmail.com"
                  className="text-orange-500 hover:underline"
                >
                  ravishankaraiofficial@gmail.com
                </a>{' '}
                with your registered email and Razorpay payment ID.
              </li>
              <li>
                <strong>Partial / pro-rata refunds are not available</strong> once you have
                used any paid-tier generation, since AI inference cost has been incurred.
              </li>
              <li>
                <strong>Subscriptions can be cancelled anytime</strong> from Razorpay or by
                emailing us. Cancellation stops future charges; the current paid month
                continues until expiry.
              </li>
              <li>
                <strong>Failed payments / duplicate charges</strong> are refunded immediately
                upon notification.
              </li>
              <li>
                Approved refunds are processed within 5-7 working days to the original payment
                method via Razorpay.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">6. User Obligations</h2>
            <p>You agree NOT to use the Service to:</p>
            <ul className="list-disc list-inside space-y-2 ml-4 mt-2">
              <li>Upload illegal, defamatory, infringing, or harmful content.</li>
              <li>Upload content depicting minors in any sexualized context.</li>
              <li>
                Upload content you do not have the legal right to process (copyrighted music,
                stolen audio, etc.). You alone are liable for any third-party rights claims.
              </li>
              <li>Generate spam, misinformation, deceptive clickbait, or impersonation content.</li>
              <li>
                Reverse-engineer, scrape, or attempt to bypass rate limits, App Check, or
                authentication.
              </li>
              <li>
                Create multiple free accounts via VPN, multiple devices, or different emails
                to bypass free-tier limits.
              </li>
              <li>Resell or sublicense the Service without our written permission.</li>
              <li>Interfere with the Service or other users&rsquo; use of it.</li>
            </ul>
            <p className="mt-4">
              Violation of these obligations may result in immediate account suspension without
              refund.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">7. Intellectual Property</h2>
            <h3 className="text-lg font-semibold text-white mt-4 mb-2">Your Content</h3>
            <p>
              You retain all rights to the audio, PDFs, images, and text you upload. By
              uploading, you grant us a temporary, limited license to process that content
              through Google Gemini solely to generate the output you requested. This license
              ends when the content is deleted (within 3 hours of upload).
            </p>

            <h3 className="text-lg font-semibold text-white mt-4 mb-2">Generated Output</h3>
            <p>
              You own the output PublishKit generates from your uploads. You are free to use
              titles, descriptions, scripts, and posts for commercial purposes. Note that AI
              output may not be copyrightable in some jurisdictions.
            </p>

            <h3 className="text-lg font-semibold text-white mt-4 mb-2">Our Property</h3>
            <p>
              The PublishKit name, logo, source code, prompt engineering, and product design
              are our property and protected by Indian and international IP laws. You may not
              copy, modify, or redistribute these without permission.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">8. AI Output Disclaimer</h2>
            <p>
              AI-generated content is provided &ldquo;as is&rdquo;. We do not warrant accuracy,
              factual correctness, originality, or suitability for any specific purpose. AI may:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4 mt-2">
              <li>Produce text that resembles existing copyrighted work — check before publishing.</li>
              <li>Generate factual errors or misleading information — verify all claims.</li>
              <li>Reflect biases present in its training data.</li>
              <li>Refuse or fail to generate output on certain topics.</li>
            </ul>
            <p className="mt-4">
              <strong>You are solely responsible</strong> for reviewing AI output and for any
              consequences of publishing it.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">9. Service Availability</h2>
            <p>
              We aim for high uptime but do not guarantee uninterrupted service. The Service
              depends on Google Cloud (Firebase, Gemini), Razorpay, and your internet
              connection. Outages of these providers may affect availability. Planned
              maintenance will be announced where feasible.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">10. Limitation of Liability</h2>
            <p>
              To the maximum extent permitted by law, our total liability to you for any claim
              arising out of or relating to the Service is limited to the amount you have paid
              us in the 12 months preceding the claim (or ₹1,000, whichever is lower for free
              users). We are not liable for indirect, incidental, consequential, or punitive
              damages, including loss of revenue, data, or goodwill.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">11. Termination</h2>
            <p>You may delete your account anytime by emailing us. We may suspend or terminate your account if you:</p>
            <ul className="list-disc list-inside space-y-2 ml-4 mt-2">
              <li>Violate these Terms.</li>
              <li>Engage in fraud or chargeback abuse.</li>
              <li>Disrupt the Service or other users.</li>
              <li>Fail to pay for a subscription plan.</li>
            </ul>
            <p className="mt-4">
              Upon termination, your access ends and your data is deleted within 30 days
              (except payment records retained for tax purposes).
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">12. Governing Law &amp; Disputes</h2>
            <p>
              These Terms are governed by the laws of India. Any dispute arising out of or
              relating to the Service shall be subject to the exclusive jurisdiction of the
              courts in West Bengal, India. We encourage you to first contact us at{' '}
              <a
                href="mailto:ravishankaraiofficial@gmail.com"
                className="text-orange-500 hover:underline"
              >
                ravishankaraiofficial@gmail.com
              </a>{' '}
              to resolve disputes amicably.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">13. Changes to Terms</h2>
            <p>
              We may update these Terms when we add features, change vendors, or for legal
              reasons. The &ldquo;Last updated&rdquo; date above reflects the current version.
              Material changes will be announced via in-app banner and email at least 14 days
              before they take effect. Continued use after the effective date constitutes
              acceptance.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">14. Contact</h2>
            <p>
              PublishKit is operated as a personal project by Ravi Shankar (India). For
              questions about these Terms:
            </p>
            <p className="mt-2">
              Email:{' '}
              <a
                href="mailto:ravishankaraiofficial@gmail.com"
                className="text-orange-500 hover:underline"
              >
                ravishankaraiofficial@gmail.com
              </a>
            </p>
          </section>
        </div>

        {/* Footer nav */}
        <div className="mt-16 pt-8 border-t border-gray-800 flex flex-wrap gap-6 text-sm">
          <Link to="/" className="text-gray-400 hover:text-white">
            Home
          </Link>
          <Link to="/privacy" className="text-gray-400 hover:text-white">
            Privacy Policy
          </Link>
          <Link to="/pricing" className="text-gray-400 hover:text-white">
            Pricing
          </Link>
          <Link to="/feedback" className="text-gray-400 hover:text-white">
            Feedback
          </Link>
        </div>
      </div>
    </div>
  );
}

export default TermsOfService;
