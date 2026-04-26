import React from 'react';
import { Card } from '@/components/ui/card';

export default function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <Card className="p-12 flex flex-col items-center text-center">
      <div className="p-4 rounded-2xl bg-accent mb-4">
        <Icon className="h-8 w-8 text-accent-foreground" />
      </div>
      <h3 className="font-semibold text-lg">{title}</h3>
      <p className="text-muted-foreground mt-1 max-w-sm">{description}</p>
      {action && <div className="mt-6">{action}</div>}
    </Card>
  );
}