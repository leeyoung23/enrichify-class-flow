import React, { useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ClipboardPen, Plus } from 'lucide-react';
import PageHeader from '@/components/shared/PageHeader';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import ObservationList from '@/components/observations/ObservationList';
import ObservationForm from '@/components/observations/ObservationForm';
import EmptyState from '@/components/shared/EmptyState';
import { listObservations, listBranches, listClasses, listStaff } from '@/services/dataService';

const EMPTY_FORM = {
  observation_date: '2026-04-25',
  branch_id: '',
  class_id: '',
  teacher_email: '',
  classroom_management_score: '4',
  teaching_delivery_score: '4',
  student_engagement_score: '4',
  lesson_preparation_score: '4',
  parent_communication_score: '4',
  strengths_observed: '',
  areas_for_improvement: '',
  follow_up_action: '',
  follow_up_due_date: '2026-05-02',
  status: 'draft',
};

export default function Observations() {
  const { user } = useOutletContext();
  const canCreate = user?.role === 'hq_admin' || user?.role === 'branch_supervisor';
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const { data: observations = [] } = useQuery({
    queryKey: ['observations', user?.role, user?.branch_id, user?.email],
    queryFn: () => listObservations(user),
    enabled: !!user,
  });

  const { data: branches = [] } = useQuery({
    queryKey: ['observation-branches', user?.role, user?.branch_id],
    queryFn: () => listBranches(user),
    enabled: !!user && canCreate,
  });

  const { data: classes = [] } = useQuery({
    queryKey: ['observation-classes', user?.role, user?.email],
    queryFn: () => listClasses(user),
    enabled: !!user && canCreate,
  });

  const { data: staff = [] } = useQuery({
    queryKey: ['observation-staff', user?.role, user?.email],
    queryFn: () => listStaff(user),
    enabled: !!user && canCreate,
  });

  const teachers = useMemo(() => staff.filter((item) => item.role === 'teacher' || item.email?.includes('teacher')), [staff]);

  return (
    <div>
      <PageHeader
        title="Observations"
        description={user?.role === 'teacher' ? 'See completed observation feedback about your teaching only using demo data only.' : 'Record and review teaching quality observations using demo data only.'}
        action={canCreate ? <Button onClick={() => setOpen(true)} className="gap-2"><Plus className="h-4 w-4" /> Create Observation</Button> : null}
      />
      <Card className="mb-6 border-dashed border-primary/30 bg-muted/15 p-4 text-sm text-muted-foreground">
        <p className="font-medium text-foreground mb-1">Monthly Learning Observation (roadmap)</p>
        <p>
          Structured <span className="text-foreground">per-student monthly</span> observations — rating (1–5) plus an{' '}
          <span className="text-foreground">evidence-based observation</span> and a <span className="text-foreground">next action</span> — are planned as internal staff evidence for AI-assisted monthly reports.
          Teachers complete a <span className="text-foreground">small weekly batch</span> (e.g. ~5 students/week for a class of 20) so monthly reports have meaningful teacher evidence.
        </p>
        <p className="mt-2">
          <span className="text-foreground font-medium">Observation</span> = staff evidence input.{' '}
          <span className="text-foreground font-medium">Teacher Feedback</span> = parent-facing report wording after staff review and release.
          Parents will only see approved Teacher Feedback in released reports — not raw staff observations.
          This page currently focuses on <span className="text-foreground">classroom teaching-quality</span> observations (demo workflow).
        </p>
      </Card>
      {observations.length === 0 ? (
        <EmptyState
          icon={ClipboardPen}
          title="No observations yet"
          description="Create the first classroom observation to start tracking teaching quality."
          action={canCreate ? <Button onClick={() => setOpen(true)} className="gap-2"><Plus className="h-4 w-4" /> Create Observation</Button> : null}
        />
      ) : (
        <ObservationList observations={observations} />
      )}
      <ObservationForm
        open={open}
        onOpenChange={setOpen}
        form={form}
        onChange={(key, value) => setForm((prev) => ({ ...prev, [key]: value }))}
        onSubmit={() => setOpen(false)}
        branches={branches}
        classes={classes}
        teachers={teachers}
        observerName={user?.full_name || 'Observer'}
      />
    </div>
  );
}