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

  // Create a standard Supabase client
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        flowType: 'pkce',
        autoRefreshToken: true,
        detectSessionInUrl: true,
        persistSession: true,
      },
    }
  );

  // Exchange the code for a session
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error('Error exchanging code for session:', error);
    // Redirect to the login page with an error message
    return NextResponse.redirect(`${requestUrl.origin}/login?error=${encodeURIComponent(error.message)}`);
  }

  if (!data.session) {
    console.error('No session data returned from code exchange');
    return NextResponse.redirect(`${requestUrl.origin}/login?error=${encodeURIComponent('Authentication failed')}`);
  }

  // Log success
  console.log('Session established successfully for user:', data.session.user.id);
  
  // Create response with redirect
  const response = NextResponse.redirect(`${requestUrl.origin}/dashboard`);
  
  // Set auth cookie manually to ensure it's available on client
  response.cookies.set('supabase-auth-token', JSON.stringify([data.session.access_token, data.session.refresh_token]), {
    maxAge: 60 * 60 * 24 * 7, // 1 week
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  });

  return response;
}
