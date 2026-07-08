import { z } from 'zod';
import { db } from '../db/database.js';
import { config } from '../config.js';
import { levelById, exerciseById, sanitizeExercise } from '../services/content.service.js';
import { grade, correctAnswerDisplay } from '../services/grading.service.js';
import { getState, loseHeart, addXp, touchStreak } from '../services/state.service.js';
import {
  curriculumFor, completedLevelIds, isUnlocked, hasCorrectAttempt, hasAnyAttempt,
  firstTryCorrectCount,
} from '../services/progress.service.js';

export function curriculum(req, res) {
  res.json({ units: curriculumFor(req.userId), state: getState(req.userId) });
}

export function lesson(req, res) {
  const level = levelById.get(req.params.levelId);
  if (!level) return res.status(404).json({ error: 'Level not found' });
  const completed = completedLevelIds(req.userId);
  if (!isUnlocked(level.id, completed)) {
    return res.status(403).json({ error: 'Complete the previous level first' });
  }
  res.json({
    id: level.id,
    title: level.title,
    intro: level.intro,
    exercises: level.exercises.map(sanitizeExercise),
    state: getState(req.userId),
  });
}

const attemptSchema = z.object({
  exerciseId: z.string().min(1).max(64),
  answer: z.union([z.number(), z.string().max(64)]),
});

export function attempt(req, res) {
  const parsed = attemptSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid attempt' });
  const entry = exerciseById.get(parsed.data.exerciseId);
  if (!entry) return res.status(404).json({ error: 'Exercise not found' });
  const { exercise, levelId } = entry;

  const completed = completedLevelIds(req.userId);
  if (!isUnlocked(levelId, completed)) {
    return res.status(403).json({ error: 'Complete the previous level first' });
  }

  let state = getState(req.userId);
  if (state.hearts <= 0) {
    return res.status(403).json({
      error: 'Out of hearts! Wait for them to refill.',
      nextHeartInMs: state.nextHeartInMs,
    });
  }

  const correct = grade(exercise, parsed.data.answer);
  const firstTry = !hasAnyAttempt(req.userId, exercise.id);
  db.prepare(
    'INSERT INTO attempts (user_id, exercise_id, level_id, correct, first_try) VALUES (?, ?, ?, ?, ?)',
  ).run(req.userId, exercise.id, levelId, correct ? 1 : 0, firstTry ? 1 : 0);

  if (!correct) state = loseHeart(req.userId);

  res.json({
    correct,
    explanation: exercise.explanation,
    correctAnswer: correctAnswerDisplay(exercise),
    state,
  });
}

export function completeLevel(req, res) {
  const level = levelById.get(req.params.levelId);
  if (!level) return res.status(404).json({ error: 'Level not found' });

  const existing = db
    .prepare('SELECT * FROM level_progress WHERE user_id = ? AND level_id = ?')
    .get(req.userId, level.id);
  if (existing) {
    return res.json({ alreadyCompleted: true, xpEarned: 0, state: getState(req.userId) });
  }

  // Server-side verification: every exercise must have a correct attempt on record.
  const missing = level.exercises.filter((ex) => !hasCorrectAttempt(req.userId, ex.id));
  if (missing.length > 0) {
    return res.status(400).json({ error: 'Level not finished: some exercises are unsolved' });
  }

  const firstTryCorrect = firstTryCorrectCount(req.userId, level.id);
  const xpEarned = config.levelBaseXp + config.firstTryBonusXp * firstTryCorrect;
  const score = firstTryCorrect / level.exercises.length;

  db.prepare(
    'INSERT INTO level_progress (user_id, level_id, score, xp_earned) VALUES (?, ?, ?, ?)',
  ).run(req.userId, level.id, score, xpEarned);
  addXp(req.userId, xpEarned);
  const streak = touchStreak(req.userId);

  res.json({ alreadyCompleted: false, xpEarned, score, streak, state: getState(req.userId) });
}

export function leaderboard(req, res) {
  const weekly = db.prepare(`
    SELECT u.username, SUM(x.amount) AS xp
    FROM xp_events x JOIN users u ON u.id = x.user_id
    WHERE x.created_at >= datetime('now', '-7 days')
    GROUP BY x.user_id ORDER BY xp DESC LIMIT 20
  `).all();
  const allTime = db.prepare(`
    SELECT u.username, s.xp, s.streak
    FROM user_state s JOIN users u ON u.id = s.user_id
    WHERE s.xp > 0 ORDER BY s.xp DESC LIMIT 20
  `).all();
  res.json({ weekly, allTime });
}

export function profile(req, res) {
  const levelsCompleted = db
    .prepare('SELECT COUNT(*) AS n FROM level_progress WHERE user_id = ?')
    .get(req.userId).n;
  const attempts = db
    .prepare('SELECT COUNT(*) AS total, SUM(correct) AS correct FROM attempts WHERE user_id = ?')
    .get(req.userId);
  res.json({
    state: getState(req.userId),
    levelsCompleted,
    totalAttempts: attempts.total,
    correctAttempts: attempts.correct ?? 0,
  });
}
