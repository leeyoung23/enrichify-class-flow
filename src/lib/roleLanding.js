export function getDefaultLandingPathForRole(appUser) {
  const role = appUser?.role;
  if (role === "parent" || role === "student") {
    const studentId = appUser?.linked_student_id ?? appUser?.student_id ?? null;
    if (studentId != null && String(studentId).trim() !== "") {
      const qs = new URLSearchParams({ student: String(studentId) });
      return `/parent-view?${qs.toString()}`;
    }
    return "/parent-view";
  }

  if (role === "hq_admin" || role === "branch_supervisor" || role === "teacher") {
    return "/";
  }

  return "/";
}
