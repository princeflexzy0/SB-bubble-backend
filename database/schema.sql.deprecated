-- ================================================================
-- BUBBLE BACKEND API - COMPLETE DATABASE SCHEMA
-- Generated: 2025-11-26T05:39:48.881Z
-- Total Tables: 28
-- ================================================================

-- Table: archived_exports
CREATE TABLE IF NOT EXISTS archived_exports (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  export_type TEXT NOT NULL,
  s3_key TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE
);

-- Table: billing_cycles
CREATE TABLE IF NOT EXISTS billing_cycles (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL,
  period_start TIMESTAMP WITH TIME ZONE NOT NULL,
  period_end TIMESTAMP WITH TIME ZONE NOT NULL,
  amount_due INTEGER NOT NULL,
  status TEXT NOT NULL,
  paid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Table: data_deletion_requests
CREATE TABLE IF NOT EXISTS data_deletion_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  request_reason TEXT,
  status TEXT DEFAULT 'pending'::text,
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  processed_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  reason TEXT
);

-- Table: deletion_queue
CREATE TABLE IF NOT EXISTS deletion_queue (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'::text,
  scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Table: email_tokens
CREATE TABLE IF NOT EXISTS email_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  token_hash TEXT NOT NULL,
  token_type TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Table: gdpr_erasure_logs
CREATE TABLE IF NOT EXISTS gdpr_erasure_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  email TEXT,
  data_deleted JSONB NOT NULL,
  deleted_by UUID,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Table: kyc_audit_logs
CREATE TABLE IF NOT EXISTS kyc_audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  kyc_session_id UUID,
  user_id UUID NOT NULL,
  action TEXT NOT NULL,
  action_status TEXT DEFAULT 'success'::text,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  ip_address TEXT,
  user_agent TEXT,
  endpoint TEXT,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table: kyc_documents
CREATE TABLE IF NOT EXISTS kyc_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  kyc_session_id UUID NOT NULL,
  user_id UUID NOT NULL,
  doc_type TEXT NOT NULL,
  s3_key TEXT NOT NULL,
  s3_bucket TEXT NOT NULL,
  s3_url TEXT,
  file_name TEXT NOT NULL,
  file_size_bytes BIGINT NOT NULL,
  file_mime TEXT NOT NULL,
  file_hash TEXT NOT NULL,
  scan_status TEXT DEFAULT 'pending'::text,
  scan_result JSONB,
  scanned_at TIMESTAMP WITH TIME ZONE,
  ocr_status TEXT DEFAULT 'pending'::text,
  ocr_extracted JSONB,
  ocr_confidence NUMERIC,
  id_number TEXT,
  id_expiry TIMESTAMP WITH TIME ZONE,
  id_issuer_country TEXT,
  id_holder_name TEXT,
  id_holder_dob DATE,
  vendor_verification_status TEXT,
  vendor_verification_result JSONB,
  vendor_name TEXT,
  verified_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  archived_at TIMESTAMP WITH TIME ZONE
);

-- Table: kyc_sessions
CREATE TABLE IF NOT EXISTS kyc_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending_consent'::text,
  reason TEXT DEFAULT 'standard_verification'::text,
  workflow_id UUID,
  consent_timestamp TIMESTAMP WITH TIME ZONE,
  consent_version TEXT,
  consent_ip TEXT,
  consent_user_agent TEXT,
  otp_verified BOOLEAN DEFAULT false,
  otp_method TEXT,
  otp_destination TEXT,
  selected_id_type TEXT,
  last_verified_at TIMESTAMP WITH TIME ZONE,
  expiry_warning_sent_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + '30 days'::interval)
);

