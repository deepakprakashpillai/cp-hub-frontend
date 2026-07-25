import { Navigate, createBrowserRouter } from "react-router";

import { AppShell } from "@/layouts/AppShell";
import { AdminDashboard } from "@/features/admin/AdminDashboard";
import { AdminPlannedPage } from "@/features/admin/AdminPlannedPage";
import { AdminStudentDetailPage } from "@/features/admin/AdminStudentDetailPage";
import { AdminStudentsPage } from "@/features/admin/AdminStudentsPage";
import { AdminSchedulePage } from "@/features/admin/AdminSchedulePage";
import { AdminScheduleDetailPage } from "@/features/admin/AdminScheduleDetailPage";
import { AdminBatchScheduleDayDetailPage } from "@/features/admin/AdminBatchScheduleDayDetailPage";
import { AdminProgramsPage } from "@/features/admin/AdminProgramsPage";
import { AdminBatchDetailPage } from "@/features/admin/AdminBatchDetailPage";
import { AdminTeacherDetailPage } from "@/features/admin/teachers/AdminTeacherDetailPage";
import { AdminTeachersPage } from "@/features/admin/teachers/AdminTeachersPage";
import { LeadManagementHome } from "@/features/leads/LeadManagementHome";
import { StudentHome } from "@/features/student/StudentHome";
import { TeacherDashboard } from "@/features/teacher/TeacherDashboard";
import { TeacherClassesPage } from "@/features/teacher/TeacherClassesPage";
import { TeacherAvailabilityPage } from "@/features/teacher/TeacherAvailabilityPage";
import { TeacherStudentsPage } from "@/features/teacher/TeacherStudentsPage";
import { TeacherSettingsPage } from "@/features/teacher/TeacherSettingsPage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppShell />,
    children: [
      { index: true, element: <Navigate to="/admin" replace /> },
      { path: "admin", element: <AdminDashboard /> },
      { path: "admin/students", element: <AdminStudentsPage /> },
      { path: "admin/students/:studentId", element: <AdminStudentDetailPage /> },
      { path: "admin/teachers", element: <AdminTeachersPage /> },
      { path: "admin/teachers/:teacherId", element: <AdminTeacherDetailPage /> },
      { path: "admin/schedule", element: <AdminSchedulePage /> },
      { path: "admin/schedule/batch-days/:batchScheduleDayId", element: <AdminBatchScheduleDayDetailPage /> },
      { path: "admin/schedule/:classSessionId", element: <AdminScheduleDetailPage /> },
      { path: "admin/programs", element: <AdminProgramsPage /> },
      { path: "admin/programs/batches/:batchGroupId", element: <AdminBatchDetailPage /> },
      { path: "admin/payments", element: <AdminProgramsPage mode="finance" /> },
      { path: "admin/leads", element: <AdminPlannedPage page="leads" /> },
      { path: "admin/settings", element: <AdminPlannedPage page="settings" /> },
      { path: "teacher", element: <TeacherDashboard /> },
      { path: "teacher/classes", element: <TeacherClassesPage /> },
      { path: "teacher/availability", element: <TeacherAvailabilityPage /> },
      { path: "teacher/students", element: <TeacherStudentsPage /> },
      { path: "teacher/settings", element: <TeacherSettingsPage /> },
      { path: "student", element: <StudentHome /> },
      { path: "leads", element: <LeadManagementHome /> },
    ],
  },
]);

