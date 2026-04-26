import { base44 } from '@/api/base44Client';
import { ROLES } from './permissionService';

const NORMALIZED_ROLES = new Set(Object.values(ROLES));

const DEMO_USERS = {
  [ROLES.HQ_ADMIN]: {
    id: 'demo-user-hq',
    full_name: 'Demo HQ Admin',
    email: 'demo.hq@sample.local',
    role: ROLES.HQ_ADMIN,
    branch_id: null,
  },
  [ROLES.BRANCH_SUPERVISOR]: {
    id: 'demo-user-branch',
    full_name: 'Demo Branch Supervisor',
    email: 'demo.branch@sample.local',
    role: ROLES.BRANCH_SUPERVISOR,
    branch_id: 'branch-north',
  },
  [ROLES.TEACHER]: {
    id: 'demo-user-teacher',
    full_name: 'Demo Teacher One',
    email: 'demo.teacher@sample.local',
    role: ROLES.TEACHER,
    branch_id: 'branch-north',
    teacher_id: 'teacher-01',
    assigned_class_ids: ['class-alpha', 'class-beta'],
  },
  [ROLES.PARENT]: {
    id: 'demo-user-parent',
    full_name: 'Demo Parent One',
    email: 'demo.parent@sample.local',
    role: ROLES.PARENT,
    branch_id: 'branch-north',
    guardian_parent_id: 'guardian-01',
    student_id: 'student-01',
  },
  [ROLES.STUDENT]: {
    id: 'demo-user-student',
    full_name: 'Demo Student One',
    email: 'demo.student@sample.local',
    role: ROLES.STUDENT,
    branch_id: 'branch-north',
    student_id: 'student-01',
  },
};

export function getAvailableDemoRoles() {
  return Object.values(ROLES);
}

export function normalizeRole(role) {
  if (!role) return null;
  const value = String(role).trim().toLowerCase().replace(/\s+/g, '_');
  if (value === 'admin' || value === 'hq' || value === 'hqadmin') return ROLES.HQ_ADMIN;
  if (value === 'branchsupervisor' || value === 'branch_supervisor') return ROLES.BRANCH_SUPERVISOR;
  if (value === 'teacher') return ROLES.TEACHER;
  if (value === 'parent') return ROLES.PARENT;
  if (value === 'student') return ROLES.STUDENT;
  return NORMALIZED_ROLES.has(value) ? value : null;
}

export function getSelectedDemoRole() {
  const params = new URLSearchParams(window.location.search);
  return normalizeRole(params.get('demoRole'));
}

export function getDemoUser(role = ROLES.TEACHER) {
  const normalizedRole = normalizeRole(role) || ROLES.TEACHER;
  return DEMO_USERS[normalizedRole] || DEMO_USERS[ROLES.TEACHER];
}

export async function getCurrentUser() {
  const demoRole = getSelectedDemoRole();
  if (demoRole) {
    return getDemoUser(demoRole);
  }
  const user = await base44.auth.me();
  return user ? { ...user, role: normalizeRole(user.role) || user.role } : user;
}