-- Table: login_attempts
CREATE TABLE IF NOT EXISTS login_attempts (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  ip_address TEXT NOT NULL,
  success BOOLEAN NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Table: login_events
CREATE TABLE IF NOT EXISTS login_events (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  login_method TEXT NOT NULL,
  success BOOLEAN NOT NULL,
  failure_reason TEXT,
  ip_address TEXT,
  user_agent TEXT,
  device_fingerprint TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Table: magic_links
CREATE TABLE IF NOT EXISTS magic_links (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  token_hash TEXT NOT NULL,
  user_id UUID,
  ip_address TEXT,
  user_agent TEXT,
  is_used BOOLEAN DEFAULT false,
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Table: magic_login_events
CREATE TABLE IF NOT EXISTS magic_login_events (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  user_id UUID,
  magic_link_id UUID,
  success BOOLEAN NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Table: otp_attempts
CREATE TABLE IF NOT EXISTS otp_attempts (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  otp_code_id UUID,
  user_id UUID,
  success BOOLEAN DEFAULT false,
  ip_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Table: otp_codes
CREATE TABLE IF NOT EXISTS otp_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  kyc_session_id UUID NOT NULL,
  user_id UUID NOT NULL,
  otp_hash TEXT NOT NULL,
  otp_method TEXT NOT NULL,
  destination TEXT NOT NULL,
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 5,
  is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  verified_at TIMESTAMP WITH TIME ZONE,
  method TEXT
);

-- Table: otp_sessions
CREATE TABLE IF NOT EXISTS otp_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  session_type TEXT NOT NULL,
  otp_verified BOOLEAN DEFAULT false,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Table: payment_customers
CREATE TABLE IF NOT EXISTS payment_customers (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  stripe_customer_id TEXT NOT NULL,
  billing_email TEXT,
  billing_consent BOOLEAN DEFAULT false,
  billing_consent_at TIMESTAMP WITH TIME ZONE,
  billing_consent_ip TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Table: payment_events
CREATE TABLE IF NOT EXISTS payment_events (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  user_id UUID,
  stripe_event_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  event_data JSONB NOT NULL,
  processed BOOLEAN DEFAULT false,
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Table: payment_method_vault
CREATE TABLE IF NOT EXISTS payment_method_vault (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  stripe_payment_method_id TEXT NOT NULL,
  type TEXT NOT NULL,
  last_four TEXT,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Table: purge_jobs
CREATE TABLE IF NOT EXISTS purge_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  job_type TEXT NOT NULL,
  status TEXT NOT NULL,
  records_processed INTEGER DEFAULT 0,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Table: refresh_tokens
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  token_hash TEXT NOT NULL,
  token_family UUID NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  device_fingerprint TEXT,
  device_name TEXT,
  is_revoked BOOLEAN DEFAULT false,
  revoked_at TIMESTAMP WITH TIME ZONE,
  revoke_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  last_used_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Table: reset_attempts
CREATE TABLE IF NOT EXISTS reset_attempts (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  ip_address TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Table: scanner_logs
CREATE TABLE IF NOT EXISTS scanner_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Table: subscriptions
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  stripe_subscription_id TEXT NOT NULL,
  stripe_price_id TEXT NOT NULL,
  status TEXT NOT NULL,
  current_period_start TIMESTAMP WITH TIME ZONE NOT NULL,
  current_period_end TIMESTAMP WITH TIME ZONE NOT NULL,
  cancel_at_period_end BOOLEAN DEFAULT false,
  canceled_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Table: users
CREATE TABLE IF NOT EXISTS users (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  external_provider TEXT,
  external_provider_id TEXT,
  password_hash TEXT,
  email_verified BOOLEAN DEFAULT false,
  last_login_at TIMESTAMP WITH TIME ZONE,
  login_count INTEGER DEFAULT 0,
  profile_picture_url TEXT,
  auth_provider_data JSONB,
  stripe_customer_id TEXT,
  full_name TEXT,
  apple_user_identifier TEXT,
  billing_consent BOOLEAN DEFAULT false,
  last_billing_consent_at TIMESTAMP WITH TIME ZONE
);

-- Table: verification_attempts
CREATE TABLE IF NOT EXISTS verification_attempts (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  kyc_session_id UUID NOT NULL,
  user_id UUID NOT NULL,
  attempt_type TEXT NOT NULL,
  status TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Table: virus_quarantine
CREATE TABLE IF NOT EXISTS virus_quarantine (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  document_id UUID,
  s3_key TEXT NOT NULL,
  threat_type TEXT NOT NULL,
  quarantine_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Table: virus_scanner_events
CREATE TABLE IF NOT EXISTS virus_scanner_events (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  document_id UUID,
  scanner_name TEXT NOT NULL,
  scan_result TEXT NOT NULL,
  threats_found JSONB,
  scan_duration_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

