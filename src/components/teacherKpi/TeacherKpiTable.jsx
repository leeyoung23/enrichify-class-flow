import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

function StatusBadge({ done, label }) {
  return (
    <Badge variant="outline" className={done ? 'bg-green-50 text-green-700 border-green-200' : 'bg-amber-50 text-amber-700 border-amber-200'}>
      {label}: {done ? 'Done' : 'Pending'}
    </Badge>
  )
}

export default function TeacherKpiTable({ rows }) {
  return (
    <Card className="p-5">
      <h3 className="font-semibold mb-4">Teacher KPI Detail</h3>
      <div className="space-y-3">
        {rows.map((row) => (
          <div key={row.id} className="rounded-lg border border-border p-4 bg-accent/20">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2 mb-3">
              <div>
                <p className="font-medium">{row.teacher_name}</p>
                <p className="text-xs text-muted-foreground">{row.branch_name} • {row.class_name} • {row.lesson_date}</p>
              </div>
              <Badge variant="outline">{row.statusSummary}</Badge>
            </div>
            <div className="flex flex-wrap gap-2">
              <StatusBadge done={row.attendance_completed} label="Attendance" />
              <StatusBadge done={row.homework_marked} label="Homework" />
              <StatusBadge done={row.student_notes_completed} label="Notes" />
              <StatusBadge done={row.parent_report_draft_completed} label="Draft" />
              <StatusBadge done={row.approved_parent_update_completed} label="Approved" />
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}