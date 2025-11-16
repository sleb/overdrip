import { useAuth } from "@/contexts/auth-context";
import { Navigate, Outlet, useLocation } from "react-router-dom";

/**
 * ProtectedRoute wrapper component for routes that require authentication.
 */
export const ProtectedRoute = () => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    // Show loading state while Firebase initializes
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-gray-200 border-t-gray-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    // Redirect to login, preserving the intended destination
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return <Outlet />;
};
