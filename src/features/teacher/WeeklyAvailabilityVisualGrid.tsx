import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Info } from "lucide-react";
import type { TeacherAvailabilityRuleRead, TeacherAvailabilitySlotRead } from "@/features/teacher/api";
import { cn } from "@/lib/utils";

const DAY_NAMES = [
  { key: "monday", label: "Mon" },
  { key: "tuesday", label: "Tue" },
  { key: "wednesday", label: "Wed" },
  { key: "thursday", label: "Thu" },
  { key: "friday", label: "Fri" },
  { key: "saturday", label: "Sat" },
  { key: "sunday", label: "Sun" },
];

export function WeeklyAvailabilityVisualGrid({
  rules,
  slots,
  isLoading,
  onAddRuleClick,
}: {
  rules: TeacherAvailabilityRuleRead[];
  slots: TeacherAvailabilitySlotRead[];
  isLoading?: boolean;
  onAddRuleClick?: () => void;
}) {
  const [weekOffset, setWeekOffset] = useState(0);

  // Requirement 31: Dynamic Grid Hours based on teacher's earliest and latest rules & slots
  const hours = useMemo(() => {
    let earliest = 24;
    let latest = 0;
    let found = false;

    rules.forEach((r) => {
      const startH = parseInt(r.start_time_utc.split(":")[0], 10);
      const endParts = r.end_time_utc.split(":");
      let endH = parseInt(endParts[0], 10);
      if (parseInt(endParts[1] || "0", 10) > 0) {
        endH += 1;
      }
      if (!isNaN(startH)) {
        earliest = Math.min(earliest, startH);
        found = true;
      }
      if (!isNaN(endH)) {
        latest = Math.max(latest, endH);
        found = true;
      }
    });

    slots.forEach((s) => {
      const sDate = new Date(s.starts_at);
      const eDate = new Date(s.ends_at);
      const sH = sDate.getUTCHours();
      let eH = eDate.getUTCHours();
      if (eDate.getUTCMinutes() > 0) eH += 1;
      earliest = Math.min(earliest, sH);
      latest = Math.max(latest, eH);
      found = true;
    });

    let minH = 7;
    let maxH = 20;

    if (found && earliest < latest) {
      minH = earliest;
      maxH = Math.max(earliest + 1, latest);
    }

    return Array.from({ length: maxH - minH }, (_, i) => minH + i);
  }, [rules, slots]);

  // Calculate Monday of current week + weekOffset
  const currentWeekDays = useMemo(() => {
    const d = new Date();
    const day = d.getDay();
    const diffToMon = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
    const monday = new Date(d.setDate(diffToMon + weekOffset * 7));
    monday.setHours(0, 0, 0, 0);

    return DAY_NAMES.map((dn, idx) => {
      const date = new Date(monday);
      date.setDate(monday.getDate() + idx);
      return {
        key: dn.key,
        label: dn.label,
        dateStr: date.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
        isoDate: date.toISOString().split("T")[0],
        dateObj: date,
      };
    });
  }, [weekOffset]);

  const weekRangeText = useMemo(() => {
    const start = currentWeekDays[0].dateStr;
    const end = currentWeekDays[6].dateStr;
    const year = currentWeekDays[0].dateObj.getFullYear();
    return `${start} - ${end}, ${year}`;
  }, [currentWeekDays]);

  if (isLoading) {
    return (
      <div className="rounded-md border border-border bg-surface p-8 text-center text-xs text-muted">
        Loading weekly visual grid...
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-5 shadow-sm space-y-5">
      {/* Header controls & legend */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 rounded-md border border-border bg-surface-subtle p-1">
            <button
              type="button"
              onClick={() => setWeekOffset((w) => w - 1)}
              title="Previous Week"
              className="grid h-7 w-7 place-items-center rounded hover:bg-surface text-primary transition"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setWeekOffset(0)}
              className="px-2 text-xs font-semibold text-primary hover:text-brand transition"
            >
              This Week
            </button>
            <button
              type="button"
              onClick={() => setWeekOffset((w) => w + 1)}
              title="Next Week"
              className="grid h-7 w-7 place-items-center rounded hover:bg-surface text-primary transition"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <span className="text-xs font-semibold text-primary">{weekRangeText}</span>
        </div>

        {/* Requirement 32: Legend Spacing - Compact visual grid legend into a single horizontal row on desktop */}
        <div className="flex flex-wrap lg:flex-nowrap items-center gap-3 lg:gap-4 text-xs whitespace-nowrap">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-brand" />
            <span className="text-muted">Recurring Rule</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-500" />
            <span className="text-muted">Available Slot</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-indigo-500" />
            <span className="text-muted">Booked</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-rose-500" />
            <span className="text-muted">Blocked / Leave</span>
          </div>
        </div>
      </div>

      {/* Visual Weekly Grid Layout */}
      <div className="overflow-x-auto rounded-lg border border-border shadow-sm">
        <div className="min-w-[720px]">
          {/* Header Row: Days */}
          <div className="grid grid-cols-[4rem_repeat(7,minmax(0,1fr))] border-b border-border bg-surface-subtle text-center">
            <div className="p-2.5 text-[11px] font-medium text-muted border-r border-border flex items-center justify-center bg-surface/50">Time</div>
            {currentWeekDays.map((d) => (
              <div key={d.key} className="p-2 border-r border-border last:border-r-0">
                <p className="text-xs font-semibold text-primary uppercase tracking-wide">{d.label}</p>
                <p className="text-[11px] text-muted">{d.dateStr}</p>
              </div>
            ))}
          </div>

          {/* Grid Rows by Dynamic Hours */}
          <div className="divide-y divide-border">
            {hours.map((hour) => {
              const hourFormatted = `${hour.toString().padStart(2, "0")}:00`;

              return (
                <div key={hour} className="grid grid-cols-[4rem_repeat(7,minmax(0,1fr))] min-h-[48px]">
                  {/* Hour label */}
                  <div className="p-2.5 text-center text-[11px] font-medium text-muted border-r border-border bg-surface/50 flex items-center justify-center">
                    {hourFormatted}
                  </div>

                  {/* Day cells */}
                  {currentWeekDays.map((day) => {
                    // Match recurring rules for this day of week & hour
                    const dayRules = rules.filter((r) => {
                      if (r.day_of_week.toLowerCase() !== day.key) return false;
                      const startH = parseInt(r.start_time_utc.split(":")[0], 10);
                      const endH = parseInt(r.end_time_utc.split(":")[0], 10);
                      return hour >= startH && hour < endH;
                    });

                    // Match date-specific slots for this day & hour
                    const daySlots = slots.filter((s) => {
                      const sDate = new Date(s.starts_at);
                      const isoDate = sDate.toISOString().split("T")[0];
                      if (isoDate !== day.isoDate) return false;
                      const sHour = sDate.getUTCHours();
                      return sHour === hour;
                    });

                    const hasContent = dayRules.length > 0 || daySlots.length > 0;

                    return (
                      <div
                        key={day.key}
                        className={cn(
                          "p-1 border-r border-border last:border-r-0 relative flex flex-col gap-1 min-h-[48px]",
                          hasContent ? "bg-surface" : "bg-surface/30 hover:bg-surface-subtle/40 transition"
                        )}
                      >
                        {/* Render Recurring Rules */}
                        {dayRules.map((rule) => {
                          const ruleTooltip = `Recurring Rule: ${rule.day_of_week.toUpperCase()}\nTime: ${rule.start_time_utc.slice(0, 5)} - ${rule.end_time_utc.slice(0, 5)} UTC\nSlot Duration: ${rule.slot_duration_minutes} minutes`;
                          return (
                            <div
                              key={rule.id}
                              className="group relative rounded-md border border-l-2 border-brand bg-surface px-2 py-1.5 text-[11px] text-primary font-medium leading-tight shadow-sm transition hover:shadow"
                              title={ruleTooltip}
                            >
                              <span className="block font-semibold">Rule</span>
                              <span>
                                {rule.start_time_utc.slice(0, 5)}-{rule.end_time_utc.slice(0, 5)}
                              </span>
                            </div>
                          );
                        })}

                        {/* Requirement 33: Grid Tooltips - Native title tooltips & hover cards showing exact times and attendee names */}
                        {daySlots.map((slot) => {
                          const startFormatted = new Date(slot.starts_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
                          const endFormatted = new Date(slot.ends_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
                          const attendeeName =
                            slot.student_name ||
                            slot.attendee_name ||
                            slot.student?.full_name ||
                            (slot.status === "booked" ? "Booked Student" : "No Attendee (Available)");
                          const slotTooltip = `Slot: ${slot.status.toUpperCase()}\nTime: ${startFormatted} - ${endFormatted} UTC\nAttendee: ${attendeeName}\nSource: ${slot.source}`;

                          return (
                            <div
                              key={slot.id}
                              className={cn(
                                "group relative rounded-md border border-l-2 bg-surface px-2 py-1.5 text-[11px] font-medium leading-tight shadow-sm transition hover:shadow cursor-pointer",
                                slot.status === "available"
                                  ? "border-emerald-500 text-emerald-600"
                                  : slot.status === "booked"
                                  ? "border-indigo-500 text-indigo-600"
                                  : "border-rose-500 text-danger"
                              )}
                              title={slotTooltip}
                            >
                              <span className="block font-semibold capitalize">{slot.status}</span>
                              <span className="text-[10px] opacity-85 block">{startFormatted} - {endFormatted}</span>
                              {slot.student_name || slot.attendee_name ? (
                                <span className="text-[10px] font-medium truncate block text-primary mt-0.5">
                                  {slot.student_name || slot.attendee_name}
                                </span>
                              ) : null}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Footer Info / Add Rule hint */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2 border-t border-border pt-3 text-xs text-muted">
        <div className="flex items-center gap-1.5">
          <Info className="h-3.5 w-3.5 text-brand" />
          <span>Grid displays time in UTC hours ({hours[0]}:00 - {hours[hours.length - 1] + 1}:00). Recurring rules dynamically generate upcoming 14-day slots.</span>
        </div>
        {onAddRuleClick && (
          <button
            type="button"
            onClick={onAddRuleClick}
            className="text-xs font-semibold text-brand hover:underline"
          >
            + Add New Recurring Rule
          </button>
        )}
      </div>
    </div>
  );
}
