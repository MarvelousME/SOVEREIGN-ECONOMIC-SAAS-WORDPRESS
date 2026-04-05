package tenant_isolation

# Tenant Isolation Policy
# Ensures strict data segregation between tenants

import future.keywords.if
import future.keywords.in

# Default deny all cross-tenant access
default allow = false

# Helper to extract tenant_id from various sources
tenant_id := input.subject.tenant_id {
    input.subject.tenant_id
}

tenant_id := input.subject.metadata.tenant_id {
    not input.subject.tenant_id
    input.subject.metadata.tenant_id
}

# Resource tenant extraction
resource_tenant_id := input.resource.tenant_id {
    input.resource.tenant_id
}

resource_tenant_id := input.resource.metadata.tenant_id {
    not input.resource.tenant_id
    input.resource.metadata.tenant_id
}

# DENY: Cross-tenant data access
deny_cross_tenant[msg] {
    tenant_id
    resource_tenant_id
    tenant_id != resource_tenant_id
    not is_platform_admin
    msg := sprintf("Cross-tenant access denied: subject tenant '%s' cannot access resource from tenant '%s'", [tenant_id, resource_tenant_id])
}

# DENY: Cross-tenant queries
deny_cross_tenant_query[msg] {
    input.action == "query"
    input.query.tenant_id
    tenant_id != input.query.tenant_id
    not is_platform_admin
    msg := sprintf("Cross-tenant query denied: tenant '%s' cannot query data from tenant '%s'", [tenant_id, input.query.tenant_id])
}

# DENY: Missing tenant context
deny_missing_tenant[msg] {
    not input.subject.tenant_id
    not input.subject.metadata.tenant_id
    not is_public_endpoint
    not is_system_operation
    msg := "Request must include tenant context"
}

# DENY: Tenant spoofing attempts
deny_tenant_spoofing[msg] {
    input.headers["x-tenant-id"]
    tenant_id != input.headers["x-tenant-id"]
    msg := sprintf("Tenant ID mismatch: token claims '%s' but header specifies '%s'", [tenant_id, input.headers["x-tenant-id"]])
}

# ALLOW: Same-tenant access
allow {
    tenant_id
    resource_tenant_id
    tenant_id == resource_tenant_id
    not count(deny_cross_tenant) > 0
    not count(deny_tenant_spoofing) > 0
}

# ALLOW: Platform admin can access all tenants (with audit)
allow {
    is_platform_admin
    audit_admin_access
}

# ALLOW: Public endpoints don't require tenant isolation
allow {
    is_public_endpoint
}

# ALLOW: System operations (internal service-to-service)
allow {
    is_system_operation
    validate_service_identity
}

# Helper: Check if user is platform admin
is_platform_admin {
    input.subject.roles[_] == "platform_admin"
}

# Helper: Check if endpoint is public
is_public_endpoint {
    input.path[0] == "public"
}

is_public_endpoint {
    input.path[_] == "health"
}

is_public_endpoint {
    input.method == "GET"
    input.path[0] == "docs"
}

# Helper: System operations
is_system_operation {
    input.subject.type == "service"
    input.subject.service_name
}

# Helper: Validate service identity
validate_service_identity {
    input.subject.type == "service"
    input.subject.service_token
    # In production, verify service token signature
    true
}

# Audit admin access to tenant data
audit_admin_access {
    is_platform_admin
    resource_tenant_id
    tenant_id != resource_tenant_id
    # Log to audit system
    true
}

# Collect all violations
violations[msg] {
    msg := deny_cross_tenant[_]
}

violations[msg] {
    msg := deny_cross_tenant_query[_]
}

violations[msg] {
    msg := deny_missing_tenant[_]
}

violations[msg] {
    msg := deny_tenant_spoofing[_]
}
