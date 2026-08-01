import { NextRequest, NextResponse } from 'next/server';
import {
  consumeOAuthState,
  createSession,
  FACEBOOK_OAUTH_STATE_COOKIE,
  FACEBOOK_SESSION_COOKIE,
  saveFacebookConnection,
} from '@/lib/facebookStore';
import { validateFacebookGroupToken } from '@/lib/facebookGraph';
import { getAppUrl } from '@/lib/app-url';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');
  const state = searchParams.get('state');
  const stateCookie = request.cookies.get(FACEBOOK_OAUTH_STATE_COOKIE)?.value;
  let appUrl: string;

  try {
    appUrl = getAppUrl();
  } catch {
    return NextResponse.json({ error: 'server_configuration_error' }, { status: 500 });
  }
  const redirectUri = `${appUrl}/api/auth/facebook/callback`;

  if (error || !code || !state || state !== stateCookie) {
    return NextResponse.redirect(
      `${appUrl}?error=facebook_auth_failed`
    );
  }

  try {
    if (!(await consumeOAuthState(state, redirectUri))) {
      return NextResponse.redirect(`${appUrl}?error=facebook_auth_failed`);
    }
  } catch {
    return NextResponse.redirect(`${appUrl}?error=facebook_storage_unavailable`);
  }

  const clientId = process.env.FACEBOOK_CLIENT_ID?.trim();
  const clientSecret = process.env.FACEBOOK_CLIENT_SECRET?.trim();
  if (!clientId || !/^\d+$/.test(clientId) || !clientSecret) {
    return NextResponse.redirect(`${appUrl}?error=facebook_oauth_not_configured`);
  }

  try {
    const tokenRes = await fetch('https://graph.facebook.com/v19.0/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        code,
      }),
      cache: 'no-store',
    });
    const tokenData = await tokenRes.json();

    if (!tokenRes.ok || typeof tokenData.access_token !== 'string' || !tokenData.access_token) {
      return NextResponse.redirect(
        `${appUrl}?error=facebook_auth_failed`
      );
    }

    const accessToken = tokenData.access_token;

    const validation = await validateFacebookGroupToken(accessToken);

    if (validation.status === 'valid') {
      const { userId } = await saveFacebookConnection({
        facebookUserId: validation.user.id,
        name: validation.user.name,
        accessToken,
        expiresAt: tokenData.expires_in ? Date.now() + tokenData.expires_in * 1000 : undefined,
        scopes: validation.scopes,
      });
      const sessionId = await createSession(userId);
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

    if (validation.status === 'missing_group_permission') {
      return NextResponse.redirect(`${appUrl}?error=facebook_group_permission_required`);
    }

    return NextResponse.redirect(`${appUrl}?error=facebook_profile_failed`);
  } catch {
    return NextResponse.redirect(
      `${appUrl}?error=facebook_storage_unavailable`
    );
  }
}
