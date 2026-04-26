import React from 'react';
import StudentSessionCard from './StudentSessionCard';

export default function StudentSessionList({
  students,
  attendanceRecords,
  parentUpdates,
  onAttendanceMark,
  onNotesSave,
  onSaveParentUpdate,
  selectedClass,
  user,
}) {
  return (
    <div className="space-y-4">
      {students.map((student) => {
        const attendanceRecord = attendanceRecords.find(r => r.student_id === student.id);
        const parentUpdate = parentUpdates.find(p => p.student_id === student.id);
        return (
          <StudentSessionCard
            key={student.id}
            student={student}
            attendanceRecord={attendanceRecord}
            parentUpdate={parentUpdate}
            onAttendanceMark={onAttendanceMark}
            onNotesSave={onNotesSave}
            onSaveParentUpdate={onSaveParentUpdate}
            selectedClass={selectedClass}
            user={user}
          />
        );
      })}
    </div>
  );
}