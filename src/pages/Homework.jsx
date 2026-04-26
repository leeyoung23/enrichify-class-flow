import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { BookOpen, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';

const SAMPLE_CLASSES = [
  { id: 'c1', name: 'Demo English A', branch: 'North Learning Hub' },
  { id: 'c2', name: 'Demo Maths B', branch: 'North Learning Hub' },
  { id: 'c3', name: 'Demo Science C', branch: 'South Study Studio' },
];

const SAMPLE_HOMEWORK = {
  c1: [
    { id: 's1', name: 'Demo Student A1', status: 'submitted', notes: '' },
    { id: 's2', name: 'Demo Student A2', status: 'incomplete', notes: 'Missing final section' },
    { id: 's3', name: 'Demo Student A3', status: 'not_submitted', notes: '' },
    { id: 's4', name: 'Demo Student A4', status: 'follow_up', notes: 'Needs reminder' },
    { id: 's5', name: 'Demo Student A5', status: 'submitted', notes: '' },
  ],
  c2: [
    { id: 's6', name: 'Demo Student B1', status: 'submitted', notes: '' },
    { id: 's7', name: 'Demo Student B2', status: 'submitted', notes: '' },
    { id: 's8', name: 'Demo Student B3', status: 'not_submitted', notes: '' },
    { id: 's9', name: 'Demo Student B4', status: 'follow_up', notes: 'Needs follow-up' },
  ],
  c3: [
    { id: 's10', name: 'Demo Student C1', status: 'submitted', notes: '' },
    { id: 's11', name: 'Demo Student C2', status: 'incomplete', notes: 'Partially done' },
    { id: 's12', name: 'Demo Student C3', status: 'submitted', notes: '' },
  ],
};

const STATUS_CONFIG = {
  submitted: { label: 'Submitted', color: 'bg-green-100 text-green-700 border-green-200', icon: CheckCircle2, iconColor: 'text-green-600' },
  incomplete: { label: 'Incomplete', color: 'bg-amber-100 text-amber-700 border-amber-200', icon: AlertCircle, iconColor: 'text-amber-600' },
  not_submitted: { label: 'Not Submitted', color: 'bg-red-100 text-red-700 border-red-200', icon: XCircle, iconColor: 'text-red-600' },
  follow_up: { label: 'Follow-up Needed', color: 'bg-purple-100 text-purple-700 border-purple-200', icon: AlertCircle, iconColor: 'text-purple-600' },
};

export default function Homework() {
  const { user } = useOutletContext();
  const demoRole = user?.role || 'teacher';
  const visibleClasses = demoRole === 'teacher'
    ? SAMPLE_CLASSES.filter((item) => item.branch === 'North Learning Hub' && ['c1', 'c2'].includes(item.id))
    : demoRole === 'branch_supervisor'
      ? SAMPLE_CLASSES.filter((item) => item.branch === 'North Learning Hub')
      : SAMPLE_CLASSES;
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedDate, setSelectedDate] = useState('2026-04-25');
  const [records, setRecords] = useState(SAMPLE_HOMEWORK);

  const students = records[selectedClassId] || [];
  const selectedClass = visibleClasses.find(c => c.id === selectedClassId);

  const summary = Object.entries(STATUS_CONFIG).map(([key, cfg]) => ({
    key,
    label: cfg.label,
    count: students.filter(s => s.status === key).length,
    color: cfg.color,
  }));

  const handleStatusChange = (studentId, newStatus) => {
    setRecords(prev => ({
      ...prev,
      [selectedClassId]: prev[selectedClassId].map(s =>
        s.id === studentId ? { ...s, status: newStatus } : s
      ),
    }));
  };

  return (
    <div>
      <PageHeader
        title={demoRole === 'teacher' ? 'My Homework' : 'Homework Tracker'}
        description={demoRole === 'teacher' ? 'See and manage homework for your assigned classes only using demo data only.' : 'Track homework submission status for each class.'}
      />

      <Card className="p-5 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <Select value={selectedClassId} onValueChange={setSelectedClassId}>
              <SelectTrigger><SelectValue placeholder="Select a class" /></SelectTrigger>
              <SelectContent>
                {visibleClasses.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name} — {c.branch}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} />
          </div>
        </div>
      </Card>

      {visibleClasses.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No homework classes available"
          description="No classes are available for this role in demo mode."
        />
      ) : !selectedClassId ? (
        <EmptyState
          icon={BookOpen}
          title="Select a class"
          description="Choose a class and date above to view homework status."
        />
      ) : (
        <>
          {/* Summary Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {summary.map(s => (
              <Card key={s.key} className="p-4 text-center">
                <p className="text-2xl font-bold">{s.count}</p>
                <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
              </Card>
            ))}
          </div>

          {/* Student List */}
          <div className="space-y-3">
            {students.map(student => {
              const cfg = STATUS_CONFIG[student.status];
              const Icon = cfg.icon;
              return (
                <Card key={student.id} className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="h-9 w-9 rounded-full bg-accent flex items-center justify-center text-accent-foreground font-semibold text-sm flex-shrink-0">
                        {student.name[0]}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium truncate">{student.name}</p>
                        {student.notes && (
                          <p className="text-xs text-muted-foreground mt-0.5">{student.notes}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Icon className={`h-4 w-4 ${cfg.iconColor} flex-shrink-0`} />
                      <Select value={student.status} onValueChange={v => handleStatusChange(student.id, v)}>
                        <SelectTrigger className="w-[180px] h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="submitted">Submitted</SelectItem>
                          <SelectItem value="incomplete">Incomplete</SelectItem>
                          <SelectItem value="not_submitted">Not Submitted</SelectItem>
                          <SelectItem value="follow_up">Follow-up Needed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}