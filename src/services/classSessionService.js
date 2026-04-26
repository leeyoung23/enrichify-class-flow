import { base44 } from '@/api/base44Client';
import { getSelectedDemoRole } from './authService';
import { createParentUpdate } from './dataService';

const demoEnabled = () => Boolean(getSelectedDemoRole());

export async function saveAttendanceRecord(existingRecords, selectedClassId, selectedDate, studentId, field, value) {
  const existing = existingRecords.find(record => record.student_id === studentId);
  if (demoEnabled()) {
    return existing ? { ...existing, [field]: value } : { id: `demo-att-${studentId}`, student_id: studentId, class_id: selectedClassId, date: selectedDate, [field]: value };
  }
  if (existing) {
    return base44.entities.Attendance.update(existing.id, { [field]: value });
  }
  return base44.entities.Attendance.create({
    student_id: studentId,
    class_id: selectedClassId,
    date: selectedDate,
    [field]: value,
  });
}

export async function saveAttendanceNotes(existingRecords, selectedClassId, selectedDate, studentId, notes) {
  const existing = existingRecords.find(record => record.student_id === studentId);
  if (demoEnabled()) {
    return existing ? { ...existing, notes } : { id: `demo-note-${studentId}`, student_id: studentId, class_id: selectedClassId, date: selectedDate, notes };
  }
  if (existing) {
    return base44.entities.Attendance.update(existing.id, { notes });
  }
  return base44.entities.Attendance.create({
    student_id: studentId,
    class_id: selectedClassId,
    date: selectedDate,
    notes,
  });
}

export async function saveSessionParentUpdate(parentUpdates, selectedClassId, user, studentId, payload) {
  const existing = parentUpdates.find(item => item.student_id === studentId);
  if (demoEnabled()) {
    return {
      id: existing?.id || `demo-parent-update-${studentId}`,
      student_id: studentId,
      class_id: selectedClassId,
      teacher_email: user?.email,
      notes: payload.notes,
      ai_draft: payload.aiDraft,
      final_message: payload.finalMessage,
      approved_report: payload.status === 'approved' ? payload.finalMessage : existing?.approved_report || '',
      shared_report: existing?.shared_report || '',
      status: payload.status,
    };
  }
  if (existing) {
    return base44.entities.ParentUpdate.update(existing.id, {
      notes: payload.notes,
      ai_draft: payload.aiDraft,
      final_message: payload.finalMessage,
      approved_report: payload.status === 'approved' ? payload.finalMessage : existing.approved_report || '',
      status: payload.status,
    });
  }
  return createParentUpdate({
    student_id: studentId,
    class_id: selectedClassId,
    teacher_email: user?.email,
    notes: payload.notes,
    ai_draft: payload.aiDraft,
    final_message: payload.finalMessage,
    approved_report: payload.status === 'approved' ? payload.finalMessage : '',
    status: payload.status,
  });
}