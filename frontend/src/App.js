import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import 'leaflet/dist/leaflet.css';

// Store
import { useAuthStore } from './store';

// Pages
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ProblemDetailPage from './pages/ProblemDetailPage';
import ReportProblemPage from './pages/ReportProblemPage';
import AdminDashboard from './pages/AdminDashboard';
import ProfilePage from './pages/ProfilePage';

// Components
import Header from './components/Header';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  const { user } = useAuthStore();

  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Header />
        <Routes>
          {/* Rotas públicas */}
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={user ? <Navigate to="/" /> : <LoginPage />} />
          <Route path="/register" element={user ? <Navigate to="/" /> : <RegisterPage />} />
          <Route path="/problem/:id" element={<ProblemDetailPage />} />

          {/* Rotas protegidas */}
          <Route
            path="/report"
            element={<ProtectedRoute component={ReportProblemPage} />}
          />
          <Route
            path="/profile"
            element={<ProtectedRoute component={ProfilePage} />}
          />
          <Route
            path="/admin"
            element={<ProtectedRoute component={AdminDashboard} roles={['admin']} />}
          />
        </Routes>
      </div>
      <ToastContainer position="bottom-right" />
    </Router>
  );
}

export default App;
