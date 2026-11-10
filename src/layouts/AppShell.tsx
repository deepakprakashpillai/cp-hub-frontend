import {
  BarChart3,
  Bell,
  CalendarDays,
  CircleDollarSign,
  Clock,
  GraduationCap,
  LayoutDashboard,
  Menu,
  MessageSquare,
  Settings,
  Sparkles,
  UsersRound,
  X,
  LogOut,
  type LucideIcon,
} from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { NavLink, Outlet, useLocation } from "react-router";

import logoUrl from "@/assets/logo.png";
import { cn } from "@/lib/utils";
import { useAuth } from "@/features/auth/auth-context";
import { useNavigate } from "react-router";
import { getUnreadNotificationCount } from "@/features/notifications/api";

type RailLink = {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
  notification?: boolean;
};

const adminLinks: RailLink[] = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/admin/students", label: "Students", icon: GraduationCap },
  { to: "/admin/teachers", label: "Teachers", icon: UsersRound },
  { to: "/admin/schedule", label: "Schedule", icon: CalendarDays },
  { to: "/admin/programs", label: "Batches", icon: BarChart3 },
  { to: "/admin/payments", label: "Finance", icon: CircleDollarSign },
  { to: "/admin/leads", label: "Leads", icon: Sparkles },
  { to: "/admin/notifications", label: "Notifications", icon: Bell, notification: true },
  { to: "/admin/settings", label: "Settings", icon: Settings },
];

