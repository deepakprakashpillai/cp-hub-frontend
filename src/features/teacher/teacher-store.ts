import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useQuery } from "@tanstack/react-query";
import { listTeachers, type TeacherRead } from "@/features/teacher/api";

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
  const { selectedTeacherId, setSelectedTeacherId } = useTeacherStore();

  const { data, isLoading, error } = useQuery({
    queryKey: ["teachers", "list-active"],
    queryFn: listTeachers,
  });

  const teachers = data?.items ?? [];
  const activeTeacher: TeacherRead | undefined =
    teachers.find((t) => t.teacher.id === selectedTeacherId) ?? teachers[0];

  const activeTeacherId = activeTeacher?.teacher.id ?? selectedTeacherId;

  return {
    teachers,
    activeTeacher,
    activeTeacherId,
    setSelectedTeacherId,
    isLoading,
    error,
  };
}
