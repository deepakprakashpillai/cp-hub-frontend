import type {
  AvailabilitySlotStatus,
  ClassSessionStatus,
  DayOfWeek,
  StudentProgramType,
} from "@/features/admin/api";

export const weekdays: Array<{ value: DayOfWeek; label: string }> = [
  { value: "monday", label: "Monday" },
  { value: "tuesday", label: "Tuesday" },
  { value: "wednesday", label: "Wednesday" },
  { value: "thursday", label: "Thursday" },
  { value: "friday", label: "Friday" },
  { value: "saturday", label: "Saturday" },
  { value: "sunday", label: "Sunday" },
];

const weekdayIndex: Record<DayOfWeek, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

const dayForIndex = Object.entries(weekdayIndex).reduce<Record<number, DayOfWeek>>(
  (result, [day, index]) => ({ ...result, [index]: day as DayOfWeek }),
  {},
);

const dateFormatter = new Intl.DateTimeFormat(undefined, { dateStyle: "medium" });
const dateTimeFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
});
const timeFormatter = new Intl.DateTimeFormat(undefined, { timeStyle: "short" });

export function formatDate(value: string | null) {
  return value ? dateFormatter.format(new Date(value)) : "-";
}

export function formatDateTime(value: string | null) {
  return value ? dateTimeFormatter.format(new Date(value)) : "-";
}

export function formatTime(value: string | null) {
  return value ? timeFormatter.format(new Date(value)) : "-";
}

export function formatProgram(value: StudentProgramType) {
  return value === "one_on_one" ? "1-on-1" : "Batch";
}

export function formatClassStatus(value: ClassSessionStatus) {
  return value === "scheduled" ? "Scheduled" : value === "completed" ? "Completed" : "Cancelled";
}

export function formatSlotStatus(value: AvailabilitySlotStatus) {
  return value.slice(0, 1).toUpperCase() + value.slice(1);
}

export function localDateTimeToIso(value: string) {
  return new Date(value).toISOString();
}

export function localInputValue(value: string) {
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

/** Converts a local recurring weekday/time into the UTC weekday/time format used by the API. */
export function localRuleToUtc(day: DayOfWeek, localTime: string) {
  const [hours, minutes] = localTime.split(":").map(Number);
  const reference = new Date(2024, 0, 7 + weekdayIndex[day], hours, minutes, 0, 0);
  const utcDay = dayForIndex[reference.getUTCDay()];
  return {
    day: utcDay,
    time: `${String(reference.getUTCHours()).padStart(2, "0")}:${String(reference.getUTCMinutes()).padStart(2, "0")}:00`,
  };
}

export function utcRuleToLocal(day: DayOfWeek, utcTime: string) {
  const [hours, minutes] = utcTime.slice(0, 5).split(":").map(Number);
  const reference = new Date(Date.UTC(2024, 0, 7 + weekdayIndex[day], hours, minutes, 0, 0));
  return {
    day: dayForIndex[reference.getDay()],
    time: `${String(reference.getHours()).padStart(2, "0")}:${String(reference.getMinutes()).padStart(2, "0")}`,
  };
}

export function browserTimeZone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

export function getErrorMessage(error: unknown) {
  if (typeof error === "object" && error && "response" in error) {
    const response = (error as { response?: { data?: { detail?: unknown } } }).response;
    const detail = response?.data?.detail;
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail))
      return detail
        .map((item) => item?.msg)
        .filter(Boolean)
        .join(", ");
  }
  return error instanceof Error ? error.message : "Something went wrong. Please try again.";
}
