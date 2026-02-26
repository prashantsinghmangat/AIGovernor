import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check } from 'lucide-react';
import Link from 'next/link';

const plans = [
  {
    name: 'Starter', price: 'Free', period: 'forever', description: 'For small teams getting started with AI governance.',
    features: ['Up to 3 repositories', 'AI Debt Score', 'Basic alerts', 'Weekly reports', 'GitHub integration'],
    cta: 'Start Free', popular: false,
  },
  {
    name: 'Growth', price: '$49', period: '/month', description: 'For growing teams that need comprehensive governance.',
    features: ['Up to 15 repositories', 'Advanced detection signals', 'Team insights & coaching', 'PDF exports', 'Slack integration', 'Priority support'],
    cta: 'Start Free Trial', popular: true,
  },
  {
    name: 'Enterprise', price: '$199', period: '/month', description: 'For large organizations with advanced compliance needs.',
    features: ['Unlimited repositories', 'ML-powered detection', 'SSO/SAML', 'Custom integrations API', 'Dedicated support', 'On-prem deployment option'],
    cta: 'Contact Sales', popular: false,
  },
];

export default function PricingPage() {
  return (
    <div className="px-4 py-24">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-display font-bold text-white mb-4">Simple, Transparent Pricing</h1>
          <p className="text-lg text-[#8892b0]">Start free. Scale as you grow. No credit card required.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <Card key={plan.name} className={`bg-[#131b2e] border-[#1e2a4a] relative ${plan.popular ? 'border-blue-500/50' : ''}`}>
              {plan.popular && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white border-0">Most Popular</Badge>
              )}
              <CardHeader className="text-center pb-2">
                <CardTitle className="text-white text-xl">{plan.name}</CardTitle>
                <div className="mt-4">
                  <span className="text-4xl font-mono font-bold text-white">{plan.price}</span>
                  <span className="text-[#8892b0]">{plan.period}</span>
                </div>
                <p className="text-sm text-[#8892b0] mt-2">{plan.description}</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-3">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-[#e8eaf0]">
                      <Check className="h-4 w-4 text-green-400 shrink-0" /> {f}
                    </li>
                  ))}
                </ul>
                <Link href="/signup" className="block">
                  <Button className={`w-full ${plan.popular ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-[#0a0e1a] border border-[#1e2a4a] text-white hover:bg-[#182040]'}`}>
                    {plan.cta}
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
