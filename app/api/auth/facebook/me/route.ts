import { NextRequest, NextResponse } from 'next/server';
import {
  FACEBOOK_SESSION_COOKIE,
  getFacebookConnection,
  getFacebookSessionToken,
  invalidateFacebookConnection,
} from '@/lib/facebookStore';

export async function GET(request: NextRequest) {
  const sessionId = request.cookies.get(FACEBOOK_SESSION_COOKIE)?.value;
  let connection = await getFacebookConnection(sessionId);

  if (connection.status === 'connected' && connection.account) {
    const token = await getFacebookSessionToken(sessionId);
    if (token) {
      try {
        const validationResponse = await fetch(
          `https://graph.facebook.com/me?fields=id&access_token=${encodeURIComponent(token.accessToken)}`,
          { cache: 'no-store', signal: AbortSignal.timeout(5_000) }
        );
        if (validationResponse.status === 400 || validationResponse.status === 401) {
          await invalidateFacebookConnection(token.userId);
          connection = await getFacebookConnection(sessionId);
        }
      } catch {
        // A temporary network error must not disconnect a working account.
      }
    }
  }

  const response = NextResponse.json(connection);

  if (connection.status === 'not_connected' && sessionId) {
    response.cookies.delete(FACEBOOK_SESSION_COOKIE);
  }

  return response;
}
