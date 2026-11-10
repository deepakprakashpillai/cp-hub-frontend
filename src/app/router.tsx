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
import { RequireAuth } from "@/features/auth/RequireAuth";
import { ForgotPasswordPage, LoginPage, PasswordActionPage } from "@/features/auth/AuthPages";
import { NotificationsPage } from "@/features/notifications/NotificationsPage";

export const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  { path: "/admin/login", element: <LoginPage admin /> },
  { path: "/forgot-password", element: <ForgotPasswordPage /> },
  { path: "/set-password", element: <PasswordActionPage mode="setup" /> },
  { path: "/reset-password", element: <PasswordActionPage mode="reset" /> },
  {
    path: "/",
    element: <AppShell />,
    children: [
      { index: true, element: <Navigate to="/login" replace /> },
      {
        path: "admin",
        element: (
          <RequireAuth roles={["admin"]}>
            <AdminDashboard />
          </RequireAuth>
        ),
      },
      {
        path: "admin/students",
        element: (
          <RequireAuth roles={["admin"]}>
            <AdminStudentsPage />
          </RequireAuth>
        ),
      },
      {
        path: "admin/students/:studentId",
        element: (
          <RequireAuth roles={["admin"]}>
            <AdminStudentDetailPage />
          </RequireAuth>
        ),
      },
      {
        path: "admin/teachers",
        element: (
          <RequireAuth roles={["admin"]}>
            <AdminTeachersPage />
          </RequireAuth>
        ),
      },
      {
        path: "admin/teachers/:teacherId",
        element: (
          <RequireAuth roles={["admin"]}>
            <AdminTeacherDetailPage />
          </RequireAuth>
        ),
      },
      {
        path: "admin/schedule",
        element: (
          <RequireAuth roles={["admin"]}>
            <AdminSchedulePage />
          </RequireAuth>
        ),
      },
      {
        path: "admin/schedule/batch-days/:batchScheduleDayId",
        element: (
          <RequireAuth roles={["admin"]}>
            <AdminBatchScheduleDayDetailPage />
          </RequireAuth>
        ),
      },
      {
        path: "admin/schedule/:classSessionId",
        element: (
          <RequireAuth roles={["admin"]}>
            <AdminScheduleDetailPage />
          </RequireAuth>
        ),
      },
      {
        path: "admin/programs",
        element: (
          <RequireAuth roles={["admin"]}>
            <AdminProgramsPage />
          </RequireAuth>
        ),
      },
      {
        path: "admin/programs/batches/:batchGroupId",
        element: (
          <RequireAuth roles={["admin"]}>
            <AdminBatchDetailPage />
          </RequireAuth>
        ),
      },
      {
        path: "admin/payments",
        element: (
          <RequireAuth roles={["admin"]}>
            <AdminFinancePage />
          </RequireAuth>
        ),
      },
      {
        path: "admin/leads",
        element: (
          <RequireAuth roles={["admin"]}>
            <LeadsWorkspace canConvert />
          </RequireAuth>
        ),
      },
      {
        path: "admin/notifications",
        element: (
          <RequireAuth roles={["admin"]}>
            <NotificationsPage />
          </RequireAuth>
        ),
      },
      {
        path: "admin/settings",
        element: (
          <RequireAuth roles={["admin"]}>
            <AdminPlannedPage page="settings" />
          </RequireAuth>
        ),
      },
      {
        path: "teacher",
        element: (
          <RequireAuth roles={["teacher"]}>
            <TeacherDashboard />
          </RequireAuth>
        ),
      },
      {
        path: "teacher/classes",
        element: (
          <RequireAuth roles={["teacher"]}>
            <TeacherClassesPage />
          </RequireAuth>
        ),
      },
      {
        path: "teacher/classes/:sessionId",
        element: (
          <RequireAuth roles={["teacher"]}>
            <TeacherClassDetailPage />
          </RequireAuth>
        ),
      },
      {
        path: "teacher/availability",
        element: (
          <RequireAuth roles={["teacher"]}>
            <TeacherAvailabilityPage />
          </RequireAuth>
        ),
      },
      {
        path: "teacher/students",
        element: (
          <RequireAuth roles={["teacher"]}>
            <TeacherStudentsPage />
          </RequireAuth>
        ),
      },
      {
        path: "teacher/notifications",
        element: (
          <RequireAuth roles={["teacher"]}>
            <NotificationsPage />
          </RequireAuth>
        ),
      },
      {
        path: "teacher/settings",
        element: (
          <RequireAuth roles={["teacher"]}>
            <TeacherSettingsPage />
          </RequireAuth>
        ),
      },
      {
        path: "student",
        element: (
          <RequireAuth roles={["student"]}>
            <StudentDashboard />
          </RequireAuth>
        ),
      },
      {
        path: "student/schedule",
        element: (
          <RequireAuth roles={["student"]}>
            <StudentSchedulePage />
          </RequireAuth>
        ),
      },
      {
        path: "student/classes",
        element: (
          <RequireAuth roles={["student"]}>
            <StudentClassesPage />
          </RequireAuth>
        ),
      },
      {
        path: "student/feedbacks",
        element: (
          <RequireAuth roles={["student"]}>
            <StudentFeedbacksPage />
          </RequireAuth>
        ),
      },
      {
        path: "student/notifications",
        element: (
          <RequireAuth roles={["student"]}>
            <NotificationsPage />
          </RequireAuth>
        ),
      },
      {
        path: "student/settings",
        element: (
          <RequireAuth roles={["student"]}>
            <StudentSettingsPage />
          </RequireAuth>
        ),
      },
      {
        path: "leads",
        element: (
          <RequireAuth roles={["admin", "lead_manager"]}>
            <LeadManagementHome />
          </RequireAuth>
        ),
      },
    ],
  },
]);
