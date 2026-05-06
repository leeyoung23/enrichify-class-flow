import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listBranches, createBranch } from '@/services/dataService';
import { Building2, Plus, MapPin, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';

export default function Branches() {
  const { user } = useOutletContext();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ name: '', address: '', phone: '' });
  const queryClient = useQueryClient();

  const { data: branches = [], isLoading } = useQuery({
    queryKey: ['branches', user?.role, user?.branch_id],
    queryFn: () => listBranches(user),
    enabled: !!user,
  });

  const createMutation = useMutation({
    mutationFn: (data) => createBranch(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branches'] });
      setDialogOpen(false);
      setForm({ name: '', address: '', phone: '' });
    },
  });

  const isAdmin = user?.role === 'hq_admin';

  return (
    <div>
      <PageHeader
        title="Branches"
        description="Setup records preview — cards list centres only and do not open a detail page yet. Use Add Branch to create. Demo/local data where noted."
        action={isAdmin && (
          <Button onClick={() => setDialogOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" /> Add Branch
          </Button>
        )}
      />

      {branches.length === 0 && !isLoading ? (
        <EmptyState
          icon={Building2}
          title="No branches yet"
          description="Create your first branch to get started."
          action={isAdmin && (
            <Button onClick={() => setDialogOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" /> Add Branch
            </Button>
          )}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {branches.map((branch) => (
            <Card key={branch.id} className="p-5 border-muted/80">
              <div className="flex items-start justify-between mb-3">
                <div className="p-2 rounded-xl bg-primary/10">
                  <Building2 className="h-5 w-5 text-primary" />
                </div>
                <Badge variant={branch.status === 'active' ? 'default' : 'secondary'}>
                  {branch.status || 'active'}
                </Badge>
              </div>
              <h3 className="font-semibold text-lg">{branch.name}</h3>
              {branch.address && (
                <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-2">
                  <MapPin className="h-3.5 w-3.5" /> {branch.address}
                </p>
              )}
              {branch.phone && (
                <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-1">
                  <Phone className="h-3.5 w-3.5" /> {branch.phone}
                </p>
              )}
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Branch</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Branch Name *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Downtown Centre" />
            </div>
            <div>
              <Label>Address</Label>
              <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Full address" />
            </div>
            <div>
              <Label>Phone</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="Contact number" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => createMutation.mutate(form)} disabled={!form.name || createMutation.isPending}>
              {createMutation.isPending ? 'Creating...' : 'Create Branch'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}