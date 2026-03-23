import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext.jsx";
import { getHomePathForRole, getLoginPathForRole } from "../../routes/paths.js";

export default function ProtectedRoute({ allowedRoles }) {
  const location = useLocation();
  const { session, isAuthenticated } = useAuth();

  if (!isAuthenticated || !session?.role) {
    return <Navigate to={getLoginPathForRole(allowedRoles[0])} replace state={{ from: location }} />;
  }

  if (!allowedRoles.includes(session.role)) {
    return <Navigate to={getHomePathForRole(session.role)} replace />;
  }

  return <Outlet />;
}
