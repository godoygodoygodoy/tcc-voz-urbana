import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import 'leaflet/dist/leaflet.css';

// Store
import { useAuthStore } from './store';

// Pages
import LandingPage from './pages/LandingPage';
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
      <div>
        <Routes>
          {/* Landing page - sem header customizado, ela tem seu próprio */}
          <Route path="/" element={<LandingPage />} />

          {/* Outras rotas com header */}
          <Route
            path="/*"
            element={
              <div className="min-h-screen bg-gray-50">
                <Header />
                <Routes>
                  <Route path="/map" element={<HomePage />} />
                  <Route path="/login" element={user ? <Navigate to="/" /> : <LoginPage />} />
                  <Route path="/register" element={user ? <Navigate to="/" /> : <RegisterPage />} />
                  <Route path="/problem/:id" element={<ProblemDetailPage />} />

                  {/* Rotas protegidas */}
                  <Route path="/report" element={<ProtectedRoute component={ReportProblemPage} />} />
                  <Route path="/profile" element={<ProtectedRoute component={ProfilePage} />} />
                  <Route path="/admin" element={<ProtectedRoute component={AdminDashboard} roles={['admin']} />} />
                </Routes>
              </div>
            }
          />
        </Routes>
      </div>
      <ToastContainer position="bottom-right" />
    </Router>
  );
}

export default App;
