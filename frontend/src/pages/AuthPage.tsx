import { FormEvent, useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function AuthPage() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('register');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (mode === 'register') await register(email, username, password);
      else await login(username || email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page-center auth-page">
      <div className="auth-card">
        <div className="mascot bounce">📈</div>
        <h1>QuantQuest</h1>
        <p className="tagline">
          Learn to think like a quant — probability, expected value, market making, Kelly and
          options — one level at a time.
        </p>
        <form onSubmit={submit}>
          {mode === 'register' && (
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          )}
          <input
            type="text"
            placeholder={mode === 'register' ? 'Username (3–20 chars)' : 'Username or email'}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            autoComplete="username"
          />
          <input
            type="password"
            placeholder={mode === 'register' ? 'Password (min 8 chars)' : 'Password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={mode === 'register' ? 8 : 1}
            autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
          />
          {error && <div className="error-banner">{error}</div>}
          <button className="btn btn-primary" disabled={busy}>
            {busy ? '…' : mode === 'register' ? 'START LEARNING' : 'LOG IN'}
          </button>
        </form>
        <button
          className="linkish"
          onClick={() => setMode(mode === 'register' ? 'login' : 'register')}
        >
          {mode === 'register' ? 'I already have an account' : 'Create a new account'}
        </button>
      </div>
    </div>
  );
}
