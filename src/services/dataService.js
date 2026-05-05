import { base44 } from '@/api/base44Client';
import { getSelectedDemoRole } from './authService';
import { getRole, ROLES } from './permissionService';
import {
  getApprovedSalesKitResources,
  getBranches,
  getClasses,
  getGuardianLinkSummaryByStudentIds,
  getStudents,
} from './supabaseReadService';
import { isSupabaseConfigured, supabase } from './supabaseClient';

const demoEnabled = () => Boolean(getSelectedDemoRole());
const readSources = {
  branches: 'demo',
  classes: 'demo',
  students: 'demo',
  dashboard: 'demo',
};

const demoData = {
  branches: [
    { id: 'branch-north', name: 'North Learning Hub', code: 'NLH', address: '100 Demo Street', phone: '0000 000 001', status: 'active' },
    { id: 'branch-south', name: 'South Study Studio', code: 'SSS', address: '200 Sample Avenue', phone: '0000 000 002', status: 'active' },
  ],
  classes: [
    { id: 'class-alpha', name: 'Alpha English', branch_id: 'branch-north', subject: 'English', level: 'Level A', schedule: 'Mon 4pm', teacher_email: 'demo.teacher@sample.local', status: 'active' },
    { id: 'class-beta', name: 'Beta Maths', branch_id: 'branch-north', subject: 'Mathematics', level: 'Level B', schedule: 'Wed 5pm', teacher_email: 'demo.teacher@sample.local', status: 'active' },
    { id: 'class-gamma', name: 'Gamma Science', branch_id: 'branch-south', subject: 'Science', level: 'Level C', schedule: 'Fri 4pm', teacher_email: 'demo.teacher.two@sample.local', status: 'active' },
  ],
  students: [
    { id: 'student-01', name: 'Demo Student One', class_id: 'class-alpha', branch_id: 'branch-north', parent_name: 'Demo Parent One', parent_phone: '0400 000 001', parent_email: 'parent1@sample.local', status: 'active' },
    { id: 'student-02', name: 'Demo Student Two', class_id: 'class-alpha', branch_id: 'branch-north', parent_name: 'Demo Parent Two', parent_phone: '0400 000 002', parent_email: 'parent2@sample.local', status: 'active' },
    { id: 'student-03', name: 'Demo Student Three', class_id: 'class-beta', branch_id: 'branch-north', parent_name: 'Demo Parent Three', parent_phone: '0400 000 003', parent_email: 'parent3@sample.local', status: 'active' },
    { id: 'student-04', name: 'Demo Student Four', class_id: 'class-gamma', branch_id: 'branch-south', parent_name: 'Demo Parent Four', parent_phone: '0400 000 004', parent_email: 'parent4@sample.local', status: 'active' },
  ],
  guardianStudentLinks: [
    { id: 'gsl-01', guardian_parent_id: 'guardian-01', student_id: 'student-01', is_primary: true, status: 'active' },
  ],
  teachers: [
    { id: 'teacher-01', user_id: 'demo-user-teacher', branch_id: 'branch-north', full_name: 'Demo Teacher One', email: 'demo.teacher@sample.local', status: 'active' },
    { id: 'teacher-02', user_id: 'demo-user-teacher-2', branch_id: 'branch-south', full_name: 'Demo Teacher Two', email: 'demo.teacher.two@sample.local', status: 'active' },
  ],
  teacherClassAssignments: [
    { id: 'tca-01', teacher_id: 'teacher-01', class_id: 'class-alpha', branch_id: 'branch-north', assignment_role: 'lead', status: 'active' },
    { id: 'tca-02', teacher_id: 'teacher-01', class_id: 'class-beta', branch_id: 'branch-north', assignment_role: 'lead', status: 'active' },
  ],
  attendance: [
    { id: 'att-01', student_id: 'student-01', class_id: 'class-alpha', branch_id: 'branch-north', teacher_id: 'teacher-01', date: '2026-04-25', session_date: '2026-04-25', status: 'present', homework_status: 'completed', notes: 'Focused well in class.' },
    { id: 'att-02', student_id: 'student-02', class_id: 'class-alpha', branch_id: 'branch-north', teacher_id: 'teacher-01', date: '2026-04-25', session_date: '2026-04-25', status: 'late', homework_status: 'incomplete', notes: 'Arrived late but participated.' },
    { id: 'att-03', student_id: 'student-03', class_id: 'class-beta', branch_id: 'branch-north', teacher_id: 'teacher-01', date: '2026-04-25', session_date: '2026-04-25', status: 'present', homework_status: 'completed', notes: 'Strong problem solving today.' },
  ],
  parentUpdates: [
    {
      id: 'pu-01',
      student_id: 'student-01',
      class_id: 'class-alpha',
      branch_id: 'branch-north',
      teacher_email: 'demo.teacher@sample.local',
      teacher_name: 'Demo Teacher One',
      student_name: 'Demo Student One',
      note_text: 'Showed steady reading progress and answered comprehension questions with more confidence.',
      ai_draft: 'Hello Demo Parent One, Demo Student One showed steady reading progress today and answered comprehension questions with growing confidence.',
      final_message: 'Hello Demo Parent One, Demo Student One had a positive lesson today and showed steady reading progress. Please continue short reading practice at home this week.',
      approved_report: 'Hello Demo Parent One, Demo Student One had a positive lesson today and showed steady reading progress. Please continue short reading practice at home this week.',
      shared_report: 'Hello Demo Parent One, Demo Student One had a positive lesson today and showed steady reading progress. Please continue short reading practice at home this week.',
      status: 'shared',
      created_date: '2026-04-25T10:00:00Z'
    },
    {
      id: 'pu-02',
      student_id: 'student-03',
      class_id: 'class-beta',
      branch_id: 'branch-north',
      teacher_email: 'demo.teacher@sample.local',
      teacher_name: 'Demo Teacher One',
      student_name: 'Demo Student Three',
      note_text: 'Needs more confidence when answering aloud during whole-class discussion.',
      ai_draft: 'Hello Demo Parent Three, Demo Student Three is progressing well and would benefit from more confidence when answering aloud in class discussions.',
      final_message: 'Hello Demo Parent Three, Demo Student Three is making progress and I would like to encourage more confident verbal responses in class. A little extra speaking practice at home would help.',
      approved_report: '',
      shared_report: '',
      status: 'approved',
      created_date: '2026-04-24T10:00:00Z'
    },
    {
      id: 'pu-03',
      student_id: 'student-02',
      class_id: 'class-alpha',
      branch_id: 'branch-north',
      teacher_email: 'demo.teacher@sample.local',
      teacher_name: 'Demo Teacher One',
      student_name: 'Demo Student Two',
      note_text: 'Arrived late but still participated once settled.',
      ai_draft: 'Hello Demo Parent Two, Demo Student Two arrived late today but still participated once settled in class.',
      final_message: 'Hello Demo Parent Two, Demo Student Two arrived late today but settled well and participated once class was underway.',
      approved_report: '',
      shared_report: '',
      status: 'edited',
      created_date: '2026-04-25T08:30:00Z'
    },
    {
      id: 'pu-04',
      student_id: 'student-04',
      class_id: 'class-gamma',
      branch_id: 'branch-south',
      teacher_email: 'demo.teacher.two@sample.local',
      teacher_name: 'Demo Teacher Two',
      student_name: 'Demo Student Four',
      note_text: 'Science experiment engagement was strong.',
      ai_draft: 'Hello Demo Parent Four, Demo Student Four showed strong engagement during today\'s science experiment.',
      final_message: '',
      approved_report: '',
      shared_report: '',
      status: 'ai_draft_generated',
      created_date: '2026-04-25T09:15:00Z'
    },
    {
      id: 'pu-05',
      student_id: 'student-03',
      class_id: 'class-beta',
      branch_id: 'branch-north',
      teacher_email: 'demo.teacher@sample.local',
      teacher_name: 'Demo Teacher One',
      student_name: 'Demo Student Three',
      note_text: 'Completed maths work accurately but needs faster pace.',
      ai_draft: '',
      final_message: '',
      approved_report: '',
      shared_report: '',
      status: 'note_created',
      created_date: '2026-04-25T07:45:00Z'
    }
  ],
  teacherTaskSessions: [
    { id: 'tts-01', lesson_date: '2026-04-25', branch_id: 'branch-north', branch_name: 'North Learning Hub', teacher_email: 'demo.teacher@sample.local', teacher_name: 'Demo Teacher One', class_id: 'class-alpha', class_name: 'Alpha English', attendance_completed: true, homework_marked: true, student_notes_completed: true, parent_report_draft_completed: true, approved_parent_update_completed: true, is_late: false },
    { id: 'tts-02', lesson_date: '2026-04-24', branch_id: 'branch-north', branch_name: 'North Learning Hub', teacher_email: 'demo.teacher@sample.local', teacher_name: 'Demo Teacher One', class_id: 'class-beta', class_name: 'Beta Maths', attendance_completed: true, homework_marked: false, student_notes_completed: false, parent_report_draft_completed: true, approved_parent_update_completed: false, is_late: true },
    { id: 'tts-03', lesson_date: '2026-04-25', branch_id: 'branch-south', branch_name: 'South Study Studio', teacher_email: 'demo.teacher.two@sample.local', teacher_name: 'Demo Teacher Two', class_id: 'class-gamma', class_name: 'Gamma Science', attendance_completed: false, homework_marked: false, student_notes_completed: false, parent_report_draft_completed: false, approved_parent_update_completed: false, is_late: true },
  ],
  observations: [
    {
      id: 'obs-01',
      observation_date: '2026-04-21',
      branch_id: 'branch-north',
      branch_name: 'North Learning Hub',
      class_id: 'class-alpha',
      class_name: 'Alpha English',
      teacher_email: 'demo.teacher@sample.local',
      teacher_name: 'Demo Teacher One',
      observer_name: 'Demo HQ Admin',
      classroom_management_score: 4,
      teaching_delivery_score: 5,
      student_engagement_score: 4,
      lesson_preparation_score: 4,
      parent_communication_score: 4,
      strengths_observed: 'Clear instruction flow and positive reinforcement were used well.',
      areas_for_improvement: 'Can vary questioning techniques to involve quieter students more often.',
      follow_up_action: 'Share questioning strategies in the next coaching session.',
      follow_up_due_date: '2026-04-28',
      status: 'completed'
    },
    {
      id: 'obs-02',
      observation_date: '2026-04-22',
      branch_id: 'branch-south',
      branch_name: 'South Study Studio',
      class_id: 'class-gamma',
      class_name: 'Gamma Science',
      teacher_email: 'demo.teacher.two@sample.local',
      teacher_name: 'Demo Teacher Two',
      observer_name: 'Demo Branch Supervisor',
      classroom_management_score: 3,
      teaching_delivery_score: 4,
      student_engagement_score: 3,
      lesson_preparation_score: 4,
      parent_communication_score: 3,
      strengths_observed: 'Lesson pacing was steady and explanations were clear.',
      areas_for_improvement: 'Transitions and student participation need tightening.',
      follow_up_action: 'Supervisor coaching next week.',
      follow_up_due_date: '2026-04-29',
      status: 'follow-up required'
    },
    {
      id: 'obs-03',
      observation_date: '2026-04-23',
      branch_id: 'branch-north',
      branch_name: 'North Learning Hub',
      class_id: 'class-beta',
      class_name: 'Beta Maths',
      teacher_email: 'demo.teacher@sample.local',
      teacher_name: 'Demo Teacher One',
      observer_name: 'Demo Branch Supervisor',
      classroom_management_score: 4,
      teaching_delivery_score: 4,
      student_engagement_score: 4,
      lesson_preparation_score: 5,
      parent_communication_score: 4,
      strengths_observed: 'Well-prepared lesson with strong modelling of examples.',
      areas_for_improvement: 'Could check homework understanding more consistently.',
      follow_up_action: 'Review homework checking routine.',
      follow_up_due_date: '2026-05-01',
      status: 'draft'
    },
  ],
  homeworkScans: [
    { id: 'scan-01', student_id: 'student-01', class_id: 'class-alpha', uploaded_by_role: 'parent', source_type: 'homework_photo', image_url: 'demo-homework-image', extraction_status: 'future', review_status: 'pending_teacher_review', extracted_question_text: '', extracted_answer_text: '', related_submission_date: '2026-04-25' },
  ],
  curriculumKnowledgeBase: [
    { id: 'kb-01', school_type: 'primary', curriculum_pathway: 'cambridge_english', textbook_series: 'Demo Reading Series', topic_unit: 'Comprehension Unit 3', model_answer: 'Future model answer placeholder', marking_guide: 'Future marking guide placeholder', skill_tag: 'reading_comprehension' },
    { id: 'kb-02', school_type: 'primary', curriculum_pathway: 'cambridge_maths', textbook_series: 'Demo Maths Series', topic_unit: 'Fractions Unit 2', model_answer: 'Future model answer placeholder', marking_guide: 'Future marking guide placeholder', skill_tag: 'fractions' },
  ],
  aiMarkingDiagnoses: [
    { id: 'diag-01', student_id: 'student-01', homework_scan_id: 'scan-01', diagnosis_status: 'future', marking_result: 'partially_correct', mistake_explanation: 'Future AI explanation placeholder', weak_skill_area: 'reading_inference', recommended_revision_topic: 'Identifying evidence from short passages', teacher_review_status: 'pending' },
  ],
  teacherFollowUpTasks: [
    { id: 'follow-01', student_id: 'student-01', class_id: 'class-alpha', teacher_email: 'demo.teacher@sample.local', source: 'ai_diagnosis', action_title: 'Revise inference questions next lesson', action_detail: 'Review how to pick text evidence before answering.', status: 'open', due_context: 'next_session', hq_tracking_status: 'pending_follow_up' },
  ],
  studentReminders: [
    { id: 'rem-01', student_id: 'student-01', reminder_type: 'homework', title: 'Complete homework before Monday class', delivery_channel: 'in_app', cadence: 'once', status: 'scheduled' },
    { id: 'rem-02', student_id: 'student-01', reminder_type: 'revision', title: 'Revise inference skill for 10 minutes', delivery_channel: 'in_app', cadence: 'habit_loop', status: 'scheduled' },
  ],
  users: [
    { id: 'demo-user-hq', full_name: 'Demo HQ Admin', email: 'demo.hq@sample.local', role: 'hq_admin' },
    { id: 'demo-user-branch', full_name: 'Demo Branch Supervisor', email: 'demo.branch@sample.local', role: 'branch_supervisor' },
    { id: 'demo-user-teacher', full_name: 'Demo Teacher One', email: 'demo.teacher@sample.local', role: 'teacher' },
  ],
  feeRecords: [
    { id: 'fee-01', student_id: 'student-01', student_name: 'Demo Student One', parent_guardian_name: 'Demo Parent One', branch_id: 'branch-north', branch_name: 'North Learning Hub', class_id: 'class-alpha', class_name: 'Alpha English', fee_period: 'April 2026', fee_amount: 320, due_date: '2026-04-10', payment_status: 'paid', payment_method: 'bank transfer', receipt_uploaded: true, receipt_reference_note: 'REF-APR-001', verified_by: 'Demo Branch Supervisor', verified_date: '2026-04-08', internal_note: 'Demo verified payment.' },
    { id: 'fee-02', student_id: 'student-02', student_name: 'Demo Student Two', parent_guardian_name: 'Demo Parent Two', branch_id: 'branch-north', branch_name: 'North Learning Hub', class_id: 'class-alpha', class_name: 'Alpha English', fee_period: 'April 2026', fee_amount: 320, due_date: '2026-04-10', payment_status: 'unpaid', payment_method: 'cash', receipt_uploaded: false, receipt_reference_note: '', verified_by: '', verified_date: '', internal_note: 'Follow-up needed.' },
    { id: 'fee-03', student_id: 'student-03', student_name: 'Demo Student Three', parent_guardian_name: 'Demo Parent Three', branch_id: 'branch-north', branch_name: 'North Learning Hub', class_id: 'class-beta', class_name: 'Beta Maths', fee_period: 'Term 1', fee_amount: 950, due_date: '2026-04-05', payment_status: 'pending verification', payment_method: 'online transfer', receipt_uploaded: true, receipt_reference_note: 'Pending screenshot check', verified_by: '', verified_date: '', internal_note: 'Waiting for office verification.' },
    { id: 'fee-04', student_id: 'student-04', student_name: 'Demo Student Four', parent_guardian_name: 'Demo Parent Four', branch_id: 'branch-south', branch_name: 'South Study Studio', class_id: 'class-gamma', class_name: 'Gamma Science', fee_period: 'Monthly', fee_amount: 340, due_date: '2026-04-01', payment_status: 'overdue', payment_method: 'other', receipt_uploaded: false, receipt_reference_note: '', verified_by: '', verified_date: '', internal_note: 'Reminder overdue.' },
  ],
  homeworkAttachments: [
    { id: 'attach-01', student_id: 'student-01', student_name: 'Demo Student One', class_id: 'class-alpha', class_name: 'Alpha English', branch_id: 'branch-north', file_name: 'reading-comprehension-scan-01.pdf', upload_date: '2026-04-24', status: 'received', status_label: 'received', ai_draft_result: 'Not generated yet', ai_confidence: 'Pending', teacher_review_status: 'Pending teacher review', teacher_comment: 'Waiting for teacher review.', ai_draft_status: 'Not generated', parent_feedback_status: 'Not released' },
    { id: 'attach-02', student_id: 'student-01', student_name: 'Demo Student One', class_id: 'class-alpha', class_name: 'Alpha English', branch_id: 'branch-north', file_name: 'vocabulary-worksheet-photo.jpg', upload_date: '2026-04-25', status: 'ai_draft_ready', status_label: 'AI draft ready', ai_draft_result: 'Draft marking placeholder available', ai_confidence: '82%', teacher_review_status: 'Awaiting teacher decision', teacher_comment: 'Teacher to confirm feedback before release.', ai_draft_status: 'Draft ready', parent_feedback_status: 'Not released' },
    { id: 'attach-03', student_id: 'student-03', student_name: 'Demo Student Three', class_id: 'class-beta', class_name: 'Beta Maths', branch_id: 'branch-north', file_name: 'fractions-homework-scan.pdf', upload_date: '2026-04-23', status: 'teacher_reviewed', status_label: 'teacher reviewed', ai_draft_result: 'Mostly correct with one revision point', ai_confidence: '76%', teacher_review_status: 'Teacher reviewed', teacher_comment: 'Good attempt overall. Needs another pass on fraction simplification.', ai_draft_status: 'Draft ready', parent_feedback_status: 'Pending release' },
    { id: 'attach-04', student_id: 'student-04', student_name: 'Demo Student Four', class_id: 'class-gamma', class_name: 'Gamma Science', branch_id: 'branch-south', file_name: 'science-notes-upload.pdf', upload_date: '2026-04-22', status: 'feedback_released', status_label: 'feedback released', ai_draft_result: 'Draft checked and approved by teacher', ai_confidence: '88%', teacher_review_status: 'Approved', teacher_comment: 'Clear effort shown. Keep reviewing key science terms.', ai_draft_status: 'Reviewed', parent_feedback_status: 'Released' },
  ],
};

