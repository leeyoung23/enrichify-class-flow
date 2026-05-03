import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import { ChevronDown, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { getSelectedDemoRole } from '@/services/authService';
import { getRole, ROLES } from '@/services/permissionService';
import { isSupabaseConfigured } from '@/services/supabaseClient';
import { useSupabaseAuthState } from '@/hooks/useSupabaseAuthState';
import {
  getAiParentReportCurrentVersion,
  getAiParentReportDetail,
  getBranches,
  getClasses,
  getStudents,
  listAiParentReportEvidenceLinks,
  listAiParentReportVersions,
  listAiParentReports,
} from '@/services/supabaseReadService';
import {
  approveAiParentReport,
  archiveAiParentReport,
  createAiParentReportDraft,
  createAiParentReportVersion,
  generateMockAiParentReportDraft,
  releaseAiParentReport,
  submitAiParentReportForReview,
} from '@/services/supabaseWriteService';
import { buildMockAiParentReportStructuredSections } from '@/services/aiParentReportMockDraftCore';
import {
  buildMockDraftInputFromSourceEvidence,
  collectAiParentReportSourceEvidence,
  EVIDENCE_CLASSIFICATION,
  SOURCE_AGGREGATION_MODES,
} from '@/services/aiParentReportSourceAggregationService';
import { generateRealAiParentReportDraftViaEdge } from '@/services/aiParentReportEdgeGenerationService';

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
const MOCK_UI_UNSAFE_INPUT_PATTERN =
  /(https?:\/\/|file:\/\/|\/storage\/v1\/object\/|supabase\.co\/storage|[a-z]:\\|\/users\/|\/home\/|\/private\/|\\users\\|\\private\\|announcements-attachments|parent-announcements-media|class-memories|homework-submissions|staff-clock-selfies|provider|debug|api[_-]?key|token|secret)/i;

/** Select sentinel for optional class filter (Radix Select needs non-empty value). */
const CLASS_SELECT_ANY = '__class_any__';

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

function isReportIdUuid(id) {
  return (
    typeof id === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id.trim())
  );
}

function evidenceClassificationBadgeLabel(classification) {
  switch (classification) {
    case EVIDENCE_CLASSIFICATION.NEVER_SEND_TO_PROVIDER:
      return 'Not sent to provider';
    case EVIDENCE_CLASSIFICATION.SENSITIVE_REQUIRES_CONFIRMATION:
      return 'Requires teacher confirmation';
    case EVIDENCE_CLASSIFICATION.STAFF_ONLY_REQUIRES_SELECTION:
      return 'Staff selection required';
    case EVIDENCE_CLASSIFICATION.SAFE_FOR_AI_SUMMARY:
      return 'Safe for summary';
    default:
      return typeof classification === 'string' ? classification : '—';
  }
}

