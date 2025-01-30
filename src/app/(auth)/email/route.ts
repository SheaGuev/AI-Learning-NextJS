import { createServerClient } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createBClient } from '../../../lib/server-actions/createClient';
// import { createSClient } from '../../../lib/server-actions/createServerClient';



export async function GET(req: NextRequest) {
  const requestUrl = new URL(req.url);
  const code = requestUrl.searchParams.get('code');

  if (code) {
    const supabase =  await createBClient();
    await supabase.auth.exchangeCodeForSession(code);
  }                                                                                                                                                                                  
  return NextResponse.redirect(`${requestUrl.origin}/dashboard`);
}

