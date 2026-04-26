import React from 'react';
import StatCard from '@/components/shared/StatCard';
import { BookOpen, ClipboardCheck, PenLine, NotebookText, FilePenLine, BadgeCheck, ListTodo, AlertTriangle, Share2 } from 'lucide-react';

export default function TeacherKpiSummaryCards({ summary }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
      <StatCard label="Classes Completed" value={summary.classesCompleted} icon={BookOpen} />
      <StatCard label="Attendance Completion Rate" value={`${summary.attendanceCompletionRate}%`} icon={ClipboardCheck} />
      <StatCard label="Homework Completion Rate" value={`${summary.homeworkCompletionRate}%`} icon={PenLine} />
      <StatCard label="Student Notes Completion Rate" value={`${summary.studentNotesCompletionRate}%`} icon={NotebookText} />
      <StatCard label="Parent Reports Drafted" value={summary.parentReportsDrafted} icon={FilePenLine} />
      <StatCard label="Parent Reports Approved" value={summary.parentReportsApproved} icon={BadgeCheck} />
      <StatCard label="Reports Shared" value={summary.reportStatuses.shared} icon={Share2} />
      <StatCard label="Pending Tasks" value={summary.pendingTasks} icon={ListTodo} />
      <StatCard label="Late / Incomplete Tasks" value={summary.lateIncompleteTasks} icon={AlertTriangle} />
    </div>
  )
}