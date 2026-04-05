# Task Marketplace API Documentation

## Overview

The Task Marketplace service provides a comprehensive task-to-earn platform with intelligent skill matching, reward distribution, and event-driven architecture.

## Base URL

```
http://localhost:3005/api/v1
```

## Authentication

All authenticated endpoints require a Bearer token in the Authorization header:

```
Authorization: Bearer <token>
```

For development, also include these headers:
```
X-User-Id: <user-uuid>
X-User-Email: <user@example.com>
X-User-Role: user
```

## Endpoints Reference

### 1. List Tasks

Retrieve paginated list of tasks with advanced filtering.

**Endpoint:** `GET /tasks`

**Query Parameters:**

| Parameter | Type | Description | Default |
|-----------|------|-------------|---------|
| status | string | Filter by status | - |
| type | string | Filter by task type | - |
| category | string | Filter by category | - |
| difficulty | string | Filter by difficulty | - |
| min_reward | number | Minimum reward amount | - |
| max_reward | number | Maximum reward amount | - |
| required_skills | string | Comma-separated skills | - |
| search | string | Search in title/description | - |
| creator_id | uuid | Filter by creator | - |
| assignee_id | uuid | Filter by assignee | - |
| page | number | Page number | 1 |
| limit | number | Results per page (max 100) | 20 |
| sort_by | string | Sort field | created_at |
| sort_order | string | asc or desc | desc |

**Response:** `200 OK`

```json
{
  "success": true,
  "data": {
    "tasks": [
      {
        "id": "uuid",
        "creator_id": "uuid",
        "title": "Build React Dashboard",
        "description": "Create a responsive admin dashboard...",
        "type": "simple",
        "category": "development",
        "difficulty": "intermediate",
        "status": "open",
        "reward_amount": 150.00,
        "required_skills": ["React", "TypeScript", "CSS"],
        "min_reputation": 100,
        "max_submissions": null,
        "submission_count": 0,
        "assignee_id": null,
        "claimed_at": null,
        "expires_at": "2024-12-31T23:59:59Z",
        "created_at": "2024-01-15T10:00:00Z",
        "updated_at": "2024-01-15T10:00:00Z"
      }
    ],
    "total": 42,
    "page": 1,
    "limit": 20
  }
}
```

### 2. Create Task

Create a new task with optional milestones, attachments, and recurrence.

**Endpoint:** `POST /tasks`

**Authentication:** Required

**Request Body:**

```json
{
  "title": "Build E-commerce Checkout Flow",
  "description": "Implement a complete checkout process with payment integration, cart management, and order confirmation.",
  "type": "milestone",
  "category": "development",
  "difficulty": "advanced",
  "reward_amount": 500.00,
  "required_skills": ["React", "Node.js", "Stripe", "PostgreSQL"],
  "min_reputation": 300,
  "expires_at": "2024-06-30T23:59:59Z",
  "milestones": [
    {
      "title": "Shopping Cart Implementation",
      "description": "Create cart with add/remove/update functionality",
      "reward_amount": 100.00,
      "order": 1
    },
    {
      "title": "Payment Integration",
      "description": "Integrate Stripe payment processing",
      "reward_amount": 200.00,
      "order": 2
    },
    {
      "title": "Order Confirmation",
      "description": "Build order confirmation and email notifications",
      "reward_amount": 200.00,
      "order": 3
    }
  ],
  "attachments": [
    {
      "url": "https://example.com/wireframes.pdf",
      "filename": "wireframes.pdf",
      "mime_type": "application/pdf"
    }
  ]
}
```

**Response:** `201 Created`

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "creator_id": "uuid",
    "title": "Build E-commerce Checkout Flow",
    "status": "open",
    ...
  }
}
```

### 3. Get Task Details

Retrieve detailed information about a specific task.

**Endpoint:** `GET /tasks/:id`

**Response:** `200 OK`

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "creator_id": "uuid",
    "title": "Build React Dashboard",
    ...
  }
}
```

### 4. Claim Task

Claim an available task to work on it.

**Endpoint:** `POST /tasks/:id/claim`

**Authentication:** Required

**Request Body:**

```json
{
  "message": "I have 5 years of React experience and have built similar dashboards for e-commerce platforms. I can complete this within 5 days."
}
```

