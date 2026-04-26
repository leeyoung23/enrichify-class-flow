export const ROLES = {
  HQ_ADMIN: 'hq_admin',
  BRANCH_SUPERVISOR: 'branch_supervisor',
  TEACHER: 'teacher',
  PARENT: 'parent',
  STUDENT: 'student',
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
  const routeMap = {
    [ROLES.HQ_ADMIN]: ['/', '/branches', '/classes', '/teachers', '/students', '/attendance', '/homework', '/parent-updates', '/fee-tracking', '/leads', '/trial-scheduling', '/observations', '/teacher-kpi', '/branch-performance', '/future-ai-learning-engine', '/migration-ownership-audit', '/prototype-summary', '/my-tasks'],
    [ROLES.BRANCH_SUPERVISOR]: ['/', '/classes', '/teachers', '/students', '/attendance', '/homework', '/parent-updates', '/fee-tracking', '/leads', '/trial-scheduling', '/observations', '/teacher-kpi', '/branch-performance', '/prototype-summary', '/my-tasks'],
    [ROLES.TEACHER]: ['/', '/class-session', '/classes', '/students', '/attendance', '/homework', '/parent-updates', '/trial-scheduling', '/my-tasks', '/teacher-kpi', '/observations'],
    [ROLES.PARENT]: ['/parent-view'],
    [ROLES.STUDENT]: ['/parent-view'],
  };

  return routeMap[role] || [];
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