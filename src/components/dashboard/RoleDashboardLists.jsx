import React from 'react';
import { Card } from '@/components/ui/card';

export function DashboardListCard({ title, items, emptyText }) {
  return (
    <Card className="p-5">
      <h3 className="font-semibold mb-3">{title}</h3>
      {items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-muted/30 px-4 py-6">
          <p className="text-sm text-muted-foreground">{emptyText}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <div key={item.id} className="rounded-lg border border-border bg-accent/20 px-3 py-2">
              <p className="text-sm font-medium">{item.title}</p>
              {item.meta && <p className="text-xs text-muted-foreground mt-1">{item.meta}</p>}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

export function DashboardSectionGrid({ children }) {
  return <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">{children}</div>;
}