import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/server-actions/middleware'

export async function middleware(request: NextRequest) {
  // Create NextResponse object via the updateSession function
  const response = await updateSession(request);
  
  // Add CORS headers to allow server actions to work properly
  // Needed to avoid issues with "unexpected response from server"
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}