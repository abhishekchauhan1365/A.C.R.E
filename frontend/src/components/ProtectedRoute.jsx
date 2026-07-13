import { Navigate } from 'react-router-dom';

// ProtectedRoute wraps any page that requires the user to be logged in.
//
// How it works:
// 1. We check localStorage for a JWT token (saved when user logged in)
// 2. If token exists → render the children (the actual page)
// 3. If no token   → redirect to /login silently
//
// Usage in App.jsx:
//   <Route path="/dashboard" element={
//     <ProtectedRoute><DashboardPage /></ProtectedRoute>
//   } />
function ProtectedRoute({ children }) {
    const token = localStorage.getItem('acre_token');

    if (!token) {
        // <Navigate> is React Router's way of redirecting programmatically.
        // replace={true} means the /dashboard URL gets replaced in browser history,
        // so pressing "Back" after redirect doesn't loop back to /dashboard.
        return <Navigate to="/login" replace />;
    }

    return children;
}

export default ProtectedRoute;
