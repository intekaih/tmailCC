import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const isApi = path.startsWith('/api/');

  // Handle CORS preflight OPTIONS request
  if (isApi && request.method === 'OPTIONS') {
    const origin = request.headers.get('origin') || '*';
    const response = new NextResponse(null, { status: 204 });
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api-key');
    response.headers.set('Access-Control-Max-Age', '86400');
    return response;
  }

  const response = await updateSession(request);

  // Add CORS headers to regular API responses
  if (isApi) {
    const origin = request.headers.get('origin') || '*';
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api-key');
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
