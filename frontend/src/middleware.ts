import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const PUBLIC_PATHS = new Set(['/', '/login', '/client/login']);
const GUARD_PREFIX = '/guard';
const CLIENT_PREFIX = '/client';

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is required in environment variables.');
  }
  return new TextEncoder().encode(secret);
}

// Server-side session enforcement to back up the client-side checks in
// AdminLayout/GuardLayout, which only run after the page has already rendered.
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.has(pathname)) {
    return NextResponse.next();
  }

  const token = request.cookies.get('token')?.value;
  if (!token) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    const role = payload.role as string | undefined;
    const isGuardArea = pathname === GUARD_PREFIX || pathname.startsWith(`${GUARD_PREFIX}/`);
    const isClientArea = pathname === CLIENT_PREFIX || pathname.startsWith(`${CLIENT_PREFIX}/`);

    if (isGuardArea && role !== 'GUARD') {
      return NextResponse.redirect(new URL(role === 'CLIENT' ? '/client/dashboard' : '/dashboard', request.url));
    }
    if (isClientArea && role !== 'CLIENT') {
      return NextResponse.redirect(new URL(role === 'GUARD' ? '/guard/dashboard' : '/dashboard', request.url));
    }
    if (!isGuardArea && !isClientArea && role === 'GUARD') {
      return NextResponse.redirect(new URL('/guard/dashboard', request.url));
    }
    if (!isGuardArea && !isClientArea && role === 'CLIENT') {
      return NextResponse.redirect(new URL('/client/dashboard', request.url));
    }

    return NextResponse.next();
  } catch {
    return NextResponse.redirect(new URL('/', request.url));
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)'],
};
