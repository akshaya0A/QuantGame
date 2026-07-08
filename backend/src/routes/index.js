import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { requireAuth } from '../middleware/auth.js';
import * as auth from '../controllers/auth.controller.js';
import * as game from '../controllers/game.controller.js';

export const router = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts, try again later' },
});

router.post('/auth/register', authLimiter, auth.register);
router.post('/auth/login', authLimiter, auth.login);
router.post('/auth/logout', auth.logout);
router.get('/auth/me', requireAuth, auth.me);

router.get('/curriculum', requireAuth, game.curriculum);
router.get('/lessons/:levelId', requireAuth, game.lesson);
router.post('/attempts', requireAuth, game.attempt);
router.post('/levels/:levelId/complete', requireAuth, game.completeLevel);
router.get('/leaderboard', requireAuth, game.leaderboard);
router.get('/profile', requireAuth, game.profile);

router.get('/health', (req, res) => res.json({ ok: true }));
