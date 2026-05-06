import React, { useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { UserPlus, Phone, Mail, Calendar, Plus, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';

const INITIAL_LEADS = [
  {
    id: '1', parentName: 'Faridah bt. Osman', childName: 'Iman Sofea', phone: '+60 11-2233 4455',
    email: 'faridah@example.com', source: 'Walk-in', status: 'new',
    interestedIn: 'English Level 2', branch: 'Downtown Centre', followUpDate: '2026-04-28', notes: 'Interested in trial class',
  },
  {
    id: '2', parentName: 'Mr. Chan Wai Keong', childName: 'Ryan Chan', phone: '+60 12-3456 7890',
    email: 'chan.wk@example.com', source: 'Referral', status: 'contacted',
    interestedIn: 'Mathematics Advanced', branch: 'Downtown Centre', followUpDate: '2026-04-27', notes: 'Referred by Sarah Lee\'s parents',
  },
  {
    id: '3', parentName: 'Puan Rohani', childName: 'Hafizuddin', phone: '+60 11-8765 4321',
    email: '', source: 'Facebook Ad', status: 'trial_scheduled',
    interestedIn: 'Science Explorers', branch: 'Subang Jaya Branch', followUpDate: '2026-04-30', notes: 'Trial on Saturday morning',
  },
  {
    id: '4', parentName: 'Mrs. Kavitha', childName: 'Arun Kumar', phone: '+60 12-9876 5432',
    email: 'kavitha@example.com', source: 'Google Search', status: 'enrolled',
    interestedIn: 'English Level 3', branch: 'Downtown Centre', followUpDate: '', notes: 'Enrolled, starts May',
  },
  {
    id: '5', parentName: 'Tan Boon Huat', childName: 'Chloe Tan', phone: '+60 11-1122 3344',
    email: 'tbh@example.com', source: 'Instagram', status: 'lost',
    interestedIn: 'Mathematics Advanced', branch: 'PJ Digital Hub', followUpDate: '', notes: 'Went to competitor',
  },
];

const STATUS_CONFIG = {
  new: { label: 'New', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  contacted: { label: 'Contacted', color: 'bg-amber-100 text-amber-700 border-amber-200' },
  trial_scheduled: { label: 'Trial Scheduled', color: 'bg-purple-100 text-purple-700 border-purple-200' },
  enrolled: { label: 'Enrolled', color: 'bg-green-100 text-green-700 border-green-200' },
  lost: { label: 'Lost', color: 'bg-gray-100 text-gray-500 border-gray-200' },
};

const SOURCE_OPTIONS = ['Walk-in', 'Referral', 'Facebook Ad', 'Instagram', 'Google Search', 'Flyer', 'Other'];
const STATUS_OPTIONS = Object.entries(STATUS_CONFIG).map(([value, { label }]) => ({ value, label }));

const EMPTY_FORM = {
  parentName: '', childName: '', phone: '', email: '',
  source: '', status: 'new', interestedIn: '', branch: '', followUpDate: '', notes: '',
};

export default function Leads() {
  const { user } = useOutletContext();
  const demoRole = user?.role || 'teacher';
  const canAccess = ['hq_admin', 'branch_supervisor', 'teacher'].includes(demoRole);
  const [leads, setLeads] = useState(INITIAL_LEADS);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const visibleLeads = useMemo(() => {
    if (demoRole === 'branch_supervisor') return leads.filter((lead) => lead.branch === 'North Learning Hub');
    if (demoRole === 'teacher') return leads.filter((lead) => lead.branch === 'North Learning Hub' && lead.status === 'trial_scheduled');
    return leads;
  }, [leads, demoRole]);

  const filtered = visibleLeads.filter(lead => {
    const matchesSearch =
      lead.parentName.toLowerCase().includes(search.toLowerCase()) ||
      lead.childName.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = filterStatus === 'all' || lead.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const handleAdd = () => {
    if (!form.parentName || !form.childName) return;
    setLeads(prev => [{ ...form, id: Date.now().toString() }, ...prev]);
    setDialogOpen(false);
    setForm(EMPTY_FORM);
  };

  const handleStatusChange = (id, newStatus) => {
    setLeads(prev => prev.map(l => l.id === id ? { ...l, status: newStatus } : l));
  };

  const summary = Object.entries(STATUS_CONFIG).map(([key, cfg]) => ({
    key, label: cfg.label,
    count: visibleLeads.filter(l => l.status === key).length,
  }));

  if (!canAccess) {
    return (
      <EmptyState
        icon={UserPlus}
        title="Access restricted"
        description="This page is not available for the current demo role."
      />
    );
  }

  return (
    <div>
      <PageHeader
        title="Leads & Enrolment"
        description={demoRole === 'hq_admin' ? 'Track all-branch enquiries and enrolment pipeline using demo data only.' : demoRole === 'branch_supervisor' ? 'Track branch enquiries, trial-ready leads, and enrolment pipeline using demo data only.' : 'Track your assigned trial-ready leads using demo data only.'}
        action={demoRole !== 'teacher' ? (
          <Button onClick={() => setDialogOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" /> Add Lead
          </Button>
        ) : null}
      />

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
        {summary.map(s => (
          <Card key={s.key} className="p-4 text-center">
            <p className="text-2xl font-bold">{s.count}</p>
            <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search parent or child name..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {STATUS_OPTIONS.map(s => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={UserPlus}
          title="No leads found"
          description="Add a new lead or adjust your filters."
          action={demoRole !== 'teacher' ? <Button onClick={() => setDialogOpen(true)}>Add Lead</Button> : null}
        />
      ) : (
        <div className="space-y-3">
          {filtered.map(lead => {
            const cfg = STATUS_CONFIG[lead.status];
            return (
              <Card key={lead.id} className="p-5">
                <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <p className="font-semibold">{lead.childName}</p>
                      <span className="text-muted-foreground text-sm">— Parent: {lead.parentName}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${cfg.color}`}>
                        {cfg.label}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground mt-1">
                      <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{lead.phone}</span>
                      {lead.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{lead.email}</span>}
                    </div>

                    <div className="flex flex-wrap gap-2 mt-2 text-xs">
                      {lead.interestedIn && (
                        <Badge variant="outline">Interested: {lead.interestedIn}</Badge>
                      )}
                      {lead.branch && (
                        <Badge variant="outline">{lead.branch}</Badge>
                      )}
                      {lead.source && (
                        <Badge variant="secondary">Source: {lead.source}</Badge>
                      )}
                      {lead.followUpDate && (
                        <Badge variant="outline" className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Follow-up: {lead.followUpDate}
                        </Badge>
                      )}
                    </div>

                    {lead.notes && (
                      <p className="text-xs text-muted-foreground mt-2 italic">{lead.notes}</p>
                    )}
                  </div>

                  <div className="flex-shrink-0">
                    <Select value={lead.status} onValueChange={v => handleStatusChange(lead.id, v)}>
                      <SelectTrigger className="w-[170px] h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTIONS.map(s => (
                          <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add Lead Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Lead</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs mb-1 block">Child Name *</Label>
                <Input value={form.childName} onChange={e => setForm(f => ({ ...f, childName: e.target.value }))} placeholder="Child's full name" />
              </div>
              <div>
                <Label className="text-xs mb-1 block">Parent Name *</Label>
                <Input value={form.parentName} onChange={e => setForm(f => ({ ...f, parentName: e.target.value }))} placeholder="Parent's name" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs mb-1 block">Phone</Label>
                <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+60 11-xxxx xxxx" />
              </div>
              <div>
                <Label className="text-xs mb-1 block">Email</Label>
                <Input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="email@example.com" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs mb-1 block">Source</Label>
                <Select value={form.source} onValueChange={v => setForm(f => ({ ...f, source: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select source" /></SelectTrigger>
                  <SelectContent>
                    {SOURCE_OPTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs mb-1 block">Status</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs mb-1 block">Interested In</Label>
                <Input value={form.interestedIn} onChange={e => setForm(f => ({ ...f, interestedIn: e.target.value }))} placeholder="e.g. English Level 2" />
              </div>
              <div>
                <Label className="text-xs mb-1 block">Follow-up Date</Label>
                <Input type="date" value={form.followUpDate} onChange={e => setForm(f => ({ ...f, followUpDate: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label className="text-xs mb-1 block">Notes</Label>
              <Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Any notes..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={!form.parentName || !form.childName}>Add Lead</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}