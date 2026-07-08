import { useEffect, useState } from 'react';
import { api } from '../api/client';
import TopBar from '../components/TopBar';

interface Row {
  username: string;
  xp: number;
  streak?: number;
}

interface Boards {
  weekly: Row[];
  allTime: Row[];
}

const MEDALS = ['🥇', '🥈', '🥉'];

export default function LeaderboardPage() {
  const [boards, setBoards] = useState<Boards | null>(null);
  const [tab, setTab] = useState<'weekly' | 'allTime'>('weekly');
  const [error, setError] = useState('');

  useEffect(() => {
    api.get<Boards>('/leaderboard').then(setBoards).catch((err) => setError(err.message));
  }, []);

  const rows = boards?.[tab] ?? [];

  return (
    <div className="app-shell">
      <TopBar />
      <main className="board-page">
        <h1>🏆 Leaderboard</h1>
        <div className="tabs">
          <button className={tab === 'weekly' ? 'active' : ''} onClick={() => setTab('weekly')}>
            This week
          </button>
          <button className={tab === 'allTime' ? 'active' : ''} onClick={() => setTab('allTime')}>
            All time
          </button>
        </div>
        {error && <div className="error-banner">{error}</div>}
        {rows.length === 0 ? (
          <p className="tagline">No XP earned yet — be the first on the board!</p>
        ) : (
          <ol className="board">
            {rows.map((row, i) => (
              <li key={row.username}>
                <span className="rank">{MEDALS[i] ?? `#${i + 1}`}</span>
                <span className="name">{row.username}</span>
                {row.streak !== undefined && <span className="streak">🔥 {row.streak}</span>}
                <span className="xp">⚡ {row.xp}</span>
              </li>
            ))}
          </ol>
        )}
      </main>
    </div>
  );
}
