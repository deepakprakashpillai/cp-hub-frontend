import { useMemo, useState } from "react";
import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, ArrowLeft, ChevronDown, Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";
import { Link, useParams, useSearchParams } from "react-router";

import { CopyIconButton } from "@/components/ui/CopyIconButton";
import { DataTableEmptyState, DataTableErrorState } from "@/components/ui/DataTable";
import { FilterSelect } from "@/components/ui/FilterSelect";
import { Modal } from "@/components/ui/Modal";
import { QuietLabel } from "@/components/ui/QuietLabel";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  AdminCompactField as CompactField,
  AdminCompactToggle as CompactToggle,
  AdminDetailPanel as DetailPanel,
} from "@/features/admin/AdminDetailPrimitives";
import {
  addAdminStudentToClass,
  cancelAdminClassSession,
  createAdminTeacherAvailabilityBlock,
  createAdminTeacherAvailabilityRule,
  createAdminTeacherAvailabilitySlot,
  createAdminTeacherAvailabilitySlotsBulk,
  deleteAdminTeacherAvailabilityRule,
  deleteAdminTeacherAvailabilitySlot,
  generateAdminTeacherAvailabilitySlots,
  getAdminStudent,
  getAdminTeacher,
  listAdminBookings,
  listAdminBookingEvents,
  listAdminBookingNotes,
  listAdminClassSessions,
  listAdminStudents,
  listAdminTeacherAvailabilityRules,
  listAdminTeacherAvailabilitySlots,
  markAdminClassAttendance,
  updateAdminTeacher,
  updateAdminTeacherAvailabilityRule,
  updateAdminTeacherAvailabilitySlot,
  updateAdminUser,
  type AdminStudentRead,
  type AdminTeacherRead,
  type AvailabilitySlotStatus,
  type ClassSessionRead,
  type DayOfWeek,
  type TeacherAvailabilityRuleRead,
  type TeacherAvailabilitySlotRead,
} from "@/features/admin/api";
import { cn } from "@/lib/utils";
import {
  browserTimeZone,
  formatClassStatus,
  formatDate,
  formatDateTime,
  formatProgram,
  formatSlotStatus,
  formatTime,
  getErrorMessage,
  localDateTimeToIso,
  localInputValue,
  localRuleToUtc,
  utcRuleToLocal,
  weekdays,
} from "./teacher-utils";

type DetailTab = "overview" | "classes" | "students" | "availability";
type ClassFilter = "upcoming" | "history" | "cancelled" | "all";
type AvailabilityView = "rules" | "slots";
const CLASS_PAGE_SIZE = 10;

const tabs: Array<{ value: DetailTab; label: string }> = [
  { value: "overview", label: "Overview" },
  { value: "classes", label: "Classes" },
  { value: "students", label: "Students" },
  { value: "availability", label: "Availability" },
];

export function AdminTeacherDetailPage() {
  const { teacherId } = useParams();
  const [params, setParams] = useSearchParams();
  const tab = parseTab(params.get("tab"));
  const classFilter = parseClassFilter(params.get("classes"));
  const availabilityView: AvailabilityView =
    params.get("availability") === "slots" ? "slots" : "rules";
  const selectedClassId = params.get("class");
  const now = useMemo(() => new Date().toISOString(), []);
  const classPage = Math.max(1, Number(params.get("class_page")) || 1);
  const teacherQuery = useQuery({
    queryKey: ["admin", "teachers", teacherId],
    queryFn: () => getAdminTeacher(teacherId ?? ""),
    enabled: Boolean(teacherId),
  });
  const overviewClasses = useQuery({
    queryKey: ["admin", "teachers", teacherId, "overview-classes", now],
    queryFn: () =>
      listAdminClassSessions({ teacherId: teacherId ?? "", startsFrom: now, pageSize: 10 }),
    enabled: Boolean(teacherId),
  });
  const assignedStudents = useQuery({
    queryKey: ["admin", "teachers", teacherId, "assigned-students"],
    queryFn: () => listAdminStudents({ assignedTeacherId: teacherId, pageSize: 100 }),
    enabled: Boolean(teacherId),
  });
  const rulesQuery = useQuery({
    queryKey: ["admin", "teachers", teacherId, "availability-rules"],
    queryFn: () => listAdminTeacherAvailabilityRules({ teacherId: teacherId ?? "" }),
    enabled: Boolean(teacherId),
  });
  const slotsQuery = useQuery({
    queryKey: ["admin", "teachers", teacherId, "availability-slots", "overview", now],
    queryFn: () =>
      listAdminTeacherAvailabilitySlots({
        teacherId: teacherId ?? "",
        startsFrom: now,
        status: "available",
        pageSize: 100,
      }),
    enabled: Boolean(teacherId),
  });
  const classesQuery = useQuery({
    queryKey: [
      "admin",
      "teachers",
      teacherId,
      "classes",
      classFilter,
      params.get("program"),
      classPage,
      now,
    ],
    queryFn: () =>
      listAdminClassSessions({
        teacherId: teacherId ?? "",
        ...classParams(classFilter, now),
        programType:
          params.get("program") === "batch"
            ? "batch"
            : params.get("program") === "one_on_one"
              ? "one_on_one"
              : undefined,
        page: classPage,
        pageSize: CLASS_PAGE_SIZE,
      }),
    enabled: Boolean(teacherId) && tab === "classes",
  });
  const slotListQuery = useQuery({
    queryKey: [
      "admin",
      "teachers",
      teacherId,
      "availability-slots",
      params.get("slot_range"),
      params.get("slot_status"),
      params.get("slot_source"),
      now,
    ],
    queryFn: () => listAdminTeacherAvailabilitySlots(slotParams(teacherId ?? "", params, now)),
    enabled: Boolean(teacherId) && tab === "availability" && availabilityView === "slots",
  });

  function update(values: Record<string, string | null>, replace = true) {
    const next = new URLSearchParams(params);
    Object.entries(values).forEach(([key, value]) =>
      value ? next.set(key, value) : next.delete(key),
    );
    setParams(next, { replace });
  }
  function chooseTab(nextTab: DetailTab) {
    update({ tab: nextTab === "overview" ? null : nextTab, class: null });
  }
  if (teacherQuery.isLoading) return <TeacherSkeleton />;
  if (teacherQuery.isError || !teacherQuery.data)
    return (
      <section className="rounded-md border border-danger bg-surface p-4 text-sm font-medium text-danger">
        Teacher could not be loaded.
      </section>
    );
  const teacher = teacherQuery.data;
  return (
    <section className="space-y-4">
      <Link
        to="/admin/teachers"
        className="inline-flex h-8 items-center gap-2 rounded-md px-2 text-xs font-medium text-muted hover:bg-surface-subtle hover:text-primary"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Teachers
      </Link>
      <TeacherHeader teacher={teacher} />
      <TeacherAvailabilityFollowUp
        rules={rulesQuery.data?.items ?? []}
        slots={slotsQuery.data?.total ?? 0}
        isLoading={rulesQuery.isLoading || slotsQuery.isLoading}
      />
      <div className="-mt-2 grid gap-x-4 gap-y-3 xl:grid-cols-[minmax(0,1fr)_18rem]">
        <main className="min-w-0 space-y-4">
          <nav className="flex flex-wrap gap-1 border-b border-border">
            {tabs.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => chooseTab(item.value)}
                className={cn(
                  "relative h-9 px-2 text-xs font-medium transition",
                  tab === item.value ? "text-primary" : "text-muted hover:text-primary",
                )}
              >
                {item.label}
                {tab === item.value ? (
                  <span className="absolute inset-x-2 bottom-[-1px] h-px bg-brand" />
                ) : null}
              </button>
            ))}
          </nav>
          {tab === "overview" ? (
            <Overview
              teacher={teacher}
              classes={overviewClasses.data?.items ?? []}
              students={assignedStudents.data?.total ?? 0}
              slots={slotsQuery.data?.total ?? 0}
              rules={rulesQuery.data?.items ?? []}
              loading={
                overviewClasses.isLoading ||
                assignedStudents.isLoading ||
                slotsQuery.isLoading ||
                rulesQuery.isLoading
              }
            />
          ) : null}
          {tab === "classes" ? (
            <ClassesTab
              teacherId={teacher.teacher.id}
              query={classesQuery}
              selectedClassId={selectedClassId}
              onSelect={(id) => update({ class: selectedClassId === id ? null : id })}
              filter={classFilter}
              program={params.get("program") ?? ""}
              onFilter={(value) =>
                update({
                  classes: value === "upcoming" ? null : value,
                  class_page: null,
                  class: null,
                })
              }
              onProgram={(value) =>
                update({ program: value || null, class_page: null, class: null })
              }
              onPage={(page) => update({ class_page: page > 1 ? String(page) : null })}
            />
          ) : null}
          {tab === "students" ? <StudentsTab teacherId={teacher.teacher.id} /> : null}
          {tab === "availability" ? (
            <AvailabilityTab
              teacherId={teacher.teacher.id}
              view={availabilityView}
              onView={(value) => update({ availability: value === "rules" ? null : value })}
              rulesQuery={rulesQuery}
              slotsQuery={slotListQuery}
              slotParams={params}
              updateParams={update}
            />
          ) : null}
        </main>
        <TeacherSummary teacher={teacher} />
      </div>
    </section>
  );
}

