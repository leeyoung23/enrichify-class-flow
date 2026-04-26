import React from 'react';
import { Card } from '@/components/ui/card';

export default function TeacherAttentionSection({ items = [] }) {
  return (
    <Card className="p-5">
      <h3 className="font-semibold mb-1">Students Needing Attention</h3>
      <p className="text-sm text-muted-foreground mb-4">Only the most important follow-ups for today.</p>
      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.id} className="rounded-lg border border-border bg-accent/20 px-3 py-3">
            <p className="text-sm font-medium">{item.student_name}</p>
            <p className="text-xs text-muted-foreground mt-1">{item.issue}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}