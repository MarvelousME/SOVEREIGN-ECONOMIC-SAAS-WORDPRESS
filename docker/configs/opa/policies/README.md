# OPA Policies

Open Policy Agent policies for UBI-CMS platform security and authorization.

## Policy Files

### Core Policies

1. **tenant_isolation.rego** - Tenant data segregation
2. **rbac.rego** - Role-based access control
3. **treasury.rego** - Treasury operations
4. **agents.rego** - Agent management
5. **tasks.rego** - Task lifecycle
6. **governance.rego** - DAO governance
7. **data_access.rego** - Data privacy & consent

## Testing Policies

Run all policy tests:

```bash
opa test . -v
```

Run specific policy tests:

```bash
opa test tenant_isolation_test.rego -v
opa test treasury_test.rego -v
```

## Policy Structure

Each policy follows this structure:

```rego
package policy_name

import future.keywords.if
import future.keywords.in

default allow = false

# Allow rules
allow {
    condition1
    condition2
}

# Deny rules
deny_reason[msg] {
    violation_condition
    msg := "Violation message"
}

# Helper functions
helper_function {
    # Logic
}

# Violations collection
violations[msg] {
    msg := deny_reason[_]
}
```

## Policy Decision Flow

```
1. Request arrives → Extract input
2. Query OPA → /v1/data/{policy}
3. Policy evaluation → Allow/Deny
4. Return decision → With violations if denied
5. Enforce decision → 403 if denied
6. Audit log → Record decision
```

## Input Format

Standard input structure:

```json
{
  "subject": {
    "id": "user-123",
    "tenant_id": "tenant-456",
    "roles": ["user", "agent_creator"],
    "type": "user"
  },
  "resource": {
    "id": "resource-789",
    "tenant_id": "tenant-456",
    "type": "agent"
  },
  "action": "create",
  "metadata": {}
}
```

## Decision Format

Standard decision output:

```json
{
  "result": {
    "allow": false,
    "violations": [
      "Cross-tenant access denied",
      "Insufficient permissions"
    ],
    "decision_metadata": {
      "voting_power": 150
    }
  }
}
```

## Common Patterns

### Tenant Isolation

```rego
allow {
    input.subject.tenant_id == input.resource.tenant_id
}
```

### Role Check

```rego
has_role(role) {
    input.subject.roles[_] == role
}
```

### Ownership Check

```rego
is_owner {
    input.resource.owner_id == input.subject.id
}
```

### Quota Check

```rego
within_quota {
    current_usage < quota_limit
}
```

## Best Practices

1. **Default Deny**: Always start with `default allow = false`
2. **Explicit Allow**: Only allow when conditions are met
3. **Clear Messages**: Provide descriptive violation messages
4. **Type Safety**: Use future keywords for type checking
5. **Helper Functions**: Extract common logic to functions
6. **Test Coverage**: Write tests for all rules
7. **Documentation**: Comment complex logic

## Deployment

1. Place policy files in this directory
2. OPA loads policies on startup
3. Policies are available at `/v1/data/{package_name}`
4. Monitor OPA logs for policy errors

## Monitoring

Watch for:
- High denial rates (potential attack)
- Missing policy packages (deployment issue)
- Slow policy evaluation (optimization needed)
- Policy compilation errors (syntax issue)

## Support

- OPA Documentation: https://www.openpolicyagent.org/docs/
- Rego Playground: https://play.openpolicyagent.org/
- Policy Reference: /docs/SECURITY-HARDENING.md
