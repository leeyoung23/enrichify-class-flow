import React, { useState, useEffect, useMemo } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { ROLES, getAllowedRoutes } from '@/services/permissionService';
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

  const previewUser = useMemo(() => {
    if (!selectedDemoRole) return null;
    return getDemoUser(selectedDemoRole);
  }, [selectedDemoRole]);

  useEffect(() => {
    if (selectedDemoRole) {
      setUser(getDemoUser(selectedDemoRole));
      return;
    }
    getCurrentUser().then(setUser);
  }, [location.search, selectedDemoRole]);

  const effectiveUser = selectedDemoRole ? getDemoUser(selectedDemoRole) : user ? { ...user, role: normalizeRole(user.role) || user.role } : null;
  const role = selectedDemoRole || normalizeRole(effectiveUser?.role);
  const allowedRoutes = getAllowedRoutes(role);

  if (allowedRoutes.length > 0 && !allowedRoutes.includes(location.pathname) && !location.pathname.startsWith('/observations/')) {
    return (
      <div className="min-h-screen bg-background">
        {role !== ROLES.PARENT && role !== ROLES.STUDENT && (
          <Sidebar user={effectiveUser} collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
        )}
        <main className={cn(
          "transition-all duration-300 min-h-screen",
          role === ROLES.PARENT || role === ROLES.STUDENT ? 'ml-0' : collapsed ? 'ml-[72px]' : 'ml-[260px]'
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
      {role !== ROLES.PARENT && role !== ROLES.STUDENT && (
        <Sidebar user={effectiveUser} collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
      )}
      <main className={cn(
        "transition-all duration-300 min-h-screen",
        role === ROLES.PARENT || role === ROLES.STUDENT ? 'ml-0' : collapsed ? 'ml-[72px]' : 'ml-[260px]'
      )}>
        <div className="p-6 md:p-8 max-w-[1400px] mx-auto">
          <DemoRoleSwitcher />
          <Outlet context={{ user: effectiveUser, role }} />
        </div>
      </main>
    </div>
  );
}