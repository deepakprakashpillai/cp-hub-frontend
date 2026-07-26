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
import { AdminFinancePage } from "@/features/admin/AdminFinancePage";
import { AdminBatchDetailPage } from "@/features/admin/AdminBatchDetailPage";
import { AdminTeacherDetailPage } from "@/features/admin/teachers/AdminTeacherDetailPage";
import { AdminTeachersPage } from "@/features/admin/teachers/AdminTeachersPage";
import { LeadManagementHome } from "@/features/leads/LeadManagementHome";
import { LeadsWorkspace } from "@/features/leads/LeadsWorkspace";
import { StudentDashboard } from "@/features/student/StudentDashboard";
import { StudentSchedulePage } from "@/features/student/StudentSchedulePage";
import { StudentClassesPage } from "@/features/student/StudentClassesPage";
import { StudentFeedbacksPage } from "@/features/student/StudentFeedbacksPage";
import { StudentSettingsPage } from "@/features/student/StudentSettingsPage";
import { TeacherDashboard } from "@/features/teacher/TeacherDashboard";
import { TeacherClassesPage } from "@/features/teacher/TeacherClassesPage";
import { TeacherClassDetailPage } from "@/features/teacher/TeacherClassDetailPage";
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
      { path: "admin/payments", element: <AdminFinancePage /> },
      { path: "admin/leads", element: <LeadsWorkspace canConvert /> },
      { path: "admin/settings", element: <AdminPlannedPage page="settings" /> },
      { path: "teacher", element: <TeacherDashboard /> },
      { path: "teacher/classes", element: <TeacherClassesPage /> },
      { path: "teacher/classes/:sessionId", element: <TeacherClassDetailPage /> },
      { path: "teacher/availability", element: <TeacherAvailabilityPage /> },
      { path: "teacher/students", element: <TeacherStudentsPage /> },
      { path: "teacher/settings", element: <TeacherSettingsPage /> },
      { path: "student", element: <StudentDashboard /> },
      { path: "student/schedule", element: <StudentSchedulePage /> },
      { path: "student/classes", element: <StudentClassesPage /> },
      { path: "student/feedbacks", element: <StudentFeedbacksPage /> },
      { path: "student/settings", element: <StudentSettingsPage /> },
      { path: "leads", element: <LeadManagementHome /> },
    ],
  },
]);
