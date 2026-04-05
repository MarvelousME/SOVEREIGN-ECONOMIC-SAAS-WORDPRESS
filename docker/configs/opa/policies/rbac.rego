package rbac

# Role-Based Access Control Policy
# Defines roles, permissions, and hierarchical access control

import future.keywords.if
import future.keywords.in

default allow = false

# Role Definitions
role_permissions := {
    "platform_admin": [
        "system:*",
        "tenant:*",
        "user:*",
        "agent:*",
        "treasury:*",
        "governance:*",
        "audit:*"
    ],
    "tenant_admin": [
        "tenant:read",
        "tenant:update",
        "user:create",
        "user:read",
        "user:update",
        "user:delete",
        "agent:*",
        "treasury:read",
        "governance:*",
        "audit:read"
    ],
    "treasury_admin": [
        "treasury:read",
        "treasury:write",
        "treasury:allocate",
        "treasury:withdraw",
        "treasury:report"
    ],
    "treasury_member": [
        "treasury:read",
        "treasury:spend:limited"
    ],
    "agent_creator": [
        "agent:create",
        "agent:read",
        "agent:update:own",
        "agent:delete:own"
    ],
    "task_creator": [
        "task:create",
        "task:read",
        "task:update:own",
        "task:delete:own",
        "task:approve:own"
    ],
    "task_worker": [
        "task:read",
        "task:claim",
        "task:submit"
    ],
    "governance_member": [
        "governance:proposal:create",
        "governance:proposal:read",
        "governance:vote"
    ],
    "audit_admin": [
        "audit:read",
        "audit:export"
    ],
    "user": [
        "user:read:own",
        "user:update:own",
        "data:read:own",
        "data:export:own"
    ]
}

# Role hierarchy (parent roles inherit child permissions)
role_hierarchy := {
    "platform_admin": ["tenant_admin", "audit_admin"],
    "tenant_admin": ["treasury_admin", "governance_member"],
    "treasury_admin": ["treasury_member"],
    "agent_creator": ["user"],
    "task_creator": ["task_worker", "user"],
    "task_worker": ["user"],
    "governance_member": ["user"],
    "audit_admin": ["user"]
}

# Get all roles for user (including inherited)
user_roles[role] {
    role := input.subject.roles[_]
}

user_roles[inherited_role] {
    role := input.subject.roles[_]
    inherited_role := role_hierarchy[role][_]
}

# Get all permissions for user
user_permissions[permission] {
    role := user_roles[_]
    permission := role_permissions[role][_]
}

# Check if user has specific permission
has_permission(required_permission) {
    some permission in user_permissions
    permission_matches(permission, required_permission)
}

# Permission matching logic
permission_matches(granted, required) {
    granted == required
}

permission_matches(granted, required) {
    # Wildcard matching: "agent:*" grants "agent:create"
    glob.match(granted, [":"], required)
}

# ALLOW: User has required permission
allow {
    required_permission := sprintf("%s:%s", [input.resource_type, input.action])
    has_permission(required_permission)
    check_ownership_constraint
}

# ALLOW: System operations
allow {
    input.subject.type == "system"
    validate_system_token
}

# Ownership constraints
check_ownership_constraint {
    not requires_ownership
}

check_ownership_constraint {
    requires_ownership
    is_resource_owner
}

requires_ownership {
    some permission in user_permissions
    contains(permission, ":own")
}

is_resource_owner {
    input.resource.owner_id == input.subject.id
}

is_resource_owner {
    input.resource.creator_id == input.subject.id
}

is_resource_owner {
    input.resource.user_id == input.subject.id
}

# System token validation
validate_system_token {
    input.subject.system_token
    # In production: verify signature
    true
}

# Role assignment rules
allow_assign_role {
    input.action == "assign_role"
    can_assign_role
}

can_assign_role {
    # Platform admin can assign any role
    has_permission("system:*")
}

can_assign_role {
    # Tenant admin can assign roles within their hierarchy
    has_permission("tenant:*")
    target_role := input.target_role
    is_subordinate_role(target_role)
}

is_subordinate_role(role) {
    some user_role in user_roles
    subordinates := subordinate_roles(user_role)
    role in subordinates
}

subordinate_roles(parent_role) := roles {
    roles := {r | 
        some child in role_hierarchy[parent_role]
        r := child
    }
}

subordinate_roles(parent_role) := roles {
    roles := {r |
        some child in role_hierarchy[parent_role]
        some grandchild in subordinate_roles(child)
        r := grandchild
    }
}

# DENY: Role escalation attempt
deny_role_escalation[msg] {
    input.action == "assign_role"
    target_role := input.target_role
    not can_assign_role
    msg := sprintf("Cannot assign role '%s': insufficient permissions", [target_role])
}

# DENY: Self role assignment
deny_self_assignment[msg] {
    input.action == "assign_role"
    input.target_user_id == input.subject.id
    msg := "Cannot assign roles to yourself"
}

# Permission checking helper for other policies
check_action(resource_type, action) {
    required := sprintf("%s:%s", [resource_type, action])
    has_permission(required)
}

# Main decision
allow {
    allow_assign_role
}

# Violations
violations[msg] {
    msg := deny_role_escalation[_]
}

violations[msg] {
    msg := deny_self_assignment[_]
}

# Additional metadata for debugging
decision_metadata := {
    "user_roles": user_roles,
    "user_permissions": user_permissions,
    "required_permission": sprintf("%s:%s", [input.resource_type, input.action]),
    "has_required_permission": has_permission(sprintf("%s:%s", [input.resource_type, input.action]))
}
