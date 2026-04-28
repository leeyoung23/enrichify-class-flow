import React from 'react';
import { useOutletContext } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listFeeRecords, markFeeRecordPaid, getFeeDashboardSummary } from '@/services/dataService';
import { uploadFeeReceipt, getFeeReceiptSignedUrl } from '@/services/supabaseUploadService';
import { useSupabaseAuthState } from '@/hooks/useSupabaseAuthState';
import { getSelectedDemoRole } from '@/services/authService';
import { isSupabaseConfigured } from '@/services/supabaseClient';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Wallet, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const STATUS_STYLES = {
  unpaid: 'bg-red-100 text-red-700 border-red-200',
  overdue: 'bg-amber-100 text-amber-700 border-amber-200',
  paid: 'bg-green-100 text-green-700 border-green-200',
  waived: 'bg-slate-100 text-slate-700 border-slate-200',
  'pending verification': 'bg-blue-100 text-blue-700 border-blue-200',
};

export default function FeeTracking() {
  const { user } = useOutletContext();
  const { user: supabaseUser } = useSupabaseAuthState();
  const role = user?.role;
  const queryClient = useQueryClient();
  const isDemoMode = Boolean(getSelectedDemoRole());
  const hasSupabaseSession = Boolean(supabaseUser?.id);
  const canAccess = role === 'hq_admin' || role === 'branch_supervisor' || role === 'parent';
  const canMarkPaid = role === 'hq_admin' || role === 'branch_supervisor';
  const canParentUpload = role === 'parent';
  const [selectedFiles, setSelectedFiles] = React.useState({});
  const ALLOWED_FILE_TYPES = new Set(['image/png', 'image/jpeg', 'application/pdf', 'text/plain']);
  const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

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

  const uploadMutation = useMutation({
    mutationFn: async ({ feeRecordId, file }) => {
      return uploadFeeReceipt({
        feeRecordId,
        file,
        fileName: file?.name,
        contentType: file?.type || 'application/octet-stream',
      });
    },
    onSuccess: (result, payload) => {
      if (result?.error) {
        throw new Error(result.error.message || 'Failed to upload receipt');
      }
      queryClient.invalidateQueries({ queryKey: ['fee-records'] });
      setSelectedFiles((prev) => ({ ...prev, [payload.feeRecordId]: null }));
      toast.success('Receipt uploaded successfully. Status is now submitted for review.');
    },
    onError: (error) => {
      toast.error(error?.message || 'Unable to upload receipt');
    },
  });

  const signedUrlMutation = useMutation({
    mutationFn: async (feeRecordId) => getFeeReceiptSignedUrl({ feeRecordId }),
    onSuccess: (result) => {
      if (result?.error || !result?.data?.signed_url) {
        toast.error(result?.error?.message || 'Unable to generate receipt link');
        return;
      }
      window.open(result.data.signed_url, '_blank', 'noopener,noreferrer');
    },
    onError: (error) => {
      toast.error(error?.message || 'Unable to open receipt');
    },
  });

  const onSelectReceiptFile = (recordId, file) => {
    if (!file) {
      setSelectedFiles((prev) => ({ ...prev, [recordId]: null }));
      return;
    }
    if (!ALLOWED_FILE_TYPES.has(file.type)) {
      toast.message('Allowed file types: PNG, JPEG, PDF (text file allowed for testing only).');
      return;
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      toast.message('File size must be 5MB or smaller.');
      return;
    }
    setSelectedFiles((prev) => ({ ...prev, [recordId]: file }));
  };

  const handleUploadReceipt = (record) => {
    const file = selectedFiles[record.id];
    if (!file) {
      toast.message('Please select a file before uploading.');
      return;
    }
    if (isDemoMode) {
      toast.message('Demo mode keeps fee receipt uploads local only.');
      return;
    }
    if (!isSupabaseConfigured() || !hasSupabaseSession) {
      toast.message('Supabase session is required for receipt upload.');
      return;
    }
    if (!record?.id || record.data_source !== 'supabase_fee_records') {
      toast.message('No real fee record is available for Supabase upload.');
      return;
    }
    uploadMutation.mutate({ feeRecordId: record.id, file });
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

                <div className="xl:w-auto space-y-2">
                {canMarkPaid && record.payment_status !== 'paid' && (
                  <div>
                    <Button onClick={() => markPaidMutation.mutate(record.id)} disabled={markPaidMutation.isPending} className="w-full xl:w-auto">
                      Mark as Paid
                    </Button>
                  </div>
                )}
                {canParentUpload && (
                  <div className="space-y-2">
                    <input
                      type="file"
                      accept=".png,.jpg,.jpeg,.pdf,.txt"
                      onChange={(e) => onSelectReceiptFile(record.id, e.target.files?.[0] || null)}
                      disabled={uploadMutation.isPending}
                      className="block w-full text-sm"
                    />
                    <Button
                      variant="outline"
                      onClick={() => handleUploadReceipt(record)}
                      disabled={uploadMutation.isPending}
                      className="w-full"
                    >
                      {uploadMutation.isPending ? (
                        <span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Uploading...</span>
                      ) : 'Upload Receipt'}
                    </Button>
                    {record.receipt_uploaded && !isDemoMode && isSupabaseConfigured() && hasSupabaseSession && record.data_source === 'supabase_fee_records' && (
                      <Button
                        variant="ghost"
                        onClick={() => signedUrlMutation.mutate(record.id)}
                        disabled={signedUrlMutation.isPending}
                        className="w-full"
                      >
                        View Uploaded Receipt
                      </Button>
                    )}
                  </div>
                )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}