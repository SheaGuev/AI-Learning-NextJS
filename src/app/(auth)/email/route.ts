import { createServerClient } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient1 } from '../../../lib/server-actions/create-client';

export async function GET(req: NextRequest) {
  const requestUrl = new URL(req.url);
  const code = requestUrl.searchParams.get('code');

  if (code) {
    const supabase =  await createClient1();
    await supabase.auth.exchangeCodeForSession(code);
  }                                                                                                                                                                                  
  return NextResponse.redirect(`${requestUrl.origin}/dashboard`);
}

