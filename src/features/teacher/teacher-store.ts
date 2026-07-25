import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getTeacher, listTeachers, type TeacherRead } from "@/features/teacher/api";

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
  const queryClient = useQueryClient();
  const { selectedTeacherId, setSelectedTeacherId } = useTeacherStore();

  const listQuery = useQuery({
    queryKey: ["teachers", "list-active"],
    queryFn: listTeachers,
  });

  const teachers = listQuery.data?.items ?? [];

  // Determine active teacher ID
  const activeTeacherSummary =
    teachers.find((t) => t.teacher.id === selectedTeacherId) ?? teachers[0];
  const activeTeacherId = activeTeacherSummary?.teacher.id ?? selectedTeacherId ?? null;

  // Fetch full detail for active teacher (includes permanent_one_on_one_students & bio)
  const detailQuery = useQuery({
    queryKey: ["teacher", "detail", activeTeacherId],
    queryFn: () => getTeacher(activeTeacherId!),
    enabled: Boolean(activeTeacherId),
  });

  const activeTeacher: TeacherRead | undefined = detailQuery.data ?? activeTeacherSummary;

  function switchActiveTeacher(teacherId: string | null) {
    setSelectedTeacherId(teacherId);
    queryClient.invalidateQueries({ queryKey: ["teacher"] });
  }

  return {
    teachers,
    activeTeacher,
    activeTeacherId,
    setSelectedTeacherId: switchActiveTeacher,
    isLoading: listQuery.isLoading || (Boolean(activeTeacherId) && detailQuery.isLoading),
    error: listQuery.error || detailQuery.error,
  };
}
