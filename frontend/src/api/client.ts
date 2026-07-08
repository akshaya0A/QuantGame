export class ApiError extends Error {
  status: number;
  data: Record<string, unknown>;
  constructor(status: number, data: Record<string, unknown>) {
    super(typeof data.error === 'string' ? data.error : `Request failed (${status})`);
    this.status = status;
    this.data = data;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`/api${path}`, {
    credentials: 'include',
    headers: options.body ? { 'Content-Type': 'application/json' } : undefined,
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, data);
  return data as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: body !== undefined ? JSON.stringify(body) : undefined }),
};

export interface UserState {
  xp: number;
  hearts: number;
  nextHeartInMs: number;
  streak: number;
}

export interface User {
  id: number;
  email: string;
  username: string;
}

export interface LevelSummary {
  id: string;
  title: string;
  exerciseCount: number;
  status: 'locked' | 'available' | 'completed';
}

export interface Unit {
  id: string;
  title: string;
  description: string;
  color: string;
  icon: string;
  levels: LevelSummary[];
}

export interface Exercise {
  id: string;
  type: 'mc' | 'numeric';
  prompt: string;
  options: string[] | null;
  hint: string | null;
}

export interface Lesson {
  id: string;
  title: string;
  intro: string[];
  exercises: Exercise[];
  state: UserState;
}

export interface AttemptResult {
  correct: boolean;
  explanation: string;
  correctAnswer: string;
  state: UserState;
}

export interface CompleteResult {
  alreadyCompleted: boolean;
  xpEarned: number;
  score?: number;
  streak?: number;
  state: UserState;
}
