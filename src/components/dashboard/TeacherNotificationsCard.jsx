import React from 'react';
import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const STATUS_STYLES = {
  pending: 'bg-blue-100 text-blue-700 border-blue-200',
  completed: 'bg-green-100 text-green-700 border-green-200',
  overdue: 'bg-amber-100 text-amber-700 border-amber-200',
};

const PRIORITY_STYLES = {
  high: 'bg-red-100 text-red-700 border-red-200',
  medium: 'bg-orange-100 text-orange-700 border-orange-200',
  low: 'bg-slate-100 text-slate-700 border-slate-200',
};

export default function TeacherNotificationsCard({ items = [] }) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="font-semibold">Teacher Task Notifications</h3>
          <p className="text-sm text-muted-foreground">Only the most urgent teacher actions.</p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link to="/my-tasks">Open My Tasks</Link>
        </Button>
      </div>
      {items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-muted/30 px-4 py-6">
          <p className="text-sm text-muted-foreground">No urgent notifications right now.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.id} className="rounded-lg border border-border bg-accent/20 px-3 py-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-medium">{item.title}</p>
                  <p className="text-xs text-muted-foreground mt-1">{item.related_label ? `Related: ${item.related_label}` : ''}</p>
                  <p className="text-xs text-muted-foreground">Due: {item.due_label}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className={`text-[11px] px-2 py-0.5 rounded-full border font-medium ${STATUS_STYLES[item.status]}`}>
                    {item.status}
                  </span>
                  <span className={`text-[11px] px-2 py-0.5 rounded-full border font-medium ${PRIORITY_STYLES[item.priority]}`}>
                    {item.priority}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}