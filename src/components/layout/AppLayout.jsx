import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { isRouteAllowed } from '@/services/permissionService';
import Sidebar from './Sidebar';
import DemoRoleSwitcher from '@/components/demo/DemoRoleSwitcher';
import EmptyState from '@/components/shared/EmptyState';
import { cn } from '@/lib/utils';
import { getCurrentUser, getSelectedDemoRole, getDemoUser, normalizeRole } from '@/services/authService';
import { ShieldAlert } from 'lucide-react';

export default function AppLayout() {
  const [user, setUser] = useState(null);
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const selectedDemoRole = getSelectedDemoRole();

  useEffect(() => {
    if (selectedDemoRole) {
      setUser(getDemoUser(selectedDemoRole));
      return;
    }
    getCurrentUser().then(setUser);
  }, [location.search, selectedDemoRole]);

  const effectiveUser = selectedDemoRole ? getDemoUser(selectedDemoRole) : user ? { ...user, role: normalizeRole(user.role) || user.role } : null;
  const role = selectedDemoRole || normalizeRole(effectiveUser?.role);

  const showSidebar = Boolean(role);

  if (role && !isRouteAllowed(role, location.pathname)) {
    return (
      <div className="min-h-screen bg-background">
        {showSidebar && (
          <Sidebar user={effectiveUser} collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
        )}
        <main className={cn(
          "transition-all duration-300 min-h-screen",
          collapsed ? 'ml-[72px]' : 'ml-[260px]'
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
        <Sidebar user={effectiveUser} collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
      )}
      <main className={cn(
        "transition-all duration-300 min-h-screen",
        showSidebar ? (collapsed ? 'ml-[72px]' : 'ml-[260px]') : 'ml-0'
      )}>
        <div className="p-6 md:p-8 max-w-[1400px] mx-auto">
          <DemoRoleSwitcher />
          <Outlet context={{ user: effectiveUser, role }} />
        </div>
      </main>
    </div>
  );
}