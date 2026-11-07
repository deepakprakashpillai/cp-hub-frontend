import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getCurrentStudent, getStudentForDev, listStudentsForDev, type StudentRead } from "@/features/student/api";
import { useAuth } from "@/features/auth/auth-context";
import { isDevAuthBypassEnabled } from "@/features/auth/dev-bypass";

type StudentState = {
  selectedStudentId: string | null;
  setSelectedStudentId: (studentId: string | null) => void;
};

export const useStudentStore = create<StudentState>()(
  persist(
    (set) => ({
      selectedStudentId: null,
      setSelectedStudentId: (selectedStudentId) => set({ selectedStudentId }),
    }),
    { name: "cp-hub-active-student" },
  ),
);

export function useActiveStudent() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { selectedStudentId, setSelectedStudentId } = useStudentStore();

  const devListQuery = useQuery({
    queryKey: ["students", "list-active"],
    queryFn: listStudentsForDev,
    enabled: isDevAuthBypassEnabled(),
  });

  const students = devListQuery.data?.items ?? [];

  const authenticatedStudentId = user?.role === "student" ? user.student_id ?? null : null;
  const activeStudentSummary = isDevAuthBypassEnabled()
    ? students.find((student) => student.student.id === selectedStudentId) ?? students[0]
    : undefined;
  const activeStudentId = authenticatedStudentId ?? activeStudentSummary?.student.id ?? null;

  const authenticatedProfileQuery = useQuery({
    queryKey: ["student", "me"],
    queryFn: getCurrentStudent,
    enabled: Boolean(authenticatedStudentId) && !isDevAuthBypassEnabled(),
  });

  const devProfileQuery = useQuery({
    queryKey: ["student", "detail", activeStudentId],
    queryFn: () => getStudentForDev(activeStudentId!),
    enabled: Boolean(activeStudentId) && isDevAuthBypassEnabled(),
  });

  const activeStudent: StudentRead | undefined = authenticatedProfileQuery.data ?? devProfileQuery.data ?? activeStudentSummary;

  function switchActiveStudent(studentId: string | null) {
    if (!isDevAuthBypassEnabled()) return;
    setSelectedStudentId(studentId);
    queryClient.invalidateQueries({ queryKey: ["student"] });
    queryClient.invalidateQueries({ queryKey: ["student-bookings"] });
  }

  return {
    students,
    activeStudent,
    activeStudentId,
    setSelectedStudentId: switchActiveStudent,
    isLoading: devListQuery.isLoading || authenticatedProfileQuery.isLoading || devProfileQuery.isLoading,
    error: devListQuery.error || authenticatedProfileQuery.error || devProfileQuery.error,
  };
}
