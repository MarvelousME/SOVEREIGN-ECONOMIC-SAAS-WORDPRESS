package data_access

# Data Access Policy
# Controls access to user data, consent management, and audit logs

import future.keywords.if
import future.keywords.in

default allow = false

# User Data Access Rules
# Can user access data?

# ALLOW: User accessing own data
allow_access_own_data {
    input.action == "access_data"
    is_data_owner
}

# ALLOW: Access with explicit consent
allow_access_with_consent {
    input.action == "access_data"
    has_user_consent
    consent_not_expired
    access_within_scope
}

# ALLOW: Service accessing data with proper authorization
allow_service_access {
    input.action == "access_data"
    is_service_account
    has_service_authorization
    data_purpose_matches
}

# DENY: No consent
deny_access_no_consent[msg] {
    input.action == "access_data"
    not is_data_owner
    not has_user_consent
    not is_service_account
    msg := "User consent required to access this data"
}

# DENY: Consent expired
deny_access_expired_consent[msg] {
    input.action == "access_data"
    has_user_consent
    not consent_not_expired
    msg := sprintf("Data access consent expired on %v", [consent_expiry])
}

# DENY: Access outside scope
deny_access_scope[msg] {
    input.action == "access_data"
    has_user_consent
    not access_within_scope
    msg := sprintf("Access denied: requested fields %v not in consent scope %v", [requested_fields, consent_scope])
}

# Cross-Tenant Query Rules
# Can service query cross-tenant?

# DENY: Cross-tenant queries (explicitly deny)
deny_cross_tenant_query[msg] {
    input.action == "query"
    input.query.cross_tenant == true
    not is_platform_admin
    msg := "Cross-tenant queries are explicitly denied"
}

# DENY: Query without tenant filter
deny_query_no_tenant[msg] {
    input.action == "query"
    not input.query.tenant_id
    not is_service_account
    not is_platform_admin
    msg := "Queries must include tenant_id filter"
}

# ALLOW: Query with proper tenant isolation
allow_query_with_tenant {
    input.action == "query"
    input.query.tenant_id == input.subject.tenant_id
}

# Audit Log Access Rules
# Can admin access audit logs?

# ALLOW: Admin accessing audit logs
allow_audit_log_access {
    input.action == "access_audit_logs"
    is_audit_admin
    accessing_own_tenant_logs
}

# ALLOW: Platform admin accessing all audit logs
allow_platform_audit_access {
    input.action == "access_audit_logs"
    is_platform_admin
    audit_purpose_documented
}

# DENY: Non-admin accessing audit logs
deny_audit_log_access[msg] {
    input.action == "access_audit_logs"
    not is_audit_admin
    not is_platform_admin
    msg := "Only audit administrators can access audit logs"
}

# DENY: Admin accessing other tenant logs
deny_cross_tenant_audit[msg] {
    input.action == "access_audit_logs"
    is_audit_admin
    not is_platform_admin
    not accessing_own_tenant_logs
    msg := "Audit admins can only access logs from their own tenant"
}

# DENY: Undocumented audit access
deny_audit_no_purpose[msg] {
    input.action == "access_audit_logs"
    is_platform_admin
    not audit_purpose_documented
    msg := "Platform admin audit access requires documented purpose"
}

# Data Deletion Rules
# Can user delete data?

# ALLOW: User deleting own data
allow_delete_own_data {
    input.action == "delete_data"
    is_data_owner
    not data_retention_required
}

# DENY: Cannot delete retained data
deny_delete_retained[msg] {
    input.action == "delete_data"
    data_retention_required
    msg := sprintf("Data must be retained until %v for legal/compliance reasons", [retention_end_date])
}

# Data Export Rules (GDPR Right to Portability)
# Can user export data?

# ALLOW: User exporting own data
allow_export_own_data {
    input.action == "export_data"
    is_data_owner
    not export_rate_limited
}

# DENY: Export rate limited
deny_export_rate_limit[msg] {
    input.action == "export_data"
    export_rate_limited
    msg := sprintf("Export rate limit exceeded: %v exports in last 30 days (max: %v)", [exports_count, max_exports])
}

# Helper Functions

# Ownership check
is_data_owner {
    input.resource.owner_id == input.subject.id
}

is_data_owner {
    input.resource.user_id == input.subject.id
}

# Consent management
has_user_consent {
    input.resource.consents[_].granted_by == input.subject.id
}

has_user_consent {
    some consent in input.resource.consents
    consent.granted_to == input.subject.id
    consent.status == "active"
}

consent_expiry := expiry {
    some consent in input.resource.consents
    consent.granted_to == input.subject.id
    expiry := consent.expires_at
}

consent_not_expired {
    consent_expiry
    time.now_ns() < consent_expiry
}

consent_not_expired {
    some consent in input.resource.consents
    consent.granted_to == input.subject.id
    not consent.expires_at # No expiry set
}

requested_fields := input.fields {
    input.fields
}

requested_fields := [] {
    not input.fields
}

consent_scope := scope {
    some consent in input.resource.consents
    consent.granted_to == input.subject.id
    scope := consent.allowed_fields
}

consent_scope := [] {
    not has_user_consent
}

access_within_scope {
    count(requested_fields) == 0 # No specific fields requested
}

access_within_scope {
    every field in requested_fields {
        field in consent_scope
    }
}

# Service accounts
is_service_account {
    input.subject.type == "service"
}

has_service_authorization {
    is_service_account
    input.subject.authorized_services[_] == input.resource.type
}

data_purpose_matches {
    input.subject.data_purpose
    input.resource.allowed_purposes[_] == input.subject.data_purpose
}

# Admin roles
is_audit_admin {
    input.subject.roles[_] == "audit_admin"
}

is_platform_admin {
    input.subject.roles[_] == "platform_admin"
}

accessing_own_tenant_logs {
    input.resource.tenant_id == input.subject.tenant_id
}

audit_purpose_documented {
    input.audit_purpose
    count(input.audit_purpose) >= 20
}

# Data retention
data_retention_required {
    input.resource.retention_policy
    input.resource.retention_policy.required == true
    time.now_ns() < input.resource.retention_policy.retain_until
}

retention_end_date := input.resource.retention_policy.retain_until {
    data_retention_required
}

# Export rate limiting
exports_count := input.subject.exports_last_30_days {
    input.subject.exports_last_30_days
}

exports_count := 0 {
    not input.subject.exports_last_30_days
}

max_exports := 5

export_rate_limited {
    exports_count >= max_exports
}

# Main decision
allow {
    allow_access_own_data
}

allow {
    allow_access_with_consent
}

allow {
    allow_service_access
}

allow {
    allow_query_with_tenant
}

allow {
    allow_audit_log_access
}

allow {
    allow_platform_audit_access
}

allow {
    allow_delete_own_data
}

allow {
    allow_export_own_data
}

# Collect violations
violations[msg] {
    msg := deny_access_no_consent[_]
}

violations[msg] {
    msg := deny_access_expired_consent[_]
}

violations[msg] {
    msg := deny_access_scope[_]
}

violations[msg] {
    msg := deny_cross_tenant_query[_]
}

violations[msg] {
    msg := deny_query_no_tenant[_]
}

violations[msg] {
    msg := deny_audit_log_access[_]
}

violations[msg] {
    msg := deny_cross_tenant_audit[_]
}

violations[msg] {
    msg := deny_audit_no_purpose[_]
}

violations[msg] {
    msg := deny_delete_retained[_]
}

violations[msg] {
    msg := deny_export_rate_limit[_]
}
