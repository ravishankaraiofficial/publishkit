import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

/**
 * Privacy Policy page. Public route (no auth required). Required for:
 *   - Google OAuth app verification (removes "Unverified app" warning)
 *   - Razorpay business verification
 *   - DPDP Act 2023 (India) compliance
 *   - General user trust
 *
 * Content reflects the actual data practices wired into the app:
 *   - Firebase Auth for sign-in
 *   - Firestore for profile + result storage
 *   - Cloud Functions for Gemini calls + Razorpay
 *   - Audio/PDF/images deleted after 3 hours (deleteOldAudio scheduled job)
 *   - FingerprintJS for free-tier abuse prevention
 *   - Razorpay for payments
 */
export function PrivacyPolicy() {
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
        <h1 className="text-4xl md:text-5xl font-bold mb-4">Privacy Policy</h1>
        <p className="text-gray-400 mb-12">Last updated: 21 May 2026</p>

        <div className="prose prose-invert max-w-none space-y-8 text-gray-200 leading-relaxed">
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">1. Introduction</h2>
            <p>
              PublishKit (&ldquo;we&rdquo;, &ldquo;us&rdquo;, &ldquo;our&rdquo;) is a web application
              that helps YouTube creators turn raw audio, PDFs, and images into ready-to-publish
              titles, descriptions, timestamps, thumbnail prompts, scripts, and social posts using
              Google&rsquo;s Gemini AI. This Privacy Policy explains what data we collect, how we
              use it, and the choices you have. By using PublishKit at{' '}
              <a href="https://publishkit.in" className="text-orange-500 hover:underline">
                https://publishkit.in
              </a>
              , you agree to the practices below.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">2. Information We Collect</h2>

            <h3 className="text-lg font-semibold text-white mt-4 mb-2">a) Account Information</h3>
            <p>
              When you sign in with Google, we receive your name, email address, and profile
              picture from your Google account. We do not receive your Google password.
            </p>

            <h3 className="text-lg font-semibold text-white mt-4 mb-2">b) Content You Upload</h3>
            <p>
              Audio files, PDFs, and images you upload for processing. These are stored in
              Google Cloud Storage and automatically deleted within{' '}
              <strong>3 hours of upload</strong> by a scheduled cleanup job. We do not retain
              your media files long-term.
            </p>

            <h3 className="text-lg font-semibold text-white mt-4 mb-2">c) Generated Output</h3>
            <p>
              AI-generated titles, descriptions, scripts, and posts. Stored in Firestore under
              your account for up to 3 hours so you can copy / re-access them, then deleted.
              MultiPost output saved alongside the source result follows the same 3-hour window.
            </p>

            <h3 className="text-lg font-semibold text-white mt-4 mb-2">d) Profile Settings</h3>
            <p>
              Voluntary information you provide on the Settings page (creator handle, niche,
              brand colors, tone preferences, audience details, etc.) used to personalize AI
              output. Stored indefinitely until you delete your account.
            </p>

            <h3 className="text-lg font-semibold text-white mt-4 mb-2">
              e) Abuse-Prevention Signals
            </h3>
            <p>
              To prevent free-tier abuse, we collect a hashed IP address (SHA-256) and a browser
              fingerprint (via FingerprintJS) on free-tier requests. These hashes do not reveal
              your real IP and are stored in Firestore solely to enforce free-tier limits.
            </p>

            <h3 className="text-lg font-semibold text-white mt-4 mb-2">f) Payment Information</h3>
            <p>
              When you upgrade to Pro Plan (₹299) or Max Plan (₹1,000), payment is processed by
              Razorpay. We never see or store your card number, UPI ID, or bank details.
              Razorpay sends us only the payment confirmation, transaction ID, and plan status.
              See Razorpay&rsquo;s privacy policy at{' '}
              <a
                href="https://razorpay.com/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-orange-500 hover:underline"
              >
                razorpay.com/privacy
              </a>
              .
            </p>

            <h3 className="text-lg font-semibold text-white mt-4 mb-2">
              g) Analytics &amp; Cookies
            </h3>
            <p>
              We use Google Analytics 4 to understand which features users find valuable. GA4
              records page views, session duration, country (city-level for India), and
              anonymized IP. We do not use Google Analytics for advertising or remarketing.
              Firebase App Check uses reCAPTCHA Enterprise to verify requests come from our
              real site and not bots.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">3. How We Use Your Data</h2>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>To generate titles, descriptions, scripts, and posts via Google Gemini.</li>
              <li>To process payments and grant the correct plan tier.</li>
              <li>To enforce monthly usage limits (Free 3 / Pro 100 / Max 350 per feature).</li>
              <li>To prevent free-tier abuse and bot signups.</li>
              <li>To send service emails (payment receipt, plan expiry reminder).</li>
              <li>To improve product features based on aggregate usage analytics.</li>
            </ul>
            <p className="mt-4">
              We do <strong>not</strong> sell your data, share it with advertisers, or use your
              uploaded content to train AI models. Your uploaded files are sent to Google
              Gemini only for the specific generation you requested.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">4. Third-Party Services</h2>
            <p>PublishKit uses the following Google Cloud and partner services:</p>
            <ul className="list-disc list-inside space-y-2 ml-4 mt-2">
              <li>
                <strong>Firebase Authentication</strong> — Google Sign-In (
                <a
                  href="https://firebase.google.com/support/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-orange-500 hover:underline"
                >
                  privacy
                </a>
                )
              </li>
              <li>
                <strong>Firebase Firestore</strong> — user profile + result storage
              </li>
              <li>
                <strong>Firebase Cloud Storage</strong> — uploaded media (auto-deleted in 3h)
              </li>
              <li>
                <strong>Cloud Functions for Firebase</strong> — server-side processing
              </li>
              <li>
                <strong>Google Gemini API (Vertex AI)</strong> — AI generation (
                <a
                  href="https://cloud.google.com/terms/data-processing-addendum"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-orange-500 hover:underline"
                >
                  terms
                </a>
                )
              </li>
              <li>
                <strong>Razorpay</strong> — payment processing (
                <a
                  href="https://razorpay.com/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-orange-500 hover:underline"
                >
                  privacy
                </a>
                )
              </li>
              <li>
                <strong>FingerprintJS</strong> — browser fingerprint for abuse prevention
              </li>
              <li>
                <strong>Google Analytics 4</strong> — usage analytics (anonymized IP)
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">5. Data Retention</h2>
            <table className="w-full text-sm mt-4 border border-gray-800 rounded-lg overflow-hidden">
              <thead className="bg-gray-900">
                <tr>
                  <th className="text-left p-3 border-b border-gray-800">Data</th>
                  <th className="text-left p-3 border-b border-gray-800">Retention</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="p-3 border-b border-gray-800">Uploaded audio / PDF / images</td>
                  <td className="p-3 border-b border-gray-800">3 hours, auto-deleted</td>
                </tr>
                <tr>
                  <td className="p-3 border-b border-gray-800">AI-generated output</td>
                  <td className="p-3 border-b border-gray-800">3 hours, auto-deleted</td>
                </tr>
                <tr>
                  <td className="p-3 border-b border-gray-800">Account &amp; profile settings</td>
                  <td className="p-3 border-b border-gray-800">Until you delete your account</td>
                </tr>
                <tr>
                  <td className="p-3 border-b border-gray-800">Payment records</td>
                  <td className="p-3 border-b border-gray-800">7 years (Indian tax law)</td>
                </tr>
                <tr>
                  <td className="p-3 border-b border-gray-800">Abuse-prevention hashes</td>
                  <td className="p-3 border-b border-gray-800">30 days (rolling)</td>
                </tr>
                <tr>
                  <td className="p-3">Analytics events</td>
                  <td className="p-3">14 months (GA4 default)</td>
                </tr>
              </tbody>
            </table>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">6. Your Rights</h2>
            <p>Under the Indian DPDP Act 2023 and applicable laws, you have the right to:</p>
            <ul className="list-disc list-inside space-y-2 ml-4 mt-2">
              <li>Access the personal data we hold about you.</li>
              <li>Request correction of inaccurate data.</li>
              <li>Request deletion of your account and associated data.</li>
              <li>Withdraw consent for analytics by enabling Do Not Track in your browser.</li>
              <li>Lodge a complaint with the Data Protection Board of India.</li>
            </ul>
            <p className="mt-4">
              To exercise any of these rights, email{' '}
              <a
                href="mailto:ravishankaraiofficial@gmail.com"
                className="text-orange-500 hover:underline"
              >
                ravishankaraiofficial@gmail.com
              </a>{' '}
              with the subject line &ldquo;Privacy Request&rdquo;. We respond within 7 working days.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">7. Children</h2>
            <p>
              PublishKit is not directed to anyone under 13. We do not knowingly collect data
              from children. If you believe a child has provided us data, email us and we will
              delete the account immediately.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">8. Security</h2>
            <p>
              All data is transmitted over HTTPS. Authentication uses Google&rsquo;s OAuth 2.0.
              Cloud Storage and Firestore enforce per-user access rules. Server secrets
              (Razorpay keys, Gemini API key, webhook secret) are stored in Google Secret
              Manager and never exposed to the browser. We have not had a known data breach.
              In the event of one, we will notify affected users within 72 hours per the DPDP
              Act.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">9. Changes to This Policy</h2>
            <p>
              We may update this policy when we add features or change vendors. The
              &ldquo;Last updated&rdquo; date above always reflects the current version. Major
              changes will be announced via in-app banner.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">10. Contact</h2>
            <p>
              PublishKit is operated as a personal project by Ravi Shankar (India). For privacy
              questions, data requests, or DPDP complaints, contact:
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
          <Link to="/terms" className="text-gray-400 hover:text-white">
            Terms of Service
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

export default PrivacyPolicy;
