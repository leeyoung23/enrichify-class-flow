import React from 'react';
import StatCard from '@/components/shared/StatCard';
import { CheckSquare, ClipboardCheck, BookOpenCheck, MessageSquare, AlertTriangle, Clock3 } from 'lucide-react';

export default function TeacherKpiCards({ metrics }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 mb-6">
      <StatCard label="Classes Completed" value={metrics.classesCompleted} icon={CheckSquare} />
      <StatCard label="Attendance Completion" value={`${metrics.attendanceRate}%`} icon={ClipboardCheck} />
      <StatCard label="Homework Marking" value={`${metrics.homeworkRate}%`} icon={BookOpenCheck} />
      <StatCard label="Reports Approved/Sent" value={metrics.reportsApprovedSent} icon={MessageSquare} />
      <StatCard label="Missing Tasks" value={metrics.missingTasks} icon={AlertTriangle} />
      <StatCard label="Late / Incomplete" value={metrics.lateIncomplete} icon={Clock3} />
    </div>
  );
}