import { useState } from "react";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Plus, X } from "lucide-react";
import { Link, useParams, useSearchParams } from "react-router";

import { DebouncedSearchInput } from "@/components/ui/DebouncedSearchInput";
import { Modal } from "@/components/ui/Modal";
import { QuietLabel } from "@/components/ui/QuietLabel";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { AdminDetailPanel } from "@/features/admin/AdminDetailPrimitives";
import {
  getAdminClassSession,
  addAdminStudentToClass,
  cancelAdminBooking,
  listAdminClassActivity,
  listAdminClassRoster,
  listAdminStudents,
  type AdminClassRosterBookingRead,
  type ClassSessionRead,
} from "@/features/admin/api";
import { cn } from "@/lib/utils";

type SessionTab = "overview" | "roster" | "activity";
const tabs: Array<{ value: SessionTab; label: string }> = [
  { value: "overview", label: "Overview" },
  { value: "roster", label: "Students" },
  { value: "activity", label: "Activity" },
];

export function AdminScheduleDetailPage() {
  const { classSessionId = "" } = useParams();
  const [params, setParams] = useSearchParams();
  const tab = parseTab(params.get("tab"));
  const sessionQuery = useQuery({ queryKey: ["admin", "classes", classSessionId], queryFn: () => getAdminClassSession(classSessionId), enabled: Boolean(classSessionId) });
  const rosterQuery = useInfiniteQuery({ queryKey: ["admin", "classes", classSessionId, "roster", "detail"], queryFn: ({ pageParam }) => listAdminClassRoster({ classSessionId, page: pageParam, pageSize: 25 }), initialPageParam: 1, getNextPageParam: (lastPage) => lastPage.page * lastPage.page_size < lastPage.total ? lastPage.page + 1 : undefined, enabled: Boolean(classSessionId) && tab === "roster" });
  const activityQuery = useInfiniteQuery({ queryKey: ["admin", "classes", classSessionId, "activity"], queryFn: ({ pageParam }) => listAdminClassActivity({ classSessionId, page: pageParam, pageSize: 25 }), initialPageParam: 1, getNextPageParam: (lastPage) => lastPage.page * lastPage.page_size < lastPage.total ? lastPage.page + 1 : undefined, enabled: Boolean(classSessionId) && tab === "activity" });
  const session = sessionQuery.data;
  const queryClient = useQueryClient();
  const [addStudentOpen, setAddStudentOpen] = useState(false);

  function chooseTab(nextTab: SessionTab) {
    const next = new URLSearchParams(params);
    if (nextTab === "overview") next.delete("tab"); else next.set("tab", nextTab);
    setParams(next, { replace: true });
  }

  if (sessionQuery.isLoading) return <SessionSkeleton />;
  if (sessionQuery.isError || !session) return <section className="rounded-md border border-danger bg-surface p-4 text-sm font-medium text-danger">Session could not be loaded.</section>;

  return <section className="space-y-4">
    <Link to="/admin/schedule" className="inline-flex h-8 items-center gap-2 rounded-md px-2 text-xs font-medium text-muted transition hover:bg-surface-subtle hover:text-primary"><ArrowLeft className="h-3.5 w-3.5" />Schedule</Link>
    <SessionHeader session={session} />
    <div className="-mt-2 grid gap-x-4 gap-y-3 xl:grid-cols-[minmax(0,1fr)_18rem]">
      <main className="min-w-0 space-y-4">
        <nav className="flex flex-wrap gap-1 border-b border-border">{tabs.map((item) => <button key={item.value} type="button" onClick={() => chooseTab(item.value)} className={cn("relative h-9 px-2 text-xs font-medium transition", tab === item.value ? "text-primary" : "text-muted hover:text-primary")}>{item.label}{tab === item.value ? <span className="absolute inset-x-2 bottom-[-1px] h-px bg-brand" /> : null}</button>)}</nav>
        {tab === "overview" ? <SessionOverview session={session} /> : null}
        {tab === "roster" ? <SessionRoster session={session} items={rosterQuery.data?.pages.flatMap((page) => page.items) ?? []} isLoading={rosterQuery.isLoading} isError={rosterQuery.isError} hasMore={rosterQuery.hasNextPage} isLoadingMore={rosterQuery.isFetchingNextPage} onLoadMore={() => void rosterQuery.fetchNextPage()} onAdd={() => setAddStudentOpen(true)} onRemoved={() => { void queryClient.invalidateQueries({ queryKey: ["admin", "classes", classSessionId] }); }} /> : null}
        {tab === "activity" ? <SessionActivity items={activityQuery.data?.pages.flatMap((page) => page.items) ?? []} isLoading={activityQuery.isLoading} isError={activityQuery.isError} hasMore={activityQuery.hasNextPage} isLoadingMore={activityQuery.isFetchingNextPage} onLoadMore={() => void activityQuery.fetchNextPage()} /> : null}
      </main>
      <SessionSummary session={session} />
    </div>
    {addStudentOpen ? <AddStudentToSessionModal classSessionId={classSessionId} onClose={() => setAddStudentOpen(false)} /> : null}
  </section>;
}

