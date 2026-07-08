export function grade(exercise, answer) {
  if (exercise.type === 'mc') {
    return Number(answer) === exercise.answer;
  }
  if (exercise.type === 'numeric') {
    const value = Number(answer);
    if (!Number.isFinite(value)) return false;
    const tolerance = exercise.tolerance ?? 1e-9;
    return Math.abs(value - exercise.answer) <= tolerance;
  }
  return false;
}

export function correctAnswerDisplay(exercise) {
  if (exercise.type === 'mc') return exercise.options[exercise.answer];
  return String(exercise.answer);
}
