import { api } from "@/api/http";

export type AdminDashboardSummary = {
  window: {
    starts_from: string;
    starts_to: string;
    generated_at: string;
  };
  students: {
    total: number;
    active: number;
    enrolled: number;
    paused: number;
    completed: number;
    cancelled: number;
    active_with_valid_access: number;
    expired_access: number;
  };
  teachers: {
    total: number;
    active: number;
    inactive: number;
  };
  batch_groups: {
    total: number;
    active: number;
    inactive: number;
  };
  classes: {
    scheduled: number;
    completed: number;
    cancelled: number;
  };
  bookings: {
    booked: number;
    cancelled: number;
    attended: number;
    missed: number;
  };
  payments: {
    count: number;
    total_amount_paid: number;
  };
};

export type DashboardWindowParams = {
  startsFrom: string;
  startsTo: string;
};

export type PageResponse<T> = {
  items: T[];
  total: number;
  page: number;
  page_size: number;
};

export type StudentProgramType = "one_on_one" | "batch";

export type StudentStatus = "enrolled" | "active" | "paused" | "completed" | "cancelled";

export type AdminStudentAccessState = "valid" | "expired" | "not_started" | "none";

export type AdminStudentSortBy =
  "created_at" | "joined_at" | "name" | "status" | "program_type" | "access_ends_at";

export type SortOrder = "asc" | "desc";

export type BookingStatus = "booked" | "cancelled" | "attended" | "missed";

export type BookingEventType =
  | "booked"
  | "cancelled_by_student"
  | "cancelled_by_admin"
  | "rescheduled_from"
  | "rescheduled_to"
  | "class_cancelled_empty"
  | "attendance_marked"
  | "manually_added_by_admin";

export type ClassSessionStatus = "scheduled" | "completed" | "cancelled";

export type BookingNoteVisibility = "admin_only" | "student_visible";

export type AvailabilitySlotStatus = "available" | "booked" | "cancelled" | "blocked";

export type AvailabilitySlotSource = "rule" | "manual";

export type PaymentMethod = "upi" | "cash" | "bank_transfer" | "other";

export type StudentAccessGrantType = "package" | "addon_days" | "manual_adjustment";