function filterByRole(items, user, type) {
  const role = user?.role;
  if (role === ROLES.HQ_ADMIN) return items;
  if (role === ROLES.BRANCH_SUPERVISOR) return items.filter(item => !item.branch_id || item.branch_id === user?.branch_id);
  if (role === ROLES.TEACHER) {
    if (type === 'classes') return items.filter(item => item.teacher_email === user?.email || user?.assigned_class_ids?.includes(item.id));
    if (type === 'students') return items.filter(item => user?.assigned_class_ids?.includes(item.class_id));
    if (type === 'attendance' || type === 'parentUpdates' || type === 'teacherTaskSessions') return items.filter(item => user?.assigned_class_ids?.includes(item.class_id));
    if (type === 'observations') return items.filter(item => item.teacher_email === user?.email && item.status === 'completed');
    return items.filter(item => !item.branch_id || item.branch_id === user?.branch_id);
  }
  if (role === ROLES.PARENT) {
    const linkedStudentIds = demoData.guardianStudentLinks.filter(link => link.guardian_parent_id === user?.guardian_parent_id).map(link => link.student_id);
    if (type === 'students') return items.filter(item => linkedStudentIds.includes(item.id));
    if (type === 'attendance') return items.filter(item => linkedStudentIds.includes(item.student_id));
    if (type === 'parentUpdates') return items.filter(item => linkedStudentIds.includes(item.student_id) && ['approved', 'shared'].includes(item.status));
    if (type === 'classes') {
      const studentClassIds = demoData.students.filter(student => linkedStudentIds.includes(student.id)).map(student => student.class_id);
      return items.filter(item => studentClassIds.includes(item.id));
    }
    return [];
  }
  if (role === ROLES.STUDENT) {
    if (type === 'students') return items.filter(item => item.id === user?.student_id);
    if (type === 'attendance') return items.filter(item => item.student_id === user?.student_id);
    if (type === 'parentUpdates') return items.filter(item => item.student_id === user?.student_id && ['approved', 'shared'].includes(item.status));
    if (type === 'classes') {
      const student = demoData.students.find(item => item.id === user?.student_id);
      return items.filter(item => item.id === student?.class_id);
    }
    return [];
  }
  return items;
}

