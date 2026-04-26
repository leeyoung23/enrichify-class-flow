import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText } from 'lucide-react';

const STATUS_STYLES = {
  received: 'bg-slate-100 text-slate-700 border-slate-200',
  ai_draft_ready: 'bg-blue-100 text-blue-700 border-blue-200',
  teacher_reviewed: 'bg-amber-100 text-amber-700 border-amber-200',
  feedback_released: 'bg-green-100 text-green-700 border-green-200',
};

export default function StudentHomeworkUploadHistory({ items }) {
  return (
    <Card className="mt-3 border-dashed">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Homework Upload History</CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No homework uploads yet for this demo student.</p>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <div key={item.id} className="rounded-lg border p-3 text-sm">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-2">
                  <div className="flex items-center gap-2 font-medium">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span>{item.file_name}</span>
                  </div>
                  <Badge variant="outline" className={STATUS_STYLES[item.status] || ''}>{item.status_label}</Badge>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-muted-foreground">
                  <p>Upload date: <span className="text-foreground">{item.upload_date}</span></p>
                  <p>AI draft status: <span className="text-foreground">{item.ai_draft_status}</span></p>
                  <p>Teacher reviewed: <span className="text-foreground">{item.teacher_review_status}</span></p>
                  <p>Final feedback: <span className="text-foreground">{item.parent_feedback_status}</span></p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}