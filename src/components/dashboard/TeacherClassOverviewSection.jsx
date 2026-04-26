import React from 'react';
import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PlayCircle } from 'lucide-react';

function StatusBadge({ done, doneLabel, pendingLabel }) {
  return (
    <Badge variant="outline" className={done ? 'bg-green-50 text-green-700 border-green-200' : 'bg-amber-50 text-amber-700 border-amber-200'}>
      {done ? doneLabel : pendingLabel}
    </Badge>
  );
}

export default function TeacherClassOverviewSection({ sessions = [] }) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="font-semibold">Today’s Class Overview</h3>
          <p className="text-sm text-muted-foreground">Quick view of today’s classes and session status.</p>
        </div>
      </div>

      <div className="space-y-3">
        {sessions.map((session) => (
          <div key={session.id} className="rounded-lg border border-border p-4 bg-accent/20">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium">{session.class_name}</p>
                <p className="text-xs text-muted-foreground mt-1">{session.class_time} • {session.student_count} students</p>
              </div>
              <Button asChild size="sm" className="gap-2 w-full sm:w-auto">
                <Link to="/class-session">
                  <PlayCircle className="h-4 w-4" />
                  Start Class Session
                </Link>
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              <StatusBadge done={session.attendance_completed} doneLabel="Attendance done" pendingLabel="Attendance pending" />
              <StatusBadge done={session.homework_marked} doneLabel="Homework done" pendingLabel="Homework pending" />
              <StatusBadge done={session.parent_report_draft_completed} doneLabel="Draft ready" pendingLabel="Draft pending" />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}