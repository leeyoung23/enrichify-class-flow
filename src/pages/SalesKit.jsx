import React from 'react';
import { FileText, Link2, ShieldCheck } from 'lucide-react';
import PageHeader from '@/components/shared/PageHeader';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

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

export default function SalesKit() {
  return (
    <div>
      <PageHeader
        title="Sales Kit"
        description="Approved sales and parent-facing resources for branch supervisors. Demo resources only."
      />

      <div className="space-y-4">
        {DEMO_RESOURCES.map((resource) => (
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
              <Button asChild variant="outline">
                <a href="#" onClick={(event) => event.preventDefault()}>
                  {resource.buttonLabel}
                </a>
              </Button>
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