function SessionHeader({ session }: { session: ClassSessionRead }) {
  const title = session.program_type === "one_on_one" ? session.primary_student?.full_name ?? "1-on-1 session" : session.batch_group?.name ?? "Batch session";
  return <header className="flex flex-col gap-3 border-b border-border pb-3 sm:flex-row sm:items-start sm:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h1 className="truncate text-lg font-semibold leading-tight text-primary">{title}</h1><SessionStatus status={session.status} /></div><p className="mt-1 text-xs text-muted">{session.program_type === "one_on_one" ? session.primary_student?.email ?? "1-on-1 learner" : "Batch class"} · {formatDateTime(session.starts_at)}</p></div></header>;
}

function SessionOverview({ session }: { session: ClassSessionRead }) {
  return <div className="space-y-3"><AdminDetailPanel title="Session briefing"><div className="grid gap-3 sm:grid-cols-3"><Signal label="When" value={formatDateTime(session.starts_at)} /><Signal label="Teacher" value={session.teacher?.display_name ?? "Unassigned"} /><Signal label="Capacity" value={`${session.capacity} seats`} /></div></AdminDetailPanel><AdminDetailPanel title="Attendance"><p className="text-sm text-muted">{session.status === "scheduled" && new Date(session.starts_at) <= new Date() ? "Attendance is due for this session." : session.status === "completed" ? "Attendance is complete." : "Attendance becomes available once the session starts."}</p></AdminDetailPanel></div>;
}

