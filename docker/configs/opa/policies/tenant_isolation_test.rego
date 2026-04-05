package tenant_isolation

# Test suite for tenant isolation policy

# Test: Same tenant access should be allowed
test_allow_same_tenant_access {
    allow with input as {
        "subject": {
            "id": "user-123",
            "tenant_id": "tenant-456",
            "type": "user"
        },
        "resource": {
            "id": "resource-789",
            "tenant_id": "tenant-456",
            "type": "data"
        },
        "action": "read"
    }
}

# Test: Cross-tenant access should be denied
test_deny_cross_tenant_access {
    not allow with input as {
        "subject": {
            "id": "user-123",
            "tenant_id": "tenant-456",
            "type": "user"
        },
        "resource": {
            "id": "resource-789",
            "tenant_id": "tenant-999",
            "type": "data"
        },
        "action": "read"
    }
}

# Test: Platform admin can access any tenant
test_allow_platform_admin_cross_tenant {
    allow with input as {
        "subject": {
            "id": "admin-123",
            "tenant_id": "tenant-456",
            "roles": ["platform_admin"],
            "type": "user"
        },
        "resource": {
            "id": "resource-789",
            "tenant_id": "tenant-999",
            "type": "data"
        },
        "action": "read"
    }
}

# Test: Public endpoints don't require tenant isolation
test_allow_public_endpoint {
    allow with input as {
        "method": "GET",
        "path": ["public", "docs"],
        "subject": {
            "id": "user-123",
            "tenant_id": "tenant-456"
        }
    }
}

# Test: Health check endpoints are public
test_allow_health_check {
    allow with input as {
        "method": "GET",
        "path": ["health"],
        "subject": {}
    }
}

# Test: System operations are allowed
test_allow_system_operation {
    allow with input as {
        "subject": {
            "type": "service",
            "service_name": "agent-orchestrator",
            "service_token": "valid-token"
        },
        "resource": {
            "tenant_id": "tenant-456"
        },
        "action": "query"
    }
}

# Test: Tenant spoofing is denied
test_deny_tenant_spoofing {
    count(deny_tenant_spoofing) > 0 with input as {
        "subject": {
            "tenant_id": "tenant-456"
        },
        "headers": {
            "x-tenant-id": "tenant-999"
        }
    }
}

# Test: Missing tenant context is denied
test_deny_missing_tenant_context {
    count(deny_missing_tenant) > 0 with input as {
        "subject": {
            "id": "user-123",
            "type": "user"
        },
        "resource": {
            "id": "resource-789"
        },
        "path": ["api", "data"]
    }
}

# Test: Cross-tenant query is denied
test_deny_cross_tenant_query {
    count(deny_cross_tenant_query) > 0 with input as {
        "action": "query",
        "subject": {
            "tenant_id": "tenant-456"
        },
        "query": {
            "tenant_id": "tenant-999"
        }
    }
}

# Test: Violations are collected
test_violations_collected {
    count(violations) > 0 with input as {
        "subject": {
            "tenant_id": "tenant-456"
        },
        "resource": {
            "tenant_id": "tenant-999"
        }
    }
}
