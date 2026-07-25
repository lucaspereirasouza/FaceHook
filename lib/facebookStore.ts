type TokenRecord = {
  userId: string;
  name?: string;
  accessToken: string;
  expiresAt?: number;
};

const store = new Map<string, TokenRecord>();

export function saveToken(userId: string, record: TokenRecord) {
  store.set(userId, record);
}

export function getToken(userId: string) {
  return store.get(userId);
}

export function listTokens() {
  return Array.from(store.values());
}
