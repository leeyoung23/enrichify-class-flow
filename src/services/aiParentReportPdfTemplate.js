/**
 * Pure helpers for released AI Parent Report PDF/HTML preview — no Supabase, no storage, no binary PDF.
 * See docs/ai-parent-report-pdf-template-contract-plan.md
 */

export const PDF_SECTION_MAX_CHARS = 16000;

/** Ordered normalization: first matching source key wins (structured-first semantics when building flat objects). */
export const PDF_SECTION_DEFINITIONS = [
  { id: 'summary', label: 'Summary', sourceKeys: ['summary', 'student_summary'] },
  { id: 'attendance_punctuality', label: 'Attendance & punctuality', sourceKeys: ['attendance_punctuality', 'attendance_summary'] },
  { id: 'lesson_progression', label: 'Lesson progression', sourceKeys: ['lesson_progression', 'learning_focus'] },
  { id: 'homework_completion', label: 'Homework completion', sourceKeys: ['homework_completion'] },
  { id: 'homework_assessment_performance', label: 'Homework performance', sourceKeys: ['homework_assessment_performance'] },
  { id: 'strengths', label: 'Strengths', sourceKeys: ['strengths'] },
  { id: 'areas_for_improvement', label: 'Areas for improvement', sourceKeys: ['areas_for_improvement'] },
  { id: 'learning_gaps', label: 'Learning gaps', sourceKeys: ['learning_gaps'] },
  { id: 'next_recommendations', label: 'Next recommendations', sourceKeys: ['next_recommendations'] },
  { id: 'parent_support_suggestions', label: 'Parent support suggestions', sourceKeys: ['parent_support_suggestions', 'suggested_home_practice'] },
  { id: 'teacher_final_comment', label: 'Teacher final comment', sourceKeys: ['teacher_final_comment'] },
  { id: 'supervisor_note', label: 'Supervisor note', sourceKeys: ['supervisor_note', 'hq_note'] },
];

const FORBIDDEN_SUBSTRINGS = [
  'http://',
  'https://',
  'storage/v1',
  'supabase.co/storage',
  's3://',
  '/objects/',
  'generation_source',
  'generationSource',
  'ai_model_label',
  'evidence_links',
  'release_events',
  'service_role',
  'service role',
  'SUPABASE_SERVICE_ROLE',
  '.env',
  'postgres',
  'RLS policy',
  'internal_staff_note',
  'internalNote',
];

/**
 * Map ParentView-style section values to plain text for PDF.
 * @param {unknown} value
 * @returns {string}
 */
export function mapSectionValueToPdfText(value) {
  if (typeof value === 'string') return value.trim();
  if (Array.isArray(value)) {
    const list = value
      .map((item) => (typeof item === 'string' ? item.trim() : ''))
      .filter(Boolean);
    return list.join('\n');
  }
  if (value && typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch {
      return '';
    }
  }
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return '';
}

function truncatePdfText(text) {
  const s = typeof text === 'string' ? text.trim() : '';
  if (s.length <= PDF_SECTION_MAX_CHARS) return s;
  return `${s.slice(0, PDF_SECTION_MAX_CHARS)}…`;
}

/**
 * Normalize a flat sections object (structured/final merged) into ordered rows.
 * @param {Record<string, unknown>} sections
 * @returns {{ key: string, label: string, content: string }[]}
 */
export function normalizeReportSectionsForPdf(sections) {
  if (!sections || typeof sections !== 'object') return [];
  const out = [];
  for (const def of PDF_SECTION_DEFINITIONS) {
    let combined = '';
    for (const sk of def.sourceKeys) {
      if (Object.prototype.hasOwnProperty.call(sections, sk)) {
        const piece = mapSectionValueToPdfText(sections[sk]);
        if (piece) {
          combined = piece;
          break;
        }
      }
    }
    const content = truncatePdfText(combined);
    if (content) {
      out.push({ key: def.id, label: def.label, content });
    }
  }
  return out;
}

/**
 * Same resolution order as ParentView `resolveParentReportSection`: try every structured key first, then every finalText key.
 */
