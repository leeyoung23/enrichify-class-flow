import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listClasses, listBranches, listStaff, createClass, getReadDataSource } from '@/services/dataService';
import { canManageClasses, isTeacherRole } from '@/services/permissionService';
import { BookOpen, Plus, Clock, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';

export default function Classes() {
  const { user } = useOutletContext();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ name: '', branch_id: '', subject: '', teacher_email: '', schedule: '' });
  const queryClient = useQueryClient();
  const isAdmin = canManageClasses(user);
  const isTeacher = isTeacherRole(user);

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
  const sourceLabel = getReadDataSource('classes') === 'supabase' ? 'Loaded from Supabase test data' : 'Demo data';

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