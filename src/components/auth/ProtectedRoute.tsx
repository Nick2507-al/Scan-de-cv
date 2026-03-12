import { Navigate, useLocation } from "react-router";
import { useAuth } from "../../context/AuthContext";

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();
  const location = useLocation();
  if (!token) {
    return <Navigate to="/connexion" state={{ from: location }} replace />;
  }
  return <>{children}</>;
}
