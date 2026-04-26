import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BookOpen,
  Building2,
  CheckCircle2,
  GraduationCap,
  LockKeyhole,
  School,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react';

const familyLinks = [
  { label: 'Parent Sign In', to: '/parent-view?demoRole=parent&student=student-01', description: 'View linked child progress, reports, and homework.' },
  { label: 'Student Portal', to: '/parent-view?demoRole=student&student=student-01', description: 'Open homework due, feedback, learning resources, and progress.' },
];

const staffLinks = [
  { label: 'Teacher Sign In', to: '/?demoRole=teacher', description: 'Run class sessions, parent updates, homework, and teacher tasks.' },
  { label: 'Branch Supervisor Sign In', to: '/?demoRole=branch_supervisor', description: 'Monitor branch operations, teachers, students, trials, and fees.' },
  { label: 'HQ Admin Sign In', to: '/?demoRole=hq_admin', description: 'Manage the full platform, branch performance, and strategic reporting.' },
];

const databaseTables = [
  'profiles',
  'students',
  'schools',
  'curriculum_pathways',
  'guardian_student_links',
  'staff_invites',
  'student_learning_profiles',
];

function Field({ label, placeholder }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-700">{label}</span>
      <input
        className="mt-2 w-full rounded-2xl border border-sky-100 bg-white/80 px-4 py-3 text-sm text-slate-500 shadow-sm outline-none ring-sky-200 placeholder:text-slate-400"
        placeholder={placeholder}
        readOnly
      />
    </label>
  );
}

function SelectField({ label, placeholder }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-700">{label}</span>
      <select
        className="mt-2 w-full rounded-2xl border border-sky-100 bg-white/80 px-4 py-3 text-sm text-slate-500 shadow-sm outline-none ring-sky-200"
        defaultValue=""
        disabled
      >
        <option value="">{placeholder}</option>
      </select>
    </label>
  );
}

function RoleLinkCard({ item }) {
  return (
    <Link
      to={item.to}
      className="group flex h-full flex-col justify-between rounded-3xl border border-sky-100 bg-white/85 p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-sky-200 hover:shadow-xl hover:shadow-sky-100"
    >
      <div>
        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-50 text-sky-700">
          <LockKeyhole className="h-5 w-5" />
        </div>
        <h3 className="text-base font-semibold text-slate-950">{item.label}</h3>
        <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>
      </div>
      <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-sky-700">
        Continue demo <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
      </span>
    </Link>
  );
}

