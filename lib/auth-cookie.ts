// lib/auth-cookie.ts
// Call setAuthCookie() from your login API route after generating the token.
// Call clearAuthCookie() from your logout API route.

import { cookies } from 'next/headers'

const COOKIE_NAME = 'token'
const MAX_AGE = 60 * 60 * 24 * 7 // 7 days — matches JWT expiry

export async function setAuthCookie(token: string) {
  const cookieStore = await cookies()
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,   // not readable by JS — protects against XSS
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: MAX_AGE,
  })
}

export async function clearAuthCookie() {
  const cookieStore = await cookies()
  cookieStore.delete(COOKIE_NAME)
}