export async function listBranches(user) {
  if (demoEnabled()) {
    readSources.branches = 'demo';
    return filterByRole(demoData.branches, user, 'branches');
  }
  if (isSupabaseConfigured()) {
    const { data, error } = await getBranches();
    if (!error && Array.isArray(data) && data.length > 0) {
      readSources.branches = 'supabase';
      return data;
    }
  }
  readSources.branches = 'demo';
  return filterByRole(demoData.branches, user, 'branches');
}

export async function listClasses(user) {
  if (demoEnabled()) {
    readSources.classes = 'demo';
    return filterByRole(demoData.classes, user, 'classes');
  }
  if (isSupabaseConfigured()) {
    const { data, error } = await getClasses();
    if (!error && Array.isArray(data) && data.length > 0) {
      readSources.classes = 'supabase';
      return data.map((item) => ({
        ...item,
        schedule: item.schedule_note || '',
      }));
    }
  }
  readSources.classes = 'demo';
  return filterByRole(demoData.classes, user, 'classes');
}

export async function listStudents(user) {
  if (demoEnabled()) {
    readSources.students = 'demo';
    return filterByRole(demoData.students, user, 'students');
  }
  if (isSupabaseConfigured()) {
    const { data, error } = await getStudents();
    if (!error && Array.isArray(data) && data.length > 0) {
      readSources.students = 'supabase';
      return data.map((item) => ({
        ...item,
        name: item.full_name,
      }));
    }
  }
  readSources.students = 'demo';
  return filterByRole(demoData.students, user, 'students');
}

