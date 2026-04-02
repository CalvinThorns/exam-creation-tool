import { createBrowserRouter, Navigate, Outlet } from "react-router-dom";
import { AppLayout } from "../components/layout/AppLayout";
import { CoursesPage } from "../features/courses/CoursesPage";
import { TopicsPage } from "../features/topics/TopicsPage";
import { ExamsPage } from "../features/exams/ExamsPage";
import { GenerateExamPage } from "../features/exams/GenerateExamPage";
import Login from "../features/auth/Login"; 
import { Register } from "../features/auth/Register"; 

const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('token');

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return children ? children : <Outlet />;
};

export const router = createBrowserRouter([
  { 
    path: "/login", 
    element: <Login /> 
  },
  {
    path: "/register",
    element: <Register />
  },
  {
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      { path: "/", element: <Navigate to="/courses" replace /> },
      { path: "/courses", element: <CoursesPage /> },
      { path: "/tasks", element: <TopicsPage /> },
      { path: "/exams", element: <ExamsPage /> },
      { path: "/exams/generate", element: <GenerateExamPage /> },
      { path: "/exams/:id/edit", element: <GenerateExamPage /> },
    ],
  },
]);