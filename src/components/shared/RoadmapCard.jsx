import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function RoadmapCard({ title, description, items, badge = 'Future-ready' }) {
  return (
    <Card className="p-6">
      <div className="flex items-center justify-between gap-3 mb-3">
        <h3 className="font-semibold">{title}</h3>
        <Badge variant="outline">{badge}</Badge>
      </div>
      <p className="text-sm text-muted-foreground mb-4">{description}</p>
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item} className="rounded-lg border border-border bg-accent/20 px-3 py-2 text-sm">
            {item}
          </div>
        ))}
      </div>
    </Card>
  );
}