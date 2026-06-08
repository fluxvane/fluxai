import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const AUTH_COOKIE = 'flux_ai_token';

// Pages reachable without a session.
const PUBLIC_PAGES = ['/login'];

function secret(): Uint8Array {
  return new TextEncoder().encode(process.env.JWT_SECRET ?? '');
}

async function hasValidToken(req: NextRequest): Promise<boolean> {
  const token = req.cookies.get(AUTH_COOKIE)?.value;
  if (!token) return false;
  try {
    await jwtVerify(token, secret());
    return true;
  } catch {
    return false;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Auth endpoints must stay open so users can sign in / register.
  if (pathname.startsWith('/api/auth')) {
    return NextResponse.next();
  }

  const isPublicPage = PUBLIC_PAGES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  const authed = await hasValidToken(req);

  // Signed-in users shouldn't see the login page.
  if (authed && isPublicPage) {
    return NextResponse.redirect(new URL('/', req.url));
  }

  // Block protected pages + APIs when unauthenticated.
  if (!authed && !isPublicPage) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
    const loginUrl = new URL('/login', req.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
