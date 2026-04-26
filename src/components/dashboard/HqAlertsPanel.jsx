import React from 'react';
import { Card } from '@/components/ui/card';

function SimpleList({ title, items, emptyText }) {
  return (
    <Card className="p-6">
      <h3 className="font-semibold mb-4">{title}</h3>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{emptyText}</p>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.id} className="rounded-lg border border-border p-3 bg-accent/20">
              <p className="text-sm font-medium">{item.title}</p>
              <p className="text-xs text-muted-foreground mt-1">{item.meta}</p>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

export default function HqAlertsPanel({ missingReports, incompleteAttendance, pendingApprovals, leadsSummary }) {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
      <SimpleList title="Students with Missing Reports" items={missingReports} emptyText="All reports are up to date." />
      <SimpleList title="Classes with Incomplete Attendance" items={incompleteAttendance} emptyText="All attendance has been completed." />
      <SimpleList title="Parent Updates Pending Approval" items={pendingApprovals} emptyText="No parent updates are waiting for approval." />
      <SimpleList title="Leads & Enrolment Summary" items={leadsSummary} emptyText="No lead activity available." />
    </div>
  );
}