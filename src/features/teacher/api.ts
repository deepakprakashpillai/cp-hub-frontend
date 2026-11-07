import { api } from "@/api/http";
import type {
  AdminTeacherRead,
  AdminStudentRead,
  AvailabilitySlotStatus,
  BookingNoteVisibility,
  ClassSessionStatus,
  DayOfWeek,
  PageResponse,
  StudentProgramType,
} from "@/features/admin/api";

export type TeacherRead = AdminTeacherRead & {
  permanent_one_on_one_students?: Array<{
    id: string;
    status: string;
    user: { id: string; full_name: string; email: string; phone: string | null };
  }>;
};

export type TeacherClassSession = {
  id: string;
  teacher_id: string | null;
  batch_group_id: string | null;
  batch_schedule_day_id: string | null;
  program_type: StudentProgramType;
  batch_slot: string | null;
  display_label: string | null;
  starts_at: string;
  ends_at: string;
  status: ClassSessionStatus;
  capacity: number;
  created_at: string;
  updated_at: string;
  teacher?: { id: string; display_name: string } | null;
  batch_group?: { id: string; name: string } | null;
  primary_student?: { id: string; user_id: string; full_name: string; email: string } | null;
  booking_status_counts?: { booked: number; attended: number; missed: number; cancelled: number };
};

export type ClassRosterItem = {
  id: string;
  student_id: string;
  class_session_id: string;
  status: "booked" | "cancelled" | "attended" | "missed";
  booked_at: string;
  student: {
    id: string;
    full_name: string;
    email: string;
    phone: string | null;
  };
};

export type BookingNoteRead = {
  id: string;
  booking_id: string;
  class_session_id: string;
  student_id: string;
  teacher_id: string;
  note: string;
  visibility: BookingNoteVisibility;
  created_at: string;
  updated_at: string;
};

