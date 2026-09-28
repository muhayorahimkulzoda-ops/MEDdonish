import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const FRAME_DEST = new Set(['document', 'embed', 'object', 'iframe', 'frame']);

export function middleware(request: NextRequest) {
  const dest = request.headers.get('sec-fetch-dest') ?? '';
  const path = request.nextUrl.pathname;
  if (path.startsWith('/notes') && FRAME_DEST.has(dest)) {
    return new NextResponse(null, { status: 404 });
  }
  const gated = path.startsWith('/profile') || path.startsWith('/notifications');
  if (gated && !request.cookies.get('meddonish_access')) {
    const url = request.nextUrl.clone();
    url.pathname = '/signin';
    url.search = '';
    url.searchParams.set('next', path);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/notes/:path*', '/profile/:path*', '/notifications/:path*'],
};
