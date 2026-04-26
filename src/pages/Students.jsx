import React, { useEffect, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listStudents, listClasses, createStudent, invokeParentReport, getStudentFeeStatus, listHomeworkAttachments } from '@/services/dataService';
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

export default function Students() {
  const { user } = useOutletContext();
  const navigate = useNavigate();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(initialForm);
  const queryClient = useQueryClient();
  const isTeacher = isTeacherRole(user);

  const { data: students = [], isLoading } = useQuery({
    queryKey: ['students', user?.role, user?.email],
    queryFn: () => listStudents(user),
    enabled: !!user,
  });

  const { data: classes = [] } = useQuery({
    queryKey: ['all-classes', user?.role, user?.email],
    queryFn: () => listClasses(user),
    enabled: !!user,
  });

  const { data: homeworkInboxItems = [] } = useQuery({
    queryKey: ['homework-attachments', user?.role, user?.email],
    queryFn: () => listHomeworkAttachments(user),
    enabled: !!user,
  });

  const createMutation = useMutation({
    mutationFn: (data) => createStudent(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      setDialogOpen(false);
      setForm(initialForm);
    },
  });

  const classStudents = isTeacher
    ? students.filter(s => classes.some(c => c.id === s.class_id))
    : students;

  const [feeStatuses, setFeeStatuses] = useState({});

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

  return (
    <div>
      <PageHeader
        title={isTeacher ? "My Students" : "Students"}
        description={isTeacher ? 'See your assigned students only using demo data only.' : 'Manage student records.'}
        action={canManageStudents(user) && (
          <Button onClick={() => setDialogOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" /> Add Student
          </Button>
        )}
      />

      {classStudents.length === 0 && !isLoading ? (
        <EmptyState
          icon={GraduationCap}
          title={isTeacher ? 'No assigned students yet' : 'No students yet'}
          description={isTeacher ? 'Assigned students will appear here for your classes only.' : 'Add students to your classes to get started.'}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {classStudents.map((student) => (
            <Card key={student.id} className="p-5 hover:shadow-lg transition-shadow duration-300">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-10 w-10 rounded-full bg-accent flex items-center justify-center text-accent-foreground font-bold">
                  {student.name[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold truncate">{student.name}</h3>
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
              </div>
              <StudentHomeworkUploadHistory items={homeworkInboxItems.filter((item) => item.student_id === student.id)} />
              </Card>

          ))}
        </div>
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