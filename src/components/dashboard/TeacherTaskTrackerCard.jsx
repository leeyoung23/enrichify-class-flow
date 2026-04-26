import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const TASK_LABELS = {
  attendance_completed: 'Attendance',
  homework_marked: 'Homework Marking',
  student_notes_completed: 'Student Notes',
  parent_report_draft_completed: 'Parent Report Draft',
  approved_parent_update_completed: 'Approved Parent Update',
};

export default function TeacherTaskTrackerCard({ sessions, compact = false, title = 'Teacher Task Completion Tracker' }) {
  return (
    <Card className={compact ? 'p-5' : 'p-6'}>
      <h3 className="font-semibold mb-4">{title}</h3>
      <div className="space-y-3">
        {sessions.map((session) => (
          <div key={session.id} className={compact ? 'rounded-lg border border-border p-3 bg-accent/30' : 'rounded-xl border border-border p-4 bg-accent/30'}>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
              <div>
                <p className="font-medium">{session.class_name}</p>
                <p className="text-xs text-muted-foreground">{session.lesson_date} • {session.teacher_name}</p>
              </div>
              {!compact && <Badge variant="outline">{session.branch_name}</Badge>}
            </div>
            <div className="flex flex-wrap gap-2">
              {Object.entries(TASK_LABELS)
                .filter(([key]) => compact ? !session[key] : true)
                .map(([key, label]) => (
                  <Badge
                    key={key}
                    variant="outline"
                    className={session[key] ? 'bg-green-50 text-green-700 border-green-200' : 'bg-amber-50 text-amber-700 border-amber-200'}
                  >
                    {compact ? label : `${label}: ${session[key] ? 'Done' : 'Pending'}`}
                  </Badge>
                ))}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}