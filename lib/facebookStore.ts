import { randomUUID } from 'node:crypto';

export const FACEBOOK_SESSION_COOKIE = 'facehook_session';
export const FACEBOOK_OAUTH_STATE_COOKIE = 'facehook_oauth_state';

type TokenRecord = {
  userId: string;
  name?: string;
  accessToken: string;
  expiresAt?: number;
  invalidatedAt?: number;
};

type SessionRecord = {
  userId: string;
  createdAt: number;
};

const store = new Map<string, TokenRecord>();
const sessions = new Map<string, SessionRecord>();
const oauthStates = new Map<string, number>();

export function saveToken(userId: string, record: TokenRecord) {
  store.set(userId, record);
}

export function getToken(userId: string) {
  return store.get(userId);
}

export function invalidateToken(userId: string) {
  const token = store.get(userId);
  if (token) token.invalidatedAt = Date.now();
}

export function createSession(userId: string) {
  const sessionId = randomUUID();
  sessions.set(sessionId, { userId, createdAt: Date.now() });
  return sessionId;
}

export function createOAuthState() {
  const state = randomUUID();
  oauthStates.set(state, Date.now() + 10 * 60 * 1000);
  return state;
}

export function consumeOAuthState(state: string) {
  const expiresAt = oauthStates.get(state);
  oauthStates.delete(state);
  return Boolean(expiresAt && expiresAt > Date.now());
}

export function getFacebookConnection(sessionId?: string) {
  if (!sessionId) return { status: 'not_connected' as const };

  const session = sessions.get(sessionId);
  if (!session) return { status: 'not_connected' as const };

  const token = getToken(session.userId);
  if (!token) return { status: 'not_connected' as const };

  if (token.invalidatedAt) {
    return {
      status: 'invalid' as const,
      account: { id: token.userId, name: token.name, expiresAt: token.expiresAt },
    };
  }

  if (token.expiresAt && token.expiresAt <= Date.now()) {
    return {
      status: 'expired' as const,
      account: { id: token.userId, name: token.name, expiresAt: token.expiresAt },
    };
  }

  return {
    status: 'connected' as const,
    account: { id: token.userId, name: token.name, expiresAt: token.expiresAt },
  };
}
