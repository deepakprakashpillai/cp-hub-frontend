import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Clock, Plus, Sparkles, Ban, Trash2, AlertTriangle, CheckCircle2, X } from "lucide-react";
import { useActiveTeacher } from "@/features/teacher/teacher-store";
import {
  listTeacherRules,
  createTeacherRule,
  deleteTeacherRule,
  listTeacherSlots,
  blockTeacherTime,
  generateTeacherSlots,
  type TeacherAvailabilityRuleRead,
} from "@/features/teacher/api";
import { weekdays, localRuleToUtc, getErrorMessage } from "@/features/admin/teachers/teacher-utils";
import type { DayOfWeek } from "@/features/admin/api";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Modal } from "@/components/ui/Modal";
import { PageHeader } from "@/components/layout/PageHeader";
import { FilterSelect } from "@/components/ui/FilterSelect";
import { Callout } from "@/components/ui/Callout";
import { WeeklyAvailabilityVisualGrid } from "@/features/teacher/WeeklyAvailabilityVisualGrid";
import { cn } from "@/lib/utils";

type AvailabilityTab = "grid" | "rules" | "slots";

export function TeacherAvailabilityPage() {
  const queryClient = useQueryClient();
  const { activeTeacherId } = useActiveTeacher();
  const [activeTab, setActiveTab] = useState<AvailabilityTab>("grid");

  // Requirement 37: Generation Feedback notification state
  const [generationNotification, setGenerationNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Requirement 36: Rule Deletion Confirmation state
  const [ruleToDelete, setRuleToDelete] = useState<TeacherAvailabilityRuleRead | null>(null);

  // Rule creation modal state
  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  type RuleFormValues = {
    day: DayOfWeek;
    start: string;
    end: string;
    duration: string;
  };

  const { register: registerRule, handleSubmit: handleRuleSubmit, reset: resetRule, control: controlRule, formState: { isSubmitting: isSubmittingRule } } = useForm<RuleFormValues>({
    defaultValues: { day: "monday", start: "09:00", end: "13:00", duration: "60" }
  });

  // Block time modal state
  const [isBlockModalOpen, setIsBlockModalOpen] = useState(false);

  type BlockFormValues = {
    start: string;
    end: string;
    reason: string;
  };

  const { register: registerBlock, handleSubmit: handleBlockSubmit, reset: resetBlock, formState: { isSubmitting: isSubmittingBlock } } = useForm<BlockFormValues>({
    defaultValues: { start: "", end: "", reason: "" }
  });

  // Queries
  const { data: rulesData, isLoading: isRulesLoading } = useQuery({
    queryKey: ["teacher", activeTeacherId, "rules"],
    queryFn: () => listTeacherRules(),
    enabled: Boolean(activeTeacherId),
  });

  const { data: slotsData, isLoading: isSlotsLoading } = useQuery({
    queryKey: ["teacher", activeTeacherId, "slots"],
    queryFn: () => listTeacherSlots({}),
    enabled: Boolean(activeTeacherId),
  });

  const rules = rulesData?.items ?? [];
  const slots = slotsData?.items ?? [];

  // Mutations
  const createRuleMutation = useMutation({
    mutationFn: async (data: RuleFormValues) => {
      setFormError(null);
      const startUtc = localRuleToUtc(data.day, data.start);
      const endUtc = localRuleToUtc(data.day, data.end);
      return createTeacherRule({
        day_of_week: startUtc.day,
        start_time_utc: startUtc.time,
        end_time_utc: endUtc.time,
        slot_duration_minutes: Number(data.duration),
      });
    },
    onSuccess: () => {
      setIsRuleModalOpen(false);
      resetRule();
      queryClient.invalidateQueries({ queryKey: ["teacher", activeTeacherId] });
    },
    onError: (err) => setFormError(getErrorMessage(err)),
  });

  const deleteRuleMutation = useMutation({
    mutationFn: (ruleId: string) => deleteTeacherRule(ruleId),
    onSuccess: () => {
      setRuleToDelete(null);
      queryClient.invalidateQueries({ queryKey: ["teacher", activeTeacherId] });
    },
  });

  // Requirement 37: Add toast / notification after clicking Generate Slots
  const generateSlotsMutation = useMutation({
    mutationFn: () => generateTeacherSlots(),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["teacher", activeTeacherId] });
      const count = res.slots_created;
      setGenerationNotification({
        type: "success",
        message: count ? `Successfully generated ${count} availability slots for the next 14 days!` : "Successfully generated availability slots for the next 14 days."
      });
      setTimeout(() => setGenerationNotification(null), 6000);
    },
    onError: (err) => {
      setGenerationNotification({
        type: "error",
        message: `Slot generation failed: ${getErrorMessage(err)}`
      });
    }
  });

  const blockTimeMutation = useMutation({
    mutationFn: async (data: BlockFormValues) => {
      return blockTeacherTime({
        starts_at: new Date(data.start).toISOString(),
        ends_at: new Date(data.end).toISOString(),
        reason: data.reason,
      });
    },
    onSuccess: () => {
      setIsBlockModalOpen(false);
      resetBlock();
      queryClient.invalidateQueries({ queryKey: ["teacher", activeTeacherId] });
    },
    onError: (err) => setFormError(getErrorMessage(err)),
  });

  return (
    <section className="space-y-5">
      {/* Requirement 34: Header with Primary Blockout Action alongside Generate & Add Rule */}
      <PageHeader
        title="Availability & Schedule Rules"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setFormError(null);
                setIsBlockModalOpen(true);
              }}
              className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md border border-border bg-surface px-2.5 text-xs font-medium text-danger hover:bg-surface-subtle transition"
            >
              <Ban className="h-3.5 w-3.5" />
              Block Time / Leave
            </button>

            <button
              type="button"
              disabled={generateSlotsMutation.isPending || !activeTeacherId}
              onClick={() => {
                setGenerationNotification(null);
                generateSlotsMutation.mutate();
              }}
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

      {/* Requirement 37: Generation Feedback Toast / Notification Banner */}
      {generationNotification && (
        <div
          className={cn(
            "flex items-center justify-between gap-3 rounded-lg border p-3.5 text-xs shadow-sm transition",
            generationNotification.type === "success"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
              : "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300"
          )}
        >
          <div className="flex items-center gap-2">
            {generationNotification.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
            ) : (
              <AlertTriangle className="h-4 w-4 shrink-0 text-rose-500" />
            )}
            <span className="font-medium">{generationNotification.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setGenerationNotification(null)}
            className="rounded p-1 hover:bg-surface/40 transition"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Navigation Tabs */}
      <nav className="flex flex-wrap gap-1 border-b border-border">
        <button
          type="button"
          onClick={() => setActiveTab("grid")}
          className={cn(
            "relative h-9 px-3 text-xs font-medium transition",
            activeTab === "grid" ? "text-primary font-semibold" : "text-muted hover:text-primary"
          )}
        >
          Visual Weekly Grid
          {activeTab === "grid" ? (
            <span className="absolute inset-x-2 bottom-[-1px] h-px bg-brand" />
          ) : null}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("rules")}
          className={cn(
            "relative h-9 px-3 text-xs font-medium transition",
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
            "relative h-9 px-3 text-xs font-medium transition",
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
      {activeTab === "grid" ? (
        <WeeklyAvailabilityVisualGrid
          rules={rules}
          slots={slots}
          isLoading={isRulesLoading || isSlotsLoading}
          onAddRuleClick={() => {
            setFormError(null);
            setIsRuleModalOpen(true);
          }}
        />
      ) : activeTab === "rules" ? (
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
                {/* Requirement 36: Trigger Confirmation modal before deleting */}
                <button
                  type="button"
                  onClick={() => setRuleToDelete(rule)}
                  className="h-8 w-8 inline-grid place-items-center rounded-md border border-border text-muted hover:text-danger hover:bg-surface-subtle transition"
                  title="Delete Rule"
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
                <div key={slot.id} className="p-3.5 flex items-center justify-between text-xs">
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

      {/* Requirement 36: Rule Deletion Confirmation Modal */}
      {ruleToDelete && (
        <Modal
          title="Confirm Rule Deletion"
          isOpen={Boolean(ruleToDelete)}
          onClose={() => setRuleToDelete(null)}
        >
          <div className="space-y-4 pt-2">
            <p className="text-xs text-primary leading-relaxed">
              Are you sure you want to delete the recurring availability rule for{" "}
              <strong className="capitalize">{ruleToDelete.day_of_week} ({ruleToDelete.start_time_utc.slice(0, 5)} - {ruleToDelete.end_time_utc.slice(0, 5)} UTC)</strong>?
              This will not delete existing generated slots, but future generations will exclude this window.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRuleToDelete(null)}
                className="h-8 px-3 text-xs font-medium rounded-md border border-border text-primary hover:bg-surface-subtle transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleteRuleMutation.isPending}
                onClick={() => deleteRuleMutation.mutate(ruleToDelete.id)}
                className="h-8 px-3 text-xs font-medium rounded-md bg-danger text-white hover:opacity-90 disabled:opacity-50 transition"
              >
                {deleteRuleMutation.isPending ? "Deleting..." : "Delete Rule"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Add Rule Modal */}
      {isRuleModalOpen && (
        <Modal title="Add Recurring Availability Rule" isOpen={isRuleModalOpen} onClose={() => setIsRuleModalOpen(false)}>
          <form onSubmit={handleRuleSubmit((data) => createRuleMutation.mutate(data))} className="space-y-4 pt-2">
            {formError && <Callout tone="danger" title="Error">{formError}</Callout>}

            <div>
              <label className="text-xs font-medium text-primary block mb-1">Day of Week</label>
              <Controller
                control={controlRule}
                name="day"
                render={({ field }) => (
                  <FilterSelect
                    value={field.value}
                    onChange={field.onChange}
                    options={weekdays.map(w => ({ value: w.value, label: w.label }))}
                    includeAll={false}
                    className="w-full"
                    triggerClassName="w-full h-9"
                  />
                )}
              />
            </div>

            {/* Requirement 35: Custom Time Picker - Consistent time inputs styling */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-primary">Start Time (Local)</label>
                <input
                  type="time"
                  {...registerRule("start")}
                  className="mt-1 h-9 w-full rounded-md border border-border bg-surface px-3 py-1.5 text-xs text-primary focus:outline-none focus:ring-1 focus:ring-brand transition dark:[color-scheme:dark]"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-primary">End Time (Local)</label>
                <input
                  type="time"
                  {...registerRule("end")}
                  className="mt-1 h-9 w-full rounded-md border border-border bg-surface px-3 py-1.5 text-xs text-primary focus:outline-none focus:ring-1 focus:ring-brand transition dark:[color-scheme:dark]"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-primary block mb-1">Slot Duration (Minutes)</label>
              <Controller
                control={controlRule}
                name="duration"
                render={({ field }) => (
                  <FilterSelect
                    value={field.value}
                    onChange={field.onChange}
                    options={[
                      { value: "30", label: "30 minutes" },
                      { value: "45", label: "45 minutes" },
                      { value: "60", label: "60 minutes" },
                      { value: "90", label: "90 minutes" }
                    ]}
                    includeAll={false}
                    className="w-full"
                    triggerClassName="w-full h-9"
                  />
                )}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsRuleModalOpen(false)}
                className="h-8 px-3 text-xs font-medium rounded-md border border-border text-primary hover:bg-surface-subtle"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmittingRule || createRuleMutation.isPending}
                className="h-8 px-3 text-xs font-medium rounded-md bg-brand text-white hover:opacity-90 disabled:opacity-50"
              >
                Save Rule
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Block Time Modal */}
      {isBlockModalOpen && (
        <Modal title="Block Time / Request Vacation" isOpen={isBlockModalOpen} onClose={() => setIsBlockModalOpen(false)}>
          <form onSubmit={handleBlockSubmit((data) => blockTimeMutation.mutate(data))} className="space-y-4 pt-2">
            {formError && <Callout tone="danger" title="Error">{formError}</Callout>}

            {/* Requirement 35: Custom Time Picker - Consistent datetime input styling */}
            <div>
              <label className="text-xs font-medium text-primary">Starts At</label>
              <input
                type="datetime-local"
                {...registerBlock("start", { required: true })}
                className="mt-1 h-9 w-full rounded-md border border-border bg-surface px-3 py-1.5 text-xs text-primary focus:outline-none focus:ring-1 focus:ring-brand transition dark:[color-scheme:dark]"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-primary">Ends At</label>
              <input
                type="datetime-local"
                {...registerBlock("end", { required: true })}
                className="mt-1 h-9 w-full rounded-md border border-border bg-surface px-3 py-1.5 text-xs text-primary focus:outline-none focus:ring-1 focus:ring-brand transition dark:[color-scheme:dark]"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-primary">Reason</label>
              <input
                type="text"
                {...registerBlock("reason", { required: true })}
                placeholder="Leave / Vacation / Medical"
                className="mt-1 h-9 w-full rounded-md border border-border bg-surface px-3 py-1.5 text-xs text-primary placeholder:text-muted/60 focus:outline-none focus:ring-1 focus:ring-brand transition"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsBlockModalOpen(false)}
                className="h-8 px-3 text-xs font-medium rounded-md border border-border text-primary hover:bg-surface-subtle"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmittingBlock || blockTimeMutation.isPending}
                className="h-8 px-3 text-xs font-medium rounded-md bg-danger text-white hover:opacity-90 disabled:opacity-50"
              >
                Confirm Blockout
              </button>
            </div>
          </form>
        </Modal>
      )}
    </section>
  );
}
