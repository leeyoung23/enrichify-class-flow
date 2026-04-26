import React from 'react';
import StatCard from '@/components/shared/StatCard';
import { Building2, Trophy, CircleCheckBig, AlertTriangle } from 'lucide-react';

export default function BranchPerformanceSummaryCards({ summary }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
      <StatCard label="Branches in View" value={summary.branchesInView} icon={Building2} />
      <StatCard label="Top Score" value={`${summary.topScore}%`} icon={Trophy} />
      <StatCard label="Excellent Branches" value={summary.excellentCount} icon={CircleCheckBig} />
      <StatCard label="Needs Attention" value={summary.needsAttentionCount} icon={AlertTriangle} />
    </div>
  );
}