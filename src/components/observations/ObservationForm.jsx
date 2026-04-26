import React from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function ObservationForm({ open, onOpenChange, form, onChange, onSubmit, branches, classes, teachers, observerName }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Create Observation</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2 max-h-[70vh] overflow-y-auto pr-1">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Observation Date</Label>
              <Input type="date" value={form.observation_date} onChange={(e) => onChange('observation_date', e.target.value)} />
            </div>
            <div>
              <Label>Observer Name</Label>
              <Input value={observerName} disabled />
            </div>
            <div>
              <Label>Branch</Label>
              <Select value={form.branch_id} onValueChange={(value) => onChange('branch_id', value)}>
                <SelectTrigger><SelectValue placeholder="Select branch" /></SelectTrigger>
                <SelectContent>
                  {branches.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Class</Label>
              <Select value={form.class_id} onValueChange={(value) => onChange('class_id', value)}>
                <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                <SelectContent>
                  {classes.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Teacher</Label>
              <Select value={form.teacher_email} onValueChange={(value) => onChange('teacher_email', value)}>
                <SelectTrigger><SelectValue placeholder="Select teacher" /></SelectTrigger>
                <SelectContent>
                  {teachers.map((item) => <SelectItem key={item.email} value={item.email}>{item.full_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(value) => onChange('status', value)}>
                <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="follow-up required">Follow-up Required</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div>
              <Label>Classroom Management</Label>
              <Input type="number" min="1" max="5" value={form.classroom_management_score} onChange={(e) => onChange('classroom_management_score', e.target.value)} />
            </div>
            <div>
              <Label>Teaching Delivery</Label>
              <Input type="number" min="1" max="5" value={form.teaching_delivery_score} onChange={(e) => onChange('teaching_delivery_score', e.target.value)} />
            </div>
            <div>
              <Label>Student Engagement</Label>
              <Input type="number" min="1" max="5" value={form.student_engagement_score} onChange={(e) => onChange('student_engagement_score', e.target.value)} />
            </div>
            <div>
              <Label>Lesson Preparation</Label>
              <Input type="number" min="1" max="5" value={form.lesson_preparation_score} onChange={(e) => onChange('lesson_preparation_score', e.target.value)} />
            </div>
            <div>
              <Label>Parent Communication</Label>
              <Input type="number" min="1" max="5" value={form.parent_communication_score} onChange={(e) => onChange('parent_communication_score', e.target.value)} />
            </div>
          </div>

          <div>
            <Label>Strengths Observed</Label>
            <Textarea value={form.strengths_observed} onChange={(e) => onChange('strengths_observed', e.target.value)} />
          </div>
          <div>
            <Label>Areas for Improvement</Label>
            <Textarea value={form.areas_for_improvement} onChange={(e) => onChange('areas_for_improvement', e.target.value)} />
          </div>
          <div>
            <Label>Follow-up Action</Label>
            <Textarea value={form.follow_up_action} onChange={(e) => onChange('follow_up_action', e.target.value)} />
          </div>
          <div>
            <Label>Follow-up Due Date</Label>
            <Input type="date" value={form.follow_up_due_date} onChange={(e) => onChange('follow_up_due_date', e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={onSubmit}>Save Observation</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}