function demoGuardianSummariesByStudentIds(studentIds, viewerRole) {
  const links = demoData.guardianStudentLinks || [];
  const result = {};
  for (const sid of studentIds) {
    const rows = links.filter((l) => l.student_id === sid);
    const count = rows.length;
    const status = count > 0 ? 'linked' : 'not_linked';
    if (viewerRole === ROLES.TEACHER) {
      result[sid] = { status, linkedCount: count, guardians: [] };
      continue;
    }
    if (viewerRole === ROLES.HQ_ADMIN || viewerRole === ROLES.BRANCH_SUPERVISOR) {
      result[sid] = {
        status,
        linkedCount: count,
        guardians:
          count > 0 ? [{ displayName: 'Linked parent account (demo fixture)', email: null }] : [],
      };
      continue;
    }
    result[sid] = { status: 'unavailable', linkedCount: null, guardians: [] };
  }
  return result;
}

/** Staff `/students` guardian visibility — demo fixtures or Supabase RLS-scoped reads (see supabaseReadService). */
export async function getStaffGuardianLinkSummaries(user, studentIds) {
  const ids = Array.isArray(studentIds)
    ? [...new Set(studentIds.map((id) => (typeof id === 'string' ? id.trim() : '')).filter(Boolean))]
    : [];
  const role = getRole(user);
  if (ids.length === 0) {
    return { data: {}, error: null };
  }
  if (demoEnabled() || getReadDataSource('students') !== 'supabase') {
    return { data: demoGuardianSummariesByStudentIds(ids, role), error: null };
  }
  return getGuardianLinkSummaryByStudentIds({ studentIds: ids, viewerRole: role });
}

export async function getDashboardReadSummary(user) {
  if (demoEnabled()) {
    readSources.dashboard = 'demo';
    return {
      branchCount: filterByRole(demoData.branches, user, 'branches').length,
      classCount: filterByRole(demoData.classes, user, 'classes').length,
      studentCount: filterByRole(demoData.students, user, 'students').length,
      approvedSalesKitCount: 0,
    };
  }

  if (isSupabaseConfigured()) {
    const [branchesResult, classesResult, studentsResult, salesKitResult] = await Promise.all([
      getBranches(),
      getClasses(),
      getStudents(),
      getApprovedSalesKitResources(),
    ]);

    const hasCoreErrors = Boolean(branchesResult.error || classesResult.error || studentsResult.error);
    const hasEmptyCoreData = !branchesResult.data.length || !classesResult.data.length || !studentsResult.data.length;

    if (!hasCoreErrors && !hasEmptyCoreData) {
      readSources.dashboard = 'supabase';
      return {
        branchCount: branchesResult.data.length,
        classCount: classesResult.data.length,
        studentCount: studentsResult.data.length,
        approvedSalesKitCount: salesKitResult.error ? 0 : salesKitResult.data.length,
      };
    }
  }

  readSources.dashboard = 'demo';
  return {
    branchCount: filterByRole(demoData.branches, user, 'branches').length,
    classCount: filterByRole(demoData.classes, user, 'classes').length,
    studentCount: filterByRole(demoData.students, user, 'students').length,
    approvedSalesKitCount: 0,
  };
}

export async function listStudentsByClass(user, classId) {
  const students = await listStudents(user);
  return students.filter(student => student.class_id === classId);
}

export async function listAttendanceRecords(user, filters = {}) {
  if (demoEnabled()) {
    let items = filterByRole(demoData.attendance, user, 'attendance');
    return items.filter(item => Object.entries(filters).every(([key, value]) => !value || item[key] === value));
  }
  if (isSupabaseConfigured() && supabase) {
    try {
      let query = supabase
        .from('attendance_records')
        .select('id,branch_id,class_id,student_id,teacher_id,session_date,status,note,updated_at')
        .order('session_date', { ascending: false });
      if (filters.class_id) query = query.eq('class_id', filters.class_id);
      if (filters.student_id) query = query.eq('student_id', filters.student_id);
      if (filters.date) query = query.eq('session_date', filters.date);

      const { data, error } = await query;
      if (!error && Array.isArray(data)) {
        return data.map((row) => ({
          ...row,
          date: row.session_date,
          notes: row.note ?? '',
        }));
      }
    } catch {
      // Fallback to legacy source below
    }
  }
  return base44.entities.Attendance.filter(filters);
}

export async function listParentUpdates(user) {
  if (demoEnabled()) return filterByRole(demoData.parentUpdates, user, 'parentUpdates');
  if (isSupabaseConfigured() && supabase) {
    try {
      const { data: parentCommentRows, error: parentCommentsError } = await supabase
        .from('parent_comments')
        .select('id,branch_id,class_id,student_id,teacher_id,comment_text,status,created_at,updated_at')
        .order('updated_at', { ascending: false });

      const { data: weeklyReportRows, error: weeklyReportsError } = await supabase
        .from('weekly_progress_reports')
        .select('id,branch_id,class_id,student_id,teacher_id,week_start_date,report_text,status,created_at,updated_at')
        .order('updated_at', { ascending: false });

      if (!parentCommentsError && !weeklyReportsError && Array.isArray(parentCommentRows) && Array.isArray(weeklyReportRows)) {
        const parentComments = parentCommentRows.map((row) => ({
          id: row.id,
          branch_id: row.branch_id,
          class_id: row.class_id,
          student_id: row.student_id,
          teacher_id: row.teacher_id,
          note_text: row.comment_text ?? '',
          final_message: row.comment_text ?? '',
          status: row.status,
          created_date: row.updated_at || row.created_at,
          update_type: 'comment',
          data_source: 'supabase_parent_comments',
        }));

        const weeklyReports = weeklyReportRows.map((row) => ({
          id: row.id,
          branch_id: row.branch_id,
          class_id: row.class_id,
          student_id: row.student_id,
          teacher_id: row.teacher_id,
          note_text: row.report_text ?? '',
          final_message: row.report_text ?? '',
          approved_report: row.report_text ?? '',
          shared_report: row.report_text ?? '',
          status: row.status,
          created_date: row.updated_at || row.created_at,
          update_type: 'weekly_report',
          data_source: 'supabase_weekly_progress_reports',
          week_start_date: row.week_start_date,
        }));

        return [...parentComments, ...weeklyReports].sort(
          (a, b) => new Date(b.created_date || 0) - new Date(a.created_date || 0),
        );
      }
    } catch {
      // Fallback to legacy source below
    }
  }
  return base44.entities.ParentUpdate.list('-created_date', 20);
}

