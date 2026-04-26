import React from 'react';
import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export default function ObservationList({ observations }) {
  return (
    <div className="space-y-4">
      {observations.map((item) => (
        <Card key={item.id} className="p-5">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3 mb-3">
            <div>
              <h3 className="font-semibold">{item.teacher_name}</h3>
              <p className="text-sm text-muted-foreground">{item.class_name} • {item.branch_name} • {item.observation_date}</p>
              <p className="text-sm text-muted-foreground mt-1">Observer: {item.observer_name}</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline">{item.status}</Badge>
              <Button asChild variant="outline" size="sm">
                <Link to={`/observations/${item.id}`}>View Detail</Link>
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3 text-sm">
            <div className="rounded-lg bg-accent/40 p-3">Management: <span className="font-semibold">{item.classroom_management_score}/5</span></div>
            <div className="rounded-lg bg-accent/40 p-3">Delivery: <span className="font-semibold">{item.teaching_delivery_score}/5</span></div>
            <div className="rounded-lg bg-accent/40 p-3">Engagement: <span className="font-semibold">{item.student_engagement_score}/5</span></div>
            <div className="rounded-lg bg-accent/40 p-3">Preparation: <span className="font-semibold">{item.lesson_preparation_score}/5</span></div>
            <div className="rounded-lg bg-accent/40 p-3">Parent Communication: <span className="font-semibold">{item.parent_communication_score}/5</span></div>
          </div>
        </Card>
      ))}
    </div>
  );
}