const teacherLinks: RailLink[] = [
  { to: "/teacher", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/teacher/classes", label: "Classes & Schedule", icon: CalendarDays },
  { to: "/teacher/availability", label: "Availability", icon: Clock },
  { to: "/teacher/students", label: "My Students", icon: UsersRound },
  { to: "/teacher/notifications", label: "Notifications", icon: Bell, notification: true },
  { to: "/teacher/settings", label: "Settings", icon: Settings },
];

const studentLinks: RailLink[] = [
  { to: "/student", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/student/schedule", label: "Schedule a Class", icon: CalendarDays },
  { to: "/student/classes", label: "My Classes", icon: Clock },
  { to: "/student/feedbacks", label: "Feedbacks", icon: MessageSquare },
  { to: "/student/notifications", label: "Notifications", icon: Bell, notification: true },
  { to: "/student/settings", label: "Settings", icon: Settings },
];

const portalLinks: RailLink[] = [
  { to: "/admin", label: "Admin", icon: LayoutDashboard },
  { to: "/teacher", label: "Teacher", icon: UsersRound },
  { to: "/student", label: "Student", icon: GraduationCap },
  { to: "/leads", label: "Leads", icon: Sparkles },
];

export function AppShell() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const isAdminWorkspace = location.pathname.startsWith("/admin");
  const isTeacherWorkspace = location.pathname.startsWith("/teacher");
  const isStudentWorkspace = location.pathname.startsWith("/student");
  const isStandaloneLeadsWorkspace = location.pathname.startsWith("/leads");
  const isNotificationRole =
    user?.role === "admin" || user?.role === "teacher" || user?.role === "student";
  const unreadQuery = useQuery({
    queryKey: ["notifications", "unread-count"],
    queryFn: getUnreadNotificationCount,
    enabled: isNotificationRole,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });
  const notificationPath = isAdminWorkspace
    ? "/admin/notifications"
    : isTeacherWorkspace
      ? "/teacher/notifications"
      : "/student/notifications";

  let links = portalLinks;
  let workspaceLabel = "Development portals";
  if (isAdminWorkspace) {
    links = adminLinks;
    workspaceLabel = "Admin workspace";
  } else if (isTeacherWorkspace) {
    links = teacherLinks;
    workspaceLabel = "Teacher workspace";
  } else if (isStudentWorkspace) {
    links = studentLinks;
    workspaceLabel = "Student workspace";
  }

  return (
    <div className="min-h-screen bg-background text-primary">
      <div
        className={cn(
          "min-h-screen",
          !isStandaloneLeadsWorkspace && "lg:grid lg:grid-cols-[16rem_minmax(0,1fr)]",
        )}
      >
        {!isStandaloneLeadsWorkspace ? (
          <aside className="sticky top-0 hidden h-screen flex-col border-r border-border bg-surface px-4 py-4 lg:flex">
            <WorkspaceRail
              workspaceLabel={workspaceLabel}
              links={links}
              unreadCount={unreadQuery.data ?? 0}
              userName={user?.full_name}
              onSignOut={async () => {
                await signOut();
                navigate(isAdminWorkspace ? "/admin/login" : "/login", { replace: true });
              }}
            />
          </aside>
        ) : null}

        {!isStandaloneLeadsWorkspace ? (
          <div className="sticky top-0 z-40 flex h-12 items-center justify-between border-b border-border bg-surface px-4 lg:hidden">
            <div className="flex min-w-0 items-center gap-2">
              <img src={logoUrl} alt="CP Hub" className="h-7 w-7 object-contain" />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold leading-none text-primary">CP Hub</p>
                <p className="mt-0.5 text-[11px] leading-none text-muted">
                  {isAdminWorkspace
                    ? "Admin"
                    : isTeacherWorkspace
                      ? "Teacher"
                      : isStudentWorkspace
                        ? "Student"
                        : "Portal"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {isNotificationRole ? (
                <button
                  type="button"
                  className="relative inline-grid h-8 w-8 place-items-center rounded-md text-muted transition hover:bg-surface-subtle hover:text-primary"
                  onClick={() => navigate(notificationPath)}
                  aria-label="Open notifications"
                >
                  <Bell className="h-4 w-4" aria-hidden="true" />
                  {unreadQuery.data ? (
                    <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-brand" />
                  ) : null}
                </button>
              ) : null}
              <button
                type="button"
                className="inline-grid h-8 w-8 place-items-center rounded-md text-muted transition hover:bg-surface-subtle hover:text-primary"
                onClick={() => setIsMobileNavOpen(true)}
                aria-label="Open navigation"
              >
                <Menu className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        ) : null}

        {!isStandaloneLeadsWorkspace && isMobileNavOpen ? (
          <div className="fixed inset-0 z-50 lg:hidden">
            <button
              type="button"
              className="absolute inset-0 bg-primary/20"
              onClick={() => setIsMobileNavOpen(false)}
              aria-label="Close navigation"
            />
            <aside className="absolute left-0 top-0 flex h-full w-64 flex-col border-r border-border bg-surface px-4 py-4 shadow-[0_18px_60px_rgba(0,0,0,0.18)]">
              <div className="mb-4 flex items-center justify-between border-b border-border pb-4">
                <div className="flex min-w-0 items-center gap-3">
                  <img src={logoUrl} alt="CP Hub" className="h-8 w-8 object-contain" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-primary">CP Hub</p>
                    <p className="text-xs text-muted">{workspaceLabel}</p>
                  </div>
                </div>
                <button
                  type="button"
                  className="inline-grid h-8 w-8 place-items-center rounded-md text-muted transition hover:bg-surface-subtle hover:text-primary"
                  onClick={() => setIsMobileNavOpen(false)}
                  aria-label="Close navigation"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
              <WorkspaceRail
                workspaceLabel={workspaceLabel}
                links={links}
                showHeader={false}
                showFooter={false}
                unreadCount={unreadQuery.data ?? 0}
                onNavigate={() => setIsMobileNavOpen(false)}
                userName={user?.full_name}
                onSignOut={async () => {
                  await signOut();
                  navigate(isAdminWorkspace ? "/admin/login" : "/login", { replace: true });
                }}
              />
            </aside>
          </div>
        ) : null}

        <main className="min-w-0 px-5 py-5 sm:px-8 lg:px-10 lg:py-6">
          <div className={cn("mx-auto", isStandaloneLeadsWorkspace ? "max-w-6xl" : "max-w-7xl")}>
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

function WorkspaceRail({
  links,
  workspaceLabel,
  showHeader = true,
  showFooter = true,
  onNavigate,
  unreadCount = 0,
  userName,
  onSignOut,
}: {
  links: RailLink[];
  workspaceLabel: string;
  showHeader?: boolean;
  showFooter?: boolean;
  onNavigate?: () => void;
  unreadCount?: number;
  userName?: string;
  onSignOut?: () => Promise<void>;
}) {
  return (
    <>
      {showHeader ? (
        <div className="flex items-center gap-3 border-b border-border pb-4">
          <img src={logoUrl} alt="CP Hub" className="h-9 w-9 object-contain" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-primary">CP Hub</p>
            <p className="text-xs text-muted">{workspaceLabel}</p>
          </div>
        </div>
      ) : null}

      <nav className="mt-5 flex flex-1 flex-col gap-1" aria-label="Workspace navigation">
        {links.map((link) => {
          const Icon = link.icon;

          return (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              title={link.label}
              onClick={onNavigate}
              className={({ isActive }) =>
                cn(
                  "group relative flex h-11 items-center justify-start gap-3 rounded-md border border-transparent px-3 text-muted transition before:absolute before:left-0 before:top-2 before:bottom-2 before:w-0.5 before:rounded-full before:bg-brand before:opacity-0 before:transition hover:bg-surface-subtle hover:text-primary",
                  isActive && "text-primary before:opacity-100",
                )
              }
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="truncate text-sm font-medium">{link.label}</span>
              {link.notification && unreadCount > 0 ? (
                <span className="ml-auto min-w-4 rounded-full bg-brand/15 px-1.5 py-0.5 text-center text-[10px] font-semibold leading-none text-brand">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              ) : null}
            </NavLink>
          );
        })}
      </nav>

      {showFooter ? (
        <div className="space-y-2 border-t border-border pt-4">
          {userName ? <p className="truncate px-1 text-xs text-muted">{userName}</p> : null}
          {onSignOut ? (
            <button
              type="button"
              onClick={() => void onSignOut()}
              className="flex h-9 w-full items-center gap-2 rounded-md px-2 text-xs font-medium text-muted transition hover:bg-surface-subtle hover:text-primary"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign out
            </button>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
