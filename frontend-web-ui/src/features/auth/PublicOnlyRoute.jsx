import { Navigate, Outlet } from "react-router-dom";
import { isAuthenticated } from "./authSession";

export function PublicOnlyRoute() {
  if (isAuthenticated()) {
    return <Navigate to="/exams/list" replace />;
  }

  return <Outlet />;
}