function SessionRoster({ session, items, isLoading, isError, hasMore, isLoadingMore, onLoadMore, onAdd, onRemoved }: { session: ClassSessionRead; items: AdminClassRosterBookingRead[]; isLoading: boolean; isError: boolean; hasMore: boolean; isLoadingMore: boolean; onLoadMore: () => void; onAdd: () => void; onRemoved: () => void }) {
  if (isLoading) return <RowsSkeleton />;
  if (isError) return <AdminDetailPanel title="Students"><p className="text-sm font-medium text-danger">Students could not be loaded.</p></AdminDetailPanel>;
  const filled = (session.booking_counts?.booked ?? 0) + (session.booking_counts?.attended ?? 0) + (session.booking_counts?.missed ?? 0);
  const canAdd = session.status === "scheduled" && filled < session.capacity;
  return <AdminDetailPanel title="Students"><div className="space-y-2"><div className="flex items-center justify-between gap-3 border-b border-border pb-2"><QuietLabel>{filled} / {session.capacity} filled</QuietLabel>{canAdd ? <button type="button" onClick={onAdd} className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-xs font-medium text-muted transition hover:bg-surface-subtle hover:text-primary"><Plus className="h-3.5 w-3.5" />Add student</button> : <QuietLabel>{filled >= session.capacity ? "Full" : "Roster locked"}</QuietLabel>}</div>{items.map((booking) => <RosterStudentRow key={booking.id} booking={booking} canRemove={session.status === "scheduled" && booking.status === "booked"} onRemoved={onRemoved} />)}{!items.length ? <p className="text-sm text-muted">No students booked yet.</p> : null}{hasMore ? <LoadMore loading={isLoadingMore} onClick={onLoadMore} label="Load more students" /> : null}</div></AdminDetailPanel>;
}

function RosterStudentRow({ booking, canRemove, onRemoved }: { booking: AdminClassRosterBookingRead; canRemove: boolean; onRemoved: () => void }) {
  const [confirming, setConfirming] = useState(false);
  const cancel = useMutation({ mutationFn: () => cancelAdminBooking({ bookingId: booking.id, reason: "Removed from class roster" }), onSuccess: () => { onRemoved(); setConfirming(false); } });
  return <div className="flex items-center justify-between gap-3 rounded-md bg-surface-subtle/65 px-3 py-2"><div className="min-w-0"><p className="truncate text-sm font-medium text-primary">{booking.student.full_name}</p><p className="mt-1 truncate text-xs text-muted">{booking.student.email}</p></div><div className="flex shrink-0 items-center gap-1"><SessionStatus status={booking.status} />{canRemove ? confirming ? <><button type="button" disabled={cancel.isPending} onClick={() => cancel.mutate()} className="h-7 rounded-md px-2 text-xs font-medium text-danger hover:bg-danger/10 disabled:opacity-50">Remove</button><button type="button" disabled={cancel.isPending} onClick={() => setConfirming(false)} className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted hover:bg-surface"><X className="h-3.5 w-3.5" /></button></> : <button type="button" onClick={() => setConfirming(true)} className="h-7 rounded-md px-2 text-xs font-medium text-muted hover:bg-surface hover:text-danger">Remove</button> : null}</div>{cancel.isError ? <p className="sr-only">Student could not be removed.</p> : null}</div>;
}

function AddStudentToSessionModal({ classSessionId, onClose }: { classSessionId: string; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const queryClient = useQueryClient();
  const students = useQuery({ queryKey: ["admin", "students", "session-add", query], queryFn: () => listAdminStudents({ q: query || undefined, status: "active", pageSize: 10 }), enabled: query.trim().length >= 2 });
  const add = useMutation({ mutationFn: (studentId: string) => addAdminStudentToClass({ classSessionId, studentId }), onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ["admin", "classes", classSessionId] }); onClose(); } });
  return <Modal title="Add student" isOpen onClose={onClose}><div className="space-y-3"><DebouncedSearchInput value={query} onChange={setQuery} placeholder="Search students" /><p className="text-xs text-muted">Search by name, email, or phone. Eligible students can be added even if their usual program differs.</p>{query.trim().length < 2 ? <p className="text-xs text-muted">Enter at least 2 characters to search.</p> : null}{students.isLoading ? <div className="space-y-2">{Array.from({ length: 3 }).map((_, index) => <div key={index} className="h-12 animate-pulse rounded-md bg-surface-subtle" />)}</div> : null}{students.data?.items.map((item) => <button key={item.student.id} type="button" disabled={add.isPending} onClick={() => add.mutate(item.student.id)} className="flex w-full items-center justify-between gap-3 rounded-md bg-surface-subtle/65 px-3 py-2 text-left hover:bg-surface-subtle disabled:opacity-50"><span className="min-w-0"><span className="block truncate text-sm font-medium text-primary">{item.user.full_name}</span><span className="mt-1 block truncate text-xs text-muted">{item.user.email}</span></span><Plus className="h-3.5 w-3.5 shrink-0 text-muted" /></button>)}{students.isError || add.isError ? <p className="text-xs text-danger">The student could not be added. Check their access and schedule, then try again.</p> : null}</div></Modal>;
}

