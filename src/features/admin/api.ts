import { api } from "@/api/http";

export type AdminDashboardSummary = {
  window: {
    starts_from: string;
    starts_to: string;
    generated_at: string;
  };
  students: {
    total: number;
    active: number;
    enrolled: number;
    paused: number;
    completed: number;
    cancelled: number;
    active_with_valid_access: number;
    expired_access: number;
  };
  teachers: {
    total: number;
    active: number;
    inactive: number;
  };
  batch_groups: {
    total: number;
    active: number;
    inactive: number;
  };
  classes: {
    scheduled: number;
    completed: number;
    cancelled: number;
  };
  bookings: {
    booked: number;
    cancelled: number;
    attended: number;
    missed: number;
  };
  payments: {
    count: number;
    total_amount_paid: number;
  };
};

export type DashboardWindowParams = {
  startsFrom: string;
  startsTo: string;
};

export async function getAdminDashboardSummary({
  startsFrom,
  startsTo,
}: DashboardWindowParams) {
  const response = await api.get<AdminDashboardSummary>("/admin/dashboard/summary", {
    params: {
      starts_from: startsFrom,
      starts_to: startsTo,
    },
  });

  return response.data;
}
