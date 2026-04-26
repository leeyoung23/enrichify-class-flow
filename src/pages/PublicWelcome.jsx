import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BookOpen,
  Building2,
  GraduationCap,
  LockKeyhole,
  School,
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

const orbitRoles = ['Parent', 'Student', 'Teacher', 'Branch', 'HQ'];
const flowSteps = ['Homework Upload', 'AI Draft', 'Teacher Review', 'Parent Update'];

function useWelcomeReveal() {
  useEffect(() => {
    const items = Array.from(document.querySelectorAll('.welcome-reveal'));
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.2 }
    );

    items.forEach((item) => observer.observe(item));
    return () => observer.disconnect();
  }, []);
}

function RoleLinkCard({ item }) {
  return (
    <Link
      to={item.to}
      className="group flex h-full flex-col justify-between rounded-[1.75rem] border border-sky-100 bg-white/90 p-5 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-sky-200 hover:shadow-xl hover:shadow-sky-100"
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

function GatewayButton({ title, description, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex h-full w-full flex-col items-start rounded-[1.75rem] border border-sky-100 bg-white/90 p-5 text-left shadow-sm transition duration-300 hover:-translate-y-1 hover:border-sky-200 hover:shadow-xl hover:shadow-sky-100"
    >
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-50 text-sky-700">
        {children}
      </div>
      <h3 className="text-base font-semibold text-slate-950">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
      <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-sky-700">
        Open panel <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
      </span>
    </button>
  );
}

function InfoModal({ type, onClose }) {
  if (!type) return null;

  const isStaffSignIn = type === 'staff-signin';
  const isFamilySetup = type === 'family-setup';
  const title = isStaffSignIn
    ? 'Staff sign in'
    : isFamilySetup
      ? 'Family setup is coming soon'
      : 'Staff setup is coming soon';
  const description = isStaffSignIn
    ? 'Choose the staff role you want to preview. These are demo links only.'
    : isFamilySetup
      ? 'Family onboarding will later collect parent contact, child profile, school, grade, and curriculum pathway after secure accounts are ready.'
      : 'Staff onboarding will later use invite or activation codes for first-time setup only. Daily login will use normal staff sign in.';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/20 px-4 backdrop-blur-sm" role="dialog" aria-modal="true">
      <div className="w-full max-w-xl rounded-[2rem] border border-white/80 bg-white/95 p-6 shadow-2xl shadow-sky-200">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-700">Young&apos;s Learners</p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">{title}</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">{description}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-full bg-sky-50 px-3 py-1 text-sm font-semibold text-sky-800">
            Close
          </button>
        </div>

        {isStaffSignIn ? (
          <div className="grid gap-3">
            {staffLinks.map((item) => (
              <Link key={item.label} to={item.to} className="rounded-2xl border border-sky-100 bg-sky-50/70 px-4 py-3 text-sm font-semibold text-sky-900 transition hover:bg-sky-100">
                {item.label}
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl bg-sky-50 p-4 text-sm leading-6 text-slate-700">
            No real account creation, authentication, activation-code validation, or data collection is implemented on this public prototype.
          </div>
        )}
      </div>
    </div>
  );
}

function LearningOrbitVisual() {
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[500px]">
      <div className="absolute inset-6 rounded-full bg-gradient-to-br from-sky-100 via-white to-blue-100 blur-2xl" />
      <div className="absolute inset-8 rounded-full border border-white/80 bg-white/45 shadow-2xl shadow-sky-100 backdrop-blur-2xl" />
      <div className="welcome-orbit-ring absolute inset-16 rounded-full border border-sky-200/80" />
      <div className="welcome-orbit-ring absolute inset-24 rounded-full border border-white/90" style={{ animationDuration: '30s', animationDirection: 'reverse' }} />

      <div className="welcome-breathe absolute left-[calc(50%-4.5rem)] top-[calc(50%-4.5rem)] z-10 flex h-36 w-36 flex-col items-center justify-center rounded-[2rem] border border-white/80 bg-white/90 p-5 text-center shadow-2xl shadow-sky-200 backdrop-blur-xl">
        <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-600 text-white shadow-lg shadow-sky-200">
          <GraduationCap className="h-6 w-6" />
        </div>
        <p className="text-base font-bold leading-tight text-slate-950">Young&apos;s Learners</p>
        <p className="mt-1 text-xs font-semibold text-sky-700">Connected learning</p>
      </div>

      {orbitRoles.map((role, index) => {
        const positions = [
          'left-[3%] top-[22%]',
          'right-[2%] top-[20%]',
          'right-[3%] top-[57%]',
          'left-[4%] top-[60%]',
          'left-[42%] top-[1%]',
        ];
        return (
          <div
            key={role}
            className={`welcome-breathe absolute z-20 rounded-2xl border border-white/80 bg-white/90 px-5 py-3 text-base font-bold text-slate-900 shadow-xl shadow-sky-100 backdrop-blur-xl ${positions[index]}`}
            style={{ animationDelay: `${index * 0.35}s` }}
          >
            {role}
          </div>
        );
      })}

      <div className="absolute bottom-4 left-1/2 z-20 w-[90%] -translate-x-1/2 rounded-[1.5rem] border border-white/80 bg-white/90 p-4 shadow-xl shadow-sky-100 backdrop-blur-xl">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">Connected learning flow</p>
        <div className="grid gap-2 sm:grid-cols-4">
          {flowSteps.map((step, index) => (
            <div key={step} className="flex items-center gap-2 rounded-2xl bg-sky-50 px-3 py-2 text-xs font-semibold text-slate-700">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-[10px] text-sky-700">{index + 1}</span>
              <span>{step}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function PublicWelcome() {
  const [modalType, setModalType] = useState(null);
  useWelcomeReveal();

  return (
    <div className="min-h-screen overflow-hidden bg-gradient-to-br from-sky-50 via-white to-blue-50 text-slate-950">
      <style>{`
        @keyframes welcome-hero {
          from { opacity: 0; transform: translateY(28px) scale(0.98); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes welcome-ring {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @keyframes welcome-breathe {
          0%, 100% { transform: scale(1); box-shadow: 0 24px 60px rgba(125, 211, 252, 0.22); }
          50% { transform: scale(1.035); box-shadow: 0 30px 80px rgba(125, 211, 252, 0.34); }
        }

        .welcome-fade {
          animation: welcome-hero 900ms cubic-bezier(.16,1,.3,1) both;
        }

        .welcome-orbit-ring {
          animation: welcome-ring 24s linear infinite;
        }

        .welcome-breathe {
          animation: welcome-breathe 5.5s ease-in-out infinite;
        }

        .welcome-reveal {
          opacity: 0;
          transform: translateY(34px);
          transition: opacity 900ms cubic-bezier(.16,1,.3,1), transform 900ms cubic-bezier(.16,1,.3,1);
        }

        .welcome-reveal.is-visible {
          opacity: 1;
          transform: translateY(0);
        }

        @media (prefers-reduced-motion: reduce) {
          .welcome-fade, .welcome-orbit-ring, .welcome-breathe {
            animation: none;
          }
          .welcome-reveal {
            opacity: 1;
            transform: none;
          }
        }
      `}</style>
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
        <section className="mx-auto grid max-w-7xl items-center gap-12 px-5 py-16 lg:grid-cols-[1.02fr_0.98fr] lg:py-20">
          <div className="welcome-fade">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-sky-100 bg-white/80 px-4 py-2 text-sm font-medium text-sky-700 shadow-sm">
              <Sparkles className="h-4 w-4" />
              Calm learning support for modern enrichment centres
            </div>
            <h1 className="max-w-5xl text-6xl font-black tracking-[-0.06em] text-slate-950 md:text-7xl">
              Young&apos;s Learners for every child, class, and centre team.
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

          <LearningOrbitVisual />
        </section>

        <section id="signin" className="welcome-reveal mx-auto max-w-7xl px-5 py-14">
          <div className="mb-8 max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-sky-700">Sign in gateway</p>
            <h2 className="mt-3 text-4xl font-bold tracking-[-0.035em]">Choose the right entry point.</h2>
            <p className="mt-3 text-slate-600">Families and staff start from simple, role-aware paths. Prototype links open safe demo spaces only.</p>
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="welcome-reveal rounded-[2rem] border border-sky-100 bg-white/70 p-5 shadow-sm" style={{ transitionDelay: '120ms' }}>
              <h3 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-[0.18em] text-sky-700">
                <Users className="h-4 w-4" /> Families
              </h3>
              <div className="grid gap-4">
                {familyLinks.map((item) => <RoleLinkCard key={item.label} item={item} />)}
                <GatewayButton
                  title="Start Family Setup"
                  description="Preview the future setup path for parent contact, child profile, school, grade, and curriculum pathway."
                  onClick={() => setModalType('family-setup')}
                >
                  <Users className="h-5 w-5" />
                </GatewayButton>
              </div>
            </div>
            <div className="welcome-reveal rounded-[2rem] border border-sky-100 bg-white/70 p-5 shadow-sm" style={{ transitionDelay: '240ms' }}>
              <h3 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-[0.18em] text-sky-700">
                <School className="h-4 w-4" /> Staff
              </h3>
              <div className="grid gap-4">
                <GatewayButton
                  title="Staff Sign In"
                  description="Choose Teacher, Branch Supervisor, or HQ Admin from a clean staff sign-in panel."
                  onClick={() => setModalType('staff-signin')}
                >
                  <LockKeyhole className="h-5 w-5" />
                </GatewayButton>
                <GatewayButton
                  title="Start Staff Setup"
                  description="Preview the future first-time staff onboarding flow with invite-based activation."
                  onClick={() => setModalType('staff-setup')}
                >
                  <School className="h-5 w-5" />
                </GatewayButton>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="welcome-reveal mx-auto max-w-7xl px-5 py-14">
          <div className="mb-8 max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-sky-700">Platform benefits</p>
            <h2 className="mt-3 text-4xl font-bold tracking-[-0.035em]">Designed for the rhythm of an enrichment centre.</h2>
          </div>
          <div className="grid gap-6 lg:grid-cols-3">
            {featureGroups.map(({ icon: Icon, title, text }, index) => (
              <div key={title} className="welcome-reveal rounded-[1.75rem] border border-sky-100 bg-white/85 p-6 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-sky-100" style={{ transitionDelay: `${index * 140}ms` }}>
                <Icon className="mb-5 h-6 w-6 text-sky-700" />
                <h3 className="text-lg font-semibold text-slate-950">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">{text}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="about" className="welcome-reveal mx-auto max-w-7xl px-5 py-14">
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

        <section className="welcome-reveal mx-auto max-w-7xl px-5 py-14">
          <div className="grid gap-5 rounded-[2rem] border border-sky-100 bg-white/85 p-7 shadow-sm md:grid-cols-[1fr_auto_auto] md:items-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-sky-700">Getting started</p>
              <h2 className="mt-3 text-2xl font-bold tracking-tight">Setup flows are coming later.</h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
                Family setup and staff activation will be added after the secure account and data model is approved. No real information is collected here.
              </p>
            </div>
            <button type="button" onClick={() => setModalType('family-setup')} className="rounded-2xl border border-sky-100 bg-sky-50 px-5 py-3 text-sm font-semibold text-sky-800 transition hover:bg-sky-100">
              Start Family Setup - Coming soon
            </button>
            <button type="button" onClick={() => setModalType('staff-setup')} className="rounded-2xl border border-sky-100 bg-sky-50 px-5 py-3 text-sm font-semibold text-sky-800 transition hover:bg-sky-100">
              Start Staff Setup - Coming soon
            </button>
          </div>
        </section>
      </main>

      <footer className="border-t border-sky-100 bg-white/70 px-5 py-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 text-sm text-slate-500 md:flex-row md:items-center md:justify-between">
          <p className="font-semibold text-slate-700">Young&apos;s Learners</p>
          <p>Public prototype only. Demo links use fake data.</p>
        </div>
      </footer>
      <InfoModal type={modalType} onClose={() => setModalType(null)} />
    </div>
  );
}
