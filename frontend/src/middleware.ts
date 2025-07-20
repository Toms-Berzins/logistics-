import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Define protected routes that require authentication
const isProtectedRoute = createRouteMatcher([
  '/dashboard(.*)',
  '/admin(.*)',
  '/api/admin(.*)',
  '/api/driver(.*)',
  '/api/dispatch(.*)',
  '/api/protected(.*)',
  '/api/analytics(.*)',
  '/api/subscriptions(.*)',
]);

// Define public routes that don't require authentication
const isPublicRoute = createRouteMatcher([
  '/',
  '/pricing',
  '/about',
  '/contact',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/webhooks(.*)',
  '/api/health(.*)',
  '/api/stripe/webhooks(.*)',
]);

// Define API routes that need special handling
const isAPIRoute = createRouteMatcher([
  '/api/(.*)',
]);

export default clerkMiddleware(async (auth, req: NextRequest) => {
  const url = req.nextUrl;
  
  // Always allow public routes without any checks
  if (isPublicRoute(req)) {
    return NextResponse.next();
  }
  
  // For API routes, add CORS headers and handle authentication
  if (isAPIRoute(req)) {
    const response = NextResponse.next();
    
    // Add CORS headers for API routes
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    // Handle OPTIONS requests for CORS preflight
    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 200, headers: response.headers });
    }
    
    // Protect specific API routes
    if (isProtectedRoute(req)) {
      try {
        await auth.protect();
      } catch {
        return new Response(
          JSON.stringify({ error: 'Unauthorized', message: 'Authentication required' }),
          { 
            status: 401, 
            headers: { 
              'Content-Type': 'application/json',
              ...Object.fromEntries(response.headers.entries())
            }
          }
        );
      }
    }
    
    return response;
  }
  
  // For protected dashboard routes
  if (isProtectedRoute(req)) {
    try {
      const authResult = await auth.protect();
      
      // Optional: Add organization-based access control
      const { userId, orgId } = authResult;
      
      // Log successful authentication for debugging
      console.log(`Authenticated user ${userId} accessing ${url.pathname}${orgId ? ` (org: ${orgId})` : ''}`);
      
      return NextResponse.next();
    } catch {
      // Redirect unauthorized users to sign-in
      const signInUrl = new URL('/sign-in', req.url);
      signInUrl.searchParams.set('redirect_url', req.url);
      return NextResponse.redirect(signInUrl);
    }
  }
  
  // For all other routes, allow access
  return NextResponse.next();
});

export const config = {
  matcher: [
    // Match all routes except Next.js internals and static files
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    // Always run for API routes
    '/api/(.*)',
    // Include dashboard routes
    '/dashboard/(.*)',
  ],
};