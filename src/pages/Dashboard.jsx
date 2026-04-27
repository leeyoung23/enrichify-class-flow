import React from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { listParentUpdates, getTeacherKpiMetrics, getHqDashboardSummary, getHqAlertLists, getStudentDashboardSummary, getTrialSchedules, getTeacherNotifications, listFeeRecords, getFeeDashboardSummary, listHomeworkAttachments, getHomeworkAttachmentSummary } from '@/services/dataService';
import { getDashboardLabel } from '@/services/permissionService';
import { Building2, BookOpen, ClipboardCheck, MessageSquarePlus, PlayCircle, BookOpenCheck, FileClock, Users, UserCheck, FolderOpen } from 'lucide-react';
import UpcomingTrialsCard from '@/components/dashboard/UpcomingTrialsCard';
import TeacherNotificationsCard from '@/components/dashboard/TeacherNotificationsCard';
import PageHeader from '@/components/shared/PageHeader';
import StatCard from '@/components/shared/StatCard';
import TeacherClassOverviewSection from '@/components/dashboard/TeacherClassOverviewSection';
import TeacherAttentionSection from '@/components/dashboard/TeacherAttentionSection';
import { DashboardListCard, DashboardSectionGrid } from '@/components/dashboard/RoleDashboardLists';
import HomeworkUploadSummaryCards from '@/components/dashboard/HomeworkUploadSummaryCards';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { format } from 'date-fns';