function SessionActivity({ items, isLoading, isError, hasMore, isLoadingMore, onLoadMore }: { items: Array<{ id: string; event_type: string; reason: string; created_at: string; actor_label: string; actor: { role: string } | null; student: { full_name: string } | null }>; isLoading: boolean; isError: boolean; hasMore: boolean; isLoadingMore: boolean; onLoadMore: () => void }) {
  if (isLoading) return <RowsSkeleton />;
  if (isError) return <AdminDetailPanel title="Activity"><p className="text-sm font-medium text-danger">Session activity could not be loaded.</p></AdminDetailPanel>;
  return <AdminDetailPanel title="Activity"><div className="space-y-1.5">{items.map((event) => <div key={event.id} className="rounded-md bg-surface-subtle/65 px-3 py-1.5"><div className="flex min-w-0 items-center gap-3"><p className="shrink-0 text-xs font-medium text-primary">{formatEvent(event.event_type)}</p><p className="min-w-0 flex-1 truncate text-xs text-muted">{event.student?.full_name ?? "Session-wide"}</p><QuietLabel>{event.actor_label}</QuietLabel><span className="shrink-0 text-[11px] text-muted">{formatDateTime(event.created_at)}</span></div>{event.reason ? <p className="mt-1 truncate text-[11px] text-muted">{event.reason}</p> : null}</div>)}{!items.length ? <p className="text-sm text-muted">No session activity yet.</p> : null}{hasMore ? <LoadMore loading={isLoadingMore} onClick={onLoadMore} label="Load more activity" /> : null}</div></AdminDetailPanel>;
}

function SessionSummary({ session }: { session: ClassSessionRead }) { return <aside className="space-y-3"><AdminDetailPanel title="Summary"><div className="space-y-3"><SummaryRow label="Program" value={session.program_type === "one_on_one" ? "1-on-1" : "Batch"} /><SummaryRow label="Teacher" value={session.teacher?.display_name ?? "Unassigned"} />{session.program_type === "one_on_one" ? <SummaryRow label="Student" value={session.primary_student?.full_name ?? "—"} /> : <SummaryRow label="Batch group" value={session.batch_group?.name ?? "—"} />}<SummaryRow label="Starts" value={formatDateTime(session.starts_at)} /><SummaryRow label="Ends" value={formatDateTime(session.ends_at)} /><SummaryRow label="Capacity" value={`${session.capacity} seats`} /></div></AdminDetailPanel></aside>; }
function Signal({ label, value }: { label: string; value: string }) { return <div><p className="text-[11px] font-medium text-muted">{label}</p><p className="mt-1 text-sm font-medium text-primary">{value}</p></div>; }
function SummaryRow({ label, value }: { label: string; value: string }) { return <div><p className="text-[11px] font-medium text-muted">{label}</p><p className="mt-1 truncate text-sm font-medium text-primary">{value}</p></div>; }
function SessionStatus({ status }: { status: string }) { return <StatusBadge tone={status === "cancelled" ? "rose" : status === "completed" || status === "attended" ? "green" : status === "missed" ? "amber" : "indigo"}>{status === "booked" ? "Booked" : status.charAt(0).toUpperCase() + status.slice(1)}</StatusBadge>; }
function SessionSkeleton() { return <section className="space-y-4"><div className="h-8 w-24 animate-pulse rounded-md bg-surface-subtle" /><div className="h-16 animate-pulse rounded-md bg-surface-subtle" /><div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_18rem]"><div className="h-64 animate-pulse rounded-md bg-surface-subtle" /><div className="h-52 animate-pulse rounded-md bg-surface-subtle" /></div></section>; }
function RowsSkeleton() { return <AdminDetailPanel title="Loading"><div className="space-y-2">{Array.from({ length: 5 }).map((_, index) => <div key={index} className="h-12 animate-pulse rounded-md bg-surface-subtle" />)}</div></AdminDetailPanel>; }
function LoadMore({ loading, onClick, label }: { loading: boolean; onClick: () => void; label: string }) { return <button type="button" disabled={loading} onClick={onClick} className="mt-2 h-7 rounded-md px-2 text-xs font-medium text-muted transition hover:bg-surface-subtle hover:text-primary disabled:opacity-50">{loading ? "Loading…" : label}</button>; }
function parseTab(value: string | null): SessionTab { return value === "roster" || value === "activity" ? value : "overview"; }
function formatDateTime(value: string) { return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)); }
function formatEvent(value: string) { return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase()); }
