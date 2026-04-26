import React from 'react';
import StatCard from '@/components/shared/StatCard';
import { Building2, Users, FileWarning, ClipboardX, MessageCircleWarning, UserPlus } from 'lucide-react';

export default function HqOverviewCards({ summary }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 mb-6">
      <StatCard label="Branches" value={summary.branches} icon={Building2} />
      <StatCard label="Teacher Completion" value={`${summary.teacherCompletionRate}%`} icon={Users} />
      <StatCard label="Missing Reports" value={summary.studentsMissingReports} icon={FileWarning} />
      <StatCard label="Incomplete Attendance" value={summary.classesIncompleteAttendance} icon={ClipboardX} />
      <StatCard label="Pending Approvals" value={summary.pendingApprovals} icon={MessageCircleWarning} />
      <StatCard label="Open Leads" value={summary.openLeads} icon={UserPlus} />
    </div>
  );
}