export async function listTeacherTaskSessions(user) {
  if (demoEnabled()) return filterByRole(demoData.teacherTaskSessions, user, 'teacherTaskSessions');
  return [];
}

export async function listObservations(user) {
  if (demoEnabled()) return filterByRole(demoData.observations, user, 'observations');
  return [];
}

export function getTeacherKpiMetrics(user) {
  const sessions = filterByRole(demoData.teacherTaskSessions, user, 'teacherTaskSessions');
  const reports = filterByRole(demoData.parentUpdates, user, 'parentUpdates');
  const total = sessions.length || 1;
  const today = '2026-04-25';
  const todaySessions = sessions.filter((s) => s.lesson_date === today);
  const attendanceDone = sessions.filter((s) => s.attendance_completed).length;
  const homeworkDone = sessions.filter((s) => s.homework_marked).length;
  const reportsApprovedSent = reports.filter((item) => item.status === 'approved').length;
  const missingTasks = sessions.reduce((sum, s) => sum + [s.attendance_completed, s.homework_marked, s.student_notes_completed, s.parent_report_draft_completed, s.approved_parent_update_completed].filter(Boolean).length, 0);
  const totalTasks = total * 5;
  const classOverview = todaySessions.map((session) => ({
    ...session,
    class_time: demoData.classes.find((item) => item.id === session.class_id)?.schedule || 'Today',
    student_count: demoData.students.filter((student) => student.class_id === session.class_id).length,
  }));
  const studentsNeedingAttention = [
    { id: 'attention-1', student_name: 'Demo Student Two', issue: 'Parent report is edited but not approved yet.' },
    { id: 'attention-2', student_name: 'Demo Student Three', issue: 'Teacher note created — AI draft still needed.' },
    { id: 'attention-3', student_name: 'Demo Student Four', issue: 'AI draft generated — teacher review still needed.' },
  ];
  return {
    classesCompleted: sessions.filter((s) => s.attendance_completed && s.student_notes_completed).length,
    attendanceRate: Math.round((attendanceDone / total) * 100),
    homeworkRate: Math.round((homeworkDone / total) * 100),
    reportsApprovedSent,
    missingTasks: totalTasks - missingTasks,
    lateIncomplete: sessions.filter((s) => s.is_late || !s.approved_parent_update_completed).length,
    todaysClasses: todaySessions.length,
    homeworkPending: todaySessions.filter((s) => !s.homework_marked).length,
    reportsPending: reports.filter((item) => !['approved', 'shared'].includes(item.status)).length,
    reportStatuses: {
      noteCreated: reports.filter((item) => item.status === 'note_created').length,
      aiDraftGenerated: reports.filter((item) => item.status === 'ai_draft_generated').length,
      edited: reports.filter((item) => item.status === 'edited').length,
      approved: reports.filter((item) => item.status === 'approved').length,
      shared: reports.filter((item) => item.status === 'shared').length,
    },
    classOverview,
    studentsNeedingAttention,
  };
}

export function getHqDashboardSummary(user) {
  const visibleReports = filterByRole(demoData.parentUpdates, user, 'parentUpdates');
  const visibleSessions = filterByRole(demoData.teacherTaskSessions, user, 'teacherTaskSessions');
  const visibleClasses = filterByRole(demoData.classes, user, 'classes');
  const teacherCompletionRate = Math.round((visibleSessions.filter((s) => s.attendance_completed && s.homework_marked && s.student_notes_completed && s.parent_report_draft_completed && s.approved_parent_update_completed).length / (visibleSessions.length || 1)) * 100);
  return {
    branches: filterByRole(demoData.branches, user, 'branches').length,
    branchesNeedingAttention: visibleSessions.filter((s) => !s.attendance_completed || !s.approved_parent_update_completed).length,
    teacherCompletionRate,
    pendingApprovals: visibleReports.filter((item) => item.status === 'edited').length,
    openLeads: 4,
    todaysClasses: visibleClasses.length,
    incompleteTeacherTasks: visibleSessions.filter((s) => !s.attendance_completed || !s.homework_marked || !s.student_notes_completed || !s.parent_report_draft_completed || !s.approved_parent_update_completed).length,
    studentsNeedingFollowUp: demoData.teacherFollowUpTasks.filter((task) => task.status !== 'completed').length,
    reportStatusCounts: {
      noteCreated: visibleReports.filter((item) => item.status === 'note_created').length,
      aiDraftGenerated: visibleReports.filter((item) => item.status === 'ai_draft_generated').length,
      edited: visibleReports.filter((item) => item.status === 'edited').length,
      approved: visibleReports.filter((item) => item.status === 'approved').length,
      shared: visibleReports.filter((item) => item.status === 'shared').length,
    },
  };
}

export function getHqAlertLists(user) {
  const visibleReports = filterByRole(demoData.parentUpdates, user, 'parentUpdates');
  const visibleSessions = filterByRole(demoData.teacherTaskSessions, user, 'teacherTaskSessions');
  const visibleClasses = filterByRole(demoData.classes, user, 'classes');
  return {
    branchesNeedingAttention: visibleSessions.filter((item) => !item.attendance_completed || !item.approved_parent_update_completed).map((item) => ({ id: item.id, title: item.branch_name, meta: `${item.class_name} needs follow-up` })),
    teacherCompletion: visibleSessions.map((item) => ({ id: item.id, title: item.teacher_name, meta: `${item.class_name} • ${item.lesson_date}` })),
    pendingApprovals: visibleReports.filter((item) => item.status === 'edited').map((item) => ({ id: item.id, title: `Report for ${item.student_name || 'Student'}`, meta: 'Ready for supervisor/HQ review before sharing' })),
    leadsSummary: [
      { id: 'lead-s1', title: 'New enquiries', meta: '2 new enquiries this week' },
      { id: 'lead-s2', title: 'Trials scheduled', meta: '1 trial scheduled' },
      { id: 'lead-s3', title: 'Enrolled this month', meta: '1 family enrolled' },
    ],
    classesToday: visibleClasses.map((item) => ({ id: item.id, title: item.name, meta: item.schedule })),
    incompleteTeacherTasks: visibleSessions.filter((item) => !item.attendance_completed || !item.homework_marked || !item.student_notes_completed || !item.parent_report_draft_completed || !item.approved_parent_update_completed).map((item) => ({ id: item.id, title: item.class_name, meta: `${item.teacher_name} • Pending session tasks` })),
    studentsNeedingFollowUp: demoData.teacherFollowUpTasks.filter((task) => task.status !== 'completed').map((task) => ({ id: task.id, title: demoData.students.find((student) => student.id === task.student_id)?.name || 'Student', meta: task.action_title })),
  };
}

