import axios from "axios";
import { afterEach, describe, expect, it, vi } from "vitest";
import { api } from "@/api/http";
import { findUserByEmail, linkAdminAsTeacher, type UserRead } from "@/features/admin/api";

const admin: UserRead = { id: "admin-a", full_name: "Admin A", email: "a@example.com", phone: null, role: "admin", roles: ["admin"], is_active: true, created_at: "", updated_at: "" };
const payload = { fullName: "Admin A", displayName: "Teacher A", email: "a@example.com" };
afterEach(() => vi.restoreAllMocks());

describe("teacher onboarding for existing admin accounts", () => {
  it("looks up the exact email and treats only a 404 as absent", async () => {
    const get = vi.spyOn(api, "get").mockResolvedValueOnce({ data: { user: admin, teacher_id: null } });
    expect((await findUserByEmail(" a@example.com "))?.user.id).toBe(admin.id);
    expect(get).toHaveBeenCalledWith("/admin/users/lookup", { params: { email: "a@example.com" } });
    get.mockRejectedValueOnce(new axios.AxiosError("missing", "404", undefined, undefined, { status: 404 } as never));
    expect(await findUserByEmail("missing@example.com")).toBeNull();
    get.mockRejectedValueOnce(new Error("network"));
    await expect(findUserByEmail("a@example.com")).rejects.toThrow("network");
  });

  it("uses the atomic endpoint and trusts its profile-existed result", async () => {
    const post = vi.spyOn(api, "post").mockResolvedValue({ data: { user: admin, teacher: { id: "teacher-a" }, profile_already_existed: true } });
    const result = await linkAdminAsTeacher(admin, payload);
    expect(post).toHaveBeenCalledWith("/admin/teachers/link-existing", expect.objectContaining({ user_id: admin.id, display_name: "Teacher A" }));
    expect(result.alreadyExisted).toBe(true);
    expect(result.teacher.id).toBe("teacher-a");
  });

  it("propagates a failed atomic link without claiming partial success", async () => {
    vi.spyOn(api, "post").mockRejectedValue(new Error("failed"));
    await expect(linkAdminAsTeacher(admin, payload)).rejects.toThrow("failed");
  });
});
