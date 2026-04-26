import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listClasses, listStudentsByClass, listAttendanceRecords } from '@/services/dataService';
import { saveAttendanceRecord, saveAttendanceNotes } from '@/services/classSessionService';
import { isTeacherRole } from '@/services/permissionService';
import { ClipboardCheck, Check, X, Clock, Umbrella } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';

export default function Attendance() {
  const { user } = useOutletContext();
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const queryClient = useQueryClient();
  const isTeacher = isTeacherRole(user);

  const { data: classes = [] } = useQuery({
    queryKey: ['classes-for-attendance', user?.role, user?.email],
    queryFn: () => listClasses(user),
    enabled: !!user,
  });

  const { data: students = [] } = useQuery({
    queryKey: ['students-for-class', selectedClassId, user?.role],
    queryFn: () => listStudentsByClass(user, selectedClassId),
    enabled: !!selectedClassId && !!user,
  });

  const { data: existingRecords = [] } = useQuery({
    queryKey: ['attendance', selectedClassId, selectedDate, user?.role],
    queryFn: () => listAttendanceRecords(user, { class_id: selectedClassId, date: selectedDate }),
    enabled: !!selectedClassId && !!selectedDate && !!user,
  });

  const saveMutation = useMutation({
    mutationFn: ({ studentId, field, value }) => saveAttendanceRecord(existingRecords, selectedClassId, selectedDate, studentId, field, value),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['attendance'] }),
  });

  const notesMutation = useMutation({
    mutationFn: ({ studentId, notes }) => saveAttendanceNotes(existingRecords, selectedClassId, selectedDate, studentId, notes),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['attendance'] }),
  });

  const getRecord = (studentId) => existingRecords.find(r => r.student_id === studentId);

  const handleMark = async (studentId, field, value) => {
    const existing = getRecord(studentId);
    saveMutation.mutate({ studentId, field, value });
  };

  const handleNotesChange = (studentId, notes) => {
    const existing = getRecord(studentId);
    if (existing) {
      notesMutation.mutate({ studentId, notes });
    }
  };

  const statusIcon = (status) => {
    if (status === 'present') return <Check className="h-4 w-4 text-green-600" />;
    if (status === 'absent') return <X className="h-4 w-4 text-red-600" />;
    if (status === 'late') return <Clock className="h-4 w-4 text-amber-600" />;
    if (status === 'leave') return <Umbrella className="h-4 w-4 text-blue-500" />;
    return null;
  };

  return (
    <div>
      <PageHeader title="Attendance" description={isTeacher ? 'See and manage attendance for your assigned classes only using demo data only.' : user?.role === 'branch_supervisor' ? 'Review branch attendance records using demo data only.' : 'Review all-branch attendance records using demo data only.'} />

      <Card className="p-5 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <Select value={selectedClassId} onValueChange={setSelectedClassId}>
              <SelectTrigger><SelectValue placeholder="Select a class" /></SelectTrigger>
              <SelectContent>
                {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
          </div>
        </div>
      </Card>

      {!selectedClassId ? (
        <EmptyState
          icon={ClipboardCheck}
          title="Select a class"
          description="Choose a class and date above to start marking attendance."
        />
      ) : students.length === 0 ? (
        <EmptyState
          icon={ClipboardCheck}
          title="No students in this class"
          description="Add students to this class first."
        />
      ) : (
        <div className="space-y-3">
          {students.map((student) => {
            const record = getRecord(student.id);
            return (
              <Card key={student.id} className="p-4">
                <div className="flex flex-col md:flex-row md:items-center gap-4">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="h-9 w-9 rounded-full bg-accent flex items-center justify-center text-accent-foreground font-semibold text-sm flex-shrink-0">
                      {student.name[0].toUpperCase()}
                    </div>
                    <span className="font-medium truncate">{student.name}</span>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-muted-foreground mr-1">Attendance:</span>
                    {['present', 'absent', 'late', 'leave'].map((status) => (
                      <Button
                        key={status}
                        variant={record?.status === status ? 'default' : 'outline'}
                        size="sm"
                        className={`gap-1 text-xs ${
                          record?.status === status 
                            ? status === 'present' ? 'bg-green-600 hover:bg-green-700' 
                              : status === 'absent' ? 'bg-red-600 hover:bg-red-700'
                              : status === 'late' ? 'bg-amber-600 hover:bg-amber-700'
                              : 'bg-blue-500 hover:bg-blue-600'
                            : ''
                        }`}
                        onClick={() => handleMark(student.id, 'status', status)}
                      >
                        {statusIcon(status)} {status}
                      </Button>
                    ))}
                  </div>


                </div>

                {record && (
                  <div className="mt-3">
                    <Textarea
                      placeholder="Add notes..."
                      defaultValue={record.notes || ''}
                      onBlur={(e) => handleNotesChange(student.id, e.target.value)}
                      className="h-16 text-sm"
                    />
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}