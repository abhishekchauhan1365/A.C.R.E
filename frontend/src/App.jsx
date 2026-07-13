import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LandingPage   from './pages/LandingPage';
import LoginPage     from './pages/LoginPage';
import SignupPage    from './pages/SignupPage';
import DashboardPage from './pages/DashboardPage';
import ProtectedRoute from './components/ProtectedRoute';

// App.jsx is now purely a router.
// It maps URL paths to page components.
// BrowserRouter enables HTML5 history-based routing (no # in URLs).
function App() {
    return (
        <BrowserRouter>
            <Routes>
                {/* Public routes — anyone can visit */}
                <Route path="/"       element={<LandingPage />} />
                <Route path="/login"  element={<LoginPage />} />
                <Route path="/signup" element={<SignupPage />} />

                {/* Protected route — redirects to /login if no token */}
                <Route path="/dashboard" element={
                    <ProtectedRoute>
                        <DashboardPage />
                    </ProtectedRoute>
                } />

                {/* Catch-all: any unknown URL → landing page */}
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </BrowserRouter>
    );
}

export default App;