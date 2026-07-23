import { Navigate, createBrowserRouter } from "react-router";

import { AppShell } from "@/layouts/AppShell";
import { AdminDashboard } from "@/features/admin/AdminDashboard";
import { AdminPlannedPage } from "@/features/admin/AdminPlannedPage";
import { LeadManagementHome } from "@/features/leads/LeadManagementHome";
import { StudentHome } from "@/features/student/StudentHome";
import { TeacherHome } from "@/features/teacher/TeacherHome";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppShell />,
    children: [
      { index: true, element: <Navigate to="/admin" replace /> },
      { path: "admin", element: <AdminDashboard /> },
      { path: "admin/students", element: <AdminPlannedPage page="students" /> },
      { path: "admin/teachers", element: <AdminPlannedPage page="teachers" /> },
      { path: "admin/schedule", element: <AdminPlannedPage page="schedule" /> },
      { path: "admin/programs", element: <AdminPlannedPage page="programs" /> },
      { path: "admin/payments", element: <AdminPlannedPage page="payments" /> },
      { path: "admin/leads", element: <AdminPlannedPage page="leads" /> },
      { path: "admin/settings", element: <AdminPlannedPage page="settings" /> },
      { path: "teacher", element: <TeacherHome /> },
      { path: "student", element: <StudentHome /> },
      { path: "leads", element: <LeadManagementHome /> },
    ],
  },
]);
