import { NextRequest, NextResponse } from 'next/server';
import {
  consumeOAuthState,
  createSession,
  FACEBOOK_OAUTH_STATE_COOKIE,
  FACEBOOK_SESSION_COOKIE,
  saveToken,
} from '@/lib/facebookStore';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');
  const state = searchParams.get('state');
  const stateCookie = request.cookies.get(FACEBOOK_OAUTH_STATE_COOKIE)?.value;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  if (error || !code || !state || state !== stateCookie || !consumeOAuthState(state)) {
    return NextResponse.redirect(
      `${appUrl}?error=facebook_auth_failed`
    );
  }

  const clientId = process.env.FACEBOOK_CLIENT_ID;
  const clientSecret = process.env.FACEBOOK_CLIENT_SECRET;
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/auth/facebook/callback`;

  try {
    // Exchange authorization code for an access token
    const tokenUrl = `https://graph.facebook.com/v19.0/oauth/access_token?client_id=${clientId}&redirect_uri=${encodeURIComponent(
      redirectUri
    )}&client_secret=${clientSecret}&code=${code}`;

    const tokenRes = await fetch(tokenUrl);
    const tokenData = await tokenRes.json();

    if (tokenData.error) {
      console.error('Facebook OAuth Error:', tokenData.error);
      return NextResponse.redirect(
        `${appUrl}?error=facebook_auth_failed`
      );
    }

    const accessToken = tokenData.access_token;

    // Fetch basic user profile info from Facebook Graph API
    const userUrl = `https://graph.facebook.com/me?fields=id,name,email&access_token=${accessToken}`;
    const userRes = await fetch(userUrl);
    const userData = await userRes.json();

    // Tokens remain server-side; the browser receives only an opaque session identifier.
    if (userData && userData.id) {
      saveToken(userData.id, {
        userId: userData.id,
        name: userData.name,
        accessToken,
        expiresAt: tokenData.expires_in ? Date.now() + tokenData.expires_in * 1000 : undefined,
      });
      const sessionId = createSession(userData.id);
      const response = NextResponse.redirect(`${appUrl}?facebook=connected`);
      response.cookies.set(FACEBOOK_SESSION_COOKIE, sessionId, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: tokenData.expires_in ?? 60 * 24 * 60 * 60,
      });
      response.cookies.delete(FACEBOOK_OAUTH_STATE_COOKIE);
      return response;
    }

    return NextResponse.redirect(`${appUrl}?error=facebook_profile_failed`);
  } catch (err) {
    console.error('Callback Handler Error:', err);
    return NextResponse.redirect(
      `${appUrl}?error=facebook_auth_failed`
    );
  }
}