export function getStudentDashboardSummary(user) {
  const attendanceItems = filterByRole(demoData.attendance, user, 'attendance');
  const updateItems = filterByRole(demoData.parentUpdates, user, 'parentUpdates');
  const reminderItems = demoData.studentReminders.filter((item) => item.student_id === user?.student_id);
  const completedHomework = attendanceItems.filter((item) => item.homework_status === 'completed').length;
  const assignedHomework = attendanceItems.filter((item) => item.homework_status !== 'not_assigned').length;
  const progressSummary = assignedHomework > 0 ? `${Math.round((completedHomework / assignedHomework) * 100)}%` : '—';
  return {
    homeworkDue: attendanceItems.filter((item) => item.homework_status === 'incomplete').length,
    recentFeedback: updateItems.length,
    learningResources: 3,
    progressSummary,
    progressItems: [
      { id: 'progress-1', title: 'Homework completion', meta: assignedHomework > 0 ? `${completedHomework} of ${assignedHomework} tasks completed` : 'No homework tracked yet' },
      { id: 'progress-2', title: 'Attendance trend', meta: `${attendanceItems.filter((item) => item.status === 'present').length} sessions attended` },
    ],
    reminders: reminderItems,
  };
}

export async function listParentUpdatesByStudent(user, studentId) {
  const items = await listParentUpdates(user);
  return items.filter(item => item.student_id === studentId);
}

export async function listFeeRecords(user) {
  if (!demoEnabled() && isSupabaseConfigured() && supabase) {
    try {
      const { data, error } = await supabase
        .from('fee_records')
        .select(`
          id,
          branch_id,
          class_id,
          student_id,
          fee_period,
          amount,
          status,
          receipt_file_path,
          receipt_storage_bucket,
          uploaded_by_profile_id,
          uploaded_at,
          verified_by_profile_id,
          verified_at,
          verification_status,
          internal_note,
          student:students!fee_records_student_id_fkey(full_name),
          class:classes!fee_records_class_id_fkey(name),
          branch:branches!fee_records_branch_id_fkey(name)
        `)
        .order('updated_at', { ascending: false });

      if (!error && Array.isArray(data)) {
        return data.map((row) => ({
          id: row.id,
          fee_record_id: row.id,
          student_id: row.student_id,
          student_name: row.student?.full_name || row.student_id,
          parent_guardian_name: 'Linked Parent/Guardian',
          branch_id: row.branch_id,
          branch_name: row.branch?.name || row.branch_id,
          class_id: row.class_id,
          class_name: row.class?.name || row.class_id,
          fee_period: row.fee_period,
          fee_amount: Number(row.amount ?? 0),
          due_date: '',
          payment_status: row.status === 'pending_verification' ? 'pending verification' : row.status,
          payment_method: 'not_set',
          receipt_uploaded: Boolean(row.receipt_file_path),
          receipt_reference_note: row.receipt_file_path || '',
          verified_by: row.verified_by_profile_id || '',
          verified_date: row.verified_at ? new Date(row.verified_at).toISOString().slice(0, 10) : '',
          internal_note: row.internal_note || '',
          receipt_storage_bucket: row.receipt_storage_bucket || 'fee-receipts',
          uploaded_by_profile_id: row.uploaded_by_profile_id || null,
          uploaded_at: row.uploaded_at || null,
          verification_status: row.verification_status || 'not_uploaded',
          data_source: 'supabase_fee_records',
        }));
      }
    } catch {
      // Fallback below
    }
    return [];
  }
  const role = user?.role;
  if (role === ROLES.HQ_ADMIN) return demoData.feeRecords;
  if (role === ROLES.BRANCH_SUPERVISOR) return demoData.feeRecords.filter((item) => item.branch_id === user?.branch_id);
  if (role === ROLES.PARENT) return demoData.feeRecords.filter((item) => item.student_id === user?.student_id);
  return [];
}

export async function getStudentFeeStatus(user, studentId) {
  const items = await listFeeRecords(user);
  return items.find((item) => item.student_id === studentId) || null;
}

export async function markFeeRecordPaid(user, recordId) {
  const record = demoData.feeRecords.find((item) => item.id === recordId);
  if (!record) return null;
  record.payment_status = 'paid';
  record.verified_by = user?.full_name || 'Current Supervisor';
  record.verified_date = '2026-04-26';
  return record;
}

export function getFeeDashboardSummary(user, feeRecords = []) {
  const unpaid = feeRecords.filter((item) => item.payment_status === 'unpaid').length;
  const overdue = feeRecords.filter((item) => item.payment_status === 'overdue').length;
  const pendingVerification = feeRecords.filter((item) => item.payment_status === 'pending verification').length;
  const paidThisMonth = feeRecords.filter((item) => item.payment_status === 'paid' && item.verified_date?.startsWith('2026-04')).length;
  const branchCompletionRate = feeRecords.length ? Math.round((feeRecords.filter((item) => item.payment_status === 'paid').length / feeRecords.length) * 100) : 0;
  return { unpaid, overdue, pendingVerification, paidThisMonth, branchCompletionRate };
}

export async function getStudentById(user, studentId) {
  const students = await listStudents(user);
  return students.find(student => student.id === studentId) || null;
}

export async function listHomeworkAttachments(user) {
  if (!demoEnabled()) return [];
  const role = user?.role;
  if (role === ROLES.HQ_ADMIN) return demoData.homeworkAttachments;
  if (role === ROLES.BRANCH_SUPERVISOR) return demoData.homeworkAttachments.filter((item) => item.branch_id === user?.branch_id);
  if (role === ROLES.TEACHER) return demoData.homeworkAttachments.filter((item) => user?.assigned_class_ids?.includes(item.class_id));
  if (role === ROLES.PARENT) return demoData.homeworkAttachments.filter((item) => item.student_id === user?.student_id);
  if (role === ROLES.STUDENT) return demoData.homeworkAttachments.filter((item) => item.student_id === user?.student_id);
  return [];
}

export async function listHomeworkAttachmentsByStudent(user, studentId) {
  const items = await listHomeworkAttachments(user);
  return items.filter((item) => item.student_id === studentId);
}

export function getHomeworkAttachmentSummary(user, items = []) {
  return {
    totalUploads: items.length,
    pendingTeacherReview: items.filter((item) => ['received', 'ai_draft_ready'].includes(item.status)).length,
    aiDraftReady: items.filter((item) => item.status === 'ai_draft_ready').length,
    feedbackReleased: items.filter((item) => item.status === 'feedback_released').length,
  };
}

export async function getClassById(user, classId) {
  const classes = await listClasses(user);
  return classes.find(item => item.id === classId) || null;
}

export async function listStaff(user) {
  if (demoEnabled()) return filterByRole(demoData.users, user, 'users').filter(u => u.role === 'teacher' || u.role === 'branch_supervisor');
  const users = await base44.entities.User.list();
  return users.filter(u => u.role === 'teacher' || u.role === 'branch_supervisor');
}

export async function createStudent(data) {
  if (demoEnabled()) return { id: 'demo-created-student', ...data };
  return base44.entities.Student.create(data);
}

export async function createBranch(data) {
  if (demoEnabled()) return { id: 'demo-created-branch', ...data, status: 'active' };
  return base44.entities.Branch.create(data);
}

export async function createClass(data) {
  if (demoEnabled()) return { id: 'demo-created-class', ...data };
  return base44.entities.Class.create(data);
}

export async function createParentUpdate(data) {
  if (demoEnabled()) return { id: 'demo-created-update', ...data, created_date: new Date().toISOString() };
  return base44.entities.ParentUpdate.create(data);
}

export async function invokeParentReport(studentId, appUrl) {
  if (demoEnabled()) return { data: { success: true } };
  return base44.functions.invoke('sendParentReport', { studentId, appUrl });
}

