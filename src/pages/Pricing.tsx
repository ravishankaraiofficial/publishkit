import React, { useState, useEffect } from 'react';
import { Check } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../components/ui/Toast';
import { db, functions } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { useNavigate } from 'react-router-dom';
import { PageContainer } from '../components/layout/PageContainer';

const Pricing: React.FC = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [usage, setUsage] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState<string | null>(null);

  const currentPlan = profile?.plan || 'free';

  const plans: Record<string, {
    name: string;
    price: string;
    period: string;
    limit: number;
    features: Array<{ label: string; included: boolean }>;
    badge?: string;
  }> = {
    free: {
      name: 'Free',
      price: '₹0',
      period: '',
      limit: 10,
      features: [
        { label: 'YouTube metadata generation', included: true },
        { label: 'All 4 outputs (Title, Description, Tags, Hashtags)', included: true },
        { label: 'English + Hindi support', included: true },
        { label: 'Script Writer (1 trial/week)', included: true },
        { label: 'Repurposing Planner (1 trial/week)', included: true },
        { label: 'Copy buttons on trial outputs', included: false },
      ],
    },
    pro: {
      name: 'Pro',
      price: '₹299',
      period: '/month',
      limit: 100,
      features: [
        { label: 'YouTube metadata generation', included: true },
        { label: 'All 4 outputs (Title, Description, Tags, Hashtags)', included: true },
        { label: 'English + Hindi support', included: true },
        { label: 'Script Writer (1 trial/week)', included: true },
        { label: 'Repurposing Planner (1 trial/week)', included: true },
        { label: 'Copy buttons on trial outputs', included: false },
      ],
    },
    ultra: {
      name: 'Ultra',
      price: '₹1,000',
      period: '/month',
      limit: 1000,
      features: [
        { label: 'YouTube metadata generation', included: true },
        { label: 'All 4 outputs (Title, Description, Tags, Hashtags)', included: true },
        { label: 'English + Hindi support', included: true },
        { label: 'Script Writer (unlimited)', included: true },
        { label: 'Repurposing Planner (unlimited)', included: true },
        { label: 'Copy buttons on trial outputs', included: true },
      ],
      badge: 'Script Writer + Repurposing',
    },
  };

  useEffect(() => {
    if (!user || user.isAnonymous) {
      setLoading(false);
      return;
    }

    const fetchUsage = async () => {
      try {
        const month = new Date().toISOString().slice(0, 7); // YYYY-MM
        const usageRef = doc(db, `users/${user.uid}/usage/${month}`);
        const usageDoc = await getDoc(usageRef);
        setUsage(usageDoc.exists() ? (usageDoc.data()?.count || 0) : 0);
      } catch (error) {
        console.error('Error fetching usage:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUsage();
  }, [user]);

  const handleUpgrade = async (planKey: 'pro' | 'ultra') => {
    if (!user || user.isAnonymous) {
      toast('Please sign in with Google to upgrade.', 'info');
      navigate('/login');
      return;
    }

    setUpgrading(planKey);
    try {
      const createSubscription = httpsCallable(functions, 'createSubscription');
      const result = await createSubscription({ plan: planKey }) as any;
      const { subscriptionId, keyId } = result.data;

      const options = {
        key: keyId,
        subscription_id: subscriptionId,
        name: 'PublishKit',
        description: `${planKey === 'ultra' ? 'Ultra' : 'Pro'} Plan`,
        handler: () => {
          toast('Payment successful! Your plan will activate shortly.', 'success');
          setTimeout(() => window.location.reload(), 3000);
        },
        prefill: {
          email: user.email || '',
        },
        theme: { color: '#E05A1E' },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
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
          {feature.label}
        </span>
      </div>
    ));
  };

  return (
    <PageContainer>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Simple, Transparent Pricing
          </h1>
          <p className="text-gray-400 text-lg">Choose the plan that fits your content creation needs</p>
        </div>

        {/* Usage Counter */}
        {loading ? (
          <div className="bg-neutral-900 rounded-2xl border border-gray-800 p-8 mb-12 text-center">
            <div className="h-8 bg-gray-700 rounded w-48 mx-auto animate-pulse"></div>
          </div>
        ) : (
          <div className="bg-neutral-900 border border-orange-600/30 rounded-2xl p-8 mb-12">
            <div className="max-w-2xl mx-auto">
              <p className="text-gray-400 text-sm mb-2">Current Usage — {new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' })}</p>
              <div className="flex items-center justify-between mb-3">
                <p className="text-2xl font-semibold text-white">
                  {usage} of {plans[currentPlan as keyof typeof plans].limit} used
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

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8 mb-12">
          {Object.entries(plans).map(([planKey, plan]) => {
            const isCurrent = currentPlan === planKey;
            const isUltra = planKey === 'ultra';

            return (
              <div
                key={planKey}
                className={`relative rounded-2xl overflow-hidden transition-all duration-300 ${
                  isUltra
                    ? 'md:scale-105 bg-gradient-to-b from-orange-950 to-neutral-900 border-2 border-orange-600 shadow-2xl shadow-orange-600/20'
                    : 'bg-neutral-900 border border-gray-800 hover:border-gray-700'
                } ${isCurrent && !isUltra ? 'border-orange-600/50' : ''}`}
              >
                {/* Current plan badge */}
                {isCurrent && (
                  <div className="absolute top-0 right-0 bg-orange-600 text-white px-4 py-2 text-sm font-semibold">
                    Your Plan
                  </div>
                )}

                {/* Ultra badge */}
                {plan.badge && (
                  <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-orange-600 to-orange-500 text-white text-center py-2 text-xs font-bold tracking-wide">
                    {plan.badge}
                  </div>
                )}

                <div className={`p-8 ${plan.badge ? 'pt-14' : ''}`}>
                  {/* Plan name and price */}
                  <h3 className="text-2xl font-bold text-white mb-2">{plan.name}</h3>
                  <div className="mb-6">
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-bold text-white">{plan.price}</span>
                      <span className="text-gray-400">{plan.period}</span>
                    </div>
                    <p className="text-sm text-gray-400 mt-3 mb-4">{plan.limit} uploads per month</p>
                  </div>

                  {/* CTA Button */}
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
                    {isCurrent ? '✓ Current Plan' : upgrading === planKey ? 'Opening...' : 'Upgrade'}
                  </button>

                  {/* Features list */}
                  <div className="space-y-0">{renderFeatures(planKey)}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* FAQ / Info */}
        <div className="bg-neutral-900 rounded-2xl border border-gray-800 p-8 max-w-2xl mx-auto">
          <h3 className="text-xl font-semibold text-white mb-4">Need help choosing?</h3>
          <ul className="space-y-3 text-gray-300 text-sm">
            <li>
              <strong className="text-white">Free:</strong> Perfect for testing and light content creators
            </li>
            <li>
              <strong className="text-white">Pro:</strong> Great for consistent creators wanting more outputs per month
            </li>
            <li>
              <strong className="text-white">Ultra:</strong> For professional creators who want unlimited outputs + Script Writer + Repurposing Planner
            </li>
          </ul>
        </div>
      </div>
    </PageContainer>
  );
};

export default Pricing;
