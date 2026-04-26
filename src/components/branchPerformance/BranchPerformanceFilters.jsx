import React from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function BranchPerformanceFilters({ role, branches, filters, onFilterChange }) {
  return (
    <Card className="p-5 mb-6">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">From</p>
          <Input type="date" value={filters.fromDate} onChange={(e) => onFilterChange('fromDate', e.target.value)} />
        </div>
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">To</p>
          <Input type="date" value={filters.toDate} onChange={(e) => onFilterChange('toDate', e.target.value)} />
        </div>
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Branch</p>
          <Select value={filters.branchId} onValueChange={(value) => onFilterChange('branchId', value)}>
            <SelectTrigger>
              <SelectValue placeholder="All branches" />
            </SelectTrigger>
            <SelectContent>
              {role === 'hq_admin' && <SelectItem value="all">All branches</SelectItem>}
              {branches.map((branch) => (
                <SelectItem key={branch.id} value={branch.id}>{branch.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </Card>
  );
}