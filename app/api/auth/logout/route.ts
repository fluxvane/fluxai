import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SSO_COOKIE_NAMES } from '@nera/common';

/**
 * POST /api/auth/logout
 *
 * Clears httpOnly auth cookies on the server side.
 */
export async function POST() {
	const cookieStore = await cookies();

	cookieStore.delete(SSO_COOKIE_NAMES.ACCESS_TOKEN);
	cookieStore.delete(SSO_COOKIE_NAMES.REFRESH_TOKEN);
	cookieStore.delete(SSO_COOKIE_NAMES.CSRF_TOKEN);

	return NextResponse.json({ ok: true });
}
