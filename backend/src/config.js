import crypto from 'node:crypto';

const isProd = process.env.NODE_ENV === 'production';

if (isProd && !process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET must be set in production');
}

export const config = {
  isProd,
  port: Number(process.env.PORT) || 4000,
  dbPath: process.env.DB_PATH || './data/quantquest.db',
  // Dev fallback is random per boot so a dev secret can never be reused in prod.
  jwtSecret: process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex'),
  tokenTtlSeconds: 7 * 24 * 60 * 60,
  maxHearts: 5,
  heartRegenMs: 30 * 60 * 1000,
  levelBaseXp: 20,
  firstTryBonusXp: 2,
};
