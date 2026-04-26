import React from 'react';
import { Card } from '@/components/ui/card';

const STATUS_STYLES = {
  Excellent: 'bg-green-100 text-green-700 border-green-200',
  'On Track': 'bg-blue-100 text-blue-700 border-blue-200',
  'Needs Attention': 'bg-amber-100 text-amber-700 border-amber-200',
};

export default function BranchPerformanceTable({ rows, role, userBranchId }) {
  return (
    <Card className="p-5">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted-foreground">
              <th className="py-3 pr-4 font-medium">Rank</th>
              <th className="py-3 pr-4 font-medium">Branch</th>
              <th className="py-3 pr-4 font-medium">Attendance</th>
              <th className="py-3 pr-4 font-medium">Homework</th>
              <th className="py-3 pr-4 font-medium">Reports</th>
              <th className="py-3 pr-4 font-medium">Teacher Tasks</th>
              <th className="py-3 pr-4 font-medium">Observations</th>
              <th className="py-3 pr-4 font-medium">Lead Follow-Up</th>
              <th className="py-3 pr-4 font-medium">Student Follow-Up</th>
              <th className="py-3 pr-4 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const isOwnBranch = role === 'branch_supervisor' && row.branch_id === userBranchId;
              return (
                <tr key={row.branch_id} className={isOwnBranch ? 'bg-accent/20' : 'border-b border-border/60'}>
                  <td className="py-4 pr-4 font-semibold text-foreground">#{row.rank}</td>
                  <td className="py-4 pr-4">
                    <div className="font-medium text-foreground">{row.branch_name}</div>
                    <div className="text-xs text-muted-foreground">Overall score: {row.overallScore}%</div>
                  </td>
                  <td className="py-4 pr-4">{row.attendanceRate}%</td>
                  <td className="py-4 pr-4">{row.homeworkRate}%</td>
                  <td className="py-4 pr-4">{row.parentReportsRate}%</td>
                  <td className="py-4 pr-4">{row.teacherTaskRate}%</td>
                  <td className="py-4 pr-4">{row.observationRate}%</td>
                  <td className="py-4 pr-4">{row.leadFollowUpRate}%</td>
                  <td className="py-4 pr-4">{row.studentFollowUpRate}%</td>
                  <td className="py-4 pr-4">
                    <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${STATUS_STYLES[row.statusLabel]}`}>
                      {row.statusLabel}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}