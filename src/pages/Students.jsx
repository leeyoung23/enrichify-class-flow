import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listStudents, listClasses, createStudent, invokeParentReport, getStudentFeeStatus, listHomeworkAttachments, getReadDataSource } from '@/services/dataService';
import { listAttendanceRecords } from '@/services/dataService';
import { getStudentLearningContext, listCurriculumProfiles } from '@/services/supabaseReadService';
import { upsertStudentSchoolProfile } from '@/services/supabaseWriteService';
import { canManageStudents, isTeacherRole } from '@/services/permissionService';
import { GraduationCap, Plus, Phone, Mail, Send, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import HomeworkReviewInbox from '@/components/students/HomeworkReviewInbox';
import StudentHomeworkUploadHistory from '@/components/students/StudentHomeworkUploadHistory';

const initialForm = { name: '', class_id: '', branch_id: '', parent_name: '', parent_phone: '', parent_email: '' };
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUuid = (value) => typeof value === 'string' && UUID_REGEX.test(value.trim());
const NONE_PROFILE_VALUE = "__none__";
const trimToNull = (value) => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed || null;
};

async function sendReport(student) {
  if (!student.parent_email) {
    toast.error('No parent email on record for this student.');
    return;
  }
  const appUrl = window.location.origin;
  const response = await invokeParentReport(student.id, appUrl);
  if (response.data?.success) {
    toast.success(`Demo only: preview link prepared for ${student.parent_name || 'parent'}. No real email was sent.`);
  } else {
    toast.error(response.data?.error || 'Failed to prepare demo report preview.');
  }
}

class StudentsErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="p-6">
          <Card className="border-destructive/30 p-6">
            <p className="text-sm font-medium text-destructive">Something went wrong on this page.</p>
            <p className="mt-2 text-xs text-muted-foreground">
              Please refresh <code className="rounded bg-muted px-1">/students</code>. If it continues, contact support and mention this route.
            </p>
          </Card>
        </div>
      );
    }
    return this.props.children;
  }
}