function TeacherAvailabilityFollowUp({
  rules,
  slots,
  isLoading,
}: {
  rules: TeacherAvailabilityRuleRead[];
  slots: number;
  isLoading: boolean;
}) {
  if (isLoading || (rules.some((rule) => rule.is_active) && slots > 0)) return null;

  const hasRules = rules.some((rule) => rule.is_active);
  return (
    <section className="flex min-w-0 items-center gap-2.5 rounded-md border border-warning/35 bg-warning/5 px-3 py-2.5">
      <div className="flex min-w-0 items-center gap-2.5">
        <AlertTriangle className="h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
        <div className="min-w-0">
          <p className="text-xs font-semibold text-primary">
            {hasRules ? "No future availability" : "Availability is not configured"}
          </p>
          <p className="mt-0.5 text-xs text-muted">
            {hasRules
              ? "This teacher has active weekly rules, but no open future slots to schedule."
              : "Ask the teacher to add availability in the Teacher portal before assigning future sessions."}
          </p>
        </div>
      </div>
    </section>
  );
}

function TeacherHeader({ teacher }: { teacher: AdminTeacherRead }) {
  const client = useQueryClient();
  const [open, setOpen] = useState(false);
  const [confirmPause, setConfirmPause] = useState(false);
  const [fullName, setFullName] = useState(teacher.user.full_name);
  const [email, setEmail] = useState(teacher.user.email);
  const [phone, setPhone] = useState(teacher.user.phone ?? "");
  const [displayName, setDisplayName] = useState(teacher.teacher.display_name);
  const [bio, setBio] = useState(teacher.teacher.bio ?? "");
  const [photo, setPhoto] = useState(teacher.teacher.profile_photo_url ?? "");
  const [accountActive, setAccountActive] = useState(teacher.user.is_active);
  const [teacherActive, setTeacherActive] = useState(teacher.teacher.is_active);
  const mutation = useMutation({
    mutationFn: async () => {
      if (!fullName.trim() || !displayName.trim() || !/^\S+@\S+\.\S+$/.test(email.trim()))
        throw new Error("Enter a full name, display name, and valid email.");
      await updateAdminUser({
        userId: teacher.user.id,
        payload: { full_name: fullName, email, phone, is_active: accountActive },
      });
      await updateAdminTeacher({
        teacherId: teacher.teacher.id,
        payload: { displayName, bio, profilePhotoUrl: photo, isActive: teacherActive },
      });
    },
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ["admin", "teachers", teacher.teacher.id] });
      void client.invalidateQueries({ queryKey: ["admin", "teachers"] });
      setOpen(false);
    },
  });
  return (
    <>
      <header className="pb-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-xl font-semibold leading-tight text-primary">
                {teacher.teacher.display_name}
              </h1>
              <StatusBadge tone={teacher.teacher.is_active ? "green" : "amber"}>
                {teacher.teacher.is_active ? "Active" : "Paused"}
              </StatusBadge>
              {!teacher.user.is_active ? (
                <QuietLabel tone="danger">Account disabled</QuietLabel>
              ) : null}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
              <CopyableInline value={teacher.user.email} label="email" />
              {teacher.user.phone ? (
                <CopyableInline value={teacher.user.phone} label="phone" />
              ) : null}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="inline-flex h-8 items-center gap-2 rounded-md px-3 text-xs font-medium text-muted transition hover:bg-surface-subtle hover:text-primary"
            >
              <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
              Edit
            </button>
          </div>
        </div>
      </header>
      <Modal
        title="Edit teacher"
        isOpen={open}
        onClose={() => setOpen(false)}
        footer={
          <>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="h-7 rounded-md px-2 text-xs font-medium text-muted transition hover:bg-surface-subtle"
            >
              Close
            </button>
            <button
              type="button"
              onClick={() =>
                teacherActive || confirmPause ? mutation.mutate() : setConfirmPause(true)
              }
              disabled={mutation.isPending}
              className="h-7 rounded-md px-2 text-xs font-medium text-brand transition hover:bg-surface-subtle disabled:opacity-50"
            >
              {mutation.isPending ? "Saving…" : confirmPause ? "Confirm pause" : "Save"}
            </button>
          </>
        }
      >
        <div className="space-y-2.5">
          <CompactField
            label="Full name"
            value={fullName}
            onChange={setFullName}
            disabled={mutation.isPending}
          />
          <CompactField
            label="Display name"
            value={displayName}
            onChange={setDisplayName}
            disabled={mutation.isPending}
          />
          <CompactField
            label="Email"
            type="email"
            value={email}
            onChange={setEmail}
            disabled={mutation.isPending}
          />
          <CompactField
            label="Phone"
            value={phone}
            onChange={setPhone}
            placeholder="Optional"
            disabled={mutation.isPending}
          />
          <CompactField
            label="Profile photo URL"
            value={photo}
            onChange={setPhoto}
            placeholder="Optional"
            disabled={mutation.isPending}
          />
          <label className="block">
            <span className="mb-1 block text-[11px] font-medium text-muted">Bio</span>
            <textarea
              value={bio}
              onChange={(event) => setBio(event.target.value)}
              disabled={mutation.isPending}
              className="min-h-20 w-full rounded-md border border-border bg-surface px-2 py-1.5 text-xs font-medium text-primary outline-none transition focus:border-border-strong focus:ring-2 focus:ring-brand/15 disabled:opacity-60"
            />
          </label>
          <CompactToggle
            label="Account enabled"
            checked={accountActive}
            onChange={setAccountActive}
            disabled={mutation.isPending}
          />
          <CompactToggle
            label="Teacher profile active"
            checked={teacherActive}
            onChange={(value) => {
              setTeacherActive(value);
              if (value) setConfirmPause(false);
            }}
            disabled={mutation.isPending}
          />
          {!teacherActive ? (
            <p className="text-xs leading-5 text-muted">
              Pausing this teacher clears permanent 1-on-1 assignments. Confirm before saving.
            </p>
          ) : null}
          {mutation.error ? (
            <p className="text-xs font-medium text-danger">{getErrorMessage(mutation.error)}</p>
          ) : null}
        </div>
      </Modal>
    </>
  );
}