export default function AiParentReports() {
  const { user } = useOutletContext();
  const { appUser, session, loading: supabaseAuthLoading } = useSupabaseAuthState();
  const demoRole = getSelectedDemoRole();
  const role = demoRole || getRole(user);
  const inDemoMode = Boolean(demoRole);
  const canAccess = isStaffRole(role);
  /** Profile-linked user OR Supabase session user — profile fetch must not block directory pickers. */
  const hasLiveSupabaseIdentity =
    Boolean(appUser?.id) || Boolean(session?.user?.id);
  const canUseSupabase =
    canAccess && !inDemoMode && isSupabaseConfigured() && hasLiveSupabaseIdentity;

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
  /** RLS-scoped rows for staff-friendly create shell (JWT only; no service role). */
  const [pickerBranches, setPickerBranches] = useState([]);
  const [pickerClasses, setPickerClasses] = useState([]);
  const [pickerStudents, setPickerStudents] = useState([]);
  const [pickersLoading, setPickersLoading] = useState(false);
  const [pickersError, setPickersError] = useState('');
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
  const [generatingMockDraft, setGeneratingMockDraft] = useState(false);
  const [generatingRealAiDraft, setGeneratingRealAiDraft] = useState(false);
  /** null | 'generating' | 'saved' | 'failed' — informational only; resets when switching reports */
  const [realAiDraftPhase, setRealAiDraftPhase] = useState(null);
  const [lifecycleBusy, setLifecycleBusy] = useState('');

  const [demoReports, setDemoReports] = useState(DEMO_BASE_REPORTS);
  const [demoVersionsByReportId, setDemoVersionsByReportId] = useState(DEMO_BASE_VERSIONS);
  const [demoEvidenceByReportId, setDemoEvidenceByReportId] = useState(DEMO_BASE_EVIDENCE);
  const [mockDraftForm, setMockDraftForm] = useState({
    studentSummary: '',
    attendanceSummary: '',
    lessonProgression: '',
    homeworkCompletion: '',
    homeworkPerformance: '',
    strengths: '',
    improvementAreas: '',
    learningGaps: '',
    teacherObservations: '',
    nextRecommendations: '',
    parentSupportSuggestions: '',
    teacherFinalComment: '',
    evidenceSummaries: '',
  });
  const [sourceEvidencePreview, setSourceEvidencePreview] = useState(null);
  const [sourceEvidenceLoading, setSourceEvidenceLoading] = useState(false);
  const [sourceEvidenceError, setSourceEvidenceError] = useState(false);

  const selectedReport = useMemo(
    () => reports.find((item) => item.id === selectedReportId) || null,
    [reports, selectedReportId]
  );

  const reportMetadataGaps = useMemo(() => {
    if (!selectedReport) return [];
    const gaps = [];
    if (!String(selectedReport.studentId || '').trim()) gaps.push('student');
    if (!String(selectedReport.classId || '').trim()) gaps.push('class');
    if (!String(selectedReport.branchId || '').trim()) gaps.push('branch');
    if (!selectedReport.reportPeriodStart) gaps.push('period start');
    if (!selectedReport.reportPeriodEnd) gaps.push('period end');
    return gaps;
  }, [selectedReport]);

  /**
   * Create-shell selector UI: show whenever Supabase client exists and staff is not in URL demo mode.
   * Do not gate on appUser/profile alone — that hid pickers while session existed or blocked catalog load.
   */
  const showStaffSelectorShell = canAccess && !inDemoMode && isSupabaseConfigured();

  /** While Supabase auth is resolving, avoid flashing raw UUID fields before session is applied. */
  const staffDirectoryAuthPending =
    canAccess &&
    !inDemoMode &&
    isSupabaseConfigured() &&
    supabaseAuthLoading &&
    !hasLiveSupabaseIdentity;

  const staffShellDiagnosticLabel = useMemo(() => {
    if (!showStaffSelectorShell) return '';
    if (staffDirectoryAuthPending) return 'session loading';
    if (!hasLiveSupabaseIdentity) return 'no-session';
    return 'signed-in staff';
  }, [showStaffSelectorShell, staffDirectoryAuthPending, hasLiveSupabaseIdentity]);

  const filteredPickerClasses = useMemo(() => {
    const bid = String(createDraftForm.branchId || '').trim();
    if (!bid) return pickerClasses;
    return pickerClasses.filter((row) => row.branch_id === bid);
  }, [pickerClasses, createDraftForm.branchId]);

  const filteredPickerStudents = useMemo(() => {
    const bid = String(createDraftForm.branchId || '').trim();
    const cid = String(createDraftForm.classId || '').trim();
    let list = pickerStudents;
    if (bid) list = list.filter((row) => row.branch_id === bid);
    if (cid) list = list.filter((row) => !row.class_id || row.class_id === cid);
    return list;
  }, [pickerStudents, createDraftForm.branchId, createDraftForm.classId]);

  const fetchSourceEvidenceBundle = useCallback(async () => {
    if (!selectedReport || !selectedReportId) return null;
    const periodStart = selectedReport.reportPeriodStart
      ? String(selectedReport.reportPeriodStart).slice(0, 10)
      : '';
    const periodEnd = selectedReport.reportPeriodEnd
      ? String(selectedReport.reportPeriodEnd).slice(0, 10)
      : '';
    const mode =
      inDemoMode || !canUseSupabase
        ? SOURCE_AGGREGATION_MODES.FAKE
        : SOURCE_AGGREGATION_MODES.HYBRID;
    return collectAiParentReportSourceEvidence({
      studentId: selectedReport.studentId || '',
      classId: selectedReport.classId || '',
      branchId: selectedReport.branchId || '',
      periodStart,
      periodEnd,
      reportId: isReportIdUuid(selectedReportId) ? selectedReportId : '',
      mode,
    });
  }, [selectedReport, selectedReportId, inDemoMode, canUseSupabase]);

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

  const loadPickerCatalog = useCallback(async () => {
    if (!showStaffSelectorShell) {
      setPickerBranches([]);
      setPickerClasses([]);
      setPickerStudents([]);
      setPickersError('');
      return;
    }
    setPickersLoading(true);
    setPickersError('');
    const [brRes, clRes, stRes] = await Promise.all([getBranches(), getClasses(), getStudents()]);
    const errMsg =
      brRes.error?.message || clRes.error?.message || stRes.error?.message || '';
    if (errMsg) {
      setPickersError('Could not load branch/class/student lists. You can still use Advanced UUIDs below.');
    }
    setPickerBranches(Array.isArray(brRes.data) ? brRes.data : []);
    setPickerClasses(Array.isArray(clRes.data) ? clRes.data : []);
    setPickerStudents(Array.isArray(stRes.data) ? stRes.data : []);
    setPickersLoading(false);
  }, [showStaffSelectorShell]);

  useEffect(() => {
    void loadPickerCatalog();
  }, [loadPickerCatalog]);

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

  useEffect(() => {
    setRealAiDraftPhase(null);
  }, [selectedReportId]);

  useEffect(() => {
    let cancelled = false;

    async function loadSourceEvidencePreview() {
      if (!selectedReportId || !selectedReport) {
        setSourceEvidencePreview(null);
        setSourceEvidenceLoading(false);
        setSourceEvidenceError(false);
        return;
      }

      setSourceEvidenceLoading(true);
      setSourceEvidenceError(false);

      try {
        const data = await fetchSourceEvidenceBundle();
        if (!cancelled) {
          setSourceEvidencePreview(data);
          setSourceEvidenceLoading(false);
        }
      } catch {
        if (!cancelled) {
          setSourceEvidencePreview(null);
          setSourceEvidenceError(true);
          setSourceEvidenceLoading(false);
        }
      }
    }

    void loadSourceEvidencePreview();
    return () => {
      cancelled = true;
    };
  }, [selectedReport, selectedReportId, fetchSourceEvidenceBundle]);

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

  const resetMockDraftForm = () => {
    setMockDraftForm({
      studentSummary: '',
      attendanceSummary: '',
      lessonProgression: '',
      homeworkCompletion: '',
      homeworkPerformance: '',
      strengths: '',
      improvementAreas: '',
      learningGaps: '',
      teacherObservations: '',
      nextRecommendations: '',
      parentSupportSuggestions: '',
      teacherFinalComment: '',
      evidenceSummaries: '',
    });
  };

  const hasUnsafeMockInput = (value) => MOCK_UI_UNSAFE_INPUT_PATTERN.test(typeof value === 'string' ? value : '');

  const buildMockDraftInput = () => ({
    studentSummary: mockDraftForm.studentSummary.trim(),
    attendanceSummary: mockDraftForm.attendanceSummary.trim(),
    lessonProgression: mockDraftForm.lessonProgression.trim(),
    homeworkCompletion: mockDraftForm.homeworkCompletion.trim(),
    homeworkPerformance: mockDraftForm.homeworkPerformance.trim(),
    strengths: mockDraftForm.strengths.trim(),
    improvementAreas: mockDraftForm.improvementAreas.trim(),
    learningGaps: mockDraftForm.learningGaps.trim(),
    teacherObservations: mockDraftForm.teacherObservations.trim(),
    nextRecommendations: mockDraftForm.nextRecommendations.trim(),
    parentSupportSuggestions: mockDraftForm.parentSupportSuggestions.trim(),
    teacherFinalComment: mockDraftForm.teacherFinalComment.trim(),
    evidenceSummaries: mockDraftForm.evidenceSummaries.trim(),
  });

  const mergeMockDraftFormWithEvidence = (formInput, evidenceInput) => {
    const keys = [
      'studentSummary',
      'attendanceSummary',
      'lessonProgression',
      'homeworkCompletion',
      'homeworkPerformance',
      'strengths',
      'improvementAreas',
      'learningGaps',
      'teacherObservations',
      'nextRecommendations',
      'parentSupportSuggestions',
      'teacherFinalComment',
      'evidenceSummaries',
    ];
    const out = {};
    keys.forEach((key) => {
      const formStr = typeof formInput[key] === 'string' ? formInput[key].trim() : '';
      const evStr = typeof evidenceInput[key] === 'string' ? evidenceInput[key].trim() : '';
      out[key] = formStr || evStr || '';
    });
    return out;
  };

  const handleGenerateMockDraft = async () => {
    if (!selectedReportId) {
      toast.message('Select a report first.');
      return;
    }

    if (!selectedReport) {
      toast.message('Select a report first.');
      return;
    }

    let fromEvidence = {};
    try {
      let agg = null;
      if (!sourceEvidenceLoading && sourceEvidencePreview && !sourceEvidenceError) {
        agg = sourceEvidencePreview;
      } else {
        agg = await fetchSourceEvidenceBundle();
      }
      if (!agg) {
        toast.message('Source evidence could not be prepared for this report. Some fields may be incomplete.');
        fromEvidence = {};
      } else {
        fromEvidence = buildMockDraftInputFromSourceEvidence(agg);
      }
    } catch {
      toast.error('Source evidence could not be prepared. Check the report and try again.');
      return;
    }

    const input = mergeMockDraftFormWithEvidence(buildMockDraftInput(), fromEvidence);
    const hasUnsafe = Object.values(input).some((value) => hasUnsafeMockInput(value));
    if (hasUnsafe) {
      toast.error('Mock draft source notes contain blocked private/provider-style patterns.');
      return;
    }

    setGeneratingMockDraft(true);

    if (inDemoMode) {
      const nowIso = new Date().toISOString();
      const existing = demoVersionsByReportId[selectedReportId] || [];
      const nextVersionNumber = existing.length + 1;
      const newVersionId = `${selectedReportId}-v${nextVersionNumber}`;
      const fallback = 'More evidence is needed before making a detailed judgement in this area.';
      const structuredSections = buildMockAiParentReportStructuredSections(input);
      const newVersion = {
        id: newVersionId,
        reportId: selectedReportId,
        versionNumber: nextVersionNumber,
        generationSource: 'mock_ai',
        structuredSections: {
          ...structuredSections,
        },
        teacherEdits: {
          mock_generation_note: 'deterministic local demo mock draft (merged form + fake source evidence)',
          selected_evidence_summary: input.evidenceSummaries || fallback,
        },
        finalText: {
          teacher_final_comment: input.teacherFinalComment || structuredSections.teacher_final_comment || fallback,
        },
        aiModelLabel: 'mock_ui_shell',
        aiGeneratedAt: nowIso,
        createdByProfileId: 'demo-role-user',
        createdAt: nowIso,
      };
      setDemoVersionsByReportId((prev) => ({
        ...prev,
        [selectedReportId]: [newVersion, ...existing],
      }));
      setDemoReports((prev) =>
        prev.map((row) => (row.id === selectedReportId ? { ...row, updatedAt: nowIso } : row))
      );
      await loadDetail();
      resetMockDraftForm();
      toast.success('Demo mock draft generated locally. Review and release manually if needed.');
      setGeneratingMockDraft(false);
      return;
    }

    const result = await generateMockAiParentReportDraft({
      reportId: selectedReportId,
      input,
    });
    if (result.error || !result.data?.version?.id) {
      toast.error('Unable to generate mock draft right now.');
      setGeneratingMockDraft(false);
      return;
    }
    if (result.warning?.check) {
      toast.message(`Lifecycle event check: ${result.warning.message}`);
    }
    await Promise.all([loadReports(), loadDetail()]);
    resetMockDraftForm();
    toast.success('Mock draft generated. Review/edit and release manually when ready.');
    setGeneratingMockDraft(false);
  };

  const handleGenerateRealAiDraft = async () => {
    if (!selectedReportId || !selectedReport) {
      toast.message('Select a report first.');
      return;
    }

    if (inDemoMode) {
      toast.message('Real AI draft needs a live Supabase session. Exit demo role to use this action.');
      return;
    }

    if (!canUseSupabase) {
      toast.error('Sign in required.');
      return;
    }

    if (reportMetadataGaps.length > 0) {
      toast.error(
        `Complete report metadata first (missing: ${reportMetadataGaps.join(', ')}). Real AI needs student, branch, and reporting period.`
      );
      return;
    }

    let fromEvidence = {};
    try {
      let agg = null;
      if (!sourceEvidenceLoading && sourceEvidencePreview && !sourceEvidenceError) {
        agg = sourceEvidencePreview;
      } else {
        agg = await fetchSourceEvidenceBundle();
      }
      if (agg) {
        fromEvidence = buildMockDraftInputFromSourceEvidence(agg);
      }
    } catch {
      toast.error('Source evidence could not be prepared. Check the report and try again.');
      return;
    }

    const input = mergeMockDraftFormWithEvidence(buildMockDraftInput(), fromEvidence);
    const hasUnsafe = Object.values(input).some((value) => hasUnsafeMockInput(value));
    if (hasUnsafe) {
      toast.error('Draft inputs contain blocked private/provider-style patterns.');
      return;
    }

    setGeneratingRealAiDraft(true);
    setRealAiDraftPhase('generating');

    const result = await generateRealAiParentReportDraftViaEdge({
      reportId: selectedReportId,
      input,
    });

    if (result.error || !result.data?.version?.id) {
      setRealAiDraftPhase('failed');
      toast.error(result.error?.message || 'Failed to generate real AI draft.');
      setGeneratingRealAiDraft(false);
      return;
    }

    if (result.warning?.check) {
      toast.message(`Lifecycle event note: ${result.warning.message}`);
    }

    setRealAiDraftPhase('saved');
    toast.success('Real AI draft saved for review. Parents cannot see it until you release a version.');
    await Promise.all([loadReports(), loadDetail()]);
    setGeneratingRealAiDraft(false);
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
        description="Staff-only report drafting and release workflow. Start from source evidence, generate a draft, then review and release manually."
      />

      <p className="text-xs text-muted-foreground border-l-2 border-muted pl-3 py-1 -mt-4 mb-2">
        No report reaches parents until explicit staff release.{' '}
        <span className="font-medium text-foreground">
          Real AI draft generation is available for signed-in staff after selecting a report.
        </span>{' '}
        PDF/export to families is not live yet.
      </p>

      <Card className="p-4 border-dashed border-muted-foreground/35 bg-muted/15">
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          Optional — not part of the release workflow
        </p>
        <h2 className="text-sm font-semibold text-foreground mt-1.5">Internal PDF preview</h2>
        <ul className="mt-2 text-sm text-muted-foreground space-y-1 list-disc pl-5">
          <li>For layout checking only</li>
          <li>Fake/dev data only</li>
          <li>Parents do not see this</li>
        </ul>
        <p className="mt-3">
          <Link
            to="/ai-parent-report-pdf-preview"
            className="text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            Open internal PDF HTML preview
          </Link>
          <span className="text-xs text-muted-foreground block mt-1">
            Parents will download from ParentView after release when that feature ships — not here.
          </span>
        </p>
      </Card>

      <p className="text-sm text-muted-foreground mb-4">
        <span className="font-medium text-foreground">Workflow:</span>{' '}
        Create or select a report shell → Review source evidence → Generate draft from evidence → Optional teacher
        overrides → Submit / approve / release manually.
      </p>

      <Card className="p-3 space-y-2">
        <p className="text-sm font-medium text-foreground">
          {inDemoMode
            ? 'Demo mode — local fake data only; real AI generation disabled.'
            : 'Signed-in staff mode — live Supabase reads/writes through JWT + RLS.'}
        </p>
        <p className="text-sm text-muted-foreground">
          {inDemoMode ? (
            <>
              Uses fake/dev lists only; real AI draft generation is disabled. Remove{' '}
              <code className="text-xs rounded bg-muted px-1">?demoRole=…</code> from the URL and sign in with a staff
              account to test live shells and <span className="font-medium text-foreground">Generate real AI draft</span>.
            </>
          ) : (
            <>
              The <span className="font-medium text-foreground">Demo Role Preview</span> banner above only switches preview
              roles when <code className="text-xs rounded bg-muted px-1">demoRole</code> is set — it does not replace signing
              in. Real AI uses your Supabase session after you select a report.
            </>
          )}
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
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">No AI parent reports found.</p>
              {!inDemoMode && canUseSupabase ? (
                <p className="text-xs text-muted-foreground">
                  Create one using <span className="font-medium text-foreground">Create report shell</span>
                  {' '}— pick branch, student, and dates (no UUID typing needed).
                </p>
              ) : null}
            </div>
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
          <h2 className="font-semibold">Create report shell</h2>
          <p className="text-sm text-muted-foreground">
            Set the reporting period and student/class context. Narrative sections should come from source evidence and
            teacher review — not from typing every field by hand.
          </p>
          {inDemoMode ? (
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
                <Label htmlFor="apr-period-start-d">reportPeriodStart</Label>
                <Input
                  id="apr-period-start-d"
                  type="date"
                  value={createDraftForm.reportPeriodStart}
                  onChange={(event) => setCreateDraftForm((prev) => ({ ...prev, reportPeriodStart: event.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="apr-period-end-d">reportPeriodEnd</Label>
                <Input
                  id="apr-period-end-d"
                  type="date"
                  value={createDraftForm.reportPeriodEnd}
                  onChange={(event) => setCreateDraftForm((prev) => ({ ...prev, reportPeriodEnd: event.target.value }))}
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="apr-assigned-teacher-d">assignedTeacherProfileId (optional)</Label>
                <Input
                  id="apr-assigned-teacher-d"
                  value={createDraftForm.assignedTeacherProfileId}
                  onChange={(event) => setCreateDraftForm((prev) => ({
                    ...prev,
                    assignedTeacherProfileId: event.target.value,
                  }))}
                  placeholder="fake/dev UUID"
                />
              </div>
            </div>
          ) : showStaffSelectorShell ? (
            <>
              <p className="text-[11px] text-muted-foreground">
                <span className="font-medium text-foreground">Mode:</span>{' '}
                <span className="font-mono">{staffShellDiagnosticLabel}</span>
                {' '}— no tokens or secrets shown.
              </p>
              {staffDirectoryAuthPending ? (
                <div className="rounded-lg border bg-muted/30 p-4 flex items-center gap-3">
                  <div className="w-6 h-6 border-2 border-muted border-t-primary rounded-full animate-spin shrink-0" />
                  <p className="text-sm text-muted-foreground">
                    Loading your Supabase session… Branch/class/student controls stay visible; lists fill once JWT + RLS apply.
                  </p>
                </div>
              ) : null}
              {!hasLiveSupabaseIdentity && !staffDirectoryAuthPending ? (
                <div className="rounded-md border border-amber-500/50 bg-amber-500/10 dark:bg-amber-950/40 px-3 py-2 text-sm text-amber-950 dark:text-amber-100">
                  Sign in as real staff to use Branch/Class/Student selectors (JWT + RLS). Remove{' '}
                  <code className="text-xs rounded bg-muted px-1">?demoRole=…</code> from the URL if present, then refresh.
                </div>
              ) : null}
              <p className="text-xs text-muted-foreground">
                Choose branch → optional class filter → student. Lists use the same JWT + RLS as the rest of the app (no
                service role).
              </p>
              {pickersLoading ? (
                <p className="text-sm text-muted-foreground">Loading branches, classes, and students…</p>
              ) : null}
              {pickersError ? (
                <p className="text-xs text-amber-800 dark:text-amber-200">{pickersError}</p>
              ) : null}
              {!pickersLoading && !pickersError && hasLiveSupabaseIdentity && pickerBranches.length === 0 ? (
                <p className="text-xs text-destructive/90">
                  No branches returned — check RLS or seed data, or expand Advanced UUID fallback below.
                </p>
              ) : null}
              {!pickersLoading && !pickersError && hasLiveSupabaseIdentity && pickerBranches.length > 0 && pickerStudents.length === 0 ? (
                <p className="text-xs text-amber-800 dark:text-amber-200">
                  No students visible for this branch/filter — widen the class filter or check fixtures.
                </p>
              ) : null}
              <div className="flex flex-wrap gap-2">
                <Button type="button" size="sm" variant="outline" onClick={() => { void loadPickerCatalog(); }}>
                  Reload lists
                </Button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Branch</Label>
                  <Select
                    value={createDraftForm.branchId || undefined}
                    onValueChange={(value) => {
                      setCreateDraftForm((prev) => ({
                        ...prev,
                        branchId: value,
                        classId: '',
                        studentId: '',
                      }));
                    }}
                  >
                    <SelectTrigger aria-label="Branch">
                      <SelectValue placeholder={pickerBranches.length ? 'Select branch' : 'No branches loaded'} />
                    </SelectTrigger>
                    <SelectContent>
                      {pickerBranches.map((row) => (
                        <SelectItem key={row.id} value={row.id}>
                          {row.name || row.id}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Class (optional)</Label>
                  <Select
                    value={createDraftForm.classId ? createDraftForm.classId : CLASS_SELECT_ANY}
                    onValueChange={(value) => {
                      const classId = value === CLASS_SELECT_ANY ? '' : value;
                      setCreateDraftForm((prev) => ({
                        ...prev,
                        classId,
                        studentId: '',
                      }));
                    }}
                    disabled={!createDraftForm.branchId.trim()}
                  >
                    <SelectTrigger aria-label="Class filter">
                      <SelectValue placeholder="Filter by class" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={CLASS_SELECT_ANY}>Any class in branch</SelectItem>
                      {filteredPickerClasses.map((row) => (
                        <SelectItem key={row.id} value={row.id}>
                          {row.name || row.id}
                          {row.subject ? ` · ${row.subject}` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Student</Label>
                  <Select
                    value={createDraftForm.studentId || undefined}
                    onValueChange={(value) => {
                      const st = pickerStudents.find((r) => r.id === value);
                      setCreateDraftForm((prev) => ({
                        ...prev,
                        studentId: value,
                        branchId: st?.branch_id || prev.branchId,
                        classId: st?.class_id ? st.class_id : prev.classId,
                      }));
                    }}
                    disabled={!createDraftForm.branchId.trim()}
                  >
                    <SelectTrigger aria-label="Student">
                      <SelectValue
                        placeholder={
                          createDraftForm.branchId.trim()
                            ? 'Select student'
                            : 'Choose a branch first'
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredPickerStudents.map((row) => (
                        <SelectItem key={row.id} value={row.id}>
                          {row.full_name || row.id}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {!createDraftForm.branchId.trim() ? (
                    <p className="text-[11px] text-muted-foreground">Select a branch to load students RLS-visible to you.</p>
                  ) : filteredPickerStudents.length === 0 ? (
                    <p className="text-[11px] text-muted-foreground">
                      No students match this branch/class filter — widen class filter or check RLS fixtures.
                    </p>
                  ) : null}
                </div>
                <div className="space-y-1.5">
                  <Label>Report type</Label>
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
                  <Label htmlFor="apr-period-start">Period start</Label>
                  <Input
                    id="apr-period-start"
                    type="date"
                    value={createDraftForm.reportPeriodStart}
                    onChange={(event) => setCreateDraftForm((prev) => ({ ...prev, reportPeriodStart: event.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="apr-period-end">Period end</Label>
                  <Input
                    id="apr-period-end"
                    type="date"
                    value={createDraftForm.reportPeriodEnd}
                    onChange={(event) => setCreateDraftForm((prev) => ({ ...prev, reportPeriodEnd: event.target.value }))}
                  />
                </div>
              </div>
              <Collapsible defaultOpen={false} className="rounded-md border bg-muted/30 text-sm">
                <CollapsibleTrigger className="flex w-full items-center justify-between gap-2 p-3 text-left font-medium text-foreground outline-none hover:bg-muted/40 rounded-md [&[data-state=open]>svg]:rotate-180">
                  <span>Advanced UUID fallback (optional)</span>
                  <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform" aria-hidden />
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="space-y-2 border-t px-3 pb-3 pt-2">
                    <p className="text-xs text-muted-foreground">
                      Hidden by default — expand only if selectors fail RLS or you need a manual override. Same validation as before.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="apr-student-id">studentId</Label>
                        <Input
                          id="apr-student-id"
                          value={createDraftForm.studentId}
                          onChange={(event) => setCreateDraftForm((prev) => ({ ...prev, studentId: event.target.value }))}
                          placeholder="UUID"
                          autoComplete="off"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="apr-class-id">classId</Label>
                        <Input
                          id="apr-class-id"
                          value={createDraftForm.classId}
                          onChange={(event) => setCreateDraftForm((prev) => ({ ...prev, classId: event.target.value }))}
                          placeholder="optional UUID"
                          autoComplete="off"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="apr-branch-id">branchId</Label>
                        <Input
                          id="apr-branch-id"
                          value={createDraftForm.branchId}
                          onChange={(event) => setCreateDraftForm((prev) => ({ ...prev, branchId: event.target.value }))}
                          placeholder="UUID"
                          autoComplete="off"
                        />
                      </div>
                      <div className="space-y-1.5 sm:col-span-2">
                        <Label htmlFor="apr-assigned-teacher">assignedTeacherProfileId (optional)</Label>
                        <Input
                          id="apr-assigned-teacher"
                          value={createDraftForm.assignedTeacherProfileId}
                          onChange={(event) => setCreateDraftForm((prev) => ({
                            ...prev,
                            assignedTeacherProfileId: event.target.value,
                          }))}
                          placeholder="optional UUID"
                          autoComplete="off"
                        />
                      </div>
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </>
          ) : (
            <>
              <p className="text-[11px] text-muted-foreground">
                <span className="font-medium text-foreground">Mode:</span>{' '}
                <span className="font-mono">no-supabase-client</span>
              </p>
              <div className="rounded-md border bg-amber-500/10 dark:bg-amber-950/40 px-3 py-2 text-sm text-amber-950 dark:text-amber-100">
                <span>
                  Supabase URL/key are not configured in this build — you cannot load Branch/Class/Student lists here.
                  Sign in as real staff once the client is configured. Use Advanced UUID fallback only if you must create a shell manually.
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Report type</Label>
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
                  <Label htmlFor="apr-period-start-fallback">Period start</Label>
                  <Input
                    id="apr-period-start-fallback"
                    type="date"
                    value={createDraftForm.reportPeriodStart}
                    onChange={(event) => setCreateDraftForm((prev) => ({ ...prev, reportPeriodStart: event.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="apr-period-end-fallback">Period end</Label>
                  <Input
                    id="apr-period-end-fallback"
                    type="date"
                    value={createDraftForm.reportPeriodEnd}
                    onChange={(event) => setCreateDraftForm((prev) => ({ ...prev, reportPeriodEnd: event.target.value }))}
                  />
                </div>
              </div>
              <Collapsible defaultOpen={false} className="rounded-md border bg-muted/30 text-sm">
                <CollapsibleTrigger className="flex w-full items-center justify-between gap-2 p-3 text-left font-medium text-foreground outline-none hover:bg-muted/40 rounded-md [&[data-state=open]>svg]:rotate-180">
                  <span>Advanced UUID fallback (manual shell only)</span>
                  <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform" aria-hidden />
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="space-y-2 border-t px-3 pb-3 pt-2">
                    <p className="text-xs text-muted-foreground">
                      Use only when pickers cannot run in this build. Same validation as the staff selector path.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="apr-student-id-fallback">studentId</Label>
                        <Input
                          id="apr-student-id-fallback"
                          value={createDraftForm.studentId}
                          onChange={(event) => setCreateDraftForm((prev) => ({ ...prev, studentId: event.target.value }))}
                          placeholder="UUID"
                          autoComplete="off"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="apr-class-id-fallback">classId (optional)</Label>
                        <Input
                          id="apr-class-id-fallback"
                          value={createDraftForm.classId}
                          onChange={(event) => setCreateDraftForm((prev) => ({ ...prev, classId: event.target.value }))}
                          placeholder="optional UUID"
                          autoComplete="off"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="apr-branch-id-fallback">branchId</Label>
                        <Input
                          id="apr-branch-id-fallback"
                          value={createDraftForm.branchId}
                          onChange={(event) => setCreateDraftForm((prev) => ({ ...prev, branchId: event.target.value }))}
                          placeholder="UUID"
                          autoComplete="off"
                        />
                      </div>
                      <div className="space-y-1.5 sm:col-span-2">
                        <Label htmlFor="apr-assigned-teacher-fallback">assignedTeacherProfileId (optional)</Label>
                        <Input
                          id="apr-assigned-teacher-fallback"
                          value={createDraftForm.assignedTeacherProfileId}
                          onChange={(event) => setCreateDraftForm((prev) => ({
                            ...prev,
                            assignedTeacherProfileId: event.target.value,
                          }))}
                          placeholder="optional UUID"
                          autoComplete="off"
                        />
                      </div>
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </>
          )}
          <Button onClick={() => { void handleCreateDraft(); }} disabled={creatingDraft}>
            {creatingDraft ? 'Creating…' : 'Create report shell'}
          </Button>
        </Card>
      </div>

      <Card className="p-4 space-y-4">
        <h2 className="font-semibold">Report detail</h2>
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

      <Card className="p-4 space-y-4 border-dashed border-primary/20 bg-muted/10">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-semibold">Source Evidence Preview</h2>
            <Badge variant="outline">
              {inDemoMode ? 'Demo/fallback evidence' : 'System evidence preview'}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            {inDemoMode
              ? 'Demo and fallback wording only — no live system reads in this mode.'
              : 'System evidence is used where available. Missing sources use safe fallback wording until the evidence pipeline is complete.'}
          </p>
          <p className="text-sm text-foreground mt-2">
            Read this before generating a draft — narrative sections should start from evidence, not blank forms.
          </p>
        </div>

        {!selectedReportId ? (
          <p className="text-sm text-muted-foreground">Select a report to preview source evidence.</p>
        ) : null}

        {selectedReportId && sourceEvidenceLoading ? (
          <p className="text-sm text-muted-foreground">
            {inDemoMode ? 'Loading demo source evidence…' : 'Loading system source evidence…'}
          </p>
        ) : null}

        {selectedReportId && !sourceEvidenceLoading && sourceEvidenceError ? (
          <p className="text-sm text-muted-foreground">
            Source evidence preview is temporarily unavailable. Try reselecting a report.
          </p>
        ) : null}

        {selectedReportId && !sourceEvidenceLoading && !sourceEvidenceError && reportMetadataGaps.length > 0 ? (
          <div className="rounded-lg border border-sky-200/80 bg-sky-50/50 dark:bg-sky-950/20 p-3 text-sm text-muted-foreground">
            <p className="text-xs font-medium text-foreground">Scope note</p>
            <p>
              This report is missing: {reportMetadataGaps.join(', ')}. The preview still runs with safe
              placeholders where needed.
            </p>
          </div>
        ) : null}

        {selectedReportId && !sourceEvidenceLoading && !sourceEvidenceError && sourceEvidencePreview ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg border bg-muted/20 p-3 space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Attendance summary</p>
                <p>{sourceEvidencePreview.attendanceSummary}</p>
              </div>
              <div className="rounded-lg border bg-muted/20 p-3 space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Homework summary</p>
                <p>{sourceEvidencePreview.homeworkSummary}</p>
              </div>
              <div className="rounded-lg border bg-muted/20 p-3 space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Worksheet evidence</p>
                <p>{sourceEvidencePreview.worksheetEvidenceSummary}</p>
              </div>
              <div className="rounded-lg border bg-muted/20 p-3 space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Lesson progression</p>
                <p>{sourceEvidencePreview.lessonProgressionSummary}</p>
              </div>
              <div className="rounded-lg border bg-muted/20 p-3 space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Observations</p>
                <p>{sourceEvidencePreview.observationSummary}</p>
              </div>
              <div className="rounded-lg border bg-muted/20 p-3 space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Parent Communication</p>
                <p>{sourceEvidencePreview.parentCommunicationSummary}</p>
              </div>
              <div className="rounded-lg border bg-muted/20 p-3 space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Memories / media</p>
                <p>{sourceEvidencePreview.memoriesEvidenceSummary}</p>
              </div>
              <div className="rounded-lg border bg-muted/20 p-3 space-y-1 md:col-span-2">
                <p className="text-xs font-medium text-muted-foreground">Curriculum context</p>
                <p>{sourceEvidencePreview.curriculumContext}</p>
              </div>
            </div>

            {Array.isArray(sourceEvidencePreview.warnings) && sourceEvidencePreview.warnings.length > 0 ? (
              <div className="rounded-lg border border-amber-200/80 bg-amber-50/50 dark:bg-amber-950/20 p-3 space-y-2">
                <p className="text-xs font-medium text-amber-900 dark:text-amber-200">Heads-up</p>
                <ul className="flex flex-wrap gap-2 list-none p-0 m-0">
                  {sourceEvidencePreview.warnings.map((w) => (
                    <li key={w}>
                      <Badge variant="outline" className="font-normal text-xs border-amber-300/80 bg-white/60 dark:bg-amber-950/40">
                        {w}
                      </Badge>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {Array.isArray(sourceEvidencePreview.missingEvidence) && sourceEvidencePreview.missingEvidence.length > 0 ? (
              <div className="rounded-lg border p-3 space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Fallback / missing evidence</p>
                <ul className="text-sm list-disc pl-5 text-muted-foreground space-y-0.5">
                  {sourceEvidencePreview.missingEvidence.map((m) => (
                    <li key={m}>{m}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className="space-y-2">
              <p className="text-sm font-medium">Evidence items (staff-only classification)</p>
              <p className="text-xs text-muted-foreground">
                Items marked “not sent to provider” stay internal and must never be sent to an external AI service.
                Nothing here is visible to parents until a report is explicitly released.
              </p>
              <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
                {(sourceEvidencePreview.evidenceItems || []).map((item, idx) => {
                  const isNever = item.classification === EVIDENCE_CLASSIFICATION.NEVER_SEND_TO_PROVIDER;
                  const isSensitive = item.classification === EVIDENCE_CLASSIFICATION.SENSITIVE_REQUIRES_CONFIRMATION;
                  const isStaffPick = item.classification === EVIDENCE_CLASSIFICATION.STAFF_ONLY_REQUIRES_SELECTION;
                  return (
                    <div
                      key={`${item.sourceType}-${idx}`}
                      className={`rounded-lg border p-3 text-sm space-y-1 ${
                        isNever ? 'border-destructive/40 bg-destructive/5' : ''
                      }`}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{item.label}</span>
                        <Badge variant="outline" className="text-[10px] font-mono">{item.sourceType}</Badge>
                        <Badge variant={isNever ? 'destructive' : 'secondary'} className="text-[10px]">
                          {evidenceClassificationBadgeLabel(item.classification)}
                        </Badge>
                        {isNever ? (
                          <span className="text-xs text-destructive">Not sent to provider</span>
                        ) : null}
                      </div>
                      <p className="text-muted-foreground">{item.summary}</p>
                      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                        <span>Confidence: {item.confidence}</span>
                        <span>Visibility: {item.visibility}</span>
                        <span>Teacher confirm: {item.requiresTeacherConfirmation ? 'yes' : 'no'}</span>
                        <span>Default in draft: {item.includedInDraftByDefault ? 'yes' : 'no'}</span>
                        {isSensitive ? (
                          <span className="text-amber-700 dark:text-amber-400">Requires teacher confirmation</span>
                        ) : null}
                        {isStaffPick && !isNever ? (
                          <span>Staff selection required before inclusion</span>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : null}
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card className="p-4 space-y-3 xl:col-span-2 border-primary/15 bg-muted/5">
          <h2 className="font-semibold">Generate draft from source evidence</h2>
          <p className="text-sm text-muted-foreground">
            Mock mode only — pulls text from the Source Evidence Preview above and merges any notes you add below.
            No real AI provider call. Nothing is sent to parents until you run lifecycle release later.
          </p>
          <div className="rounded-lg border bg-card p-3 space-y-2">
            <p className="text-xs font-medium text-foreground">Optional teacher notes / overrides</p>
            <p className="text-xs text-muted-foreground">
              Leave fields blank to use source evidence where available. Fill only what you want to correct or
              emphasise before generating.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="apr-mock-student-summary">Student Summary</Label>
              <Textarea
                id="apr-mock-student-summary"
                value={mockDraftForm.studentSummary}
                onChange={(event) => setMockDraftForm((prev) => ({ ...prev, studentSummary: event.target.value }))}
                placeholder="Optional — leave blank to use evidence"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="apr-mock-attendance-summary">Attendance Summary</Label>
              <Textarea
                id="apr-mock-attendance-summary"
                value={mockDraftForm.attendanceSummary}
                onChange={(event) => setMockDraftForm((prev) => ({ ...prev, attendanceSummary: event.target.value }))}
                placeholder="Optional"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="apr-mock-lesson-progression">Lesson Progression</Label>
              <Textarea
                id="apr-mock-lesson-progression"
                value={mockDraftForm.lessonProgression}
                onChange={(event) => setMockDraftForm((prev) => ({ ...prev, lessonProgression: event.target.value }))}
                placeholder="Optional"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="apr-mock-homework-completion">Homework Completion</Label>
              <Textarea
                id="apr-mock-homework-completion"
                value={mockDraftForm.homeworkCompletion}
                onChange={(event) => setMockDraftForm((prev) => ({ ...prev, homeworkCompletion: event.target.value }))}
                placeholder="Optional"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="apr-mock-homework-performance">Homework Performance</Label>
              <Textarea
                id="apr-mock-homework-performance"
                value={mockDraftForm.homeworkPerformance}
                onChange={(event) => setMockDraftForm((prev) => ({ ...prev, homeworkPerformance: event.target.value }))}
                placeholder="Optional"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="apr-mock-strengths">Strengths</Label>
              <Textarea
                id="apr-mock-strengths"
                value={mockDraftForm.strengths}
                onChange={(event) => setMockDraftForm((prev) => ({ ...prev, strengths: event.target.value }))}
                placeholder="Optional"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="apr-mock-improvement-areas">Improvement Areas</Label>
              <Textarea
                id="apr-mock-improvement-areas"
                value={mockDraftForm.improvementAreas}
                onChange={(event) => setMockDraftForm((prev) => ({ ...prev, improvementAreas: event.target.value }))}
                placeholder="Optional"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="apr-mock-learning-gaps">Learning Gaps</Label>
              <Textarea
                id="apr-mock-learning-gaps"
                value={mockDraftForm.learningGaps}
                onChange={(event) => setMockDraftForm((prev) => ({ ...prev, learningGaps: event.target.value }))}
                placeholder="Optional"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="apr-mock-teacher-observations">Teacher Observations</Label>
              <Textarea
                id="apr-mock-teacher-observations"
                value={mockDraftForm.teacherObservations}
                onChange={(event) => setMockDraftForm((prev) => ({ ...prev, teacherObservations: event.target.value }))}
                placeholder="Optional"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="apr-mock-next-recommendations">Next Recommendations</Label>
              <Textarea
                id="apr-mock-next-recommendations"
                value={mockDraftForm.nextRecommendations}
                onChange={(event) => setMockDraftForm((prev) => ({ ...prev, nextRecommendations: event.target.value }))}
                placeholder="Optional"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="apr-mock-parent-support">Parent Support Suggestions</Label>
              <Textarea
                id="apr-mock-parent-support"
                value={mockDraftForm.parentSupportSuggestions}
                onChange={(event) => setMockDraftForm((prev) => ({ ...prev, parentSupportSuggestions: event.target.value }))}
                placeholder="Optional"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="apr-mock-final-comment">Teacher Final Comment</Label>
              <Textarea
                id="apr-mock-final-comment"
                value={mockDraftForm.teacherFinalComment}
                onChange={(event) => setMockDraftForm((prev) => ({ ...prev, teacherFinalComment: event.target.value }))}
                placeholder="Optional"
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="apr-mock-evidence-summaries">Evidence Summaries</Label>
              <Textarea
                id="apr-mock-evidence-summaries"
                value={mockDraftForm.evidenceSummaries}
                onChange={(event) => setMockDraftForm((prev) => ({ ...prev, evidenceSummaries: event.target.value }))}
                placeholder="Optional — fake/dev-safe notes only"
              />
            </div>
          </div>
          <Button
            onClick={() => {
              void handleGenerateMockDraft();
            }}
            disabled={generatingMockDraft || !selectedReportId}
          >
            {generatingMockDraft ? 'Generating mock draft...' : 'Generate mock draft'}
          </Button>
          <p className="text-xs text-muted-foreground">
            No real AI provider. No auto-submit, approve, or release. Parents only see content after explicit release.
          </p>
        </Card>

        <Card className="p-4 space-y-3 xl:col-span-2 border-amber-200/60 bg-amber-50/40 dark:bg-amber-950/20 dark:border-amber-900/40">
          <h2 className="font-semibold">Generate real AI draft</h2>
          <p className="text-sm text-muted-foreground">
            Runs the secured server-side AI service using your staff login and the fields above (merged with Source
            Evidence Preview like mock draft). This creates a new{' '}
            <span className="font-medium text-foreground">staff-only draft version</span>.{' '}
            <span className="font-medium text-foreground">
              Parents cannot see any draft — teacher/staff must review and explicitly release
            </span>{' '}
            before families see content.
          </p>
          <ul className="text-xs text-muted-foreground list-disc pl-4 space-y-1">
            <li>Uses live Edge generation — provider credentials stay on the server.</li>
            <li>No automatic submit, approve, or release.</li>
            <li>Unavailable in demo role — sign in as staff without demo mode.</li>
          </ul>
          <Button
            type="button"
            variant="default"
            onClick={() => {
              void handleGenerateRealAiDraft();
            }}
            disabled={
              generatingRealAiDraft ||
              generatingMockDraft ||
              !selectedReportId ||
              inDemoMode ||
              !canUseSupabase
            }
          >
            {generatingRealAiDraft ? 'Generating draft…' : 'Generate real AI draft'}
          </Button>
          {realAiDraftPhase === 'saved' ? (
            <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300">
              Real AI draft saved for review — still not visible to parents until release.
            </p>
          ) : null}
          {realAiDraftPhase === 'failed' ? (
            <p className="text-sm font-medium text-destructive">
              Failed to generate real AI draft — fix issues above or try again.
            </p>
          ) : null}
          {!inDemoMode && canUseSupabase && selectedReportId ? (
            <p className="text-xs text-muted-foreground">
              {generatingRealAiDraft
                ? 'Calling secured Edge generation…'
                : 'Only runs when you click the button — nothing runs on page load or when selecting a report.'}
            </p>
          ) : null}
          {inDemoMode ? (
            <p className="text-xs text-amber-800 dark:text-amber-200">
              Switch off demo role and sign in to generate a real AI draft.
            </p>
          ) : null}
        </Card>

        <Card className="p-4 space-y-3">
          <h2 className="font-semibold">Manual version / override notes</h2>
          <p className="text-sm text-muted-foreground">
            Optional — use when you need a fully hand-written version or to correct evidence without regenerating the
            mock draft. These fields are overrides only.
          </p>
          <div className="space-y-1.5">
            <Label>Version type</Label>
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
            {creatingVersion ? 'Saving…' : 'Save manual version'}
          </Button>
        </Card>

        <Card className="p-4 space-y-3">
          <h2 className="font-semibold">Lifecycle</h2>
          <p className="text-sm text-muted-foreground">
            Submit and approve stay internal. <span className="font-medium text-foreground">Release</span> is the step
            that can make the selected version parent-visible — choose the correct version in Report detail first. No
            auto-release, notifications, or PDF.
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
