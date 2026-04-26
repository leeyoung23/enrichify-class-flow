import React, { useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import { Building2 } from 'lucide-react';
import BranchPerformanceFilters from '@/components/branchPerformance/BranchPerformanceFilters';
import BranchPerformanceSummaryCards from '@/components/branchPerformance/BranchPerformanceSummaryCards';
import BranchPerformanceTable from '@/components/branchPerformance/BranchPerformanceTable';
import { listBranches, listObservations, listParentUpdates, listTeacherTaskSessions } from '@/services/dataService';

function inDateRange(date, fromDate, toDate) {
  if (fromDate && date < fromDate) return false;
  if (toDate && date > toDate) return false;
  return true;
}

function getStatusLabel(score) {
  if (score >= 85) return 'Excellent';
  if (score >= 65) return 'On Track';
  return 'Needs Attention';
}

export default function BranchPerformance() {
  const { user } = useOutletContext();
  const role = user?.role;
  const canAccess = role === 'hq_admin' || role === 'branch_supervisor';
  const [filters, setFilters] = useState({
    branchId: role === 'branch_supervisor' ? user?.branch_id || 'all' : 'all',
    fromDate: '2026-04-24',
    toDate: '2026-04-25',
  });

  const { data: branches = [] } = useQuery({
    queryKey: ['branch-performance-branches', role, user?.branch_id],
    queryFn: () => listBranches(user),
    enabled: !!user && canAccess,
  });

  const { data: sessions = [] } = useQuery({
    queryKey: ['branch-performance-sessions', role, user?.branch_id],
    queryFn: () => listTeacherTaskSessions(user),
    enabled: !!user && canAccess,
  });

  const { data: observations = [] } = useQuery({
    queryKey: ['branch-performance-observations', role, user?.branch_id],
    queryFn: () => listObservations(user),
    enabled: !!user && canAccess,
  });

  const { data: reports = [] } = useQuery({
    queryKey: ['branch-performance-reports', role, user?.branch_id],
    queryFn: () => listParentUpdates(user),
    enabled: !!user && canAccess,
  });

  const rows = useMemo(() => {
    if (!canAccess) return [];

    const visibleBranches = branches.filter((branch) => {
      if (role === 'branch_supervisor') return branch.id === user?.branch_id;
      if (filters.branchId !== 'all') return branch.id === filters.branchId;
      return true;
    });

    const results = visibleBranches.map((branch) => {
      const branchSessions = sessions.filter((item) => item.branch_id === branch.id && inDateRange(item.lesson_date, filters.fromDate, filters.toDate));
      const branchObservations = observations.filter((item) => item.branch_id === branch.id && inDateRange(item.observation_date, filters.fromDate, filters.toDate));
      const branchReports = reports.filter((item) => item.branch_id === branch.id && inDateRange((item.created_date || '').slice(0, 10), filters.fromDate, filters.toDate));

      const totalSessions = branchSessions.length || 1;
      const attendanceRate = Math.round((branchSessions.filter((item) => item.attendance_completed).length / totalSessions) * 100);
      const homeworkRate = Math.round((branchSessions.filter((item) => item.homework_marked).length / totalSessions) * 100);
      const teacherTaskRate = Math.round((branchSessions.filter((item) => item.attendance_completed && item.homework_marked && item.student_notes_completed && item.parent_report_draft_completed && item.approved_parent_update_completed).length / totalSessions) * 100);
      const parentReportsRate = Math.round((branchReports.filter((item) => ['approved', 'shared'].includes(item.status)).length / (branchReports.length || 1)) * 100);
      const observationRate = Math.round((branchObservations.filter((item) => item.status === 'completed').length / (branchObservations.length || 1)) * 100);

      const leadFollowUpRateMap = {
        'branch-north': 84,
        'branch-south': 68,
      };
      const studentFollowUpRateMap = {
        'branch-north': 79,
        'branch-south': 62,
      };

      const leadFollowUpRate = leadFollowUpRateMap[branch.id] || 70;
      const studentFollowUpRate = studentFollowUpRateMap[branch.id] || 70;
      const overallScore = Math.round((attendanceRate + homeworkRate + parentReportsRate + teacherTaskRate + observationRate + leadFollowUpRate + studentFollowUpRate) / 7);

      return {
        branch_id: branch.id,
        branch_name: branch.name,
        attendanceRate,
        homeworkRate,
        parentReportsRate,
        teacherTaskRate,
        observationRate,
        leadFollowUpRate,
        studentFollowUpRate,
        overallScore,
        statusLabel: getStatusLabel(overallScore),
      };
    });

    return results
      .sort((a, b) => b.overallScore - a.overallScore)
      .map((item, index) => ({ ...item, rank: index + 1 }));
  }, [branches, sessions, observations, reports, filters, role, user?.branch_id, canAccess]);

  const summary = useMemo(() => ({
    branchesInView: rows.length,
    topScore: rows[0]?.overallScore || 0,
    excellentCount: rows.filter((item) => item.statusLabel === 'Excellent').length,
    needsAttentionCount: rows.filter((item) => item.statusLabel === 'Needs Attention').length,
  }), [rows]);

  if (!canAccess) {
    return (
      <EmptyState
        icon={Building2}
        title="Access restricted"
        description="This page is not available for the current demo role."
      />
    );
  }

  return (
    <div>
      <PageHeader
        title="Branch Performance Leaderboard"
        description="Professional branch performance view using fake demo data only."
      />
      <BranchPerformanceFilters
        role={role}
        branches={branches}
        filters={filters}
        onFilterChange={(field, value) => setFilters((prev) => ({ ...prev, [field]: value }))}
      />
      {rows.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No branch performance data"
          description="Try a different date range or branch filter to view the leaderboard."
        />
      ) : (
        <>
          <BranchPerformanceSummaryCards summary={summary} />
          <BranchPerformanceTable rows={rows} role={role} userBranchId={user?.branch_id} />
        </>
      )}
    </div>
  );
}