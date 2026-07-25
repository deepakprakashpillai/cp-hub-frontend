import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getStudentDetail, listStudents, type StudentRead } from "@/features/student/api";

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
  const queryClient = useQueryClient();
  const { selectedStudentId, setSelectedStudentId } = useStudentStore();

  const listQuery = useQuery({
    queryKey: ["students", "list-active"],
    queryFn: listStudents,
  });

  const students = listQuery.data?.items ?? [];

  // Determine active student ID (fallback to first active student)
  const activeStudentSummary =
    students.find((s) => s.student.id === selectedStudentId) ?? students[0];
  const activeStudentId = activeStudentSummary?.student.id ?? selectedStudentId ?? null;

  // Fetch full detail for active student
  const detailQuery = useQuery({
    queryKey: ["student", "detail", activeStudentId],
    queryFn: () => getStudentDetail(activeStudentId!),
    enabled: Boolean(activeStudentId),
  });

  const activeStudent: StudentRead | undefined = detailQuery.data ?? activeStudentSummary;

  function switchActiveStudent(studentId: string | null) {
    setSelectedStudentId(studentId);
    queryClient.invalidateQueries({ queryKey: ["student"] });
    queryClient.invalidateQueries({ queryKey: ["student-bookings"] });
  }

  return {
    students,
    activeStudent,
    activeStudentId,
    setSelectedStudentId: switchActiveStudent,
    isLoading: listQuery.isLoading || (Boolean(activeStudentId) && detailQuery.isLoading),
    error: listQuery.error || detailQuery.error,
  };
}
