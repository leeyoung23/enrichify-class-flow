import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, Building2, BookOpen, Users, GraduationCap, 
  ClipboardCheck, MessageSquarePlus, LogOut, ChevronLeft, ChevronRight,
  PenLine, UserPlus, PlayCircle, ClipboardPen, ChartNoAxesColumn, Bot, FolderGit2, BarChart3, CalendarRange, BellRing, FileText, Wallet
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { cn } from '@/lib/utils';
import { getSelectedDemoRole, normalizeRole } from '@/services/authService';

const ROLE_TITLES = {
  hq_admin: 'HQ Admin',
  branch_supervisor: 'Branch Supervisor',
  teacher: 'Teacher',
  parent: 'Parent',
  student: 'Student',
};

const NAV_ITEMS = {
  hq_admin: [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/' },
    { label: 'Branches', icon: Building2, path: '/branches' },
    { label: 'Classes', icon: BookOpen, path: '/classes' },
    { label: 'Teachers', icon: Users, path: '/teachers' },
    { label: 'Students', icon: GraduationCap, path: '/students' },
    { label: 'Attendance', icon: ClipboardCheck, path: '/attendance' },
    { label: 'Homework', icon: PenLine, path: '/homework' },
    { label: 'Parent Updates', icon: MessageSquarePlus, path: '/parent-updates' },
    { label: 'Fee Tracking', icon: Wallet, path: '/fee-tracking' },
    { label: 'Leads & Enrolment', icon: UserPlus, path: '/leads' },
    { label: 'Trial Scheduling', icon: CalendarRange, path: '/trial-scheduling' },
    { label: 'Observations', icon: ClipboardPen, path: '/observations' },
    { label: 'Teacher KPI', icon: ChartNoAxesColumn, path: '/teacher-kpi' },
    { label: 'Future AI Engine', icon: Bot, path: '/future-ai-learning-engine' },
    { label: 'Migration Audit', icon: FolderGit2, path: '/migration-ownership-audit' },
    { label: 'Prototype Summary', icon: FileText, path: '/prototype-summary' },
    { label: 'Branch Performance', icon: BarChart3, path: '/branch-performance' },
    { label: 'My Tasks', icon: BellRing, path: '/my-tasks' },
  ],
  branch_supervisor: [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/' },
    { label: 'Classes', icon: BookOpen, path: '/classes' },
    { label: 'Teachers', icon: Users, path: '/teachers' },
    { label: 'Students', icon: GraduationCap, path: '/students' },
    { label: 'Attendance', icon: ClipboardCheck, path: '/attendance' },
    { label: 'Homework', icon: PenLine, path: '/homework' },
    { label: 'Parent Updates', icon: MessageSquarePlus, path: '/parent-updates' },
    { label: 'Fee Tracking', icon: Wallet, path: '/fee-tracking' },
    { label: 'Leads & Enrolment', icon: UserPlus, path: '/leads' },
    { label: 'Trial Scheduling', icon: CalendarRange, path: '/trial-scheduling' },
    { label: 'Observations', icon: ClipboardPen, path: '/observations' },
    { label: 'Teacher KPI', icon: ChartNoAxesColumn, path: '/teacher-kpi' },
    { label: 'Prototype Summary', icon: FileText, path: '/prototype-summary' },
    { label: 'Branch Performance', icon: BarChart3, path: '/branch-performance' },
    { label: 'My Tasks', icon: BellRing, path: '/my-tasks' },
  ],
  teacher: [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/' },
    { label: 'Class Session', icon: PlayCircle, path: '/class-session' },
    { label: 'My Classes', icon: BookOpen, path: '/classes' },
    { label: 'My Students', icon: GraduationCap, path: '/students' },
    { label: 'Attendance', icon: ClipboardCheck, path: '/attendance' },
    { label: 'Homework', icon: PenLine, path: '/homework' },
    { label: 'Parent Updates', icon: MessageSquarePlus, path: '/parent-updates' },
    { label: 'My Trial Classes', icon: CalendarRange, path: '/trial-scheduling' },
    { label: 'My Tasks', icon: BellRing, path: '/my-tasks' },
    { label: 'Teacher KPI', icon: ChartNoAxesColumn, path: '/teacher-kpi' },
    { label: 'Observations', icon: ClipboardPen, path: '/observations' },
  ],
  parent: [
    { label: 'Parent Dashboard', icon: LayoutDashboard, path: '/parent-view' },
    { label: 'Fee Tracking', icon: Wallet, path: '/fee-tracking' },
  ],
  student: [
    { label: 'Learning Portal', icon: BookOpen, path: '/parent-view' },
  ],
};

export default function Sidebar({ user, collapsed, onToggle }) {
  const location = useLocation();
  const selectedDemoRole = getSelectedDemoRole();
  const role = selectedDemoRole || normalizeRole(user?.role) || 'teacher';
  const items = NAV_ITEMS[role] || NAV_ITEMS.teacher;

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
            <p className="text-[11px] text-muted-foreground truncate">{ROLE_TITLES[role] || role.replace('_', ' ')}</p>
          </div>
        )}
      </div>

      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {items.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                isActive 
                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/20" 
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <item.icon className="h-[18px] w-[18px] flex-shrink-0" />
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