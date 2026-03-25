import { useState } from 'react';
import { Check, Zap, Rocket, Shield } from 'lucide-react';
import CheckoutModal from './CheckoutModal';

const plans = [
  {
    id: 'FREE',
    name: 'Basic',
    price: '$0',
    description: 'Perfect for individuals starting their productivity journey.',
    icon: Shield,
    color: 'text-slate-400',
    bg: 'bg-slate-400/10',
    features: ['Up to 20 Tasks', 'Basic Analytics', 'Standard Support', 'Mobile App Access'],
    buttonText: 'Current Plan',
    isCurrent: true,
  },
  {
    id: 'PRO',
    name: 'Professional',
    price: '$9.99',
    description: 'Advanced features for power users and professionals.',
    icon: Zap,
    color: 'text-cyan-500',
    bg: 'bg-cyan-500/10',
    features: ['Unlimited Tasks', 'AI Smart Planner', 'Advanced Productivity Insights', 'Priority Support', 'Custom Themes'],
    buttonText: 'Upgrade to Pro',
    isCurrent: false,
    recommended: true,
  },
  {
    id: 'TEAM',
    name: 'Team',
    price: '$29.99',
    description: 'Collaborate and scale with your entire organization.',
    icon: Rocket,
    color: 'text-violet-500',
    bg: 'bg-violet-500/10',
    features: ['Everything in Pro', 'Unlimited Team Members', 'Admin Control Panel', 'Tenant Branding', 'API Access'],
    buttonText: 'Upgrade to Team',
    isCurrent: false,
  },
];

export function SubscriptionManagement() {
  const [checkoutModal, setCheckoutModal] = useState<{
    isOpen: boolean;
    plan: { id: string; name: string; price: string } | null;
  }>({
    isOpen: false,
    plan: null,
  });

  const handleUpgrade = (plan: typeof plans[0]) => {
    if (plan.isCurrent) return;
    setCheckoutModal({
      isOpen: true,
      plan: { id: plan.id, name: plan.name, price: plan.price },
    });
  };

  const handlePaymentComplete = (success: boolean) => {
    setCheckoutModal({ isOpen: false, plan: null });
    if (success) {
      // Handle successful payment - could show success message or refresh user data
      alert('Payment successful! Your subscription has been upgraded.');
    } else {
      alert('Payment failed. Please try again.');
    }
  };

  return (
    <div className="h-full overflow-y-auto bg-slate-950 p-8 font-sans">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-extrabold text-white mb-4">Choose Your Plan</h1>
          <p className="text-slate-400 text-lg">Supercharge your workflow with SKAI Pro and Team features.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`relative flex flex-col p-8 rounded-3xl border ${plan.recommended
                ? 'border-cyan-500/50 bg-slate-900/50 shadow-2xl shadow-cyan-500/10'
                : 'border-white/5 bg-slate-900/30'
                } transition-all hover:scale-105 duration-300`}
            >
              {plan.recommended && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-cyan-500 text-white text-[10px] font-black px-4 py-1 rounded-full uppercase tracking-widest shadow-lg shadow-cyan-500/20">
                  Most Popular
                </div>
              )}

              <div className="mb-8">
                <div className={`w-14 h-14 rounded-2xl ${plan.bg} flex items-center justify-center mb-6`}>
                  <plan.icon className={`w-8 h-8 ${plan.color}`} />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">{plan.name}</h3>
                <div className="flex items-baseline gap-1 mb-4">
                  <span className="text-4xl font-black text-white">{plan.price}</span>
                  <span className="text-slate-500">/month</span>
                </div>
                <p className="text-slate-400 text-sm leading-relaxed">{plan.description}</p>
              </div>

              <div className="flex-1 mb-8">
                <ul className="space-y-4">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <div className={`mt-1 rounded-full p-0.5 ${plan.recommended ? 'bg-cyan-500/20' : 'bg-white/5'}`}>
                        <Check className={`w-3.5 h-3.5 ${plan.color}`} />
                      </div>
                      <span className="text-slate-300 text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <button
                className={`w-full py-4 rounded-2xl font-bold transition-all ${plan.isCurrent
                  ? 'bg-white/5 text-slate-500 cursor-default border border-white/10'
                  : plan.recommended
                    ? 'bg-cyan-500 text-white hover:bg-cyan-400 shadow-xl shadow-cyan-500/20 active:scale-95'
                    : 'bg-white/10 text-white hover:bg-white/15 active:scale-95'
                  }`}
                disabled={plan.isCurrent}
                onClick={() => handleUpgrade(plan)}
              >
                {plan.buttonText}
              </button>
            </div>
          ))}
        </div>

        <div className="mt-16 p-8 rounded-3xl bg-gradient-to-r from-cyan-500/10 to-violet-500/10 border border-white/5 flex flex-col md:flex-row items-center justify-between gap-8">
          <div>
            <h4 className="text-xl font-bold text-white mb-2">Need a custom enterprise solution?</h4>
            <p className="text-slate-400">Unlimited scale, dedicated support, and custom integrations for your large organization.</p>
          </div>
          <button className="px-8 py-3 bg-white text-slate-950 font-bold rounded-xl hover:bg-slate-200 transition-colors whitespace-nowrap">
            Contact Sales
          </button>
        </div>
      </div>

      {checkoutModal.plan && (
        <CheckoutModal
          isOpen={checkoutModal.isOpen}
          onClose={() => setCheckoutModal({ isOpen: false, plan: null })}
          plan={checkoutModal.plan}
          onPaymentComplete={handlePaymentComplete}
        />
      )}
    </div>
  );
}
