import { createBrowserRouter, Navigate, Outlet } from "react-router-dom";
import { AppLayout } from "../components/layout/AppLayout";
import { CoursesPage } from "../features/courses/CoursesPage";
import { CourseFormPage } from "../features/courses/CourseFormPage";
import { TopicsPage } from "../features/topics/TopicsPage";
import { TopicFormPage } from "../features/topics/TopicFormPage";
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
      { path: "/", element: <Navigate to="/courses/list" replace /> },

      { path: "/courses/list", element: <CoursesPage /> },
      { path: "/courses/create", element: <CourseFormPage /> },
      { path: "/courses/edit/:id", element: <CourseFormPage /> },

      { path: "/tasks/list", element: <TopicsPage /> },
      { path: "/tasks/create", element: <TopicFormPage /> },
      { path: "/tasks/edit/:id", element: <TopicFormPage /> },

      { path: "/exams/list", element: <ExamsPage /> },
      { path: "/exams/create", element: <GenerateExamPage /> },
      { path: "/exams/edit/:id", element: <GenerateExamPage /> },

      { path: "/courses", element: <Navigate to="/courses/list" replace /> },
      { path: "/tasks", element: <Navigate to="/tasks/list" replace /> },
      { path: "/exams", element: <Navigate to="/exams/list" replace /> },
      {
        path: "/exams/generate",
        element: <Navigate to="/exams/create" replace />,
      },
      {
        path: "/exams/:id/edit",
        element: <GenerateExamPage />,
      },
    ],
  },
]);