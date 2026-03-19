import { Navigate } from "react-router-dom";

export function AdminRoute({ children }) {
  const user = JSON.parse(localStorage.getItem("syndic_user") || "null");

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role === "RESIDENT") {
    return <Navigate to="/resident" replace />;
  }

  return children;
}

export function ResidentRoute({ children }) {
  const user = JSON.parse(localStorage.getItem("syndic_user") || "null");

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role !== "RESIDENT") {
    return <Navigate to="/login" replace />;
  }

  return children;
}