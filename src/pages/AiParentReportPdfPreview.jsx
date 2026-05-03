import React, { useMemo, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import { FileWarning } from 'lucide-react';
import { getSelectedDemoRole } from '@/services/authService';
import { getRole, ROLES } from '@/services/permissionService';
import {
  buildDemoReleasedReportPdfInput,
  renderReleasedReportPdfHtml,
} from '@/services/aiParentReportPdfTemplate';

const VARIANT_OPTIONS = [
  { value: 'monthly_progress', label: 'monthly_progress' },
  { value: 'weekly_brief', label: 'weekly_brief' },
  { value: 'long_text', label: 'long_text' },
  { value: 'sparse_optional_fields', label: 'sparse_optional_fields' },
];

function isStaffRole(role) {
  return role === ROLES.TEACHER || role === ROLES.BRANCH_SUPERVISOR || role === ROLES.HQ_ADMIN;
}

export default function AiParentReportPdfPreview() {
  const { user } = useOutletContext();
  const demoRole = getSelectedDemoRole();
  const role = demoRole || getRole(user);
  const canAccess = isStaffRole(role);

  const [variant, setVariant] = useState('monthly_progress');

  const renderResult = useMemo(() => {
    const input = buildDemoReleasedReportPdfInput({ variant });
    return renderReleasedReportPdfHtml(input);
  }, [variant]);

  if (!canAccess) {
    return (
      <EmptyState
        icon={FileWarning}
        title="Access restricted"
        description="This internal preview is available for teacher, branch supervisor, and HQ roles only."
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Internal PDF preview"
        description="Staff and dev-only HTML preview of the released-report PDF template. Uses demo fixtures only."
      />

      <div className="rounded-lg border border-amber-200/80 bg-amber-50/60 dark:bg-amber-950/25 px-4 py-3 space-y-2 text-sm">
        <p className="font-medium text-foreground">Internal PDF preview</p>
        <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
          <li>Fake/dev data only — no live reports or Supabase reads.</li>
          <li>Not visible to parents — no ParentView surface.</li>
          <li>No file is generated or stored yet — HTML preview only.</li>
        </ul>
        <p className="text-xs text-muted-foreground pt-1">
          No download, no storage upload, no AI/provider calls.{' '}
          <Link to="/ai-parent-reports" className="text-primary underline-offset-4 hover:underline font-medium">
            Back to AI Parent Reports
          </Link>
        </p>
      </div>

      <Card className="p-4 space-y-4">
        <div className="space-y-2 max-w-md">
          <Label htmlFor="apr-pdf-variant">Demo fixture variant</Label>
          <Select value={variant} onValueChange={setVariant}>
            <SelectTrigger id="apr-pdf-variant">
              <SelectValue placeholder="Select variant" />
            </SelectTrigger>
            <SelectContent>
              {VARIANT_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {!renderResult.ok ? (
          <p className="text-sm text-destructive">
            Preview could not be built: {renderResult.error}
          </p>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
              Rendered via <code className="text-[11px] bg-muted px-1 rounded">renderReleasedReportPdfHtml</code>
              {' '}— shown in a sandboxed iframe (scripts disabled).
            </p>
            <iframe
              key={variant}
              title="Internal PDF HTML preview"
              className="w-full min-h-[70vh] rounded-md border bg-background"
              srcDoc={renderResult.html}
              sandbox=""
              referrerPolicy="no-referrer"
            />
          </div>
        )}
      </Card>
    </div>
  );
}
