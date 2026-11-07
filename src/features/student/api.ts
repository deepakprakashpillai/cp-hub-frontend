import { api } from "@/api/http";
import type {
  AdminStudentRead,
  BookingStatus,
  ClassSessionStatus,
  PageResponse,
  StudentProgramType,
  UserRead,
} from "@/features/admin/api";

export type StudentRead = AdminStudentRead;

export type StudentBookingSession = {
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
  teacher?: { id: string; display_name: string; bio?: string } | null;
  batch_group?: { id: string; name: string } | null;
};

export type StudentBookingRead = {
  id: string;
  student_id: string;
  class_session_id: string;
  status: BookingStatus;
  booked_at: string;
  created_at: string;
  updated_at: string;
  class_session: StudentBookingSession;
  student?: {
    id: string;
    program_type: StudentProgramType;
    user: UserRead;
  };
};

export type StudentAccessGrantRead = {
  id: string;
  student_id: string;
  package_id: string | null;
  grant_type: string;
  duration_days: number;
  access_starts_at: string;
  access_ends_at: string;
  notes: string | null;
  created_at: string;
};

export type BatchScheduleOption = {
  id: string;
  display_label: string | null;
  batch_slot: string | null;
  starts_at: string;
  ends_at: string;
  capacity: number;
  booked_count: number;
  teacher?: { id: string; display_name: string } | null;
  is_selected?: boolean;
};

export type BatchScheduleDayRead = {
  id: string;
  batch_group_id: string;
  schedule_date: string;
  options: BatchScheduleOption[];
  selected_class_session_id: string | null;
};

export type StudentTeacherSlotRead = {
  id: string;
  teacher_id: string;
  starts_at: string;
  ends_at: string;
  status: "available" | "booked" | "cancelled" | "blocked";
  teacher?: {
    id: string;
    display_name: string;
    user?: UserRead;
  };
};

export type StudentFeedbackNoteRead = {
  id: string;
  booking_id: string;
  class_session_id: string;
  student_id: string;
  teacher_id: string;
  note: string;
  visibility: "student_visible" | "admin_only";
  created_at: string;
  updated_at: string;
  teacher?: { id: string; display_name: string };
  class_session?: StudentBookingSession;
};

// Development-only identity lookup. Authenticated student requests must use /student/me.
export async function listStudentsForDev(): Promise<PageResponse<StudentRead>> {
  const response = await api.get<PageResponse<StudentRead>>("/admin/students", {
    params: { page_size: 100 },
  });
  return response.data;
}

export async function getStudentForDev(studentId: string): Promise<StudentRead> {
  const response = await api.get<StudentRead>(`/admin/students/${studentId}`);
  return response.data;
}

export async function getCurrentStudent(): Promise<StudentRead> {
  const response = await api.get<StudentRead>("/student/me");
  return response.data;
}

// Student Bookings
export async function listStudentBookings(params: {
  status?: string;
  startsFrom?: string;
  startsTo?: string;
  page?: number;
  pageSize?: number;
}): Promise<PageResponse<StudentBookingRead>> {
  const response = await api.get<PageResponse<StudentBookingRead>>("/student/me/bookings", {
    params: {
      status: params.status !== "all" ? params.status : undefined,
      starts_from: params.startsFrom,
      starts_to: params.startsTo,
      page: params.page ?? 1,
      page_size: params.pageSize ?? 50,
    },
  });

  return response.data;
}

// Access Grants
export async function listStudentAccessGrants(): Promise<PageResponse<StudentAccessGrantRead>> {
  const response = await api.get<PageResponse<StudentAccessGrantRead>>("/student/me/access-grants", {
    params: { page_size: 50 },
  });
  return response.data;
}

// 1-on-1 Class Scheduling
export async function listAvailableTeacherSlots(params: {
  teacherId?: string;
  startsFrom?: string;
  startsTo?: string;
}): Promise<PageResponse<StudentTeacherSlotRead>> {
  const response = await api.get<PageResponse<StudentTeacherSlotRead>>("/student/me/available-slots", {
    params: {
      teacher_id: params.teacherId,
      starts_from: params.startsFrom,
      starts_to: params.startsTo,
      status: "available",
      page_size: 100,
    },
  });
  return response.data;
}

export async function bookOneOnOneClass(payload: {
  teacher_availability_slot_id: string;
}): Promise<StudentBookingRead> {
  const response = await api.post<StudentBookingRead>("/student/me/bookings/one-on-one", payload);
  return response.data;
}

// Batch Class Scheduling
export async function listStudentBatchScheduleDays(): Promise<BatchScheduleDayRead[]> {
  const response = await api.get<BatchScheduleDayRead[]>("/student/me/batch-schedule-days");
  return response.data;
}

export async function selectBatchScheduleDayOption(
  dayId: string,
  classSessionId: string | null,
): Promise<void> {
  await api.put(`/student/me/batch-schedule-days/${dayId}/selection`, {
    class_session_id: classSessionId,
  });
}

// Cancellation & Reschedule
export async function cancelStudentBooking(bookingId: string, reason?: string): Promise<void> {
  await api.post(`/student/me/bookings/${bookingId}/cancel`, { reason });
}

export async function rescheduleStudentBookingOneOnOne(
  bookingId: string,
  teacherAvailabilitySlotId: string,
): Promise<StudentBookingRead> {
  const response = await api.post<StudentBookingRead>(`/student/me/bookings/${bookingId}/reschedule/one-on-one`, {
    teacher_availability_slot_id: teacherAvailabilitySlotId,
  });
  return response.data;
}

export async function rescheduleStudentBookingBatch(
  bookingId: string,
  classSessionId: string,
): Promise<StudentBookingRead> {
  const response = await api.post<StudentBookingRead>(`/student/me/bookings/${bookingId}/reschedule/batch`, {
    class_session_id: classSessionId,
  });
  return response.data;
}

// Feedback Notes
export async function listStudentFeedbacks(): Promise<StudentFeedbackNoteRead[]> {
  const response = await api.get<StudentFeedbackNoteRead[]>("/student/me/feedbacks");
  return response.data;
}
