import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { db } from '../db/database.js';
import { config } from '../config.js';
import { getState } from '../services/state.service.js';

const registerSchema = z.object({
  email: z.string().email().max(254),
  username: z.string().regex(/^[a-zA-Z0-9_]{3,20}$/, 'Username must be 3-20 letters, digits or _'),
  password: z.string().min(8).max(128),
});

const loginSchema = z.object({
  identifier: z.string().min(1).max(254),
  password: z.string().min(1).max(128),
});

function setSessionCookie(res, userId) {
  const token = jwt.sign({ sub: userId }, config.jwtSecret, { expiresIn: config.tokenTtlSeconds });
  res.cookie('token', token, {
    httpOnly: true,
    sameSite: 'strict',
    secure: config.isProd,
    maxAge: config.tokenTtlSeconds * 1000,
  });
}

function publicUser(row) {
  return { id: row.id, email: row.email, username: row.username };
}

export function register(req, res) {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }
  const { email, username, password } = parsed.data;
  const hash = bcrypt.hashSync(password, 10);
  try {
    const info = db
      .prepare('INSERT INTO users (email, username, password_hash) VALUES (?, ?, ?)')
      .run(email.toLowerCase(), username, hash);
    db.prepare('INSERT INTO user_state (user_id, hearts_updated_at) VALUES (?, ?)').run(
      info.lastInsertRowid, Date.now(),
    );
    setSessionCookie(res, info.lastInsertRowid);
    res.status(201).json({
      user: { id: info.lastInsertRowid, email: email.toLowerCase(), username },
      state: getState(info.lastInsertRowid),
    });
  } catch (err) {
    if (String(err.message).includes('UNIQUE')) {
      return res.status(409).json({ error: 'Email or username already taken' });
    }
    throw err;
  }
}

export function login(req, res) {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid credentials' });
  const { identifier, password } = parsed.data;
  const row = db
    .prepare('SELECT * FROM users WHERE email = ? OR username = ?')
    .get(identifier.toLowerCase(), identifier);
  // Compare against a dummy hash when the user is missing so response timing
  // doesn't reveal whether the account exists.
  const hash = row?.password_hash ?? '$2a$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinva';
  const ok = bcrypt.compareSync(password, hash);
  if (!row || !ok) return res.status(401).json({ error: 'Invalid credentials' });
  setSessionCookie(res, row.id);
  res.json({ user: publicUser(row), state: getState(row.id) });
}

export function logout(req, res) {
  res.clearCookie('token');
  res.json({ ok: true });
}

export function me(req, res) {
  const row = db.prepare('SELECT * FROM users WHERE id = ?').get(req.userId);
  if (!row) return res.status(401).json({ error: 'Not authenticated' });
  res.json({ user: publicUser(row), state: getState(row.id) });
}
