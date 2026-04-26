import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

function ScoreRow({ label, value }) {
  return (
    <div className="rounded-lg bg-accent/30 p-3 text-sm">
      <p className="text-muted-foreground">{label}</p>
      <p className="font-semibold mt-1">{value}/5</p>
    </div>
  );
}

export default function ObservationDetail({ observation }) {
  if (!observation) return null;

  return (
    <Card className="p-5">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-5">
        <div>
          <h3 className="font-semibold text-lg">{observation.teacher_name}</h3>
          <p className="text-sm text-muted-foreground">{observation.class_name} • {observation.branch_name} • {observation.observation_date}</p>
          <p className="text-sm text-muted-foreground mt-1">Observed by {observation.observer_name}</p>
        </div>
        <Badge variant="outline">{observation.status}</Badge>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3 mb-5">
        <ScoreRow label="Classroom Management" value={observation.classroom_management_score} />
        <ScoreRow label="Teaching Delivery" value={observation.teaching_delivery_score} />
        <ScoreRow label="Student Engagement" value={observation.student_engagement_score} />
        <ScoreRow label="Lesson Preparation" value={observation.lesson_preparation_score} />
        <ScoreRow label="Parent Communication" value={observation.parent_communication_score} />
      </div>

      <div className="space-y-4 text-sm">
        <div>
          <p className="font-medium mb-1">Strengths Observed</p>
          <p className="text-muted-foreground">{observation.strengths_observed}</p>
        </div>
        <div>
          <p className="font-medium mb-1">Areas for Improvement</p>
          <p className="text-muted-foreground">{observation.areas_for_improvement}</p>
        </div>
        <div>
          <p className="font-medium mb-1">Follow-up Action</p>
          <p className="text-muted-foreground">{observation.follow_up_action}</p>
        </div>
        <div>
          <p className="font-medium mb-1">Follow-up Due Date</p>
          <p className="text-muted-foreground">{observation.follow_up_due_date}</p>
        </div>
      </div>
    </Card>
  );
}