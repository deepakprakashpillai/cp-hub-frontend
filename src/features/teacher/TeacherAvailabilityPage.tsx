import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Clock, Plus, Sparkles, Calendar, Ban, Trash2 } from "lucide-react";
import { useActiveTeacher } from "@/features/teacher/teacher-store";
import {
  listTeacherRules,
  createTeacherRule,
  deleteTeacherRule,
  listTeacherSlots,
  blockTeacherTime,
  generateTeacherSlots,
} from "@/features/teacher/api";
import { weekdays, localRuleToUtc, getErrorMessage } from "@/features/admin/teachers/teacher-utils";
import type { DayOfWeek } from "@/features/admin/api";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Modal } from "@/components/ui/Modal";
import { PageHeader } from "@/components/layout/PageHeader";
import { cn } from "@/lib/utils";

type AvailabilityTab = "rules" | "slots";

export function TeacherAvailabilityPage() {
  const queryClient = useQueryClient();
  const { activeTeacherId } = useActiveTeacher();
  const [activeTab, setActiveTab] = useState<AvailabilityTab>("rules");

  // Rule creation modal state
  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
  const [ruleDay, setRuleDay] = useState<DayOfWeek>("monday");
  const [ruleStart, setRuleStart] = useState("09:00");
  const [ruleEnd, setRuleEnd] = useState("13:00");
  const [ruleDuration, setRuleDuration] = useState("60");
  const [formError, setFormError] = useState<string | null>(null);

  // Block time modal state
  const [isBlockModalOpen, setIsBlockModalOpen] = useState(false);
  const [blockStart, setBlockStart] = useState("");
  const [blockEnd, setBlockEnd] = useState("");
  const [blockReason, setBlockReason] = useState("");

  // Queries
  const { data: rulesData, isLoading: isRulesLoading } = useQuery({
    queryKey: ["teacher", activeTeacherId, "rules"],
    queryFn: () => listTeacherRules(activeTeacherId!),
    enabled: Boolean(activeTeacherId),
  });

  const { data: slotsData, isLoading: isSlotsLoading } = useQuery({
    queryKey: ["teacher", activeTeacherId, "slots"],
    queryFn: () => listTeacherSlots({ teacherId: activeTeacherId! }),
    enabled: Boolean(activeTeacherId),
  });

  const rules = rulesData?.items ?? [];
  const slots = slotsData?.items ?? [];

  // Mutations
  const createRuleMutation = useMutation({
    mutationFn: async () => {
      setFormError(null);
      const startUtc = localRuleToUtc(ruleDay, ruleStart);
      const endUtc = localRuleToUtc(ruleDay, ruleEnd);
      return createTeacherRule({
        teacher_id: activeTeacherId!,
        day_of_week: startUtc.day,
        start_time_utc: startUtc.time,
        end_time_utc: endUtc.time,
        slot_duration_minutes: Number(ruleDuration),
      });
    },
    onSuccess: () => {
      setIsRuleModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ["teacher", activeTeacherId] });
    },
    onError: (err) => setFormError(getErrorMessage(err)),
  });

  const deleteRuleMutation = useMutation({
    mutationFn: (ruleId: string) => deleteTeacherRule(ruleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teacher", activeTeacherId] });
    },
  });

  const generateSlotsMutation = useMutation({
    mutationFn: () => generateTeacherSlots(activeTeacherId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teacher", activeTeacherId] });
    },
  });

  const blockTimeMutation = useMutation({
    mutationFn: async () => {
      return blockTeacherTime({
        teacher_id: activeTeacherId!,
        starts_at: new Date(blockStart).toISOString(),
        ends_at: new Date(blockEnd).toISOString(),
        reason: blockReason,
      });
    },
    onSuccess: () => {
      setIsBlockModalOpen(false);
      setBlockStart("");
      setBlockEnd("");
      setBlockReason("");
      queryClient.invalidateQueries({ queryKey: ["teacher", activeTeacherId] });
    },
    onError: (err) => setFormError(getErrorMessage(err)),
  });

  return (
    <section className="space-y-5">
      {/* Header */}
      <PageHeader
        title="Availability & Schedule Rules"
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={generateSlotsMutation.isPending || !activeTeacherId}
              onClick={() => generateSlotsMutation.mutate()}
              className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md border border-border bg-surface px-2.5 text-xs font-medium text-primary transition hover:bg-surface-subtle disabled:opacity-50"
            >
              <Sparkles className="h-3.5 w-3.5 text-brand" />
              {generateSlotsMutation.isPending ? "Generating..." : "Generate Slots (14 Days)"}
            </button>
            <button
              type="button"
              onClick={() => {
                setFormError(null);
                setIsRuleModalOpen(true);
              }}
              className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md bg-brand px-3 text-xs font-medium text-white transition hover:opacity-90"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Rule
            </button>
          </div>
        }
      />

      {/* Admin Parity Navigation Tabs */}
      <nav className="flex flex-wrap gap-1 border-b border-border">
        <button
          type="button"
          onClick={() => setActiveTab("rules")}
          className={cn(
            "relative h-9 px-2 text-xs font-medium transition",
            activeTab === "rules" ? "text-primary font-semibold" : "text-muted hover:text-primary"
          )}
        >
          Weekly Recurring Rules ({rules.length})
          {activeTab === "rules" ? (
            <span className="absolute inset-x-2 bottom-[-1px] h-px bg-brand" />
          ) : null}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("slots")}
          className={cn(
            "relative h-9 px-2 text-xs font-medium transition",
            activeTab === "slots" ? "text-primary font-semibold" : "text-muted hover:text-primary"
          )}
        >
          Date-Specific Slots & Blockouts ({slots.length})
          {activeTab === "slots" ? (
            <span className="absolute inset-x-2 bottom-[-1px] h-px bg-brand" />
          ) : null}
        </button>
      </nav>

      {/* Tab Contents */}
      {activeTab === "rules" ? (
        isRulesLoading ? (
          <div className="py-12 text-center text-xs text-muted">Loading availability rules...</div>
        ) : rules.length === 0 ? (
          <div className="rounded-md border border-border bg-surface p-8 text-center space-y-3">
            <Clock className="mx-auto h-10 w-10 text-muted/50" />
            <h3 className="text-sm font-semibold text-primary">No recurring availability rules configured</h3>
            <p className="text-xs text-muted max-w-md mx-auto">
              Set up weekly recurring slots (e.g. Mon-Fri 09:00 - 13:00 UTC) to allow automated slot generation.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {rules.map((rule) => (
              <div key={rule.id} className="rounded-md border border-border bg-surface p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold capitalize text-primary">{rule.day_of_week}</p>
                  <p className="mt-1 text-sm font-bold text-primary">
                    {rule.start_time_utc.slice(0, 5)} - {rule.end_time_utc.slice(0, 5)} UTC
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted">{rule.slot_duration_minutes} min slot duration</p>
                </div>
                <button
                  type="button"
                  onClick={() => deleteRuleMutation.mutate(rule.id)}
                  className="h-8 w-8 inline-grid place-items-center rounded border border-border text-muted hover:text-rose-600 hover:bg-surface-subtle"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )
      ) : isSlotsLoading ? (
        <div className="py-12 text-center text-xs text-muted">Loading availability slots...</div>
      ) : (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => {
                setFormError(null);
                setIsBlockModalOpen(true);
              }}
              className="inline-flex h-8 items-center gap-1.5 rounded border border-rose-500/30 bg-rose-500/10 px-3 text-xs font-medium text-rose-600 hover:bg-rose-500/20"
            >
              <Ban className="h-3.5 w-3.5" /> Block Time / Leave
            </button>
          </div>

          {slots.length === 0 ? (
            <div className="rounded-md border border-border bg-surface p-8 text-center space-y-3">
              <Ban className="mx-auto h-10 w-10 text-muted/50" />
              <h3 className="text-sm font-semibold text-primary">No manual slots or blockouts</h3>
              <p className="text-xs text-muted max-w-md mx-auto">
                Generated slots and blockouts will appear here.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border rounded-md border border-border bg-surface">
              {slots.map((slot) => (
                <div key={slot.id} className="p-3 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-semibold text-primary">
                      {new Date(slot.starts_at).toLocaleString()} - {new Date(slot.ends_at).toLocaleTimeString()}
                    </span>
                    <span className="ml-2 text-muted uppercase text-[10px]">({slot.source})</span>
                  </div>
                  <StatusBadge tone={slot.status === "available" ? "green" : slot.status === "booked" ? "indigo" : "rose"}>
                    {slot.status}
                  </StatusBadge>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add Rule Modal */}
      {isRuleModalOpen && (
        <Modal title="Add Recurring Availability Rule" isOpen={isRuleModalOpen} onClose={() => setIsRuleModalOpen(false)}>
          <div className="space-y-4 pt-2">
            {formError && <div className="rounded bg-rose-500/10 p-2 text-xs text-rose-600">{formError}</div>}

            <div>
              <label className="text-xs font-medium text-primary">Day of Week</label>
              <select
                value={ruleDay}
                onChange={(e) => setRuleDay(e.target.value as DayOfWeek)}
                className="mt-1 w-full rounded-md border border-border bg-surface p-2 text-xs text-primary"
              >
                {weekdays.map((w) => (
                  <option key={w.value} value={w.value}>
                    {w.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-primary">Start Time (Local)</label>
                <input
                  type="time"
                  value={ruleStart}
                  onChange={(e) => setRuleStart(e.target.value)}
                  className="mt-1 w-full rounded-md border border-border bg-surface p-2 text-xs text-primary"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-primary">End Time (Local)</label>
                <input
                  type="time"
                  value={ruleEnd}
                  onChange={(e) => setRuleEnd(e.target.value)}
                  className="mt-1 w-full rounded-md border border-border bg-surface p-2 text-xs text-primary"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-primary">Slot Duration (Minutes)</label>
              <select
                value={ruleDuration}
                onChange={(e) => setRuleDuration(e.target.value)}
                className="mt-1 w-full rounded-md border border-border bg-surface p-2 text-xs text-primary"
              >
                <option value="30">30 minutes</option>
                <option value="45">45 minutes</option>
                <option value="60">60 minutes</option>
                <option value="90">90 minutes</option>
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsRuleModalOpen(false)}
                className="h-8 px-3 text-xs font-medium rounded border border-border text-primary hover:bg-surface-subtle"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={createRuleMutation.isPending}
                onClick={() => createRuleMutation.mutate()}
                className="h-8 px-3 text-xs font-medium rounded bg-brand text-white hover:opacity-90 disabled:opacity-50"
              >
                Save Rule
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Block Time Modal */}
      {isBlockModalOpen && (
        <Modal title="Block Time / Request Vacation" isOpen={isBlockModalOpen} onClose={() => setIsBlockModalOpen(false)}>
          <div className="space-y-4 pt-2">
            {formError && <div className="rounded bg-rose-500/10 p-2 text-xs text-rose-600">{formError}</div>}

            <div>
              <label className="text-xs font-medium text-primary">Starts At</label>
              <input
                type="datetime-local"
                value={blockStart}
                onChange={(e) => setBlockStart(e.target.value)}
                className="mt-1 w-full rounded-md border border-border bg-surface p-2 text-xs text-primary"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-primary">Ends At</label>
              <input
                type="datetime-local"
                value={blockEnd}
                onChange={(e) => setBlockEnd(e.target.value)}
                className="mt-1 w-full rounded-md border border-border bg-surface p-2 text-xs text-primary"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-primary">Reason</label>
              <input
                type="text"
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value)}
                placeholder="Leave / Vacation / Medical"
                className="mt-1 w-full rounded-md border border-border bg-surface p-2 text-xs text-primary"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsBlockModalOpen(false)}
                className="h-8 px-3 text-xs font-medium rounded border border-border text-primary hover:bg-surface-subtle"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!blockStart || !blockEnd || blockTimeMutation.isPending}
                onClick={() => blockTimeMutation.mutate()}
                className="h-8 px-3 text-xs font-medium rounded bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50"
              >
                Confirm Blockout
              </button>
            </div>
          </div>
        </Modal>
      )}
    </section>
  );
}
