import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import Navbar from './components/common/Navbar';

// Pages
import Home from './pages/Home';
import ProfessorAuth from './pages/professor/ProfessorAuth';
import ProfessorDashboard from './pages/professor/ProfessorDashboard';
import QuizList from './pages/professor/QuizList';
import QuizEditor from './pages/professor/QuizEditor';
import LiveQuizRoom from './pages/professor/LiveQuizRoom';
import QuizResults from './pages/professor/QuizResults';

import StudentJoin from './pages/student/StudentJoin';
import StudentLobby from './pages/student/StudentLobby';
import StudentQuizRoom from './pages/student/StudentQuizRoom';
import StudentResult from './pages/student/StudentResult';

// Protected route component for professors
function ProtectedProfessorRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return null;
  return isAuthenticated ? children : <Navigate to="/professor/auth" replace />;
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <SocketProvider>
          <BrowserRouter>
            <div className="app-container">
              <Navbar />
              <Routes>
                {/* Public & Student Routes */}
                <Route path="/" element={<Home />} />
                <Route path="/student/join" element={<StudentJoin />} />
                <Route path="/student/lobby/:id" element={<StudentLobby />} />
                <Route path="/student/quiz/:id" element={<StudentQuizRoom />} />
                <Route path="/student/results/:id" element={<StudentResult />} />

                {/* Professor Auth */}
                <Route path="/professor/auth" element={<ProfessorAuth />} />

                {/* Protected Professor Routes */}
                <Route
                  path="/professor/dashboard"
                  element={
                    <ProtectedProfessorRoute>
                      <ProfessorDashboard />
                    </ProtectedProfessorRoute>
                  }
                />
                <Route
                  path="/professor/quizzes"
                  element={
                    <ProtectedProfessorRoute>
                      <QuizList />
                    </ProtectedProfessorRoute>
                  }
                />
                <Route
                  path="/professor/quizzes/create"
                  element={
                    <ProtectedProfessorRoute>
                      <QuizEditor />
                    </ProtectedProfessorRoute>
                  }
                />
                <Route
                  path="/professor/quizzes/edit/:id"
                  element={
                    <ProtectedProfessorRoute>
                      <QuizEditor />
                    </ProtectedProfessorRoute>
                  }
                />
                <Route
                  path="/professor/live/:id"
                  element={
                    <ProtectedProfessorRoute>
                      <LiveQuizRoom />
                    </ProtectedProfessorRoute>
                  }
                />
                <Route
                  path="/professor/results/:id"
                  element={
                    <ProtectedProfessorRoute>
                      <QuizResults />
                    </ProtectedProfessorRoute>
                  }
                />

                {/* Fallback */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </div>
          </BrowserRouter>
        </SocketProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
