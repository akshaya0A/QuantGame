import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, Unit, UserState } from '../api/client';
import { useAuth } from '../context/AuthContext';
import TopBar from '../components/TopBar';

interface Curriculum {
  units: Unit[];
  state: UserState;
}

export default function LearnPage() {
  const [units, setUnits] = useState<Unit[]>([]);
  const [error, setError] = useState('');
  const { setState } = useAuth();

  useEffect(() => {
    api
      .get<Curriculum>('/curriculum')
      .then((data) => {
        setUnits(data.units);
        setState(data.state);
      })
      .catch((err) => setError(err.message));
  }, [setState]);

  return (
    <div className="app-shell">
      <TopBar />
      <main className="learn-page">
        {error && <div className="error-banner">{error}</div>}
        {units.map((unit) => (
          <section key={unit.id} className="unit">
            <div className="unit-header" style={{ background: unit.color }}>
              <div className="unit-icon">{unit.icon}</div>
              <div>
                <h2>{unit.title}</h2>
                <p>{unit.description}</p>
              </div>
            </div>
            <div className="path">
              {unit.levels.map((level, i) => {
                const offset = [0, 48, 0, -48][i % 4];
                const node = (
                  <div
                    className={`level-node ${level.status}`}
                    style={{
                      transform: `translateX(${offset}px)`,
                      ...(level.status !== 'locked' ? { background: unit.color } : {}),
                    }}
                  >
                    <span className="level-glyph">
                      {level.status === 'completed' ? '👑' : level.status === 'locked' ? '🔒' : '★'}
                    </span>
                  </div>
                );
                return (
                  <div key={level.id} className="level-row">
                    {level.status === 'locked' ? (
                      node
                    ) : (
                      <Link to={`/lesson/${level.id}`} className="level-link">
                        {node}
                      </Link>
                    )}
                    <div className="level-label" style={{ transform: `translateX(${offset}px)` }}>
                      <strong>{level.title}</strong>
                      <span>{level.exerciseCount} questions</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ))}
        {units.length > 0 && (
          <footer className="page-footer">Complete every level to earn your quant crown 👑</footer>
        )}
      </main>
    </div>
  );
}
