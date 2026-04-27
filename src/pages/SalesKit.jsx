import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useOutletContext } from 'react-router-dom';
import { FileText, Link2, ShieldCheck } from 'lucide-react';
import PageHeader from '@/components/shared/PageHeader';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getApprovedSalesKitResources } from '@/services/supabaseReadService';
import { isSupabaseConfigured } from '@/services/supabaseClient';
import { getSelectedDemoRole } from '@/services/authService';
import { ROLES } from '@/services/permissionService';

const DEMO_RESOURCES = [
  {
    id: 'consultation-pack',
    title: 'Parent Consultation Pack',
    type: 'PDF',
    description: 'Parent-facing explanation of programme value, class flow, and learning outcomes.',
    buttonLabel: 'Open demo PDF',
  },
  {
    id: 'trial-conversion-script',
    title: 'Trial Class Conversion Script',
    type: 'Guide',
    description: 'Talking points for supervisors after trial classes.',
    buttonLabel: 'Open demo guide',
  },
  {
    id: 'fee-package-guide',
    title: 'Programme Fee & Package Guide',
    type: 'PDF',
    description: 'Demo fee/package reference for supervisor use.',
    buttonLabel: 'Open demo PDF',
  },
  {
    id: 'parent-faq',
    title: 'Parent FAQ',
    type: 'Web link',
    description: 'Common parent questions and suggested answers.',
    buttonLabel: 'Open demo link',
  },
  {
    id: 'weekly-report-sample',
    title: 'Weekly Report Sample',
    type: 'PDF',
    description: 'Example of a parent-facing weekly progress report.',
    buttonLabel: 'Open demo sample',
  },
];

function mapSupabaseResourceToCard(resource) {
  const type = resource?.resource_type || (resource?.external_url ? 'Web link' : 'File');
  const buttonLabel = resource?.external_url ? 'Open resource link' : resource?.file_path ? 'Open resource file' : 'Open demo resource';
  return {
    id: resource?.id || 'supabase-resource-unknown',
    title: resource?.title || 'Untitled resource',
    type,
    description: resource?.description || 'Approved Sales Kit resource loaded from Supabase test data.',
    buttonLabel,
    href: resource?.external_url || null,
  };
}

export default function SalesKit() {
  const { user } = useOutletContext();
  const selectedDemoRole = getSelectedDemoRole();
  const role = user?.role;
  const isSalesKitRole = role === ROLES.HQ_ADMIN || role === ROLES.BRANCH_SUPERVISOR;
  const shouldAttemptSupabaseRead = !selectedDemoRole && isSalesKitRole && isSupabaseConfigured();

  const { data: supabaseResult } = useQuery({
    queryKey: ['sales-kit-supabase-approved-resources', role, user?.branch_id],
    queryFn: getApprovedSalesKitResources,
    enabled: shouldAttemptSupabaseRead,
  });

  const supabaseResources = Array.isArray(supabaseResult?.data)
    ? supabaseResult.data.map(mapSupabaseResourceToCard)
    : [];
  const usingSupabaseData =
    shouldAttemptSupabaseRead &&
    !supabaseResult?.error &&
    supabaseResources.length > 0;
  const resources = usingSupabaseData ? supabaseResources : DEMO_RESOURCES;
  const sourceLabel = usingSupabaseData ? 'Loaded from Supabase test data' : 'Demo resources';

  return (
    <div>
      <PageHeader
        title="Sales Kit"
        description="Approved sales and parent-facing resources for branch supervisors. Demo resources only."
      />

      <p className="text-xs text-muted-foreground mb-3">{sourceLabel}</p>

      <div className="space-y-4">
        {resources.map((resource) => (
          <Card key={resource.id} className="p-5">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  {resource.type === 'Web link'
                    ? <Link2 className="h-4 w-4 text-primary" />
                    : <FileText className="h-4 w-4 text-primary" />}
                  <h3 className="font-semibold">{resource.title}</h3>
                </div>
                <p className="text-xs text-muted-foreground">Type: {resource.type}</p>
                <p className="text-sm text-muted-foreground">{resource.description}</p>
              </div>
              {resource.href ? (
                <Button asChild variant="outline">
                  <a href={resource.href} target="_blank" rel="noreferrer">
                    {resource.buttonLabel}
                  </a>
                </Button>
              ) : (
                <Button asChild variant="outline">
                  <a href="#" onClick={(event) => event.preventDefault()}>
                    {resource.buttonLabel}
                  </a>
                </Button>
              )}
            </div>
          </Card>
        ))}
      </div>

      <Card className="p-4 mt-6 border-dashed">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            In production, HQ will manage these resources and approved files can be stored in secure Supabase Storage.
          </p>
          <Button disabled variant="outline" className="gap-2">
            <ShieldCheck className="h-4 w-4" />
            Manage resources - HQ only / coming soon
          </Button>
        </div>
      </Card>
    </div>
  );
}
