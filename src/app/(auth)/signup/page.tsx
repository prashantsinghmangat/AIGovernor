'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { createClient } from '@/lib/supabase/client';

export default function SignupPage() {
  const [companyName, setCompanyName] = useState('');
  const [teamSize, setTeamSize] = useState('');
  const [role, setRole] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // 1. Create auth user
    const { data, error: authError } = await supabase.auth.signUp({ email, password });
    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    if (data.user) {
      // 2. Call server API to create company + user profile (bypasses RLS)
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyName, teamSize, role }),
      });

      if (res.ok) {
        router.push('/onboarding');
      } else {
        const err = await res.json();
        setError(err.error || 'Failed to create company');
      }
    }
    setLoading(false);
  };

  return (
    <Card className="w-full max-w-md bg-[#131b2e] border-[#1e2a4a]">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-display text-white">Create Your Account</CardTitle>
        <Badge className="bg-green-500/10 text-green-400 border-0 mt-2">14-day free trial</Badge>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSignup} className="space-y-4">
          {error && <p className="text-sm text-red-400 text-center">{error}</p>}
          <div className="space-y-2">
            <Label className="text-[#8892b0]">Company Name</Label>
            <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} required className="bg-[#0a0e1a] border-[#1e2a4a] text-white" placeholder="Acme Corporation" />
          </div>
          <div className="space-y-2">
            <Label className="text-[#8892b0]">Team Size</Label>
            <Select value={teamSize} onValueChange={setTeamSize}>
              <SelectTrigger className="bg-[#0a0e1a] border-[#1e2a4a] text-white"><SelectValue placeholder="Select team size" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="1-10">1-10</SelectItem>
                <SelectItem value="11-50">11-50</SelectItem>
                <SelectItem value="51-200">51-200</SelectItem>
                <SelectItem value="200+">200+</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-[#8892b0]">Your Role</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger className="bg-[#0a0e1a] border-[#1e2a4a] text-white"><SelectValue placeholder="Select your role" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="CTO">CTO</SelectItem>
                <SelectItem value="VP Engineering">VP Engineering</SelectItem>
                <SelectItem value="Tech Lead">Tech Lead</SelectItem>
                <SelectItem value="Engineering Manager">Engineering Manager</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-[#8892b0]">Work Email</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="bg-[#0a0e1a] border-[#1e2a4a] text-white" placeholder="you@company.com" />
          </div>
          <div className="space-y-2">
            <Label className="text-[#8892b0]">Password</Label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} className="bg-[#0a0e1a] border-[#1e2a4a] text-white" placeholder="••••••••" />
          </div>
          <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white" disabled={loading}>
            {loading ? 'Creating account...' : 'Create Account'}
          </Button>
          <p className="text-center text-sm text-[#8892b0]">
            Already have an account?{' '}
            <Link href="/login" className="text-blue-400 hover:underline">Sign in</Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