export async function inviteUser(email) {
  if (demoEnabled()) return { success: true, email };
  return base44.users.inviteUser(email, 'user');
}

export async function generateParentMessage(student, notes) {
  // Real AI generation is intentionally disabled in this prototype.
  // Future implementation should use Supabase Edge Functions or a secure backend, not frontend direct calls.
  const studentName = student?.name || 'Your child';
  const parentName = student?.parent_name || student?.guardian_name || 'Parent/Guardian';
  const className = student?.class_name || 'the class';
  const attendanceStatus = student?.attendance_status || 'being tracked';
  const homeworkStatus = student?.homework_status || 'pending review';
  const teacherNote = notes?.trim() || 'Today we focused on steady progress and participation.';

  return `Hello ${parentName},

${studentName} completed today\'s session in ${className}.
Attendance status: ${attendanceStatus}.
Homework status: ${homeworkStatus}.

Teacher note: ${teacherNote}

This is a demo parent update draft only. It should be reviewed and approved by the teacher before sharing.`;
}

export async function uploadHomeworkAttachment(file, studentId) {
  if (demoEnabled()) {
    return {
      id: `demo-upload-${studentId || 'student'}`,
      file_name: file?.name || 'demo-upload',
      upload_date: '2026-04-26',
      status: 'received',
      status_label: 'received',
      file_url: 'demo-file-url',
      student_id: studentId || null,
    };
  }

  const { file_url } = await base44.integrations.Core.UploadFile({ file });
  return {
    file_url,
    file_name: file?.name || 'uploaded-file',
    student_id: studentId || null,
  };
}

export function getFutureModuleRoadmap() {
  return [
    {
      id: 'ai-homework-scanner',
      title: 'AI Homework Scanner',
      description: 'Capture homework photos or book pages, extract question-and-answer content, and route submissions to teacher review.',
      items: ['Upload image or scan source', 'Homework attachment record saved first', 'Question and answer extraction layer', 'Teacher review queue before any marking output'],
    },
    {
      id: 'curriculum-kb',
      title: 'Curriculum & Textbook Knowledge Base',
      description: 'Store curriculum pathways, textbook mappings, marking guides, and skill tags to support future AI diagnosis.',
      items: ['School type and pathway mapping', 'Topic/unit indexing', 'Model answer and marking guide library', 'Skill tag taxonomy'],
    },
    {
      id: 'ai-marking-diagnosis',
      title: 'AI Marking & Diagnosis',
      description: 'Future marking engine will classify answers, explain mistakes, and surface weak skill areas with recommended revision.',
      items: ['Question detected', 'Student answer captured', 'Correct / partially correct / incorrect', 'Score and mistake explanation', 'Weak skill tag and recommended revision', 'AI confidence with teacher review status'],
    },
    {
      id: 'teacher-follow-up',
      title: 'Teacher Follow-Up Tasks',
      description: 'AI-supported recommendations will become trackable teacher actions that supervisors can monitor.',
      items: ['AI-created action recommendation', 'Teacher completion workflow', 'HQ follow-up tracking'],
    },
    {
      id: 'student-reminders',
      title: 'Student Reminder System',
      description: 'A professional habit and reminder layer for homework, incomplete tasks, and revision prompts.',
      items: ['Homework reminders', 'Incomplete task reminders', 'Revision reminders', 'Habit-based learning nudges'],
    },
    {
      id: 'parent-progress',
      title: 'Parent Progress View',
      description: 'Parents will continue to see approved-only progress with practical next steps.',
      items: ['Approved feedback only', 'Homework status', 'Weak areas', 'Teacher follow-up summary', 'Next recommended practice'],
    },
  ];
}

export function getFutureDataModelBlueprint() {
  return {
    homeworkScans: ['student_id', 'class_id', 'uploaded_by_role', 'source_type', 'image_url', 'extraction_status', 'review_status', 'extracted_question_text', 'extracted_answer_text'],
    curriculumKnowledgeBase: ['school_type', 'curriculum_pathway', 'textbook_series', 'topic_unit', 'model_answer', 'marking_guide', 'skill_tag'],
    aiMarkingDiagnoses: ['student_id', 'homework_scan_id', 'question_detected', 'student_answer', 'marking_result', 'score', 'mistake_explanation', 'weak_skill_area', 'recommended_revision_topic', 'ai_confidence', 'teacher_review_status'],
    teacherFollowUpTasks: ['student_id', 'class_id', 'teacher_email', 'source', 'action_title', 'action_detail', 'status', 'hq_tracking_status'],
    studentReminders: ['student_id', 'reminder_type', 'title', 'delivery_channel', 'cadence', 'status'],
  };
}

export function getFutureArchitectureSpec() {
  return {
    ingestionLayer: ['Homework upload', 'Image storage', 'Future OCR/extraction service'],
    intelligenceLayer: ['Curriculum knowledge base', 'Future GPT-5.5 vision marking draft', 'Possible Gemini multimodal comparison', 'Weak-area diagnosis'],
    operationsLayer: ['Teacher follow-up tasks', 'HQ compliance tracking', 'Approval workflow'],
    engagementLayer: ['Student reminders', 'Parent approved feedback', 'Recommended practice loop'],
    governanceRules: ['Parents see approved-only feedback', 'Teachers review AI outputs before release', 'HQ tracks follow-up completion'],
  };
}

export function getTrialSchedules(user) {
  const trialSchedules = [
    {
      id: 'trial-01',
      child_name: 'Aisyah Rahman',
      parent_name: 'Nurul Rahman',
      parent_phone: '0400 100 200',
      parent_email: 'nurul@example.com',
      interested_programme: 'English Level 2',
      preferred_branch_id: 'branch-north',
      preferred_branch_name: 'North Learning Hub',
      trial_class_date: '2026-04-26',
      trial_class_time: '15:30',
      assigned_teacher_email: 'demo.teacher@sample.local',
      assigned_teacher_name: 'Demo Teacher One',
      assigned_class_id: 'class-alpha',
      trial_status: 'scheduled',
      follow_up_note: 'Parent confirmed attendance by phone.',
      next_follow_up_date: '2026-04-27',
    },
    {
      id: 'trial-02',
      child_name: 'Marcus Lee',
      parent_name: 'Elaine Lee',
      parent_phone: '0400 300 400',
      parent_email: 'elaine@example.com',
      interested_programme: 'Mathematics Advanced',
      preferred_branch_id: 'branch-north',
      preferred_branch_name: 'North Learning Hub',
      trial_class_date: '2026-04-25',
      trial_class_time: '17:00',
      assigned_teacher_email: 'demo.teacher@sample.local',
      assigned_teacher_name: 'Demo Teacher One',
      assigned_class_id: 'class-beta',
      trial_status: 'attended',
      follow_up_note: 'Positive first impression, waiting for follow-up call.',
      next_follow_up_date: '2026-04-28',
    },
    {
      id: 'trial-03',
      child_name: 'Sophie Tan',
      parent_name: 'Daniel Tan',
      parent_phone: '0400 500 600',
      parent_email: 'daniel@example.com',
      interested_programme: 'Science Explorers',
      preferred_branch_id: 'branch-south',
      preferred_branch_name: 'South Study Studio',
      trial_class_date: '2026-04-26',
      trial_class_time: '16:00',
      assigned_teacher_email: 'demo.teacher.two@sample.local',
      assigned_teacher_name: 'Demo Teacher Two',
      assigned_class_id: 'class-gamma',
      trial_status: 'new',
      follow_up_note: 'Needs scheduling confirmation.',
      next_follow_up_date: '2026-04-26',
    },
  ];

  if (user?.role === ROLES.HQ_ADMIN) return trialSchedules;
  if (user?.role === ROLES.BRANCH_SUPERVISOR) return trialSchedules.filter((item) => item.preferred_branch_id === user?.branch_id);
  if (user?.role === ROLES.TEACHER) return trialSchedules.filter((item) => item.assigned_teacher_email === user?.email || user?.assigned_class_ids?.includes(item.assigned_class_id));
  return [];
}

