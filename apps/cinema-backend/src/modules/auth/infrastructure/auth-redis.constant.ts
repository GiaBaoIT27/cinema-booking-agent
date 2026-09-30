export const AUTH_REDIS_KEYS = {
  TOKEN_BLACKLIST: (jti: string) => `cinema:auth:token:bl:${jti}`,
  USER_REVOCATION: (userId: string) => `cinema:auth:user:revoked-at:${userId}`,
  REFRESH_TOKEN: (userId: string, refreshJti: string) =>
    `cinema:auth:user:${userId}:refresh:${refreshJti}`,
};
