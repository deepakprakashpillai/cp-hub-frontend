import { afterEach, describe, expect, it, vi } from "vitest";

import { api } from "@/api/http";
import {
  cancelTeacherBatchClassSession,
  createBookingNote,
  listTeacherStudents,
  markClassAttendance,
  rescheduleTeacherBatchClassSession,
} from "@/features/teacher/api";
import {
  listStudentBatchScheduleDays,
  listStudentFeedbacks,
} from "@/features/student/api";

afterEach(() => vi.restoreAllMocks());

describe("portal API adapters", () => {
  it("sends teacher attendance in the portal route's records envelope", async () => {
    const post = vi.spyOn(api, "post").mockResolvedValue({ data: [] } as never);

    await markClassAttendance("class-1", [{ booking_id: "booking-1", status: "attended" }]);

    expect(post).toHaveBeenCalledWith("/teacher/me/classes/class-1/attendance", {
      records: [{ booking_id: "booking-1", status: "attended" }],
    });
  });

  it("does not send teacher identity when creating a teacher-owned note", async () => {
    const post = vi.spyOn(api, "post").mockResolvedValue({ data: { id: "note-1" } } as never);

    await createBookingNote({ booking_id: "booking-1", note: "Helpful progress", visibility: "student_visible" });

    expect(post).toHaveBeenCalledWith("/teacher/bookings/booking-1/notes", {
      note: "Helpful progress",
      visibility: "student_visible",
    });
  });

  it("loads the teacher-owned student list without a teacher ID in the URL", async () => {
    const get = vi.spyOn(api, "get").mockResolvedValue({ data: { items: [], total: 0, page: 1, page_size: 100 } } as never);

    await expect(listTeacherStudents()).resolves.toMatchObject({ items: [], total: 0 });

    expect(get).toHaveBeenCalledWith("/teacher/me/students", { params: { page_size: 100 } });
  });

  it("uses teacher-owned endpoints for a batch session time change and cancellation", async () => {
    const patch = vi.spyOn(api, "patch").mockResolvedValue({ data: { id: "class-1" } } as never);
    const post = vi.spyOn(api, "post").mockResolvedValue({ data: { id: "class-1" } } as never);

    await rescheduleTeacherBatchClassSession({
      classSessionId: "class-1",
      startsAt: "2026-07-28T10:00:00.000Z",
      endsAt: "2026-07-28T11:00:00.000Z",
      reason: "Running late",
    });
    await cancelTeacherBatchClassSession({ classSessionId: "class-1", reason: "Emergency" });

    expect(patch).toHaveBeenCalledWith("/teacher/me/classes/class-1/schedule", {
      starts_at: "2026-07-28T10:00:00.000Z",
      ends_at: "2026-07-28T11:00:00.000Z",
      reason: "Running late",
    });
    expect(post).toHaveBeenCalledWith("/teacher/me/classes/class-1/cancel", { reason: "Emergency" });
  });

  it("uses the backend's array responses for student batch days and feedbacks", async () => {
    const get = vi.spyOn(api, "get")
      .mockResolvedValueOnce({ data: [{ id: "day-1" }] } as never)
      .mockResolvedValueOnce({ data: [{ id: "note-1" }] } as never);

    await expect(listStudentBatchScheduleDays()).resolves.toEqual([{ id: "day-1" }]);
    await expect(listStudentFeedbacks()).resolves.toEqual([{ id: "note-1" }]);
    expect(get).toHaveBeenNthCalledWith(1, "/student/me/batch-schedule-days");
    expect(get).toHaveBeenNthCalledWith(2, "/student/me/feedbacks");
  });
});
