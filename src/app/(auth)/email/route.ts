// import { NextRequest, NextResponse } from 'next/server';
// import { createClient } from '@supabase/supabase-js';

// export async function GET(req: NextRequest) {
//   try {
//     // Parse the request URL to get the "code" query parameter
//     const requestUrl = new URL(req.url);
//     const code = requestUrl.searchParams.get('code');

//     if (!code) {
//       // If no code is provided, return an error response
//       return NextResponse.json({ error: 'Code is required' }, { status: 400 });
//     }

//     // Initialize the Supabase client
//     const supabase = createClient(
//       process.env.NEXT_PUBLIC_SUPABASE_URL!,
//       process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
//       {
//         auth: {
//           detectSessionInUrl: true,
//           flowType: 'pkce',
//         },
//       }
//     );

//     // Exchange the code for a session
//     const { error } = await supabase.auth.exchangeCodeForSession(code);

//     if (error) {
//       console.error('Error exchanging code for session:', error);
//       return NextResponse.json({ error: error.message }, { status: 400 });
//     }

//     // Redirect to the dashboard upon successful email confirmation
//     return NextResponse.redirect(`${requestUrl.origin}/dashboard`);
//   } catch (err) {
//     console.error('Unexpected error:', err);
//     return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
//   }
// }
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';


export async function GET(req: NextRequest) {
  const requestUrl = new URL(req.url);
  const code = requestUrl.searchParams.get('code');

  // Return a JSON error if no code is provided
  if (!code) {
    return NextResponse.json({ error: 'No code provided' }, { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        detectSessionInUrl: true,
        flowType: 'pkce',
      },
    }
  );

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error('Error exchanging code for session:', error);
    // Return a JSON response with error details rather than returning a bare error object
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // const route_url = process.env.NEXT_PUBLIC_SITE_URL
  // Successful confirmation: redirect to dashboard
  return NextResponse.redirect(`${requestUrl.origin}/dashboard`);
}