export type TeacherAvailabilityRuleRead = {
  id: string;
  teacher_id: string;
  day_of_week: DayOfWeek;
  start_time_utc: string;
  end_time_utc: string;
  slot_duration_minutes: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type TeacherAvailabilitySlotRead = {
  id: string;
  teacher_id: string;
  rule_id: string | null;
  source: "rule" | "manual";
  starts_at: string;
  ends_at: string;
  status: AvailabilitySlotStatus;
  created_at: string;
  updated_at: string;
  student_name?: string | null;
  attendee_name?: string | null;
  student?: { full_name: string } | null;
};

// Development-only identity lookup. Authenticated teacher requests must use /teacher/me.
export async function listTeachersForDev(): Promise<PageResponse<TeacherRead>> {
  const response = await api.get<PageResponse<TeacherRead>>("/admin/teachers", {
    params: { page_size: 100, is_active: true },
  });
  return response.data;
}

export async function getTeacherForDev(teacherId: string): Promise<TeacherRead> {
  const response = await api.get<TeacherRead>(`/admin/teachers/${teacherId}`);
  return response.data;
}

export async function getCurrentTeacher(): Promise<TeacherRead> {
  const response = await api.get<TeacherRead>("/teacher/me");
  return response.data;
}

export type TeacherStudentRead = AdminStudentRead;

export async function listTeacherStudents(): Promise<PageResponse<TeacherStudentRead>> {
  const response = await api.get<PageResponse<TeacherStudentRead>>("/teacher/me/students", {
    params: { page_size: 100 },
  });
  return response.data;
}

// Teacher classes
export async function listTeacherClasses(params: {
  page?: number;
  pageSize?: number;
  programType?: string;
  status?: string;
  startsFrom?: string;
  startsTo?: string;
  sortOrder?: "asc" | "desc";
}): Promise<PageResponse<TeacherClassSession>> {
  const response = await api.get<PageResponse<TeacherClassSession>>("/teacher/me/classes", {
    params: {
      page: params.page ?? 1,
      page_size: params.pageSize ?? 25,
      program_type: params.programType !== "all" ? params.programType : undefined,
      status: params.status !== "all" ? params.status : undefined,
      starts_from: params.startsFrom,
      starts_to: params.startsTo,
      sort_order: params.sortOrder ?? "asc",
    },
  });
  return response.data;
}

export async function getTeacherClassSession(classSessionId: string): Promise<TeacherClassSession> {
  const response = await api.get<TeacherClassSession>(`/teacher/me/classes/${classSessionId}`);
  return response.data;
}

export async function getClassRoster(classSessionId: string): Promise<PageResponse<ClassRosterItem>> {
  const response = await api.get<PageResponse<ClassRosterItem>>(`/teacher/me/classes/${classSessionId}/roster`, {
    params: { page_size: 100 },
  });
  return response.data;
}

// Attendance
export async function markClassAttendance(
  classSessionId: string,
  attendances: Array<{ booking_id: string; status: "attended" | "missed"; reason?: string }>
): Promise<void> {
  await api.post(`/teacher/me/classes/${classSessionId}/attendance`, { records: attendances });
}

export async function rescheduleTeacherBatchClassSession(payload: {
  classSessionId: string;
  startsAt: string;
  endsAt: string;
  reason?: string;
}): Promise<TeacherClassSession> {
  const response = await api.patch<TeacherClassSession>(
    `/teacher/me/classes/${payload.classSessionId}/schedule`,
    {
      starts_at: payload.startsAt,
      ends_at: payload.endsAt,
      reason: payload.reason?.trim() || null,
    },
  );
  return response.data;
}

export async function cancelTeacherBatchClassSession(payload: {
  classSessionId: string;
  reason?: string;
}): Promise<TeacherClassSession> {
  const response = await api.post<TeacherClassSession>(
    `/teacher/me/classes/${payload.classSessionId}/cancel`,
    { reason: payload.reason?.trim() || null },
  );
  return response.data;
}

// Booking Notes / Feedback
export async function createBookingNote(payload: {
  booking_id: string;
  note: string;
  visibility?: BookingNoteVisibility;
}): Promise<BookingNoteRead> {
  const response = await api.post<BookingNoteRead>(`/teacher/bookings/${payload.booking_id}/notes`, {
    note: payload.note,
    visibility: payload.visibility,
  });
  return response.data;
}

export async function listBookingNotes(bookingId: string): Promise<PageResponse<BookingNoteRead>> {
  const response = await api.get<PageResponse<BookingNoteRead>>(`/teacher/bookings/${bookingId}/notes`);
  return response.data;
}

// Availability Rules & Slots
export async function listTeacherRules(): Promise<PageResponse<TeacherAvailabilityRuleRead>> {
  const response = await api.get<PageResponse<TeacherAvailabilityRuleRead>>("/teacher/me/availability/rules", {
    params: { page_size: 100 },
  });
  return response.data;
}

export async function createTeacherRule(payload: {
  day_of_week: DayOfWeek;
  start_time_utc: string;
  end_time_utc: string;
  slot_duration_minutes: number;
}): Promise<TeacherAvailabilityRuleRead> {
  const response = await api.post<TeacherAvailabilityRuleRead>("/teacher/me/availability/rules", payload);
  return response.data;
}

export async function deleteTeacherRule(ruleId: string): Promise<void> {
  await api.delete(`/teacher/me/availability/rules/${ruleId}`);
}

export async function listTeacherSlots(params: {
  startsFrom?: string;
  startsTo?: string;
}): Promise<PageResponse<TeacherAvailabilitySlotRead>> {
  const response = await api.get<PageResponse<TeacherAvailabilitySlotRead>>("/teacher/me/availability/slots", {
    params: {
      starts_from: params.startsFrom,
      starts_to: params.startsTo,
      page_size: 100,
    },
  });
  return response.data;
}

export async function blockTeacherTime(payload: {
  starts_at: string;
  ends_at: string;
  reason?: string;
}): Promise<TeacherAvailabilitySlotRead> {
  const response = await api.post<TeacherAvailabilitySlotRead>("/teacher/me/availability/blocks", {
    starts_at: payload.starts_at,
    ends_at: payload.ends_at,
  });
  return response.data;
}

export async function generateTeacherSlots(daysAhead = 14): Promise<{
  rules_checked: number;
  slots_created: number;
  slots_cancelled: number;
  slots_skipped: number;
}> {
  const response = await api.post("/teacher/me/availability/generate", null, {
    params: { days_ahead: daysAhead },
  });
  return response.data;
}
