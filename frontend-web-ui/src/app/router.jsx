import { createBrowserRouter, Navigate } from "react-router-dom";
import { AppLayout } from "../components/layout/AppLayout";
import { CoursesPage } from "../features/courses/CoursesPage";
import { CourseFormPage } from "../features/courses/CourseFormPage";
import { TopicsPage } from "../features/topics/TopicsPage";
import { TopicFormPage } from "../features/topics/TopicFormPage";
import { ExamsPage } from "../features/exams/ExamsPage";
import { GenerateExamPage } from "../features/exams/GenerateExamPage";

export const router = createBrowserRouter([
  {
    element: <AppLayout />,
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
