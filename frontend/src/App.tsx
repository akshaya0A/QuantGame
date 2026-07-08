import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import AuthPage from './pages/AuthPage';
import LearnPage from './pages/LearnPage';
import LessonPage from './pages/LessonPage';
import LeaderboardPage from './pages/LeaderboardPage';

export default function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="page-center">
        <div className="mascot bounce">📈</div>
      </div>
    );
  }

  if (!user) return <AuthPage />;

  return (
    <Routes>
      <Route path="/" element={<LearnPage />} />
      <Route path="/lesson/:levelId" element={<LessonPage />} />
      <Route path="/leaderboard" element={<LeaderboardPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
