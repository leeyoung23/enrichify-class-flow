import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { getAvailableDemoRoles, getSelectedDemoRole } from '@/services/authService';

const ROLE_LABELS = {
  hq_admin: 'HQ Admin',
  branch_supervisor: 'Branch Supervisor',
  teacher: 'Teacher',
  parent: 'Parent',
  student: 'Student',
};

/**
 * `layoutRole` must come from AppLayout (resolved staff/demo role). This component is rendered *beside*
 * `<Outlet />`, so `useOutletContext()` is always empty — without `layoutRole`, the badge wrongly defaulted to Teacher.
 */
export default function DemoRoleSwitcher({ layoutRole = null }) {
  const navigate = useNavigate();
  const urlDemoRole = getSelectedDemoRole();
  const currentRole = urlDemoRole || layoutRole || 'teacher';
  const roles = getAvailableDemoRoles();

  const handleChange = (role) => {
    const params = new URLSearchParams();
    params.set('demoRole', role);
    const nextPath = role === 'parent' || role === 'student' ? '/parent-view' : '/';
    if (role === 'parent') params.set('student', 'student-01');
    if (role === 'student') params.set('student', 'student-01');
    navigate(`${nextPath}?${params.toString()}`);
  };

  return (
    <Card className="p-4 mb-6 border-dashed">
      <div className="flex flex-col md:flex-row md:items-center gap-3 md:justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="secondary">Demo Role Preview</Badge>
            <Badge variant="outline">{ROLE_LABELS[currentRole] || currentRole}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">Switch roles instantly using fake demo data only. Parent and Student open their restricted preview view automatically.</p>
        </div>
        <div className="w-full md:w-[240px]">
          <Select value={currentRole} onValueChange={handleChange}>
            <SelectTrigger>
              <SelectValue placeholder="Choose role" />
            </SelectTrigger>
            <SelectContent>
              {roles.map((role) => (
                <SelectItem key={role} value={role}>
                  {ROLE_LABELS[role] || role}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </Card>
  );
}