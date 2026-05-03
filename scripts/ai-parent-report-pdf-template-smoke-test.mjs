/**
 * Pure AI Parent Report PDF template helpers — no Supabase, no storage, no binary PDF, no provider.
 */
import {
  buildDemoReleasedReportPdfInput,
  buildReleasedReportPdfInputFromParentViewContext,
  normalizeReportSectionsForPdf,
  normalizeReportSectionsFromReleaseVersion,
  PDF_SECTION_DEFINITIONS,
  renderReleasedReportPdfHtml,
  validateReleasedReportPdfInput,
} from '../src/services/aiParentReportPdfTemplate.js';

function fail(message) {
  console.error(`[FAIL] ${message}`);
  process.exit(1);
}

function pass(message) {
  console.log(`[PASS] ${message}`);
}

function assertNoLeak(html) {
  const forbidden = [
    'storage_path',
    'service_role',
    'generation_source',
    'ai_model_label',
    'evidence_links',
    'release_events',
    'http://',
    'https://',
    '.env',
    'SUPABASE_SERVICE_ROLE',
    '<script',
    'onclick=',
  ];
  const lower = html.toLowerCase();
  for (const f of forbidden) {
    if (lower.includes(f.toLowerCase())) {
      fail(`HTML leak forbidden token: ${f}`);
    }
  }
}

function run() {
  const monthly = buildDemoReleasedReportPdfInput({ variant: 'monthly_progress' });
  const vMonthly = validateReleasedReportPdfInput(monthly);
  if (!vMonthly.ok) fail(`monthly should validate: ${vMonthly.error}`);
  pass('demo monthly fixture validates');

  const weekly = buildDemoReleasedReportPdfInput({ variant: 'weekly_brief' });
  if (!validateReleasedReportPdfInput(weekly).ok) fail('weekly should validate');
  pass('weekly fixture validates');

  const sparse = buildDemoReleasedReportPdfInput({ variant: 'sparse_optional_fields' });
  if (!validateReleasedReportPdfInput(sparse).ok) fail('sparse should validate');
  pass('sparse fixture validates');

  const longInput = buildDemoReleasedReportPdfInput({ variant: 'long_text' });
  const vLong = validateReleasedReportPdfInput(longInput);
  if (!vLong.ok) fail(`long_text should validate: ${vLong.error}`);
  const renderedLong = renderReleasedReportPdfHtml(longInput);
  if (!renderedLong.ok) fail('long_text render should succeed');
  assertNoLeak(renderedLong.html);
  pass('long-text fixture renders without forbidden leakage');

  const flat = {
    summary: 'Hello',
    attendance_summary: 'Good',
    homework_assessment_performance: 'Steady progress',
  };
  const norm = normalizeReportSectionsForPdf(flat);
  if (!norm.find((r) => r.key === 'summary')) fail('normalize should include summary');
  if (!norm.find((r) => r.key === 'attendance_punctuality')) fail('normalize should map attendance_summary');
  if (!norm.find((r) => r.key === 'homework_assessment_performance')) {
    fail('normalize should include homework_assessment_performance');
  }
  pass('normalize known section keys');

  const fromVersion = normalizeReportSectionsFromReleaseVersion({
    structuredSections: { summary: 'From structured' },
    finalText: { teacher_final_comment: 'Final only' },
  });
  if (!fromVersion.find((r) => r.key === 'summary')) fail('version normalize structured');
  pass('normalize from release version merges structured/final');

  if (PDF_SECTION_DEFINITIONS.length < 10) fail('section definitions present');

  const htmlOut = renderReleasedReportPdfHtml(monthly);
  if (!htmlOut.ok) fail(`render monthly: ${htmlOut.error}`);
  if (!htmlOut.html.includes('Student Progress Report')) fail('HTML missing document title');
  if (!htmlOut.html.includes('student-panel')) fail('HTML missing student information panel');
  if (!htmlOut.html.includes('highlight-card')) fail('HTML missing highlight cards');
  if (!htmlOut.html.includes('At a glance')) fail('HTML missing highlights section');
  if (!htmlOut.html.includes('Acknowledgements')) fail('HTML missing signature section');
  if (!htmlOut.html.includes('Branch supervisor')) fail('HTML missing supervisor signature label');
  if (!htmlOut.html.includes('Summary')) fail('HTML missing Summary section');
  if (!htmlOut.html.includes('Demo Student One')) fail('HTML missing student');
  assertNoLeak(htmlOut.html);
  pass('HTML contains expected layout landmarks');

  const allVariants = ['monthly_progress', 'weekly_brief', 'long_text', 'sparse_optional_fields'];
  for (const v of allVariants) {
    const demo = buildDemoReleasedReportPdfInput({ variant: v });
    const out = renderReleasedReportPdfHtml(demo);
    if (!out.ok) fail(`variant ${v} render: ${out.error}`);
    assertNoLeak(out.html);
  }
  pass('all four demo variants render and pass forbidden-token scan');

  const badUrl = {
    ...monthly,
    sections: monthly.sections.map((s, i) => (
      i === 0 ? { ...s, body: `${s.body} https://blocked.example` } : s
    )),
  };
  if (validateReleasedReportPdfInput(badUrl).ok) fail('should reject URL in section');
  pass('raw URL strings blocked in sections');

  const draftBlocked = { ...monthly, status: 'draft' };
  if (validateReleasedReportPdfInput(draftBlocked).ok) fail('draft should not validate');
  pass('draft/unreleased status blocked when present');

  const adapterOk = buildReleasedReportPdfInputFromParentViewContext({
    report: {
      id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      status: 'released',
      reportType: 'monthly_progress',
      reportPeriodStart: '2026-04-01',
      reportPeriodEnd: '2026-04-30',
      releasedAt: '2026-05-01T10:00:00.000Z',
    },
    currentVersion: {
      id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      structuredSections: {
        summary: 'Adapter demo summary.',
        strengths: 'Kind and curious.',
      },
      finalText: {},
    },
    context: {
      studentDisplayName: 'Demo Student One',
      classLabel: 'Alpha Class',
      branchName: 'EduCentre',
    },
  });
  if (!adapterOk.ok) fail(adapterOk.error);
  const vAdapt = validateReleasedReportPdfInput(adapterOk.data);
  if (!vAdapt.ok) fail(`adapter output invalid: ${vAdapt.error}`);
  pass('ParentView-style adapter builds valid input');

  const adapterDraft = buildReleasedReportPdfInputFromParentViewContext({
    report: { id: 'x', status: 'teacher_review' },
    currentVersion: { id: 'y', structuredSections: {} },
  });
  if (adapterDraft.ok) fail('adapter should refuse unreleased');
  pass('adapter rejects unreleased report');

  console.log('[DONE] ai-parent-report-pdf-template-smoke-test passed');
}

run();
