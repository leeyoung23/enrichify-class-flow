import React from 'react';
import { Card } from '@/components/ui/card';
import { CheckCircle2 } from 'lucide-react';

export default function SessionProgress({ students, attendanceRecords, parentUpdates }) {
  const total = students.length;
  if (total === 0) return null;

  const completed = students.filter((s) => {
    const att = attendanceRecords.find(r => r.student_id === s.id);
    const pu = parentUpdates.find(p => p.student_id === s.id);
    return att?.status && att?.homework_status && att?.notes?.trim() && pu?.ai_draft && ['approved', 'shared'].includes(pu?.status);
  }).length;

  const pending = total - completed;
  const pct = Math.round((completed / total) * 100);

  return (
    <Card className="p-5 mb-4">
      <div className="flex flex-col lg:flex-row lg:items-center gap-4">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />
          <div>
            <p className="font-medium text-sm">Class session progress</p>
            <p className="text-xs text-muted-foreground">Track how many students are fully completed for this class session.</p>
          </div>
        </div>
        <div className="lg:ml-auto grid grid-cols-3 gap-3 text-sm min-w-full lg:min-w-[320px]">
          <div className="rounded-lg bg-accent/40 px-3 py-2">
            <p className="text-muted-foreground text-xs">Completed</p>
            <p className="font-semibold">{completed}</p>
          </div>
          <div className="rounded-lg bg-accent/40 px-3 py-2">
            <p className="text-muted-foreground text-xs">Pending</p>
            <p className="font-semibold">{pending}</p>
          </div>
          <div className="rounded-lg bg-accent/40 px-3 py-2">
            <p className="text-muted-foreground text-xs">Completion</p>
            <p className="font-semibold">{pct}%</p>
          </div>
        </div>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden mt-4">
        <div
          className="h-full rounded-full bg-primary transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </Card>
  );
}