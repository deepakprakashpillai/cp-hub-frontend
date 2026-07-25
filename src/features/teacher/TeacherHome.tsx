import { PageHeader } from "@/components/layout/PageHeader";

export function TeacherHome() {
  return (
    <section className="space-y-5">
      <PageHeader title="Teacher Workspace" />
      <div className="rounded-md border border-border bg-surface p-8 text-center space-y-2">
        <h2 className="text-lg font-semibold text-primary">Welcome to the Teacher Portal</h2>
        <p className="text-sm text-muted max-w-lg mx-auto">
          Manage your schedule, availability, and 1-on-1 assignments from here.
        </p>
      </div>
    </section>
  );
}
