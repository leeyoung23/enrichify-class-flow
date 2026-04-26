import React from 'react';
import { useOutletContext } from 'react-router-dom';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FolderGit2 } from 'lucide-react';

function AuditSection({ title, children }) {
  return (
    <Card className="p-6">
      <h3 className="font-semibold mb-4">{title}</h3>
      <div className="space-y-3 text-sm text-muted-foreground">{children}</div>
    </Card>
  );
}

function ScoreCard({ module, score, notes }) {
  const tone = {
    easy: 'bg-green-100 text-green-700 border-green-200',
    medium: 'bg-amber-100 text-amber-700 border-amber-200',
    hard: 'bg-red-100 text-red-700 border-red-200',
  };

  return (
    <div className="rounded-xl border border-border p-4 bg-background">
      <div className="flex items-center justify-between gap-3 mb-2">
        <h4 className="font-medium text-foreground">{module}</h4>
        <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${tone[score]}`}>
          {score} to migrate
        </span>
      </div>
      <p className="text-sm text-muted-foreground">{notes}</p>
    </div>
  );
}

export default function MigrationOwnershipAudit() {
  const { user } = useOutletContext();
  const role = user?.role;
  const canAccess = role === 'hq_admin' || role === 'branch_supervisor';
  const migrationScores = [
    { module: 'Dashboards', score: 'easy', notes: 'Mostly frontend presentation and aggregation logic, with migration focused on replacing data/auth sources behind the service layer.' },
    { module: 'Students', score: 'medium', notes: 'Data model migration is straightforward, but user-role filtering and parent/student access rules must be recreated carefully.' },
    { module: 'Classes', score: 'easy', notes: 'Simple relational data and standard CRUD patterns make this relatively portable.' },
    { module: 'Teachers', score: 'medium', notes: 'Teacher records and role mapping can move, but auth-linked user management needs careful redesign.' },
    { module: 'Attendance', score: 'easy', notes: 'Structured session records are well suited to Supabase tables with minimal workflow change.' },
    { module: 'Homework', score: 'medium', notes: 'Current workflow is portable, but future file uploads should target Supabase Storage instead of platform-specific patterns.' },
    { module: 'Parent Reports', score: 'medium', notes: 'Workflow logic is transferable, but Base44 functions and auth-dependent sharing flows would need replacement.' },
    { module: 'Teacher KPI', score: 'medium', notes: 'UI is portable, but KPI calculations depend on current service-layer data shaping and role-aware filtering.' },
    { module: 'Observation', score: 'easy', notes: 'Form and records model are straightforward, assuming equivalent access-control rules are rebuilt.' },
    { module: 'Parent Dashboard', score: 'medium', notes: 'Frontend is portable, but secure child-linked access and approved-only visibility must be rebuilt on Supabase Auth/Postgres policies.' },
    { module: 'Student Portal', score: 'medium', notes: 'Mostly presentation and filtered data, but student identity and scoped access rules are the key migration concern.' },
    { module: 'Future AI Learning Engine', score: 'hard', notes: 'Still conceptual, with future OCR, AI workflows, storage, diagnosis, and orchestration needing a full target architecture before implementation.' },
  ];

  const tableMappings = [
    ['Branch', 'branches', 'Core branch records with branch name, address, status, and ownership fields.'],
    ['Class', 'classes', 'Class records linked to branches and teachers.'],
    ['Student', 'students', 'Student records linked to class_id and branch_id.'],
    ['User', 'users / profiles', 'Auth user plus profile/role table for branch assignment and permissions.'],
    ['Attendance', 'attendance_records', 'Per-student attendance and homework completion by class/date.'],
    ['Homework', 'homework_records', 'Dedicated homework tracking table if homework moves beyond attendance flags.'],
    ['ParentUpdate', 'parent_reports', 'Teacher note, AI draft, edited report, approved report, shared report, and status trail.'],
    ['Teacher KPI', 'calculated view', 'Calculated from attendance, homework, report, and teacher task tables rather than stored as a main table.'],
    ['Observation', 'observations', 'Teaching observation records with scores, notes, and follow-up actions.'],
    ['Branch Performance', 'calculated branch metrics', 'Calculated from branch-level operational tables rather than stored as a standalone primary table.'],
  ];

  const rlsPolicies = [
    'HQ Admin can read and manage all records across all branches.',
    'Branch Supervisor should only see records where branch_id matches their own branch.',
    'Teacher should only see classes they are assigned to, and only the students, attendance, reports, and observations connected to those classes.',
    'Parent should only see records for their linked child through a guardian_student_links relationship.',
    'Student should only see their own records and approved student-facing information.',
  ];

  const backupChecklist = [
    'Export the source code to GitHub.',
    'Download a ZIP backup of the project.',
    'Export Base44 data as CSV where possible.',
    'Document fake demo data separately from any future real data.',
    'Do not store real child data before the migration plan is confirmed.',
  ];

  const lockInRisks = [
    'Auth flow becomes harder to replace later if too much user logic depends on Base44 auth behavior.',
    'Entity structure becomes harder to move if tables and relationships are not documented early.',
    'Report sending functions can become sticky if workflow logic depends on Base44-only backend patterns.',
    'User invite system may need a full redesign when moving to owned auth and onboarding.',
    'File uploads may require rework if future storage standards are not planned now.',
    'Parent access links and child-linked visibility rules are sensitive and should not remain platform-specific for production.',
  ];

  const migrationTests = [
    'Can the app source run cleanly from GitHub?',
    'Can fake demo data be exported safely?',
    'Can the current schema be recreated in Supabase?',
    'Can role permissions be recreated with Supabase RLS?',
    'Can parent dashboard access be recreated securely?',
    'Can the parent report workflow be recreated without changing operations?',
  ];

  if (!canAccess) {
    return (
      <EmptyState
        icon={FolderGit2}
        title="Access restricted"
        description="This page is not available for the current demo role."
      />
    );
  }

  return (
    <div>
      <PageHeader
        title="Migration & Ownership Audit"
        description="Documentation-only audit of current Base44 dependencies, future migration targets, and ownership readiness."
      />

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
        <AuditSection title="1. Current Architecture">
          <p><strong className="text-foreground">Frontend:</strong> React + Tailwind UI pages and components render the application experience.</p>
          <p><strong className="text-foreground">Backend/Auth/Data/Functions:</strong> Base44 currently provides authentication, entity-backed data storage, backend functions, and platform wiring.</p>
          <p><strong className="text-foreground">Service Layer:</strong> The app already uses a service layer to fetch, filter, shape, and summarize data before pages consume it.</p>
          <p><strong className="text-foreground">Fake Demo Data:</strong> Demo and prototype records are currently kept in the service layer as separate fake data structures for safe prototyping.</p>
        </AuditSection>

        <AuditSection title="2. Base44 Dependencies">
          <p><strong className="text-foreground">Base44 Auth:</strong> App sign-in, current-user lookup, and protected role-based access currently depend on Base44 auth handling.</p>
          <p><strong className="text-foreground">Base44 Entities:</strong> Production data storage for branches, classes, students, attendance, parent updates, and other live records depends on Base44 entities.</p>
          <p><strong className="text-foreground">Base44 Functions:</strong> Backend-triggered logic such as report sending and any future server workflows currently assume Base44 function infrastructure.</p>
          <p><strong className="text-foreground">Base44 User/Invite System:</strong> User invitation and role-linked user management currently depend on the Base44 user/invite flow.</p>
        </AuditSection>
      </div>

      <AuditSection title="3. Migration Target">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {[
            'GitHub for code ownership and version control',
            'Supabase Auth for login and session management',
            'Supabase Postgres for core application database',
            'Supabase Storage for homework uploads and future scan files',
            'Supabase Edge Functions for report sending and future AI workflows if needed',
            'Optional Vercel for frontend hosting',
          ].map((item) => (
            <div key={item} className="rounded-lg border border-border bg-accent/20 px-3 py-2 text-sm text-foreground">
              {item}
            </div>
          ))}
        </div>
      </AuditSection>

      <div className="my-6">
        <Card className="p-6">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h3 className="font-semibold">4. Migration Readiness Score</h3>
            <Badge variant="outline">Planning view</Badge>
          </div>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {migrationScores.map((item) => (
              <ScoreCard key={item.module} module={item.module} score={item.score} notes={item.notes} />
            ))}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
        <AuditSection title="5. Supabase Table Mapping">
          <div className="space-y-3">
            {tableMappings.map(([current, future, notes]) => (
              <div key={current} className="rounded-xl border border-border bg-background p-4">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <strong className="text-foreground">{current}</strong>
                  <span className="text-muted-foreground">→</span>
                  <Badge variant="outline">{future}</Badge>
                </div>
                <p>{notes}</p>
              </div>
            ))}
          </div>
        </AuditSection>

        <AuditSection title="6. Supabase RLS Policy Draft">
          {rlsPolicies.map((item) => (
            <p key={item}>{item}</p>
          ))}
        </AuditSection>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
        <AuditSection title="7. Data Export & Backup Checklist">
          {backupChecklist.map((item) => (
            <p key={item}>• {item}</p>
          ))}
        </AuditSection>

        <AuditSection title="8. Base44 Lock-in Risk">
          {lockInRisks.map((item) => (
            <p key={item}>{item}</p>
          ))}
        </AuditSection>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
        <AuditSection title="9. Migration Test Plan">
          {migrationTests.map((item) => (
            <p key={item}>• {item}</p>
          ))}
        </AuditSection>

        <AuditSection title="10. What to Avoid Now">
          <p>Do not use real student data while workflows and platform ownership are still evolving.</p>
          <p>Do not hardcode too much Base44-specific logic directly inside page components.</p>
          <p>Keep using the service layer so future backend swaps are easier.</p>
          <p>Keep fake/demo data separate from production-style logic and records.</p>
          <p>Keep architecture and migration documentation updated as the app changes.</p>
        </AuditSection>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
        <AuditSection title="11. Next Recommended Technical Step">
          <p>The current app is still in a healthy prototyping stage, so continuing to prototype is reasonable as long as the service layer remains the main boundary between UI and backend logic.</p>
          <p>At the same time, the codebase is mature enough to begin <strong className="text-foreground">light Supabase preparation</strong> rather than a full migration right now.</p>
          <p>A practical next step is to keep building workflows in the current app while documenting table equivalents, auth rules, storage needs, and function replacements for a future Supabase version.</p>
          <p>The recommended approach is: <strong className="text-foreground">continue prototyping now, but prepare the migration path deliberately in parallel</strong>.</p>
        </AuditSection>

        <AuditSection title="12. Final Recommendation">
          <p>Base44 is safe for fake-data prototyping and workflow design.</p>
          <p>Supabase and GitHub should be in place before any real student or parent data goes live.</p>
          <p>The future production version should run on an owned database with backups, export paths, and role-based security controls.</p>
        </AuditSection>
      </div>

      <Card className="p-6 bg-accent/20 border-dashed">
        <h3 className="font-semibold mb-3">Audit Summary</h3>
        <p className="text-sm text-muted-foreground">
          The app is already structured well enough for future ownership migration because UI and data access are partially separated, but auth, entities, functions, user invitation, file handling, and parent-linked access still rely on Base44 and should be replaced before real production data is introduced.
        </p>
      </Card>
    </div>
  );
}