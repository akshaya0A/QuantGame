import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const contentDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'content');

const files = fs.readdirSync(contentDir).filter((f) => f.endsWith('.json')).sort();

export const units = files.map((f) => JSON.parse(fs.readFileSync(path.join(contentDir, f), 'utf8')));

// Global level order defines the unlock chain: each level requires the previous one.
export const orderedLevels = units.flatMap((u) => u.levels.map((l) => ({ ...l, unitId: u.id })));

export const levelById = new Map(orderedLevels.map((l) => [l.id, l]));

export const exerciseById = new Map();
for (const level of orderedLevels) {
  for (const ex of level.exercises) {
    exerciseById.set(ex.id, { exercise: ex, levelId: level.id });
  }
}

// What the client is allowed to see before answering: no answer, no explanation.
export function sanitizeExercise(ex) {
  return {
    id: ex.id,
    type: ex.type,
    prompt: ex.prompt,
    options: ex.options ?? null,
    hint: ex.hint ?? null,
  };
}

export function levelIndex(levelId) {
  return orderedLevels.findIndex((l) => l.id === levelId);
}
