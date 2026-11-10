import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { api } from "@/api/http";
import { AuthContext } from "@/features/auth/auth-context";
import { CreateTeacherModal } from "./AdminTeachersPage";

const account = { id: "admin-a", full_name: "Admin A", email: "a@example.com", phone: null, role: "admin" as const, roles: ["admin" as const], is_active: true, created_at: "", updated_at: "" };
afterEach(() => vi.restoreAllMocks());

describe("Add teacher", () => {
  it("asks before giving the signed-in admin teacher access", async () => {
    vi.spyOn(api, "get").mockResolvedValueOnce({ data: { user: account, teacher_id: null } });
    const put = vi.spyOn(api, "put").mockResolvedValue({ data: {} });
    const post = vi.spyOn(api, "post").mockResolvedValue({ data: { user: account, teacher: { id: "teacher-a", user_id: account.id }, profile_already_existed: false } });
    const onStep = vi.fn();
    render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><AuthContext.Provider value={{ user: account, isLoading: false, isAuthenticated: true, startSession: vi.fn(), signOut: vi.fn() }}><MemoryRouter><CreateTeacherModal step="profile" onboardingTeacherId={null} open onClose={vi.fn()} onStep={onStep} onFinished={vi.fn()} /></MemoryRouter></AuthContext.Provider></QueryClientProvider>);
    const user = userEvent.setup();
    await user.type(screen.getByLabelText("Full name"), "Admin A");
    await user.type(screen.getByLabelText("Email"), "a@example.com");
    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(await screen.findByText("This is your admin account.")).toBeTruthy();
    expect(put).not.toHaveBeenCalled();
    expect(post).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Confirm and continue" }));
    await waitFor(() => expect(onStep).toHaveBeenCalledWith("availability", "teacher-a"));
    expect(put).not.toHaveBeenCalled();
    expect(post).toHaveBeenCalledWith("/admin/teachers/link-existing", expect.objectContaining({ user_id: account.id }));
  });
});
