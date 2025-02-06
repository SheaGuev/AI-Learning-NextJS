import { createServerClient } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
// import { createBClient } from '../../../lib/server-actions/createClient';
// import { createSClient } from '../../../lib/server-actions/createServerClient';
import { createClient } from '@supabase/supabase-js';



export async function GET(req: NextRequest) {
  const requestUrl = new URL(req.url);
  const code = requestUrl.searchParams.get('code');

  if (code) {

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
      auth: {
          detectSessionInUrl: true,
          flowType: 'pkce',
          // storage: customStorageAdapter,
      }
    }
)



    await supabase.auth.exchangeCodeForSession(code);
    // const { data, error } = await supabase.auth.verifyOtp({ token_hash: code, type: 'email'})
    // // const { data, error } = await supabase.auth.signInWithIdToken({
    //   provider: 'email',
    //   token: code,
    // })

    // if (error) { console.log('error', error); }
      }                                                                                                                                                                                  
  return NextResponse.redirect(`${requestUrl.origin}/dashboard`);
}