export default function Dashboard() {
  const { user } = useOutletContext();
  const role = user?.role || 'teacher';

  const { data: recentUpdates = [] } = useQuery({
    queryKey: ['recent-updates', role, user?.email],
    queryFn: () => listParentUpdates(user),
    enabled: !!user,
  });

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const teacherMetrics = getTeacherKpiMetrics(user);
  const aiReportPendingCount = teacherMetrics.reportStatuses.noteCreated;
  const aiReportReadyCount = teacherMetrics.reportStatuses.aiDraftGenerated + teacherMetrics.reportStatuses.edited;
  const hqSummary = getHqDashboardSummary(user);
  const hqAlerts = getHqAlertLists(user);
  const studentSummary = getStudentDashboardSummary(user);
  const upcomingTrials = getTrialSchedules(user).filter((item) => item.trial_status === 'scheduled').slice(0, 3);
  const teacherNotifications = getTeacherNotifications(user).slice(0, 5);

  const { data: feeRecords = [] } = useQuery({
    queryKey: ['dashboard-fee-records', role, user?.branch_id, user?.student_id],
    queryFn: () => listFeeRecords(user),
    enabled: !!user && (role === 'hq_admin' || role === 'branch_supervisor' || role === 'parent'),
    initialData: [],
  });

  const feeSummary = getFeeDashboardSummary(user, feeRecords);

  const { data: homeworkAttachments = [] } = useQuery({
    queryKey: ['dashboard-homework-attachments', role, user?.branch_id, user?.email],
    queryFn: () => listHomeworkAttachments(user),
    enabled: !!user && (role === 'hq_admin' || role === 'branch_supervisor'),
    initialData: [],
  });

  const homeworkSummary = getHomeworkAttachmentSummary(user, homeworkAttachments);

  return (
    <div>
      <PageHeader 
        title={`${greeting()}, ${user?.full_name || 'there'}`}
        description={`${getDashboardLabel(user)} — ${format(new Date(), 'EEEE, MMMM d, yyyy')}`}
        action={role === 'teacher' ? (
          <Button asChild className="gap-2">
            <Link to="/class-session">
              <PlayCircle className="h-4 w-4" />
              Start Class Session
            </Link>
          </Button>
        ) : null}
      />

      {role === 'hq_admin' ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
            <StatCard label="Total Unpaid" value={feeSummary.unpaid} icon={Building2} />
            <StatCard label="Overdue Payments" value={feeSummary.overdue} icon={Users} />
            <StatCard label="Paid This Month" value={feeSummary.paidThisMonth} icon={MessageSquarePlus} />
            <StatCard label="Branch Fee Completion" value={`${feeSummary.branchCompletionRate}%`} icon={ClipboardCheck} />
          </div>
          <HomeworkUploadSummaryCards summary={homeworkSummary} />
          <DashboardSectionGrid>
            <DashboardListCard title="Global Branch Overview" items={hqAlerts.branchesNeedingAttention} emptyText="All branches are operating normally." />
            <DashboardListCard title="Teacher Completion Summary" items={hqAlerts.teacherCompletion} emptyText="No teacher sessions available." />
            <DashboardListCard title="Parent Reports Pending" items={hqAlerts.pendingApprovals} emptyText="No parent reports pending approval." />
            <DashboardListCard title="Leads & Trial Summary" items={hqAlerts.leadsSummary} emptyText="No lead activity available." />
          </DashboardSectionGrid>
          <div className="mt-6">
            <Button asChild variant="outline" className="gap-2">
              <Link to="/branch-performance">Branch Performance</Link>
            </Button>
          </div>
        </>
      ) : role === 'branch_supervisor' ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
            <StatCard label="Unpaid Students" value={feeSummary.unpaid} icon={Building2} />
            <StatCard label="Overdue Payments" value={feeSummary.overdue} icon={BookOpen} />
            <StatCard label="Pending Verification" value={feeSummary.pendingVerification} icon={ClipboardCheck} />
            <StatCard label="Paid This Month" value={feeSummary.paidThisMonth} icon={MessageSquarePlus} />
          </div>
          <HomeworkUploadSummaryCards summary={homeworkSummary} />
          <DashboardSectionGrid>
            <DashboardListCard title="Today's Classes" items={hqAlerts.classesToday} emptyText="No classes scheduled today." />
            <UpcomingTrialsCard items={upcomingTrials} />
            <DashboardListCard title="Incomplete Teacher Tasks" items={hqAlerts.incompleteTeacherTasks} emptyText="No incomplete teacher tasks right now." />
            <DashboardListCard title="Students Needing Follow-Up" items={hqAlerts.studentsNeedingFollowUp} emptyText="No students currently need follow-up." />
            <DashboardListCard title="Parent Reports Pending" items={hqAlerts.pendingApprovals} emptyText="No parent reports pending approval." />
          </DashboardSectionGrid>
        </>
      ) : role === 'teacher' ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
            <StatCard label="Today's Classes" value={teacherMetrics.todaysClasses} icon={BookOpen} />
            <StatCard label="Attendance Completion" value={`${teacherMetrics.attendanceRate}%`} icon={ClipboardCheck} />
            <StatCard label="Homework Pending" value={teacherMetrics.homeworkPending} icon={BookOpenCheck} />
            <StatCard label="Parent Reports Pending" value={teacherMetrics.reportsPending} icon={FileClock} />
          </div>
          <div className="space-y-6">
            <Card className="p-5">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <h3 className="font-semibold">AI Parent Report Drafts</h3>
                  <p className="text-sm text-muted-foreground">Demo-only workflow: generate draft, edit, approve, then manually share.</p>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Button asChild variant="outline">
                    <Link to="/parent-updates">Open Parent Updates</Link>
                  </Button>
                  <Button asChild>
                    <Link to="/class-session">Start Class Session</Link>
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                <div className="rounded-lg bg-accent/40 px-3 py-2">
                  <p className="text-xs text-muted-foreground">Pending note-to-draft</p>
                  <p className="text-lg font-semibold">{aiReportPendingCount}</p>
                </div>
                <div className="rounded-lg bg-accent/40 px-3 py-2">
                  <p className="text-xs text-muted-foreground">Ready for teacher review</p>
                  <p className="text-lg font-semibold">{aiReportReadyCount}</p>
                </div>
              </div>
            </Card>
            <TeacherClassOverviewSection sessions={teacherMetrics.classOverview} />
            <TeacherAttentionSection items={teacherMetrics.studentsNeedingAttention.slice(0, 3)} />
            <TeacherNotificationsCard items={teacherNotifications.slice(0, 5)} />
          </div>
        </>
      ) : role === 'student' ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
            <StatCard label="Homework Due" value={studentSummary.homeworkDue} icon={BookOpenCheck} />
            <StatCard label="Recent Feedback" value={studentSummary.recentFeedback} icon={UserCheck} />
            <StatCard label="Learning Resources" value={studentSummary.learningResources} icon={FolderOpen} />
            <StatCard label="Progress Summary" value={studentSummary.progressSummary} icon={ClipboardCheck} />
          </div>
          <HomeworkUploadSummaryCards summary={homeworkSummary} />
          <DashboardSectionGrid>
            <DashboardListCard title="Homework Due" items={studentSummary.reminders.filter((item) => item.reminder_type === 'homework').map((item) => ({ id: item.id, title: item.title, meta: 'Demo reminder' }))} emptyText="No homework due right now." />
            <DashboardListCard title="Recent Teacher Feedback" items={recentUpdates.map((item) => ({ id: item.id, title: item.shared_report || item.approved_report || 'Approved feedback', meta: item.status }))} emptyText="No recent feedback available." />
            <DashboardListCard title="Learning Resources" items={[{ id: 'resource-1', title: 'Weekly practice pack', meta: 'Demo resource' }, { id: 'resource-2', title: 'Reading comprehension set', meta: 'Demo resource' }]} emptyText="No resources available." />
            <DashboardListCard title="Simple Progress Summary" items={studentSummary.progressItems} emptyText="No progress summary available yet." />
          </DashboardSectionGrid>
        </>
      ) : null}
    </div>
  );
}