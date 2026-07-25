import { NextResponse } from 'next/server';
import { saveToken } from '@/lib/facebookStore';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  if (error || !code) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}?error=access_denied`
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
        `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}?error=auth_failed`
      );
    }

    const accessToken = tokenData.access_token;

    // Fetch basic user profile info from Facebook Graph API
    const userUrl = `https://graph.facebook.com/me?fields=id,name,email&access_token=${accessToken}`;
    const userRes = await fetch(userUrl);
    const userData = await userRes.json();

    // Save token in-memory (MVP). In production, persist to DB and create a session.
    if (userData && userData.id) {
      saveToken(userData.id, {
        userId: userData.id,
        name: userData.name,
        accessToken,
        expiresAt: tokenData.expires_in ? Date.now() + tokenData.expires_in * 1000 : undefined,
      });
    }

    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}?status=success&user=${encodeURIComponent(
        userData.name || userData.id
      )}`
    );
  } catch (err) {
    console.error('Callback Handler Error:', err);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}?error=server_error`
    );
  }
}