function StudentsPage() {
  const { user } = useOutletContext();
  const navigate = useNavigate();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [editingSchoolProfileStudentId, setEditingSchoolProfileStudentId] = useState(null);
  const [schoolProfileFormByStudentId, setSchoolProfileFormByStudentId] = useState({});
  const [savingSchoolProfileStudentId, setSavingSchoolProfileStudentId] = useState(null);
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const queryClient = useQueryClient();
  const isTeacher = isTeacherRole(user);

  const { data: studentsRaw, isLoading, error: studentsError } = useQuery({
    queryKey: ['students', user?.role, user?.email],
    queryFn: () => listStudents(user),
    enabled: !!user,
  });

  const { data: classesRaw, error: classesError } = useQuery({
    queryKey: ['all-classes', user?.role, user?.email],
    queryFn: () => listClasses(user),
    enabled: !!user,
  });

  const { data: homeworkInboxRaw, error: homeworkInboxError } = useQuery({
    queryKey: ['homework-attachments', user?.role, user?.email],
    queryFn: () => listHomeworkAttachments(user),
    enabled: !!user,
  });
  const { data: attendanceRecordsRaw } = useQuery({
    queryKey: ['students-attendance-summary', user?.role, user?.email],
    queryFn: () => listAttendanceRecords(user),
    enabled: !!user,
  });

  const students = Array.isArray(studentsRaw) ? studentsRaw : [];
  const classes = Array.isArray(classesRaw) ? classesRaw : [];
  const homeworkInboxItems = Array.isArray(homeworkInboxRaw) ? homeworkInboxRaw : [];
  const attendanceRecords = Array.isArray(attendanceRecordsRaw) ? attendanceRecordsRaw : [];

  const createMutation = useMutation({
    mutationFn: (data) => createStudent(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      setDialogOpen(false);
      setForm(initialForm);
    },
  });

  const classStudents = useMemo(() => {
    if (!isTeacher) return students;
    if (!students.length) return [];
    if (!Array.isArray(classes) || classes.length === 0) {
      // Fallback: if class metadata is temporarily unavailable, keep teacher-scoped student rows visible.
      return students;
    }
    const classIdSet = new Set(classes.map((c) => c.id).filter(Boolean));
    return students.filter((student) => classIdSet.has(student.class_id));
  }, [isTeacher, students, classes]);

  const [feeStatuses, setFeeStatuses] = useState({});
  const selectedStudent = useMemo(
    () => classStudents.find((student) => student.id === selectedStudentId) || null,
    [classStudents, selectedStudentId]
  );
  const selectedStudentAttendance = useMemo(
    () => attendanceRecords.filter((record) => record.student_id === selectedStudentId),
    [attendanceRecords, selectedStudentId]
  );
  const selectedStudentHomeworkUploads = useMemo(
    () => homeworkInboxItems.filter((item) => item.student_id === selectedStudentId),
    [homeworkInboxItems, selectedStudentId]
  );
  useEffect(() => {
    if (!user || classStudents.length === 0) return;
    Promise.all(classStudents.map(async (student) => [student.id, await getStudentFeeStatus(user, student.id)])).then((entries) => {
      setFeeStatuses(Object.fromEntries(entries));
    });
  }, [user, classStudents.length]);

  const getClassName = (id) => classes.find(c => c.id === id)?.name || '—';

  const handleClassSelect = (classId) => {
    const cls = classes.find(c => c.id === classId);
    setForm({ ...form, class_id: classId, branch_id: cls?.branch_id || '' });
  };
  const isSupabaseStudentSource = getReadDataSource('students') === 'supabase';
  const sourceLabel = isSupabaseStudentSource ? 'Loaded from Supabase test data' : 'Demo data';
  const validStudentIds = useMemo(
    () => classStudents.map((student) => student?.id).filter(isUuid),
    [classStudents]
  );
  const isDemoRole = String(user?.role || '').trim().toLowerCase() === 'demorole';
  const shouldReadSupabaseLearningContext = Boolean(user) && isSupabaseStudentSource && !isDemoRole && validStudentIds.length > 0;

  const { data: curriculumProfiles = [] } = useQuery({
    queryKey: ['student-curriculum-profiles', user?.role, user?.branch_id],
    enabled: shouldReadSupabaseLearningContext,
    queryFn: async () => {
      const { data, error } = await listCurriculumProfiles({});
      if (error) return [];
      return Array.isArray(data) ? data : [];
    },
  });

  const curriculumProfileById = useMemo(
    () => new Map(curriculumProfiles.map((profile) => [profile.id, profile])),
    [curriculumProfiles]
  );

  const { data: studentContextById = {} } = useQuery({
    queryKey: ['student-learning-context', validStudentIds.join('|')],
    enabled: shouldReadSupabaseLearningContext,
    queryFn: async () => {
      const entries = await Promise.all(
        validStudentIds.map(async (studentId) => {
          const result = await getStudentLearningContext({ studentId });
          if (result?.error || !result?.data) return [studentId, null];
          return [studentId, result.data];
        })
      );
      return Object.fromEntries(entries);
    },
  });

  const selectedStudentContext = useMemo(() => {
    if (!selectedStudent?.id) return null;
    const context = studentContextById[selectedStudent.id] || null;
    const schoolProfile = context?.student_school_profile || null;
    const goals = Array.isArray(context?.learning_goals) ? context.learning_goals : [];
    return { schoolProfile, goals };
  }, [selectedStudent?.id, studentContextById]);

  const startEditSchoolProfile = (studentId, schoolProfile) => {
    if (!studentId) return;
    setEditingSchoolProfileStudentId(studentId);
    setSchoolProfileFormByStudentId((prev) => ({
      ...prev,
      [studentId]: {
        schoolName: schoolProfile?.school_name || '',
        gradeYear: schoolProfile?.grade_year || '',
        curriculumProfileId: schoolProfile?.curriculum_profile_id || NONE_PROFILE_VALUE,
        parentGoals: schoolProfile?.parent_goals || '',
        teacherNotes: schoolProfile?.teacher_notes || '',
      },
    }));
  };

  const cancelEditSchoolProfile = (studentId) => {
    setEditingSchoolProfileStudentId((prev) => (prev === studentId ? null : prev));
    setSchoolProfileFormByStudentId((prev) => {
      const next = { ...prev };
      delete next[studentId];
      return next;
    });
  };

  const updateSchoolProfileForm = (studentId, patch) => {
    setSchoolProfileFormByStudentId((prev) => ({
      ...prev,
      [studentId]: {
        ...(prev[studentId] || {
          schoolName: '',
          gradeYear: '',
          curriculumProfileId: NONE_PROFILE_VALUE,
          parentGoals: '',
          teacherNotes: '',
        }),
        ...patch,
      },
    }));
  };

  const handleSaveSchoolProfile = async ({ studentId }) => {
    const formState = schoolProfileFormByStudentId[studentId] || {};
    const schoolName = trimToNull(formState.schoolName);
    const gradeYear = trimToNull(formState.gradeYear);
    const parentGoals = trimToNull(formState.parentGoals);
    const teacherNotes = trimToNull(formState.teacherNotes);
    const selectedProfileId = formState.curriculumProfileId;
    const curriculumProfileId =
      selectedProfileId && selectedProfileId !== NONE_PROFILE_VALUE ? selectedProfileId : null;

    if (!isUuid(studentId)) {
      toast.message('Student id is invalid. Please refresh and try again.');
      return;
    }
    if (curriculumProfileId && !isUuid(curriculumProfileId)) {
      toast.message('Curriculum profile selection is invalid.');
      return;
    }

    if (isDemoRole || !isSupabaseStudentSource) {
      toast.message('Demo/local mode keeps school profile changes local and does not write to Supabase.');
      cancelEditSchoolProfile(studentId);
      return;
    }

    setSavingSchoolProfileStudentId(studentId);
    try {
      const result = await upsertStudentSchoolProfile({
        studentId,
        schoolId: null,
        schoolName,
        gradeYear,
        curriculumProfileId,
        parentGoals,
        teacherNotes,
      });

      if (result?.error) {
        toast.error(result.error.message || 'Unable to save school profile.');
        return;
      }
      toast.success('Student school profile saved.');
      cancelEditSchoolProfile(studentId);
      await queryClient.invalidateQueries({ queryKey: ['student-learning-context'] });
    } catch (error) {
      toast.error(error?.message || 'Unable to save school profile.');
    } finally {
      setSavingSchoolProfileStudentId(null);
    }
  };

  return (
    <div>
      <PageHeader
        title={isTeacher ? "My Students" : "Students"}
        description={
          isTeacher
            ? 'Your class list — cards help you scan names; deep edit-from-card is a future step. Demo/local where noted.'
            : 'Student directory — cards preview records; use Add Student or row actions to manage.'
        }
        action={canManageStudents(user) && (
          <Button onClick={() => setDialogOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" /> Add Student
          </Button>
        )}
      />
      <p className="text-xs text-muted-foreground mb-3">{sourceLabel}</p>

      {isLoading ? (
        <Card className="p-5 border-muted/80">
          <p className="text-sm text-muted-foreground">Loading students...</p>
        </Card>
      ) : (studentsError || classesError || homeworkInboxError) ? (
        <Card className="p-5 border-dashed border-amber-200 bg-amber-50/50">
          <p className="text-sm font-medium text-amber-900">We could not load students right now.</p>
          <p className="mt-1 text-xs text-amber-800">
            Please refresh this page. If it continues, contact support with this route: <code>/students</code>.
          </p>
        </Card>
      ) : classStudents.length === 0 ? (
        <EmptyState
          icon={GraduationCap}
          title={isTeacher ? 'No assigned students yet' : 'No students yet'}
          description={isTeacher ? 'Assigned students will appear here for your classes only.' : 'Add students to your classes to get started.'}
        />
      ) : (
        <>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {classStudents.map((student) => (
            <Card key={student.id} className="p-5 border-muted/80">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-10 w-10 rounded-full bg-accent flex items-center justify-center text-accent-foreground font-bold">
                  {String(student.name || student.full_name || '?').charAt(0).toUpperCase() || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold truncate">{student.name || student.full_name || 'Unnamed student'}</h3>
                  <Badge variant="outline" className="text-xs mt-0.5">{getClassName(student.class_id)}</Badge>
                </div>
              </div>
              {student.parent_name && (
                <p className="text-sm text-muted-foreground">Parent: {student.parent_name}</p>
              )}
              <div className="mt-2 space-y-0.5">
                {student.parent_phone && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <Phone className="h-3 w-3" /> {student.parent_phone}
                  </p>
                )}
                {student.parent_email && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <Mail className="h-3 w-3" /> {student.parent_email}
                  </p>
                )}
              </div>
              {feeStatuses[student.id] && (
                <div className="mt-3 rounded-lg border border-dashed border-border bg-muted/30 p-3 text-sm">
                  <p className="font-medium mb-2">Fee Status</p>
                  <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                    <div><span className="block">Current Period</span><span className="text-foreground">{feeStatuses[student.id].fee_period}</span></div>
                    <div><span className="block">Status</span><span className="text-foreground">{feeStatuses[student.id].payment_status}</span></div>
                    <div><span className="block">Due Date</span><span className="text-foreground">{feeStatuses[student.id].due_date}</span></div>
                    <div><span className="block">Last Verified</span><span className="text-foreground">{feeStatuses[student.id].verified_date || '—'}</span></div>
                  </div>
                </div>
              )}
              {isTeacher && feeStatuses[student.id] && ['unpaid', 'overdue', 'pending verification'].includes(feeStatuses[student.id].payment_status) && (
                <div className="mt-3 rounded-lg border border-dashed border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                  Fee follow-up needed.
                </div>
              )}
              <div className="mt-3 flex gap-2 flex-wrap">
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 text-xs"
                  onClick={() => navigate(`/parent-view?student=${student.id}&demoRole=parent`)}
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Preview Parent Dashboard
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 text-xs"
                  onClick={() => navigate(`/parent-view?student=${student.id}&demoRole=student`)}
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Preview Student Portal
                </Button>
                {student.parent_email && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 text-xs"
                    onClick={() => sendReport(student)}
                  >
                    <Send className="h-3.5 w-3.5" />
                    Demo Report Link
                  </Button>
                )}
                <Button
                  size="sm"
                  variant={selectedStudentId === student.id ? "default" : "outline"}
                  className="gap-1.5 text-xs"
                  onClick={() => setSelectedStudentId((prev) => (prev === student.id ? null : student.id))}
                >
                  {selectedStudentId === student.id ? 'Hide profile' : 'Open profile'}
                </Button>
              </div>
              <div className="mt-3 border-t pt-3 space-y-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">School / Learning Context</p>
                {!isSupabaseStudentSource ? (
                  <div className="space-y-1 text-sm">
                    <p className="text-muted-foreground">Demo-only school/learning preview.</p>
                    <p>
                      <span className="text-muted-foreground">School:</span> Demo Learning School
                    </p>
                    <p>
                      <span className="text-muted-foreground">Grade/Year:</span> Demo Year Level
                    </p>
                    <p>
                      <span className="text-muted-foreground">Learning focus:</span> Demo profile context only (no live Supabase read).
                    </p>
                  </div>
                ) : !isUuid(student?.id) ? (
                  <p className="text-sm text-muted-foreground">No school profile added yet.</p>
                ) : (() => {
                  const context = studentContextById[student.id];
                  const schoolProfile = context?.student_school_profile || null;
                  const curriculumProfile = schoolProfile?.curriculum_profile_id
                    ? curriculumProfileById.get(schoolProfile.curriculum_profile_id)
                    : null;
                  const activeStudentGoals = Array.isArray(context?.learning_goals)
                    ? context.learning_goals.filter((goal) => goal?.status === 'active' && goal?.student_id === student.id)
                    : [];
                  const canEditSchoolProfile = canManageStudents(user);
                  const isEditingSchoolProfile = editingSchoolProfileStudentId === student.id;
                  const schoolProfileForm = schoolProfileFormByStudentId[student.id] || {
                    schoolName: schoolProfile?.school_name || '',
                    gradeYear: schoolProfile?.grade_year || '',
                    curriculumProfileId: schoolProfile?.curriculum_profile_id || NONE_PROFILE_VALUE,
                    parentGoals: schoolProfile?.parent_goals || '',
                    teacherNotes: schoolProfile?.teacher_notes || '',
                  };
                  const curriculumProfileOptions = curriculumProfiles
                    .filter((profile) => isUuid(profile?.id))
                    .map((profile) => ({
                      id: profile.id,
                      label: `${profile.name || 'Unnamed profile'}${profile.subject ? ` • ${profile.subject}` : ''}${profile.skill_focus ? ` • ${profile.skill_focus}` : ''}`,
                    }));

                  return (
                    <div className="space-y-1.5 text-sm">
                      {!schoolProfile ? (
                        <p className="text-sm text-muted-foreground">No school profile added yet.</p>
                      ) : (
                        <>
                          <p>
                            <span className="text-muted-foreground">School:</span> {schoolProfile.school_name || '—'}
                          </p>
                          <p>
                            <span className="text-muted-foreground">Grade/Year:</span> {schoolProfile.grade_year || '—'}
                          </p>
                          <p>
                            <span className="text-muted-foreground">Curriculum profile:</span> {curriculumProfile?.name || '—'}
                          </p>
                          <p>
                            <span className="text-muted-foreground">Subject:</span> {curriculumProfile?.subject || '—'}
                          </p>
                          <p>
                            <span className="text-muted-foreground">Level/Year/Grade:</span> {curriculumProfile?.level_year_grade || '—'}
                          </p>
                          <p>
                            <span className="text-muted-foreground">Skill focus:</span> {curriculumProfile?.skill_focus || '—'}
                          </p>
                        </>
                      )}
                      {schoolProfile.parent_goals ? (
                        <p>
                          <span className="text-muted-foreground">Parent goals:</span> {schoolProfile.parent_goals}
                        </p>
                      ) : null}
                      {schoolProfile.teacher_notes ? (
                        <p>
                          <span className="text-muted-foreground">Teacher notes:</span> {schoolProfile.teacher_notes}
                        </p>
                      ) : null}
                      {activeStudentGoals.length > 0 ? (
                        <div className="pt-1">
                          <p className="text-xs text-muted-foreground">Active student goals</p>
                          <ul className="list-disc pl-5 text-sm space-y-0.5">
                            {activeStudentGoals.map((goal) => (
                              <li key={goal.id}>{goal.goal_title || 'Untitled goal'}</li>
                            ))}
                          </ul>
                        </div>
                      ) : null}
                      {canEditSchoolProfile ? (
                        <div className="pt-2 border-t mt-2 space-y-2">
                          {!isEditingSchoolProfile ? (
                            <Button
                              size="sm"
                              variant="outline"
                              className="w-full sm:w-auto"
                              onClick={() => startEditSchoolProfile(student.id, schoolProfile)}
                            >
                              Edit School Profile
                            </Button>
                          ) : (
                            <div className="space-y-3">
                              <div className="space-y-1">
                                <Label className="text-xs">School Name</Label>
                                <Input
                                  value={schoolProfileForm.schoolName}
                                  onChange={(event) => updateSchoolProfileForm(student.id, { schoolName: event.target.value })}
                                  placeholder="e.g. Demo Primary School"
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs">Grade / Year</Label>
                                <Input
                                  value={schoolProfileForm.gradeYear}
                                  onChange={(event) => updateSchoolProfileForm(student.id, { gradeYear: event.target.value })}
                                  placeholder="e.g. Year 4"
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs">Curriculum Profile</Label>
                                <Select
                                  value={schoolProfileForm.curriculumProfileId}
                                  onValueChange={(value) => updateSchoolProfileForm(student.id, { curriculumProfileId: value })}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select curriculum profile" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value={NONE_PROFILE_VALUE}>No curriculum profile</SelectItem>
                                    {curriculumProfileOptions.map((option) => (
                                      <SelectItem key={option.id} value={option.id}>
                                        {option.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs">Parent Goals (supportive)</Label>
                                <textarea
                                  value={schoolProfileForm.parentGoals}
                                  onChange={(event) => updateSchoolProfileForm(student.id, { parentGoals: event.target.value })}
                                  placeholder="Add supportive home learning goals"
                                  className="w-full min-h-[80px] rounded-md border bg-background px-3 py-2 text-sm"
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs">Teacher Notes (internal)</Label>
                                <textarea
                                  value={schoolProfileForm.teacherNotes}
                                  onChange={(event) => updateSchoolProfileForm(student.id, { teacherNotes: event.target.value })}
                                  placeholder="Internal notes for staff context only"
                                  className="w-full min-h-[80px] rounded-md border bg-background px-3 py-2 text-sm"
                                />
                              </div>
                              <div className="flex flex-col sm:flex-row gap-2">
                                <Button
                                  size="sm"
                                  className="w-full sm:w-auto"
                                  disabled={savingSchoolProfileStudentId === student.id}
                                  onClick={() => handleSaveSchoolProfile({ studentId: student.id })}
                                >
                                  {savingSchoolProfileStudentId === student.id ? 'Saving...' : 'Save'}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="w-full sm:w-auto"
                                  disabled={savingSchoolProfileStudentId === student.id}
                                  onClick={() => cancelEditSchoolProfile(student.id)}
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : null}
                    </div>
                  );
                })()}
              </div>
              <StudentHomeworkUploadHistory items={homeworkInboxItems.filter((item) => item.student_id === student.id)} />
              </Card>

          ))}
        </div>
        {selectedStudent ? (
          <Card className="mt-6 p-5 border-primary/20 bg-muted/10">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold">{selectedStudent.name || selectedStudent.full_name || 'Unnamed student'}</h3>
                <p className="text-sm text-muted-foreground">Student profile and learning context (teacher-safe view)</p>
              </div>
              <Badge variant="outline">
                Class: {getClassName(selectedStudent.class_id)}
              </Badge>
            </div>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
              <div className="rounded-md border p-3">
                <p className="text-xs text-muted-foreground">Programme / subject</p>
                <p className="font-medium">{classes.find((c) => c.id === selectedStudent.class_id)?.subject || 'Not set'}</p>
              </div>
              <div className="rounded-md border p-3">
                <p className="text-xs text-muted-foreground">Branch</p>
                <p className="font-medium">{selectedStudent.branch_id || user?.branch_id || 'Not set'}</p>
              </div>
              <div className="rounded-md border p-3">
                <p className="text-xs text-muted-foreground">Attendance records</p>
                <p className="font-medium">{selectedStudentAttendance.length}</p>
              </div>
              <div className="rounded-md border p-3">
                <p className="text-xs text-muted-foreground">Homework uploads</p>
                <p className="font-medium">{selectedStudentHomeworkUploads.length}</p>
              </div>
            </div>

            <div className="mt-4 rounded-md border border-dashed p-3 space-y-1.5">
              <p className="text-sm font-medium">Learning notes</p>
              <p className="text-sm text-muted-foreground">
                Learning notes are internal staff evidence. Parents will not see these notes unless they are later included in an approved report or released parent communication.
              </p>
              {selectedStudentContext?.schoolProfile?.teacher_notes ? (
                <p className="text-xs text-muted-foreground">
                  Latest internal note: {selectedStudentContext.schoolProfile.teacher_notes}
                </p>
              ) : null}
              {selectedStudentContext?.goals?.length ? (
                <p className="text-xs text-muted-foreground">
                  Active learning goals: {selectedStudentContext.goals.filter((goal) => goal?.status === 'active').length}
                </p>
              ) : null}
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <p className="w-full text-xs text-muted-foreground">
                Use the tools below to record evidence through the existing workflows.
              </p>
              <Button size="sm" variant="outline" onClick={() => navigate('/attendance')}>
                View attendance
              </Button>
              <Button size="sm" variant="outline" onClick={() => navigate('/homework')}>
                View homework
              </Button>
              <Button size="sm" variant="outline" onClick={() => navigate('/observations')}>
                Add observation / learning note
              </Button>
              <Button size="sm" variant="outline" onClick={() => navigate('/parent-updates')}>
                Parent communication
              </Button>
            </div>

            <div className="mt-4 rounded-md border border-amber-200 bg-amber-50/50 p-3 text-xs text-amber-900">
              Official profile, class, branch, and guardian links are managed by HQ or Branch Supervisors.
              Teacher view here is read-only for those official profile fields.
            </div>
          </Card>
        ) : null}
        </>
      )}

      {isTeacher && (
        <div className="mt-8">
          <PageHeader
            title="Homework Review Inbox"
            description="Review original uploaded homework attachments and approve teacher feedback using fake demo data only."
          />
          <HomeworkReviewInbox items={homeworkInboxItems} />
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Student</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Student Name *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Full name" />
            </div>
            <div>
              <Label>Class *</Label>
              <Select value={form.class_id} onValueChange={handleClassSelect}>
                <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                <SelectContent>
                  {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Parent / Guardian Name</Label>
              <Input value={form.parent_name} onChange={(e) => setForm({ ...form, parent_name: e.target.value })} placeholder="Parent name" />
            </div>
            <div>
              <Label>Parent Phone</Label>
              <Input value={form.parent_phone} onChange={(e) => setForm({ ...form, parent_phone: e.target.value })} placeholder="Phone number" />
            </div>
            <div>
              <Label>Parent Email</Label>
              <Input value={form.parent_email} onChange={(e) => setForm({ ...form, parent_email: e.target.value })} placeholder="Email" type="email" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => createMutation.mutate(form)} disabled={!form.name || !form.class_id || createMutation.isPending || !canManageStudents(user)}>
              {createMutation.isPending ? 'Adding...' : 'Add Student'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function Students() {
  return (
    <StudentsErrorBoundary>
      <StudentsPage />
    </StudentsErrorBoundary>
  );
}