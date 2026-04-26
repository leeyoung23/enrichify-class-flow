import React from 'react';
import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function UpcomingTrialsCard({ items = [] }) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="font-semibold">Trial Scheduling</h3>
          <p className="text-sm text-muted-foreground">Next scheduled trial classes for this branch.</p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link to="/trial-scheduling">Open Trial Scheduling</Link>
        </Button>
      </div>
      {items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-muted/30 px-4 py-6">
          <p className="text-sm text-muted-foreground">No upcoming trials scheduled.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.id} className="rounded-lg border border-border bg-accent/20 px-3 py-3">
              <p className="text-sm font-medium">{item.child_name}</p>
              <p className="text-xs text-muted-foreground mt-1">{item.interested_programme} • {item.trial_class_date} at {item.trial_class_time}</p>
              <p className="text-xs text-muted-foreground mt-1">Teacher: {item.assigned_teacher_name}</p>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}