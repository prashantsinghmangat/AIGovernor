import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function BillingPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-white">Billing</h1>
        <p className="text-sm text-[#8892b0] mt-1">Manage your subscription and billing</p>
      </div>
      <Card className="bg-[#131b2e] border-[#1e2a4a]">
        <CardHeader>
          <CardTitle className="text-white text-base">Current Plan</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold text-white">Growth</span>
              <Badge className="bg-blue-500/20 text-blue-400 border-0">Active</Badge>
            </div>
            <p className="text-sm text-[#8892b0] mt-1">$49/month · Up to 15 repositories</p>
          </div>
          <Button variant="outline" className="border-[#1e2a4a] text-white">
            Upgrade to Enterprise
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
