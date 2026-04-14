import { NextRequest, NextResponse } from 'next/server';
import { evaluateSSOMiddleware } from '@nera/common';

export function middleware(request: NextRequest) {
	const { pathname, search } = request.nextUrl;
	const getCookie = (name: string) => request.cookies.get(name)?.value;

	const result = evaluateSSOMiddleware(pathname, search, getCookie, {
		loginPath: '/login',
		publicPaths: ['/login', '/auth/callback', '/health'],
	});

	if (result.action === 'redirect') {
		return NextResponse.redirect(new URL(result.url, request.url));
	}

	return NextResponse.next();
}

export const config = {
	matcher: ['/((?!_next/static|_next/image|favicon.ico|api/).*)'],
};