export type UserRead = {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  role: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type StudentRead = {
  id: string;
  user_id: string;
  program_type: StudentProgramType;
  assigned_teacher_id: string | null;
  status: StudentStatus;
  access_starts_at: string | null;
  access_ends_at: string | null;
  joined_at: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type TeacherRead = {
  id: string;
  user_id: string;
  display_name: string;
  bio: string | null;
  profile_photo_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type AdminTeacherRead = {
  user: UserRead;
  teacher: TeacherRead;
};

export type AdminStudentRead = {
  user: UserRead;
  student: StudentRead;
  assigned_teacher: AdminTeacherRead | null;
};

export type BookingRead = {
  id: string;
  student_id: string;
  class_session_id: string;
  status: BookingStatus;
  booked_at: string;
  created_at: string;
  updated_at: string;
};

export type BookingEventRead = {
  id: string;
  booking_id: string;
  event_type: BookingEventType;
  actor_user_id: string | null;
  reason: string;
  event_metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
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

export type ClassSessionRead = {
  id: string;
  teacher_id: string | null;
  teacher_availability_slot_id: string | null;
  batch_group_id: string | null;
  program_type: StudentProgramType;
  batch_slot: "morning" | "noon" | "afternoon" | null;
  starts_at: string;
  ends_at: string;
  status: ClassSessionStatus;
  capacity: number;
  created_at: string;
  updated_at: string;
};

export type TeacherAvailabilitySlotRead = {
  id: string;
  teacher_id: string;
  rule_id: string | null;
  source: AvailabilitySlotSource;
  starts_at: string;
  ends_at: string;
  status: AvailabilitySlotStatus;
  created_at: string;
  updated_at: string;
};

export type AdminStudentPaymentRead = {
  id: string;
  student_id: string;
  package_id: string | null;
  amount_paid: number;
  currency: string;
  payment_method: PaymentMethod;
  paid_at: string;
  created_by_user_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type AdminStudentAccessGrantRead = {
  id: string;
  student_id: string;
  package_id: string | null;
  grant_type: StudentAccessGrantType;
  duration_days: number;
  access_starts_at: string;
  access_ends_at: string;
  created_by_user_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type StudentProgramChangeRead = {
  id: string;
  student_id: string;
  old_program_type: StudentProgramType;
  new_program_type: StudentProgramType;
  changed_by_user_id: string | null;
  reason: string | null;
  created_at: string;
  updated_at: string;
};

export type BatchGroupRead = {
  id: string;
  name: string;
  default_capacity: number;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type StudentBatchMembershipRead = {
  id: string;
  student_id: string;
  batch_group_id: string;
  is_active: boolean;
  assigned_by_user_id: string | null;
  assigned_at: string;
  ended_at: string | null;
  end_reason: string | null;
  created_at: string;
  updated_at: string;
};

export type PackageRead = {
  id: string;
  name: string;
  duration_days: number;
  price_amount: number;
  currency: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type AdminUserUpdatePayload = {
  full_name?: string;
  email?: string;
  phone?: string | null;
  is_active?: boolean;
};

export type AdminStudentCreatePayload = {
  fullName: string;
  email: string;
  phone?: string | null;
  isActive?: boolean;
  programType: StudentProgramType;
  status?: StudentStatus;
  notes?: string | null;
};

export type AdminStudentUpdatePayload = {
  program_type?: StudentProgramType;
  status?: StudentStatus;
  access_starts_at?: string | null;
  access_ends_at?: string | null;
  notes?: string | null;
  assigned_teacher_id?: string | null;
};

export type AdminStudentPaymentPayload = {
  packageId?: string | null;
  amountPaid: number;
  currency?: string;
  paymentMethod: PaymentMethod;
  paidAt: string;
  notes?: string | null;
};

export type AdminStudentPaymentCreatePayload = AdminStudentPaymentPayload;
export type AdminStudentPaymentUpdatePayload = Partial<AdminStudentPaymentPayload>;

export type AdminStudentAccessGrantCreatePayload = {
  packageId?: string | null;
  grantType: StudentAccessGrantType;
  durationDays?: number | null;
  accessStartsAt?: string | null;
  extendCurrentAccess?: boolean;
  notes?: string | null;
};

export type AdminStudentProgramSwitchPayload = {
  newProgramType: StudentProgramType;
  reason?: string | null;
};

export type AdminStudentBatchGroupSetPayload = {
  batchGroupId: string;
  reason?: string | null;
};

export type AdminStudentListParams = {
  q?: string;
  status?: StudentStatus;
  programType?: StudentProgramType;
  accessState?: AdminStudentAccessState;
  batchGroupId?: string;
  sortBy?: AdminStudentSortBy;
  sortOrder?: SortOrder;
  page?: number;
  pageSize?: number;
};

export type AdminBookingListParams = {
  studentId?: string;
  status?: BookingStatus;
  startsFrom?: string;
  startsTo?: string;
  page?: number;
  pageSize?: number;
};

export type AdminClassSessionListParams = {
  programType?: StudentProgramType;
  startsFrom?: string;
  startsTo?: string;
  status?: ClassSessionStatus;
  teacherId?: string;
  batchGroupId?: string;
  page?: number;
  pageSize?: number;
};

export type AdminTeacherAvailabilitySlotListParams = {
  teacherId?: string;
  startsFrom?: string;
  startsTo?: string;
  page?: number;
  pageSize?: number;
};

export type AdminTeacherListParams = {
  q?: string;
  isActive?: boolean;
  page?: number;
  pageSize?: number;
};

export type AdminBatchGroupListParams = {
  isActive?: boolean;
  page?: number;
  pageSize?: number;
};

export type BookingActionPayload = {
  actorUserId?: string | null;
  reason?: string;
};

export type OneOnOneBookingReschedulePayload = BookingActionPayload & {
  teacherAvailabilitySlotId: string;
};

export type BatchBookingReschedulePayload = BookingActionPayload & {
  classSessionId: string;
};

export async function getAdminDashboardSummary({ startsFrom, startsTo }: DashboardWindowParams) {
  const response = await api.get<AdminDashboardSummary>("/admin/dashboard/summary", {
    params: {
      starts_from: startsFrom,
      starts_to: startsTo,
    },
  });

  return response.data;
}

export async function listAdminStudents({
  q,
  status,
  programType,
  accessState,
  batchGroupId,
  sortBy,
  sortOrder,
  page = 1,
  pageSize = 25,
}: AdminStudentListParams) {
  const response = await api.get<PageResponse<AdminStudentRead>>("/admin/students", {
    params: {
      q: q || undefined,
      status,
      program_type: programType,
      access_state: accessState,
      batch_group_id: batchGroupId,
      sort_by: sortBy,
      sort_order: sortOrder,
      page,
      page_size: pageSize,
    },
  });

  return response.data;
}

export async function getAdminStudent(studentId: string) {
  const response = await api.get<AdminStudentRead>(`/admin/students/${studentId}`);

  return response.data;
}

export async function createAdminStudent(payload: AdminStudentCreatePayload) {
  const response = await api.post<AdminStudentRead>("/admin/students", {
    full_name: payload.fullName.trim(),
    email: payload.email.trim(),
    phone: payload.phone?.trim() || null,
    is_active: payload.isActive ?? true,
    program_type: payload.programType,
    status: payload.status ?? "enrolled",
    notes: payload.notes?.trim() || null,
  });

  return response.data;
}

export async function updateAdminUser({
  userId,
  payload,
}: {
  userId: string;
  payload: AdminUserUpdatePayload;
}) {
  const body: Record<string, string | boolean | null> = {};

  if ("full_name" in payload) {
    body.full_name = payload.full_name?.trim() ?? "";
  }
  if ("email" in payload) {
    body.email = payload.email?.trim() ?? "";
  }
  if ("phone" in payload) {
    body.phone = payload.phone?.trim() || null;
  }
  if ("is_active" in payload && payload.is_active !== undefined) {
    body.is_active = payload.is_active;
  }

  const response = await api.patch<UserRead>(`/admin/users/${userId}`, body);

  return response.data;
}

export async function updateAdminStudent({
  studentId,
  payload,
}: {
  studentId: string;
  payload: AdminStudentUpdatePayload;
}) {
  const response = await api.patch<AdminStudentRead>(`/admin/students/${studentId}`, {
    program_type: payload.program_type,
    status: payload.status,
    access_starts_at: payload.access_starts_at,
    access_ends_at: payload.access_ends_at,
    notes: payload.notes,
    assigned_teacher_id: payload.assigned_teacher_id,
  });

  return response.data;
}

export async function listAdminStudentPayments({
  studentId,
  page = 1,
  pageSize = 25,
}: {
  studentId: string;
  page?: number;
  pageSize?: number;
}) {
  const response = await api.get<PageResponse<AdminStudentPaymentRead>>(
    `/admin/students/${studentId}/payments`,
    {
      params: {
        page,
        page_size: pageSize,
      },
    },
  );

  return response.data;
}

export async function createAdminStudentPayment({
  studentId,
  payload,
}: {
  studentId: string;
  payload: AdminStudentPaymentCreatePayload;
}) {
  const response = await api.post<AdminStudentPaymentRead>(
    `/admin/students/${studentId}/payments`,
    {
      package_id: payload.packageId || null,
      amount_paid: payload.amountPaid,
      currency: payload.currency ?? "INR",
      payment_method: payload.paymentMethod,
      paid_at: payload.paidAt,
      notes: payload.notes?.trim() || null,
    },
  );

  return response.data;
}

export async function updateAdminStudentPayment({
  studentId,
  paymentId,
  payload,
}: {
  studentId: string;
  paymentId: string;
  payload: AdminStudentPaymentUpdatePayload;
}) {
  const response = await api.patch<AdminStudentPaymentRead>(
    `/admin/students/${studentId}/payments/${paymentId}`,
    {
      package_id: payload.packageId === undefined ? undefined : payload.packageId || null,
      amount_paid: payload.amountPaid,
      currency: payload.currency,
      payment_method: payload.paymentMethod,
      paid_at: payload.paidAt,
      notes: payload.notes === undefined ? undefined : payload.notes?.trim() || null,
    },
  );

  return response.data;
}

export async function deleteAdminStudentPayment({
  studentId,
  paymentId,
}: {
  studentId: string;
  paymentId: string;
}) {
  await api.delete(`/admin/students/${studentId}/payments/${paymentId}`);
}

export async function listAdminStudentAccessGrants({
  studentId,
  page = 1,
  pageSize = 25,
}: {
  studentId: string;
  page?: number;
  pageSize?: number;
}) {
  const response = await api.get<PageResponse<AdminStudentAccessGrantRead>>(
    `/admin/students/${studentId}/access-grants`,
    {
      params: {
        page,
        page_size: pageSize,
      },
    },
  );

  return response.data;
}

export async function createAdminStudentAccessGrant({
  studentId,
  payload,
}: {
  studentId: string;
  payload: AdminStudentAccessGrantCreatePayload;
}) {
  const response = await api.post<AdminStudentAccessGrantRead>(
    `/admin/students/${studentId}/access-grants`,
    {
      package_id: payload.packageId || null,
      grant_type: payload.grantType,
      duration_days: payload.durationDays ?? null,
      access_starts_at: payload.accessStartsAt || null,
      extend_current_access: payload.extendCurrentAccess ?? true,
      notes: payload.notes?.trim() || null,
    },
  );

  return response.data;
}

export async function switchAdminStudentProgram({
  studentId,
  payload,
}: {
  studentId: string;
  payload: AdminStudentProgramSwitchPayload;
}) {
  const response = await api.post<StudentProgramChangeRead>(
    `/admin/students/${studentId}/program-switch`,
    {
      new_program_type: payload.newProgramType,
      reason: payload.reason?.trim() || null,
    },
  );

  return response.data;
}

export async function setAdminStudentBatchGroup({
  studentId,
  payload,
}: {
  studentId: string;
  payload: AdminStudentBatchGroupSetPayload;
}) {
  const response = await api.post<StudentBatchMembershipRead>(
    `/admin/students/${studentId}/batch-group`,
    {
      batch_group_id: payload.batchGroupId,
      reason: payload.reason?.trim() || null,
    },
  );

  return response.data;
}

export async function listAdminStudentBatchMemberships({
  studentId,
  page = 1,
  pageSize = 25,
}: {
  studentId: string;
  page?: number;
  pageSize?: number;
}) {
  const response = await api.get<PageResponse<StudentBatchMembershipRead>>(
    `/admin/students/${studentId}/batch-memberships`,
    {
      params: {
        page,
        page_size: pageSize,
      },
    },
  );

  return response.data;
}

export async function listStudentProgramChanges({
  studentId,
  page = 1,
  pageSize = 25,
}: {
  studentId: string;
  page?: number;
  pageSize?: number;
}) {
  const response = await api.get<PageResponse<StudentProgramChangeRead>>(
    "/students/program-changes",
    {
      params: {
        student_id: studentId,
        page,
        page_size: pageSize,
      },
    },
  );

  return response.data;
}

export async function listAdminTeachers({
  q,
  isActive,
  page = 1,
  pageSize = 25,
}: AdminTeacherListParams = {}) {
  const response = await api.get<PageResponse<AdminTeacherRead>>("/admin/teachers", {
    params: {
      q: q || undefined,
      is_active: isActive,
      page,
      page_size: pageSize,
    },
  });

  return response.data;
}

export async function listAdminPackages({ page = 1, pageSize = 100 } = {}) {
  const response = await api.get<PageResponse<PackageRead>>("/admin/packages", {
    params: {
      page,
      page_size: pageSize,
    },
  });

  return response.data;
}

export async function listAdminBatchGroups({
  isActive,
  page = 1,
  pageSize = 100,
}: AdminBatchGroupListParams = {}) {
  const response = await api.get<PageResponse<BatchGroupRead>>("/admin/batch-groups", {
    params: {
      is_active: isActive,
      page,
      page_size: pageSize,
    },
  });

  return response.data;
}

export async function listAdminBookings({
  studentId,
  status,
  startsFrom,
  startsTo,
  page = 1,
  pageSize = 25,
}: AdminBookingListParams) {
  const response = await api.get<PageResponse<BookingRead>>("/admin/bookings", {
    params: {
      student_id: studentId,
      status,
      starts_from: startsFrom,
      starts_to: startsTo,
      page,
      page_size: pageSize,
    },
  });

  return response.data;
}

export async function getAdminClassSession(classSessionId: string) {
  const response = await api.get<ClassSessionRead>(`/admin/classes/${classSessionId}`);

  return response.data;
}

export async function listAdminClassSessions({
  programType,
  startsFrom,
  startsTo,
  status,
  teacherId,
  batchGroupId,
  page = 1,
  pageSize = 25,
}: AdminClassSessionListParams) {
  const response = await api.get<PageResponse<ClassSessionRead>>("/admin/classes", {
    params: {
      program_type: programType,
      starts_from: startsFrom,
      starts_to: startsTo,
      status,
      teacher_id: teacherId,
      batch_group_id: batchGroupId,
      page,
      page_size: pageSize,
    },
  });

  return response.data;
}

export async function listAdminTeacherAvailabilitySlots({
  teacherId,
  startsFrom,
  startsTo,
  page = 1,
  pageSize = 25,
}: AdminTeacherAvailabilitySlotListParams) {
  const response = await api.get<PageResponse<TeacherAvailabilitySlotRead>>(
    "/admin/teacher-availability/slots",
    {
      params: {
        teacher_id: teacherId,
        starts_from: startsFrom,
        starts_to: startsTo,
        page,
        page_size: pageSize,
      },
    },
  );

  return response.data;
}

export async function listAdminBookingEvents({
  bookingId,
  page = 1,
  pageSize = 25,
}: {
  bookingId: string;
  page?: number;
  pageSize?: number;
}) {
  const response = await api.get<PageResponse<BookingEventRead>>(
    `/admin/bookings/${bookingId}/events`,
    {
      params: {
        page,
        page_size: pageSize,
      },
    },
  );

  return response.data;
}

export async function cancelAdminBooking({
  bookingId,
  actorUserId,
  reason,
}: BookingActionPayload & { bookingId: string }) {
  const response = await api.post<BookingRead>(`/admin/bookings/${bookingId}/cancel`, {
    actor_user_id: actorUserId || null,
    reason: reason?.trim() || null,
  });

  return response.data;
}

export async function rescheduleAdminOneOnOneBooking({
  bookingId,
  actorUserId,
  reason,
  teacherAvailabilitySlotId,
}: OneOnOneBookingReschedulePayload & { bookingId: string }) {
  const response = await api.post<BookingRead>(
    `/admin/bookings/${bookingId}/reschedule/one-on-one`,
    {
      actor_user_id: actorUserId || null,
      reason: reason?.trim() || null,
      teacher_availability_slot_id: teacherAvailabilitySlotId,
    },
  );

  return response.data;
}

export async function rescheduleAdminBatchBooking({
  bookingId,
  actorUserId,
  reason,
  classSessionId,
}: BatchBookingReschedulePayload & { bookingId: string }) {
  const response = await api.post<BookingRead>(`/admin/bookings/${bookingId}/reschedule/batch`, {
    actor_user_id: actorUserId || null,
    reason: reason?.trim() || null,
    class_session_id: classSessionId,
  });

  return response.data;
}

export async function listAdminBookingNotes({
  bookingId,
  page = 1,
  pageSize = 25,
}: {
  bookingId: string;
  page?: number;
  pageSize?: number;
}) {
  const response = await api.get<PageResponse<BookingNoteRead>>(
    `/admin/bookings/${bookingId}/notes`,
    {
      params: {
        page,
        page_size: pageSize,
      },
    },
  );

  return response.data;
}
