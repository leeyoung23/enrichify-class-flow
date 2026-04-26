import React from 'react';
import StatCard from '@/components/shared/StatCard';
import { FileText, ClipboardCheck, Sparkles, Send } from 'lucide-react';

export default function HomeworkUploadSummaryCards({ summary }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
      <StatCard label="Uploads Received" value={summary.totalUploads} icon={FileText} />
      <StatCard label="Pending Review" value={summary.pendingTeacherReview} icon={ClipboardCheck} />
      <StatCard label="AI Draft Ready" value={summary.aiDraftReady} icon={Sparkles} />
      <StatCard label="Feedback Released" value={summary.feedbackReleased} icon={Send} />
    </div>
  );
}