import React from 'react';
import { Card } from '@/components/ui/card';

export default function StatCard({ label, value, icon: Icon, color }) {
  return (
    <Card className="p-5 hover:shadow-lg transition-shadow duration-300">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground font-medium">{label}</p>
          <p className="text-3xl font-bold mt-1 tracking-tight">{value}</p>
        </div>
        <div className={`p-2.5 rounded-xl ${color || 'bg-primary/10'}`}>
          <Icon className={`h-5 w-5 ${color ? 'text-white' : 'text-primary'}`} />
        </div>
      </div>
    </Card>
  );
}