import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSelectedDemoRole } from '@/services/authService';
import { listFeeRecords, markFeeRecordPaid, getFeeDashboardSummary } from '@/services/dataService';
import { getFeeReceiptSignedUrl } from '@/services/supabaseUploadService';
import { rejectFeeReceipt, verifyFeeReceipt } from '@/services/supabaseWriteService';
import { useSupabaseAuthState } from '@/hooks/useSupabaseAuthState';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
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
  const isDemoMode = Boolean(getSelectedDemoRole());
  const { session, isSupabaseAuthAvailable } = useSupabaseAuthState();
  const queryClient = useQueryClient();
  const canAccess = role === 'hq_admin' || role === 'branch_supervisor';
  const canMarkPaid = role === 'hq_admin' || role === 'branch_supervisor';
  const hasSupabaseSession = Boolean(isSupabaseAuthAvailable && session?.user);
  const [proofLoadingByRecord, setProofLoadingByRecord] = useState({});
  const [verifyLoadingRecordId, setVerifyLoadingRecordId] = useState(null);
  const [rejectLoadingRecordId, setRejectLoadingRecordId] = useState(null);

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
  const verifyMutation = useMutation({
    mutationFn: async ({ feeRecordId }) => {
      const result = await verifyFeeReceipt({
        feeRecordId,
        internalNote: 'Verified by staff in Fee Tracking review',
      });
      if (result?.error || !result?.data) {
        throw new Error(result?.error?.message || 'Unable to verify payment proof');
      }
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fee-records'] });
      toast.success('Payment proof verified.');
      setVerifyLoadingRecordId(null);
    },
    onError: (error) => {
      toast.error(error?.message || 'Unable to verify payment proof');
      setVerifyLoadingRecordId(null);
    },
  });
  const rejectMutation = useMutation({
    mutationFn: async ({ feeRecordId, internalNote }) => {
      const result = await rejectFeeReceipt({
        feeRecordId,
        internalNote,
      });
      if (result?.error || !result?.data) {
        throw new Error(result?.error?.message || 'Unable to request resubmission');
      }
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fee-records'] });
      toast.success('Payment proof rejected. Resubmission requested.');
      setRejectLoadingRecordId(null);
    },
    onError: (error) => {
      toast.error(error?.message || 'Unable to request resubmission');
      setRejectLoadingRecordId(null);
    },
  });

  const handleViewUploadedProof = async (record) => {
    if (isDemoMode) {
      toast.message('Demo mode does not open Supabase proof links.');
      return;
    }
    if (!hasSupabaseSession || record?.data_source !== 'supabase_fee_records') {
      toast.message('Proof link is available only for authenticated Supabase staff records.');
      return;
    }
    const recordId = record?.fee_record_id || record?.id;
    if (!recordId) {
      toast.message('Fee record id is not available for proof viewing.');
      return;
    }

    try {
      setProofLoadingByRecord((prev) => ({ ...prev, [recordId]: true }));
      const result = await getFeeReceiptSignedUrl({ feeRecordId: recordId });
      if (result?.error || !result?.data?.signed_url) {
        toast.error(result?.error?.message || 'Unable to open uploaded proof.');
        return;
      }
      window.open(result.data.signed_url, '_blank', 'noopener,noreferrer');
    } catch (error) {
      toast.error(error?.message || 'Unable to open uploaded proof.');
    } finally {
      setProofLoadingByRecord((prev) => ({ ...prev, [recordId]: false }));
    }
  };

  const handleVerifyPayment = (record) => {
    if (isDemoMode) {
      toast.message('Demo mode keeps verification local and does not write to Supabase.');
      return;
    }
    if (!hasSupabaseSession || record?.data_source !== 'supabase_fee_records') {
      toast.message('Verification is available only for authenticated Supabase staff records.');
      return;
    }
    const recordId = record?.fee_record_id || record?.id;
    if (!recordId) {
      toast.message('Fee record id is not available for verification.');
      return;
    }
    setVerifyLoadingRecordId(recordId);
    verifyMutation.mutate({ feeRecordId: recordId });
  };

  const handleRejectPayment = (record) => {
    if (isDemoMode) {
      toast.message('Demo mode keeps rejection local and does not write to Supabase.');
      return;
    }
    if (!hasSupabaseSession || record?.data_source !== 'supabase_fee_records') {
      toast.message('Rejection is available only for authenticated Supabase staff records.');
      return;
    }
    const recordId = record?.fee_record_id || record?.id;
    if (!recordId) {
      toast.message('Fee record id is not available for rejection.');
      return;
    }

    const reason = window.prompt('Internal note (required): why is this proof being rejected?');
    if (typeof reason !== 'string' || !reason.trim()) {
      toast.message('Internal note is required to request resubmission.');
      return;
    }

    setRejectLoadingRecordId(recordId);
    rejectMutation.mutate({
      feeRecordId: recordId,
      internalNote: reason.trim(),
    });
  };

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
              {((record.verification_status === 'submitted'
                || record.verification_status === 'under_review'
                || record.payment_status === 'pending verification')) && (
                <div className="mb-3 text-xs font-medium text-blue-700">
                  Submitted for staff review
                </div>
              )}
              <div className="flex flex-col xl:flex-row xl:items-start gap-4">
                <div className="flex-1 min-w-0 space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold break-words">{record.student_name}</h3>
                    <Badge variant="outline" className={`${STATUS_STYLES[record.payment_status] || ''} whitespace-nowrap`}>{record.payment_status}</Badge>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 text-sm">
                    <div><p className="text-xs text-muted-foreground">Parent / Guardian</p><p className="break-words">{record.parent_guardian_name}</p></div>
                    <div><p className="text-xs text-muted-foreground">Branch</p><p className="break-words">{record.branch_name}</p></div>
                    <div><p className="text-xs text-muted-foreground">Class</p><p className="break-words">{record.class_name}</p></div>
                    <div><p className="text-xs text-muted-foreground">Fee Period</p><p className="break-words">{record.fee_period}</p></div>
                    <div><p className="text-xs text-muted-foreground">Fee Amount</p><p className="break-words">${record.fee_amount}</p></div>
                    <div><p className="text-xs text-muted-foreground">Due Date</p><p className="break-words">{record.due_date}</p></div>
                    <div><p className="text-xs text-muted-foreground">Payment Method</p><p className="break-words">{record.payment_method}</p></div>
                    <div><p className="text-xs text-muted-foreground">Receipt Uploaded</p><p className="break-words">{record.receipt_uploaded ? 'Yes' : 'No'}</p></div>
                    <div><p className="text-xs text-muted-foreground">Receipt / Reference</p><p className="break-words">{record.receipt_reference_note || '—'}</p></div>
                    <div><p className="text-xs text-muted-foreground">Verified By</p><p className="break-words">{record.verified_by || '—'}</p></div>
                    <div><p className="text-xs text-muted-foreground">Verified Date</p><p className="break-words">{record.verified_date || '—'}</p></div>
                    <div><p className="text-xs text-muted-foreground">Internal Note</p><p className="break-words">{record.internal_note || '—'}</p></div>
                  </div>
                </div>

                <div className="w-full xl:w-auto">
                <div className="rounded-lg border border-dashed p-3 space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Staff actions</p>
                {record.receipt_uploaded && (
                  <div className="w-full">
                    <Button
                      variant="outline"
                      onClick={() => handleViewUploadedProof(record)}
                      disabled={Boolean(proofLoadingByRecord[record.fee_record_id || record.id])}
                      className="w-full xl:min-w-[210px]"
                    >
                      {proofLoadingByRecord[record.fee_record_id || record.id] ? 'Opening Proof...' : 'View Uploaded Proof'}
                    </Button>
                  </div>
                )}
                {(record.verification_status === 'submitted'
                  || record.verification_status === 'under_review'
                  || record.payment_status === 'pending verification') && (
                  <div className="w-full">
                    <Button
                      variant="default"
                      onClick={() => handleVerifyPayment(record)}
                      disabled={verifyMutation.isPending}
                      className="w-full xl:min-w-[210px]"
                    >
                      {verifyMutation.isPending && verifyLoadingRecordId === (record.fee_record_id || record.id) ? 'Verifying...' : 'Verify Payment'}
                    </Button>
                  </div>
                )}
                {record.receipt_uploaded && (
                  (record.verification_status === 'submitted'
                    || record.verification_status === 'under_review'
                    || record.payment_status === 'pending verification')
                ) && (
                  <div className="w-full">
                    <Button
                      variant="outline"
                      onClick={() => handleRejectPayment(record)}
                      disabled={rejectMutation.isPending}
                      className="w-full xl:min-w-[210px]"
                    >
                      {rejectMutation.isPending && rejectLoadingRecordId === (record.fee_record_id || record.id)
                        ? 'Rejecting...'
                        : 'Reject / Request Resubmission'}
                    </Button>
                  </div>
                )}
                {canMarkPaid && record.payment_status !== 'paid' && (
                  <div className="w-full">
                    <Button onClick={() => markPaidMutation.mutate(record.id)} disabled={markPaidMutation.isPending} className="w-full xl:min-w-[210px]">
                      Mark as Paid
                    </Button>
                  </div>
                )}
                </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}