export function resolveSectionFromReleaseVersion(currentVersion, sourceKeys) {
  if (!Array.isArray(sourceKeys) || sourceKeys.length === 0) return '';
  const structured = currentVersion?.structuredSections && typeof currentVersion.structuredSections === 'object'
    ? currentVersion.structuredSections
    : {};
  const finalText = currentVersion?.finalText && typeof currentVersion.finalText === 'object'
    ? currentVersion.finalText
    : {};
  for (const key of sourceKeys) {
    const t = mapSectionValueToPdfText(structured[key]);
    if (t) return t;
  }
  for (const key of sourceKeys) {
    const t = mapSectionValueToPdfText(finalText[key]);
    if (t) return t;
  }
  return '';
}

/**
 * Normalize sections using merged structured/final rules (ParentView-aligned).
 * @param {{ structuredSections?: object, finalText?: object }} currentVersion
 * @returns {{ key: string, label: string, content: string }[]}
 */
export function normalizeReportSectionsFromReleaseVersion(currentVersion) {
  const rows = [];
  for (const def of PDF_SECTION_DEFINITIONS) {
    const raw = resolveSectionFromReleaseVersion(currentVersion, def.sourceKeys);
    const content = truncatePdfText(raw);
    if (content) {
      rows.push({ key: def.id, label: def.label, content });
    }
  }
  return rows;
}

/**
 * Merge structured + finalText into one flat lookup (structured wins on same key).
 * Useful when callers already merged upstream.
 * @param {{ structuredSections?: object, finalText?: object }} currentVersion
 * @returns {Record<string, unknown>}
 */
export function flattenReleaseVersionSections(currentVersion) {
  const finalText = currentVersion?.finalText && typeof currentVersion.finalText === 'object'
    ? currentVersion.finalText
    : {};
  const structured = currentVersion?.structuredSections && typeof currentVersion.structuredSections === 'object'
    ? currentVersion.structuredSections
    : {};
  return { ...finalText, ...structured };
}

/**
 * Pure adapter — does not call Supabase. Caller supplies already-fetched released rows.
 * @param {{ report: object, currentVersion: object, context?: object }} args
 * @returns {{ ok: true, data: object } | { ok: false, error: string }}
 */
export function buildReleasedReportPdfInputFromParentViewContext({ report, currentVersion, context = {} }) {
  if (!report || typeof report !== 'object') {
    return { ok: false, error: 'Invalid report.' };
  }
  if (report.status && report.status !== 'released') {
    return { ok: false, error: 'Only released reports can be exported.' };
  }
  if (!currentVersion || typeof currentVersion !== 'object') {
    return { ok: false, error: 'Invalid report version.' };
  }

  const rows = normalizeReportSectionsFromReleaseVersion(currentVersion);
  const sections = rows.map((r) => ({
    id: r.key,
    title: r.label,
    body: r.content,
  }));

  const templateVariant = inferTemplateVariant(report.reportType);

  const data = {
    reportId: String(report.id ?? ''),
    versionId: String(currentVersion.id ?? ''),
    templateVariant,
    student: {
      displayName: String(context.studentDisplayName || report.student_display_name || 'Student'),
    },
    class: { label: String(context.classLabel || '') },
    programme: { label: String(context.programmeLabel || '') },
    branch: {
      name: String(context.branchName || 'EduCentre'),
      logoUrl: null,
    },
    reportPeriod: {
      start: String(report.reportPeriodStart || report.report_period_start || ''),
      end: String(report.reportPeriodEnd || report.report_period_end || ''),
    },
    releasedAt: String(report.releasedAt || report.released_at || ''),
    releasedBy: context.releasedByDisplayName ? { displayName: String(context.releasedByDisplayName) } : null,
    teacher: context.teacherDisplayName ? { displayName: String(context.teacherDisplayName) } : null,
    sections,
    footer: {
      contactLine: String(context.footerContactLine || 'Demo Centre • demo.local • placeholder only'),
      disclaimer: 'Confidential. For educational purposes only. Not a medical or legal assessment.',
    },
  };

  return { ok: true, data };
}

function inferTemplateVariant(reportType) {
  const t = typeof reportType === 'string' ? reportType.trim().toLowerCase() : '';
  if (t.includes('weekly')) return 'weekly_brief';
  if (t.includes('graduation') || t.includes('milestone')) return 'graduation';
  if (t.includes('homework')) return 'homework_feedback';
  return 'monthly_progress';
}

