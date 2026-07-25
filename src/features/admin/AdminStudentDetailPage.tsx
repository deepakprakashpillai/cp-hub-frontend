import { type ReactNode, useMemo, useState } from "react";
import {
  useInfiniteQuery,
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { ArrowLeft, CalendarDays, ExternalLink, type LucideIcon, Pencil, Plus } from "lucide-react";
import { Link, useParams, useSearchParams } from "react-router";

import { CopyIconButton } from "@/components/ui/CopyIconButton";
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
  cancelAdminBooking,
  createAdminStudentAccessGrant,
  createAdminStudentPayment,
  deleteAdminStudentPayment,
  getAdminClassSession,
  getAdminStudent,
  listAdminBatchGroups,
  listAdminClassSessions,
  listAdminBookingEvents,
  listAdminBookingNotes,
  listAdminBookings,
  listAdminPackages,
  listAdminStudentAccessGrants,
  listAdminStudentBatchMemberships,
  listAdminStudentPayments,
  listAdminTeachers,
  listStudentProgramChanges,
  listAdminTeacherAvailabilitySlots,
  rescheduleAdminBatchBooking,
  rescheduleAdminOneOnOneBooking,
  setAdminStudentBatchGroup,
  switchAdminStudentProgram,
  updateAdminStudent,
  updateAdminStudentPayment,
  updateAdminUser,
  type AdminStudentAccessGrantRead,
  type AdminStudentPaymentRead,
  type AdminStudentRead,
  type BatchGroupRead,
  type BookingEventRead,
  type BookingNoteRead,
  type BookingRead,
  type BookingStatus,
  type ClassSessionStatus,
  type ClassSessionRead,
  type PackageRead,
  type PaymentMethod,
  type StudentAccessGrantType,
  type StudentBatchMembershipRead,
  type StudentProgramChangeRead,
  type StudentProgramType,
  type StudentStatus,
  type TeacherAvailabilitySlotRead,
} from "@/features/admin/api";
import { cn } from "@/lib/utils";

type StudentDetailTab = "overview" | "classes" | "payments" | "access" | "program";
type StudentClassFilter = "upcoming" | "history" | "cancelled" | "all";

type TabDefinition = {
  value: StudentDetailTab;
  label: string;
};

const tabs: TabDefinition[] = [
  { value: "overview", label: "Overview" },
  { value: "classes", label: "Classes" },
  { value: "payments", label: "Payments" },
  { value: "access", label: "Access" },
  { value: "program", label: "Program" },
];

const classFilters: Array<{ value: StudentClassFilter; label: string }> = [
  { value: "upcoming", label: "Upcoming" },
  { value: "history", label: "History" },
  { value: "cancelled", label: "Cancelled" },
  { value: "all", label: "All" },
];

const paymentMethodOptions: Array<{ value: PaymentMethod; label: string }> = [
  { value: "upi", label: "UPI" },
  { value: "cash", label: "Cash" },
  { value: "bank_transfer", label: "Bank transfer" },
  { value: "other", label: "Other" },
];

const accessGrantTypeOptions: Array<{ value: StudentAccessGrantType; label: string }> = [
  { value: "package", label: "Package" },
  { value: "addon_days", label: "Addon days" },
  { value: "manual_adjustment", label: "Manual" },
];

const programOptions: Array<{ value: StudentProgramType; label: string }> = [
  { value: "one_on_one", label: "1-on-1" },
  { value: "batch", label: "Batch" },
];

const studentStatusOptions: Array<{ value: StudentStatus; label: string }> = [
  { value: "enrolled", label: "Enrolled" },
  { value: "active", label: "Active" },
  { value: "paused", label: "Paused" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
});

const timeFormatter = new Intl.DateTimeFormat(undefined, {
  timeStyle: "short",
});

const ACTIVITY_PAGE_SIZE = 10;
const OVERVIEW_ACTIVITY_FETCH_SIZE = 30;
const CLASSES_PAGE_SIZE = 10;
const RESCHEDULE_TARGET_FETCH_SIZE = 50;
const RESCHEDULE_LOOKAHEAD_DAYS = 90;