export function getTeacherNotifications(user) {
  const notifications = [
    { id: 'task-01', teacher_email: 'demo.teacher@sample.local', teacher_name: 'Demo Teacher One', branch_id: 'branch-north', status: 'overdue', priority: 'high', title: 'Attendance not completed', related_label: 'Alpha English', related_type: 'class', due_at: '2026-04-25 16:00', due_label: 'Today 4:00 PM' },
    { id: 'task-02', teacher_email: 'demo.teacher@sample.local', teacher_name: 'Demo Teacher One', branch_id: 'branch-north', status: 'pending', priority: 'high', title: 'Homework marking pending', related_label: 'Beta Maths', related_type: 'class', due_at: '2026-04-26 10:00', due_label: 'Today 10:00 AM' },
    { id: 'task-03', teacher_email: 'demo.teacher@sample.local', teacher_name: 'Demo Teacher One', branch_id: 'branch-north', status: 'pending', priority: 'medium', title: 'Student note missing', related_label: 'Demo Student Two', related_type: 'student', due_at: '2026-04-26 12:00', due_label: 'Today 12:00 PM' },
    { id: 'task-04', teacher_email: 'demo.teacher@sample.local', teacher_name: 'Demo Teacher One', branch_id: 'branch-north', status: 'pending', priority: 'high', title: 'Parent report draft pending', related_label: 'Demo Student Three', related_type: 'student', due_at: '2026-04-26 14:00', due_label: 'Today 2:00 PM' },
    { id: 'task-05', teacher_email: 'demo.teacher@sample.local', teacher_name: 'Demo Teacher One', branch_id: 'branch-north', status: 'overdue', priority: 'high', title: 'Parent report not approved', related_label: 'Demo Student Three', related_type: 'student', due_at: '2026-04-25 18:00', due_label: 'Yesterday 6:00 PM' },
    { id: 'task-06', teacher_email: 'demo.teacher@sample.local', teacher_name: 'Demo Teacher One', branch_id: 'branch-north', status: 'pending', priority: 'medium', title: 'Assigned trial class today', related_label: 'Marcus Lee trial', related_type: 'student', due_at: '2026-04-26 17:00', due_label: 'Today 5:00 PM' },
    { id: 'task-07', teacher_email: 'demo.teacher@sample.local', teacher_name: 'Demo Teacher One', branch_id: 'branch-north', status: 'pending', priority: 'medium', title: 'Student follow-up required', related_label: 'Demo Student One', related_type: 'student', due_at: '2026-04-27 09:00', due_label: 'Tomorrow 9:00 AM' },
    { id: 'task-08', teacher_email: 'demo.teacher@sample.local', teacher_name: 'Demo Teacher One', branch_id: 'branch-north', status: 'completed', priority: 'low', title: 'Observation feedback to review', related_label: 'Beta Maths', related_type: 'class', due_at: '2026-04-26 08:30', due_label: 'Today 8:30 AM' },
    { id: 'task-09', teacher_email: 'demo.teacher.two@sample.local', teacher_name: 'Demo Teacher Two', branch_id: 'branch-south', status: 'overdue', priority: 'high', title: 'Attendance not completed', related_label: 'Gamma Science', related_type: 'class', due_at: '2026-04-25 15:30', due_label: 'Yesterday 3:30 PM' },
    { id: 'task-10', teacher_email: 'demo.teacher.two@sample.local', teacher_name: 'Demo Teacher Two', branch_id: 'branch-south', status: 'pending', priority: 'medium', title: 'Student follow-up required', related_label: 'Sophie Tan trial', related_type: 'student', due_at: '2026-04-26 16:00', due_label: 'Today 4:00 PM' }
  ];

  if (user?.role === ROLES.HQ_ADMIN) return notifications;
  if (user?.role === ROLES.BRANCH_SUPERVISOR) return notifications.filter((item) => item.branch_id === user?.branch_id);
  if (user?.role === ROLES.TEACHER) {
    return notifications
      .filter((item) => item.teacher_email === user?.email)
      .sort((a, b) => {
        const order = { overdue: 0, pending: 1, completed: 2 };
        return order[a.status] - order[b.status];
      });
  }
  return [];
}

function toDueLabel(dueAt) {
  if (!dueAt) return 'No due date';
  const date = new Date(dueAt);
  if (Number.isNaN(date.getTime())) return 'No due date';
  return date.toLocaleString();
}

function sortTeacherNotifications(items = []) {
  const order = { overdue: 0, pending: 1, in_progress: 2, completed: 3 };
  return [...items].sort((a, b) => {
    const left = order[a.status] ?? 9;
    const right = order[b.status] ?? 9;
    if (left !== right) return left - right;
    return (a.due_at || '').localeCompare(b.due_at || '');
  });
}

export async function listTeacherNotifications(user) {
  if (demoEnabled()) {
    return getTeacherNotifications(user).map((item) => ({
      ...item,
      assignmentId: null,
    }));
  }

  if (!isSupabaseConfigured() || !supabase) {
    return getTeacherNotifications(user).map((item) => ({
      ...item,
      assignmentId: null,
    }));
  }

  try {
    const { data, error } = await supabase
      .from('teacher_task_assignments')
      .select('id,status,completed_at,updated_at,teacher_id,task:teacher_tasks!inner(id,title,due_at,class_id,student_id)')
      .order('updated_at', { ascending: false });

    if (error || !Array.isArray(data)) {
      return getTeacherNotifications(user).map((item) => ({
        ...item,
        assignmentId: null,
      }));
    }

    const rows = data.map((row) => {
      const relatedLabel = row?.task?.class_id
        ? 'Class task'
        : row?.task?.student_id
          ? 'Student task'
          : 'General task';
      return {
        id: row.id,
        assignmentId: row.id,
        status: row.status || 'pending',
        priority: row.status === 'overdue' ? 'high' : 'medium',
        title: row?.task?.title || 'Teacher task',
        related_label: relatedLabel,
        related_type: row?.task?.class_id ? 'class' : (row?.task?.student_id ? 'student' : 'task'),
        due_at: row?.task?.due_at || '',
        due_label: toDueLabel(row?.task?.due_at),
        completed_at: row?.completed_at || null,
      };
    });

    return sortTeacherNotifications(rows);
  } catch {
    return getTeacherNotifications(user).map((item) => ({
      ...item,
      assignmentId: null,
    }));
  }
}

export function getTeacherTaskCompletionOverview(user) {
  const items = getTeacherNotifications(user);
  return {
    pending: items.filter((item) => item.status === 'pending').length,
    completed: items.filter((item) => item.status === 'completed').length,
    overdue: items.filter((item) => item.status === 'overdue').length,
  };
}

export function getDemoSummary() {
  return demoData;
}

export function getReadDataSource(type) {
  return readSources[type] || 'demo';
}