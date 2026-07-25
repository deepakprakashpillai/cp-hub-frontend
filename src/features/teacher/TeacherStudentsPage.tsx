import { useState } from "react";
import { UsersRound, Layers, Mail, Phone } from "lucide-react";
import { useActiveTeacher } from "@/features/teacher/teacher-store";
import { DebouncedSearchInput } from "@/components/ui/DebouncedSearchInput";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { PageHeader } from "@/components/layout/PageHeader";
import { cn } from "@/lib/utils";

type StudentItem = {
  id: string;
  status: string;
  user: { id: string; full_name: string; email: string; phone: string | null };
};

type StudentTab = "one_on_one" | "batches";

export function TeacherStudentsPage() {
  const { activeTeacher, isLoading } = useActiveTeacher();
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<StudentTab>("one_on_one");

  const oneOnOneAssignments: StudentItem[] = activeTeacher?.permanent_one_on_one_students ?? [];

  const filteredStudents = oneOnOneAssignments.filter((s: StudentItem) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      s.user.full_name.toLowerCase().includes(q) ||
      s.user.email.toLowerCase().includes(q) ||
      (s.user.phone && s.user.phone.includes(q))
    );
  });

  return (
    <section className="space-y-5">
      {/* Header */}
      <PageHeader title="My Students" />

      {/* Tabs & Search */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between border-b border-border">
        <nav className="flex flex-wrap gap-1">
          <button
            type="button"
            onClick={() => setActiveTab("one_on_one")}
            className={cn(
              "relative inline-flex items-center gap-2 h-9 px-2 text-xs font-medium transition whitespace-nowrap",
              activeTab === "one_on_one"
                ? "text-primary"
                : "text-muted hover:text-primary",
            )}
          >
            <span>1-on-1 Assigned Students ({oneOnOneAssignments.length})</span>
            {activeTab === "one_on_one" ? (
              <span className="absolute inset-x-2 bottom-[-1px] h-px bg-brand" />
            ) : null}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("batches")}
            className={cn(
              "relative inline-flex items-center gap-2 h-9 px-2 text-xs font-medium transition whitespace-nowrap",
              activeTab === "batches"
                ? "text-primary"
                : "text-muted hover:text-primary",
            )}
          >
            <span>Batch Roster</span>
            {activeTab === "batches" ? (
              <span className="absolute inset-x-2 bottom-[-1px] h-px bg-brand" />
            ) : null}
          </button>
        </nav>

        <div className="w-full sm:w-64 pb-1">
          <DebouncedSearchInput value={search} onChange={setSearch} placeholder="Search students..." />
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="py-12 text-center text-xs text-muted">Loading assigned students...</div>
      ) : activeTab === "one_on_one" ? (
        filteredStudents.length === 0 ? (
          <div className="rounded-md border border-border bg-surface p-8 text-center space-y-3">
            <UsersRound className="mx-auto h-10 w-10 text-muted/50" />
            <h3 className="text-sm font-semibold text-primary">No 1-on-1 students assigned</h3>
            <p className="text-xs text-muted max-w-md mx-auto">
              Permanent one-on-one student assignments assigned by admin will be surfaced here.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredStudents.map((st: StudentItem) => (
              <div key={st.id} className="rounded-md border border-border bg-surface p-4 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-brand/10 text-brand">1-on-1</span>
                  <StatusBadge tone={st.status === "active" || st.status === "enrolled" ? "green" : "neutral"}>
                    {st.status}
                  </StatusBadge>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-primary">{st.user.full_name}</h4>
                  <div className="mt-1 space-y-0.5 text-xs text-muted">
                    <p className="flex items-center gap-1.5 truncate">
                      <Mail className="h-3 w-3 shrink-0" /> {st.user.email}
                    </p>
                    {st.user.phone && (
                      <p className="flex items-center gap-1.5">
                        <Phone className="h-3 w-3 shrink-0" /> {st.user.phone}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        <div className="rounded-md border border-border bg-surface p-8 text-center space-y-3">
          <Layers className="mx-auto h-10 w-10 text-muted/50" />
          <h3 className="text-sm font-semibold text-primary">Batch roster management</h3>
          <p className="text-xs text-muted max-w-md mx-auto">
            View student rosters for your scheduled batch sessions in the Classes & Schedule page.
          </p>
        </div>
      )}
    </section>
  );
}