export function AdminStudentDetailPage() {
  const { studentId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = parseTab(searchParams.get("tab"));
  const classFilter = parseClassFilter(searchParams.get("classes"));
  const expandedBookingId = searchParams.get("booking");
  const overviewNow = useMemo(() => new Date().toISOString(), []);

  const studentQuery = useQuery({
    queryKey: ["admin", "students", studentId],
    queryFn: () => getAdminStudent(studentId ?? ""),
    enabled: Boolean(studentId),
  });

  const overviewEnabled = Boolean(studentId) && activeTab === "overview";
  const classesEnabled = Boolean(studentId) && activeTab === "classes";

  const upcomingBookingsQuery = useQuery({
    queryKey: ["admin", "students", studentId, "detail-upcoming-bookings", overviewNow],
    queryFn: () =>
      listAdminBookings({
        studentId: studentId ?? "",
        status: "booked",
        startsFrom: overviewNow,
        pageSize: OVERVIEW_ACTIVITY_FETCH_SIZE,
      }),
    enabled: overviewEnabled,
  });

  const recentBookingsQuery = useQuery({
    queryKey: ["admin", "students", studentId, "detail-recent-bookings", overviewNow],
    queryFn: () =>
      listAdminBookings({
        studentId: studentId ?? "",
        startsTo: overviewNow,
        pageSize: OVERVIEW_ACTIVITY_FETCH_SIZE,
      }),
    enabled: overviewEnabled,
  });

  const paymentQuery = useQuery({
    queryKey: ["admin", "students", studentId, "payments", "overview"],
    queryFn: () =>
      listAdminStudentPayments({
        studentId: studentId ?? "",
        pageSize: OVERVIEW_ACTIVITY_FETCH_SIZE,
      }),
    enabled: overviewEnabled,
  });

  const accessGrantQuery = useQuery({
    queryKey: ["admin", "students", studentId, "access-grants", "overview"],
    queryFn: () =>
      listAdminStudentAccessGrants({
        studentId: studentId ?? "",
        pageSize: OVERVIEW_ACTIVITY_FETCH_SIZE,
      }),
    enabled: overviewEnabled,
  });

  const upcomingClassQueries = useQueries({
    queries: (upcomingBookingsQuery.data?.items ?? []).map((booking) => ({
      queryKey: ["admin", "classes", booking.class_session_id],
      queryFn: () => getAdminClassSession(booking.class_session_id),
      enabled: overviewEnabled,
    })),
  });

  const recentClassQueries = useQueries({
    queries: (recentBookingsQuery.data?.items ?? []).map((booking) => ({
      queryKey: ["admin", "classes", booking.class_session_id],
      queryFn: () => getAdminClassSession(booking.class_session_id),
      enabled: overviewEnabled,
    })),
  });

  const classBookingsQuery = useInfiniteQuery({
    queryKey: ["admin", "students", studentId, "classes-tab", classFilter, overviewNow],
    queryFn: ({ pageParam }) =>
      listAdminBookings({
        ...getClassBookingParams(classFilter, overviewNow),
        studentId: studentId ?? "",
        page: pageParam,
        pageSize: CLASSES_PAGE_SIZE,
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage, pages) => {
      const loadedCount = pages.reduce((count, page) => count + page.items.length, 0);
      return loadedCount < lastPage.total ? pages.length + 1 : undefined;
    },
    enabled: classesEnabled,
  });
  const classBookings = classBookingsQuery.data?.pages.flatMap((page) => page.items) ?? [];

  const classSessionQueries = useQueries({
    queries: classBookings.map((booking) => ({
      queryKey: ["admin", "classes", booking.class_session_id],
      queryFn: () => getAdminClassSession(booking.class_session_id),
      enabled: classesEnabled,
    })),
  });

  const overviewData: StudentOverviewData = {
    upcomingBookings: upcomingBookingsQuery.data?.items ?? [],
    upcomingClasses: upcomingClassQueries.map((query) => query.data),
    recentBookings: recentBookingsQuery.data?.items ?? [],
    recentClasses: recentClassQueries.map((query) => query.data),
    payments: paymentQuery.data?.items ?? [],
    accessGrants: accessGrantQuery.data?.items ?? [],
    isLoading:
      upcomingBookingsQuery.isLoading ||
      recentBookingsQuery.isLoading ||
      paymentQuery.isLoading ||
      accessGrantQuery.isLoading ||
      upcomingClassQueries.some((query) => query.isLoading) ||
      recentClassQueries.some((query) => query.isLoading),
    isError:
      upcomingBookingsQuery.isError ||
      recentBookingsQuery.isError ||
      paymentQuery.isError ||
      accessGrantQuery.isError ||
      upcomingClassQueries.some((query) => query.isError) ||
      recentClassQueries.some((query) => query.isError),
  };

  const classesData: StudentClassesData = {
    bookings: classBookings,
    classSessions: classSessionQueries.map((query) => query.data),
    total: classBookingsQuery.data?.pages[0]?.total ?? 0,
    hasMore: classBookingsQuery.hasNextPage,
    isLoadingMore: classBookingsQuery.isFetchingNextPage,
    isLoading: classBookingsQuery.isLoading || classSessionQueries.some((query) => query.isLoading),
    isError: classBookingsQuery.isError || classSessionQueries.some((query) => query.isError),
    onLoadMore: () => {
      void classBookingsQuery.fetchNextPage();
    },
  };

  function selectTab(tab: StudentDetailTab) {
    const next = new URLSearchParams(searchParams);
    if (tab === "overview") {
      next.delete("tab");
    } else {
      next.set("tab", tab);
    }
    setSearchParams(next, { replace: true });
  }

  function selectClassFilter(nextFilter: StudentClassFilter) {
    const next = new URLSearchParams(searchParams);
    next.set("tab", "classes");
    if (nextFilter === "upcoming") {
      next.delete("classes");
    } else {
      next.set("classes", nextFilter);
    }
    next.delete("booking");
    setSearchParams(next, { replace: true });
  }

  function selectExpandedBooking(bookingId: string) {
    const next = new URLSearchParams(searchParams);
    next.set("tab", "classes");
    if (expandedBookingId === bookingId) {
      next.delete("booking");
    } else {
      next.set("booking", bookingId);
    }
    setSearchParams(next, { replace: true });
  }

  return (
    <section className="space-y-4">
      <Link
        to="/admin/students"
        className="inline-flex h-8 items-center gap-2 rounded-md px-2 text-xs font-medium text-muted transition hover:bg-surface-subtle hover:text-primary"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
        Students
      </Link>

      {studentQuery.isLoading ? (
        <StudentDetailSkeleton />
      ) : studentQuery.isError ? (
        <div className="rounded-md border border-border bg-surface p-4">
          <p className="text-sm font-medium text-danger">Student could not be loaded.</p>
        </div>
      ) : studentQuery.data ? (
        <>
          <StudentHeader student={studentQuery.data} />

          <div className="-mt-2 grid gap-x-4 gap-y-3 xl:grid-cols-[minmax(0,1fr)_18rem]">
            <main className="min-w-0 space-y-4">
              <nav className="flex flex-wrap gap-1 border-b border-border">
                {tabs.map((tab) => (
                  <button
                    key={tab.value}
                    type="button"
                    className={cn(
                      "relative h-9 px-2 text-xs font-medium transition",
                      activeTab === tab.value ? "text-primary" : "text-muted hover:text-primary",
                    )}
                    onClick={() => selectTab(tab.value)}
                  >
                    {tab.label}
                    {activeTab === tab.value ? (
                      <span className="absolute inset-x-2 bottom-[-1px] h-px bg-brand" />
                    ) : null}
                  </button>
                ))}
              </nav>

              <StudentTabMock
                tab={activeTab}
                student={studentQuery.data}
                overview={overviewData}
                classes={classesData}
                classFilter={classFilter}
                expandedBookingId={expandedBookingId}
                onClassFilterChange={selectClassFilter}
                onExpandedBookingChange={selectExpandedBooking}
              />
            </main>

            <StudentSideSummary student={studentQuery.data} />
          </div>
        </>
      ) : null}
    </section>
  );
}

function StudentHeader({ student }: { student: AdminStudentRead }) {
  const queryClient = useQueryClient();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [fullName, setFullName] = useState(student.user.full_name);
  const [email, setEmail] = useState(student.user.email);
  const [phone, setPhone] = useState(student.user.phone ?? "");
  const [status, setStatus] = useState<StudentStatus>(student.student.status);
  const [isAccountEnabled, setIsAccountEnabled] = useState(student.user.is_active);
  const [notes, setNotes] = useState(student.student.notes ?? "");

  const editValidationError = validateStudentEditForm({ fullName, email });
  const editStudentMutation = useMutation({
    mutationFn: async () => {
      if (editValidationError) {
        throw new Error(editValidationError);
      }

      await updateAdminUser({
        userId: student.user.id,
        payload: {
          full_name: fullName,
          email,
          phone,
          is_active: isAccountEnabled,
        },
      });

      return updateAdminStudent({
        studentId: student.student.id,
        payload: {
          status,
          notes: notes.trim() || null,
        },
      });
    },
    onSuccess: () => {
      setIsEditOpen(false);
      void queryClient.invalidateQueries({ queryKey: ["admin", "students", student.student.id] });
      void queryClient.invalidateQueries({ queryKey: ["admin", "students"] });
    },
  });

  function resetEditForm() {
    setFullName(student.user.full_name);
    setEmail(student.user.email);
    setPhone(student.user.phone ?? "");
    setStatus(student.student.status);
    setIsAccountEnabled(student.user.is_active);
    setNotes(student.student.notes ?? "");
    editStudentMutation.reset();
  }

  return (
    <header className="pb-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="truncate text-xl font-semibold leading-tight text-primary">
              {student.user.full_name}
            </h1>
            <StudentStatusBadge value={student.student.status} />
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
            <CopyableInline value={student.user.email} label="email" />
            {student.user.phone ? (
              <CopyableInline value={student.user.phone} label="phone" />
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <HeaderAction
            icon={Pencil}
            label="Edit"
            onClick={() => {
              resetEditForm();
              setIsEditOpen(true);
            }}
          />
        </div>
      </div>

      <Modal
        title="Edit student"
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        footer={
          <>
            <CompactTextButton
              label="Close"
              onClick={() => setIsEditOpen(false)}
              disabled={editStudentMutation.isPending}
            />
            <CompactTextButton
              label={editStudentMutation.isPending ? "Saving..." : "Save"}
              tone="brand"
              onClick={() => editStudentMutation.mutate()}
              disabled={editStudentMutation.isPending || Boolean(editValidationError)}
            />
          </>
        }
      >
        <div className="space-y-2.5">
          <CompactField
            label="Name"
            value={fullName}
            onChange={setFullName}
            disabled={editStudentMutation.isPending}
          />
          <CompactField
            label="Email"
            type="email"
            value={email}
            onChange={setEmail}
            disabled={editStudentMutation.isPending}
          />
          <CompactField
            label="Phone"
            value={phone}
            onChange={setPhone}
            placeholder="Optional"
            disabled={editStudentMutation.isPending}
          />
          <FilterSelect
            label="Student"
            value={status}
            includeAll={false}
            options={studentStatusOptions}
            onChange={(value) => setStatus(value as StudentStatus)}
            disabled={editStudentMutation.isPending}
            className="w-full"
            triggerClassName="w-full"
          />
          <CompactToggle
            checked={isAccountEnabled}
            onChange={setIsAccountEnabled}
            label="Account enabled"
            disabled={editStudentMutation.isPending}
          />
          <CompactField
            label="Notes"
            value={notes}
            onChange={setNotes}
            placeholder="Optional"
            disabled={editStudentMutation.isPending}
          />
          {editValidationError ? (
            <p className="text-xs font-medium text-danger">{editValidationError}</p>
          ) : null}
          <ActionError error={editStudentMutation.error} />
        </div>
      </Modal>
    </header>
  );
}

type StudentOverviewData = {
  upcomingBookings: BookingRead[];
  upcomingClasses: Array<ClassSessionRead | undefined>;
  recentBookings: BookingRead[];
  recentClasses: Array<ClassSessionRead | undefined>;
  payments: AdminStudentPaymentRead[];
  accessGrants: AdminStudentAccessGrantRead[];
  isLoading: boolean;
  isError: boolean;
};

type StudentClassesData = {
  bookings: BookingRead[];
  classSessions: Array<ClassSessionRead | undefined>;
  total: number;
  hasMore: boolean;
  isLoadingMore: boolean;
  isLoading: boolean;
  isError: boolean;
  onLoadMore: () => void;
};

function StudentTabMock({
  tab,
  student,
  overview,
  classes,
  classFilter,
  expandedBookingId,
  onClassFilterChange,
  onExpandedBookingChange,
}: {
  tab: StudentDetailTab;
  student: AdminStudentRead;
  overview: StudentOverviewData;
  classes: StudentClassesData;
  classFilter: StudentClassFilter;
  expandedBookingId: string | null;
  onClassFilterChange: (filter: StudentClassFilter) => void;
  onExpandedBookingChange: (bookingId: string) => void;
}) {
  if (tab === "classes") {
    return (
      <StudentClassesTab
        student={student}
        classes={classes}
        filter={classFilter}
        expandedBookingId={expandedBookingId}
        onFilterChange={onClassFilterChange}
        onExpandedBookingChange={onExpandedBookingChange}
      />
    );
  }

  if (tab === "payments") {
    return <StudentPaymentsTab student={student} />;
  }

  if (tab === "access") {
    return <StudentAccessTab student={student} />;
  }

  if (tab === "program") {
    return <StudentProgramTab student={student} />;
  }

  return <StudentOverviewBriefing student={student} overview={overview} />;
}

function StudentPaymentsTab({ student }: { student: AdminStudentRead }) {
  const queryClient = useQueryClient();
  const [isRecordOpen, setIsRecordOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<AdminStudentPaymentRead | null>(null);
  const [deletingPayment, setDeletingPayment] = useState<AdminStudentPaymentRead | null>(null);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("upi");
  const [paidAt, setPaidAt] = useState(() => getLocalDateTimeInputValue(new Date()));
  const [packageId, setPackageId] = useState("");
  const [notes, setNotes] = useState("");

  const paymentsQuery = useQuery({
    queryKey: ["admin", "students", student.student.id, "payments", "tab"],
    queryFn: () => listAdminStudentPayments({ studentId: student.student.id, pageSize: 50 }),
  });

  const packagesQuery = useQuery({
    queryKey: ["admin", "packages", "lookup"],
    queryFn: () => listAdminPackages({ pageSize: 100 }),
  });

  const paymentValidationError = validatePaymentForm({ amount, paidAt });
  const savePaymentMutation = useMutation({
    mutationFn: () => {
      if (paymentValidationError) {
        throw new Error(paymentValidationError);
      }

      const payload = {
        amountPaid: toMinorCurrencyUnit(amount),
        paymentMethod: method,
        paidAt: localDateTimeInputToIso(paidAt),
        packageId,
        notes,
      };

      if (editingPayment) {
        return updateAdminStudentPayment({
          studentId: student.student.id,
          paymentId: editingPayment.id,
          payload,
        });
      }

      return createAdminStudentPayment({
        studentId: student.student.id,
        payload,
      });
    },
    onSuccess: () => {
      resetPaymentForm();
      setIsRecordOpen(false);
      void queryClient.invalidateQueries({
        queryKey: ["admin", "students", student.student.id, "payments"],
      });
      void queryClient.invalidateQueries({ queryKey: ["admin", "students", student.student.id] });
    },
  });

  const deletePaymentMutation = useMutation({
    mutationFn: () => {
      if (!deletingPayment) {
        throw new Error("Choose a payment first");
      }

      return deleteAdminStudentPayment({
        studentId: student.student.id,
        paymentId: deletingPayment.id,
      });
    },
    onSuccess: () => {
      setDeletingPayment(null);
      void queryClient.invalidateQueries({
        queryKey: ["admin", "students", student.student.id, "payments"],
      });
      void queryClient.invalidateQueries({ queryKey: ["admin", "students", student.student.id] });
    },
  });

  const payments = (paymentsQuery.data?.items ?? []).sort(
    (left, right) => new Date(right.paid_at).getTime() - new Date(left.paid_at).getTime(),
  );
  const packageMap = createPackageMap(packagesQuery.data?.items ?? []);
  const finance = createFinanceBriefing(payments);
  const paymentError = getMutationErrorMessage(savePaymentMutation.error);
  const deletePaymentError = getMutationErrorMessage(deletePaymentMutation.error);

  function resetPaymentForm() {
    setEditingPayment(null);
    setAmount("");
    setMethod("upi");
    setPaidAt(getLocalDateTimeInputValue(new Date()));
    setPackageId("");
    setNotes("");
    savePaymentMutation.reset();
    deletePaymentMutation.reset();
  }

  function openEditPayment(payment: AdminStudentPaymentRead) {
    setEditingPayment(payment);
    setAmount(formatMinorCurrencyInput(payment.amount_paid));
    setMethod(payment.payment_method);
    setPaidAt(getLocalDateTimeInputValue(new Date(payment.paid_at)));
    setPackageId(payment.package_id ?? "");
    setNotes(payment.notes ?? "");
    savePaymentMutation.reset();
    setIsRecordOpen(true);
  }

  return (
    <DetailPanel
      title="Payments"
      action={
        <TabActionButton
          icon={Plus}
          label="Record payment"
          onClick={() => {
            resetPaymentForm();
            setIsRecordOpen(true);
          }}
        />
      }
    >
      <div className="space-y-4">
        {paymentsQuery.isLoading ? (
          <PanelLoadingRows />
        ) : paymentsQuery.isError ? (
          <p className="text-xs font-medium text-danger">Payments could not be loaded.</p>
        ) : (
          <>
            <FinanceBriefingRow finance={finance} />
            {payments.length > 0 ? (
              <div className="divide-y divide-border rounded-md border border-border">
                {payments.map((payment) => (
                  <PaymentHistoryRow
                    key={payment.id}
                    payment={payment}
                    packageLabel={getPaymentPackageLabel(payment.package_id, packageMap)}
                    onEdit={() => openEditPayment(payment)}
                    onDelete={() => {
                      deletePaymentMutation.reset();
                      setDeletingPayment(payment);
                    }}
                  />
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted">No payments recorded</p>
            )}
          </>
        )}
      </div>

      <Modal
        title={editingPayment ? "Edit payment" : "Record payment"}
        isOpen={isRecordOpen}
        onClose={() => setIsRecordOpen(false)}
        footer={
          <>
            <CompactTextButton
              label="Close"
              onClick={() => setIsRecordOpen(false)}
              disabled={savePaymentMutation.isPending}
            />
            <CompactTextButton
              label={savePaymentMutation.isPending ? "Saving..." : "Save"}
              tone="brand"
              onClick={() => savePaymentMutation.mutate()}
              disabled={savePaymentMutation.isPending || Boolean(paymentValidationError)}
            />
          </>
        }
      >
        <div className="space-y-2.5">
          <CompactField
            label="Amount"
            type="number"
            min="0"
            step="0.01"
            value={amount}
            onChange={setAmount}
            placeholder="0"
            disabled={savePaymentMutation.isPending}
          />
          <FilterSelect
            label="Method"
            value={method}
            includeAll={false}
            options={paymentMethodOptions}
            onChange={(value) => setMethod(value as PaymentMethod)}
            disabled={savePaymentMutation.isPending}
            className="w-full"
            triggerClassName="w-full"
          />
          <CompactField
            label="Paid at"
            type="datetime-local"
            value={paidAt}
            onChange={setPaidAt}
            disabled={savePaymentMutation.isPending}
          />
          <FilterSelect
            label="Package"
            value={packageId}
            options={createPackageOptions(packagesQuery.data?.items ?? [])}
            onChange={setPackageId}
            allLabel="Optional package"
            disabled={savePaymentMutation.isPending}
            className="w-full"
            triggerClassName="w-full"
          />
          <CompactField
            label="Notes"
            value={notes}
            onChange={setNotes}
            placeholder="Optional"
            disabled={savePaymentMutation.isPending}
          />
          {paymentValidationError ? (
            <p className="text-xs font-medium text-danger">{paymentValidationError}</p>
          ) : null}
          {paymentError ? <p className="text-xs font-medium text-danger">{paymentError}</p> : null}
        </div>
      </Modal>

      <Modal
        title="Delete payment"
        isOpen={Boolean(deletingPayment)}
        onClose={() => setDeletingPayment(null)}
        footer={
          <>
            <CompactTextButton
              label="Keep"
              onClick={() => setDeletingPayment(null)}
              disabled={deletePaymentMutation.isPending}
            />
            <CompactTextButton
              label={deletePaymentMutation.isPending ? "Deleting..." : "Delete"}
              tone="danger"
              onClick={() => deletePaymentMutation.mutate()}
              disabled={deletePaymentMutation.isPending}
            />
          </>
        }
      >
        <div className="space-y-2.5">
          <p className="text-xs leading-5 text-muted">
            This removes the payment record only. Access is managed separately.
          </p>
          {deletingPayment ? (
            <p className="text-xs font-semibold text-primary">
              {formatCurrencyMinor(deletingPayment.amount_paid, deletingPayment.currency)} ·{" "}
              {formatCompactDate(deletingPayment.paid_at)}
            </p>
          ) : null}
          {deletePaymentError ? (
            <p className="text-xs font-medium text-danger">{deletePaymentError}</p>
          ) : null}
        </div>
      </Modal>
    </DetailPanel>
  );
}

function StudentAccessTab({ student }: { student: AdminStudentRead }) {
  const queryClient = useQueryClient();
  const [isGrantOpen, setIsGrantOpen] = useState(false);
  const [grantType, setGrantType] = useState<StudentAccessGrantType>("package");
  const [durationDays, setDurationDays] = useState("");
  const [accessStartsAt, setAccessStartsAt] = useState("");
  const [extendCurrentAccess, setExtendCurrentAccess] = useState(true);
  const [packageId, setPackageId] = useState("");
  const [notes, setNotes] = useState("");

  const accessGrantQuery = useQuery({
    queryKey: ["admin", "students", student.student.id, "access-grants", "tab"],
    queryFn: () => listAdminStudentAccessGrants({ studentId: student.student.id, pageSize: 50 }),
  });

  const packagesQuery = useQuery({
    queryKey: ["admin", "packages", "lookup"],
    queryFn: () => listAdminPackages({ pageSize: 100 }),
  });

  const accessValidationError = validateAccessGrantForm({ grantType, packageId, durationDays });
  const addAccessMutation = useMutation({
    mutationFn: () => {
      if (accessValidationError) {
        throw new Error(accessValidationError);
      }

      return createAdminStudentAccessGrant({
        studentId: student.student.id,
        payload: {
          grantType,
          durationDays: durationDays ? Number(durationDays) : null,
          accessStartsAt: accessStartsAt ? localDateTimeInputToIso(accessStartsAt) : null,
          extendCurrentAccess,
          packageId,
          notes,
        },
      });
    },
    onSuccess: () => {
      resetAccessForm();
      setIsGrantOpen(false);
      void queryClient.invalidateQueries({
        queryKey: ["admin", "students", student.student.id, "access-grants"],
      });
      void queryClient.invalidateQueries({ queryKey: ["admin", "students", student.student.id] });
    },
  });

  const grants = (accessGrantQuery.data?.items ?? []).sort(
    (left, right) =>
      new Date(right.access_starts_at).getTime() - new Date(left.access_starts_at).getTime(),
  );
  const packageMap = createPackageMap(packagesQuery.data?.items ?? []);
  const accessError = getMutationErrorMessage(addAccessMutation.error);

  function resetAccessForm() {
    setGrantType("package");
    setDurationDays("");
    setAccessStartsAt("");
    setExtendCurrentAccess(true);
    setPackageId("");
    setNotes("");
    addAccessMutation.reset();
  }

  return (
    <DetailPanel
      title="Access"
      action={
        <TabActionButton
          icon={Plus}
          label="Add access"
          onClick={() => {
            resetAccessForm();
            setIsGrantOpen(true);
          }}
        />
      }
    >
      <div className="space-y-4">
        <CurrentAccessCard student={student.student} />
        {accessGrantQuery.isLoading ? (
          <PanelLoadingRows />
        ) : accessGrantQuery.isError ? (
          <p className="text-xs font-medium text-danger">Access grants could not be loaded.</p>
        ) : grants.length > 0 ? (
          <div className="divide-y divide-border rounded-md border border-border">
            {grants.map((grant) => (
              <AccessGrantHistoryRow
                key={grant.id}
                grant={grant}
                packageLabel={getAccessGrantPackageLabel(grant, packageMap)}
              />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted">No access grants</p>
        )}
      </div>

      <Modal
        title="Add access"
        isOpen={isGrantOpen}
        onClose={() => setIsGrantOpen(false)}
        footer={
          <>
            <CompactTextButton
              label="Close"
              onClick={() => setIsGrantOpen(false)}
              disabled={addAccessMutation.isPending}
            />
            <CompactTextButton
              label={addAccessMutation.isPending ? "Saving..." : "Save"}
              tone="brand"
              onClick={() => addAccessMutation.mutate()}
              disabled={addAccessMutation.isPending || Boolean(accessValidationError)}
            />
          </>
        }
      >
        <div className="space-y-2.5">
          <FilterSelect
            label="Type"
            value={grantType}
            includeAll={false}
            options={accessGrantTypeOptions}
            onChange={(value) => setGrantType(value as StudentAccessGrantType)}
            disabled={addAccessMutation.isPending}
            className="w-full"
            triggerClassName="w-full"
          />
          <FilterSelect
            label="Package"
            value={packageId}
            options={createPackageOptions(packagesQuery.data?.items ?? [])}
            onChange={setPackageId}
            allLabel="Optional package"
            disabled={addAccessMutation.isPending}
            className="w-full"
            triggerClassName="w-full"
          />
          <CompactField
            label="Days"
            type="number"
            min="1"
            step="1"
            value={durationDays}
            onChange={setDurationDays}
            placeholder="Package default"
            disabled={addAccessMutation.isPending}
          />
          <CompactField
            label="Starts"
            type="datetime-local"
            value={accessStartsAt}
            onChange={setAccessStartsAt}
            disabled={addAccessMutation.isPending}
          />
          <CompactToggle
            checked={extendCurrentAccess}
            onChange={setExtendCurrentAccess}
            label="Extend current access"
            disabled={addAccessMutation.isPending}
          />
          <CompactField
            label="Notes"
            value={notes}
            onChange={setNotes}
            placeholder="Optional"
            disabled={addAccessMutation.isPending}
          />
          {accessValidationError ? (
            <p className="text-xs font-medium text-danger">{accessValidationError}</p>
          ) : null}
          {accessError ? <p className="text-xs font-medium text-danger">{accessError}</p> : null}
        </div>
      </Modal>
    </DetailPanel>
  );
}

function StudentProgramTab({ student }: { student: AdminStudentRead }) {
  const queryClient = useQueryClient();
  const [switchOpen, setSwitchOpen] = useState(false);
  const [batchOpen, setBatchOpen] = useState(false);
  const [teacherOpen, setTeacherOpen] = useState(false);
  const [nextProgram, setNextProgram] = useState<StudentProgramType>(
    student.student.program_type === "one_on_one" ? "batch" : "one_on_one",
  );
  const [reason, setReason] = useState("");
  const [batchGroupId, setBatchGroupId] = useState("");
  const [teacherId, setTeacherId] = useState(student.student.assigned_teacher_id ?? "");

  const membershipsQuery = useQuery({
    queryKey: ["admin", "students", student.student.id, "batch-memberships", "tab"],
    queryFn: () =>
      listAdminStudentBatchMemberships({ studentId: student.student.id, pageSize: 50 }),
  });

  const batchGroupsQuery = useQuery({
    queryKey: ["admin", "batch-groups", "lookup"],
    queryFn: () => listAdminBatchGroups({ pageSize: 100 }),
  });

  const teachersQuery = useQuery({
    queryKey: ["admin", "teachers", "active-lookup"],
    queryFn: () => listAdminTeachers({ isActive: true, pageSize: 100 }),
  });

  const programChangesQuery = useQuery({
    queryKey: ["students", student.student.id, "program-changes"],
    queryFn: () => listStudentProgramChanges({ studentId: student.student.id, pageSize: 50 }),
  });

  const switchValidationError =
    nextProgram === student.student.program_type ? "Choose a different program" : null;
  const batchValidationError = batchOpen && !batchGroupId ? "Choose a batch" : null;
  const switchProgramMutation = useMutation({
    mutationFn: () => {
      if (switchValidationError) {
        throw new Error(switchValidationError);
      }

      return switchAdminStudentProgram({
        studentId: student.student.id,
        payload: {
          newProgramType: nextProgram,
          reason,
        },
      });
    },
    onSuccess: () => {
      setSwitchOpen(false);
      setReason("");
      void queryClient.invalidateQueries({ queryKey: ["admin"] });
      void queryClient.invalidateQueries({ queryKey: ["students", student.student.id] });
    },
  });

  const moveBatchMutation = useMutation({
    mutationFn: () => {
      if (batchValidationError) {
        throw new Error(batchValidationError);
      }

      return setAdminStudentBatchGroup({
        studentId: student.student.id,
        payload: {
          batchGroupId,
          reason,
        },
      });
    },
    onSuccess: () => {
      setBatchOpen(false);
      setReason("");
      setBatchGroupId("");
      void queryClient.invalidateQueries({ queryKey: ["admin"] });
    },
  });

  const changeTeacherMutation = useMutation({
    mutationFn: () =>
      updateAdminStudent({
        studentId: student.student.id,
        payload: {
          assigned_teacher_id: teacherId || null,
        },
      }),
    onSuccess: () => {
      setTeacherOpen(false);
      void queryClient.invalidateQueries({ queryKey: ["admin"] });
    },
  });

  const memberships = (membershipsQuery.data?.items ?? []).sort(
    (left, right) => new Date(right.assigned_at).getTime() - new Date(left.assigned_at).getTime(),
  );
  const batchGroups = batchGroupsQuery.data?.items ?? [];
  const batchGroupMap = createBatchGroupMap(batchGroups);
  const activeMembership = memberships.find((membership) => membership.is_active);
  const programChanges = (programChangesQuery.data?.items ?? []).sort(
    (left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime(),
  );
  const activeBatchOptions = batchGroups
    .filter((group) => group.is_active)
    .map((group) => ({ value: group.id, label: group.name }));
  const teacherOptions = (teachersQuery.data?.items ?? []).map((teacher) => ({
    value: teacher.teacher.id,
    label: teacher.teacher.display_name,
  }));

  return (
    <DetailPanel
      title="Program"
      action={
        <TabActionButton
          icon={CalendarDays}
          label="Switch program"
          onClick={() => {
            setNextProgram(student.student.program_type === "one_on_one" ? "batch" : "one_on_one");
            setReason("");
            switchProgramMutation.reset();
            setSwitchOpen(true);
          }}
        />
      }
    >
      <div className="space-y-4">
        <ProgramMovementCard
          student={student}
          activeMembership={activeMembership}
          batchGroupMap={batchGroupMap}
          onMoveBatch={() => {
            setBatchGroupId(activeMembership?.batch_group_id ?? "");
            setReason("");
            moveBatchMutation.reset();
            setBatchOpen(true);
          }}
          onChangeTeacher={() => {
            setTeacherId(student.student.assigned_teacher_id ?? "");
            changeTeacherMutation.reset();
            setTeacherOpen(true);
          }}
        />

        {student.student.program_type === "batch" ? (
          <ProgramSection title="Batch history">
            {membershipsQuery.isLoading || batchGroupsQuery.isLoading ? (
              <PanelLoadingRows />
            ) : membershipsQuery.isError || batchGroupsQuery.isError ? (
              <p className="text-xs font-medium text-danger">Batch history could not be loaded.</p>
            ) : memberships.length > 0 ? (
              <div className="divide-y divide-border rounded-md border border-border">
                {memberships.map((membership) => (
                  <BatchMembershipRow
                    key={membership.id}
                    membership={membership}
                    batchGroup={batchGroupMap.get(membership.batch_group_id)}
                  />
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted">No batch history</p>
            )}
          </ProgramSection>
        ) : null}

        {programChanges.length > 0 ? (
          <ProgramSection title="Switch history">
            <div className="divide-y divide-border rounded-md border border-border">
              {programChanges.map((change) => (
                <ProgramChangeRow key={change.id} change={change} />
              ))}
            </div>
          </ProgramSection>
        ) : null}
      </div>

      <Modal
        title="Switch program"
        isOpen={switchOpen}
        onClose={() => setSwitchOpen(false)}
        footer={
          <>
            <CompactTextButton
              label="Close"
              onClick={() => setSwitchOpen(false)}
              disabled={switchProgramMutation.isPending}
            />
            <CompactTextButton
              label={switchProgramMutation.isPending ? "Switching..." : "Switch"}
              tone="brand"
              onClick={() => switchProgramMutation.mutate()}
              disabled={switchProgramMutation.isPending || Boolean(switchValidationError)}
            />
          </>
        }
      >
        <div className="space-y-2.5">
          <FilterSelect
            label="Program"
            value={nextProgram}
            includeAll={false}
            options={programOptions}
            onChange={(value) => setNextProgram(value as StudentProgramType)}
            disabled={switchProgramMutation.isPending}
            className="w-full"
            triggerClassName="w-full"
          />
          <CompactField
            label="Reason"
            value={reason}
            onChange={setReason}
            placeholder="Optional"
            disabled={switchProgramMutation.isPending}
          />
          {switchValidationError ? (
            <p className="text-xs font-medium text-danger">{switchValidationError}</p>
          ) : null}
          <ActionError error={switchProgramMutation.error} />
        </div>
      </Modal>

      <Modal
        title="Move batch"
        isOpen={batchOpen}
        onClose={() => setBatchOpen(false)}
        footer={
          <>
            <CompactTextButton
              label="Close"
              onClick={() => setBatchOpen(false)}
              disabled={moveBatchMutation.isPending}
            />
            <CompactTextButton
              label={moveBatchMutation.isPending ? "Moving..." : "Move"}
              tone="brand"
              onClick={() => moveBatchMutation.mutate()}
              disabled={moveBatchMutation.isPending || Boolean(batchValidationError)}
            />
          </>
        }
      >
        <div className="space-y-2.5">
          <FilterSelect
            label="Batch"
            value={batchGroupId}
            options={activeBatchOptions}
            onChange={setBatchGroupId}
            allLabel="Choose batch"
            disabled={moveBatchMutation.isPending}
            className="w-full"
            triggerClassName="w-full"
          />
          <CompactField
            label="Reason"
            value={reason}
            onChange={setReason}
            placeholder="Optional"
            disabled={moveBatchMutation.isPending}
          />
          {batchValidationError ? (
            <p className="text-xs font-medium text-danger">{batchValidationError}</p>
          ) : null}
          <ActionError error={moveBatchMutation.error} />
        </div>
      </Modal>

      <Modal
        title="Change teacher"
        isOpen={teacherOpen}
        onClose={() => setTeacherOpen(false)}
        footer={
          <>
            <CompactTextButton
              label="Close"
              onClick={() => setTeacherOpen(false)}
              disabled={changeTeacherMutation.isPending}
            />
            <CompactTextButton
              label={changeTeacherMutation.isPending ? "Saving..." : "Save"}
              tone="brand"
              onClick={() => changeTeacherMutation.mutate()}
              disabled={changeTeacherMutation.isPending}
            />
          </>
        }
      >
        <div className="space-y-2.5">
          <FilterSelect
            label="Teacher"
            value={teacherId}
            options={teacherOptions}
            onChange={setTeacherId}
            allLabel="Not assigned"
            disabled={changeTeacherMutation.isPending}
            className="w-full"
            triggerClassName="w-full"
          />
          <ActionError error={changeTeacherMutation.error} />
        </div>
      </Modal>
    </DetailPanel>
  );
}

type FinanceBriefing = {
  totalPaid: string;
  latestDate: string;
  latestMethod: string;
  count: number;
};

function FinanceBriefingRow({ finance }: { finance: FinanceBriefing }) {
  return (
    <div className="grid gap-x-6 gap-y-2 border-b border-border pb-3 md:grid-cols-4">
      <InlineSignal label="Total paid" value={finance.totalPaid} />
      <InlineSignal label="Latest" value={finance.latestDate} />
      <InlineSignal label="Method" value={finance.latestMethod} />
      <InlineSignal label="Count" value={String(finance.count)} />
    </div>
  );
}

function InlineSignal({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="truncate text-[11px] font-medium text-muted">{label}</p>
      <p className="mt-0.5 truncate text-xs font-semibold text-primary">{value}</p>
    </div>
  );
}

function PaymentHistoryRow({
  payment,
  packageLabel,
  onEdit,
  onDelete,
}: {
  payment: AdminStudentPaymentRead;
  packageLabel: string;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const visibleNote = getVisibleRecordNote(payment.notes);

  return (
    <div className="grid gap-2 px-3 py-2.5 sm:grid-cols-[7rem_7rem_6rem_minmax(0,1fr)_7rem] sm:items-center">
      <p className="truncate text-xs font-medium text-primary">
        {formatCompactDate(payment.paid_at)}
      </p>
      <p className="truncate text-xs font-semibold text-primary">
        {formatCurrencyMinor(payment.amount_paid, payment.currency)}
      </p>
      <QuietLabel>{formatPaymentMethod(payment.payment_method)}</QuietLabel>
      <div className="min-w-0">
        <p className="truncate text-xs font-medium text-primary">{packageLabel}</p>
        {visibleNote ? (
          <p className="mt-0.5 truncate text-[11px] text-muted">{visibleNote}</p>
        ) : null}
      </div>
      <div className="flex items-center justify-start gap-1 sm:justify-end">
        <CompactInlineButton label="Edit" onClick={onEdit} />
        <CompactInlineButton label="Delete" tone="danger" onClick={onDelete} />
      </div>
    </div>
  );
}

function CurrentAccessCard({ student }: { student: AdminStudentRead["student"] }) {
  const access = getAccessSummary(student);
  const accessTiming = getAccessTiming(student);

  return (
    <div className="grid gap-x-6 gap-y-2 border-b border-border pb-3 md:grid-cols-3">
      <InlineSignal label="Current" value={access.label} />
      <InlineSignal
        label="Window"
        value={`${formatCompactDate(student.access_starts_at)} - ${formatCompactDate(
          student.access_ends_at,
        )}`}
      />
      <InlineSignal label={accessTiming.label} value={accessTiming.value} />
    </div>
  );
}

function AccessGrantHistoryRow({
  grant,
  packageLabel,
}: {
  grant: AdminStudentAccessGrantRead;
  packageLabel: string;
}) {
  const visibleNote = getVisibleRecordNote(grant.notes);

  return (
    <div className="grid gap-2 px-3 py-2.5 sm:grid-cols-[8rem_minmax(0,1fr)_5.5rem_minmax(0,1fr)] sm:items-center">
      <QuietLabel>{formatAccessGrantType(grant.grant_type)}</QuietLabel>
      <p className="truncate text-xs font-medium text-primary">
        {formatCompactDate(grant.access_starts_at)} - {formatCompactDate(grant.access_ends_at)}
      </p>
      <p className="truncate text-xs text-muted">{grant.duration_days} days</p>
      <div className="min-w-0">
        <p className="truncate text-xs font-medium text-primary">{packageLabel}</p>
        {visibleNote ? (
          <p className="mt-0.5 truncate text-[11px] text-muted">{visibleNote}</p>
        ) : null}
      </div>
    </div>
  );
}

function ProgramMovementCard({
  student,
  activeMembership,
  batchGroupMap,
  onMoveBatch,
  onChangeTeacher,
}: {
  student: AdminStudentRead;
  activeMembership: StudentBatchMembershipRead | undefined;
  batchGroupMap: Map<string, BatchGroupRead>;
  onMoveBatch: () => void;
  onChangeTeacher: () => void;
}) {
  const assignedTeacher = student.assigned_teacher;
  const activeBatch = activeMembership
    ? (batchGroupMap.get(activeMembership.batch_group_id)?.name ?? "Batch linked")
    : "Not assigned";

  return (
    <div className="border-b border-border pb-3">
      {student.student.program_type === "one_on_one" ? (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <InlineSignal
            label="Assigned teacher"
            value={assignedTeacher?.teacher.display_name ?? "Not assigned"}
          />
          <CompactTextButton label="Change teacher" onClick={onChangeTeacher} />
        </div>
      ) : (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <InlineSignal label="Active batch" value={activeBatch} />
          <CompactTextButton label="Move batch" onClick={onMoveBatch} />
        </div>
      )}
    </div>
  );
}

function ProgramSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h3 className="mb-2 text-[11px] font-semibold text-muted">{title}</h3>
      {children}
    </section>
  );
}

function BatchMembershipRow({
  membership,
  batchGroup,
}: {
  membership: StudentBatchMembershipRead;
  batchGroup: BatchGroupRead | undefined;
}) {
  return (
    <div className="grid gap-2 px-3 py-2.5 sm:grid-cols-[minmax(0,1fr)_7rem_7rem_minmax(0,1fr)] sm:items-center">
      <p className="truncate text-xs font-medium text-primary">
        {batchGroup?.name ?? "Batch linked"}
      </p>
      <p className="truncate text-xs text-muted">{formatCompactDate(membership.assigned_at)}</p>
      <QuietLabel tone={membership.is_active ? "brand" : "muted"}>
        {membership.is_active ? "Current" : formatCompactDate(membership.ended_at)}
      </QuietLabel>
      <p className="truncate text-xs text-muted">{membership.end_reason ?? "-"}</p>
    </div>
  );
}

function ProgramChangeRow({ change }: { change: StudentProgramChangeRead }) {
  return (
    <div className="grid gap-2 px-3 py-2.5 sm:grid-cols-[minmax(0,1fr)_7rem_minmax(0,1fr)] sm:items-center">
      <p className="truncate text-xs font-medium text-primary">
        {formatProgram(change.old_program_type)} to {formatProgram(change.new_program_type)}
      </p>
      <p className="truncate text-xs text-muted">{formatCompactDate(change.created_at)}</p>
      <p className="truncate text-xs text-muted">{change.reason ?? "-"}</p>
    </div>
  );
}

function TabActionButton({
  icon: Icon,
  label,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-xs font-medium text-brand transition hover:bg-surface-subtle hover:text-primary"
      onClick={onClick}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {label}
    </button>
  );
}

function ActionError({ error }: { error: unknown }) {
  const message = getMutationErrorMessage(error);
  return message ? <p className="text-xs font-medium text-danger">{message}</p> : null;
}

function StudentSideSummary({ student }: { student: AdminStudentRead }) {
  const access = getAccessSummary(student.student);

  return (
    <aside className="h-fit rounded-md border border-border bg-surface p-4 xl:sticky xl:top-4">
      <h2 className="text-xs font-semibold text-primary">Summary</h2>
      <div className="mt-4 space-y-3">
        <SummaryRow label="Student" value={formatStatus(student.student.status)} />
        <SummaryRow label="Program" value={formatProgram(student.student.program_type)} />
        {student.student.program_type === "one_on_one" ? (
          <AssignedTeacherSummaryRow student={student} />
        ) : null}
        <SummaryRow label="Access" value={access.label} tone={access.tone} />
        <SummaryRow
          label="Account"
          value={student.user.is_active ? "Enabled" : "Disabled"}
          tone={student.user.is_active ? "default" : "danger"}
        />
        <SummaryRow label="Starts" value={formatCompactDate(student.student.access_starts_at)} />
        <SummaryRow label="Ends" value={formatCompactDate(student.student.access_ends_at)} />
        <SummaryRow label="Joined" value={formatDate(student.student.joined_at)} />
      </div>

      <div className="mt-4 border-t border-border pt-4">
        <div className="flex items-center justify-between gap-3">
          <span className="text-[11px] font-medium text-muted">Student ID</span>
          <CopyIconButton value={student.student.id} label="student id" />
        </div>
        <p className="mt-1 truncate text-xs font-medium text-primary">{student.student.id}</p>
      </div>
    </aside>
  );
}

type StudentClassRow = {
  booking: BookingRead;
  classSession: ClassSessionRead | undefined;
  dateLabel: string;
  timeLabel: string;
  ownerLabel: string;
  bookingStatus: string;
  bookingTone: "default" | "danger" | "brand";
  classStatus: string;
  classTone: "default" | "danger" | "brand";
  sortTime: number;
};

function StudentClassesTab({
  student,
  classes,
  filter,
  expandedBookingId,
  onFilterChange,
  onExpandedBookingChange,
}: {
  student: AdminStudentRead;
  classes: StudentClassesData;
  filter: StudentClassFilter;
  expandedBookingId: string | null;
  onFilterChange: (filter: StudentClassFilter) => void;
  onExpandedBookingChange: (bookingId: string) => void;
}) {
  if (classes.isLoading) {
    return (
      <DetailPanel title="Classes">
        <PanelLoadingRows />
      </DetailPanel>
    );
  }

  if (classes.isError) {
    return (
      <DetailPanel title="Classes">
        <p className="text-xs font-medium text-danger">Classes could not be loaded.</p>
      </DetailPanel>
    );
  }

  const rows = createStudentClassRows({
    bookings: classes.bookings,
    classSessions: classes.classSessions,
    student,
    filter,
  });
  const ownerHeader = student.student.program_type === "one_on_one" ? "Teacher" : "Batch";

  return (
    <DetailPanel
      title="Classes"
      action={
        <span className="text-[11px] font-medium text-muted">
          {classes.total} {classes.total === 1 ? "record" : "records"}
        </span>
      }
    >
      <div className="space-y-3">
        <div className="flex flex-wrap gap-1">
          {classFilters.map((option) => (
            <button
              key={option.value}
              type="button"
              className={cn(
                "h-7 rounded-md px-2.5 text-xs font-medium transition",
                filter === option.value
                  ? "bg-brand/10 text-primary"
                  : "text-muted hover:bg-surface-subtle hover:text-primary",
              )}
              onClick={() => onFilterChange(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>

        {rows.length > 0 ? (
          <div className="overflow-hidden rounded-md border border-border">
            <div className="hidden grid-cols-[6.5rem_6rem_minmax(0,1fr)_6rem_6rem] gap-2 border-b border-border bg-surface-subtle/60 px-3 py-2 text-[11px] font-medium text-muted sm:grid">
              <span>Date</span>
              <span>Time</span>
              <span>{ownerHeader}</span>
              <span>Booking</span>
              <span>Class</span>
            </div>
            <div className="divide-y divide-border">
              {rows.map((row) => (
                <StudentClassRowItem
                  key={row.booking.id}
                  row={row}
                  isExpanded={expandedBookingId === row.booking.id}
                  onToggle={() => onExpandedBookingChange(row.booking.id)}
                />
              ))}
            </div>
            {classes.hasMore ? (
              <div className="border-t border-border px-3 py-3 text-center">
                <button
                  type="button"
                  className="h-8 rounded-md border border-border bg-surface px-3 text-xs font-medium text-primary transition hover:border-border-strong hover:bg-surface-subtle/70 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={classes.isLoadingMore}
                  onClick={classes.onLoadMore}
                >
                  {classes.isLoadingMore ? "Loading..." : "Load more"}
                </button>
              </div>
            ) : null}
          </div>
        ) : (
          <p className="text-sm text-muted">No classes found</p>
        )}
      </div>
    </DetailPanel>
  );
}

function StudentClassRowItem({
  row,
  isExpanded,
  onToggle,
}: {
  row: StudentClassRow;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div>
      <button
        type="button"
        className="grid w-full gap-2 px-3 py-2 text-left transition hover:bg-surface-subtle/55 sm:grid-cols-[6.5rem_6rem_minmax(0,1fr)_6rem_6rem] sm:items-center"
        onClick={onToggle}
      >
        <span className="truncate text-xs font-medium text-primary">{row.dateLabel}</span>
        <span className="truncate text-xs text-muted">{row.timeLabel}</span>
        <span className="truncate text-xs font-medium text-primary">{row.ownerLabel}</span>
        <QuietLabel tone={row.bookingTone}>{row.bookingStatus}</QuietLabel>
        <QuietLabel tone={row.classTone}>{row.classStatus}</QuietLabel>
      </button>

      {isExpanded ? <StudentClassRowDetails row={row} /> : null}
    </div>
  );
}

function StudentClassRowDetails({ row }: { row: StudentClassRow }) {
  return (
    <div className="border-t border-border bg-surface-subtle/35 px-3 py-3">
      <div className="grid gap-3 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div className="space-y-2">
          <DetailMetaRow label="Booked at" value={formatDateTime(row.booking.booked_at)} />
          <DetailMetaRow
            label="Capacity"
            value={row.classSession ? String(row.classSession.capacity) : "-"}
          />
          <DetailCopyRow label="Booking ID" value={row.booking.id} />
          <DetailCopyRow label="Class ID" value={row.booking.class_session_id} />
        </div>

        <div className="space-y-4">
          <BookingNotesPanel bookingId={row.booking.id} />
          <BookingEventsPanel bookingId={row.booking.id} />
        </div>
      </div>
      <BookingActionsPanel row={row} />
    </div>
  );
}

function DetailMetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[5.5rem_minmax(0,1fr)] items-center gap-2">
      <span className="text-[11px] font-medium text-muted">{label}</span>
      <span className="truncate text-xs font-medium text-primary">{value}</span>
    </div>
  );
}

function DetailCopyRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[5.5rem_minmax(0,1fr)_2rem] items-center gap-2">
      <span className="text-[11px] font-medium text-muted">{label}</span>
      <span className="truncate text-xs font-medium text-primary">{value}</span>
      <CopyIconButton value={value} label={label.toLowerCase()} />
    </div>
  );
}

type BookingActionMode = "idle" | "cancel" | "reschedule";

function BookingActionsPanel({ row }: { row: StudentClassRow }) {
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<BookingActionMode>("idle");
  const [reason, setReason] = useState("");
  const [targetId, setTargetId] = useState("");
  const targetWindow = useMemo(() => getRescheduleTargetWindow(), []);
  const classSession = row.classSession;
  const canManageBooking = row.booking.status === "booked" && classSession?.status === "scheduled";
  const isOneOnOne = classSession?.program_type === "one_on_one";
  const isBatch = classSession?.program_type === "batch";
  const teacherId = classSession?.teacher_id ?? null;
  const batchGroupId = classSession?.batch_group_id ?? null;

  const availabilitySlotsQuery = useQuery({
    queryKey: [
      "admin",
      "teacher-availability",
      "slots",
      "reschedule",
      teacherId,
      targetWindow.startsFrom,
      targetWindow.startsTo,
    ],
    queryFn: () =>
      listAdminTeacherAvailabilitySlots({
        teacherId: teacherId ?? undefined,
        startsFrom: targetWindow.startsFrom,
        startsTo: targetWindow.startsTo,
        pageSize: RESCHEDULE_TARGET_FETCH_SIZE,
      }),
    enabled: mode === "reschedule" && isOneOnOne && Boolean(teacherId),
  });

  const batchClassesQuery = useQuery({
    queryKey: [
      "admin",
      "classes",
      "reschedule",
      batchGroupId,
      targetWindow.startsFrom,
      targetWindow.startsTo,
    ],
    queryFn: () =>
      listAdminClassSessions({
        programType: "batch",
        batchGroupId: batchGroupId ?? undefined,
        startsFrom: targetWindow.startsFrom,
        startsTo: targetWindow.startsTo,
        status: "scheduled",
        pageSize: RESCHEDULE_TARGET_FETCH_SIZE,
      }),
    enabled: mode === "reschedule" && isBatch && Boolean(batchGroupId),
  });

  const cancelMutation = useMutation({
    mutationFn: () =>
      cancelAdminBooking({
        bookingId: row.booking.id,
        reason,
      }),
    onSuccess: () => {
      resetAction();
      void queryClient.invalidateQueries({ queryKey: ["admin"] });
    },
  });

  const rescheduleMutation = useMutation({
    mutationFn: () => {
      if (!targetId) {
        throw new Error("Choose a target first");
      }

      if (isOneOnOne) {
        return rescheduleAdminOneOnOneBooking({
          bookingId: row.booking.id,
          teacherAvailabilitySlotId: targetId,
          reason,
        });
      }

      return rescheduleAdminBatchBooking({
        bookingId: row.booking.id,
        classSessionId: targetId,
        reason,
      });
    },
    onSuccess: () => {
      resetAction();
      void queryClient.invalidateQueries({ queryKey: ["admin"] });
    },
  });

  if (!canManageBooking) {
    return null;
  }

  const targetOptions = isOneOnOne
    ? (availabilitySlotsQuery.data?.items ?? [])
        .filter((slot) => slot.status === "available")
        .map((slot) => ({
          value: slot.id,
          label: formatAvailabilitySlotOption(slot),
        }))
    : (batchClassesQuery.data?.items ?? [])
        .filter((targetClass) => targetClass.id !== classSession?.id)
        .map((targetClass) => ({
          value: targetClass.id,
          label: formatClassSessionTargetOption(targetClass),
        }));
  const targetsQuery = isOneOnOne ? availabilitySlotsQuery : batchClassesQuery;
  const actionError = getMutationErrorMessage(cancelMutation.error ?? rescheduleMutation.error);
  const isCancelling = cancelMutation.isPending;
  const isRescheduling = rescheduleMutation.isPending;

  function resetAction() {
    setMode("idle");
    setReason("");
    setTargetId("");
  }

  function openMode(nextMode: BookingActionMode) {
    setMode(nextMode);
    setReason("");
    setTargetId("");
    cancelMutation.reset();
    rescheduleMutation.reset();
  }

  return (
    <div className="mt-3">
      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          className="h-7 rounded-md px-2 text-xs font-medium text-muted transition hover:bg-surface hover:text-primary"
          onClick={() => openMode("reschedule")}
        >
          Reschedule
        </button>
        <button
          type="button"
          className="h-7 rounded-md px-2 text-xs font-medium text-danger transition hover:bg-surface"
          onClick={() => openMode("cancel")}
        >
          Cancel
        </button>
      </div>

      <Modal
        title="Cancel booking"
        isOpen={mode === "cancel"}
        onClose={resetAction}
        footer={
          <>
            <CompactTextButton label="Keep" onClick={resetAction} disabled={isCancelling} />
            <CompactTextButton
              label={isCancelling ? "Cancelling..." : "Confirm cancel"}
              tone="danger"
              onClick={() => cancelMutation.mutate()}
              disabled={isCancelling}
            />
          </>
        }
      >
        <div className="space-y-2.5">
          <p className="text-xs leading-5 text-muted">This cancels only this student's booking.</p>
          <CompactReasonInput
            value={reason}
            onChange={setReason}
            placeholder="Reason, optional"
            disabled={isCancelling}
          />
          {actionError ? <p className="text-xs font-medium text-danger">{actionError}</p> : null}
        </div>
      </Modal>

      <Modal
        title="Reschedule booking"
        isOpen={mode === "reschedule"}
        onClose={resetAction}
        footer={
          <>
            <CompactTextButton label="Close" onClick={resetAction} disabled={isRescheduling} />
            <CompactTextButton
              label={isRescheduling ? "Moving..." : "Move booking"}
              tone="brand"
              onClick={() => rescheduleMutation.mutate()}
              disabled={isRescheduling || !targetId}
            />
          </>
        }
      >
        <div className="space-y-2.5">
          <p className="text-xs leading-5 text-muted">
            Move this booking to another {isOneOnOne ? "available slot" : "class"}.
          </p>
          {targetsQuery.isLoading ? (
            <p className="text-xs text-muted">Loading targets...</p>
          ) : targetsQuery.isError ? (
            <p className="text-xs font-medium text-danger">Targets could not be loaded.</p>
          ) : targetOptions.length > 0 ? (
            <FilterSelect
              label="Move to"
              value={targetId}
              options={targetOptions}
              onChange={setTargetId}
              allLabel={isOneOnOne ? "Choose slot" : "Choose class"}
              disabled={isRescheduling}
              className="w-full"
              triggerClassName="w-full"
            />
          ) : (
            <p className="text-xs text-muted">
              {isOneOnOne ? "No available slots" : "No scheduled batch classes"}
            </p>
          )}
          <CompactReasonInput
            value={reason}
            onChange={setReason}
            placeholder="Reason, optional"
            disabled={isRescheduling}
          />
          {actionError ? <p className="text-xs font-medium text-danger">{actionError}</p> : null}
        </div>
      </Modal>
    </div>
  );
}

function CompactReasonInput({
  value,
  onChange,
  placeholder,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  disabled?: boolean;
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      className="h-8 w-full rounded-md border border-border bg-surface px-2 text-xs font-medium text-primary outline-none transition placeholder:text-muted focus:border-border-strong focus:ring-2 focus:ring-brand/15 disabled:cursor-not-allowed disabled:opacity-60"
    />
  );
}

function CompactTextButton({
  label,
  onClick,
  tone = "default",
  disabled,
}: {
  label: string;
  onClick: () => void;
  tone?: "default" | "brand" | "danger";
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      className={cn(
        "h-8 rounded-md px-2.5 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-60",
        tone === "brand" && "bg-brand text-white hover:opacity-90",
        tone === "danger" && "text-danger hover:bg-surface",
        tone === "default" && "text-muted hover:bg-surface hover:text-primary",
      )}
      onClick={onClick}
      disabled={disabled}
    >
      {label}
    </button>
  );
}

function CompactInlineButton({
  label,
  onClick,
  tone = "default",
}: {
  label: string;
  onClick: () => void;
  tone?: "default" | "danger";
}) {
  return (
    <button
      type="button"
      className={cn(
        "h-7 rounded-md px-1.5 text-[11px] font-medium transition hover:bg-surface-subtle",
        tone === "danger" ? "text-danger" : "text-muted hover:text-primary",
      )}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

function BookingNotesPanel({ bookingId }: { bookingId: string }) {
  const notesQuery = useQuery({
    queryKey: ["admin", "bookings", bookingId, "notes"],
    queryFn: () => listAdminBookingNotes({ bookingId, pageSize: 5 }),
  });

  if (notesQuery.isLoading) {
    return <PanelLoadingRows />;
  }

  if (notesQuery.isError) {
    return <p className="text-xs font-medium text-danger">Feedback could not be loaded.</p>;
  }

  const notes = notesQuery.data?.items ?? [];

  return (
    <div>
      <p className="text-[11px] font-semibold text-muted">Teacher feedback</p>
      <div className="mt-2 divide-y divide-border">
        {notes.length > 0 ? (
          notes.map((note) => <BookingNoteRow key={note.id} note={note} />)
        ) : (
          <p className="text-xs text-muted">No teacher feedback</p>
        )}
      </div>
    </div>
  );
}

function BookingNoteRow({ note }: { note: BookingNoteRead }) {
  return (
    <div className="grid gap-2 py-2 first:pt-0 last:pb-0 sm:grid-cols-[minmax(0,1fr)_6.5rem_8rem] sm:items-center">
      <p className="min-w-0 text-xs leading-5 text-primary">{note.note}</p>
      <QuietLabel tone={note.visibility === "student_visible" ? "brand" : "muted"}>
        {formatBookingNoteVisibility(note.visibility)}
      </QuietLabel>
      <span className="truncate text-[11px] text-muted">{formatDateTime(note.created_at)}</span>
    </div>
  );
}

function BookingEventsPanel({ bookingId }: { bookingId: string }) {
  const eventsQuery = useQuery({
    queryKey: ["admin", "bookings", bookingId, "events"],
    queryFn: () => listAdminBookingEvents({ bookingId, pageSize: 10 }),
  });

  if (eventsQuery.isLoading) {
    return <PanelLoadingRows />;
  }

  if (eventsQuery.isError) {
    return <p className="text-xs font-medium text-danger">Events could not be loaded.</p>;
  }

  const events = eventsQuery.data?.items ?? [];

  return (
    <div>
      <p className="text-[11px] font-semibold text-muted">Events</p>
      <div className="mt-2 divide-y divide-border">
        {events.length > 0 ? (
          events.map((event) => <BookingEventRow key={event.id} event={event} />)
        ) : (
          <p className="text-xs text-muted">No events yet</p>
        )}
      </div>
    </div>
  );
}

function BookingEventRow({ event }: { event: BookingEventRead }) {
  return (
    <div className="grid gap-2 py-2 first:pt-0 last:pb-0 sm:grid-cols-[8rem_minmax(0,1fr)_8rem] sm:items-center">
      <span className="truncate text-xs font-medium text-primary">
        {formatBookingEventType(event.event_type)}
      </span>
      <span className="truncate text-xs text-muted">{event.reason}</span>
      <span className="truncate text-[11px] text-muted">{formatDateTime(event.created_at)}</span>
    </div>
  );
}

function StudentOverviewBriefing({
  student,
  overview,
}: {
  student: AdminStudentRead;
  overview: StudentOverviewData;
}) {
  const [activityPaging, setActivityPaging] = useState({
    studentId: student.student.id,
    visibleCount: ACTIVITY_PAGE_SIZE,
  });
  const visibleActivityCount =
    activityPaging.studentId === student.student.id
      ? activityPaging.visibleCount
      : ACTIVITY_PAGE_SIZE;

  if (overview.isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-2 rounded-md border border-border bg-surface p-3 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-16 animate-pulse rounded-md bg-surface-subtle" />
          ))}
        </div>
        <DetailPanel title="Activity">
          <PanelLoadingRows />
        </DetailPanel>
      </div>
    );
  }

  if (overview.isError) {
    return (
      <DetailPanel title="Overview">
        <p className="text-xs font-medium text-danger">Student overview could not be loaded.</p>
      </DetailPanel>
    );
  }

  const upcomingRows = createClassPreviewRows(
    overview.upcomingBookings,
    overview.upcomingClasses,
    "asc",
  );
  const recentRows = createClassPreviewRows(
    overview.recentBookings,
    overview.recentClasses,
    "desc",
  );
  const activityRows = createActivityRows({ upcomingRows, recentRows, overview });
  const alerts = createOverviewAlerts({ student, upcomingRows, recentRows });
  const access = getAccessSummary(student.student);
  const nextClass = upcomingRows[0];
  const lastClass = recentRows[0];
  const latestPayment = overview.payments[0];
  const visibleActivityRows = activityRows.slice(0, visibleActivityCount);
  const hasMoreActivity = visibleActivityCount < activityRows.length;

  return (
    <div className="space-y-4">
      <section className="rounded-md border border-border bg-surface p-3">
        <div className="grid gap-2 md:grid-cols-4">
          <OverviewSignal
            label="Next class"
            value={nextClass?.title ?? "Not booked"}
            detail={nextClass?.detail ?? "No upcoming class"}
            flag={nextClass?.status ?? "Check"}
            tone={nextClass ? "brand" : "danger"}
          />
          <OverviewSignal
            label="Access"
            value={access.label}
            detail="Current window"
            flag={access.tone === "danger" ? "Check" : undefined}
            tone={access.tone}
          />
          <OverviewSignal
            label="Last payment"
            value={latestPayment ? formatPayment(latestPayment) : "No payments"}
            detail={
              latestPayment ? formatPaymentMethod(latestPayment.payment_method) : "No record yet"
            }
          />
          <OverviewSignal
            label="Last class"
            value={lastClass?.title ?? "No history"}
            detail={lastClass ? lastClass.status : "No completed class yet"}
            flag={lastClass?.status}
            tone={lastClass?.status === "Missed" ? "danger" : "default"}
          />
        </div>
      </section>

      {alerts.length > 0 ? (
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

      <DetailPanel title="Activity">
        {activityRows.length > 0 ? (
          <div>
            <div className="divide-y divide-border">
              {visibleActivityRows.map((row) => (
                <ActivityRow key={row.id} row={row} />
              ))}
            </div>
            {hasMoreActivity ? (
              <div className="mt-3 flex justify-center">
                <button
                  type="button"
                  className="h-8 rounded-md border border-border bg-surface px-3 text-xs font-medium text-primary transition hover:border-border-strong hover:bg-surface-subtle/70"
                  onClick={() =>
                    setActivityPaging({
                      studentId: student.student.id,
                      visibleCount: visibleActivityCount + ACTIVITY_PAGE_SIZE,
                    })
                  }
                >
                  Load more
                </button>
              </div>
            ) : null}
          </div>
        ) : (
          <p className="text-sm text-muted">No activity yet</p>
        )}
      </DetailPanel>
    </div>
  );
}

type PreviewRow = {
  id: string;
  title: string;
  detail: string;
  status: string;
  dateTime: number;
};

type ActivityRowData = {
  id: string;
  label: string;
  title: string;
  detail: string;
  status?: string;
  tone?: "default" | "danger" | "brand";
  dateTime: number;
};

function OverviewSignal({
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

function ActivityRow({ row }: { row: ActivityRowData }) {
  return (
    <div className="grid gap-2 py-2 first:pt-0 last:pb-0 sm:grid-cols-[6rem_minmax(0,1fr)_minmax(8rem,0.7fr)_5.5rem] sm:items-center">
      <p className="text-[11px] font-medium text-muted">{row.label}</p>
      <p className="min-w-0 truncate text-[13px] font-medium text-primary">{row.title}</p>
      <p className="min-w-0 justify-self-start truncate text-left text-[11px] text-muted">
        {row.detail}
      </p>
      {row.status ? <QuietLabel tone={row.tone}>{row.status}</QuietLabel> : null}
    </div>
  );
}

function PanelLoadingRows() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="h-10 animate-pulse rounded-md bg-surface-subtle" />
      ))}
    </div>
  );
}

function HeaderAction({
  icon: Icon,
  label,
  onClick,
  tone = "default",
}: {
  icon: LucideIcon;
  label: string;
  onClick?: () => void;
  tone?: "default" | "brand";
}) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex h-8 items-center gap-2 rounded-md px-3 text-xs font-medium transition",
        tone === "brand"
          ? "bg-brand text-white hover:opacity-90"
          : "border border-border bg-surface text-primary hover:border-border-strong hover:bg-surface-subtle/70",
      )}
      onClick={onClick}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {label}
    </button>
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

function AssignedTeacherSummaryRow({ student }: { student: AdminStudentRead }) {
  const assignedTeacher = student.assigned_teacher;

  if (!assignedTeacher) {
    return <SummaryRow label="Assigned teacher" value="Not assigned" />;
  }

  return (
    <div className="relative flex items-center justify-between gap-3">
      <span className="text-[11px] font-medium text-muted">Assigned teacher</span>
      <div className="group relative min-w-0 text-right">
        <Link
          to={`/admin/teachers/${assignedTeacher.teacher.id}`}
          className="inline-flex max-w-32 truncate text-xs font-medium text-brand transition hover:text-primary"
        >
          {assignedTeacher.teacher.display_name}
        </Link>

        <div className="pointer-events-none absolute right-0 top-full z-30 w-64 translate-y-1 rounded-md border border-border bg-surface p-3 text-left opacity-0 shadow-[0_16px_40px_rgba(15,23,42,0.14)] transition group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:translate-y-0 group-focus-within:opacity-100">
          <p className="truncate text-sm font-semibold text-primary">
            {assignedTeacher.teacher.display_name}
          </p>
          <div className="mt-3 grid gap-2">
            <SummaryRow label="Email" value={assignedTeacher.user.email} />
            <SummaryRow label="Phone" value={assignedTeacher.user.phone ?? "No phone"} />
            <SummaryRow
              label="Active"
              value={assignedTeacher.teacher.is_active ? "Enabled" : "Disabled"}
              tone={assignedTeacher.teacher.is_active ? "default" : "danger"}
            />
          </div>
          <Link
            to={`/admin/teachers/${assignedTeacher.teacher.id}`}
            className="mt-3 inline-flex h-8 items-center gap-2 rounded-md bg-brand px-3 text-xs font-medium text-white transition hover:opacity-90"
          >
            Go to details
            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </div>
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

function StudentStatusBadge({ value }: { value: StudentStatus }) {
  return <StatusBadge tone={studentStatusBadgeTones[value]}>{formatStatus(value)}</StatusBadge>;
}

const studentStatusBadgeTones = {
  enrolled: "blue",
  active: "green",
  paused: "amber",
  completed: "indigo",
  cancelled: "rose",
} satisfies Record<StudentStatus, "blue" | "green" | "amber" | "indigo" | "rose">;

function StudentDetailSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-24 animate-pulse rounded-md bg-surface-subtle" />
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="h-72 animate-pulse rounded-md bg-surface-subtle" />
        <div className="h-72 animate-pulse rounded-md bg-surface-subtle" />
      </div>
    </div>
  );
}

function parseTab(value: string | null): StudentDetailTab {
  return tabs.some((tab) => tab.value === value) ? (value as StudentDetailTab) : "overview";
}

function parseClassFilter(value: string | null): StudentClassFilter {
  return classFilters.some((filter) => filter.value === value)
    ? (value as StudentClassFilter)
    : "upcoming";
}

function getClassBookingParams(filter: StudentClassFilter, now: string) {
  if (filter === "upcoming") {
    return { status: "booked" as const, startsFrom: now };
  }

  if (filter === "history") {
    return { startsTo: now };
  }

  if (filter === "cancelled") {
    return { status: "cancelled" as const };
  }

  return {};
}

function getAccessSummary(student: AdminStudentRead["student"]) {
  const startsAt = student.access_starts_at ? new Date(student.access_starts_at) : null;
  const endsAt = student.access_ends_at ? new Date(student.access_ends_at) : null;
  const now = new Date();

  if (!startsAt || !endsAt) {
    return { label: "No access", tone: "default" as const };
  }

  if (now < startsAt) {
    return {
      label: `Starts ${formatCompactDate(student.access_starts_at)}`,
      tone: "default" as const,
    };
  }

  if (now >= endsAt) {
    return {
      label: `Expired ${formatCompactDate(student.access_ends_at)}`,
      tone: "danger" as const,
    };
  }

  return {
    label: `Valid till ${formatCompactDate(student.access_ends_at)}`,
    tone: "brand" as const,
  };
}

function getAccessTiming(student: AdminStudentRead["student"]) {
  const startsAt = student.access_starts_at ? new Date(student.access_starts_at) : null;
  const endsAt = student.access_ends_at ? new Date(student.access_ends_at) : null;
  const now = new Date();
  const dayMs = 24 * 60 * 60 * 1000;

  if (!startsAt || !endsAt) {
    return { label: "Timing", value: "-" };
  }

  if (now < startsAt) {
    const days = Math.ceil((startsAt.getTime() - now.getTime()) / dayMs);
    return { label: "Starts in", value: `${days} ${days === 1 ? "day" : "days"}` };
  }

  if (now >= endsAt) {
    const days = Math.max(0, Math.floor((now.getTime() - endsAt.getTime()) / dayMs));
    return {
      label: "Expired",
      value: days === 0 ? "Today" : `${days} ${days === 1 ? "day" : "days"} ago`,
    };
  }

  const days = Math.ceil((endsAt.getTime() - now.getTime()) / dayMs);
  return { label: "Left", value: `${days} ${days === 1 ? "day" : "days"}` };
}

function createStudentClassRows({
  bookings,
  classSessions,
  student,
  filter,
}: {
  bookings: BookingRead[];
  classSessions: Array<ClassSessionRead | undefined>;
  student: AdminStudentRead;
  filter: StudentClassFilter;
}) {
  return bookings
    .map((booking, index): StudentClassRow => {
      const classSession = classSessions[index];
      const classStartsAt = classSession?.starts_at ?? null;
      const classEndsAt = classSession?.ends_at ?? null;
      const ownerLabel = classSession ? formatClassOwner(classSession, student) : "-";
      const bookingTone = getBookingTone(booking.status);
      const classTone = getClassStatusTone(classSession?.status);

      return {
        booking,
        classSession,
        dateLabel: formatCompactDate(classStartsAt),
        timeLabel: classStartsAt
          ? `${formatTime(classStartsAt)} - ${formatTime(classEndsAt)}`
          : "-",
        ownerLabel,
        bookingStatus: formatBookingStatus(booking.status),
        bookingTone,
        classStatus: classSession ? formatClassSessionStatus(classSession.status) : "-",
        classTone,
        sortTime: classStartsAt ? new Date(classStartsAt).getTime() : 0,
      };
    })
    .sort((left, right) =>
      filter === "upcoming" ? left.sortTime - right.sortTime : right.sortTime - left.sortTime,
    );
}

function createActivityRows({
  upcomingRows,
  recentRows,
  overview,
}: {
  upcomingRows: PreviewRow[];
  recentRows: PreviewRow[];
  overview: StudentOverviewData;
}) {
  const classRows: ActivityRowData[] = [
    ...upcomingRows.map((row) => ({
      id: `upcoming-${row.id}`,
      label: "Upcoming",
      title: row.title,
      detail: row.detail,
      status: row.status,
      tone: "brand" as const,
      dateTime: row.dateTime,
    })),
    ...recentRows.map((row) => ({
      id: `recent-${row.id}`,
      label: "Class",
      title: row.title,
      detail: row.detail,
      status: row.status,
      tone: row.status === "Missed" ? ("danger" as const) : ("default" as const),
      dateTime: row.dateTime,
    })),
  ];

  const paymentRows: ActivityRowData[] = overview.payments.map((payment) => ({
    id: `payment-${payment.id}`,
    label: "Payment",
    title: formatPayment(payment),
    detail: formatPaymentMethod(payment.payment_method),
    status: "Paid",
    dateTime: new Date(payment.paid_at).getTime(),
  }));

  const accessRows: ActivityRowData[] = overview.accessGrants.map((grant) => ({
    id: `access-${grant.id}`,
    label: "Access",
    title: formatAccessGrant(grant),
    detail: `${formatCompactDate(grant.access_starts_at)} - ${formatCompactDate(
      grant.access_ends_at,
    )}`,
    status: "Granted",
    dateTime: new Date(grant.created_at).getTime(),
  }));

  return [...classRows, ...paymentRows, ...accessRows].sort(
    (left, right) => right.dateTime - left.dateTime,
  );
}

function createOverviewAlerts({
  student,
  upcomingRows,
  recentRows,
}: {
  student: AdminStudentRead;
  upcomingRows: PreviewRow[];
  recentRows: PreviewRow[];
}) {
  const access = getAccessSummary(student.student);
  const alerts: string[] = [];

  if (access.tone === "danger") {
    alerts.push("Access expired");
  }

  if (upcomingRows.length === 0) {
    alerts.push("No upcoming class");
  }

  if (recentRows[0]?.status === "Missed") {
    alerts.push("Last class missed");
  }

  return alerts;
}

function createClassPreviewRows(
  bookings: BookingRead[],
  classes: Array<ClassSessionRead | undefined>,
  sortDirection: "asc" | "desc",
) {
  return bookings
    .map((booking, index) => ({
      booking,
      classSession: classes[index],
    }))
    .sort((left, right) => {
      const leftTime = left.classSession ? new Date(left.classSession.starts_at).getTime() : 0;
      const rightTime = right.classSession ? new Date(right.classSession.starts_at).getTime() : 0;

      return sortDirection === "asc" ? leftTime - rightTime : rightTime - leftTime;
    })
    .map(({ booking, classSession }) => ({
      id: booking.id,
      title: classSession ? formatDate(classSession.starts_at) : "Class",
      detail: classSession
        ? `${formatTime(classSession.starts_at)} - ${formatTime(classSession.ends_at)}`
        : booking.id,
      status: formatBookingStatus(booking.status),
      dateTime: classSession ? new Date(classSession.starts_at).getTime() : 0,
    }));
}

function formatDate(value: string | null) {
  return value ? dateFormatter.format(new Date(value)) : "-";
}

function formatTime(value: string | null) {
  return value ? timeFormatter.format(new Date(value)) : "-";
}

function formatDateTime(value: string | null) {
  return value ? `${formatDate(value)}, ${formatTime(value)}` : "-";
}

function formatCompactDate(value: string | null) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();

  return `${day}-${month}-${year}`;
}

function formatStatus(value: StudentStatus) {
  return {
    enrolled: "Enrolled",
    active: "Active",
    paused: "Paused",
    completed: "Completed",
    cancelled: "Cancelled",
  }[value];
}

function formatProgram(value: StudentProgramType) {
  return {
    one_on_one: "1-on-1",
    batch: "Batch",
  }[value];
}

function formatBookingStatus(value: BookingStatus) {
  return {
    booked: "Booked",
    cancelled: "Cancelled",
    attended: "Attended",
    missed: "Missed",
  }[value];
}

function formatClassSessionStatus(value: ClassSessionStatus) {
  return {
    scheduled: "Scheduled",
    completed: "Completed",
    cancelled: "Cancelled",
  }[value];
}

function formatBookingEventType(value: BookingEventRead["event_type"]) {
  return {
    booked: "Booked",
    cancelled_by_student: "Student cancelled",
    cancelled_by_admin: "Admin cancelled",
    rescheduled_from: "Rescheduled from",
    rescheduled_to: "Rescheduled to",
    class_cancelled_empty: "Class empty",
    attendance_marked: "Attendance",
    manually_added_by_admin: "Admin added",
  }[value];
}

function formatBookingNoteVisibility(value: BookingNoteRead["visibility"]) {
  return {
    admin_only: "Admin only",
    student_visible: "Student visible",
  }[value];
}

function formatAvailabilitySlotOption(slot: TeacherAvailabilitySlotRead) {
  return `${formatCompactDate(slot.starts_at)} · ${formatTime(slot.starts_at)} - ${formatTime(slot.ends_at)}`;
}

function formatClassSessionTargetOption(classSession: ClassSessionRead) {
  const batchSlot = classSession.batch_slot ? `${formatBatchSlot(classSession.batch_slot)} · ` : "";
  return `${batchSlot}${formatCompactDate(classSession.starts_at)} · ${formatTime(classSession.starts_at)} - ${formatTime(classSession.ends_at)}`;
}

function getRescheduleTargetWindow() {
  const startsFrom = new Date();
  const startsTo = new Date(startsFrom);
  startsTo.setDate(startsTo.getDate() + RESCHEDULE_LOOKAHEAD_DAYS);

  return {
    startsFrom: startsFrom.toISOString(),
    startsTo: startsTo.toISOString(),
  };
}

type ApiMutationError = {
  message?: string;
  response?: {
    data?: {
      detail?: string | Array<{ msg?: string }>;
    };
  };
};

function getMutationErrorMessage(error: unknown) {
  if (!error) {
    return null;
  }

  const apiError = error as ApiMutationError;
  const detail = apiError.response?.data?.detail;
  if (typeof detail === "string") {
    return detail;
  }
  if (Array.isArray(detail)) {
    return detail
      .map((item) => item.msg)
      .filter(Boolean)
      .join(", ");
  }
  return apiError.message ?? "Action failed.";
}

function validateStudentEditForm({ fullName, email }: { fullName: string; email: string }) {
  if (!fullName.trim()) {
    return "Name is required";
  }

  if (!email.trim()) {
    return "Email is required";
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    return "Enter a valid email";
  }

  return null;
}

function validatePaymentForm({ amount, paidAt }: { amount: string; paidAt: string }) {
  const parsedAmount = Number(amount);

  if (!amount.trim() || !Number.isFinite(parsedAmount) || parsedAmount <= 0) {
    return "Enter a payment amount";
  }

  if (!paidAt || Number.isNaN(new Date(paidAt).getTime())) {
    return "Choose a paid date";
  }

  return null;
}

function validateAccessGrantForm({
  grantType,
  packageId,
  durationDays,
}: {
  grantType: StudentAccessGrantType;
  packageId: string;
  durationDays: string;
}) {
  if (grantType === "package" && !packageId) {
    return "Choose a package";
  }

  if (durationDays) {
    const parsedDays = Number(durationDays);
    if (!Number.isInteger(parsedDays) || parsedDays <= 0) {
      return "Days must be a positive whole number";
    }
  }

  if (grantType !== "package" && !durationDays) {
    return "Enter access days";
  }

  return null;
}

function formatClassOwner(classSession: ClassSessionRead, student: AdminStudentRead) {
  if (classSession.program_type === "one_on_one") {
    return student.assigned_teacher?.teacher.id === classSession.teacher_id
      ? student.assigned_teacher.teacher.display_name
      : (classSession.teacher_id ?? "No teacher");
  }

  const batchLabel = classSession.batch_slot ? formatBatchSlot(classSession.batch_slot) : "Batch";
  return classSession.batch_group_id ? `${batchLabel} batch` : batchLabel;
}

function formatBatchSlot(value: NonNullable<ClassSessionRead["batch_slot"]>) {
  return {
    morning: "Morning",
    noon: "Noon",
    afternoon: "Afternoon",
  }[value];
}

function getBookingTone(value: BookingStatus) {
  return {
    booked: "brand",
    cancelled: "danger",
    attended: "default",
    missed: "danger",
  }[value] as "default" | "danger" | "brand";
}

function getClassStatusTone(value: ClassSessionStatus | undefined) {
  if (value === "cancelled") {
    return "danger";
  }

  if (value === "scheduled") {
    return "brand";
  }

  return "default";
}

function formatPayment(payment: AdminStudentPaymentRead) {
  return `${formatCurrencyMinor(payment.amount_paid, payment.currency)} - ${formatDate(payment.paid_at)}`;
}

function formatPaymentMethod(value: AdminStudentPaymentRead["payment_method"]) {
  return {
    upi: "UPI",
    cash: "Cash",
    bank_transfer: "Bank transfer",
    other: "Other",
  }[value];
}

function formatAccessGrant(grant: AdminStudentAccessGrantRead) {
  return `${formatAccessGrantType(grant.grant_type)} - ${grant.duration_days} days`;
}

function formatAccessGrantType(value: AdminStudentAccessGrantRead["grant_type"]) {
  return {
    package: "Package",
    addon_days: "Addon days",
    manual_adjustment: "Manual",
  }[value];
}

function createFinanceBriefing(payments: AdminStudentPaymentRead[]): FinanceBriefing {
  const totalPaid = payments.reduce((total, payment) => total + payment.amount_paid, 0);
  const latestPayment = payments[0];

  return {
    totalPaid: formatCurrencyMinor(totalPaid, latestPayment?.currency ?? "INR"),
    latestDate: latestPayment ? formatCompactDate(latestPayment.paid_at) : "-",
    latestMethod: latestPayment ? formatPaymentMethod(latestPayment.payment_method) : "-",
    count: payments.length,
  };
}

function formatCurrencyMinor(amount: number, currency: string) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
  }).format(amount / 100);
}

function formatMinorCurrencyInput(amount: number) {
  return (amount / 100).toFixed(2);
}

function createPackageMap(packages: PackageRead[]) {
  return new Map(packages.map((item) => [item.id, item]));
}

function createBatchGroupMap(batchGroups: BatchGroupRead[]) {
  return new Map(batchGroups.map((item) => [item.id, item]));
}

function getPaymentPackageLabel(packageId: string | null, packageMap: Map<string, PackageRead>) {
  if (!packageId) {
    return "Standalone payment";
  }

  return packageMap.get(packageId)?.name ?? "Package linked";
}

function getAccessGrantPackageLabel(
  grant: AdminStudentAccessGrantRead,
  packageMap: Map<string, PackageRead>,
) {
  if (grant.package_id) {
    return packageMap.get(grant.package_id)?.name ?? "Package linked";
  }

  if (grant.grant_type === "addon_days") {
    return "Add-on";
  }

  return "Manual grant";
}

function getVisibleRecordNote(note: string | null) {
  if (!note || note.toLowerCase().startsWith("ui seed")) {
    return null;
  }

  return note;
}

function createPackageOptions(packages: PackageRead[]) {
  return packages.map((item) => ({
    value: item.id,
    label: `${item.name} · ${formatCurrencyMinor(item.price_amount, item.currency)}`,
  }));
}

function toMinorCurrencyUnit(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.round(parsed * 100) : 0;
}

function getLocalDateTimeInputValue(date: Date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function localDateTimeInputToIso(value: string) {
  return new Date(value).toISOString();
}
