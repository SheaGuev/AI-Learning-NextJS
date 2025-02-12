
import { createServerClient } from '@supabase/ssr';
import { type NextRequest, NextResponse } from 'next/server';

export async function updateSession(request: NextRequest) {
  // Initialize a single response object
  const response = NextResponse.next({ request });

  // Create Supabase client with cookie handling
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // Get the current user session
  const {
    data: { user },
  } = await supabase.auth.getUser();


  // Obtain the current user session (or user info)
  const { pathname, searchParams } = request.nextUrl;
  
  // If on /email and no confirmation code exists, assume confirmation is done.
  if (pathname === '/email' && !searchParams.get('code')) {
    // If the user is authenticated, redirect away from the /email route.
    if (user) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  // Protect dashboard routes: redirect to login if not authenticated
  if (request.nextUrl.pathname.startsWith('/dashboard') && !user) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Handle email link errors: if the error description matches and not on signup, then redirect to signup
  const emailLinkError = 'Email link is invalid or has expired';
  if (
    request.nextUrl.searchParams.get('error_description') === emailLinkError &&
    request.nextUrl.pathname !== '/signup'
  ) {
    return NextResponse.redirect(
      new URL(`/signup?error_description=${emailLinkError}`, request.url)
    );
  }

  // Redirect authenticated users from auth pages to dashboard
  if (['/login', '/signup', '/email'].includes(request.nextUrl.pathname) && user) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // Return the unified response object with any cookies updated
  return response;
}
