import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import { FileText } from 'lucide-react';
import { toast } from 'sonner';
import { getSelectedDemoRole } from '@/services/authService';
import { getRole, ROLES } from '@/services/permissionService';
import { isSupabaseConfigured } from '@/services/supabaseClient';
import { useSupabaseAuthState } from '@/hooks/useSupabaseAuthState';
import {
  getAiParentReportCurrentVersion,
  getAiParentReportDetail,
  listAiParentReportEvidenceLinks,
  listAiParentReportVersions,
  listAiParentReports,
} from '@/services/supabaseReadService';
import {
  approveAiParentReport,
  archiveAiParentReport,
  createAiParentReportDraft,
  createAiParentReportVersion,
  releaseAiParentReport,
  submitAiParentReportForReview,
} from '@/services/supabaseWriteService';

const REPORT_TYPE_OPTIONS = [
  'weekly_brief',
  'monthly_progress',
  'parent_requested',
  'graduation',
  'end_of_term',
  'homework_feedback',
  'participation_note',
];
const GENERATION_SOURCE_OPTIONS = ['manual', 'mock_ai'];
const STATUS_STYLES = {
  draft: 'bg-slate-100 text-slate-700 border-slate-200',
  teacher_review: 'bg-blue-100 text-blue-700 border-blue-200',
  supervisor_review: 'bg-amber-100 text-amber-700 border-amber-200',
  approved: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  released: 'bg-purple-100 text-purple-700 border-purple-200',
  archived: 'bg-zinc-100 text-zinc-700 border-zinc-200',
};

const DEMO_BASE_REPORTS = [
  {
    id: 'demo-ai-parent-report-1',
    studentId: 'demo-student-01',
    classId: 'demo-class-alpha',
    branchId: 'demo-branch-north',
    reportType: 'monthly_progress',
    reportPeriodStart: '2026-04-01',
    reportPeriodEnd: '2026-04-30',
    status: 'teacher_review',
    currentVersionId: 'demo-ai-parent-report-1-v1',
    createdByProfileId: 'demo-user-teacher',
    assignedTeacherProfileId: 'demo-user-teacher',
    approvedByProfileId: null,
    releasedByProfileId: null,
    releasedAt: null,
    createdAt: '2026-05-01T08:00:00.000Z',
    updatedAt: '2026-05-01T09:00:00.000Z',
  },
];

const DEMO_BASE_VERSIONS = {
  'demo-ai-parent-report-1': [
    {
      id: 'demo-ai-parent-report-1-v1',
      reportId: 'demo-ai-parent-report-1',
      versionNumber: 1,
      generationSource: 'manual',
      structuredSections: {
        student_summary: 'Fake/dev monthly summary for UI shell preview only.',
        strengths: ['Consistent participation', 'Homework completion improving'],
        improvement_areas: ['Written detail depth'],
        next_recommendations: ['Read 10 minutes daily and write 2 key points'],
      },
      teacherEdits: {
        final_comment: 'Steady progress this month. Keep reinforcing reading routines at home.',
      },
      finalText: {
        parent_facing: 'Fake/dev parent-facing note only. No real student data.',
      },
      aiModelLabel: null,
      aiGeneratedAt: null,
      createdByProfileId: 'demo-user-teacher',
      createdAt: '2026-05-01T08:10:00.000Z',
    },
  ],
};

const DEMO_BASE_EVIDENCE = {
  'demo-ai-parent-report-1': [
    {
      id: 'demo-evidence-1',
      report_id: 'demo-ai-parent-report-1',
      evidence_type: 'manual',
      source_table: 'manual',
      source_id: null,
      summary_snapshot: {
        summary: 'Fake dev evidence summary for UI shell preview only.',
        source: 'manual_demo',
        contains_private_paths: false,
      },
      include_in_parent_report: true,
      created_at: '2026-05-01T08:12:00.000Z',
    },
  ],
};

function formatDateLabel(value) {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '—';
  return parsed.toLocaleDateString('en-AU');
}

function formatDateTimeLabel(value) {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '—';
  return parsed.toLocaleString('en-AU');
}

function isStaffRole(role) {
  return role === ROLES.TEACHER || role === ROLES.BRANCH_SUPERVISOR || role === ROLES.HQ_ADMIN;
}

