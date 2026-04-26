import React from 'react';
import { useOutletContext } from 'react-router-dom';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText } from 'lucide-react';

function SummarySection({ title, items, badge }) {
  return (
    <Card className="p-6">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h3 className="font-semibold">{title}</h3>
        {badge && <Badge variant="outline">{badge}</Badge>}
      </div>
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item} className="rounded-lg border border-border bg-accent/20 px-3 py-2 text-sm">
            {item}
          </div>
        ))}
      </div>
    </Card>
  );
}

export default function PrototypeSummary() {
  const { user } = useOutletContext();
  const role = user?.role;
  const canAccess = role === 'hq_admin' || role === 'branch_supervisor';

  if (!canAccess) {
    return (
      <EmptyState
        icon={FileText}
        title="Access restricted"
        description="This page is not available for the current demo role."
      />
    );
  }

  return (
    <div>
      <PageHeader
        title="GitHub Export Notes"
        description="Founder-friendly README-style documentation for reviewing this prototype before GitHub export."
      />

      <Card className="p-6 mb-6 bg-accent/20 border-dashed">
        <h3 className="font-semibold mb-3">1. Project Name</h3>
        <p className="text-sm text-muted-foreground">EduCentre / Enrichify Prototype</p>
      </Card>

      <Card className="p-6 mb-6">
        <h3 className="font-semibold mb-3">2. Purpose</h3>
        <p className="text-sm text-muted-foreground">AI-assisted enrichment centre operations and learning support platform.</p>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
        <SummarySection
          title="3. Prototype Status"
          badge="Important"
          items={[
            'This is a Base44 prototype using fake demo data only.',
            'It is not production-ready.',
          ]}
        />

        <SummarySection
          title="5. User Roles"
          badge="Current roles"
          items={[
            'HQ Admin',
            'Branch Supervisor',
            'Teacher',
            'Parent',
            'Student',
          ]}
        />
      </div>

      <SummarySection
        title="4. Current MVP Modules"
        badge="Prototype scope"
        items={[
          'role-based dashboards',
          'branch/class/student/teacher management',
          'attendance tracking',
          'homework tracking',
          'class session workflow',
          'parent updates / reports',
          'parent dashboard',
          'student learning portal',
          'teacher task notifications',
          'teacher KPI',
          'observations',
          'trial scheduling',
          'branch performance',
          'fee tracking',
          'leads/enrolment',
          'future AI engine roadmap',
          'migration audit',
          'prototype summary',
        ]}
      />

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 my-6">
        <SummarySection
          title="6. Demo Data"
          badge="Fake data only"
          items={[
            'Fake demo data is mainly stored in services/dataService.js.',
            'No real student, parent, fee, or payment data should be used.',
          ]}
        />

        <SummarySection
          title="7. Base44 Dependencies"
          badge="Still active"
          items={[
            'auth/session',
            'entities/live data',
            'backend functions',
            'file upload',
            'invite user flow',
            'email/report sending',
          ]}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
        <SummarySection
          title="8. Export Notes"
          badge="GitHub review"
          items={[
            'src/ should be exported fully',
            'functions/ and entities/ should be included for review',
            'App.jsx, main.jsx, index.css, index.html, tailwind.config.js, package.json should be included',
            'Exported code is for review, not standalone production use yet',
          ]}
        />

        <SummarySection
          title="9. What Will Not Work Outside Base44 Yet"
          badge="Known gaps"
          items={[
            'login/session',
            'live data',
            'backend functions',
            'invite flow',
            'email/report sending',
            'real file upload',
            'production parent links',
          ]}
        />
      </div>

      <SummarySection
        title="10. Future Supabase Migration"
        badge="Planned later"
        items={[
          'profiles/users',
          'branches',
          'classes',
          'students',
          'guardians_parents',
          'guardian_student_links',
          'teachers',
          'teacher_class_assignments',
          'attendance_records',
          'homework_records',
          'homework_attachments',
          'teacher_notes',
          'parent_reports',
          'leads',
          'trial_schedules',
          'teacher_tasks',
          'observations',
          'fee_records',
        ]}
      />

      <Card className="p-6 mt-6 border-dashed bg-accent/20">
        <h3 className="font-semibold mb-3">11. Production Warning</h3>
        <div className="space-y-3 text-sm text-muted-foreground">
          <p>Do not use real student, parent, child, fee, payment, or school data yet.</p>
          <p>Wait until Supabase/GitHub ownership is ready.</p>
          <p>Wait until database backup is ready.</p>
          <p>Wait until role-based access and RLS are implemented.</p>
          <p>Wait until privacy and security review is completed.</p>
        </div>
      </Card>
    </div>
  );
}