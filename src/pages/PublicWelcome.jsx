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

const featureGroups = [
  {
    icon: Users,
    title: 'For families',
    text: 'Track homework, approved reports, attendance, and learning progress in one gentle view.',
  },
  {
    icon: BookOpen,
    title: 'For teachers',
    text: 'Move through class session flow, homework checks, notes, parent updates, and daily tasks.',
  },
  {
    icon: Building2,
    title: 'For centre leaders',
    text: 'Understand branch overview, teacher KPI, fees, observations, and trial activity with less noise.',
  },
];

function RoleLinkCard({ item }) {
  return (
    <Link
      to={item.to}
      className="group flex h-full flex-col justify-between rounded-[1.75rem] border border-sky-100 bg-white/90 p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-sky-200 hover:shadow-xl hover:shadow-sky-100"
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
        <section className="mx-auto grid max-w-7xl items-center gap-14 px-5 py-20 lg:grid-cols-[1.08fr_0.92fr] lg:py-28">
          <div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-sky-100 bg-white/80 px-4 py-2 text-sm font-medium text-sky-700 shadow-sm">
              <Sparkles className="h-4 w-4" />
              Calm learning support for modern enrichment centres
            </div>
            <h1 className="max-w-4xl text-5xl font-bold tracking-[-0.045em] text-slate-950 md:text-6xl">
              A clearer way to support every learner, lesson, and centre team.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
              Young&apos;s Learners is an AI-assisted enrichment learning and operations platform for homework, reports, class routines, and thoughtful centre oversight.
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

          <div className="rounded-[2rem] border border-sky-100 bg-white/90 p-6 shadow-2xl shadow-sky-100">
            <div className="rounded-[1.5rem] bg-gradient-to-br from-sky-100 to-blue-50 p-6">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-sky-800">Learning centre overview</p>
                  <p className="text-xs text-slate-500">Simple, approved, role-aware views</p>
                </div>
                <ShieldCheck className="h-6 w-6 text-sky-700" />
              </div>
              <div className="space-y-3">
                {['Parent reports are ready for review', 'Homework follow-up stays visible', 'Branch priorities stay calm and clear'].map((item) => (
                  <div key={item} className="flex items-center gap-3 rounded-2xl bg-white/85 p-4 text-sm font-medium text-slate-700 shadow-sm">
                    <CheckCircle2 className="h-5 w-5 text-sky-600" />
                    {item}
                  </div>
                ))}
              </div>
              <div className="mt-5 rounded-2xl border border-white/80 bg-white/70 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">Built for</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">Parents, students, teachers, branch supervisors, and HQ teams who need the right information at the right moment.</p>
              </div>
            </div>
          </div>
        </section>

        <section id="about" className="mx-auto max-w-7xl px-5 py-12">
          <div className="rounded-[2rem] border border-sky-100 bg-white/85 p-8 shadow-sm lg:p-10">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-sky-700">Mission</p>
            <div className="mt-4 grid gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-end">
              <h2 className="text-3xl font-bold tracking-tight text-slate-950 md:text-4xl">
                Connecting learning, communication, and centre operations in one calm system.
              </h2>
              <p className="text-base leading-8 text-slate-600">
                Young&apos;s Learners helps enrichment centres keep daily teaching focused while giving families, teachers, and leaders a shared view of progress.
              </p>
            </div>
          </div>
        </section>

        <section id="signin" className="mx-auto max-w-7xl px-5 py-14">
          <div className="mb-8 max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-sky-700">Role entry</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight">Choose your Young&apos;s Learners access path.</h2>
            <p className="mt-3 text-slate-600">Choose the role that matches your day-to-day view. These prototype links open safe demo spaces only.</p>
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

        <section id="features" className="mx-auto max-w-7xl px-5 py-14">
          <div className="mb-8 max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-sky-700">Platform benefits</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight">Designed for the rhythm of an enrichment centre.</h2>
          </div>
          <div className="grid gap-6 lg:grid-cols-3">
            {featureGroups.map(({ icon: Icon, title, text }) => (
              <div key={title} className="rounded-[1.75rem] border border-sky-100 bg-white/85 p-6 shadow-sm">
                <Icon className="mb-5 h-6 w-6 text-sky-700" />
                <h3 className="text-lg font-semibold text-slate-950">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">{text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 py-14 pb-20">
          <div className="grid gap-5 rounded-[2rem] border border-sky-100 bg-white/85 p-7 shadow-sm md:grid-cols-[1fr_auto_auto] md:items-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-sky-700">Getting started</p>
              <h2 className="mt-3 text-2xl font-bold tracking-tight">Setup flows are coming later.</h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
                Family setup and staff activation will be added after the secure account and data model is approved. No real information is collected here.
              </p>
            </div>
            <button type="button" className="rounded-2xl border border-sky-100 bg-sky-50 px-5 py-3 text-sm font-semibold text-sky-800">
              Start Family Setup - Coming soon
            </button>
            <button type="button" className="rounded-2xl border border-sky-100 bg-sky-50 px-5 py-3 text-sm font-semibold text-sky-800">
              Start Staff Setup - Coming soon
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