function CopyableInline({ value, label }: { value: string; label: string }) {
  return (
    <span className="inline-flex min-w-0 items-center gap-1.5">
      <span className="truncate text-xs font-medium text-muted">{value}</span>
      <CopyIconButton value={value} label={label} />
    </span>
  );
}

function Overview({
  teacher,
  classes,
  students,
  slots,
  rules,
  loading,
}: {
  teacher: AdminTeacherRead;
  classes: ClassSessionRead[];
  students: number;
  slots: number;
  rules: TeacherAvailabilityRuleRead[];
  loading: boolean;
}) {
  if (loading) return <PanelLoading />;
  const nextClass = classes[0];
  const alerts = [
    !teacher.user.is_active ? "Teacher account is disabled." : null,
    !teacher.teacher.is_active ? "Teacher profile is paused." : null,
    !rules.some((rule) => rule.is_active) ? "No active weekly availability." : null,
    slots === 0 ? "No future available slots." : null,
  ].filter((alert): alert is string => Boolean(alert));
  return (
    <div className="space-y-4">
      <section className="rounded-md border border-border bg-surface p-3">
        <div className="grid gap-2 md:grid-cols-4">
          <Signal
            label="Next class"
            value={nextClass ? formatDateTime(nextClass.starts_at) : "Not scheduled"}
            detail={nextClass ? formatProgram(nextClass.program_type) : "No upcoming class"}
            flag={nextClass ? "Upcoming" : "Check"}
            tone={nextClass ? "brand" : "danger"}
          />
          <Signal label="Assigned students" value={String(students)} detail="Permanent 1-on-1" />
          <Signal
            label="Available slots"
            value={String(slots)}
            detail="Future availability"
            flag={slots === 0 ? "Check" : undefined}
            tone={slots === 0 ? "danger" : "default"}
          />
          <Signal
            label="Weekly rules"
            value={String(rules.filter((rule) => rule.is_active).length)}
            detail="Active recurring rules"
            flag={rules.some((rule) => rule.is_active) ? undefined : "Check"}
            tone={rules.some((rule) => rule.is_active) ? "default" : "danger"}
          />
        </div>
      </section>
      {alerts.length ? (
        <section className="rounded-md border border-border bg-surface px-3 py-2">
          <div className="flex flex-wrap gap-2">
            {alerts.map((alert) => (
              <QuietLabel key={alert} tone="danger">
                {alert}
              </QuietLabel>
            ))}
          </div>
        </section>
      ) : null}
      <DetailPanel title="Upcoming activity">
        {classes.length ? (
          classes.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between gap-3 border-b border-border py-2 last:border-0"
            >
              <p className="text-xs font-medium text-primary">
                {formatProgram(item.program_type)} class
              </p>
              <p className="text-xs text-muted">{formatDateTime(item.starts_at)}</p>
            </div>
          ))
        ) : (
          <p className="text-sm text-muted">No upcoming classes.</p>
        )}
      </DetailPanel>
    </div>
  );
}

function ClassesTab({
  teacherId,
  query,
  selectedClassId,
  onSelect,
  filter,
  program,
  onFilter,
  onProgram,
  onPage,
}: {
  teacherId: string;
  query: ReturnType<typeof useQuery>;
  selectedClassId: string | null;
  onSelect: (id: string) => void;
  filter: ClassFilter;
  program: string;
  onFilter: (value: ClassFilter) => void;
  onProgram: (value: string) => void;
  onPage: (page: number) => void;
}) {
  const data = query.data as
    { items: ClassSessionRead[]; total: number; page: number; page_size: number } | undefined;
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <FilterSelect
          label="When"
          value={filter}
          includeAll={false}
          options={[
            { value: "upcoming", label: "Upcoming" },
            { value: "history", label: "History" },
            { value: "cancelled", label: "Cancelled" },
            { value: "all", label: "All" },
          ]}
          onChange={(value) => onFilter(value as ClassFilter)}
        />
        <FilterSelect
          label="Program"
          value={program}
          options={[
            { value: "one_on_one", label: "1-on-1" },
            { value: "batch", label: "Batch" },
          ]}
          onChange={onProgram}
        />
      </div>
      {query.isLoading ? (
        <PanelLoading />
      ) : query.isError ? (
        <DataTableErrorState
          message="Classes could not be loaded."
          onRetry={() => void query.refetch()}
        />
      ) : data?.items.length ? (
        <div className="overflow-hidden rounded-md border border-border bg-surface">
          <div className="hidden gap-2 border-b border-border bg-surface-subtle/45 px-3 py-2 text-[10px] font-medium uppercase tracking-wide text-muted sm:grid sm:grid-cols-[4.5rem_4.5rem_minmax(0,1fr)_5.5rem_auto] sm:items-center">
            <span>Date</span>
            <span>Time</span>
            <span>Session</span>
            <span>Capacity</span>
            <span className="text-right">Status</span>
          </div>
          {data.items.map((item) => (
            <ClassRow
              key={item.id}
              teacherId={teacherId}
              classSession={item}
              expanded={selectedClassId === item.id}
              onToggle={() => onSelect(item.id)}
            />
          ))}
        </div>
      ) : (
        <DataTableEmptyState message="No classes match these filters." />
      )}
      {data && data.total > data.page_size ? (
        <div className="flex justify-end gap-2">
          <button
            type="button"
            disabled={data.page <= 1}
            onClick={() => onPage(data.page - 1)}
            className="h-8 rounded-md px-2 text-xs text-muted disabled:opacity-40"
          >
            Previous
          </button>
          <span className="pt-2 text-xs text-muted">
            {data.page} / {Math.ceil(data.total / data.page_size)}
          </span>
          <button
            type="button"
            disabled={data.page >= Math.ceil(data.total / data.page_size)}
            onClick={() => onPage(data.page + 1)}
            className="h-8 rounded-md px-2 text-xs text-muted disabled:opacity-40"
          >
            Next
          </button>
        </div>
      ) : null}
    </div>
  );
}

