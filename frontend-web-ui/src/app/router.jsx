import { createBrowserRouter, Navigate } from "react-router-dom";
import { AppLayout } from "../components/layout/AppLayout";
import { CoursesPage } from "../features/courses/CoursesPage";
import { TopicsPage } from "../features/topics/TopicsPage";
import { ExamsPage } from "../features/exams/ExamsPage";
import { GenerateExamPage } from "../features/exams/GenerateExamPage";

export const router = createBrowserRouter([
  {
    element: <AppLayout />,
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
