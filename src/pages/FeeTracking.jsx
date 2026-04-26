import React from 'react';
import { useOutletContext } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listFeeRecords, markFeeRecordPaid, getFeeDashboardSummary } from '@/services/dataService';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Wallet } from 'lucide-react';

const STATUS_STYLES = {
  unpaid: 'bg-red-100 text-red-700 border-red-200',
  overdue: 'bg-amber-100 text-amber-700 border-amber-200',
  paid: 'bg-green-100 text-green-700 border-green-200',
  waived: 'bg-slate-100 text-slate-700 border-slate-200',
  'pending verification': 'bg-blue-100 text-blue-700 border-blue-200',
};

export default function FeeTracking() {
  const { user } = useOutletContext();
  const role = user?.role;
  const queryClient = useQueryClient();
  const canAccess = role === 'hq_admin' || role === 'branch_supervisor';
  const canMarkPaid = role === 'hq_admin' || role === 'branch_supervisor';

  const { data: feeRecords = [] } = useQuery({
    queryKey: ['fee-records', user?.role, user?.email, user?.branch_id],
    queryFn: () => listFeeRecords(user),
    enabled: !!user,
  });

  const summary = getFeeDashboardSummary(user, feeRecords);

  const markPaidMutation = useMutation({
    mutationFn: (recordId) => markFeeRecordPaid(user, recordId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fee-records'] });
    },
  });

  if (!canAccess) {
    return (
      <EmptyState
        icon={Wallet}
        title="Access restricted"
        description="This page is not available for the current demo role."
      />
    );
  }

  return (
    <div>
      <PageHeader
        title="Fee Tracking"
        description="Track internal fee status using fake demo data only. No gateway or card details are used."
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <Card className="p-5"><p className="text-sm text-muted-foreground">Unpaid Students</p><p className="text-3xl font-bold mt-1">{summary.unpaid}</p></Card>
        <Card className="p-5"><p className="text-sm text-muted-foreground">Overdue Payments</p><p className="text-3xl font-bold mt-1">{summary.overdue}</p></Card>
        <Card className="p-5"><p className="text-sm text-muted-foreground">Pending Verification</p><p className="text-3xl font-bold mt-1">{summary.pendingVerification}</p></Card>
        <Card className="p-5"><p className="text-sm text-muted-foreground">Paid This Month</p><p className="text-3xl font-bold mt-1">{summary.paidThisMonth}</p></Card>
      </div>

      {role === 'hq_admin' && (
        <Card className="p-5 mb-6">
          <p className="text-sm text-muted-foreground">Branch Fee Completion Rate</p>
          <p className="text-3xl font-bold mt-1">{summary.branchCompletionRate}%</p>
        </Card>
      )}

      {feeRecords.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title="No fee records"
          description="No fee tracking records are available in the demo data right now."
        />
      ) : (
        <div className="space-y-3">
          {feeRecords.map((record) => (
            <Card key={record.id} className="p-5">
              <div className="flex flex-col xl:flex-row xl:items-start gap-4">
                <div className="flex-1 min-w-0 space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold">{record.student_name}</h3>
                    <Badge variant="outline" className={STATUS_STYLES[record.payment_status] || ''}>{record.payment_status}</Badge>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 text-sm">
                    <div><p className="text-xs text-muted-foreground">Parent / Guardian</p><p>{record.parent_guardian_name}</p></div>
                    <div><p className="text-xs text-muted-foreground">Branch</p><p>{record.branch_name}</p></div>
                    <div><p className="text-xs text-muted-foreground">Class</p><p>{record.class_name}</p></div>
                    <div><p className="text-xs text-muted-foreground">Fee Period</p><p>{record.fee_period}</p></div>
                    <div><p className="text-xs text-muted-foreground">Fee Amount</p><p>${record.fee_amount}</p></div>
                    <div><p className="text-xs text-muted-foreground">Due Date</p><p>{record.due_date}</p></div>
                    <div><p className="text-xs text-muted-foreground">Payment Method</p><p>{record.payment_method}</p></div>
                    <div><p className="text-xs text-muted-foreground">Receipt Uploaded</p><p>{record.receipt_uploaded ? 'Yes' : 'No'}</p></div>
                    <div><p className="text-xs text-muted-foreground">Receipt / Reference</p><p>{record.receipt_reference_note || '—'}</p></div>
                    <div><p className="text-xs text-muted-foreground">Verified By</p><p>{record.verified_by || '—'}</p></div>
                    <div><p className="text-xs text-muted-foreground">Verified Date</p><p>{record.verified_date || '—'}</p></div>
                    <div><p className="text-xs text-muted-foreground">Internal Note</p><p>{record.internal_note || '—'}</p></div>
                  </div>
                </div>

                {canMarkPaid && record.payment_status !== 'paid' && (
                  <div className="xl:w-auto">
                    <Button onClick={() => markPaidMutation.mutate(record.id)} disabled={markPaidMutation.isPending} className="w-full xl:w-auto">
                      Mark as Paid
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}