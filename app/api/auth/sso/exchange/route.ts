import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { exchangeSSOCode, buildSSOCookieOptions, SSO_COOKIE_NAMES } from '@nera/common';

/**
 * POST /api/auth/sso/exchange
 *
 * Server-side OAuth2 Authorization Code + PKCE token exchange.
 * Uses shared exchange logic from @nera/common.
 */
export async function POST(req: NextRequest) {
	try {
		const body = await req.json();
		const { code, codeVerifier, redirectUri, clientId } = body as {
			code?: string;
			codeVerifier?: string;
			redirectUri?: string;
			clientId?: string;
		};

		if (!code || !codeVerifier || !redirectUri) {
			return NextResponse.json(
				{ error: 'missing_params', message: 'code, codeVerifier, and redirectUri are required' },
				{ status: 400 }
			);
		}

		const result = await exchangeSSOCode(
			{ code, codeVerifier, redirectUri, clientId },
			undefined,
			'ai-dashboard'
		);

		// Set httpOnly cookies
		const cookieStore = await cookies();
		const isSecure = process.env.NODE_ENV === 'production' || req.url.startsWith('https://');
		const opts = buildSSOCookieOptions(isSecure);

		cookieStore.set(
			SSO_COOKIE_NAMES.ACCESS_TOKEN,
			result.tokens.accessToken,
			opts.accessToken(result.tokens.expiresIn)
		);

		if (result.tokens.refreshToken) {
			cookieStore.set(SSO_COOKIE_NAMES.REFRESH_TOKEN, result.tokens.refreshToken, opts.refreshToken());
		}

		cookieStore.set(SSO_COOKIE_NAMES.CSRF_TOKEN, result.csrfToken, opts.csrfToken(result.tokens.expiresIn));

		return NextResponse.json({ user: result.user }, { status: 200 });
	} catch (err) {
		console.error('[SSO Exchange] Unexpected error:', err);
		return NextResponse.json(
			{ error: 'server_error', message: err instanceof Error ? err.message : 'Token exchange failed' },
			{ status: 500 }
		);
	}
}
