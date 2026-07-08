import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, ApiError, AttemptResult, CompleteResult, Exercise, Lesson } from '../api/client';
import { useAuth } from '../context/AuthContext';

type Phase = 'intro' | 'question' | 'feedback' | 'done' | 'no-hearts';

interface Feedback {
  correct: boolean;
  explanation: string;
  correctAnswer: string;
}

export default function LessonPage() {
  const { levelId } = useParams();
  const navigate = useNavigate();
  const { state, setState } = useAuth();

  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [queue, setQueue] = useState<Exercise[]>([]);
  const [solvedCount, setSolvedCount] = useState(0);
  const [combo, setCombo] = useState(0);
  const [phase, setPhase] = useState<Phase>('intro');
  const [selected, setSelected] = useState<number | null>(null);
  const [numericInput, setNumericInput] = useState('');
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [result, setResult] = useState<CompleteResult | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!levelId) return;
    api
      .get<Lesson>(`/lessons/${levelId}`)
      .then((data) => {
        setLesson(data);
        setQueue(data.exercises);
        setState(data.state);
      })
      .catch((err) => setError(err.message));
  }, [levelId, setState]);

  const total = lesson?.exercises.length ?? 0;
  const progress = total === 0 ? 0 : (solvedCount / total) * 100;
  const current = queue[0] ?? null;

  const minutesToHeart = useMemo(
    () => Math.max(1, Math.ceil((state?.nextHeartInMs ?? 0) / 60000)),
    [state],
  );

  const submit = async (e?: FormEvent) => {
    e?.preventDefault();
    if (!current || busy) return;
    const answer = current.type === 'mc' ? selected : numericInput.trim();
    if (answer === null || answer === '') return;
    setBusy(true);
    setError('');
    try {
      const res = await api.post<AttemptResult>('/attempts', {
        exerciseId: current.id,
        answer,
      });
      setState(res.state);
      setFeedback(res);
      setPhase('feedback');
      if (res.correct) {
        setCombo((c) => c + 1);
      } else {
        setCombo(0);
        if (res.state.hearts <= 0) {
          // Show the feedback first; the continue button routes to no-hearts.
        }
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 403 && 'nextHeartInMs' in err.data) {
        setPhase('no-hearts');
      } else {
        setError(err instanceof Error ? err.message : 'Something went wrong');
      }
    } finally {
      setBusy(false);
    }
  };

  const advance = async () => {
    if (!lesson || !current || !feedback) return;
    const wasCorrect = feedback.correct;
    setFeedback(null);
    setSelected(null);
    setNumericInput('');

    let nextQueue: Exercise[];
    if (wasCorrect) {
      nextQueue = queue.slice(1);
      setSolvedCount((n) => n + 1);
    } else {
      // Duolingo-style: missed questions come back at the end of the queue.
      nextQueue = [...queue.slice(1), current];
      if ((state?.hearts ?? 0) <= 0) {
        setPhase('no-hearts');
        setQueue(nextQueue);
        return;
      }
    }
    setQueue(nextQueue);

    if (nextQueue.length === 0) {
      try {
        const res = await api.post<CompleteResult>(`/levels/${lesson.id}/complete`);
        setState(res.state);
        setResult(res);
        setPhase('done');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not complete level');
        setPhase('question');
      }
    } else {
      setPhase('question');
    }
  };

  if (error && !lesson) {
    return (
      <div className="page-center">
        <div className="auth-card">
          <div className="error-banner">{error}</div>
          <Link to="/" className="btn btn-primary">
            BACK TO PATH
          </Link>
        </div>
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className="page-center">
        <div className="mascot bounce">📈</div>
      </div>
    );
  }

  if (phase === 'intro') {
    return (
      <div className="lesson-shell">
        <LessonHeader progress={0} hearts={state?.hearts ?? 0} />
        <div className="lesson-body">
          <div className="intro-card">
            <h2>{lesson.title}</h2>
            {lesson.intro.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        </div>
        <div className="lesson-footer">
          <button className="btn btn-primary" onClick={() => setPhase('question')}>
            I'M READY
          </button>
        </div>
      </div>
    );
  }

  if (phase === 'no-hearts') {
    return (
      <div className="page-center">
        <div className="auth-card">
          <div className="mascot">💔</div>
          <h2>Out of hearts!</h2>
          <p className="tagline">
            Wrong answers cost a heart. The next one refills in about {minutesToHeart} min — come
            back and your progress in this lesson resets, but everything you learned stays.
          </p>
          <button className="btn btn-primary" onClick={() => navigate('/')}>
            BACK TO PATH
          </button>
        </div>
      </div>
    );
  }

  if (phase === 'done' && result) {
    return (
      <div className="page-center">
        <div className="auth-card celebrate">
          <div className="mascot bounce">🎉</div>
          <h2>Level complete!</h2>
          <div className="result-row">
            <div className="result-chip xp-chip">
              <span>⚡ XP</span>
              <strong>+{result.xpEarned}</strong>
            </div>
            <div className="result-chip streak-chip">
              <span>🔥 Streak</span>
              <strong>{result.streak ?? state?.streak ?? 1}</strong>
            </div>
            {result.score !== undefined && (
              <div className="result-chip acc-chip">
                <span>🎯 First-try</span>
                <strong>{Math.round(result.score * 100)}%</strong>
              </div>
            )}
          </div>
          <button className="btn btn-primary" onClick={() => navigate('/')}>
            CONTINUE
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="lesson-shell">
      <LessonHeader progress={progress} hearts={state?.hearts ?? 0} />
      <div className="lesson-body">
        {combo >= 2 && phase === 'question' && <div className="combo">🔥 {combo} in a row!</div>}
        {current && (
          <form onSubmit={submit} className="question-card">
            <h3>{current.prompt}</h3>
            {current.type === 'mc' && current.options ? (
              <div className="options">
                {current.options.map((opt, i) => (
                  <button
                    type="button"
                    key={i}
                    className={`option ${selected === i ? 'selected' : ''}`}
                    onClick={() => phase === 'question' && setSelected(i)}
                    disabled={phase !== 'question'}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            ) : (
              <input
                className="numeric-input"
                inputMode="decimal"
                placeholder="Type your answer…"
                value={numericInput}
                onChange={(e) => setNumericInput(e.target.value)}
                disabled={phase !== 'question'}
                autoFocus
              />
            )}
            {error && <div className="error-banner">{error}</div>}
          </form>
        )}
      </div>
      {phase === 'feedback' && feedback ? (
        <div className={`feedback-sheet ${feedback.correct ? 'good' : 'bad'}`}>
          <div className="feedback-text">
            <strong>{feedback.correct ? 'Correct! 🎯' : `Not quite — answer: ${feedback.correctAnswer}`}</strong>
            <p>{feedback.explanation}</p>
          </div>
          <button className={`btn ${feedback.correct ? 'btn-primary' : 'btn-danger'}`} onClick={advance}>
            CONTINUE
          </button>
        </div>
      ) : (
        <div className="lesson-footer">
          <button
            className="btn btn-primary"
            onClick={() => submit()}
            disabled={busy || (current?.type === 'mc' ? selected === null : numericInput.trim() === '')}
          >
            CHECK
          </button>
        </div>
      )}
    </div>
  );
}

function LessonHeader({ progress, hearts }: { progress: number; hearts: number }) {
  return (
    <div className="lesson-header">
      <Link to="/" className="quit" title="Quit lesson">
        ✕
      </Link>
      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${progress}%` }} />
      </div>
      <span className="stat hearts">❤️ {hearts}</span>
    </div>
  );
}