function ClassRow({
  teacherId,
  classSession,
  expanded,
  onToggle,
}: {
  teacherId: string;
  classSession: ClassSessionRead;
  expanded: boolean;
  onToggle: () => void;
}) {
  const date = getClassDateParts(classSession.starts_at);
  const needsAttendance =
    classSession.status === "scheduled" && new Date(classSession.starts_at) <= new Date();
  const context =
    classSession.program_type === "batch"
      ? `Batch${classSession.batch_slot ? ` · ${classSession.batch_slot}` : " session"}`
      : "Permanent 1-on-1";

  return (
    <div className="border-b border-border last:border-b-0">
      <button
        type="button"
        onClick={onToggle}
        className="grid w-full gap-2 px-3 py-2.5 text-left transition hover:bg-surface-subtle sm:grid-cols-[4.5rem_4.5rem_minmax(0,1fr)_5.5rem_auto] sm:items-center"
      >
        <div className="flex items-baseline gap-1.5 sm:block">
          <p className="text-[11px] font-medium text-muted">{date.weekday}</p>
          <p className="text-[13px] font-medium text-primary">{date.date}</p>
        </div>
        <p className="text-xs font-medium text-primary">{formatTime(classSession.starts_at)}</p>
        <div className="min-w-0">
          <p className="truncate text-[13px] font-medium text-primary">
            {classSession.program_type === "one_on_one" ? "1-on-1 session" : "Batch session"}
          </p>
          <p className="truncate text-[11px] text-muted">{context}</p>
        </div>
        <p className="text-xs text-muted">{classSession.capacity} seats</p>
        <span className="flex items-center justify-between gap-2 sm:justify-end">
          <QuietLabel
            tone={
              needsAttendance
                ? "danger"
                : classSession.status === "scheduled"
                  ? "brand"
                  : classSession.status === "completed"
                    ? "default"
                    : "danger"
            }
          >
            {needsAttendance ? "Attendance due" : formatClassStatus(classSession.status)}
          </QuietLabel>
          <ChevronDown
            className={cn("h-3.5 w-3.5 text-muted transition", expanded && "rotate-180")}
          />
        </span>
      </button>
      {expanded ? <ClassDetails teacherId={teacherId} classSession={classSession} /> : null}
    </div>
  );
}

function getClassDateParts(value: string) {
  const date = new Date(value);
  return {
    weekday: new Intl.DateTimeFormat(undefined, { weekday: "short" }).format(date),
    date: new Intl.DateTimeFormat(undefined, { day: "2-digit", month: "short" }).format(date),
  };
}

