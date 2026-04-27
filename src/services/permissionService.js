export const ROLES = {
  HQ_ADMIN: 'hq_admin',
  BRANCH_SUPERVISOR: 'branch_supervisor',
  TEACHER: 'teacher',
  PARENT: 'parent',
  STUDENT: 'student',
};

export const ROLE_LABELS = {
  [ROLES.HQ_ADMIN]: 'HQ Admin',
  [ROLES.BRANCH_SUPERVISOR]: 'Branch Supervisor',
  [ROLES.TEACHER]: 'Teacher',
  [ROLES.PARENT]: 'Parent',
  [ROLES.STUDENT]: 'Student',
};

export const ROLE_NAVIGATION = {
  [ROLES.HQ_ADMIN]: [
    { label: 'Dashboard', icon: 'dashboard', path: '/' },
    { label: 'Branches', icon: 'branches', path: '/branches' },
    { label: 'Classes', icon: 'classes', path: '/classes' },
    { label: 'Teachers', icon: 'teachers', path: '/teachers' },
    { label: 'Students', icon: 'students', path: '/students' },
    { label: 'Attendance', icon: 'attendance', path: '/attendance' },
    { label: 'Homework', icon: 'homework', path: '/homework' },
    { label: 'Parent Communication', icon: 'parentUpdates', path: '/parent-updates' },
    { label: 'Leads & Enrolment', icon: 'leads', path: '/leads' },
    { label: 'Trial Scheduling', icon: 'trialScheduling', path: '/trial-scheduling' },
    { label: 'Teacher KPI', icon: 'teacherKpi', path: '/teacher-kpi' },
    { label: 'Fee Tracking', icon: 'feeTracking', path: '/fee-tracking' },
    { label: 'Observations', icon: 'observations', path: '/observations' },
    { label: 'Branch Performance', icon: 'branchPerformance', path: '/branch-performance' },
    { label: 'Future AI Engine', icon: 'futureAi', path: '/future-ai-learning-engine' },
    { label: 'Migration Audit', icon: 'migrationAudit', path: '/migration-ownership-audit' },
    { label: 'Prototype Summary', icon: 'prototypeSummary', path: '/prototype-summary' },
  ],
  [ROLES.BRANCH_SUPERVISOR]: [
    { label: 'Dashboard', icon: 'dashboard', path: '/' },
    { label: 'Classes', icon: 'classes', path: '/classes' },
    { label: 'Teachers', icon: 'teachers', path: '/teachers' },
    { label: 'Students', icon: 'students', path: '/students' },
    { label: 'Attendance', icon: 'attendance', path: '/attendance' },
    { label: 'Homework', icon: 'homework', path: '/homework' },
    { label: 'Parent Communication', icon: 'parentUpdates', path: '/parent-updates' },
    { label: 'Leads & Enrolment', icon: 'leads', path: '/leads' },
    { label: 'Trial Scheduling', icon: 'trialScheduling', path: '/trial-scheduling' },
    { label: 'Teacher KPI', icon: 'teacherKpi', path: '/teacher-kpi' },
    { label: 'Fee Tracking', icon: 'feeTracking', path: '/fee-tracking' },
    { label: 'Observations', icon: 'observations', path: '/observations' },
    { label: 'Branch Performance', icon: 'branchPerformance', path: '/branch-performance' },
  ],
  [ROLES.TEACHER]: [
    { label: 'Dashboard', icon: 'dashboard', path: '/' },
    { label: 'Class Session', icon: 'classSession', path: '/class-session' },
    { label: 'My Classes', icon: 'classes', path: '/classes' },
    { label: 'My Students', icon: 'students', path: '/students' },
    { label: 'Attendance', icon: 'attendance', path: '/attendance' },
    { label: 'Homework', icon: 'homework', path: '/homework' },
    { label: 'Parent Communication', icon: 'parentUpdates', path: '/parent-updates' },
    { label: 'My Tasks', icon: 'myTasks', path: '/my-tasks' },
    { label: 'Teacher KPI', icon: 'teacherKpi', path: '/teacher-kpi' },
    { label: 'Observations', icon: 'observations', path: '/observations' },
  ],
  [ROLES.PARENT]: [
    { label: 'Parent Dashboard', icon: 'dashboard', path: '/parent-view' },
    { label: 'Child Attendance', icon: 'attendance', path: '/parent-view#attendance-summary' },
    { label: 'Child Homework', icon: 'homework', path: '/parent-view#homework-history' },
    { label: 'Parent Reports', icon: 'parentUpdates', path: '/parent-view#latest-report' },
    { label: 'Student Learning Portal / Learning Materials', icon: 'classes', path: '/parent-view#student-learning-portal' },
  ],
  [ROLES.STUDENT]: [
    { label: 'Student Learning Portal', icon: 'classes', path: '/parent-view#student-learning-portal' },
    { label: 'Homework Due', icon: 'homework', path: '/parent-view#homework-due' },
    { label: 'Recent Feedback', icon: 'parentUpdates', path: '/parent-view#recent-feedback' },
    { label: 'Learning Resources', icon: 'classes', path: '/parent-view#learning-resources' },
    { label: 'Simple Progress Summary', icon: 'teacherKpi', path: '/parent-view#simple-progress-summary' },
  ],
};

export function getRole(user) {
  const role = String(user?.role || ROLES.TEACHER).trim().toLowerCase().replace(/\s+/g, '_');
  if (role === 'admin' || role === 'hq' || role === 'hqadmin') return ROLES.HQ_ADMIN;
  if (role === 'branchsupervisor') return ROLES.BRANCH_SUPERVISOR;
  return role;
}

export function isRole(user, role) {
  return getRole(user) === role;
}

export function canManageStudents(user) {
  const role = getRole(user);
  return role === ROLES.HQ_ADMIN || role === ROLES.BRANCH_SUPERVISOR;
}

export function canManageClasses(user) {
  return getRole(user) === ROLES.HQ_ADMIN;
}

export function canInviteStaff(user) {
  return getRole(user) === ROLES.HQ_ADMIN;
}

export function isTeacherRole(user) {
  return getRole(user) === ROLES.TEACHER;
}

export function getDashboardLabel(user) {
  const role = getRole(user);
  if (role === ROLES.HQ_ADMIN) return 'HQ Dashboard';
  if (role === ROLES.BRANCH_SUPERVISOR) return 'Branch Dashboard';
  if (role === ROLES.PARENT) return 'Parent Dashboard';
  if (role === ROLES.STUDENT) return 'Learning Portal';
  return 'Teacher Dashboard';
}

export function getAllowedRoutes(role) {
  return [...new Set(getRoleNavigation(role).map((item) => item.path.split('#')[0]))];
}

export function getRoleNavigation(role) {
  return ROLE_NAVIGATION[role] || [];
}

export function isRouteAllowed(role, pathname) {
  const allowedRoutes = getAllowedRoutes(role);
  return allowedRoutes.includes(pathname) || (pathname.startsWith('/observations/') && allowedRoutes.includes('/observations'));
}

export function canAccessStudentRecord(user, student, links = []) {
  const role = getRole(user);
  if (role === ROLES.HQ_ADMIN) return true;
  if (role === ROLES.BRANCH_SUPERVISOR) return student?.branch_id === user?.branch_id;
  if (role === ROLES.TEACHER) return Array.isArray(user?.assigned_class_ids) && user.assigned_class_ids.includes(student?.class_id);
  if (role === ROLES.PARENT) return links.some(link => link.student_id === student?.id && link.guardian_parent_id === user?.guardian_parent_id);
  if (role === ROLES.STUDENT) return user?.student_id === student?.id;
  return false;
}