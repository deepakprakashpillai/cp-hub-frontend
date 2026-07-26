import { api } from "@/api/http";
import type { components } from "@/api/generated/schema";

export type LeadStatus = components["schemas"]["LeadStatus"];
export type Lead = components["schemas"]["LeadRead"];
export type LeadInput = components["schemas"]["LeadCreate"];

export type LeadListFilters = {
  q?: string;
  status?: LeadStatus;
  page: number;
  pageSize: number;
};

export type Page<T> = components["schemas"]["Page_LeadRead_"] & { items: T[] };
export type LeadImportPreview = components["schemas"]["LeadImportPreview"];
export type LeadImportResult = components["schemas"]["LeadImportResult"];
export type LeadSummary = components["schemas"]["LeadSummary"];
export type LeadConversion = components["schemas"]["LeadConversionRead"];

export async function listLeads(filters: LeadListFilters): Promise<Page<Lead>> {
  const { data } = await api.get<Page<Lead>>("/leads", {
    params: {
      q: filters.q || undefined,
      status: filters.status || undefined,
      page: filters.page,
      page_size: filters.pageSize,
    },
  });
  return data;
}

export async function createLead(input: LeadInput): Promise<Lead> {
  const { data } = await api.post<Lead>("/leads", input);
  return data;
}

export async function getLeadSummary(): Promise<LeadSummary> {
  const { data } = await api.get<LeadSummary>("/leads/summary");
  return data;
}

export async function updateLead(leadId: string, input: Partial<LeadInput>): Promise<Lead> {
  const { data } = await api.patch<Lead>(`/leads/${leadId}`, input);
  return data;
}

export async function deleteLead(leadId: string): Promise<void> {
  await api.delete(`/leads/${leadId}`);
}

export async function convertLead(
  leadId: string,
  input: { email: string; programType: "one_on_one" | "batch" },
): Promise<LeadConversion> {
  const { data } = await api.post<LeadConversion>(`/admin/leads/${leadId}/convert`, {
    email: input.email,
    program_type: input.programType,
  });
  return data;
}

export async function previewLeadImport(file: File): Promise<LeadImportPreview> {
  const body = new FormData();
  body.append("file", file);
  const { data } = await api.post<LeadImportPreview>("/leads/import/preview", body, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export async function importLeads(file: File): Promise<LeadImportResult> {
  const body = new FormData();
  body.append("file", file);
  const { data } = await api.post<LeadImportResult>("/leads/import", body, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}
