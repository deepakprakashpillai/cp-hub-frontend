import { api } from "@/api/http";
import type {
  AdminTeacherRead,
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
};

// Teacher list & profile
export async function listTeachers(): Promise<PageResponse<TeacherRead>> {
  const response = await api.get<PageResponse<TeacherRead>>("/admin/teachers", {
    params: { page_size: 100, is_active: true },
  });
  return response.data;
}

export async function getTeacher(teacherId: string): Promise<TeacherRead> {
  const response = await api.get<TeacherRead>(`/admin/teachers/${teacherId}`);
  return response.data;
}

// Teacher classes
export async function listTeacherClasses(params: {
  teacherId: string;
  page?: number;
  pageSize?: number;
  programType?: string;
  status?: string;
  startsFrom?: string;
  startsTo?: string;
  sortOrder?: "asc" | "desc";
}): Promise<PageResponse<TeacherClassSession>> {
  const response = await api.get<PageResponse<TeacherClassSession>>("/admin/classes", {
    params: {
      teacher_id: params.teacherId,
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
  const response = await api.get<TeacherClassSession>(`/admin/classes/${classSessionId}`);
  return response.data;
}

export async function getClassRoster(classSessionId: string): Promise<PageResponse<ClassRosterItem>> {
  const response = await api.get<PageResponse<ClassRosterItem>>(`/admin/classes/${classSessionId}/roster`, {
    params: { page_size: 100 },
  });
  return response.data;
}

// Attendance
export async function markClassAttendance(
  classSessionId: string,
  attendances: Array<{ booking_id: string; status: "attended" | "missed"; reason?: string }>
): Promise<void> {
  await api.post(`/admin/classes/${classSessionId}/attendance`, { attendances });
}

export async function markBookingAttendance(
  bookingId: string,
  status: "attended" | "missed",
  reason?: string
): Promise<void> {
  await api.post(`/bookings/${bookingId}/attendance`, { status, reason });
}

// Booking Notes / Feedback
export async function createBookingNote(payload: {
  booking_id: string;
  teacher_id: string;
  note: string;
  visibility?: BookingNoteVisibility;
}): Promise<BookingNoteRead> {
  const response = await api.post<BookingNoteRead>(`/teacher/bookings/${payload.booking_id}/notes`, payload);
  return response.data;
}

export async function listBookingNotes(bookingId: string, teacherId: string): Promise<PageResponse<BookingNoteRead>> {
  const response = await api.get<PageResponse<BookingNoteRead>>(`/teacher/bookings/${bookingId}/notes`, {
    params: { teacher_id: teacherId },
  });
  return response.data;
}

// Availability Rules & Slots
export async function listTeacherRules(teacherId: string): Promise<PageResponse<TeacherAvailabilityRuleRead>> {
  const response = await api.get<PageResponse<TeacherAvailabilityRuleRead>>("/admin/teacher-availability/rules", {
    params: { teacher_id: teacherId, page_size: 100 },
  });
  return response.data;
}

export async function createTeacherRule(payload: {
  teacher_id: string;
  day_of_week: DayOfWeek;
  start_time_utc: string;
  end_time_utc: string;
  slot_duration_minutes: number;
}): Promise<TeacherAvailabilityRuleRead> {
  const response = await api.post<TeacherAvailabilityRuleRead>("/admin/teacher-availability/rules", payload);
  return response.data;
}

export async function deleteTeacherRule(ruleId: string): Promise<void> {
  await api.delete(`/admin/teacher-availability/rules/${ruleId}`);
}

export async function listTeacherSlots(params: {
  teacherId: string;
  startsFrom?: string;
  startsTo?: string;
}): Promise<PageResponse<TeacherAvailabilitySlotRead>> {
  const response = await api.get<PageResponse<TeacherAvailabilitySlotRead>>("/admin/teacher-availability/slots", {
    params: {
      teacher_id: params.teacherId,
      starts_from: params.startsFrom,
      starts_to: params.startsTo,
      page_size: 100,
    },
  });
  return response.data;
}

export async function blockTeacherTime(payload: {
  teacher_id: string;
  starts_at: string;
  ends_at: string;
  reason?: string;
}): Promise<TeacherAvailabilitySlotRead> {
  const response = await api.post<TeacherAvailabilitySlotRead>("/admin/teacher-availability/blocks", payload);
  return response.data;
}

export async function generateTeacherSlots(teacherId: string, daysAhead = 14): Promise<{
  rules_checked: number;
  slots_created: number;
  slots_cancelled: number;
  slots_skipped: number;
}> {
  const response = await api.post(`/admin/teachers/${teacherId}/availability/generate`, null, {
    params: { days_ahead: daysAhead },
  });
  return response.data;
}
