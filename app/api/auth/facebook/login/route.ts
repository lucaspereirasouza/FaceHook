import { NextResponse } from 'next/server';
import {
  createOAuthState,
  createSession,
  FACEBOOK_OAUTH_STATE_COOKIE,
  FACEBOOK_SESSION_COOKIE,
  saveFacebookConnection,
  SESSION_MAX_AGE_SECONDS,
} from '@/lib/facebookStore';
import { getAppUrl } from '@/lib/app-url';

type FacebookUser = {
  id?: string;
  name?: string;
};

type TokenValidationResult =
  | { status: 'valid'; user: Required<Pick<FacebookUser, 'id'>> & FacebookUser }
  | { status: 'invalid' }
  | { status: 'unavailable' };

async function validateAccessToken(accessToken: string): Promise<TokenValidationResult> {
  try {
    const userResponse = await fetch(
      `https://graph.facebook.com/me?fields=id,name&access_token=${encodeURIComponent(accessToken)}`,
      { cache: 'no-store' },
    );
    const userData = (await userResponse.json()) as FacebookUser;

    if (!userResponse.ok || !userData.id) {
      return { status: 'invalid' };
    }

    return { status: 'valid', user: userData as Required<Pick<FacebookUser, 'id'>> & FacebookUser };
  } catch {
    return { status: 'unavailable' };
  }
}

async function setFacebookSession(response: NextResponse, user: FacebookUser, accessToken: string) {
  if (!user.id) return response;

  const { userId } = await saveFacebookConnection({
    facebookUserId: user.id,
    name: user.name,
    accessToken,
  });

  const sessionId = await createSession(userId);
  response.cookies.set(FACEBOOK_SESSION_COOKIE, sessionId, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
  return response;
}

export async function GET() {
  const clientId = process.env.FACEBOOK_CLIENT_ID?.trim();
  let appUrl: string;

  try {
    appUrl = getAppUrl();
  } catch {
    return NextResponse.json({ error: 'server_configuration_error' }, { status: 500 });
  }
  const redirectUri = `${appUrl}/api/auth/facebook/callback`;

  if (!clientId || !/^\d+$/.test(clientId)) {
    return NextResponse.json(
      {
        error: 'facebook_oauth_not_configured',
        message: 'Set FACEBOOK_CLIENT_ID and FACEBOOK_CLIENT_SECRET for Meta OAuth.',
      },
      { status: 500 },
    );
  }

  let state: string;
  try {
    state = await createOAuthState(redirectUri);
  } catch {
    return NextResponse.json({ error: 'facebook_storage_unavailable' }, { status: 503 });
  }
  
  // Scopes needed for group access / reading posts
  const scope = 'public_profile,email,groups_access_member_info';

  const facebookAuthUrl = `https://www.facebook.com/v19.0/dialog/oauth?client_id=${clientId}&redirect_uri=${encodeURIComponent(
    redirectUri
  )}&scope=${encodeURIComponent(scope)}&response_type=code&state=${encodeURIComponent(state)}`;

  const response = NextResponse.redirect(facebookAuthUrl);
  response.cookies.set(FACEBOOK_OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 10 * 60,
  });
  return response;
}

export async function POST(request: Request) {
  let accessToken: unknown;

  try {
    ({ accessToken } = await request.json());
  } catch {
    return NextResponse.json(
      { error: 'facebook_access_token_required', message: 'Enter a Facebook user access token.' },
      { status: 400 },
    );
  }

  if (typeof accessToken !== 'string' || !accessToken.trim()) {
    return NextResponse.json(
      { error: 'facebook_access_token_required', message: 'Enter a Facebook user access token.' },
      { status: 400 },
    );
  }

  const validation = await validateAccessToken(accessToken.trim());

  if (validation.status === 'invalid') {
    return NextResponse.json(
      { error: 'facebook_token_invalid', message: 'Facebook could not validate that access token.' },
      { status: 401 },
    );
  }

  if (validation.status === 'unavailable') {
    return NextResponse.json(
      { error: 'facebook_token_validation_failed', message: 'Facebook could not be reached. Try again shortly.' },
      { status: 502 },
    );
  }

  try {
    return await setFacebookSession(
      NextResponse.json({
        connected: true,
        account: { id: validation.user.id, name: validation.user.name },
      }),
      validation.user,
      accessToken.trim(),
    );
  } catch {
    return NextResponse.json({ error: 'facebook_storage_unavailable' }, { status: 503 });
  }
}
