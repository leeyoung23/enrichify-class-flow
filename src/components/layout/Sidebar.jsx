import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Building2, BookOpen, Users, GraduationCap,
  ClipboardCheck, MessageSquarePlus, LogOut, ChevronLeft, ChevronRight,
  PenLine, UserPlus, PlayCircle, ClipboardPen, ChartNoAxesColumn, Bot, FolderGit2, BarChart3, CalendarRange, BellRing, FileText, Wallet, Briefcase, Timer, Megaphone
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { cn } from '@/lib/utils';
import { getSelectedDemoRole, normalizeRole } from '@/services/authService';
import { getRoleNavigation } from '@/services/permissionService';

const ROLE_TITLES = {
  hq_admin: 'HQ Admin',
  branch_supervisor: 'Branch Supervisor',
  teacher: 'Teacher',
  parent: 'Parent',
  student: 'Student',
};

const ICONS = {
  dashboard: LayoutDashboard,
  branches: Building2,
  classes: BookOpen,
  teachers: Users,
  students: GraduationCap,
  attendance: ClipboardCheck,
  parentUpdates: MessageSquarePlus,
  homework: PenLine,
  leads: UserPlus,
  classSession: PlayCircle,
  observations: ClipboardPen,
  teacherKpi: ChartNoAxesColumn,
  futureAi: Bot,
  migrationAudit: FolderGit2,
  branchPerformance: BarChart3,
  trialScheduling: CalendarRange,
  myTasks: BellRing,
  prototypeSummary: FileText,
  feeTracking: Wallet,
  salesKit: Briefcase,
  staffTimeClock: Timer,
  announcements: Megaphone,
  parentReports: FileText,
};

function withDemoRole(path, selectedDemoRole) {
  if (!selectedDemoRole) return path;
  const [pathWithoutHash, hash = ''] = path.split('#');
  const [pathname, search = ''] = pathWithoutHash.split('?');
  const params = new URLSearchParams(search);
  params.set('demoRole', selectedDemoRole);
  if ((selectedDemoRole === 'parent' || selectedDemoRole === 'student') && pathname === '/parent-view' && !params.has('student')) {
    params.set('student', 'student-01');
  }
  return `${pathname}?${params.toString()}${hash ? `#${hash}` : ''}`;
}

/** Real mode: keep ?student= on /parent-view; demo mode uses withDemoRole (demoRole + default student). */
function buildParentViewNavTo(itemPath, selectedDemoRole, currentSearch) {
  if (selectedDemoRole) {
    return withDemoRole(itemPath, selectedDemoRole);
  }
  const [pathnameOnly, hash = ''] = itemPath.split('#');
  if (pathnameOnly === '/parent-view') {
    return `/parent-view${currentSearch || ''}${hash ? `#${hash}` : ''}`;
  }
  return itemPath;
}

function isParentViewNavItemActive(itemPath, location) {
  const itemBase = itemPath.split('#')[0];
  if (itemBase !== '/parent-view' || location.pathname !== '/parent-view') {
    return false;
  }
  const itemHash = itemPath.includes('#') ? itemPath.slice(itemPath.indexOf('#') + 1) : '';
  const locHash = (location.hash || '').replace(/^#/, '');
  if (!itemHash) {
    return !locHash;
  }
  return locHash === itemHash;
}

export default function Sidebar({ user, collapsed, onToggle }) {
  const location = useLocation();
  const selectedDemoRole = getSelectedDemoRole();
  const role = selectedDemoRole || normalizeRole(user?.role) || null;
  const items = role ? getRoleNavigation(role) : [];

  return (
    <aside className={cn(
      "fixed left-0 top-0 h-screen bg-card border-r border-border flex flex-col z-40 transition-all duration-300",
      collapsed ? "w-[72px]" : "w-[260px]"
    )}>
      <div className="p-5 flex items-center gap-3 border-b border-border">
        <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center flex-shrink-0">
          <GraduationCap className="h-5 w-5 text-primary-foreground" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <h1 className="font-bold text-base tracking-tight truncate">EduCentre</h1>
            <p className="text-[11px] text-muted-foreground truncate">
              {role ? ROLE_TITLES[role] || role.replace('_', ' ') : 'Profile role pending'}
            </p>
          </div>
        )}
      </div>

      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {items.length === 0 ? (
          <p className="px-3 text-xs text-muted-foreground leading-relaxed">
            {user?.id
              ? 'Navigation will appear when your account profile has a valid role. Contact support if this persists.'
              : 'Sign in to see navigation.'}
          </p>
        ) : null}
        {items.map((item) => {
          const itemPath = item.path.split('#')[0];
          const isActive = itemPath === '/parent-view'
            ? isParentViewNavItemActive(item.path, location)
            : location.pathname === itemPath;
          return (
            <Link
              key={item.path}
              to={buildParentViewNavTo(item.path, selectedDemoRole, location.search)}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                isActive 
                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/20" 
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              {React.createElement(ICONS[item.icon] || LayoutDashboard, { className: "h-[18px] w-[18px] flex-shrink-0" })}
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-border space-y-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggle}
          className="w-full justify-center"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => base44.auth.logout()}
          className={cn("w-full text-muted-foreground hover:text-destructive", collapsed ? "justify-center" : "justify-start gap-3")}
        >
          <LogOut className="h-4 w-4 flex-shrink-0" />
          {!collapsed && <span>Sign Out</span>}
        </Button>
      </div>
    </aside>
  );
}