**Response:** `200 OK`

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "claimed",
    "assignee_id": "uuid",
    "claimed_at": "2024-01-15T14:30:00Z",
    ...
  }
}
```

**Error Responses:**

- `400 Bad Request`: Task not available, already claimed, or user not eligible
- `404 Not Found`: Task doesn't exist

### 5. Submit Proof of Work

Submit evidence of task completion.

**Endpoint:** `POST /tasks/:id/submit`

**Authentication:** Required

**Request Body:**

```json
{
  "proof_text": "I have successfully implemented the React dashboard with all requested features:\n\n1. User authentication\n2. Data visualization with charts\n3. Responsive design\n4. Dark mode support\n\nThe code is available at the GitHub repository linked below. All tests are passing with 95% code coverage.",
  "attachments": [
    {
      "url": "https://github.com/username/project",
      "filename": "GitHub Repository",
      "mime_type": "text/plain"
    },
    {
      "url": "https://example.com/screenshots.zip",
      "filename": "screenshots.zip",
      "mime_type": "application/zip"
    }
  ],
  "milestone_id": "uuid" // Optional, for milestone tasks
}
```

**Response:** `200 OK`

```json
{
  "success": true,
  "data": {
    "id": "submission-uuid",
    "task_id": "task-uuid",
    "user_id": "user-uuid",
    "proof_text": "...",
    "status": "pending",
    "submitted_at": "2024-01-20T16:45:00Z",
    ...
  }
}
```

### 6. Approve Submission

Approve a task submission and release payment.

**Endpoint:** `POST /tasks/submissions/:submissionId/approve`

**Authentication:** Required (must be task creator)

**Request Body:**

```json
{
  "feedback": "Excellent work! The dashboard exceeds expectations. The code quality is high, tests are comprehensive, and the UI is beautiful.",
  "rating": 5
}
```

**Response:** `200 OK`

```json
{
  "success": true,
  "data": {
    "id": "submission-uuid",
    "status": "approved",
    "feedback": "Excellent work!...",
    "rating": 5,
    "reviewed_at": "2024-01-21T09:15:00Z",
    ...
  }
}
```

### 7. Reject Submission

Reject a task submission with feedback.

**Endpoint:** `POST /tasks/submissions/:submissionId/reject`

**Authentication:** Required (must be task creator)

**Request Body:**

```json
{
  "feedback": "The implementation doesn't meet the requirements:\n1. Missing dark mode support\n2. Charts are not responsive on mobile\n3. Authentication has security vulnerabilities\n\nPlease address these issues and resubmit.",
  "rating": 2
}
```

**Response:** `200 OK`

### 8. Get User's Tasks

Retrieve tasks created by or assigned to the current user.

**Endpoint:** `GET /tasks/my-tasks`

**Authentication:** Required

**Query Parameters:**

| Parameter | Type | Description | Default |
|-----------|------|-------------|---------|
| role | string | 'creator' or 'assignee' | creator |

**Response:** `200 OK`

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "title": "My Task",
      ...
    }
  ]
}
```

### 9. Get Recommended Tasks

Get AI-powered task recommendations based on user profile.

**Endpoint:** `GET /tasks/recommended`

**Authentication:** Required

**Query Parameters:**

| Parameter | Type | Description | Default |
|-----------|------|-------------|---------|
| skills | string | Comma-separated skills | - |
| reputation | number | User reputation | 0 |
| completed_tasks | number | Completed task count | 0 |
| success_rate | number | Success rate (0-1) | 1.0 |
| average_rating | number | Average rating (1-5) | 5.0 |
| limit | number | Max recommendations | 10 |

**Response:** `200 OK`

```json
{
  "success": true,
  "data": [
    {
      "task": {
        "id": "uuid",
        "title": "Build React Component",
        ...
      },
      "match_score": 92,
      "reasons": [
        "Excellent match!",
        "You have all required skills",
        "Your reputation exceeds requirements",
        "Your high success rate makes you a trusted worker"
      ]
    },
    {
      "task": {...},
      "match_score": 78,
      "reasons": [
        "Strong match",
        "You have 2/3 required skills",
        "Your extensive experience fits this advanced task"
      ]
    }
  ]
}
```

