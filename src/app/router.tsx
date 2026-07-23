import { Navigate, createBrowserRouter } from "react-router";

import { AppShell } from "@/layouts/AppShell";
import { AdminHome } from "@/features/admin/AdminHome";
import { LeadManagementHome } from "@/features/leads/LeadManagementHome";
import { StudentHome } from "@/features/student/StudentHome";
import { TeacherHome } from "@/features/teacher/TeacherHome";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppShell />,
    children: [
      { index: true, element: <Navigate to="/admin" replace /> },
      { path: "admin", element: <AdminHome /> },
      { path: "teacher", element: <TeacherHome /> },
      { path: "student", element: <StudentHome /> },
      { path: "leads", element: <LeadManagementHome /> },
    ],
  },
]);
