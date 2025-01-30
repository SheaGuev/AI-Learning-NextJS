import { createServerClient } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';
import { createSClient } from './lib/server-actions/createServerClient';
// import { createBClient } from './lib/server-actions/createClient';


export const runtime = 'experimental-edge'; 

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();

//   export const config = {
//   matcher: [
//     '/((?!api|_next/static|_next/image|favicon.ico|public|site.webmanifest|robots.txt|sitemap.xml|auth|.*\\.(?:ico|json|txt|xml|png|jpg|jpeg|gif|svg|css|js|woff2)).*)'
//   ]
// };
  
  // Create Supabase client with proper cookie handling
  const supabase = await createSClient();

  // Refresh session (critical for middleware)
  const { data: { session } } = await supabase.auth.getSession();

  // Dashboard protection
  if (req.nextUrl.pathname.startsWith('/dashboard') && !session) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  // Handle email link errors
  const emailLinkError = 'Email link is invalid or has expired';
  if (
    req.nextUrl.searchParams.get('error_description') === emailLinkError &&
    req.nextUrl.pathname !== '/signup'
  ) {
    return NextResponse.redirect(
      new URL(`/signup?error_description=${emailLinkError}`, req.url)
    );
  }

  // Redirect authenticated users from auth pages
  if (['/login', '/signup'].includes(req.nextUrl.pathname) && session) {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  return res;
}



// import { createServerClient } from '@supabase/ssr';
// import { NextRequest, NextResponse } from 'next/server';

// export async function middleware(req: NextRequest) {
//   const res = NextResponse.next();
//   const supabase = createServerClient({ req, res });
//   const {
//     data: { session },
//   } = await supabase.auth.getSession();
//   if (req.nextUrl.pathname.startsWith('/dashboard')) {
//     if (!session) {
//       return NextResponse.redirect(new URL('/login', req.url));
//     }
//   }

//   const emailLinkError = 'Email link is invalid or has expired';
//   if (
//     req.nextUrl.searchParams.get('error_description') === emailLinkError &&
//     req.nextUrl.pathname !== '/signup'
//   ) {
//     return NextResponse.redirect(
//       new URL(
//         `/signup?error_description=${req.nextUrl.searchParams.get(
//           'error_description'
//         )}`,
//         req.url
//       )
//     );
//   }

//   if (['/login', '/signup'].includes(req.nextUrl.pathname)) {
//     if (session) {
//       return NextResponse.redirect(new URL('/dashboard', req.url));
//     }
//   }
//   return res;
// }