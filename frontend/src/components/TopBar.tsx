import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function TopBar() {
  const { state, user, logout } = useAuth();
  if (!state) return null;
  return (
    <header className="topbar">
      <Link to="/" className="brand">
        📈 QuantQuest
      </Link>
      <div className="stats">
        <span className="stat streak" title="Day streak">
          🔥 {state.streak}
        </span>
        <span className="stat hearts" title="Hearts — wrong answers cost one">
          ❤️ {state.hearts}
        </span>
        <span className="stat xp" title="Total XP">
          ⚡ {state.xp}
        </span>
        <Link to="/leaderboard" className="stat" title="Leaderboard">
          🏆
        </Link>
        <button className="linkish" onClick={logout} title={`Log out ${user?.username}`}>
          ↩
        </button>
      </div>
    </header>
  );
}
