import { cookies } from 'next/headers';
import { SignJWT, jwtVerify, type JWTPayload } from 'jose';
import bcrypt from 'bcryptjs';

export const AUTH_COOKIE = 'flux_ai_token';
const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

export interface AuthClaims extends JWTPayload {
  sub: string; // user id
  email: string;
  name: string;
}

function secret(): Uint8Array {
  const value = process.env.JWT_SECRET;
  if (!value) throw new Error('JWT_SECRET is not set');
  return new TextEncoder().encode(value);
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export async function signToken(claims: { sub: string; email: string; name: string }): Promise<string> {
  return new SignJWT({ email: claims.email, name: claims.name })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(claims.sub)
    .setIssuedAt()
    .setExpirationTime(`${TOKEN_TTL_SECONDS}s`)
    .sign(secret());
}

export async function verifyToken(token: string): Promise<AuthClaims | null> {
  try {
    const { payload } = await jwtVerify(token, secret());
    if (!payload.sub) return null;
    return payload as AuthClaims;
  } catch {
    return null;
  }
}

const cookieOptions = {
  httpOnly: true as const,
  sameSite: 'lax' as const,
  path: '/',
  maxAge: TOKEN_TTL_SECONDS,
  secure: process.env.NODE_ENV === 'production',
};

export async function setAuthCookie(token: string): Promise<void> {
  const store = await cookies();
  store.set(AUTH_COOKIE, token, cookieOptions);
}

export async function clearAuthCookie(): Promise<void> {
  const store = await cookies();
  store.delete(AUTH_COOKIE);
}

/** Reads and verifies the auth cookie. Returns claims or null. Use in route handlers. */
export async function getAuth(): Promise<AuthClaims | null> {
  const store = await cookies();
  const token = store.get(AUTH_COOKIE)?.value;
  if (!token) return null;
  return verifyToken(token);
}