export default function AiParentReports() {
  const { user } = useOutletContext();
  const { appUser } = useSupabaseAuthState();
  const demoRole = getSelectedDemoRole();
  const role = demoRole || getRole(user);
  const inDemoMode = Boolean(demoRole);
  const canAccess = isStaffRole(role);
  const canUseSupabase = canAccess && !inDemoMode && isSupabaseConfigured() && Boolean(appUser?.id);

  const [reports, setReports] = useState([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [reportsError, setReportsError] = useState('');
  const [selectedReportId, setSelectedReportId] = useState('');
  const [detail, setDetail] = useState(null);
  const [currentVersion, setCurrentVersion] = useState(null);
  const [versions, setVersions] = useState([]);
  const [evidenceLinks, setEvidenceLinks] = useState([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [selectedReleaseVersionId, setSelectedReleaseVersionId] = useState('');

  const [createDraftForm, setCreateDraftForm] = useState({
    studentId: '',
    classId: '',
    branchId: '',
    reportType: 'weekly_brief',
    reportPeriodStart: '',
    reportPeriodEnd: '',
    assignedTeacherProfileId: '',
  });
  const [createVersionForm, setCreateVersionForm] = useState({
    generationSource: 'manual',
    studentSummary: '',
    strengths: '',
    improvementAreas: '',
    nextRecommendations: '',
    teacherFinalComment: '',
  });
  const [creatingDraft, setCreatingDraft] = useState(false);
  const [creatingVersion, setCreatingVersion] = useState(false);
  const [lifecycleBusy, setLifecycleBusy] = useState('');

  const [demoReports, setDemoReports] = useState(DEMO_BASE_REPORTS);
  const [demoVersionsByReportId, setDemoVersionsByReportId] = useState(DEMO_BASE_VERSIONS);
  const [demoEvidenceByReportId, setDemoEvidenceByReportId] = useState(DEMO_BASE_EVIDENCE);

  const selectedReport = useMemo(
    () => reports.find((item) => item.id === selectedReportId) || null,
    [reports, selectedReportId]
  );

  const loadReports = useCallback(async () => {
    if (!canAccess) {
      setReports([]);
      setReportsError('');
      return;
    }

    if (inDemoMode) {
      setReports(demoReports);
      setReportsError('');
      setReportsLoading(false);
      return;
    }

    if (!canUseSupabase) {
      setReports([]);
      setReportsError('AI parent reports require an authenticated staff session.');
      setReportsLoading(false);
      return;
    }

    setReportsLoading(true);
    setReportsError('');
    const result = await listAiParentReports({});
    if (result.error) {
      setReports([]);
      setReportsError(result.error.message || 'Unable to load AI parent reports right now.');
      setReportsLoading(false);
      return;
    }
    const rows = Array.isArray(result.data) ? result.data : [];
    setReports(rows);
    setReportsLoading(false);
  }, [canAccess, canUseSupabase, demoReports, inDemoMode]);

  useEffect(() => {
    void loadReports();
  }, [loadReports]);

  useEffect(() => {
    if (!selectedReportId && reports.length > 0) {
      setSelectedReportId(reports[0].id || '');
      return;
    }
    if (selectedReportId && !reports.some((row) => row.id === selectedReportId)) {
      setSelectedReportId(reports[0]?.id || '');
    }
  }, [reports, selectedReportId]);

  const loadDetail = useCallback(async () => {
    if (!selectedReportId) {
      setDetail(null);
      setCurrentVersion(null);
      setVersions([]);
      setEvidenceLinks([]);
      setDetailError('');
      setDetailLoading(false);
      return;
    }

    if (inDemoMode) {
      const demoDetail = demoReports.find((row) => row.id === selectedReportId) || null;
      const demoVersions = demoVersionsByReportId[selectedReportId] || [];
      const demoCurrent = demoVersions.find((row) => row.id === demoDetail?.currentVersionId) || null;
      setDetail(demoDetail);
      setVersions([...demoVersions].sort((a, b) => (b.versionNumber || 0) - (a.versionNumber || 0)));
      setCurrentVersion(demoCurrent);
      setEvidenceLinks(demoEvidenceByReportId[selectedReportId] || []);
      setSelectedReleaseVersionId(demoCurrent?.id || demoVersions[0]?.id || '');
      setDetailError('');
      setDetailLoading(false);
      return;
    }

    if (!canUseSupabase) {
      setDetail(null);
      setCurrentVersion(null);
      setVersions([]);
      setEvidenceLinks([]);
      setDetailError('AI parent report detail requires an authenticated staff session.');
      setDetailLoading(false);
      return;
    }

    setDetailLoading(true);
    setDetailError('');
    const [detailResult, currentResult, versionsResult, evidenceResult] = await Promise.all([
      getAiParentReportDetail({ reportId: selectedReportId }),
      getAiParentReportCurrentVersion({ reportId: selectedReportId }),
      listAiParentReportVersions({ reportId: selectedReportId }),
      listAiParentReportEvidenceLinks({ reportId: selectedReportId }),
    ]);

    if (detailResult.error) {
      setDetail(null);
      setCurrentVersion(null);
      setVersions([]);
      setEvidenceLinks([]);
      setDetailError(detailResult.error.message || 'Unable to load AI parent report detail right now.');
      setDetailLoading(false);
      return;
    }

    setDetail(detailResult.data || null);
    setCurrentVersion(currentResult.error ? null : (currentResult.data || null));
    setVersions(versionsResult.error ? [] : (versionsResult.data || []));
    setEvidenceLinks(evidenceResult.error ? [] : (evidenceResult.data || []));
    setSelectedReleaseVersionId(
      (currentResult.data && currentResult.data.id)
      || (Array.isArray(versionsResult.data) && versionsResult.data[0]?.id)
      || ''
    );
    setDetailLoading(false);
  }, [
    canUseSupabase,
    demoEvidenceByReportId,
    demoReports,
    demoVersionsByReportId,
    inDemoMode,
    selectedReportId,
  ]);

  useEffect(() => {
    void loadDetail();
  }, [loadDetail]);

  const resetVersionForm = () => {
    setCreateVersionForm({
      generationSource: 'manual',
      studentSummary: '',
      strengths: '',
      improvementAreas: '',
      nextRecommendations: '',
      teacherFinalComment: '',
    });
  };

  const handleCreateDraft = async () => {
    if (!canAccess) return;
    if (!createDraftForm.studentId.trim() || !createDraftForm.branchId.trim()) {
      toast.message('studentId and branchId are required.');
      return;
    }
    if (!createDraftForm.reportPeriodStart || !createDraftForm.reportPeriodEnd) {
      toast.message('report period start and end are required.');
      return;
    }

    setCreatingDraft(true);
    if (inDemoMode) {
      const nextId = `demo-ai-parent-report-${Date.now()}`;
      const nowIso = new Date().toISOString();
      const newRow = {
        id: nextId,
        studentId: createDraftForm.studentId.trim(),
        classId: createDraftForm.classId.trim() || null,
        branchId: createDraftForm.branchId.trim(),
        reportType: createDraftForm.reportType,
        reportPeriodStart: createDraftForm.reportPeriodStart,
        reportPeriodEnd: createDraftForm.reportPeriodEnd,
        status: 'draft',
        currentVersionId: null,
        createdByProfileId: 'demo-role-user',
        assignedTeacherProfileId: createDraftForm.assignedTeacherProfileId.trim() || null,
        approvedByProfileId: null,
        releasedByProfileId: null,
        releasedAt: null,
        createdAt: nowIso,
        updatedAt: nowIso,
      };
      setDemoReports((prev) => [newRow, ...prev]);
      setDemoVersionsByReportId((prev) => ({ ...prev, [nextId]: [] }));
      setDemoEvidenceByReportId((prev) => ({ ...prev, [nextId]: [] }));
      setSelectedReportId(nextId);
      toast.success('Demo draft report created locally.');
      setCreatingDraft(false);
      return;
    }

    const result = await createAiParentReportDraft({
      studentId: createDraftForm.studentId.trim(),
      classId: createDraftForm.classId.trim() || null,
      branchId: createDraftForm.branchId.trim(),
      reportType: createDraftForm.reportType,
      reportPeriodStart: createDraftForm.reportPeriodStart,
      reportPeriodEnd: createDraftForm.reportPeriodEnd,
      assignedTeacherProfileId: createDraftForm.assignedTeacherProfileId.trim() || null,
    });
    if (result.error || !result.data?.id) {
      toast.error(result.error?.message || 'Unable to create AI parent report draft right now.');
      setCreatingDraft(false);
      return;
    }
    toast.success('Draft report created.');
    setSelectedReportId(result.data.id);
    await loadReports();
    setCreatingDraft(false);
  };

  const handleCreateVersion = async () => {
    if (!selectedReportId) {
      toast.message('Select a report first.');
      return;
    }
    if (!GENERATION_SOURCE_OPTIONS.includes(createVersionForm.generationSource)) {
      toast.message('Only manual or mock_ai generation source is allowed.');
      return;
    }

    const structuredSections = {
      student_summary: createVersionForm.studentSummary.trim(),
      strengths: createVersionForm.strengths.trim(),
      improvement_areas: createVersionForm.improvementAreas.trim(),
      next_recommendations: createVersionForm.nextRecommendations.trim(),
    };
    const finalText = {
      teacher_final_comment: createVersionForm.teacherFinalComment.trim(),
    };
    setCreatingVersion(true);

    if (inDemoMode) {
      const nowIso = new Date().toISOString();
      const existing = demoVersionsByReportId[selectedReportId] || [];
      const nextVersionNumber = existing.length + 1;
      const newVersionId = `${selectedReportId}-v${nextVersionNumber}`;
      const newVersion = {
        id: newVersionId,
        reportId: selectedReportId,
        versionNumber: nextVersionNumber,
        generationSource: createVersionForm.generationSource,
        structuredSections,
        teacherEdits: {
          strengths: createVersionForm.strengths.trim(),
          improvement_areas: createVersionForm.improvementAreas.trim(),
          next_recommendations: createVersionForm.nextRecommendations.trim(),
        },
        finalText,
        aiModelLabel: createVersionForm.generationSource === 'mock_ai' ? 'mock_ui_shell' : null,
        aiGeneratedAt: createVersionForm.generationSource === 'mock_ai' ? nowIso : null,
        createdByProfileId: 'demo-role-user',
        createdAt: nowIso,
      };
      setDemoVersionsByReportId((prev) => ({
        ...prev,
        [selectedReportId]: [newVersion, ...existing],
      }));
      setDemoReports((prev) => prev.map((row) => (
        row.id === selectedReportId
          ? { ...row, currentVersionId: newVersionId, updatedAt: nowIso }
          : row
      )));
      setSelectedReleaseVersionId(newVersionId);
      resetVersionForm();
      toast.success('Demo version created locally.');
      setCreatingVersion(false);
      return;
    }

    const result = await createAiParentReportVersion({
      reportId: selectedReportId,
      generationSource: createVersionForm.generationSource,
      structuredSections,
      teacherEdits: {
        strengths: createVersionForm.strengths.trim(),
        improvement_areas: createVersionForm.improvementAreas.trim(),
        next_recommendations: createVersionForm.nextRecommendations.trim(),
      },
      finalText,
      aiModelLabel: createVersionForm.generationSource === 'mock_ai' ? 'mock_ui_shell' : null,
    });
    if (result.error || !result.data?.version?.id) {
      toast.error(result.error?.message || 'Unable to create AI parent report version right now.');
      setCreatingVersion(false);
      return;
    }
    if (result.warning?.check) {
      toast.message(`Lifecycle event check: ${result.warning.message}`);
    }
    toast.success('Version created.');
    resetVersionForm();
    await Promise.all([loadReports(), loadDetail()]);
    setCreatingVersion(false);
  };

  const runLifecycleAction = async (actionName, runner) => {
    if (!selectedReportId) {
      toast.message('Select a report first.');
      return;
    }
    setLifecycleBusy(actionName);
    const result = await runner();
    if (result.error) {
      toast.error(result.error.message || 'Action failed.');
      setLifecycleBusy('');
      return;
    }
    if (result.warning?.check) {
      toast.message(`Lifecycle event check: ${result.warning.message}`);
    }
    toast.success(`${actionName} completed.`);
    await Promise.all([loadReports(), loadDetail()]);
    setLifecycleBusy('');
  };

  const handleDemoLifecycle = (nextStatus) => {
    if (!selectedReportId) return;
    const nowIso = new Date().toISOString();
    setDemoReports((prev) => prev.map((row) => {
      if (row.id !== selectedReportId) return row;
      if (nextStatus === 'released') {
        return {
          ...row,
          status: nextStatus,
          currentVersionId: selectedReleaseVersionId || row.currentVersionId || null,
          releasedAt: nowIso,
          releasedByProfileId: 'demo-role-user',
          updatedAt: nowIso,
        };
      }
      return { ...row, status: nextStatus, updatedAt: nowIso };
    }));
    toast.success(`Demo ${nextStatus} state updated locally.`);
  };

  if (!canAccess) {
    return (
      <EmptyState
        icon={FileText}
        title="Access restricted"
        description="AI Parent Reports is available for teacher, branch supervisor, and HQ roles."
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="AI Parent Reports"
        description="Staff-only UI shell for draft/review/release workflow using manual/mock source only. No real AI provider and no PDF/export."
      />

      <Card className="p-4">
        <p className="text-sm text-muted-foreground">
          {inDemoMode
            ? 'Demo mode is local-only for AI parent reports. No Supabase report reads/writes run in this mode.'
            : 'Authenticated mode uses existing Supabase services with JWT + RLS only.'}
        </p>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card className="p-4 space-y-3 xl:col-span-1">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-semibold">Parent Reports</h2>
            <Button size="sm" variant="outline" onClick={() => { void loadReports(); }}>
              Refresh
            </Button>
          </div>
          {reportsLoading ? (
            <p className="text-sm text-muted-foreground">Loading reports...</p>
          ) : null}
          {!reportsLoading && reportsError ? (
            <p className="text-sm text-muted-foreground">{reportsError}</p>
          ) : null}
          {!reportsLoading && !reportsError && reports.length === 0 ? (
            <p className="text-sm text-muted-foreground">No AI parent reports found.</p>
          ) : null}
          {!reportsLoading && !reportsError && reports.length > 0 ? (
            <div className="space-y-2">
              {reports.map((row) => (
                <button
                  key={row.id}
                  type="button"
                  className={`w-full text-left rounded-lg border p-3 transition-colors ${
                    selectedReportId === row.id ? 'border-primary bg-primary/5' : 'hover:bg-muted/40'
                  }`}
                  onClick={() => setSelectedReportId(row.id)}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-medium">{row.reportType || 'report'}</p>
                    <Badge variant="outline" className={STATUS_STYLES[row.status] || STATUS_STYLES.draft}>
                      {row.status || 'draft'}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Student {row.studentId || '—'} · Class {row.classId || '—'} · Branch {row.branchId || '—'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDateLabel(row.reportPeriodStart)} - {formatDateLabel(row.reportPeriodEnd)}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Current version: {row.currentVersionId || 'none'} · Updated {formatDateTimeLabel(row.updatedAt)}
                  </p>
                </button>
              ))}
            </div>
          ) : null}
        </Card>

        <Card className="p-4 space-y-3 xl:col-span-2">
          <h2 className="font-semibold">Create Draft (Manual/Demo Data)</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="apr-student-id">studentId</Label>
              <Input
                id="apr-student-id"
                value={createDraftForm.studentId}
                onChange={(event) => setCreateDraftForm((prev) => ({ ...prev, studentId: event.target.value }))}
                placeholder="fake/dev UUID or demo id"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="apr-class-id">classId (optional)</Label>
              <Input
                id="apr-class-id"
                value={createDraftForm.classId}
                onChange={(event) => setCreateDraftForm((prev) => ({ ...prev, classId: event.target.value }))}
                placeholder="fake/dev UUID"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="apr-branch-id">branchId</Label>
              <Input
                id="apr-branch-id"
                value={createDraftForm.branchId}
                onChange={(event) => setCreateDraftForm((prev) => ({ ...prev, branchId: event.target.value }))}
                placeholder="fake/dev UUID or demo id"
              />
            </div>
            <div className="space-y-1.5">
              <Label>reportType</Label>
              <Select
                value={createDraftForm.reportType}
                onValueChange={(value) => setCreateDraftForm((prev) => ({ ...prev, reportType: value }))}
              >
                <SelectTrigger><SelectValue placeholder="Select report type" /></SelectTrigger>
                <SelectContent>
                  {REPORT_TYPE_OPTIONS.map((value) => (
                    <SelectItem key={value} value={value}>{value}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="apr-period-start">reportPeriodStart</Label>
              <Input
                id="apr-period-start"
                type="date"
                value={createDraftForm.reportPeriodStart}
                onChange={(event) => setCreateDraftForm((prev) => ({ ...prev, reportPeriodStart: event.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="apr-period-end">reportPeriodEnd</Label>
              <Input
                id="apr-period-end"
                type="date"
                value={createDraftForm.reportPeriodEnd}
                onChange={(event) => setCreateDraftForm((prev) => ({ ...prev, reportPeriodEnd: event.target.value }))}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="apr-assigned-teacher">assignedTeacherProfileId (optional)</Label>
              <Input
                id="apr-assigned-teacher"
                value={createDraftForm.assignedTeacherProfileId}
                onChange={(event) => setCreateDraftForm((prev) => ({ ...prev, assignedTeacherProfileId: event.target.value }))}
                placeholder="fake/dev UUID"
              />
            </div>
          </div>
          <Button onClick={() => { void handleCreateDraft(); }} disabled={creatingDraft}>
            {creatingDraft ? 'Creating draft...' : 'Create Draft'}
          </Button>
        </Card>
      </div>

      <Card className="p-4 space-y-4">
        <h2 className="font-semibold">Report Detail</h2>
        {detailLoading ? <p className="text-sm text-muted-foreground">Loading report detail...</p> : null}
        {!detailLoading && detailError ? <p className="text-sm text-muted-foreground">{detailError}</p> : null}
        {!detailLoading && !detailError && !detail ? (
          <p className="text-sm text-muted-foreground">Select a report to view detail.</p>
        ) : null}

        {!detailLoading && !detailError && detail ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <p><span className="text-muted-foreground">Report ID:</span> {detail.id}</p>
              <p><span className="text-muted-foreground">Status:</span> {detail.status}</p>
              <p><span className="text-muted-foreground">Student:</span> {detail.studentId || '—'}</p>
              <p><span className="text-muted-foreground">Class:</span> {detail.classId || '—'}</p>
              <p><span className="text-muted-foreground">Branch:</span> {detail.branchId || '—'}</p>
              <p><span className="text-muted-foreground">Report Type:</span> {detail.reportType}</p>
              <p><span className="text-muted-foreground">Period:</span> {formatDateLabel(detail.reportPeriodStart)} - {formatDateLabel(detail.reportPeriodEnd)}</p>
              <p><span className="text-muted-foreground">Current Version:</span> {detail.currentVersionId || 'none'}</p>
            </div>

            <div className="rounded-lg border p-3 space-y-2">
              <p className="text-sm font-medium">Current Version</p>
              {!currentVersion ? (
                <p className="text-sm text-muted-foreground">No current version selected yet.</p>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">
                    v{currentVersion.versionNumber} · {currentVersion.generationSource} · created {formatDateTimeLabel(currentVersion.createdAt)}
                  </p>
                  <pre className="text-xs bg-muted/40 rounded-md p-2 overflow-auto whitespace-pre-wrap">
                    {JSON.stringify(currentVersion.structuredSections || {}, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            <div className="rounded-lg border p-3 space-y-2">
              <p className="text-sm font-medium">Version History</p>
              {versions.length === 0 ? (
                <p className="text-sm text-muted-foreground">No versions yet.</p>
              ) : (
                <div className="space-y-2">
                  {versions.map((row) => (
                    <label key={row.id} className="flex items-start gap-2 rounded-md border p-2 cursor-pointer">
                      <input
                        type="radio"
                        name="release-version-id"
                        checked={selectedReleaseVersionId === row.id}
                        onChange={() => setSelectedReleaseVersionId(row.id)}
                      />
                      <div className="text-sm">
                        <p className="font-medium">v{row.versionNumber} · {row.generationSource}</p>
                        <p className="text-xs text-muted-foreground">id: {row.id} · {formatDateTimeLabel(row.createdAt)}</p>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-lg border p-3 space-y-2">
              <p className="text-sm font-medium">Evidence Links (staff-facing)</p>
              {evidenceLinks.length === 0 ? (
                <p className="text-sm text-muted-foreground">No evidence links visible for this report.</p>
              ) : (
                <div className="space-y-2">
                  {evidenceLinks.map((row) => (
                    <div key={row.id} className="rounded-md border p-2">
                      <p className="text-sm">{row.evidence_type || row.evidenceType || 'evidence'}</p>
                      <p className="text-xs text-muted-foreground">
                        source table: {row.source_table || row.sourceTable || 'manual'} · include in parent report:{' '}
                        {String(row.include_in_parent_report ?? row.includeInParentReport ?? false)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : null}
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card className="p-4 space-y-3">
          <h2 className="font-semibold">Create Version (manual/mock_ai only)</h2>
          <div className="space-y-1.5">
            <Label>generationSource</Label>
            <Select
              value={createVersionForm.generationSource}
              onValueChange={(value) => setCreateVersionForm((prev) => ({ ...prev, generationSource: value }))}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {GENERATION_SOURCE_OPTIONS.map((value) => (
                  <SelectItem key={value} value={value}>{value}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="apr-student-summary">Student Summary</Label>
            <Textarea
              id="apr-student-summary"
              value={createVersionForm.studentSummary}
              onChange={(event) => setCreateVersionForm((prev) => ({ ...prev, studentSummary: event.target.value }))}
              placeholder="Fake/dev summary only"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="apr-strengths">Strengths</Label>
            <Textarea
              id="apr-strengths"
              value={createVersionForm.strengths}
              onChange={(event) => setCreateVersionForm((prev) => ({ ...prev, strengths: event.target.value }))}
              placeholder="e.g. Participation, consistency"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="apr-improvements">Improvement Areas</Label>
            <Textarea
              id="apr-improvements"
              value={createVersionForm.improvementAreas}
              onChange={(event) => setCreateVersionForm((prev) => ({ ...prev, improvementAreas: event.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="apr-next-recs">Next Recommendations</Label>
            <Textarea
              id="apr-next-recs"
              value={createVersionForm.nextRecommendations}
              onChange={(event) => setCreateVersionForm((prev) => ({ ...prev, nextRecommendations: event.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="apr-final-comment">Teacher Final Comment</Label>
            <Textarea
              id="apr-final-comment"
              value={createVersionForm.teacherFinalComment}
              onChange={(event) => setCreateVersionForm((prev) => ({ ...prev, teacherFinalComment: event.target.value }))}
            />
          </div>
          <Button onClick={() => { void handleCreateVersion(); }} disabled={creatingVersion || !selectedReportId}>
            {creatingVersion ? 'Creating version...' : 'Create Version'}
          </Button>
        </Card>

        <Card className="p-4 space-y-3">
          <h2 className="font-semibold">Lifecycle Actions</h2>
          <p className="text-sm text-muted-foreground">
            Actions run manually. Release requires a selected version. No auto-release, no notifications, and no PDF/export.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Button
              variant="outline"
              disabled={!selectedReportId || Boolean(lifecycleBusy)}
              onClick={() => {
                if (inDemoMode) {
                  handleDemoLifecycle('supervisor_review');
                  return;
                }
                void runLifecycleAction('Submit for Review', () => submitAiParentReportForReview({ reportId: selectedReportId }));
              }}
            >
              Submit for Review
            </Button>
            <Button
              variant="outline"
              disabled={!selectedReportId || Boolean(lifecycleBusy)}
              onClick={() => {
                if (inDemoMode) {
                  handleDemoLifecycle('approved');
                  return;
                }
                void runLifecycleAction('Approve', () => approveAiParentReport({ reportId: selectedReportId }));
              }}
            >
              Approve
            </Button>
            <Button
              variant="outline"
              disabled={!selectedReportId || !selectedReleaseVersionId || Boolean(lifecycleBusy)}
              onClick={() => {
                if (!selectedReleaseVersionId) {
                  toast.message('Select a version to release.');
                  return;
                }
                if (inDemoMode) {
                  handleDemoLifecycle('released');
                  return;
                }
                void runLifecycleAction(
                  'Release',
                  () => releaseAiParentReport({ reportId: selectedReportId, versionId: selectedReleaseVersionId })
                );
              }}
            >
              Release Selected Version
            </Button>
            <Button
              variant="outline"
              disabled={!selectedReportId || Boolean(lifecycleBusy)}
              onClick={() => {
                if (inDemoMode) {
                  handleDemoLifecycle('archived');
                  return;
                }
                void runLifecycleAction('Archive', () => archiveAiParentReport({ reportId: selectedReportId }));
              }}
            >
              Archive
            </Button>
          </div>
          {selectedReport ? (
            <p className="text-xs text-muted-foreground">
              Selected report: <span className="font-medium">{selectedReport.id}</span> · current status{' '}
              <span className="font-medium">{selectedReport.status || 'draft'}</span>
            </p>
          ) : null}
        </Card>
      </div>
    </div>
  );
}
