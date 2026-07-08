import { db } from '../db/database.js';
import { config } from '../config.js';

// Hearts regenerate one per heartRegenMs, capped at maxHearts.
export function computeHearts(hearts, heartsUpdatedAt, now = Date.now()) {
  if (hearts >= config.maxHearts) {
    return { hearts: config.maxHearts, heartsUpdatedAt: now, nextHeartInMs: 0 };
  }
  const elapsed = Math.max(0, now - heartsUpdatedAt);
  const regenerated = Math.floor(elapsed / config.heartRegenMs);
  const newHearts = Math.min(config.maxHearts, hearts + regenerated);
  const newUpdatedAt =
    newHearts >= config.maxHearts ? now : heartsUpdatedAt + regenerated * config.heartRegenMs;
  const nextHeartInMs =
    newHearts >= config.maxHearts ? 0 : config.heartRegenMs - (now - newUpdatedAt);
  return { hearts: newHearts, heartsUpdatedAt: newUpdatedAt, nextHeartInMs };
}

export function getState(userId) {
  const row = db.prepare('SELECT * FROM user_state WHERE user_id = ?').get(userId);
  const { hearts, heartsUpdatedAt, nextHeartInMs } = computeHearts(row.hearts, row.hearts_updated_at);
  if (hearts !== row.hearts || heartsUpdatedAt !== row.hearts_updated_at) {
    db.prepare('UPDATE user_state SET hearts = ?, hearts_updated_at = ? WHERE user_id = ?').run(
      hearts, heartsUpdatedAt, userId,
    );
  }
  return { xp: row.xp, hearts, nextHeartInMs, streak: row.streak, lastActiveDay: row.last_active_day };
}

export function loseHeart(userId) {
  const state = getState(userId);
  const newHearts = Math.max(0, state.hearts - 1);
  db.prepare('UPDATE user_state SET hearts = ?, hearts_updated_at = ? WHERE user_id = ?').run(
    newHearts, Date.now(), userId,
  );
  return getState(userId);
}

export function todayUtc(now = new Date()) {
  return now.toISOString().slice(0, 10);
}

// Called when a lesson is completed: extends or resets the daily streak.
export function touchStreak(userId) {
  const row = db.prepare('SELECT streak, last_active_day FROM user_state WHERE user_id = ?').get(userId);
  const today = todayUtc();
  if (row.last_active_day === today) return row.streak;
  const yesterday = todayUtc(new Date(Date.now() - 24 * 60 * 60 * 1000));
  const streak = row.last_active_day === yesterday ? row.streak + 1 : 1;
  db.prepare('UPDATE user_state SET streak = ?, last_active_day = ? WHERE user_id = ?').run(
    streak, today, userId,
  );
  return streak;
}

export function addXp(userId, amount) {
  db.prepare('UPDATE user_state SET xp = xp + ? WHERE user_id = ?').run(amount, userId);
  db.prepare('INSERT INTO xp_events (user_id, amount) VALUES (?, ?)').run(userId, amount);
}