/**
 * @param {{ variant?: string }} [options]
 * @returns {object} releasedReportPdfInput shape — fake data only.
 */
export function buildDemoReleasedReportPdfInput(options = {}) {
  const variant = options.variant || 'monthly_progress';

  const baseSections = {
    summary: 'Demo Student One is progressing steadily across literacy and numeracy this period.',
    student_summary: '',
    attendance_punctuality: 'Present for scheduled sessions; punctuality good.',
    lesson_progression: 'Building confidence with guided reading and short written responses.',
    homework_completion: 'Most homework tasks submitted on time.',
    homework_assessment_performance: 'Written responses show improved structure.',
    strengths: 'Participates willingly in group discussion.',
    areas_for_improvement: 'Could deepen explanations in open-ended questions.',
    learning_gaps: 'Minor spelling gaps in topic vocabulary.',
    next_recommendations: 'Practice two short summaries per week with a simple checklist.',
    parent_support_suggestions: 'Keep a calm 15-minute homework routine.',
    teacher_final_comment: 'Thank you for consistent support at home.',
    supervisor_note: '',
    hq_note: '',
  };

  if (variant === 'weekly_brief') {
    return {
      reportId: '11111111-1111-4111-8111-111111111111',
      versionId: '22222222-2222-4222-8222-222222222222',
      templateVariant: 'weekly_brief',
      student: { displayName: 'Demo Student One' },
      class: { label: 'Alpha Class' },
      programme: { label: 'Alpha English' },
      branch: { name: 'EduCentre Demo', logoUrl: null },
      reportPeriod: { start: '2026-04-21', end: '2026-04-27' },
      releasedAt: '2026-04-28T09:00:00.000Z',
      releasedBy: { displayName: 'Demo Supervisor' },
      teacher: { displayName: 'Demo Teacher' },
      sections: normalizeReportSectionsForPdf({
        summary: 'Short weekly snapshot for Demo Student One.',
        attendance_punctuality: 'Good attendance.',
        homework_completion: 'Submitted on time.',
        teacher_final_comment: 'Keep up the great routine.',
      }).map((r) => ({ id: r.key, title: r.label, body: r.content })),
      footer: {
        contactLine: 'EduCentre Demo • fake contact line',
        disclaimer: 'Confidential. For educational purposes only.',
      },
    };
  }

  if (variant === 'long_text') {
    const long = `${'Lorem ipsum dolor sit amet. '.repeat(200)}`.slice(0, PDF_SECTION_MAX_CHARS + 500);
    return {
      reportId: '33333333-3333-4333-8333-333333333333',
      versionId: '44444444-4444-4444-8444-444444444444',
      templateVariant: 'monthly_progress',
      student: { displayName: 'Demo Student One' },
      class: { label: 'Alpha Class' },
      programme: { label: 'Alpha English' },
      branch: { name: 'EduCentre Demo', logoUrl: null },
      reportPeriod: { start: '2026-03-01', end: '2026-03-31' },
      releasedAt: '2026-04-01T10:00:00.000Z',
      releasedBy: null,
      teacher: { displayName: 'Demo Teacher' },
      sections: normalizeReportSectionsForPdf({
        ...baseSections,
        teacher_final_comment: long,
      }).map((r) => ({ id: r.key, title: r.label, body: r.content })),
      footer: {
        contactLine: 'EduCentre Demo',
        disclaimer: 'Confidential. For educational purposes only.',
      },
    };
  }

  if (variant === 'sparse_optional_fields') {
    return {
      reportId: '55555555-5555-4555-8555-555555555555',
      versionId: '66666666-6666-4666-8666-666666666666',
      templateVariant: 'monthly_progress',
      student: { displayName: 'Demo Student One' },
      class: { label: '' },
      programme: { label: '' },
      branch: { name: 'EduCentre', logoUrl: null },
      reportPeriod: { start: '2026-04-01', end: '2026-04-30' },
      releasedAt: '2026-05-01T08:00:00.000Z',
      releasedBy: null,
      teacher: null,
      sections: normalizeReportSectionsForPdf({
        summary: 'Minimal sparse demo — only required narrative.',
      }).map((r) => ({ id: r.key, title: r.label, body: r.content })),
      footer: {
        contactLine: 'EduCentre',
        disclaimer: 'Confidential.',
      },
    };
  }

  // monthly_progress (default)
  const rows = normalizeReportSectionsForPdf(baseSections);
  return {
    reportId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    versionId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    templateVariant: 'monthly_progress',
    student: { displayName: 'Demo Student One' },
    class: { label: 'Alpha Class' },
    programme: { label: 'Alpha English' },
    branch: { name: 'EduCentre', logoUrl: null },
    reportPeriod: { start: '2026-04-01', end: '2026-04-30' },
    releasedAt: '2026-05-02T08:30:00.000Z',
    releasedBy: { displayName: 'Demo Supervisor' },
    teacher: { displayName: 'Demo Teacher' },
    sections: rows.map((r) => ({ id: r.key, title: r.label, body: r.content })),
    footer: {
      contactLine: 'EduCentre • Demo Branch • +61 400 000 000',
      disclaimer: 'Confidential. For educational purposes only. Demo data only.',
    },
  };
}

