import React, { useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listClasses, listBranches, listStaff, createClass, getReadDataSource } from '@/services/dataService';
import { getClassLearningContext, listCurriculumProfiles } from '@/services/supabaseReadService';
import { assignCurriculumToClass, updateClassCurriculumAssignment } from '@/services/supabaseWriteService';
import { canManageClasses, isTeacherRole, getRole, ROLES } from '@/services/permissionService';
import { BookOpen, Plus, Clock, User } from 'lucide-react';
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

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUuid = (value) => typeof value === 'string' && UUID_REGEX.test(value.trim());
const trimToNull = (value) => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed || null;
};

const DEMO_CURRICULUM_OPTIONS = [
  {
    id: '11111111-1111-4111-8111-111111111111',
    name: 'Demo Literacy Profile',
    subject: 'English',
    level_year_grade: 'Year 4',
  },
  {
    id: '22222222-2222-4222-8222-222222222222',
    name: 'Demo Numeracy Profile',
    subject: 'Mathematics',
    level_year_grade: 'Year 4',
  },
];

export default function Classes() {
  const { user } = useOutletContext();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ name: '', branch_id: '', subject: '', teacher_email: '', schedule: '' });
  const [editingCurriculumClassId, setEditingCurriculumClassId] = useState(null);
  const [curriculumFormByClassId, setCurriculumFormByClassId] = useState({});
  const [savingCurriculumClassId, setSavingCurriculumClassId] = useState(null);
  const queryClient = useQueryClient();
  const isAdmin = canManageClasses(user);
  const isTeacher = isTeacherRole(user);
  const role = getRole(user);
  const canManageClassCurriculum = role === ROLES.HQ_ADMIN || role === ROLES.BRANCH_SUPERVISOR;

  const { data: classes = [], isLoading } = useQuery({
    queryKey: ['classes', user?.role, user?.email],
    queryFn: () => listClasses(user),
    enabled: !!user,
  });

  const { data: branches = [] } = useQuery({
    queryKey: ['branches', user?.role, user?.branch_id],
    queryFn: () => listBranches(user),
    enabled: !!user,
  });

  const { data: teachers = [] } = useQuery({
    queryKey: ['staff-users', user?.role, user?.branch_id],
    queryFn: () => listStaff(user),
    enabled: !!user && isAdmin,
  });

  const createMutation = useMutation({
    mutationFn: (data) => createClass(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classes'] });
      setDialogOpen(false);
      setForm({ name: '', branch_id: '', subject: '', teacher_email: '', schedule: '' });
    },
  });

  const getBranchName = (id) => branches.find(b => b.id === id)?.name || '—';
  const isSupabaseClassSource = getReadDataSource('classes') === 'supabase';
  const sourceLabel = isSupabaseClassSource ? 'Loaded from Supabase test data' : 'Demo data';
  const validClassIds = useMemo(
    () => classes.map((cls) => cls?.id).filter(isUuid),
    [classes]
  );
  const isDemoRole = !isSupabaseClassSource || String(user?.role || '').trim().toLowerCase() === 'demorole';
  const shouldReadSupabaseCurriculum = Boolean(user) && isSupabaseClassSource && !isDemoRole && validClassIds.length > 0;

  const { data: curriculumProfiles = [] } = useQuery({
    queryKey: ['curriculum-profiles', user?.role, user?.branch_id],
    enabled: shouldReadSupabaseCurriculum,
    queryFn: async () => {
      const { data, error } = await listCurriculumProfiles({});
      if (error) return [];
      return Array.isArray(data) ? data : [];
    },
  });
  const availableCurriculumProfiles = shouldReadSupabaseCurriculum ? curriculumProfiles : DEMO_CURRICULUM_OPTIONS;

  const profileMap = useMemo(
    () => new Map(availableCurriculumProfiles.map((profile) => [profile.id, profile])),
    [availableCurriculumProfiles]
  );

  const { data: classContextById = {} } = useQuery({
    queryKey: ['class-curriculum-context', validClassIds.join('|')],
    enabled: shouldReadSupabaseCurriculum,
    queryFn: async () => {
      const entries = await Promise.all(
        validClassIds.map(async (classId) => {
          const result = await getClassLearningContext({ classId });
          if (result?.error || !result?.data) return [classId, null];
          return [classId, result.data];
        })
      );
      return Object.fromEntries(entries);
    },
  });

  const startEditCurriculum = (classId, assignment) => {
    if (!classId) return;
    setEditingCurriculumClassId(classId);
    setCurriculumFormByClassId((prev) => ({
      ...prev,
      [classId]: {
        curriculumProfileId: assignment?.curriculum_profile_id || '',
        learningFocus: assignment?.learning_focus || '',
        termLabel: assignment?.term_label || '',
        startDate: assignment?.start_date || '',
        endDate: assignment?.end_date || '',
      },
    }));
  };

  const cancelEditCurriculum = (classId) => {
    setEditingCurriculumClassId((prev) => (prev === classId ? null : prev));
    setCurriculumFormByClassId((prev) => {
      const next = { ...prev };
      delete next[classId];
      return next;
    });
  };

  const updateCurriculumForm = (classId, patch) => {
    setCurriculumFormByClassId((prev) => ({
      ...prev,
      [classId]: {
        ...(prev[classId] || {
          curriculumProfileId: '',
          learningFocus: '',
          termLabel: '',
          startDate: '',
          endDate: '',
        }),
        ...patch,
      },
    }));
  };

  const handleSaveCurriculum = async ({ classId, assignment }) => {
    const formState = curriculumFormByClassId[classId] || {};
    const curriculumProfileId = formState.curriculumProfileId;
    const startDate = trimToNull(formState.startDate);
    const endDate = trimToNull(formState.endDate);
    const learningFocus = trimToNull(formState.learningFocus);
    const termLabel = trimToNull(formState.termLabel);

    if (!isUuid(classId)) {
      toast.message('Class id is invalid. Please refresh and try again.');
      return;
    }
    if (!isUuid(curriculumProfileId)) {
      toast.message('Please select a curriculum profile.');
      return;
    }
    if (startDate && endDate && startDate > endDate) {
      toast.message('End date cannot be before start date.');
      return;
    }

    if (isDemoRole) {
      toast.message('Demo/local mode keeps curriculum assignment changes local and does not write to Supabase.');
      cancelEditCurriculum(classId);
      return;
    }

    setSavingCurriculumClassId(classId);
    try {
      const profileChanged = assignment?.curriculum_profile_id !== curriculumProfileId;
      let result;
      if (assignment?.id && !profileChanged) {
        result = await updateClassCurriculumAssignment({
          assignmentId: assignment.id,
          learningFocus,
          termLabel,
          startDate,
          endDate,
        });
      } else {
        result = await assignCurriculumToClass({
          classId,
          curriculumProfileId,
          learningFocus,
          termLabel,
          startDate,
          endDate,
        });
      }

      if (result?.error) {
        toast.error(result.error.message || 'Unable to save class curriculum assignment.');
        return;
      }
      toast.success('Class curriculum assignment saved.');
      cancelEditCurriculum(classId);
      await queryClient.invalidateQueries({ queryKey: ['class-curriculum-context'] });
    } catch (error) {
      toast.error(error?.message || 'Unable to save class curriculum assignment.');
    } finally {
      setSavingCurriculumClassId(null);
    }
  };

  return (
    <div>
      <PageHeader
        title={isTeacher ? "My Classes" : "Classes"}
        description={isTeacher ? 'See your assigned classes only using demo data only.' : 'Manage classes and assignments.'}
        action={isAdmin && (
          <Button onClick={() => setDialogOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" /> Add Class
          </Button>
        )}
      />
      <p className="text-xs text-muted-foreground mb-3">{sourceLabel}</p>

      {classes.length === 0 && !isLoading ? (
        <EmptyState
          icon={BookOpen}
          title="No classes yet"
          description={isAdmin ? "Create your first class." : "No classes assigned to you yet."}
          action={isAdmin && (
            <Button onClick={() => setDialogOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" /> Add Class
            </Button>
          )}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {classes.map((cls) => (
            <Card key={cls.id} className="p-5 hover:shadow-lg transition-shadow duration-300">
              <div className="flex items-start justify-between mb-3">
                <div className="p-2 rounded-xl bg-accent">
                  <BookOpen className="h-5 w-5 text-accent-foreground" />
                </div>
                <Badge variant="outline">{getBranchName(cls.branch_id)}</Badge>
              </div>
              <h3 className="font-semibold text-lg">{cls.name}</h3>
              {cls.subject && <p className="text-sm text-muted-foreground mt-1">{cls.subject}</p>}
              <div className="mt-3 space-y-1">
                {cls.teacher_email && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <User className="h-3 w-3" /> {cls.teacher_email}
                  </p>
                )}
                {cls.schedule && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <Clock className="h-3 w-3" /> {cls.schedule}
                  </p>
                )}
              </div>
              <div className="mt-4 border-t pt-3 space-y-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Curriculum Context</p>
                {!isSupabaseClassSource ? (
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Demo-only curriculum preview.</p>
                    <p className="text-sm">
                      <span className="text-muted-foreground">Profile:</span>{' '}
                      {cls.subject ? `Demo ${cls.subject} Foundations` : 'Demo Curriculum Foundations'}
                    </p>
                    <p className="text-sm">
                      <span className="text-muted-foreground">Learning focus:</span>{' '}
                      {cls.level ? `${cls.level} core skill reinforcement` : 'No curriculum profile assigned yet.'}
                    </p>
                  </div>
                ) : !isUuid(cls?.id) ? (
                  <p className="text-sm text-muted-foreground">No curriculum profile assigned yet.</p>
                ) : (() => {
                  const context = classContextById[cls.id];
                  const assignment = Array.isArray(context?.class_curriculum_assignments)
                    ? context.class_curriculum_assignments[0]
                    : null;
                  const profile = assignment?.curriculum_profile_id ? profileMap.get(assignment.curriculum_profile_id) : null;
                  const activeClassGoals = Array.isArray(context?.learning_goals)
                    ? context.learning_goals.filter((goal) => goal?.status === 'active' && !goal?.student_id)
                    : [];
                  const isEditingCurriculum = editingCurriculumClassId === cls.id;
                  const classCurriculumForm = curriculumFormByClassId[cls.id] || {
                    curriculumProfileId: assignment?.curriculum_profile_id || '',
                    learningFocus: assignment?.learning_focus || '',
                    termLabel: assignment?.term_label || '',
                    startDate: assignment?.start_date || '',
                    endDate: assignment?.end_date || '',
                  };
                  const profileOptions = availableCurriculumProfiles
                    .filter((candidate) => (isUuid(candidate?.id) ? true : false))
                    .map((candidate) => ({
                      id: candidate.id,
                      label: `${candidate.name || 'Unnamed profile'}${candidate.subject ? ` • ${candidate.subject}` : ''}${candidate.level_year_grade ? ` • ${candidate.level_year_grade}` : ''}`,
                    }));

                  return (
                    <div className="space-y-1.5">
                      {!assignment || !profile ? (
                        <p className="text-sm text-muted-foreground">No curriculum profile assigned yet.</p>
                      ) : (
                        <>
                          <p className="text-sm">
                            <span className="text-muted-foreground">Profile:</span> {profile.name || '—'}
                          </p>
                          <p className="text-sm">
                            <span className="text-muted-foreground">Subject:</span> {profile.subject || '—'}
                          </p>
                          <p className="text-sm">
                            <span className="text-muted-foreground">Level/Year/Grade:</span> {profile.level_year_grade || '—'}
                          </p>
                          <p className="text-sm">
                            <span className="text-muted-foreground">Skill focus:</span> {profile.skill_focus || '—'}
                          </p>
                          {profile.assessment_style ? (
                            <p className="text-sm">
                              <span className="text-muted-foreground">Assessment style:</span> {profile.assessment_style}
                            </p>
                          ) : null}
                        </>
                      )}
                      {assignment?.learning_focus ? (
                        <p className="text-sm">
                          <span className="text-muted-foreground">Class learning focus:</span> {assignment.learning_focus}
                        </p>
                      ) : null}
                      {activeClassGoals.length > 0 ? (
                        <div className="pt-1">
                          <p className="text-xs text-muted-foreground">Active class goals</p>
                          <ul className="list-disc pl-5 text-sm space-y-0.5">
                            {activeClassGoals.map((goal) => (
                              <li key={goal.id}>{goal.goal_title || 'Untitled goal'}</li>
                            ))}
                          </ul>
                        </div>
                      ) : null}
                      {canManageClassCurriculum ? (
                        <div className="pt-2 border-t mt-2 space-y-2">
                          {!isEditingCurriculum ? (
                            <Button
                              size="sm"
                              variant="outline"
                              className="w-full sm:w-auto"
                              onClick={() => startEditCurriculum(cls.id, assignment)}
                            >
                              {assignment ? 'Edit Curriculum' : 'Assign Curriculum'}
                            </Button>
                          ) : (
                            <div className="space-y-3">
                              <div className="space-y-1">
                                <Label className="text-xs">Curriculum Profile</Label>
                                <Select
                                  value={classCurriculumForm.curriculumProfileId}
                                  onValueChange={(value) => updateCurriculumForm(cls.id, { curriculumProfileId: value })}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select curriculum profile" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {profileOptions.map((option) => (
                                      <SelectItem key={option.id} value={option.id}>
                                        {option.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs">Learning Focus (optional)</Label>
                                <textarea
                                  value={classCurriculumForm.learningFocus}
                                  onChange={(event) => updateCurriculumForm(cls.id, { learningFocus: event.target.value })}
                                  placeholder="Add a concise class learning focus"
                                  className="w-full min-h-[80px] rounded-md border bg-background px-3 py-2 text-sm"
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs">Term Label (optional)</Label>
                                <Input
                                  value={classCurriculumForm.termLabel}
                                  onChange={(event) => updateCurriculumForm(cls.id, { termLabel: event.target.value })}
                                  placeholder="e.g. Term 2"
                                />
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <div className="space-y-1">
                                  <Label className="text-xs">Start Date (optional)</Label>
                                  <Input
                                    type="date"
                                    value={classCurriculumForm.startDate}
                                    onChange={(event) => updateCurriculumForm(cls.id, { startDate: event.target.value })}
                                  />
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs">End Date (optional)</Label>
                                  <Input
                                    type="date"
                                    value={classCurriculumForm.endDate}
                                    onChange={(event) => updateCurriculumForm(cls.id, { endDate: event.target.value })}
                                  />
                                </div>
                              </div>
                              <div className="flex flex-col sm:flex-row gap-2">
                                <Button
                                  size="sm"
                                  className="w-full sm:w-auto"
                                  disabled={savingCurriculumClassId === cls.id}
                                  onClick={() => handleSaveCurriculum({ classId: cls.id, assignment })}
                                >
                                  {savingCurriculumClassId === cls.id ? 'Saving...' : 'Save'}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="w-full sm:w-auto"
                                  disabled={savingCurriculumClassId === cls.id}
                                  onClick={() => cancelEditCurriculum(cls.id)}
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
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Class</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Class Name *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. English Level 3" />
            </div>
            <div>
              <Label>Branch *</Label>
              <Select value={form.branch_id} onValueChange={(v) => setForm({ ...form, branch_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select branch" /></SelectTrigger>
                <SelectContent>
                  {branches.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Subject</Label>
              <Input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="e.g. Mathematics" />
            </div>
            <div>
              <Label>Teacher</Label>
              <Select value={form.teacher_email} onValueChange={(v) => setForm({ ...form, teacher_email: v })}>
                <SelectTrigger><SelectValue placeholder="Assign a teacher" /></SelectTrigger>
                <SelectContent>
                  {teachers.map(t => <SelectItem key={t.id} value={t.email}>{t.full_name} ({t.email})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Schedule</Label>
              <Input value={form.schedule} onChange={(e) => setForm({ ...form, schedule: e.target.value })} placeholder="e.g. Mon/Wed 3-4pm" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => createMutation.mutate(form)} disabled={!form.name || !form.branch_id || createMutation.isPending}>
              {createMutation.isPending ? 'Creating...' : 'Create Class'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}