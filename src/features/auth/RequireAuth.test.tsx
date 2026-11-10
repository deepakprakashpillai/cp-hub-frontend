import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { describe, expect, it } from "vitest";

import { AuthContext, type AuthContextValue } from "@/features/auth/auth-context";
import { RequireAuth } from "@/features/auth/RequireAuth";
import { homeForRole, loginDestination } from "@/features/auth/roles";

const signedOutContext: AuthContextValue = {
  user: null,
  isLoading: false,
  isAuthenticated: false,
  startSession: () => undefined,
  signOut: async () => undefined,
};

function renderProtected(context: AuthContextValue, initialPath = "/student") {
  return render(
    <AuthContext.Provider value={context}>
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path="/student" element={<RequireAuth roles={["student"]}><p>student portal</p></RequireAuth>} />
          <Route path="/login" element={<p>login page</p>} />
          <Route path="/admin" element={<p>admin portal</p>} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  );
}

describe("RequireAuth", () => {
  it("sends an unauthenticated portal visitor to sign in", () => {
    renderProtected(signedOutContext);
    expect(screen.getByText("login page")).toBeTruthy();
  });

  it("allows a user with the student role in their role list", () => {
    renderProtected({ ...signedOutContext, user: { id: "1", full_name: "User", email: "test@example.com", role: "admin", roles: ["admin", "student"] }, isAuthenticated: true });
    expect(screen.getByText("student portal")).toBeTruthy();
  });

  it("sends a signed-in user to their own portal when the role is not allowed", () => {
    renderProtected({
      ...signedOutContext,
      user: { id: "admin-user", full_name: "Admin", email: "admin@example.com", role: "admin" },
      isAuthenticated: true,
    });
    expect(screen.getByText("admin portal")).toBeTruthy();
  });
});

describe("homeForRole", () => {
  it("returns the correct landing route for every supported role", () => {
    expect(homeForRole("admin")).toBe("/admin");
    expect(homeForRole("teacher")).toBe("/teacher");
    expect(homeForRole("student")).toBe("/student");
    expect(homeForRole("lead_manager")).toBe("/leads");
  });
});


describe("portal sign-in destinations", () => {
  const dualRole = { id: "1", full_name: "Teacher Admin", email: "test@example.com", role: "admin" as const, roles: ["admin", "teacher"] as ("admin" | "teacher")[] };
  it("opens the portal selected by a multi-role user", () => {
    expect(loginDestination(dualRole, true)).toBe("/admin");
    expect(loginDestination(dualRole, false)).toBe("/teacher");
    expect(loginDestination(dualRole, false, "/teacher/classes?view=all")).toBe("/teacher/classes?view=all");
    expect(loginDestination(dualRole, false, "/admin")).toBe("/teacher");
  });
  it("rejects a portal for which the user has no role, including legacy responses", () => {
    const legacy = { ...dualRole, roles: undefined };
    expect(loginDestination(legacy, false)).toBeNull();
    expect(loginDestination(legacy, true)).toBe("/admin");
    expect(loginDestination({ ...dualRole, roles: ["teacher"] }, true)).toBeNull();
  });
});
