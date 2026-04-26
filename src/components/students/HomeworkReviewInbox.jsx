import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import EmptyState from '@/components/shared/EmptyState';
import { Inbox, FileText } from 'lucide-react';

const STATUS_STYLES = {
  received: 'bg-slate-100 text-slate-700 border-slate-200',
  ai_draft_ready: 'bg-blue-100 text-blue-700 border-blue-200',
  teacher_reviewed: 'bg-amber-100 text-amber-700 border-amber-200',
  feedback_released: 'bg-green-100 text-green-700 border-green-200',
};

export default function HomeworkReviewInbox({ items }) {
  if (!items.length) {
    return (
      <EmptyState
        icon={Inbox}
        title="No homework uploads"
        description="Uploaded homework and learning material attachments will appear here for teacher review."
      />
    );
  }

  return (
    <div className="space-y-4">
      {items.map((item) => (
        <Card key={item.id}>
          <CardHeader className="pb-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-base">{item.student_name}</CardTitle>
                <p className="text-sm text-muted-foreground">{item.class_name} • Uploaded {item.upload_date}</p>
              </div>
              <Badge variant="outline" className={STATUS_STYLES[item.status] || ''}>{item.status_label}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4 text-sm">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Uploaded file</p>
                <div className="rounded-lg border p-3 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span>{item.file_name}</span>
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">AI draft result</p>
                <p className="rounded-lg border p-3">{item.ai_draft_result}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">AI confidence</p>
                <p className="rounded-lg border p-3">{item.ai_confidence}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Teacher review</p>
                <p className="rounded-lg border p-3">{item.teacher_review_status}</p>
              </div>
            </div>
            <div className="rounded-lg border p-3 text-sm">
              <p className="text-xs text-muted-foreground mb-1">Teacher comment</p>
              <p>{item.teacher_comment}</p>
            </div>
            <div className="flex justify-end">
              <Button size="sm" variant="outline">Approve Feedback</Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}