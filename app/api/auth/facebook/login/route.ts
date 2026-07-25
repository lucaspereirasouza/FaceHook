import { NextResponse } from 'next/server';
import {
  createOAuthState,
  FACEBOOK_OAUTH_STATE_COOKIE,
} from '@/lib/facebookStore';

export async function GET() {
  const clientId = process.env.FACEBOOK_CLIENT_ID;
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/auth/facebook/callback`;
  const state = createOAuthState();
  
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
