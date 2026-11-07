import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getCurrentTeacher, getTeacherForDev, listTeachersForDev, type TeacherRead } from "@/features/teacher/api";
import { useAuth } from "@/features/auth/auth-context";
import { isDevAuthBypassEnabled } from "@/features/auth/dev-bypass";

type TeacherState = {
  selectedTeacherId: string | null;
  setSelectedTeacherId: (teacherId: string | null) => void;
};

export const useTeacherStore = create<TeacherState>()(
  persist(
    (set) => ({
      selectedTeacherId: null,
      setSelectedTeacherId: (selectedTeacherId) => set({ selectedTeacherId }),
    }),
    { name: "cp-hub-active-teacher" },
  ),
);

export function useActiveTeacher() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { selectedTeacherId, setSelectedTeacherId } = useTeacherStore();

  const devListQuery = useQuery({
    queryKey: ["teachers", "list-active"],
    queryFn: listTeachersForDev,
    enabled: isDevAuthBypassEnabled(),
  });

  const teachers = devListQuery.data?.items ?? [];

  // Determine active teacher ID
  const authenticatedTeacherId = user?.role === "teacher" ? user.teacher_id ?? null : null;
  const activeTeacherSummary = isDevAuthBypassEnabled()
    ? teachers.find((teacher) => teacher.teacher.id === selectedTeacherId) ?? teachers[0]
    : undefined;
  const activeTeacherId = authenticatedTeacherId ?? activeTeacherSummary?.teacher.id ?? null;

  const authenticatedProfileQuery = useQuery({
    queryKey: ["teacher", "me"],
    queryFn: getCurrentTeacher,
    enabled: Boolean(authenticatedTeacherId) && !isDevAuthBypassEnabled(),
  });

  const devProfileQuery = useQuery({
    queryKey: ["teacher", "detail", activeTeacherId],
    queryFn: () => getTeacherForDev(activeTeacherId!),
    enabled: Boolean(activeTeacherId) && isDevAuthBypassEnabled(),
  });

  const activeTeacher: TeacherRead | undefined = authenticatedProfileQuery.data ?? devProfileQuery.data ?? activeTeacherSummary;

  function switchActiveTeacher(teacherId: string | null) {
    if (!isDevAuthBypassEnabled()) return;
    setSelectedTeacherId(teacherId);
    queryClient.invalidateQueries({ queryKey: ["teacher"] });
  }

  return {
    teachers,
    activeTeacher,
    activeTeacherId,
    setSelectedTeacherId: switchActiveTeacher,
    isLoading: devListQuery.isLoading || authenticatedProfileQuery.isLoading || devProfileQuery.isLoading,
    error: devListQuery.error || authenticatedProfileQuery.error || devProfileQuery.error,
  };
}
