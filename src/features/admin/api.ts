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

export type DayOfWeek =
  "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday";

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

export type BatchScheduleDefaultOption = { display_label: string; start_time_utc: string; duration_minutes: number; teacher_id: string | null; capacity: number | null };
export type BatchScheduleDefaultsRead = { id: string; timezone: "UTC"; default_option_count: number; default_teacher_id: string | null; capacity_strategy: string; fixed_capacity: number | null; option_templates: BatchScheduleDefaultOption[]; created_at: string; updated_at: string };
export type BatchScheduleDayOptionRead = { id: string; batch_schedule_day_id: string; display_label: string; option_order: number; starts_at: string; ends_at: string; teacher_id: string | null; teacher: { id: string; display_name: string; full_name: string } | null; capacity: number; active_booking_count: number; available_capacity: number; status: ClassSessionStatus };
export type BatchScheduleDayRead = { id: string; batch_group_id: string; batch: { id: string; name: string }; schedule_date: string; timezone: "UTC"; status: "scheduled" | "cancelled" | "completed"; cancelled_at: string | null; cancelled_by_user_id: string | null; cancel_reason: string | null; options: BatchScheduleDayOptionRead[]; eligible_student_count: number; unassigned_students: Array<{ id: string; full_name: string; email: string }>; created_at: string; updated_at: string };
export type BatchDayOptionInput = { displayLabel: string; startsAt: string; endsAt: string; teacherId?: string | null; capacity?: number | null };

export type AdminClassRosterBookingRead = BookingRead & {
  student: {
    id: string;
    user_id: string;
    full_name: string;
    email: string;
    phone: string | null;
    status: StudentStatus;
  };
};

export type AdminClassActivityRead = {
  id: string;
  class_session_id: string;
  booking_id: string;
  student: { id: string; full_name: string; email: string } | null;
  event_type: BookingEventType;
  reason: string;
  metadata: Record<string, unknown>;
  actor: { id: string; full_name: string; role: string } | null;
  actor_label: string;
  created_at: string;
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
  teacher?: {
    id: string;
    display_name: string;
    full_name: string;
    profile_photo_url: string | null;
  } | null;
  batch_group?: {
    id: string;
    name: string;
    is_active: boolean;
  } | null;
  primary_student?: {
    id: string;
    user_id: string;
    full_name: string;
    email: string;
    phone: string | null;
    status: StudentStatus;
  } | null;
  booking_counts?: {
    booked: number;
    cancelled: number;
    attended: number;
    missed: number;
  };
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
  active_member_count?: number;
  upcoming_scheduled_count?: number;
  package_id?: string | null;
  package?: { id: string; name: string; duration_days: number; price_amount: number; currency: string; is_active: boolean } | null;
};

