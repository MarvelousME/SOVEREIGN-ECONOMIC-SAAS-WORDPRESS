package tasks

# Task Policy
# Controls task creation, claiming, and approval

import future.keywords.if
import future.keywords.in

default allow = false

# Task Creation Rules
# Can user create task?

# ALLOW: Create task with sufficient reputation and balance
allow_create_task {
    input.action == "create_task"
    has_creator_reputation
    has_reward_balance
    valid_task_parameters
    not spam_detected
}

# DENY: Insufficient reputation
deny_create_task[msg] {
    input.action == "create_task"
    not has_creator_reputation
    msg := sprintf("Minimum reputation of %v required to create tasks, user has %v", [min_creator_reputation, user_reputation])
}

# DENY: Insufficient balance for reward
deny_create_task[msg] {
    input.action == "create_task"
    not has_reward_balance
    msg := sprintf("Insufficient balance for task reward: need %v, have %v", [input.task.reward, user_balance])
}

# DENY: Invalid task parameters
deny_create_task[msg] {
    input.action == "create_task"
    not valid_task_parameters
    msg := sprintf("Invalid task parameters: %v", [task_validation_errors])
}

# DENY: Spam detected
deny_create_task[msg] {
    input.action == "create_task"
    spam_detected
    msg := "Task creation rate limit exceeded or spam detected"
}

# Task Claiming Rules
# Can user claim task?

# ALLOW: Claim task if eligible
allow_claim_task {
    input.action == "claim_task"
    task_available
    user_eligible
    has_required_skills
    within_concurrent_limit
    not banned_from_creator
}

# DENY: Task not available
deny_claim_task[msg] {
    input.action == "claim_task"
    not task_available
    msg := sprintf("Task not available: status is %v", [task_status])
}

# DENY: User not eligible
deny_claim_task[msg] {
    input.action == "claim_task"
    not user_eligible
    msg := sprintf("User not eligible: reputation %v, required %v", [user_reputation, required_reputation])
}

# DENY: Missing required skills
deny_claim_task[msg] {
    input.action == "claim_task"
    not has_required_skills
    msg := sprintf("Missing required skills: need %v, have %v", [required_skills, user_skills])
}

# DENY: Concurrent task limit
deny_claim_task[msg] {
    input.action == "claim_task"
    not within_concurrent_limit
    msg := sprintf("Concurrent task limit exceeded: %v/%v tasks in progress", [active_tasks, max_concurrent_tasks])
}

# DENY: Banned by creator
deny_claim_task[msg] {
    input.action == "claim_task"
    banned_from_creator
    msg := "You are banned from claiming tasks from this creator"
}

# Task Approval Rules
# Can user approve task completion?

# ALLOW: Owner can approve
allow_approve_task {
    input.action == "approve_task"
    is_task_owner
    task_submitted
    not already_approved
}

# ALLOW: Delegated approver can approve
allow_approve_task {
    input.action == "approve_task"
    is_delegated_approver
    task_submitted
    not already_approved
}

# DENY: Not task owner
deny_approve_task[msg] {
    input.action == "approve_task"
    not is_task_owner
    not is_delegated_approver
    msg := "Only task owner or delegated approver can approve completion"
}

# DENY: Task not submitted
deny_approve_task[msg] {
    input.action == "approve_task"
    not task_submitted
    msg := sprintf("Task must be submitted before approval: current status is %v", [task_status])
}

# DENY: Already approved
deny_approve_task[msg] {
    input.action == "approve_task"
    already_approved
    msg := "Task already approved"
}

# Task Rejection Rules
# Can user reject task?

# ALLOW: Owner can reject with reason
allow_reject_task {
    input.action == "reject_task"
    is_task_owner
    has_rejection_reason
    not excessive_rejections
}

# DENY: Missing rejection reason
deny_reject_task[msg] {
    input.action == "reject_task"
    not has_rejection_reason
    msg := "Rejection reason required"
}

# DENY: Excessive rejections
deny_reject_task[msg] {
    input.action == "reject_task"
    excessive_rejections
    msg := sprintf("Excessive rejections: %v rejections (threshold: %v)", [owner_rejection_count, max_rejections])
}

# Helper Functions

# User reputation
user_reputation := input.subject.reputation_score {
    input.subject.reputation_score
}

user_reputation := 0 {
    not input.subject.reputation_score
}

min_creator_reputation := 25

has_creator_reputation {
    user_reputation >= min_creator_reputation
}

# User balance
user_balance := input.subject.balance {
    input.subject.balance
}

user_balance := 0 {
    not input.subject.balance
}

has_reward_balance {
    user_balance >= input.task.reward
}

# Task validation
valid_task_parameters {
    input.task.title
    count(input.task.title) >= 10
    count(input.task.title) <= 200
    input.task.description
    count(input.task.description) >= 50
    input.task.reward > 0
    input.task.deadline
}

task_validation_errors := errors {
    errors := [msg |
        not input.task.title
        msg := "Title is required"
    ]
}

# Spam detection
spam_detected {
    tasks_created_last_hour > 10
}

tasks_created_last_hour := input.subject.tasks_created_last_hour {
    input.subject.tasks_created_last_hour
}

tasks_created_last_hour := 0 {
    not input.subject.tasks_created_last_hour
}

# Task availability
task_status := input.resource.status {
    input.resource.status
}

task_status := "unknown" {
    not input.resource.status
}

task_available {
    task_status == "open"
}

# User eligibility
required_reputation := input.resource.required_reputation {
    input.resource.required_reputation
}

required_reputation := 0 {
    not input.resource.required_reputation
}

user_eligible {
    user_reputation >= required_reputation
}

# Skills matching
required_skills := input.resource.required_skills {
    input.resource.required_skills
}

required_skills := [] {
    not input.resource.required_skills
}

user_skills := input.subject.skills {
    input.subject.skills
}

user_skills := [] {
    not input.subject.skills
}

has_required_skills {
    count(required_skills) == 0
}

has_required_skills {
    every skill in required_skills {
        skill in user_skills
    }
}

# Concurrent tasks
active_tasks := count(input.subject.active_tasks) {
    input.subject.active_tasks
}

active_tasks := 0 {
    not input.subject.active_tasks
}

max_concurrent_tasks := 5

within_concurrent_limit {
    active_tasks < max_concurrent_tasks
}

# Bans
banned_from_creator {
    input.resource.creator_id
    input.resource.creator_banned_users[_] == input.subject.id
}

# Ownership
is_task_owner {
    input.resource.creator_id == input.subject.id
}

is_delegated_approver {
    input.resource.approvers[_] == input.subject.id
}

# Submission status
task_submitted {
    task_status == "submitted"
}

task_submitted {
    task_status == "under_review"
}

already_approved {
    task_status == "approved"
}

already_approved {
    task_status == "completed"
}

# Rejection tracking
has_rejection_reason {
    input.rejection_reason
    count(input.rejection_reason) >= 20
}

owner_rejection_count := input.resource.creator_rejection_count {
    input.resource.creator_rejection_count
}

owner_rejection_count := 0 {
    not input.resource.creator_rejection_count
}

max_rejections := 10

excessive_rejections {
    owner_rejection_count >= max_rejections
}

# Main decision
allow {
    allow_create_task
}

allow {
    allow_claim_task
}

allow {
    allow_approve_task
}

allow {
    allow_reject_task
}

# Collect violations
violations[msg] {
    msg := deny_create_task[_]
}

violations[msg] {
    msg := deny_claim_task[_]
}

violations[msg] {
    msg := deny_approve_task[_]
}

violations[msg] {
    msg := deny_reject_task[_]
}
