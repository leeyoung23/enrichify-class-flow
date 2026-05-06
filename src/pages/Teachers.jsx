import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { inviteUser, listStaff } from '@/services/dataService';
import { canInviteStaff } from '@/services/permissionService';
import { Users, Mail, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import { toast } from 'sonner';

export default function Teachers() {
  const { user } = useOutletContext();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const isAdmin = canInviteStaff(user);

  const { data: staff = [] } = useQuery({
    queryKey: ['staff', user?.role, user?.branch_id],
    queryFn: () => listStaff(user),
    enabled: !!user,
  });

  const handleInvite = async () => {
    setInviting(true);
    await inviteUser(email);
    toast.success(`Invitation sent to ${email}`);
    setDialogOpen(false);
    setEmail('');
    setInviting(false);
  };

  return (
    <div>
      <PageHeader
        title="Teachers & Staff"
        description="Directory preview — staff cards do not open profiles yet. Use Invite Staff to add people."
        action={isAdmin && (
          <Button onClick={() => setDialogOpen(true)} className="gap-2">
            <UserPlus className="h-4 w-4" /> Invite Staff
          </Button>
        )}
      />

      {staff.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No staff members yet"
          description="Invite teachers and supervisors to get started."
          action={isAdmin && (
            <Button onClick={() => setDialogOpen(true)} className="gap-2">
              <UserPlus className="h-4 w-4" /> Invite Staff
            </Button>
          )}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {staff.map((person) => (
            <Card key={person.id} className="p-5 border-muted/80">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
                  {(person.full_name || person.email || '?')[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold truncate">{person.full_name || '—'}</h3>
                  <p className="text-sm text-muted-foreground flex items-center gap-1 truncate">
                    <Mail className="h-3 w-3 flex-shrink-0" /> {person.email}
                  </p>
                </div>
              </div>
              <div className="mt-3">
                <Badge variant="outline" className="capitalize">
                  {(person.role || 'teacher').replace('_', ' ')}
                </Badge>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite Staff Member</DialogTitle>
            <DialogDescription>
              Send an invitation email. After they register, update their role in the Users settings.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Email Address *</Label>
              <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="teacher@example.com" type="email" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleInvite} disabled={!email || inviting}>
              {inviting ? 'Sending...' : 'Send Invitation'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}