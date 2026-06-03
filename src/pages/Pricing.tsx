import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Check } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../components/ui/Toast';
import { functions } from '../lib/firebase';
import { httpsCallable } from 'firebase/functions';
import { useNavigate } from 'react-router-dom';
import { PageContainer } from '../components/layout/PageContainer';
import { useT } from '../i18n';
import { getPricingSchema, getFaqSchema } from '../lib/seo-schema';

const Pricing: React.FC = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const t = useT();
  const [usage, setUsage] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState<string | null>(null);
  // Default to one-time: many Indian users abandon checkout when an autopay
  // mandate prompt appears. Recurring stays available as an opt-in.
  const [billingMode, setBillingMode] = useState<'one_time' | 'subscription'>('one_time');

  const currentPlan = profile?.plan || 'free';

  // Plan structure uses i18n keys for any user-visible string. Numeric values
  // (price, limit) stay literal because they're language-independent.
  // Feature keys ending in "N" are parameterized — Pricing.tsx passes {count}
  // so we have one translation string per locale that handles all 3 plans.
  const plans: Record<string, {
    nameKey: string;
    price: string;
    periodKey: string;
    limit: number;
    features: Array<{ key: string; params?: Record<string, number>; included: boolean }>;
    badgeKey?: string;
  }> = {
    free: {
      nameKey: 'pricing.freeName',
      price: '₹0',
      periodKey: '',
      limit: 3,
      features: [
        { key: 'pricing.feat.metadataN', params: { count: 3 }, included: true },
        { key: 'pricing.feat.allOutputs', included: true },
        { key: 'pricing.feat.languageSupport', included: true },
        { key: 'pricing.feat.scriptN', params: { count: 3 }, included: true },
        { key: 'pricing.feat.multipostN', params: { count: 3 }, included: true },
        { key: 'pricing.feat.copyMetadata', included: true },
      ],
    },
    pro: {
      nameKey: 'pricing.proName',
      price: '₹299',
      periodKey: 'pricing.perMonth',
      limit: 100,
      features: [
        { key: 'pricing.feat.metadataN', params: { count: 100 }, included: true },
        { key: 'pricing.feat.allOutputs', included: true },
        { key: 'pricing.feat.languageSupport', included: true },
        { key: 'pricing.feat.scriptN', params: { count: 100 }, included: true },
        { key: 'pricing.feat.multipostN', params: { count: 100 }, included: true },
        { key: 'pricing.feat.copyEverywhere', included: true },
      ],
    },
    ultra: {
      nameKey: 'pricing.maxName',
      price: '₹1,000',
      periodKey: 'pricing.perMonth',
      limit: 350,
      features: [
        { key: 'pricing.feat.metadataN', params: { count: 350 }, included: true },
        { key: 'pricing.feat.allOutputs', included: true },
        { key: 'pricing.feat.languageSupport', included: true },
        { key: 'pricing.feat.scriptN', params: { count: 350 }, included: true },
        { key: 'pricing.feat.multipostN', params: { count: 350 }, included: true },
        { key: 'pricing.feat.copyMax', included: true },
      ],
      badgeKey: 'pricing.maxBadge',
    },
  };

  useEffect(() => {
    if (!profile) {
      if (user && !user.isAnonymous) {
        // Still loading profile
        return;
      }
      setLoading(false);
      return;
    }

    const cycleStartStr = profile.usageCycleStart;
    let currentUsage = profile.metadataUsage || 0;

    if (cycleStartStr) {
      const cycleStartDate = new Date(cycleStartStr);
      const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
      if (Date.now() - cycleStartDate.getTime() > THIRTY_DAYS_MS) {
        currentUsage = 0; // Visually reset if cycle is expired
      }
    }

    setUsage(currentUsage);
    setLoading(false);
  }, [user, profile]);

  const handleUpgrade = async (planKey: 'pro' | 'ultra') => {
    if (!user || user.isAnonymous) {
      toast('Please sign in with Google to upgrade.', 'info');
      navigate('/login');
      return;
    }

    setUpgrading(planKey);
    try {
      if (billingMode === 'one_time') {
        // One-time order flow: creates a Razorpay Order, opens checkout with
        // order_id (no autopay/mandate), then verifies signature server-side
        // to grant 30 days of access.
        const createOrder = httpsCallable(functions, 'createOrder');
        const result = (await createOrder({ plan: planKey })) as any;
        const { orderId, keyId, amount, currency } = result.data;

        const options = {
          key: keyId,
          order_id: orderId,
          amount,
          currency,
          name: 'PublishKit',
          description: (planKey === 'ultra' ? 'PublishKit Max' : 'PublishKit Pro') + ' — 30 days',
          handler: async (response: any) => {
            try {
              const verify = httpsCallable(functions, 'verifyOrderPayment');
              await verify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                plan: planKey,
              });
              toast('Payment verified! Your plan is active for 30 days.', 'success');
              setTimeout(() => window.location.reload(), 1500);
            } catch (verr: any) {
              console.error('[verifyOrderPayment] Error:', verr);
              toast('Payment received — verifying. Refresh in a moment.', 'info');
            }
          },
          prefill: { email: user.email || '' },
          theme: { color: '#E05A1E' },
        };
        const rzp = new (window as any).Razorpay(options);
        rzp.open();
      } else {
        // Subscription / autopay flow (recurring).
        const createSubscription = httpsCallable(functions, 'createSubscription');
        const result = (await createSubscription({ plan: planKey })) as any;
        const { subscriptionId, keyId } = result.data;

        const options = {
          key: keyId,
          subscription_id: subscriptionId,
          name: 'PublishKit',
          description: planKey === 'ultra' ? 'PublishKit Max' : 'PublishKit Pro',
          handler: () => {
            toast('Payment successful! Your plan will activate shortly.', 'success');
            setTimeout(() => window.location.reload(), 3000);
          },
          prefill: { email: user.email || '' },
          theme: { color: '#E05A1E' },
        };
        const rzp = new (window as any).Razorpay(options);
        rzp.open();
      }
    } catch (err: any) {
      const errorMsg = err?.message || err?.toString?.() || 'Payment failed. Try again.';
      console.error('[handleUpgrade] Error:', err);
      toast(errorMsg, 'error');
    } finally {
      setUpgrading(null);
    }
  };

  const renderFeatures = (planKey: string) => {
    const features = plans[planKey as keyof typeof plans].features;
    return features.map((feature, idx) => (
      <div key={idx} className="flex items-start gap-3 py-2">
        {feature.included ? (
          <Check className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
        ) : (
          <div className="w-5 h-5 border-2 border-gray-600 rounded mt-0.5"></div>
        )}
        <span className={feature.included ? 'text-gray-100' : 'text-gray-400'}>
          {t(feature.key, feature.params)}
        </span>
      </div>
    ));
  };

  return (
    <PageContainer>
      <Helmet>
        <title>{t('seo.pricing.title')}</title>
        <meta name="description" content={t('seo.pricing.description')} />
        <link rel="canonical" href="https://publishkit.in/pricing" />
        <script type="application/ld+json">
          {JSON.stringify(getPricingSchema())}
        </script>
        <script type="application/ld+json">
          {JSON.stringify(getFaqSchema())}
        </script>
      </Helmet>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            {t('pricing.title')}
          </h1>
          <p className="text-gray-400 text-lg">{t('pricing.subtitle')}</p>
        </div>

        {/* Usage Counter */}
        {loading ? (
          <div className="bg-neutral-900 rounded-2xl border border-gray-800 p-8 mb-12 text-center">
            <div className="h-8 bg-gray-700 rounded w-48 mx-auto animate-pulse"></div>
          </div>
        ) : (
          <div className="bg-neutral-900 border border-orange-600/30 rounded-2xl p-8 mb-12">
            <div className="max-w-2xl mx-auto">
              <p className="text-gray-400 text-sm mb-2">
                {t('pricing.currentUsage')} — {profile?.usageCycleStart ? new Date(profile.usageCycleStart).toLocaleDateString() + ' to ' + new Date(new Date(profile.usageCycleStart).getTime() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString() : 'Current Cycle'}
              </p>
              <div className="flex items-center justify-between mb-3">
                <p className="text-2xl font-semibold text-white">
                  {t('pricing.usedOf', { used: usage, limit: plans[currentPlan as keyof typeof plans].limit })}
                </p>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-orange-500 to-orange-600 h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${Math.min((usage / plans[currentPlan as keyof typeof plans].limit) * 100, 100)}%`,
                  }}
                ></div>
              </div>
            </div>
          </div>
        )}

        {/* Billing-mode toggle: one-time (no autopay) vs subscription */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex rounded-full border border-gray-700 bg-neutral-900 p-1">
            <button
              type="button"
              onClick={() => setBillingMode('one_time')}
              className={`px-5 py-2 text-sm font-semibold rounded-full transition-all ${
                billingMode === 'one_time'
                  ? 'bg-gradient-to-r from-orange-600 to-orange-500 text-white shadow'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {t('pricing.toggleOneTime')}
            </button>
            <button
              type="button"
              onClick={() => setBillingMode('subscription')}
              className={`px-5 py-2 text-sm font-semibold rounded-full transition-all ${
                billingMode === 'subscription'
                  ? 'bg-gradient-to-r from-orange-600 to-orange-500 text-white shadow'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {t('pricing.toggleSubscription')}
            </button>
          </div>
        </div>
        <p className="text-center text-xs text-gray-500 mb-8">
          {billingMode === 'one_time' ? t('pricing.toggleOneTimeHelp') : t('pricing.toggleSubscriptionHelp')}
        </p>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8 mb-12">
          {Object.entries(plans).map(([planKey, plan]) => {
            const isCurrent = currentPlan === planKey;
            const isUltra = planKey === 'ultra';

            return (
              <div
                key={planKey}
                className={`group relative rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1 ${
                  isUltra
                    ? 'md:scale-105 bg-gradient-to-b from-orange-950 to-neutral-900 border-2 border-orange-600/70 shadow-xl shadow-orange-600/10 hover:shadow-2xl hover:shadow-orange-600/25 hover:border-orange-500'
                    : 'bg-neutral-900 border border-gray-800 hover:border-orange-600/60 hover:shadow-2xl hover:shadow-orange-600/30'
                } ${isCurrent && !isUltra ? 'border-orange-600/50' : ''}`}
              >
                {/* Current plan badge */}
                {isCurrent && (
                  <div className="absolute top-0 right-0 bg-orange-600 text-white px-4 py-2 text-sm font-semibold">
                    {t('pricing.currentPlan')}
                  </div>
                )}

                {/* Max badge — top banner, top corners rounded to match card */}
                {plan.badgeKey && (
                  <div className="absolute top-0 left-0 right-0 rounded-t-2xl bg-gradient-to-r from-orange-600 to-orange-500 text-white text-center py-2 text-xs font-bold tracking-wide">
                    {t(plan.badgeKey)}
                  </div>
                )}

                <div className={`p-8 ${plan.badgeKey ? 'pt-14' : ''}`}>
                  {/* Plan name and price */}
                  <h3 className="text-2xl font-bold text-white mb-2">{t(plan.nameKey)}</h3>
                  <div className="mb-6">
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-bold text-white">{plan.price}</span>
                      <span className="text-gray-400">{plan.periodKey ? t(plan.periodKey) : ''}</span>
                    </div>
                    <p className="text-sm text-gray-400 mt-3 mb-4">{t('pricing.uploadsPerMonth', { count: plan.limit })}</p>
                  </div>

                  {/* CTA: Upgrade button for Pro / Max — replaced with value-prop lines on Free.
                      Lines use the same tick mark, font, and spacing as the features list below so
                      they read as a single continuous checklist with no visual seam. */}
                  {planKey === 'free' ? (
                    <>
                      {[
                        'pricing.feat.uniqueTitles',
                        'pricing.feat.tunedDescription',
                        'pricing.feat.timestamps',
                        'pricing.feat.hashtags',
                      ].map((key) => (
                        <div key={key} className="flex items-start gap-3 py-2">
                          <Check className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                          <span className="text-gray-100">{t(key)}</span>
                        </div>
                      ))}
                    </>
                  ) : (
                    <button
                      onClick={() => handleUpgrade(planKey as 'pro' | 'ultra')}
                      disabled={isCurrent || upgrading === planKey}
                      className={`w-full py-3 px-4 rounded-lg font-semibold transition-all duration-200 mb-8 ${
                        isCurrent
                          ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                          : upgrading === planKey
                          ? 'bg-gray-700 text-gray-400 cursor-not-allowed opacity-75'
                          : isUltra
                          ? 'bg-gradient-to-r from-orange-600 to-orange-500 text-white hover:from-orange-700 hover:to-orange-600 shadow-lg shadow-orange-600/30'
                          : 'bg-gray-800 text-white hover:bg-gray-700'
                      }`}
                    >
                      {isCurrent ? '✓ ' + t('pricing.currentPlan') : upgrading === planKey ? t('common.loading') : t('pricing.upgrade')}
                    </button>
                  )}

                  {/* Features list */}
                  <div className="space-y-0">{renderFeatures(planKey)}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* FAQ / Info */}
        <div className="bg-neutral-900 rounded-2xl border border-gray-800 p-8 max-w-2xl mx-auto">
          <h3 className="text-xl font-semibold text-white mb-4">{t('pricing.helpTitle')}</h3>
          <ul className="space-y-3 text-gray-300 text-sm">
            <li>{t('pricing.helpFree')}</li>
            <li>{t('pricing.helpPro')}</li>
            <li>{t('pricing.helpMax')}</li>
          </ul>
        </div>
      </div>
    </PageContainer>
  );
};

export default Pricing;
