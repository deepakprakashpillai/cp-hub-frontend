import { Modal } from "@/components/ui/Modal";
import { SessionFeedbackThread } from "@/features/teacher/SessionFeedbackThread";

export function SessionFeedbackNoteModal({
  bookingId,
  studentName,
  isOpen,
  onClose,
}: {
  bookingId: string | null;
  studentName?: string;
  isOpen: boolean;
  onClose: () => void;
}) {
  if (!isOpen || !bookingId) return null;

  return (
    <Modal
      title={`Session Feedback & Notes — ${studentName ?? "Student"}`}
      isOpen={isOpen}
      onClose={onClose}
    >
      <div className="pt-2">
        <SessionFeedbackThread
          bookingId={bookingId}
          studentName={studentName}
          className="border-0 p-0 shadow-none bg-transparent"
        />
      </div>
    </Modal>
  );
}
