import React, { useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import TeacherKpiFilters from '@/components/teacherKpi/TeacherKpiFilters';
import TeacherKpiSummaryCards from '@/components/teacherKpi/TeacherKpiSummaryCards';
import TeacherKpiTable from '@/components/teacherKpi/TeacherKpiTable';
import { listBranches, listClasses, listStaff, listTeacherTaskSessions } from '@/services/dataService';
import { ChartNoAxesColumn } from 'lucide-react';

function inDateRange(date, fromDate, toDate) {
  if (fromDate && date < fromDate) return false;
  if (toDate && date > toDate) return false;
  return true;
}

export default function TeacherKpi() {
  const { user } = useOutletContext();
  const role = user?.role || 'teacher';
  const [filters, setFilters] = useState({
    branchId: role === 'branch_supervisor' ? user?.branch_id || 'all' : 'all',
    teacherEmail: role === 'teacher' ? user?.email || 'all' : 'all',
    classId: 'all',
    fromDate: '2026-04-24',
    toDate: '2026-04-25',
  });

  const { data: branches = [] } = useQuery({
    queryKey: ['teacher-kpi-branches', role, user?.branch_id],
    queryFn: () => listBranches(user),
    enabled: !!user,
  });

  const { data: classes = [] } = useQuery({
    queryKey: ['teacher-kpi-classes', role, user?.email],
    queryFn: () => listClasses(user),
    enabled: !!user,
  });

  const { data: teachers = [] } = useQuery({
    queryKey: ['teacher-kpi-staff', role, user?.email],
    queryFn: () => listStaff(user),
    enabled: !!user,
  });

  const { data: sessions = [] } = useQuery({
    queryKey: ['teacher-kpi-sessions', role, user?.email],
    queryFn: () => listTeacherTaskSessions(user),
    enabled: !!user,
  });

  const filteredSessions = useMemo(() => {
    return sessions.filter((session) => {
      if (role === 'teacher' && session.teacher_email !== user?.email) return false;
      if (role === 'branch_supervisor' && session.branch_id !== user?.branch_id) return false;
      if (filters.branchId !== 'all' && session.branch_id !== filters.branchId) return false;
      if (filters.teacherEmail !== 'all' && session.teacher_email !== filters.teacherEmail) return false;
      if (filters.classId !== 'all' && session.class_id !== filters.classId) return false;
      if (!inDateRange(session.lesson_date, filters.fromDate, filters.toDate)) return false;
      return true;
    });
  }, [sessions, filters, role, user?.email]);

  const summary = useMemo(() => {
    const total = filteredSessions.length || 1;
    const classesCompleted = filteredSessions.filter((item) => item.attendance_completed && item.homework_marked && item.student_notes_completed).length;
    const attendanceCompletionRate = Math.round((filteredSessions.filter((item) => item.attendance_completed).length / total) * 100);
    const homeworkCompletionRate = Math.round((filteredSessions.filter((item) => item.homework_marked).length / total) * 100);
    const studentNotesCompletionRate = Math.round((filteredSessions.filter((item) => item.student_notes_completed).length / total) * 100);
    const parentReportsDrafted = filteredSessions.filter((item) => item.parent_report_draft_completed).length;
    const parentReportsApproved = filteredSessions.filter((item) => item.approved_parent_update_completed).length;
    const completedTaskCount = filteredSessions.reduce((sum, item) => sum + [item.attendance_completed, item.homework_marked, item.student_notes_completed, item.parent_report_draft_completed, item.approved_parent_update_completed].filter(Boolean).length, 0);
    const pendingTasks = (filteredSessions.length * 5) - completedTaskCount;
    const lateIncompleteTasks = filteredSessions.filter((item) => item.is_late || !item.approved_parent_update_completed || !item.homework_marked || !item.student_notes_completed).length;

    return {
      classesCompleted,
      attendanceCompletionRate,
      homeworkCompletionRate,
      studentNotesCompletionRate,
      parentReportsDrafted,
      parentReportsApproved,
      pendingTasks,
      lateIncompleteTasks,
    };
  }, [filteredSessions]);

  const tableRows = filteredSessions.map((session) => ({
    ...session,
    statusSummary: session.attendance_completed && session.homework_marked && session.student_notes_completed && session.parent_report_draft_completed && session.approved_parent_update_completed
      ? 'Complete'
      : session.is_late
        ? 'Late / Incomplete'
        : 'In Progress',
  }));

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  if (!['hq_admin', 'branch_supervisor', 'teacher'].includes(role)) {
    return (
      <EmptyState
        icon={ChartNoAxesColumn}
        title="Access restricted"
        description="This page is not available for the current demo role."
      />
    );
  }

  return (
    <div>
      <PageHeader
        title="Teacher KPI"
        description={role === 'hq_admin' ? 'Global teacher KPI view across all branches using demo data only.' : role === 'branch_supervisor' ? 'Branch teacher KPI view for your branch only using demo data only.' : 'See your own KPI only using demo data only.'}
      />
      <TeacherKpiFilters
        role={role}
        branches={branches}
        teachers={teachers.filter((item) => item.role === 'teacher')}
        classes={classes}
        filters={filters}
        onFilterChange={handleFilterChange}
      />
      {filteredSessions.length === 0 ? (
        <EmptyState
          icon={ChartNoAxesColumn}
          title="No KPI records found"
          description="Adjust the filters or complete a class session to see KPI results."
        />
      ) : (
        <>
          <TeacherKpiSummaryCards summary={summary} />
          <TeacherKpiTable rows={tableRows} />
        </>
      )}
    </div>
  );
}