export default function PublicWelcome() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-blue-50 text-slate-950">
      <header className="sticky top-0 z-30 border-b border-white/80 bg-white/80 backdrop-blur-xl">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
          <a href="#top" className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-600 text-white shadow-lg shadow-sky-200">
              <GraduationCap className="h-5 w-5" />
            </span>
            <span>
              <span className="block text-base font-bold tracking-tight">Young&apos;s Learners</span>
              <span className="block text-xs font-medium text-sky-700">AI-assisted enrichment platform</span>
            </span>
          </a>
          <div className="hidden items-center gap-7 text-sm font-medium text-slate-600 md:flex">
            <a className="hover:text-sky-700" href="#about">About</a>
            <a className="hover:text-sky-700" href="#features">Features</a>
            <a className="hover:text-sky-700" href="#signin">Sign in</a>
          </div>
        </nav>
      </header>

      <main id="top">
        <section className="mx-auto grid max-w-7xl items-center gap-12 px-5 py-20 lg:grid-cols-[1.05fr_0.95fr] lg:py-24">
          <div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-sky-100 bg-white/80 px-4 py-2 text-sm font-medium text-sky-700 shadow-sm">
              <Sparkles className="h-4 w-4" />
              Future-ready learning and centre operations
            </div>
            <h1 className="max-w-4xl text-5xl font-bold tracking-[-0.04em] text-slate-950 md:text-6xl">
              Young&apos;s Learners brings families, teachers, and centre leaders into one calm workspace.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
              An AI-assisted enrichment learning and operations platform for progress reports, homework, class workflows, branch oversight, and future personalised learning paths.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a href="#about" className="inline-flex items-center justify-center rounded-2xl bg-sky-700 px-6 py-3 text-sm font-semibold text-white shadow-xl shadow-sky-200 transition hover:bg-sky-800">
                Get Started
              </a>
              <a href="#signin" className="inline-flex items-center justify-center rounded-2xl border border-sky-100 bg-white px-6 py-3 text-sm font-semibold text-sky-800 shadow-sm transition hover:border-sky-200">
                Sign In
              </a>
            </div>
          </div>

          <div className="rounded-[2rem] border border-sky-100 bg-white/85 p-6 shadow-2xl shadow-sky-100">
            <div className="rounded-[1.5rem] bg-gradient-to-br from-sky-100 to-blue-50 p-6">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-sky-800">Today at Young&apos;s Learners</p>
                  <p className="text-xs text-slate-500">Demo preview only</p>
                </div>
                <ShieldCheck className="h-6 w-6 text-sky-700" />
              </div>
              <div className="space-y-3">
                {['Teacher notes ready for parent review', 'Homework uploads waiting for feedback', 'Branch overview stays clear and focused'].map((item) => (
                  <div key={item} className="flex items-center gap-3 rounded-2xl bg-white/85 p-4 text-sm font-medium text-slate-700 shadow-sm">
                    <CheckCircle2 className="h-5 w-5 text-sky-600" />
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="about" className="mx-auto max-w-7xl px-5 py-14">
          <div className="grid gap-6 lg:grid-cols-3">
            {[
              { icon: Users, title: 'Families stay informed', text: 'Parents and students see approved progress, homework status, and learning materials without internal centre tools.' },
              { icon: BookOpen, title: 'Teachers stay focused', text: 'Class workflows keep attendance, homework, notes, and parent report drafts in one teaching-first flow.' },
              { icon: Building2, title: 'Leaders see operations', text: 'Branch supervisors and HQ can monitor quality, trials, fees, and performance without overwhelming daily users.' },
            ].map(({ icon: Icon, title, text }) => (
              <div key={title} className="rounded-3xl border border-sky-100 bg-white/80 p-6 shadow-sm">
                <Icon className="mb-4 h-6 w-6 text-sky-700" />
                <h2 className="text-lg font-semibold">{title}</h2>
                <p className="mt-3 text-sm leading-6 text-slate-600">{text}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="signin" className="mx-auto max-w-7xl px-5 py-14">
          <div className="mb-8 max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-sky-700">Role entry</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight">Choose your Young&apos;s Learners access path.</h2>
            <p className="mt-3 text-slate-600">These buttons use demo links only. Real Supabase Auth and activation codes will be added later after database and RLS design is approved.</p>
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <div>
              <h3 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-[0.18em] text-sky-700">
                <Users className="h-4 w-4" /> Families
              </h3>
              <div className="grid gap-4 sm:grid-cols-2">
                {familyLinks.map((item) => <RoleLinkCard key={item.label} item={item} />)}
              </div>
            </div>
            <div>
              <h3 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-[0.18em] text-sky-700">
                <School className="h-4 w-4" /> Staff
              </h3>
              <div className="grid gap-4">
                {staffLinks.map((item) => <RoleLinkCard key={item.label} item={item} />)}
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="mx-auto grid max-w-7xl gap-6 px-5 py-14 lg:grid-cols-2">
          <div className="rounded-[2rem] border border-sky-100 bg-white/85 p-7 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-sky-700">Family onboarding preview</p>
            <h2 className="mt-3 text-2xl font-bold">School context supports future personalisation.</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              School and curriculum information will later help generate personalised materials, gamified modules, and AI homework marking. This form is UI-only and does not submit data.
            </p>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <Field label="Parent name" placeholder="Example: A parent or guardian" />
              <Field label="Parent email or phone" placeholder="Not collected in this prototype" />
              <Field label="Child name" placeholder="Example: Child name" />
              <Field label="Child year / grade" placeholder="Example: Year 5" />
              <Field label="Child school name" placeholder="Example: School name" />
              <SelectField label="School type" placeholder="Select later: national, international, homeschool" />
              <SelectField label="Curriculum pathway" placeholder="Select later: Cambridge, local, other" />
              <Field label="Subjects enrolled" placeholder="Example: English, Maths, Science" />
            </div>
          </div>

          <div className="rounded-[2rem] border border-sky-100 bg-white/85 p-7 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-sky-700">Staff onboarding preview</p>
            <h2 className="mt-3 text-2xl font-bold">Activation codes are for first setup only.</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Staff should use invite or activation codes only during first-time onboarding. Daily login should later use normal Supabase Auth sessions.
            </p>
            <div className="mt-6 grid gap-4">
              <Field label="Staff email" placeholder="Invited staff email" />
              <SelectField label="Role" placeholder="Teacher, branch supervisor, or HQ admin" />
              <Field label="Invite / activation code" placeholder="Validated later by a secure server flow" />
            </div>
            <div className="mt-6 rounded-3xl bg-sky-50 p-5 text-sm leading-6 text-slate-700">
              No real authentication, code validation, or staff account creation is implemented on this page.
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 py-14 pb-20">
          <div className="rounded-[2rem] border border-sky-100 bg-white/85 p-7 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-sky-700">Database-first notes</p>
            <h2 className="mt-3 text-2xl font-bold">Future Supabase mapping</h2>
            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {databaseTables.map((table) => (
                <div key={table} className="rounded-2xl border border-sky-100 bg-sky-50/70 px-4 py-3 font-mono text-sm text-sky-900">
                  {table}
                </div>
              ))}
            </div>
            <p className="mt-6 text-sm leading-6 text-slate-600">
              Real implementation should wait for Supabase tables, foreign keys, role policies, RLS tests, and secure onboarding flows. This prototype uses fake demo links only.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
