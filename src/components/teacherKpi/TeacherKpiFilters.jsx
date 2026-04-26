import React from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function TeacherKpiFilters({
  role,
  branches,
  teachers,
  classes,
  filters,
  onFilterChange,
}) {
  return (
    <Card className="p-5 mb-6">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
        {role !== 'teacher' && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Branch</p>
            <Select value={filters.branchId} onValueChange={(value) => onFilterChange('branchId', value)}>
              <SelectTrigger><SelectValue placeholder="All branches" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All branches</SelectItem>
                {branches.map((branch) => (
                  <SelectItem key={branch.id} value={branch.id}>{branch.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {role !== 'teacher' && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Teacher</p>
            <Select value={filters.teacherEmail} onValueChange={(value) => onFilterChange('teacherEmail', value)}>
              <SelectTrigger><SelectValue placeholder="All teachers" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All teachers</SelectItem>
                {teachers.map((teacher) => (
                  <SelectItem key={teacher.email} value={teacher.email}>{teacher.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Class</p>
          <Select value={filters.classId} onValueChange={(value) => onFilterChange('classId', value)}>
            <SelectTrigger><SelectValue placeholder="All classes" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All classes</SelectItem>
              {classes.map((item) => (
                <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">From</p>
          <Input type="date" value={filters.fromDate} onChange={(e) => onFilterChange('fromDate', e.target.value)} />
        </div>

        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">To</p>
          <Input type="date" value={filters.toDate} onChange={(e) => onFilterChange('toDate', e.target.value)} />
        </div>
      </div>
    </Card>
  )
}