### 10. Get Task Submissions

Retrieve all submissions for a task.

**Endpoint:** `GET /tasks/:id/submissions`

**Authentication:** Required

**Response:** `200 OK`

```json
{
  "success": true,
  "data": [
    {
      "id": "submission-uuid",
      "user_id": "user-uuid",
      "proof_text": "...",
      "status": "pending",
      "submitted_at": "2024-01-20T16:45:00Z",
      ...
    }
  ]
}
```

## Task Workflow

### Standard Task Flow

```
1. CREATE → Task is created with status 'open'
2. CLAIM → User claims task, status becomes 'claimed'
3. SUBMIT → User submits proof, status becomes 'submitted'
4. REVIEW → Creator reviews submission
   ├── APPROVE → Status becomes 'approved', reward distributed
   └── REJECT → Status becomes 'rejected', task reopened
```

### Milestone Task Flow

```
1. CREATE → Task with multiple milestones
2. CLAIM → User claims entire task
3. SUBMIT → User submits proof for milestone 1
4. APPROVE → Milestone 1 approved, partial reward
5. SUBMIT → User submits proof for milestone 2
6. APPROVE → Milestone 2 approved, partial reward
... (repeat for all milestones)
N. COMPLETE → All milestones approved, task complete
```

### Bounty Task Flow

```
1. CREATE → Bounty task with max_submissions: 10
2. CLAIM → Multiple users claim (up to limit)
3. SUBMIT → Multiple submissions received
4. REVIEW → Creator reviews all submissions
5. APPROVE → Best submission approved, reward to winner
6. REJECT → Other submissions rejected
```

## Error Responses

All error responses follow this format:

```json
{
  "success": false,
  "error": "Error message",
  "details": [
    {
      "field": "title",
      "message": "Title must be at least 5 characters"
    }
  ]
}
```

**Common HTTP Status Codes:**

- `200 OK`: Request successful
- `201 Created`: Resource created successfully
- `400 Bad Request`: Invalid input or business logic error
- `401 Unauthorized`: Missing or invalid authentication
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource doesn't exist
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error

## Rate Limiting

- **Window**: 15 minutes
- **Max Requests**: 100 per IP
- **Response Header**: `X-RateLimit-Remaining`

## Events Published

The service publishes these events to NATS:

- `task.created`: New task created
- `task.claimed`: Task claimed by user
- `task.completed`: Proof submitted
- `task.approved`: Submission approved
- `task.rejected`: Submission rejected
- `task.expired`: Task expired
- `task.disputed`: Dispute raised

## Best Practices

### For Task Creators

1. **Clear Requirements**: Provide detailed descriptions with acceptance criteria
2. **Fair Pricing**: Set rewards that reflect task complexity and time required
3. **Realistic Deadlines**: Allow sufficient time for quality work
4. **Provide Resources**: Attach design files, documentation, or examples
5. **Timely Reviews**: Review submissions within 24-48 hours
6. **Constructive Feedback**: Give specific, actionable feedback on rejections

### For Task Workers

1. **Read Carefully**: Understand all requirements before claiming
2. **Communicate**: Ask questions if requirements are unclear
3. **Quality Work**: Deliver professional, well-documented work
4. **Meet Deadlines**: Complete tasks within the specified timeframe
5. **Detailed Submissions**: Provide comprehensive proof of work
6. **Accept Feedback**: Use rejection feedback to improve

## Skill Matching Algorithm

The recommendation system uses a weighted scoring algorithm:

- **Skill Match (40%)**: Jaccard similarity between user and required skills
- **Reputation Fit (25%)**: Alignment of user reputation with task difficulty
- **Experience Level (20%)**: Completed tasks vs. difficulty requirements
- **Success Rate (15%)**: Historical success rate

**Match Score Ranges:**

- 90-100: Excellent match
- 70-89: Strong match
- 50-69: Good match
- 30-49: Fair match
- 0-29: Poor match (filtered out)

## Webhooks (Future)

Coming soon: Webhook support for task events.

## SDK Support (Future)

Official SDKs planned for:

- JavaScript/TypeScript
- Python
- PHP

## Support

For questions or issues, please contact the development team or open an issue in the repository.
