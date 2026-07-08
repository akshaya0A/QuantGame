import { db } from '../db/database.js';
import { units, orderedLevels } from './content.service.js';

export function completedLevelIds(userId) {
  return new Set(
    db.prepare('SELECT level_id FROM level_progress WHERE user_id = ?').all(userId).map((r) => r.level_id),
  );
}

// A level is unlocked if it is the first level overall or the previous level
// in the global chain is completed — this is what makes each level build on
// the previous one.
export function isUnlocked(levelId, completed) {
  const idx = orderedLevels.findIndex((l) => l.id === levelId);
  if (idx === -1) return false;
  if (idx === 0) return true;
  return completed.has(orderedLevels[idx - 1].id);
}

export function curriculumFor(userId) {
  const completed = completedLevelIds(userId);
  return units.map((unit) => ({
    id: unit.id,
    title: unit.title,
    description: unit.description,
    color: unit.color,
    icon: unit.icon,
    levels: unit.levels.map((level) => ({
      id: level.id,
      title: level.title,
      exerciseCount: level.exercises.length,
      status: completed.has(level.id)
        ? 'completed'
        : isUnlocked(level.id, completed)
          ? 'available'
          : 'locked',
    })),
  }));
}

export function hasCorrectAttempt(userId, exerciseId) {
  return !!db
    .prepare('SELECT 1 FROM attempts WHERE user_id = ? AND exercise_id = ? AND correct = 1 LIMIT 1')
    .get(userId, exerciseId);
}

export function hasAnyAttempt(userId, exerciseId) {
  return !!db
    .prepare('SELECT 1 FROM attempts WHERE user_id = ? AND exercise_id = ? LIMIT 1')
    .get(userId, exerciseId);
}

export function firstTryCorrectCount(userId, levelId) {
  return db
    .prepare('SELECT COUNT(*) AS n FROM attempts WHERE user_id = ? AND level_id = ? AND first_try = 1 AND correct = 1')
    .get(userId, levelId).n;
}