export type BatchGroupPayload = {
  name: string;
  defaultCapacity: number;
  notes?: string | null;
  isActive?: boolean;
  packageId?: string | null;
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

export type PackagePayload = {
  name: string;
  durationDays: number;
  priceAmount: number;
  currency?: string;
  isActive?: boolean;
};

export type BatchClassSessionPayload = {
  batchGroupId: string;
  teacherId?: string | null;
  batchSlot: "morning" | "noon" | "afternoon";
  startsAt: string;
  endsAt: string;
  capacity: number;
};

export type OneOnOneBookingPayload = {
  studentId: string;
  teacherAvailabilitySlotId: string;
};

export type AdminUserUpdatePayload = {
  full_name?: string;
  email?: string;
  phone?: string | null;
  is_active?: boolean;
};

export type AdminTeacherCreatePayload = {
  fullName: string;
  displayName: string;
  email: string;
  phone?: string | null;
  isAccountActive?: boolean;
  bio?: string | null;
  profilePhotoUrl?: string | null;
};

export type AdminTeacherUpdatePayload = {
  displayName?: string;
  bio?: string | null;
  profilePhotoUrl?: string | null;
  isActive?: boolean;
};

export type TeacherAvailabilityRulePayload = {
  teacherId: string;
  dayOfWeek: DayOfWeek;
  startTimeUtc: string;
  endTimeUtc: string;
  slotDurationMinutes: number;
  isActive?: boolean;
};

export type TeacherAvailabilitySlotPayload = {
  teacherId: string;
  startsAt: string;
  endsAt: string;
  status?: AvailabilitySlotStatus;
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
  assignedTeacherId?: string;
  sortBy?: AdminStudentSortBy;
  sortOrder?: SortOrder;
  page?: number;
  pageSize?: number;
};

export type AdminBookingListParams = {
  studentId?: string;
  classSessionId?: string;
  teacherId?: string;
  status?: BookingStatus;
  startsFrom?: string;
  startsTo?: string;
  page?: number;
  pageSize?: number;
};

export type AdminClassSessionListParams = {
  q?: string;
  programType?: StudentProgramType;
  startsFrom?: string;
  startsTo?: string;
  status?: ClassSessionStatus;
  teacherId?: string;
  batchGroupId?: string;
  sortOrder?: SortOrder;
  page?: number;
  pageSize?: number;
};

export type AdminTeacherAvailabilitySlotListParams = {
  teacherId?: string;
  startsFrom?: string;
  startsTo?: string;
  status?: AvailabilitySlotStatus;
  source?: AvailabilitySlotSource;
  sortOrder?: SortOrder;
  page?: number;
  pageSize?: number;
};

export type AdminTeacherListParams = {
  q?: string;
  isActive?: boolean;
  accountIsActive?: boolean;
  sortBy?: "created_at" | "name" | "display_name" | "is_active";
  sortOrder?: SortOrder;
  page?: number;
  pageSize?: number;
};

export type AdminBatchGroupListParams = {
  q?: string;
  isActive?: boolean;
  sortBy?: "created_at" | "name" | "active_member_count" | "upcoming_scheduled_count" | "is_active";
  sortOrder?: SortOrder;
  page?: number;
  pageSize?: number;
};

export type AdminPackageListParams = {
  q?: string;
  isActive?: boolean;
  sortBy?: "created_at" | "name" | "duration_days" | "price_amount" | "is_active";
  sortOrder?: SortOrder;
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
  assignedTeacherId,
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
      assigned_teacher_id: assignedTeacherId,
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

export async function createAdminTeacher(payload: AdminTeacherCreatePayload) {
  const response = await api.post<AdminTeacherRead>("/admin/teachers", {
    full_name: payload.fullName.trim(),
    display_name: payload.displayName.trim(),
    email: payload.email.trim(),
    phone: payload.phone?.trim() || null,
    is_active: payload.isAccountActive ?? true,
    bio: payload.bio?.trim() || null,
    profile_photo_url: payload.profilePhotoUrl?.trim() || null,
  });
  return response.data;
}

export async function getAdminTeacher(teacherId: string) {
  const response = await api.get<AdminTeacherRead>(`/admin/teachers/${teacherId}`);
  return response.data;
}

export async function updateAdminTeacher({
  teacherId,
  payload,
}: {
  teacherId: string;
  payload: AdminTeacherUpdatePayload;
}) {
  const response = await api.patch<AdminTeacherRead>(`/admin/teachers/${teacherId}`, {
    display_name: payload.displayName?.trim(),
    bio: payload.bio?.trim() || null,
    profile_photo_url: payload.profilePhotoUrl?.trim() || null,
    is_active: payload.isActive,
  });
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
  accountIsActive,
  sortBy,
  sortOrder,
  page = 1,
  pageSize = 25,
}: AdminTeacherListParams = {}) {
  const response = await api.get<PageResponse<AdminTeacherRead>>("/admin/teachers", {
    params: {
      q: q || undefined,
      is_active: isActive,
      account_is_active: accountIsActive,
      sort_by: sortBy,
      sort_order: sortOrder,
      page,
      page_size: pageSize,
    },
  });

  return response.data;
}

export async function listAdminPackages({
  q,
  isActive,
  sortBy,
  sortOrder,
  page = 1,
  pageSize = 25,
}: AdminPackageListParams = {}) {
  const response = await api.get<PageResponse<PackageRead>>("/admin/packages", {
    params: {
      q: q || undefined,
      is_active: isActive,
      sort_by: sortBy,
      sort_order: sortOrder,
      page,
      page_size: pageSize,
    },
  });

  return response.data;
}

export async function listAdminBatchGroups({
  q,
  isActive,
  sortBy,
  sortOrder,
  page = 1,
  pageSize = 25,
}: AdminBatchGroupListParams = {}) {
  const response = await api.get<PageResponse<BatchGroupRead>>("/admin/batch-groups", {
    params: {
      q: q || undefined,
      is_active: isActive,
      sort_by: sortBy,
      sort_order: sortOrder,
      page,
      page_size: pageSize,
    },
  });

  return response.data;
}

export async function getAdminBatchScheduleDefaults() {
  const response = await api.get<BatchScheduleDefaultsRead>("/admin/batch-schedule-defaults");
  return response.data;
}

export async function updateAdminBatchScheduleDefaults({ defaultTeacherId, optionTemplates }: { defaultTeacherId?: string | null; optionTemplates?: BatchScheduleDefaultOption[] }) {
  const response = await api.patch<BatchScheduleDefaultsRead>("/admin/batch-schedule-defaults", { default_teacher_id: defaultTeacherId || null, default_option_count: optionTemplates?.length, option_templates: optionTemplates?.map((item) => ({ display_label: item.display_label.trim(), start_time_utc: item.start_time_utc, duration_minutes: item.duration_minutes, teacher_id: item.teacher_id || null, capacity: item.capacity ?? null })) });
  return response.data;
}

export async function listAdminBatchScheduleDays({ batchGroupId, startsFrom, startsTo, page = 1, pageSize = 25 }: { batchGroupId?: string; startsFrom?: string; startsTo?: string; page?: number; pageSize?: number } = {}) {
  const response = await api.get<PageResponse<BatchScheduleDayRead>>("/admin/batch-schedule-days", { params: { batch_group_id: batchGroupId, starts_from: startsFrom, starts_to: startsTo, page, page_size: pageSize } });
  return response.data;
}

export async function getAdminBatchScheduleDay(dayId: string) {
  const response = await api.get<BatchScheduleDayRead>(`/admin/batch-schedule-days/${dayId}`);
  return response.data;
}

export async function createAdminBatchScheduleDay({ batchGroupId, scheduleDate, defaultTeacherId, options }: { batchGroupId: string; scheduleDate: string; defaultTeacherId?: string | null; options?: BatchDayOptionInput[] }) {
  const response = await api.post<BatchScheduleDayRead>("/admin/batch-schedule-days", { batch_group_id: batchGroupId, schedule_date: scheduleDate, default_teacher_id: defaultTeacherId || null, options: options?.map((option) => ({ display_label: option.displayLabel.trim(), starts_at: option.startsAt, ends_at: option.endsAt, teacher_id: option.teacherId || null, capacity: option.capacity ?? null })) });
  return response.data;
}

export async function createAdminBatchScheduleDaysBulk({ batchGroupId, startsFrom, startsTo, weekdays, defaultTeacherId, options }: { batchGroupId: string; startsFrom: string; startsTo: string; weekdays: string[]; defaultTeacherId?: string | null; options: Array<{ displayLabel: string; startTimeUtc: string; endTimeUtc: string; teacherId?: string | null; capacity?: number | null }> }) {
  const response = await api.post<{ created_count: number; batch_days: BatchScheduleDayRead[] }>("/admin/batch-schedule-days/bulk", { batch_group_id: batchGroupId, starts_from: startsFrom, starts_to: startsTo, weekdays, default_teacher_id: defaultTeacherId || null, options: options.map((option) => ({ display_label: option.displayLabel.trim(), start_time_utc: option.startTimeUtc, end_time_utc: option.endTimeUtc, teacher_id: option.teacherId || null, capacity: option.capacity ?? null })) });
  return response.data;
}

export async function cancelAdminBatchScheduleDay({ dayId, reason }: { dayId: string; reason?: string }) {
  const response = await api.post<BatchScheduleDayRead>(`/admin/batch-schedule-days/${dayId}/cancel`, { reason: reason?.trim() || null });
  return response.data;
}

export async function cancelAdminBatchScheduleDaysBulk({ batchGroupId, startsFrom, startsTo, reason }: { batchGroupId: string; startsFrom: string; startsTo: string; reason?: string }) {
  const response = await api.post<{ cancelled_count: number; batch_days: BatchScheduleDayRead[] }>("/admin/batch-schedule-days/cancel-bulk", { batch_group_id: batchGroupId, starts_from: startsFrom, starts_to: startsTo, reason: reason?.trim() || null });
  return response.data;
}

export async function addAdminBatchScheduleDayOption({ dayId, displayLabel, startsAt, endsAt, teacherId, capacity }: { dayId: string; displayLabel: string; startsAt: string; endsAt: string; teacherId?: string | null; capacity?: number | null }) {
  const response = await api.post<BatchScheduleDayRead>(`/admin/batch-schedule-days/${dayId}/options`, { display_label: displayLabel.trim(), starts_at: startsAt, ends_at: endsAt, teacher_id: teacherId || null, capacity: capacity ?? null });
  return response.data;
}

export async function updateAdminBatchScheduleDayOption({ dayId, classSessionId, displayLabel, startsAt, endsAt, teacherId, capacity }: { dayId: string; classSessionId: string; displayLabel?: string; startsAt?: string; endsAt?: string; teacherId?: string | null; capacity?: number | null }) {
  const response = await api.patch<BatchScheduleDayRead>(`/admin/batch-schedule-days/${dayId}/options/${classSessionId}`, { display_label: displayLabel?.trim() || null, starts_at: startsAt || null, ends_at: endsAt || null, teacher_id: teacherId === undefined ? undefined : teacherId || null, capacity: capacity === undefined ? undefined : capacity });
  return response.data;
}

export async function deleteAdminBatchScheduleDayOption({ dayId, classSessionId, reason }: { dayId: string; classSessionId: string; reason?: string }) {
  const response = await api.delete<BatchScheduleDayRead>(`/admin/batch-schedule-days/${dayId}/options/${classSessionId}`, { data: { reason: reason?.trim() || null } });
  return response.data;
}

export async function assignAdminBatchScheduleDayStudent({ dayId, studentId, classSessionId, reason }: { dayId: string; studentId: string; classSessionId: string; reason?: string }) {
  const response = await api.put(`/admin/batch-schedule-days/${dayId}/students/${studentId}`, { class_session_id: classSessionId, reason: reason?.trim() || null });
  return response.data;
}

export async function removeAdminBatchScheduleDayStudent({ dayId, studentId, reason }: { dayId: string; studentId: string; reason?: string }) {
  const response = await api.delete(`/admin/batch-schedule-days/${dayId}/students/${studentId}`, { data: { reason: reason?.trim() || null } });
  return response.data;
}

export async function listAdminBookings({
  studentId,
  classSessionId,
  teacherId,
  status,
  startsFrom,
  startsTo,
  page = 1,
  pageSize = 25,
}: AdminBookingListParams) {
  const response = await api.get<PageResponse<BookingRead>>("/admin/bookings", {
    params: {
      student_id: studentId,
      class_session_id: classSessionId,
      teacher_id: teacherId,
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

export async function listAdminClassRoster({
  classSessionId,
  page = 1,
  pageSize = 25,
}: {
  classSessionId: string;
  page?: number;
  pageSize?: number;
}) {
  const response = await api.get<PageResponse<AdminClassRosterBookingRead>>(
    `/admin/classes/${classSessionId}/roster`,
    { params: { page, page_size: pageSize } },
  );
  return response.data;
}

export async function listAdminClassActivity({
  classSessionId,
  page = 1,
  pageSize = 50,
}: {
  classSessionId: string;
  page?: number;
  pageSize?: number;
}) {
  const response = await api.get<PageResponse<AdminClassActivityRead>>(
    `/admin/classes/${classSessionId}/activity`,
    { params: { page, page_size: pageSize } },
  );
  return response.data;
}

export async function listAdminClassSessions({
  q,
  programType,
  startsFrom,
  startsTo,
  status,
  teacherId,
  batchGroupId,
  sortOrder,
  page = 1,
  pageSize = 25,
}: AdminClassSessionListParams) {
  const response = await api.get<PageResponse<ClassSessionRead>>("/admin/classes", {
    params: {
      q: q || undefined,
      program_type: programType,
      starts_from: startsFrom,
      starts_to: startsTo,
      status,
      teacher_id: teacherId,
      batch_group_id: batchGroupId,
      sort_order: sortOrder,
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
  status,
  source,
  sortOrder,
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
        status,
        source,
        sort_order: sortOrder,
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

export async function listAdminTeacherAvailabilityRules({
  teacherId,
  page = 1,
  pageSize = 100,
}: {
  teacherId: string;
  page?: number;
  pageSize?: number;
}) {
  const response = await api.get<PageResponse<TeacherAvailabilityRuleRead>>(
    "/admin/teacher-availability/rules",
    { params: { teacher_id: teacherId, page, page_size: pageSize } },
  );
  return response.data;
}

export async function createAdminTeacherAvailabilityRule(payload: TeacherAvailabilityRulePayload) {
  const response = await api.post<TeacherAvailabilityRuleRead>(
    "/admin/teacher-availability/rules",
    {
      teacher_id: payload.teacherId,
      day_of_week: payload.dayOfWeek,
      start_time_utc: payload.startTimeUtc,
      end_time_utc: payload.endTimeUtc,
      slot_duration_minutes: payload.slotDurationMinutes,
      is_active: payload.isActive ?? true,
    },
  );
  return response.data;
}

export async function updateAdminTeacherAvailabilityRule({
  ruleId,
  payload,
}: {
  ruleId: string;
  payload: Partial<Omit<TeacherAvailabilityRulePayload, "teacherId">>;
}) {
  const response = await api.patch<TeacherAvailabilityRuleRead>(
    `/admin/teacher-availability/rules/${ruleId}`,
    {
      day_of_week: payload.dayOfWeek,
      start_time_utc: payload.startTimeUtc,
      end_time_utc: payload.endTimeUtc,
      slot_duration_minutes: payload.slotDurationMinutes,
      is_active: payload.isActive,
    },
  );
  return response.data;
}

export async function deleteAdminTeacherAvailabilityRule(ruleId: string) {
  await api.delete(`/admin/teacher-availability/rules/${ruleId}`);
}

export async function createAdminTeacherAvailabilitySlot(payload: TeacherAvailabilitySlotPayload) {
  const response = await api.post<TeacherAvailabilitySlotRead>(
    "/admin/teacher-availability/slots",
    {
      teacher_id: payload.teacherId,
      source: "manual",
      starts_at: payload.startsAt,
      ends_at: payload.endsAt,
      status: payload.status ?? "available",
    },
  );
  return response.data;
}

export async function createAdminTeacherAvailabilitySlotsBulk(
  payloads: TeacherAvailabilitySlotPayload[],
) {
  const response = await api.post<TeacherAvailabilitySlotRead[]>(
    "/admin/teacher-availability/slots/bulk",
    {
      slots: payloads.map((payload) => ({
        teacher_id: payload.teacherId,
        source: "manual",
        starts_at: payload.startsAt,
        ends_at: payload.endsAt,
        status: payload.status ?? "available",
      })),
    },
  );
  return response.data;
}

export async function createAdminTeacherAvailabilityBlock(payload: TeacherAvailabilitySlotPayload) {
  const response = await api.post<TeacherAvailabilitySlotRead>(
    "/admin/teacher-availability/blocks",
    {
      teacher_id: payload.teacherId,
      starts_at: payload.startsAt,
      ends_at: payload.endsAt,
    },
  );
  return response.data;
}

export async function updateAdminTeacherAvailabilitySlot({
  slotId,
  startsAt,
  endsAt,
  status,
}: {
  slotId: string;
  startsAt?: string;
  endsAt?: string;
  status?: AvailabilitySlotStatus;
}) {
  const response = await api.patch<TeacherAvailabilitySlotRead>(
    `/admin/teacher-availability/slots/${slotId}`,
    { starts_at: startsAt, ends_at: endsAt, status },
  );
  return response.data;
}

export async function deleteAdminTeacherAvailabilitySlot(slotId: string) {
  await api.delete(`/admin/teacher-availability/slots/${slotId}`);
}

export async function generateAdminTeacherAvailabilitySlots({
  teacherId,
  daysAhead = 14,
}: {
  teacherId: string;
  daysAhead?: number;
}) {
  const response = await api.post<{
    rules_checked: number;
    slots_created: number;
    slots_cancelled: number;
    slots_skipped: number;
  }>(`/admin/teachers/${teacherId}/availability/generate`, null, {
    params: { days_ahead: daysAhead },
  });
  return response.data;
}

export async function cancelAdminClassSession({
  classSessionId,
  reason,
}: {
  classSessionId: string;
  reason?: string;
}) {
  const response = await api.post<ClassSessionRead>(`/admin/classes/${classSessionId}/cancel`, {
    reason: reason?.trim() || null,
  });
  return response.data;
}

export async function markAdminClassAttendance({
  classSessionId,
  records,
}: {
  classSessionId: string;
  records: Array<{ bookingId: string; status: "attended" | "missed"; reason?: string }>;
}) {
  const response = await api.post<BookingRead[]>(`/admin/classes/${classSessionId}/attendance`, {
    records: records.map((record) => ({
      booking_id: record.bookingId,
      status: record.status,
      reason: record.reason?.trim() || null,
    })),
  });
  return response.data;
}

export async function addAdminStudentToClass({
  classSessionId,
  studentId,
  reason,
}: {
  classSessionId: string;
  studentId: string;
  reason?: string;
}) {
  const response = await api.post<BookingRead>(`/admin/classes/${classSessionId}/students`, {
    student_id: studentId,
    reason: reason?.trim() || null,
  });
  return response.data;
}

export async function getAdminBatchGroup(batchGroupId: string) {
  const response = await api.get<BatchGroupRead>(`/admin/batch-groups/${batchGroupId}`);
  return response.data;
}

export async function listAdminBatchGroupStudents({
  batchGroupId,
  isActive,
  page = 1,
  pageSize = 25,
}: {
  batchGroupId: string;
  isActive?: boolean;
  page?: number;
  pageSize?: number;
}) {
  const response = await api.get<PageResponse<StudentBatchMembershipRead>>(
    `/admin/batch-groups/${batchGroupId}/students`,
    { params: { is_active: isActive, page, page_size: pageSize } },
  );
  return response.data;
}

export async function addAdminBatchGroupStudent({ batchGroupId, studentId, allowPackageAccessOverride = false, reason }: { batchGroupId: string; studentId: string; allowPackageAccessOverride?: boolean; reason?: string }) {
  const response = await api.post<StudentBatchMembershipRead>(`/admin/batch-groups/${batchGroupId}/students`, { student_id: studentId, allow_package_access_override: allowPackageAccessOverride, reason: reason?.trim() || null });
  return response.data;
}

export async function removeAdminBatchGroupStudent({ batchGroupId, studentId, reason }: { batchGroupId: string; studentId: string; reason?: string }) {
  const response = await api.delete<StudentBatchMembershipRead>(`/admin/batch-groups/${batchGroupId}/students/${studentId}`, { params: { reason: reason?.trim() || undefined } });
  return response.data;
}

export async function createBatchGroup(payload: BatchGroupPayload) {
  const response = await api.post<BatchGroupRead>("/batch-groups", {
    name: payload.name.trim(),
    default_capacity: payload.defaultCapacity,
    notes: payload.notes?.trim() || null,
    is_active: payload.isActive ?? true,
    package_id: payload.packageId || null,
  });
  return response.data;
}

export async function updateAdminBatchGroup({
  batchGroupId,
  payload,
}: {
  batchGroupId: string;
  payload: Partial<BatchGroupPayload>;
}) {
  const response = await api.patch<BatchGroupRead>(`/admin/batch-groups/${batchGroupId}`, {
    name: payload.name?.trim(),
    default_capacity: payload.defaultCapacity,
    notes: payload.notes?.trim() || null,
    is_active: payload.isActive,
    package_id: payload.packageId,
  });
  return response.data;
}

export async function voidAdminBatchGroup(batchGroupId: string) {
  const response = await api.post<BatchGroupRead>(`/admin/batch-groups/${batchGroupId}/void`);
  return response.data;
}

export async function createPackage(payload: PackagePayload) {
  const response = await api.post<PackageRead>("/packages", {
    name: payload.name.trim(),
    duration_days: payload.durationDays,
    price_amount: payload.priceAmount,
    currency: payload.currency?.toUpperCase() || "INR",
    is_active: payload.isActive ?? true,
  });
  return response.data;
}

export async function updateAdminPackage({
  packageId,
  payload,
}: {
  packageId: string;
  payload: Partial<PackagePayload>;
}) {
  const response = await api.patch<PackageRead>(`/admin/packages/${packageId}`, {
    name: payload.name?.trim(),
    duration_days: payload.durationDays,
    price_amount: payload.priceAmount,
    currency: payload.currency?.toUpperCase(),
    is_active: payload.isActive,
  });
  return response.data;
}

export async function voidAdminPackage(packageId: string) {
  const response = await api.post<PackageRead>(`/admin/packages/${packageId}/void`);
  return response.data;
}

export async function createAdminBatchClassSession(payload: BatchClassSessionPayload) {
  const response = await api.post<ClassSessionRead>("/admin/classes/batch", {
    batch_group_id: payload.batchGroupId,
    teacher_id: payload.teacherId || null,
    batch_slot: payload.batchSlot,
    starts_at: payload.startsAt,
    ends_at: payload.endsAt,
    capacity: payload.capacity,
  });
  return response.data;
}

export async function createOneOnOneBooking(payload: OneOnOneBookingPayload) {
  const response = await api.post<BookingRead>("/bookings/one-on-one", {
    student_id: payload.studentId,
    teacher_availability_slot_id: payload.teacherAvailabilitySlotId,
  });
  return response.data;
}
