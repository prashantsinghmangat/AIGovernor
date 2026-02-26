'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from './use-auth';

export function useCompany() {
  const { user } = useAuth();
  const supabase = createClient();

  return useQuery({
    queryKey: ['company', user?.id],
    queryFn: async () => {
      const { data: profile } = await supabase
        .from('users')
        .select('*, company:companies(*)')
        .eq('id', user!.id)
        .single();
      return profile;
    },
    enabled: !!user,
  });
}