function containsForbiddenContent(str) {
  if (typeof str !== 'string') return false;
  const lower = str.toLowerCase();
  for (const bad of FORBIDDEN_SUBSTRINGS) {
    if (lower.includes(bad.toLowerCase())) return true;
  }
  return false;
}

/**
 * @param {object} input — releasedReportPdfInput shape
 * @returns {{ ok: true, data: object } | { ok: false, error: string }}
 */
export function validateReleasedReportPdfInput(input) {
  if (!input || typeof input !== 'object') {
    return { ok: false, error: 'Invalid input.' };
  }

  if (input.status && input.status !== 'released') {
    return { ok: false, error: 'Export is only available for released reports.' };
  }

  const reportId = input.reportId;
  const versionId = input.versionId;
  const releasedAt = input.releasedAt;
  const templateVariant = input.templateVariant;

  if (typeof reportId !== 'string' || !reportId.trim()) {
    return { ok: false, error: 'Missing report reference.' };
  }
  if (typeof versionId !== 'string' || !versionId.trim()) {
    return { ok: false, error: 'Missing version reference.' };
  }
  if (typeof releasedAt !== 'string' || !releasedAt.trim()) {
    return { ok: false, error: 'Missing release date.' };
  }
  if (typeof templateVariant !== 'string' || !templateVariant.trim()) {
    return { ok: false, error: 'Missing template variant.' };
  }

  const studentName = input.student?.displayName;
  if (typeof studentName !== 'string' || !studentName.trim()) {
    return { ok: false, error: 'Missing student display name.' };
  }

  const sections = input.sections;
  if (!Array.isArray(sections) || sections.length === 0) {
    return { ok: false, error: 'Report has no printable sections.' };
  }

  let nonEmpty = 0;
  for (const sec of sections) {
    if (!sec || typeof sec !== 'object') {
      return { ok: false, error: 'Invalid section.' };
    }
    const body = sec.body ?? sec.content;
    const title = sec.title ?? sec.label;
    const id = sec.id ?? sec.key;
    if (typeof body !== 'string') {
      return { ok: false, error: 'Section content must be text.' };
    }
    if (typeof title !== 'string' || !title.trim()) {
      return { ok: false, error: 'Section title missing.' };
    }
    if (typeof id !== 'string' || !id.trim()) {
      return { ok: false, error: 'Section reference missing.' };
    }
    if (containsForbiddenContent(body) || containsForbiddenContent(title) || containsForbiddenContent(id)) {
      return { ok: false, error: 'Section content is not allowed.' };
    }
    if (body.trim()) nonEmpty += 1;
    if (body.length > PDF_SECTION_MAX_CHARS) {
      return { ok: false, error: 'Section content is too long.' };
    }
  }

  if (nonEmpty === 0) {
    return { ok: false, error: 'Report has no printable sections.' };
  }

  const scanTargets = [
    input.student?.displayName,
    input.class?.label,
    input.programme?.label,
    input.branch?.name,
    input.footer?.contactLine,
    input.footer?.disclaimer,
    input.releasedAt,
    reportId,
    versionId,
  ];

  for (const t of scanTargets) {
    if (typeof t === 'string' && containsForbiddenContent(t)) {
      return { ok: false, error: 'Input contains disallowed content.' };
    }
  }

  return { ok: true, data: input };
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatPeriod(start, end) {
  const a = typeof start === 'string' ? start.trim() : '';
  const b = typeof end === 'string' ? end.trim() : '';
  if (a && b) return `${a} – ${b}`;
  return a || b || '—';
}

/**
 * @param {object} input
 * @returns {{ ok: true, html: string, input: object } | { ok: false, error: string }}
 */
export function renderReleasedReportPdfHtml(input) {
  const v = validateReleasedReportPdfInput(input);
  if (!v.ok) {
    return { ok: false, error: v.error };
  }

  const inv = v.data;
  const title = 'Progress report';

  const parts = [];
  parts.push('<!DOCTYPE html>');
  parts.push('<html lang="en">');
  parts.push('<head>');
  parts.push('<meta charset="utf-8" />');
  parts.push(`<title>${escapeHtml(title)}</title>`);
  parts.push('<style>');
  parts.push(`
    @page { size: A4 portrait; margin: 16mm; }
    body { font-family: Georgia, "Times New Roman", serif; font-size: 11pt; line-height: 1.35; color: #111; }
    h1 { font-size: 18pt; margin: 0 0 8pt; }
    h2 { font-size: 13pt; margin: 16pt 0 6pt; border-bottom: 1px solid #ccc; padding-bottom: 4pt; }
    .meta { font-size: 10pt; color: #444; margin-bottom: 14pt; }
    .brand { font-weight: bold; font-size: 12pt; margin-bottom: 4pt; }
    .section-body { white-space: pre-wrap; margin-top: 4pt; }
    footer { margin-top: 20pt; font-size: 9pt; color: #555; border-top: 1px solid #ddd; padding-top: 8pt; }
    .placeholder-logo { border: 1px dashed #bbb; padding: 8pt; text-align: center; color: #888; font-size: 9pt; margin-bottom: 10pt; }
  `);
  parts.push('</style>');
  parts.push('</head><body>');

  parts.push('<div class="placeholder-logo">Centre branding placeholder — no remote images in demo export</div>');
  parts.push(`<div class="brand">${escapeHtml(inv.branch?.name || 'Centre')}</div>`);
  parts.push(`<h1>${escapeHtml(title)}</h1>`);

  parts.push('<div class="meta">');
  parts.push(`<div><strong>Student:</strong> ${escapeHtml(inv.student?.displayName || '')}</div>`);
  if (inv.class?.label) parts.push(`<div><strong>Class:</strong> ${escapeHtml(inv.class.label)}</div>`);
  if (inv.programme?.label) parts.push(`<div><strong>Programme:</strong> ${escapeHtml(inv.programme.label)}</div>`);
  parts.push(`<div><strong>Period:</strong> ${escapeHtml(formatPeriod(inv.reportPeriod?.start, inv.reportPeriod?.end))}</div>`);
  parts.push(`<div><strong>Released:</strong> ${escapeHtml(inv.releasedAt || '')}</div>`);
  if (inv.teacher?.displayName) {
    parts.push(`<div><strong>Teacher:</strong> ${escapeHtml(inv.teacher.displayName)}</div>`);
  }
  parts.push(`<div><strong>Variant:</strong> ${escapeHtml(inv.templateVariant || '')}</div>`);
  parts.push('</div>');

  for (const sec of inv.sections) {
    const body = typeof sec.body === 'string' ? sec.body : '';
    const stitle = typeof sec.title === 'string' ? sec.title : '';
    if (!body.trim()) continue;
    parts.push(`<h2>${escapeHtml(stitle)}</h2>`);
    parts.push(`<div class="section-body">${escapeHtml(body)}</div>`);
  }

  parts.push('<footer>');
  parts.push(`<div>${escapeHtml(inv.footer?.contactLine || '')}</div>`);
  parts.push(`<div>${escapeHtml(inv.footer?.disclaimer || '')}</div>`);
  parts.push('</footer>');

  parts.push('</body></html>');
  const html = parts.join('');

  return { ok: true, html, input: inv };
}
