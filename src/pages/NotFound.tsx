import { Link } from 'react-router-dom';
import { Home as HomeIcon } from 'lucide-react';

/**
 * Custom 404 page. Public route — rendered by the catch-all `path="*"` in
 * App.tsx so unknown URLs show a branded page with a way back instead of a
 * blank screen. Mirrors the plain-div layout of PrivacyPolicy / TermsOfService.
 */
export function NotFound() {
  return (
    <div className="min-h-screen bg-[#0D0D0D] text-[#F5F5F5] flex items-center justify-center px-6">
      <div className="max-w-lg w-full text-center">
        <p className="text-7xl md:text-8xl font-extrabold text-[#E05A1E]">404</p>
        <h1 className="text-2xl md:text-3xl font-bold mt-4 mb-3">Page not found</h1>
        <p className="text-gray-400 mb-8">
          The page you&rsquo;re looking for doesn&rsquo;t exist or may have moved.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            to="/"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-[#E05A1E] text-white font-semibold hover:bg-[#c94e18] transition-colors"
          >
            <HomeIcon className="w-4 h-4" />
            Back to Home
          </Link>
          <Link
            to="/pricing"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg border border-gray-700 text-gray-300 font-semibold hover:text-white hover:border-gray-500 transition-colors"
          >
            View Pricing
          </Link>
        </div>
      </div>
    </div>
  );
}

export default NotFound;
