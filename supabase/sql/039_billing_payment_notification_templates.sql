-- 039_billing_payment_notification_templates.sql
-- Message-only billing / payment prototype templates (in_app). No attachments, no URLs in copy.
-- Wire-up: verifyFeeReceipt → fee_payment.proof_verified; rejectFeeReceipt → fee_payment.proof_rejected.
-- Unwired today: fee_payment.proof_requested (no staff/HQ helper yet), invoice.available_message_only (future invoice intent).
--
-- Apply after 038 via Supabase SQL Editor or:
--   supabase db query --linked --file supabase/sql/039_billing_payment_notification_templates.sql

insert into public.notification_templates (
  template_key,
  event_type,
  channel,
  title_template,
  body_template,
  allowed_variables,
  branch_id,
  is_active
) values
  (
    'default.fee_payment.proof_requested.in_app',
    'fee_payment.proof_requested',
    'in_app',
    'Payment proof requested',
    'Please upload payment proof in the parent portal when convenient.',
    '[]'::jsonb,
    null,
    true
  ),
  (
    'default.fee_payment.proof_verified.in_app',
    'fee_payment.proof_verified',
    'in_app',
    'Payment proof verified',
    'Your uploaded payment proof has been reviewed.',
    '[]'::jsonb,
    null,
    true
  ),
  (
    'default.fee_payment.proof_rejected.in_app',
    'fee_payment.proof_rejected',
    'in_app',
    'Payment proof needs review',
    'Please check the payment proof request in the parent portal.',
    '[]'::jsonb,
    null,
    true
  ),
  (
    'default.invoice.available_message_only.in_app',
    'invoice.available_message_only',
    'in_app',
    'Payment update',
    'There is a payment update available in your parent portal.',
    '[]'::jsonb,
    null,
    true
  )
on conflict (template_key) do nothing;
