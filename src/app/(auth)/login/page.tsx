'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push('/dashboard');
    }
  };

  return (
    <Card className="w-full max-w-md bg-[#131b2e] border-[#1e2a4a]">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-display text-white">Welcome Back</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleLogin} className="space-y-4">
          {error && <p className="text-sm text-red-400 text-center">{error}</p>}
          <div className="space-y-2">
            <Label className="text-[#8892b0]">Email</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="bg-[#0a0e1a] border-[#1e2a4a] text-white" placeholder="you@company.com" />
          </div>
          <div className="space-y-2">
            <Label className="text-[#8892b0]">Password</Label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="bg-[#0a0e1a] border-[#1e2a4a] text-white" placeholder="••••••••" />
          </div>
          <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </Button>
          <p className="text-center text-sm text-[#8892b0]">
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="text-blue-400 hover:underline">Sign up</Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
