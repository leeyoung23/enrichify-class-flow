import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { isRouteAllowed } from '@/services/permissionService';
import Sidebar from './Sidebar';
import DemoRoleSwitcher from '@/components/demo/DemoRoleSwitcher';
import EmptyState from '@/components/shared/EmptyState';
import { cn } from '@/lib/utils';
import { getCurrentUser, getSelectedDemoRole, getDemoUser, normalizeRole } from '@/services/authService';
import { useSupabaseAuthState } from '@/hooks/useSupabaseAuthState';
import { ShieldAlert } from 'lucide-react';

export default function AppLayout() {
  const [fallbackUser, setFallbackUser] = useState(null);
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const selectedDemoRole = getSelectedDemoRole();
  const { appUser, loading: supabaseAuthLoading, isSupabaseAuthAvailable } = useSupabaseAuthState();

  const isDemoActive = Boolean(selectedDemoRole);

  useEffect(() => {
    if (isDemoActive) {
      return;
    }
    if (isSupabaseAuthAvailable && supabaseAuthLoading) {
      return;
    }
    if (appUser) {
      return;
    }
    getCurrentUser().then(setFallbackUser);
  }, [isDemoActive, isSupabaseAuthAvailable, supabaseAuthLoading, appUser, location.search]);

  let effectiveUser;
  let role;

  if (selectedDemoRole) {
    effectiveUser = getDemoUser(selectedDemoRole);
    role = selectedDemoRole;
  } else if (isSupabaseAuthAvailable && supabaseAuthLoading) {
    effectiveUser = null;
    role = null;
  } else if (appUser) {
    effectiveUser = { ...appUser, role: normalizeRole(appUser.role) || appUser.role };
    role = normalizeRole(effectiveUser.role) || effectiveUser.role;
  } else {
    effectiveUser = fallbackUser
      ? { ...fallbackUser, role: normalizeRole(fallbackUser.role) || fallbackUser.role }
      : null;
    role = normalizeRole(effectiveUser?.role);
  }

  const showSidebar = Boolean(role);

  if (!isDemoActive && isSupabaseAuthAvailable && supabaseAuthLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-3 text-muted-foreground text-sm">
          <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
          <span>Loading session…</span>
        </div>
      </div>
    );
  }

  if (role && !isRouteAllowed(role, location.pathname)) {
    return (
      <div className="min-h-screen bg-background">
        {showSidebar && (
          <div className="hidden lg:block">
            <Sidebar user={effectiveUser} collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
          </div>
        )}
        <main className={cn(
          "transition-all duration-300 min-h-screen",
          showSidebar ? (collapsed ? 'ml-0 lg:ml-[72px]' : 'ml-0 lg:ml-[260px]') : 'ml-0'
        )}>
          <div className="p-6 md:p-8 max-w-[1400px] mx-auto">
            <DemoRoleSwitcher />
            <EmptyState
              icon={ShieldAlert}
              title="Access restricted"
              description="This page is not available for the current demo role."
            />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {showSidebar && (
        <div className="hidden lg:block">
          <Sidebar user={effectiveUser} collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
        </div>
      )}
      <main className={cn(
        "transition-all duration-300 min-h-screen",
        showSidebar ? (collapsed ? 'ml-0 lg:ml-[72px]' : 'ml-0 lg:ml-[260px]') : 'ml-0'
      )}>
        <div className="p-6 md:p-8 max-w-[1400px] mx-auto">
          <DemoRoleSwitcher />
          <Outlet context={{ user: effectiveUser, role }} />
        </div>
      </main>
    </div>
  );
}