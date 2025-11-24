-- KYC Sessions
CREATE TABLE IF NOT EXISTS kyc_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending_consent',
    reason TEXT DEFAULT 'standard_verification',
    workflow_id UUID NULL,
    consent_timestamp TIMESTAMPTZ NULL,
    consent_version TEXT NULL,
    consent_ip TEXT NULL,
    consent_user_agent TEXT NULL,
    otp_verified BOOLEAN DEFAULT FALSE,
    otp_method TEXT NULL,
    otp_destination TEXT NULL,
    selected_id_type TEXT NULL,
    last_verified_at TIMESTAMPTZ NULL,
    expiry_warning_sent_at TIMESTAMPTZ NULL,
    rejection_reason TEXT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days')
);

-- KYC Documents
CREATE TABLE IF NOT EXISTS kyc_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kyc_session_id UUID NOT NULL,
    user_id UUID NOT NULL,
    doc_type TEXT NOT NULL,
    s3_key TEXT NOT NULL,
    s3_bucket TEXT NOT NULL,
    s3_url TEXT NULL,
    file_name TEXT NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    file_mime TEXT NOT NULL,
    file_hash TEXT NOT NULL,
    scan_status TEXT DEFAULT 'pending',
    scan_result JSONB NULL,
    scanned_at TIMESTAMPTZ NULL,
    ocr_status TEXT DEFAULT 'pending',
    ocr_extracted JSONB NULL,
    ocr_confidence DECIMAL(5,2) NULL,
    id_number TEXT NULL,
    id_expiry TIMESTAMPTZ NULL,
    id_issuer_country TEXT NULL,
    id_holder_name TEXT NULL,
    id_holder_dob DATE NULL,
    vendor_verification_status TEXT NULL,
    vendor_verification_result JSONB NULL,
    vendor_name TEXT NULL,
    verified_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    archived_at TIMESTAMPTZ NULL
);

-- KYC Audit Logs
CREATE TABLE IF NOT EXISTS kyc_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kyc_session_id UUID NULL,
    user_id UUID NOT NULL,
    action TEXT NOT NULL,
    action_status TEXT DEFAULT 'success',
    details JSONB NOT NULL DEFAULT '{}',
    ip_address TEXT NULL,
    user_agent TEXT NULL,
    endpoint TEXT NULL,
    timestamp TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- OTP Codes
CREATE TABLE IF NOT EXISTS otp_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kyc_session_id UUID NOT NULL,
    user_id UUID NOT NULL,
    otp_hash TEXT NOT NULL,
    otp_method TEXT NOT NULL,
    destination TEXT NOT NULL,
    attempts INT DEFAULT 0,
    max_attempts INT DEFAULT 5,
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    verified_at TIMESTAMPTZ NULL
);

-- Refresh Tokens
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    token_hash TEXT NOT NULL UNIQUE,
    token_family UUID NOT NULL,
    ip_address TEXT NULL,
    user_agent TEXT NULL,
    device_fingerprint TEXT NULL,
    device_name TEXT NULL,
    is_revoked BOOLEAN DEFAULT FALSE,
    revoked_at TIMESTAMPTZ NULL,
    revoke_reason TEXT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    last_used_at TIMESTAMPTZ DEFAULT NOW()
);

-- Magic Links
CREATE TABLE IF NOT EXISTS magic_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    token_hash TEXT NOT NULL UNIQUE,
    user_id UUID NULL,
    ip_address TEXT NULL,
    user_agent TEXT NULL,
    is_used BOOLEAN DEFAULT FALSE,
    used_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL
);

-- Login Events
CREATE TABLE IF NOT EXISTS login_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    login_method TEXT NOT NULL,
    success BOOLEAN NOT NULL,
    failure_reason TEXT NULL,
    ip_address TEXT NULL,
    user_agent TEXT NULL,
    device_fingerprint TEXT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Payment Customers
CREATE TABLE IF NOT EXISTS payment_customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE,
    stripe_customer_id TEXT NOT NULL UNIQUE,
    billing_email TEXT NULL,
    billing_consent BOOLEAN DEFAULT FALSE,
    billing_consent_at TIMESTAMPTZ NULL,
    billing_consent_ip TEXT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Subscriptions
CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    stripe_subscription_id TEXT NOT NULL UNIQUE,
    stripe_price_id TEXT NOT NULL,
    status TEXT NOT NULL,
    current_period_start TIMESTAMPTZ NOT NULL,
    current_period_end TIMESTAMPTZ NOT NULL,
    cancel_at_period_end BOOLEAN DEFAULT FALSE,
    canceled_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Payment Events
CREATE TABLE IF NOT EXISTS payment_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NULL,
    stripe_event_id TEXT NOT NULL UNIQUE,
    event_type TEXT NOT NULL,
    event_data JSONB NOT NULL,
    processed BOOLEAN DEFAULT FALSE,
    processed_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Data Deletion Requests
CREATE TABLE IF NOT EXISTS data_deletion_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    request_reason TEXT NULL,
    status TEXT DEFAULT 'pending',
    requested_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ NULL,
    completed_at TIMESTAMPTZ NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_kyc_sessions_user_id ON kyc_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_kyc_sessions_status ON kyc_sessions(status);
CREATE INDEX IF NOT EXISTS idx_kyc_documents_session_id ON kyc_documents(kyc_session_id);
CREATE INDEX IF NOT EXISTS idx_kyc_audit_logs_user_id ON kyc_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_otp_codes_session_id ON otp_codes(kyc_session_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token_hash ON refresh_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_magic_links_email ON magic_links(email);
CREATE INDEX IF NOT EXISTS idx_login_events_user_id ON login_events(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_customers_user_id ON payment_customers(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
