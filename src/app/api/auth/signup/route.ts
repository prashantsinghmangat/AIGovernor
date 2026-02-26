import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { createServerSupabase } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { companyName, teamSize, role } = body;

  if (!companyName) {
    return NextResponse.json(
      { error: 'Company name is required' },
      { status: 400 }
    );
  }

  // Get the authenticated user from the session
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: 'Not authenticated' },
      { status: 401 }
    );
  }

  // Use admin client to bypass RLS
  const admin = createAdminSupabase();

  // Create company
  const slug = companyName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  const { data: company, error: companyError } = await admin
    .from('companies')
    .insert({ name: companyName, slug })
    .select()
    .single();

  if (companyError) {
    return NextResponse.json(
      { error: companyError.message },
      { status: 500 }
    );
  }

  // Create user profile linked to the company
  const { error: userError } = await admin.from('users').insert({
    id: user.id,
    company_id: company.id,
    email: user.email!,
    role: role || 'owner',
    job_title: role || null,
    onboarding_completed: false,
  });

  if (userError) {
    // Rollback: delete the company if user creation fails
    await admin.from('companies').delete().eq('id', company.id);
    return NextResponse.json(
      { error: userError.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    data: { company_id: company.id, user_id: user.id },
  });
}