function ClassDetails({
  teacherId,
  classSession,
}: {
  teacherId: string;
  classSession: ClassSessionRead;
}) {
  const client = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [studentSearch, setStudentSearch] = useState("");
  const [reason, setReason] = useState("");
  const [attendance, setAttendance] = useState<Record<string, "attended" | "missed">>({});
  const bookings = useQuery({
    queryKey: ["admin", "classes", classSession.id, "bookings"],
    queryFn: () => listAdminBookings({ classSessionId: classSession.id, pageSize: 100 }),
  });
  const candidates = useQuery({
    queryKey: ["admin", "students", "class-add", studentSearch],
    queryFn: () =>
      listAdminStudents({ q: studentSearch, status: "active", accessState: "valid", pageSize: 15 }),
    enabled: addOpen && studentSearch.length > 1,
  });
  const studentQueries = useQueries({
    queries: (bookings.data?.items ?? []).map((booking) => ({
      queryKey: ["admin", "students", booking.student_id],
      queryFn: () => getAdminStudent(booking.student_id),
    })),
  });
  const invalidate = () => {
    void client.invalidateQueries({ queryKey: ["admin", "teachers", teacherId] });
    void client.invalidateQueries({ queryKey: ["admin", "classes", classSession.id] });
  };
  const cancelMutation = useMutation({
    mutationFn: () => cancelAdminClassSession({ classSessionId: classSession.id, reason }),
    onSuccess: () => {
      invalidate();
      setCancelOpen(false);
    },
  });
  const attendanceMutation = useMutation({
    mutationFn: () =>
      markAdminClassAttendance({
        classSessionId: classSession.id,
        records: Object.entries(attendance).map(([bookingId, status]) => ({ bookingId, status })),
      }),
    onSuccess: () => {
      invalidate();
      setAttendance({});
    },
  });
  const addMutation = useMutation({
    mutationFn: (studentId: string) =>
      addAdminStudentToClass({ classSessionId: classSession.id, studentId, reason }),
    onSuccess: () => {
      invalidate();
      setAddOpen(false);
      setStudentSearch("");
    },
  });
  const hasStarted = new Date(classSession.starts_at) <= new Date();
  return (
    <div className="space-y-3 border-t border-border bg-surface-subtle/35 px-3 py-3">
      <div className="flex flex-wrap gap-1">
        <button
          type="button"
          onClick={() => setAddOpen(true)}
          disabled={classSession.status !== "scheduled"}
          className="h-7 rounded-md px-2 text-xs font-medium text-brand transition hover:bg-surface disabled:opacity-40"
        >
          Add student
        </button>
        <button
          type="button"
          disabled={!hasStarted || !Object.keys(attendance).length || attendanceMutation.isPending}
          onClick={() => attendanceMutation.mutate()}
          className="h-7 rounded-md px-2 text-xs font-medium text-brand transition hover:bg-surface disabled:opacity-40"
        >
          Save attendance
        </button>
        <button
          type="button"
          disabled={classSession.status !== "scheduled"}
          onClick={() => setCancelOpen(true)}
          className="h-7 rounded-md px-2 text-xs font-medium text-danger hover:bg-rose-50 disabled:opacity-40"
        >
          Cancel class
        </button>
      </div>
      {bookings.isLoading ? (
        <p className="text-xs text-muted">Loading roster…</p>
      ) : bookings.data?.items.length ? (
        <div className="divide-y divide-border rounded-md border border-border bg-surface">
          {bookings.data.items.map((booking, index) => (
            <RosterRow
              key={booking.id}
              booking={booking}
              student={studentQueries[index]?.data}
              attendance={attendance[booking.id]}
              onAttendance={(status) =>
                setAttendance((current) => ({ ...current, [booking.id]: status }))
              }
            />
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted">No students booked.</p>
      )}
      {cancelMutation.error || attendanceMutation.error || addMutation.error ? (
        <p className="text-xs text-danger">
          {getErrorMessage(cancelMutation.error ?? attendanceMutation.error ?? addMutation.error)}
        </p>
      ) : null}
      <Modal
        title="Add student to class"
        isOpen={addOpen}
        onClose={() => setAddOpen(false)}
        size="md"
      >
        <div className="space-y-3">
          <input
            value={studentSearch}
            onChange={(event) => setStudentSearch(event.target.value)}
            placeholder="Search active students"
            className="h-8 w-full rounded-md border border-border bg-background px-2 text-sm text-primary"
          />
          <textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Reason (optional)"
            className="min-h-16 w-full rounded-md border border-border bg-background p-2 text-sm text-primary"
          />
          {candidates.data?.items.map((student) => (
            <button
              key={student.student.id}
              type="button"
              disabled={addMutation.isPending}
              onClick={() => addMutation.mutate(student.student.id)}
              className="flex w-full items-center justify-between rounded-md border border-border px-2 py-2 text-left hover:bg-surface-subtle"
            >
              <span>
                <span className="block text-sm font-medium text-primary">
                  {student.user.full_name}
                </span>
                <span className="text-xs text-muted">{student.user.email}</span>
              </span>
              <Plus className="h-4 w-4 text-brand" />
            </button>
          ))}
        </div>
      </Modal>
      <Modal
        title="Cancel class"
        isOpen={cancelOpen}
        onClose={() => setCancelOpen(false)}
        footer={
          <button
            type="button"
            onClick={() => cancelMutation.mutate()}
            className="h-8 rounded-md bg-danger px-2.5 text-xs font-medium text-white"
          >
            Cancel class
          </button>
        }
      >
        <textarea
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="Reason (optional)"
          className="min-h-20 w-full rounded-md border border-border bg-background p-2 text-sm text-primary"
        />
        <p className="mt-2 text-xs text-muted">All active bookings will be cancelled.</p>
      </Modal>
    </div>
  );
}

function RosterRow({
  booking,
  student,
  attendance,
  onAttendance,
}: {
  booking: { id: string; status: string };
  student?: AdminStudentRead;
  attendance?: "attended" | "missed";
  onAttendance: (status: "attended" | "missed") => void;
}) {
  const notesQuery = useQuery({
    queryKey: ["admin", "bookings", booking.id, "notes"],
    queryFn: () => listAdminBookingNotes({ bookingId: booking.id, pageSize: 5 }),
  });
  const eventsQuery = useQuery({
    queryKey: ["admin", "bookings", booking.id, "events"],
    queryFn: () => listAdminBookingEvents({ bookingId: booking.id, pageSize: 10 }),
  });
  return (
    <div className="px-2 py-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-primary">
            {student?.user.full_name ?? "Loading student…"}
          </p>
          <p className="text-[11px] text-muted">{booking.status}</p>
        </div>
        {booking.status !== "cancelled" ? (
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => onAttendance("attended")}
              className={cn(
                "h-7 rounded px-2 text-xs",
                attendance === "attended"
                  ? "bg-brand/10 text-primary"
                  : "text-muted hover:bg-surface-subtle",
              )}
            >
              Present
            </button>
            <button
              type="button"
              onClick={() => onAttendance("missed")}
              className={cn(
                "h-7 rounded px-2 text-xs",
                attendance === "missed"
                  ? "bg-brand/10 text-primary"
                  : "text-muted hover:bg-surface-subtle",
              )}
            >
              Absent
            </button>
          </div>
        ) : null}
      </div>
      {notesQuery.data?.items.length ? (
        <p className="mt-2 border-t border-border pt-2 text-[11px] text-muted">
          Feedback: {notesQuery.data.items[0].note}
        </p>
      ) : null}
      {eventsQuery.data?.items.length ? (
        <details className="mt-2 border-t border-border pt-2">
          <summary className="cursor-pointer text-[11px] font-medium text-muted">
            Booking history
          </summary>
          <div className="mt-1 space-y-1">
            {eventsQuery.data.items.map((event) => (
              <p key={event.id} className="text-xs text-muted">
                {event.event_type.replaceAll("_", " ")} · {formatDateTime(event.created_at)}
              </p>
            ))}
          </div>
        </details>
      ) : null}
    </div>
  );
}

function StudentsTab({ teacherId }: { teacherId: string }) {
  const query = useQuery({
    queryKey: ["admin", "teachers", teacherId, "assigned-students", "tab"],
    queryFn: () => listAdminStudents({ assignedTeacherId: teacherId, pageSize: 100 }),
  });
  if (query.isLoading) return <PanelLoading />;
  if (query.isError)
    return (
      <DataTableErrorState
        message="Assigned students could not be loaded."
        onRetry={() => void query.refetch()}
      />
    );
  return (
    <DetailPanel title={`${query.data?.total ?? 0} assigned 1-on-1 students`}>
      {query.data?.items.length ? (
        <div className="divide-y divide-border rounded-md border border-border bg-surface">
          {query.data.items.map((student) => (
            <Link
              key={student.student.id}
              to={`/admin/students/${student.student.id}`}
              className="flex items-center justify-between gap-3 px-3 py-2 transition hover:bg-surface-subtle"
            >
              <span className="min-w-0">
                <span className="block truncate text-[13px] font-medium text-primary">
                  {student.user.full_name}
                </span>
                <span className="block truncate text-[11px] text-muted">{student.user.email}</span>
              </span>
              <QuietLabel>{student.student.status}</QuietLabel>
            </Link>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted">No students are permanently assigned to this teacher.</p>
      )}
    </DetailPanel>
  );
}

function AvailabilityTab({
  teacherId,
  view,
  onView,
  rulesQuery,
  slotsQuery,
  slotParams,
  updateParams,
}: {
  teacherId: string;
  view: AvailabilityView;
  onView: (value: AvailabilityView) => void;
  rulesQuery: ReturnType<typeof useQuery>;
  slotsQuery: ReturnType<typeof useQuery>;
  slotParams: URLSearchParams;
  updateParams: (values: Record<string, string | null>) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-1 border-b border-border">
        <button
          type="button"
          onClick={() => onView("rules")}
          className={cn(
            "relative h-8 px-2 text-xs font-medium",
            view === "rules" ? "text-primary" : "text-muted",
          )}
        >
          Weekly rules
          {view === "rules" ? (
            <span className="absolute inset-x-2 bottom-[-1px] h-px bg-brand" />
          ) : null}
        </button>
        <button
          type="button"
          onClick={() => onView("slots")}
          className={cn(
            "relative h-8 px-2 text-xs font-medium",
            view === "slots" ? "text-primary" : "text-muted",
          )}
        >
          Slots & blocks
          {view === "slots" ? (
            <span className="absolute inset-x-2 bottom-[-1px] h-px bg-brand" />
          ) : null}
        </button>
      </div>
      {view === "rules" ? (
        <RulesPanel teacherId={teacherId} query={rulesQuery} />
      ) : (
        <SlotsPanel
          teacherId={teacherId}
          query={slotsQuery}
          params={slotParams}
          updateParams={updateParams}
        />
      )}
    </div>
  );
}

function RulesPanel({
  teacherId,
  query,
}: {
  teacherId: string;
  query: ReturnType<typeof useQuery>;
}) {
  const client = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<TeacherAvailabilityRuleRead | null>(null);
  const [day, setDay] = useState<DayOfWeek>("monday");
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("10:00");
  const [duration, setDuration] = useState("60");
  const invalidate = () =>
    void client.invalidateQueries({
      queryKey: ["admin", "teachers", teacherId, "availability-rules"],
    });
  const mutation = useMutation({
    mutationFn: () => {
      if (start >= end || Number(duration) < 1 || Number(duration) > 240)
        throw new Error("Set a valid time range and duration.");
      const utcStart = localRuleToUtc(day, start);
      const utcEnd = localRuleToUtc(day, end);
      return editing
        ? updateAdminTeacherAvailabilityRule({
            ruleId: editing.id,
            payload: {
              dayOfWeek: utcStart.day,
              startTimeUtc: utcStart.time,
              endTimeUtc: utcEnd.time,
              slotDurationMinutes: Number(duration),
            },
          })
        : createAdminTeacherAvailabilityRule({
            teacherId,
            dayOfWeek: utcStart.day,
            startTimeUtc: utcStart.time,
            endTimeUtc: utcEnd.time,
            slotDurationMinutes: Number(duration),
          });
    },
    onSuccess: () => {
      invalidate();
      setOpen(false);
    },
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteAdminTeacherAvailabilityRule(id),
    onSuccess: invalidate,
  });
  const activeMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      updateAdminTeacherAvailabilityRule({ ruleId: id, payload: { isActive } }),
    onSuccess: invalidate,
  });
  function openNew() {
    setEditing(null);
    setDay("monday");
    setStart("09:00");
    setEnd("10:00");
    setDuration("60");
    setOpen(true);
  }
  function edit(rule: TeacherAvailabilityRuleRead) {
    const local = utcRuleToLocal(rule.day_of_week, rule.start_time_utc);
    const localEnd = utcRuleToLocal(rule.day_of_week, rule.end_time_utc);
    setEditing(rule);
    setDay(local.day);
    setStart(local.time);
    setEnd(localEnd.time);
    setDuration(String(rule.slot_duration_minutes));
    setOpen(true);
  }
  const items = (query.data as { items: TeacherAvailabilityRuleRead[] } | undefined)?.items ?? [];
  return (
    <DetailPanel
      title="Recurring weekly availability"
      action={
        <button
          type="button"
          onClick={openNew}
          className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-xs font-medium text-brand transition hover:bg-surface-subtle"
        >
          <Plus className="h-3 w-3" />
          Add rule
        </button>
      }
    >
      {query.isLoading ? (
        <PanelLoading />
      ) : query.isError ? (
        <DataTableErrorState
          message="Availability rules could not be loaded."
          onRetry={() => void query.refetch()}
        />
      ) : items.length ? (
        <div className="space-y-3">
          <div className="grid gap-2 sm:grid-cols-3">
            <AvailabilitySignal
              label="Active rules"
              value={String(items.filter((rule) => rule.is_active).length)}
              detail="Generating capacity"
            />
            <AvailabilitySignal
              label="Paused rules"
              value={String(items.filter((rule) => !rule.is_active).length)}
              detail="Not generating slots"
              tone={items.some((rule) => !rule.is_active) ? "danger" : "default"}
            />
            <AvailabilitySignal
              label="Display timezone"
              value={browserTimeZone()}
              detail="Rules are stored in UTC"
            />
          </div>
          <div className="overflow-hidden rounded-md border border-border bg-surface">
            <div className="hidden grid-cols-[5.5rem_minmax(0,1fr)_5.5rem_4.75rem_auto] gap-2 border-b border-border bg-surface-subtle/45 px-3 py-2 text-[10px] font-medium uppercase tracking-wide text-muted sm:grid sm:items-center">
              <span>Day</span>
              <span>Window</span>
              <span>Duration</span>
              <span>State</span>
              <span className="text-right">Actions</span>
            </div>
            {[...items]
              .sort(
                (a, b) =>
                  weekdays.findIndex((item) => item.value === a.day_of_week) -
                  weekdays.findIndex((item) => item.value === b.day_of_week),
              )
              .map((rule) => {
                const local = utcRuleToLocal(rule.day_of_week, rule.start_time_utc);
                const localEnd = utcRuleToLocal(rule.day_of_week, rule.end_time_utc);
                return (
                  <div
                    key={rule.id}
                    className="grid gap-2 border-b border-border px-3 py-2.5 last:border-b-0 sm:grid-cols-[5.5rem_minmax(0,1fr)_5.5rem_4.75rem_auto] sm:items-center"
                  >
                    <p className="text-[13px] font-medium text-primary">
                      {weekdays.find((item) => item.value === local.day)?.label}
                    </p>
                    <p className="text-xs text-primary">
                      {local.time} – {localEnd.time}
                    </p>
                    <p className="text-xs text-muted">{rule.slot_duration_minutes} min</p>
                    <QuietLabel tone={rule.is_active ? "default" : "danger"}>
                      {rule.is_active ? "Active" : "Paused"}
                    </QuietLabel>
                    <div className="flex items-center gap-1 sm:justify-end">
                      <button
                        type="button"
                        onClick={() =>
                          activeMutation.mutate({ id: rule.id, isActive: !rule.is_active })
                        }
                        className="h-7 rounded px-2 text-xs text-brand transition hover:bg-surface-subtle"
                      >
                        {rule.is_active ? "Pause" : "Activate"}
                      </button>
                      <button
                        type="button"
                        onClick={() => edit(rule)}
                        className="h-7 rounded px-2 text-xs text-muted transition hover:bg-surface-subtle"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteMutation.mutate(rule.id)}
                        className="grid h-7 w-7 place-items-center rounded text-danger hover:bg-rose-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      ) : (
        <div className="rounded-md bg-surface-subtle/55 px-3 py-3">
          <p className="text-sm font-medium text-primary">No weekly rules yet</p>
          <p className="mt-1 text-xs text-muted">
            Add a recurring window, then generate future availability from it.
          </p>
        </div>
      )}
      <Modal
        title={editing ? "Edit weekly rule" : "Add weekly rule"}
        isOpen={open}
        onClose={() => setOpen(false)}
        footer={
          <button
            type="button"
            onClick={() => mutation.mutate()}
            className="h-8 rounded-md bg-brand px-2.5 text-xs font-medium text-white"
          >
            Save rule
          </button>
        }
      >
        <div className="grid gap-3">
          <label className="grid gap-1 text-xs text-muted">
            Day
            <select
              value={day}
              onChange={(event) => setDay(event.target.value as DayOfWeek)}
              className="h-8 rounded-md border border-border bg-background px-2 text-sm text-primary"
            >
              {weekdays.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-2">
            <CompactField label="Start" type="time" value={start} onChange={setStart} />
            <CompactField label="End" type="time" value={end} onChange={setEnd} />
          </div>
          <CompactField
            label="Slot duration (minutes)"
            type="number"
            value={duration}
            onChange={setDuration}
          />
          {mutation.error ? (
            <p className="text-xs text-danger">{getErrorMessage(mutation.error)}</p>
          ) : null}
        </div>
      </Modal>
    </DetailPanel>
  );
}

function SlotsPanel({
  teacherId,
  query,
  params,
  updateParams,
}: {
  teacherId: string;
  query: ReturnType<typeof useQuery>;
  params: URLSearchParams;
  updateParams: (values: Record<string, string | null>) => void;
}) {
  const client = useQueryClient();
  const [mode, setMode] = useState<"slot" | "block" | "bulk" | "edit" | null>(null);
  const [editingSlot, setEditingSlot] = useState<TeacherAvailabilitySlotRead | null>(null);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [bulkRows, setBulkRows] = useState<Array<{ id: string; start: string; end: string }>>([]);
  const [days, setDays] = useState("14");
  const invalidate = () => {
    void client.invalidateQueries({
      queryKey: ["admin", "teachers", teacherId, "availability-slots"],
    });
    void client.invalidateQueries({
      queryKey: ["admin", "teachers", teacherId, "availability-slots", "overview"],
    });
  };
  const saveMutation = useMutation<TeacherAvailabilitySlotRead | TeacherAvailabilitySlotRead[]>({
    mutationFn: () => {
      if (mode === "bulk") {
        if (!bulkRows.length) throw new Error("Add at least one slot.");
        return createAdminTeacherAvailabilitySlotsBulk(
          bulkRows.map((row) => {
            if (!row.start || !row.end || row.start >= row.end) {
              throw new Error("Each slot needs an end time after its start time.");
            }
            return {
              teacherId,
              startsAt: localDateTimeToIso(row.start),
              endsAt: localDateTimeToIso(row.end),
            };
          }),
        );
      }
      if (!start || !end || start >= end) throw new Error("Set an end time after the start time.");
      const payload = {
        teacherId,
        startsAt: localDateTimeToIso(start),
        endsAt: localDateTimeToIso(end),
      };
      if (mode === "edit" && editingSlot) {
        return updateAdminTeacherAvailabilitySlot({
          slotId: editingSlot.id,
          startsAt: payload.startsAt,
          endsAt: payload.endsAt,
        });
      }
      return mode === "block"
        ? createAdminTeacherAvailabilityBlock(payload)
        : createAdminTeacherAvailabilitySlot(payload);
    },
    onSuccess: () => {
      invalidate();
      setMode(null);
    },
  });
  const generateMutation = useMutation({
    mutationFn: () => generateAdminTeacherAvailabilitySlots({ teacherId, daysAhead: Number(days) }),
    onSuccess: invalidate,
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteAdminTeacherAvailabilitySlot(id),
    onSuccess: invalidate,
  });
  const slots = (query.data as { items: TeacherAvailabilitySlotRead[] } | undefined)?.items ?? [];
  const slotCounts = {
    available: slots.filter((slot) => slot.status === "available").length,
    booked: slots.filter((slot) => slot.status === "booked").length,
    blocked: slots.filter((slot) => slot.status === "blocked").length,
  };
  return (
    <DetailPanel
      title="Slot queue"
      action={
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => setMode("slot")}
            className="h-7 rounded-md px-2 text-xs font-medium text-brand transition hover:bg-surface-subtle"
          >
            Add slot
          </button>
          <button
            type="button"
            onClick={() => {
              setBulkRows([{ id: crypto.randomUUID(), start: "", end: "" }]);
              setMode("bulk");
            }}
            className="h-7 rounded-md px-2 text-xs font-medium text-muted transition hover:bg-surface-subtle hover:text-primary"
          >
            Bulk add
          </button>
          <button
            type="button"
            onClick={() => setMode("block")}
            className="h-7 rounded-md px-2 text-xs font-medium text-danger transition hover:bg-rose-50"
          >
            Block
          </button>
        </div>
      }
    >
      <div className="space-y-3">
        <section className="flex flex-wrap items-end justify-between gap-3 rounded-md border border-border bg-surface-subtle/45 px-3 py-2.5">
          <div>
            <p className="text-xs font-medium text-primary">Generate from weekly rules</p>
            <p className="mt-1 text-[11px] text-muted">
              Create future available slots from active rules.
            </p>
          </div>
          <div className="flex items-end gap-1.5">
            <label className="block">
              <span className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-muted">
                Days ahead
              </span>
              <input
                value={days}
                onChange={(event) => setDays(event.target.value)}
                min="1"
                max="90"
                type="number"
                className="h-8 w-16 rounded-md border border-border bg-surface px-2 text-xs font-medium text-primary outline-none transition focus:border-border-strong focus:ring-2 focus:ring-brand/15"
              />
            </label>
            <button
              type="button"
              disabled={generateMutation.isPending || Number(days) < 1 || Number(days) > 90}
              onClick={() => generateMutation.mutate()}
              className="inline-flex h-8 items-center gap-1 rounded-md px-2 text-xs font-medium text-brand transition hover:bg-surface disabled:opacity-50"
            >
              <RefreshCw className="h-3 w-3" />
              {generateMutation.isPending ? "Generating…" : "Generate"}
            </button>
          </div>
        </section>
        {generateMutation.data ? (
          <p className="rounded-md bg-surface-subtle/55 px-3 py-2 text-xs text-muted">
            Checked {generateMutation.data.rules_checked}; created{" "}
            {generateMutation.data.slots_created}; cancelled {generateMutation.data.slots_cancelled}
            ; skipped {generateMutation.data.slots_skipped}.
          </p>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <FilterSelect
            label="Range"
            value={params.get("slot_range") ?? "upcoming"}
            includeAll={false}
            options={[
              { value: "upcoming", label: "Upcoming" },
              { value: "history", label: "History" },
              { value: "all", label: "All" },
            ]}
            onChange={(value) => updateParams({ slot_range: value === "upcoming" ? null : value })}
          />
          <FilterSelect
            label="Status"
            value={params.get("slot_status") ?? ""}
            options={[
              { value: "available", label: "Available" },
              { value: "booked", label: "Booked" },
              { value: "blocked", label: "Blocked" },
              { value: "cancelled", label: "Cancelled" },
            ]}
            onChange={(value) => updateParams({ slot_status: value || null })}
          />
          <FilterSelect
            label="Source"
            value={params.get("slot_source") ?? ""}
            options={[
              { value: "rule", label: "Rule" },
              { value: "manual", label: "Manual" },
            ]}
            onChange={(value) => updateParams({ slot_source: value || null })}
          />
        </div>
        {query.isLoading ? (
          <PanelLoading />
        ) : query.isError ? (
          <DataTableErrorState
            message="Slots could not be loaded."
            onRetry={() => void query.refetch()}
          />
        ) : slots.length ? (
          <>
            <div className="grid gap-2 sm:grid-cols-3">
              <AvailabilitySignal
                label="Available"
                value={String(slotCounts.available)}
                detail="In this result"
              />
              <AvailabilitySignal
                label="Booked"
                value={String(slotCounts.booked)}
                detail="Protected from edits"
              />
              <AvailabilitySignal
                label="Blocked"
                value={String(slotCounts.blocked)}
                detail="Unavailable time"
                tone={slotCounts.blocked ? "danger" : "default"}
              />
            </div>
            <div className="overflow-hidden rounded-md border border-border bg-surface">
              <div className="hidden grid-cols-[5rem_6rem_minmax(0,1fr)_5.25rem_auto] gap-2 border-b border-border bg-surface-subtle/45 px-3 py-2 text-[10px] font-medium uppercase tracking-wide text-muted sm:grid sm:items-center">
                <span>Date</span>
                <span>Time</span>
                <span>Source</span>
                <span>Status</span>
                <span className="text-right">Actions</span>
              </div>
              {slots.map((slot) => (
                <div
                  key={slot.id}
                  className="grid gap-2 border-b border-border px-3 py-2.5 last:border-b-0 sm:grid-cols-[5rem_6rem_minmax(0,1fr)_5.25rem_auto] sm:items-center"
                >
                  <div>
                    <p className="text-[11px] font-medium text-muted">
                      {getLocalWeekday(slot.starts_at)}
                    </p>
                    <p className="text-[13px] font-medium text-primary">
                      {formatDate(slot.starts_at)}
                    </p>
                  </div>
                  <p className="text-xs font-medium text-primary">
                    {formatTime(slot.starts_at)} – {formatTime(slot.ends_at)}
                  </p>
                  <div className="min-w-0">
                    <p className="text-xs text-primary">
                      {slot.source === "rule" ? "Weekly rule" : "Manual"}
                    </p>
                    <p className="truncate text-[11px] text-muted">
                      {slot.rule_id ? "Rule-generated" : "Direct exception"}
                    </p>
                  </div>
                  <StatusBadge
                    tone={
                      slot.status === "available"
                        ? "green"
                        : slot.status === "booked"
                          ? "indigo"
                          : slot.status === "blocked"
                            ? "amber"
                            : "rose"
                    }
                  >
                    {formatSlotStatus(slot.status)}
                  </StatusBadge>
                  <div className="flex items-center gap-1 sm:justify-end">
                    <button
                      type="button"
                      disabled={slot.status === "booked"}
                      title={
                        slot.status === "booked" ? "Booked slots cannot be changed." : "Edit slot"
                      }
                      onClick={() => {
                        setEditingSlot(slot);
                        setStart(localInputValue(slot.starts_at));
                        setEnd(localInputValue(slot.ends_at));
                        setMode("edit");
                      }}
                      className="h-7 rounded px-2 text-xs text-muted transition hover:bg-surface-subtle disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      disabled={slot.status === "booked" || deleteMutation.isPending}
                      title={
                        slot.status === "booked"
                          ? "Booked slots cannot be cancelled."
                          : "Cancel slot"
                      }
                      onClick={() => deleteMutation.mutate(slot.id)}
                      className="grid h-7 w-7 place-items-center rounded text-danger transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                    {slot.status === "booked" ? (
                      <span className="text-[10px] text-muted">Protected</span>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p className="text-sm text-muted">No slots match these filters.</p>
        )}
        <Modal
          title={
            mode === "block"
              ? "Block time"
              : mode === "bulk"
                ? "Add manual slots"
                : mode === "edit"
                  ? "Edit slot"
                  : "Add manual slot"
          }
          isOpen={Boolean(mode)}
          onClose={() => setMode(null)}
          footer={
            <button
              type="button"
              onClick={() => saveMutation.mutate()}
              className="h-8 rounded-md bg-brand px-2.5 text-xs font-medium text-white"
            >
              Save
            </button>
          }
        >
          <div className="grid gap-3">
            {mode === "bulk" ? (
              <>
                {bulkRows.map((row) => (
                  <div key={row.id} className="grid grid-cols-[1fr_1fr_auto] gap-2">
                    <input
                      type="datetime-local"
                      value={row.start}
                      onChange={(event) =>
                        setBulkRows((rows) =>
                          rows.map((item) =>
                            item.id === row.id ? { ...item, start: event.target.value } : item,
                          ),
                        )
                      }
                      className="h-8 rounded-md border border-border bg-background px-2 text-xs text-primary"
                    />
                    <input
                      type="datetime-local"
                      value={row.end}
                      onChange={(event) =>
                        setBulkRows((rows) =>
                          rows.map((item) =>
                            item.id === row.id ? { ...item, end: event.target.value } : item,
                          ),
                        )
                      }
                      className="h-8 rounded-md border border-border bg-background px-2 text-xs text-primary"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setBulkRows((rows) => rows.filter((item) => item.id !== row.id))
                      }
                      className="grid h-8 w-8 place-items-center rounded text-danger hover:bg-rose-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() =>
                    setBulkRows((rows) => [
                      ...rows,
                      { id: crypto.randomUUID(), start: "", end: "" },
                    ])
                  }
                  className="h-8 rounded-md border border-border px-2 text-xs font-medium text-primary hover:bg-surface-subtle"
                >
                  Add another slot
                </button>
              </>
            ) : (
              <>
                <CompactField
                  label="Start"
                  type="datetime-local"
                  value={start}
                  onChange={setStart}
                />
                <CompactField label="End" type="datetime-local" value={end} onChange={setEnd} />
              </>
            )}
            {saveMutation.error ? (
              <p className="text-xs text-danger">{getErrorMessage(saveMutation.error)}</p>
            ) : null}
          </div>
        </Modal>
      </div>
    </DetailPanel>
  );
}

function TeacherSummary({ teacher }: { teacher: AdminTeacherRead }) {
  return (
    <aside className="h-fit rounded-md border border-border bg-surface p-4 xl:sticky xl:top-4">
      <h2 className="text-xs font-semibold text-primary">Summary</h2>
      <div className="mt-4 space-y-3">
        <SummaryRow
          label="Profile"
          value={teacher.teacher.is_active ? "Active" : "Paused"}
          tone={teacher.teacher.is_active ? "default" : "danger"}
        />
        <SummaryRow
          label="Account"
          value={teacher.user.is_active ? "Enabled" : "Disabled"}
          tone={teacher.user.is_active ? "default" : "danger"}
        />
        <SummaryRow label="Full name" value={teacher.user.full_name} />
        <SummaryCopyRow label="Email" value={teacher.user.email} />
        <SummaryCopyRow label="Phone" value={teacher.user.phone ?? "-"} />
        <SummaryRow label="Created" value={formatDate(teacher.teacher.created_at)} />
        <SummaryRow label="Timezone" value={browserTimeZone()} />
      </div>
      <div className="mt-4 border-t border-border pt-4">
        <SummaryCopyRow label="Teacher ID" value={teacher.teacher.id} />
        <div className="mt-3">
          <SummaryCopyRow label="User ID" value={teacher.user.id} />
        </div>
      </div>
    </aside>
  );
}
function SummaryRow({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "danger" | "brand";
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[11px] font-medium text-muted">{label}</span>
      <QuietLabel tone={tone}>{value}</QuietLabel>
    </div>
  );
}
function SummaryCopyRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <span className="text-[11px] font-medium text-muted">{label}</span>
        {value !== "-" ? <CopyIconButton value={value} label={label} /> : null}
      </div>
      <p className="mt-1 truncate text-xs font-medium text-primary">{value}</p>
    </div>
  );
}
function Signal({
  label,
  value,
  detail,
  flag,
  tone = "default",
}: {
  label: string;
  value: string;
  detail: string;
  flag?: string;
  tone?: "default" | "danger" | "brand";
}) {
  return (
    <div className="min-w-0 rounded-md bg-surface-subtle/60 px-3 py-2">
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-[11px] font-medium text-muted">{label}</p>
        {flag ? <QuietLabel tone={tone}>{flag}</QuietLabel> : null}
      </div>
      <p className="mt-2 truncate text-sm font-semibold text-primary">{value}</p>
      <p className="mt-1 truncate text-xs text-muted">{detail}</p>
    </div>
  );
}

function AvailabilitySignal({
  label,
  value,
  detail,
  tone = "default",
}: {
  label: string;
  value: string;
  detail: string;
  tone?: "default" | "danger";
}) {
  return (
    <div className="min-w-0 rounded-md bg-surface-subtle/60 px-3 py-2">
      <p className="truncate text-[11px] font-medium text-muted">{label}</p>
      <p
        className={cn(
          "mt-2 truncate text-sm font-semibold",
          tone === "danger" ? "text-danger" : "text-primary",
        )}
      >
        {value}
      </p>
      <p className="mt-1 truncate text-xs text-muted">{detail}</p>
    </div>
  );
}

function getLocalWeekday(value: string) {
  return new Intl.DateTimeFormat(undefined, { weekday: "short" }).format(new Date(value));
}

function PanelLoading() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="h-11 animate-pulse rounded-md bg-surface-subtle" />
      ))}
    </div>
  );
}
function TeacherSkeleton() {
  return (
    <section className="space-y-4">
      <div className="h-8 w-24 animate-pulse rounded bg-surface-subtle" />
      <div className="h-16 animate-pulse rounded-md bg-surface-subtle" />
      <PanelLoading />
    </section>
  );
}
function parseTab(value: string | null): DetailTab {
  return value === "classes" || value === "students" || value === "availability"
    ? value
    : "overview";
}
function parseClassFilter(value: string | null): ClassFilter {
  return value === "history" || value === "cancelled" || value === "all" ? value : "upcoming";
}
function classParams(filter: ClassFilter, now: string) {
  if (filter === "upcoming") return { startsFrom: now, sortOrder: "asc" as const };
  if (filter === "history") return { startsTo: now, sortOrder: "desc" as const };
  if (filter === "cancelled") return { status: "cancelled" as const, sortOrder: "desc" as const };
  return { sortOrder: "desc" as const };
}
function slotParams(teacherId: string, params: URLSearchParams, now: string) {
  const range = params.get("slot_range") ?? "upcoming";
  return {
    teacherId,
    startsFrom: range === "upcoming" ? now : undefined,
    startsTo: range === "history" ? now : undefined,
    status: (params.get("slot_status") || undefined) as AvailabilitySlotStatus | undefined,
    source: (params.get("slot_source") || undefined) as "rule" | "manual" | undefined,
    sortOrder: range === "history" ? ("desc" as const) : ("asc" as const),
    pageSize: 100,
  };
}
