# UBI CMS — REST API Reference

**Base URL:** `https://api.ubi-platform.com/api/v1`  
**Local Dev:** `http://localhost:3000/api/v1`

---

## Table of Contents

- [Authentication](#authentication)
- [Error Handling](#error-handling)
- [Rate Limiting](#rate-limiting)
- [Endpoints](#endpoints)
  - [Health](#health)
  - [Auth](#auth)
  - [Tasks](#tasks)
  - [Rewards](#rewards)
  - [Treasury](#treasury)
  - [UBI](#ubi)
  - [Agents](#agents)
  - [Users (Admin)](#users-admin)

---

## Authentication

All protected endpoints require a **Bearer token** in the `Authorization` header.

```http
Authorization: Bearer <jwt_token>
```

Tokens are obtained via `POST /api/v1/auth/login` and expire after **24 hours**.

### JWT Payload

```json
{
  "userId": 42,
  "username": "alice",
  "roles": ["user"],
  "iat": 1700000000,
  "exp": 1700086400
}
```

### Roles

| Role | Permissions |
|------|-------------|
| `user` | All standard endpoints |
| `moderator` | + Create/update tasks, verify submissions |
| `admin` | + All moderator permissions + delete tasks, register agents, manage users |

---

## Error Handling

All error responses follow a consistent structure:

```json
{
  "error": "Human-readable error message"
}
```

**Validation errors** return an array:

```json
{
  "errors": [
    { "field": "email", "message": "Must be a valid email address" },
    { "field": "password", "message": "Minimum 12 characters required" }
  ]
}
```

### HTTP Status Codes

| Code | Meaning |
|------|---------|
| `200` | Success |
| `201` | Created |
| `400` | Bad Request / Validation Error |
| `401` | Unauthorized (missing or invalid token) |
| `403` | Forbidden (insufficient role) |
| `404` | Not Found |
| `409` | Conflict (duplicate resource) |
| `429` | Too Many Requests (rate limited) |
| `500` | Internal Server Error |
| `503` | Service Unavailable (database not ready) |

---

## Rate Limiting

Default limits applied globally:

| Window | Max Requests |
|--------|-------------|
| 15 minutes | 100 requests per IP |

Exceeding the limit returns `429 Too Many Requests` with a `Retry-After` header.

---

## Endpoints

---

### Health

#### `GET /health`

Unauthenticated liveness probe. Returns server status.

**Response `200`:**
```json
{
  "status": "healthy",
  "timestamp": "2026-03-29T12:00:00.000Z",
  "version": "1.0.0",
  "uptime": 3600.5
}
```

---

#### `GET /ready`

Unauthenticated readiness probe. Checks database connectivity.

**Response `200`:**
```json
{ "status": "ready" }
```

**Response `503`** (database unreachable):
```json
{ "status": "not ready", "error": "connection refused" }
```

---

### Auth

#### `POST /api/v1/auth/login`

Authenticate and receive a JWT.

**Request Body:**
```json
{
  "username": "alice",
  "password": "MySecurePass1!"
}
```

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `username` | string | ✅ | 3–50 chars |
| `password` | string | ✅ | 8+ chars |

**Response `200`:**
```json
{
  "token": "eyJhbGci...",
  "user": {
    "id": 42,
    "username": "alice",
    "email": "alice@example.com",
    "roles": ["user"],
    "status": "active",
    "kyc_verified": false
  }
}
```

**Response `401`:**
```json
{ "error": "Invalid credentials" }
```

---

#### `POST /api/v1/auth/register`

Create a new user account.

**Request Body:**
```json
{
  "username": "bob",
  "email": "bob@example.com",
  "password": "StrongPass@123"
}
```

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `username` | string | ✅ | 3–50 chars, alphanumeric + underscore |
| `email` | string | ✅ | Valid email |
| `password` | string | ✅ | 12+ chars, requires uppercase, lowercase, digit, special char |

**Response `201`:**
```json
{
  "token": "eyJhbGci...",
  "user": {
    "id": 43,
    "username": "bob",
    "email": "bob@example.com",
    "roles": ["user"],
    "status": "active",
    "kyc_verified": false
  }
}
```

**Response `409`:**
```json
{ "error": "Username already taken" }
```

---

#### `POST /api/v1/auth/logout`

🔒 **Requires authentication**

Invalidate the current session token.

**Response `200`:**
```json
{ "message": "Logged out successfully" }
```

---

#### `GET /api/v1/auth/me`

🔒 **Requires authentication**

Return the currently authenticated user's profile.

**Response `200`:**
```json
{
  "id": 42,
  "username": "alice",
  "email": "alice@example.com",
  "roles": ["user"],
  "status": "active",
  "wallet_address": null,
  "kyc_verified": false,
  "created_at": "2026-01-15T10:00:00.000Z"
}
```

---

### Tasks

#### `GET /api/v1/tasks`

🔒 **Requires authentication**

List tasks with optional filters.

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | integer | `1` | Page number |
| `limit` | integer | `20` | Items per page (max 100) |
| `status` | string | — | Filter: `open`, `in_progress`, `completed`, `cancelled` |
| `category` | string | — | Filter by category name |
| `difficulty` | string | — | Filter: `easy`, `medium`, `hard`, `expert` |
| `search` | string | — | Full-text search in title and description |

**Response `200`:**
```json
{
  "data": [
    {
      "id": 1,
      "title": "Translate Product Description",
      "description": "Translate 500-word product description from English to Spanish",
      "category": "translation",
      "difficulty": "easy",
      "reward_amount": 25,
      "reward_currency": "UBI",
      "max_participants": 3,
      "current_participants": 1,
      "status": "open",
      "deadline": "2026-04-15T23:59:00.000Z",
      "proof_requirements": "Provide translated document as PDF",
      "created_at": "2026-03-01T08:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "pages": 3
  }
}
```

---

#### `GET /api/v1/tasks/:id`

🔒 **Requires authentication**

Get a single task by ID.

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | integer | Task ID |

**Response `200`:** Single task object (same shape as list item).

**Response `404`:**
```json
{ "error": "Task not found" }
```

---

#### `POST /api/v1/tasks`

🔒 **Requires authentication** + `admin` or `moderator` role

Create a new task.

**Request Body:**
```json
{
  "title": "Transcribe Audio Recording",
  "description": "Transcribe a 10-minute audio recording",
  "category": "transcription",
  "difficulty": "medium",
  "reward_amount": 50,
  "reward_currency": "UBI",
  "max_participants": 5,
  "deadline": "2026-05-01T23:59:00.000Z",
  "proof_requirements": "Submit transcript as plain text"
}
```

**Response `201`:** Created task object.

---

#### `PUT /api/v1/tasks/:id`

🔒 **Requires authentication** + `admin` or `moderator` role

Update an existing task. All fields are optional (partial update).

**Response `200`:** Updated task object.

---

#### `DELETE /api/v1/tasks/:id`

🔒 **Requires authentication** + `admin` role

Soft-delete a task (sets status to `cancelled`).

**Response `200`:**
```json
{ "message": "Task deleted" }
```

---

#### `POST /api/v1/tasks/:id/assign`

🔒 **Requires authentication**

Assign the current user to a task (apply to participate).

**Response `200`:**
```json
{ "message": "Task assigned successfully", "assignment_id": 7 }
```

**Response `409`:**
```json
{ "error": "Already assigned to this task" }
```

---

#### `POST /api/v1/tasks/:id/submit`

🔒 **Requires authentication**

Submit proof of completion for an assigned task.

**Request Body:**
```json
{
  "proof": "https://link-to-my-proof.example.com"
}
```

**Response `200`:**
```json
{ "message": "Submission received, pending verification" }
```

---

#### `POST /api/v1/tasks/:id/verify`

🔒 **Requires authentication** + `admin` or `moderator` role

Verify a task submission and trigger reward distribution.

**Request Body:**
```json
{
  "assignment_id": 7,
  "approved": true,
  "feedback": "Great work!"
}
```

**Response `200`:**
```json
{ "message": "Submission verified and reward distributed" }
```

---

### Rewards

#### `GET /api/v1/rewards`

🔒 **Requires authentication**

List reward transactions for the authenticated user.

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | integer | `1` | Page number |
| `limit` | integer | `20` | Items per page |

**Response `200`:**
```json
{
  "data": [
    {
      "id": 101,
      "amount": 50,
      "currency": "UBI",
      "type": "task_completion",
      "source_type": "task",
      "source_id": 1,
      "status": "confirmed",
      "created_at": "2026-03-20T14:30:00.000Z",
      "processed_at": "2026-03-20T14:35:00.000Z"
    }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 12, "pages": 1 }
}
```

---

#### `GET /api/v1/rewards/balance`

🔒 **Requires authentication**

Get the current reward balance for the authenticated user.

**Response `200`:**
```json
{
  "balance": 425.5,
  "currency": "UBI"
}
```

---

#### `GET /api/v1/rewards/history`

🔒 **Requires authentication**

Paginated reward history (alias for `GET /rewards` with same schema).

---

### Treasury

#### `GET /api/v1/treasury/balance`

🔒 **Requires authentication**

Get the current treasury balance for the authenticated user.

**Response `200`:**
```json
{
  "balance": 1250.0,
  "currency": "UBI"
}
```

---

#### `GET /api/v1/treasury/strategies`

🔒 **Requires authentication**

List available yield strategies.

**Response `200`:**
```json
[
  {
    "id": 1,
    "name": "Stable Yield",
    "protocol": "Internal Reserve",
    "apy": 4.5,
    "risk_level": "low",
    "allocation": 40,
    "status": "active"
  },
  {
    "id": 2,
    "name": "Balanced Growth",
    "protocol": "DeFi Pool v2",
    "apy": 12.3,
    "risk_level": "medium",
    "allocation": 40,
    "status": "active"
  }
]
```

---

#### `POST /api/v1/treasury/deposit`

🔒 **Requires authentication**

Deposit UBI tokens into the treasury.

**Request Body:**
```json
{
  "amount": 100,
  "currency": "UBI"
}
```

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `amount` | number | ✅ | Must be > 0 |
| `currency` | string | ❌ | Default: `"UBI"` |

**Response `200`:**
```json
{
  "balance": 1350.0,
  "message": "Deposit successful"
}
```

---

#### `POST /api/v1/treasury/withdraw`

🔒 **Requires authentication**

Withdraw UBI tokens from the treasury.

**Request Body:**
```json
{
  "amount": 50,
  "currency": "UBI"
}
```

**Response `200`:**
```json
{
  "balance": 1300.0,
  "message": "Withdrawal successful"
}
```

**Response `400`:**
```json
{ "error": "Insufficient balance" }
```

---

#### `GET /api/v1/treasury/yield`

🔒 **Requires authentication**

Get yield information for the authenticated user's treasury position.

**Response `200`:**
```json
{
  "balance": 1300.0,
  "currency": "UBI",
  "current_apy": 8.4,
  "estimated_annual_yield": 109.2
}
```

---

### UBI

#### `GET /api/v1/ubi/balance`

🔒 **Requires authentication**

Get the current UBI balance for the authenticated user.

**Response `200`:**
```json
{
  "balance": 2450,
  "currency": "UBI"
}
```

---

#### `GET /api/v1/ubi/history`

🔒 **Requires authentication**

Get paginated UBI distribution history.

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | integer | `1` | Page number |
| `limit` | integer | `20` | Items per page |

**Response `200`:**
```json
{
  "data": [
    {
      "id": 201,
      "amount": 100,
      "currency": "UBI",
      "type": "ubi_distribution",
      "status": "confirmed",
      "created_at": "2026-03-01T00:00:00.000Z"
    }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 8, "pages": 1 }
}
```

---

#### `POST /api/v1/ubi/claim`

🔒 **Requires authentication**

Claim the next available UBI allocation.

**Response `200`:**
```json
{
  "amount": 100,
  "currency": "UBI",
  "message": "UBI claimed successfully"
}
```

**Response `400`:**
```json
{ "error": "No UBI available to claim at this time" }
```

---

#### `GET /api/v1/ubi/stats`

🔒 **Requires authentication** + `admin` role

Get platform-wide UBI distribution statistics.

**Response `200`:**
```json
{
  "active_users": 1247,
  "total_ubi_distributed": 124700,
  "total_claims": 8934
}
```

---

### Agents

#### `GET /api/v1/agents`

🔒 **Requires authentication**

List AI agents in the marketplace.

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | integer | `1` | Page number |
| `limit` | integer | `20` | Items per page |
| `capability` | string | — | Filter by capability type |
| `search` | string | — | Search in name and description |
| `status` | string | `active` | Filter: `active`, `inactive` |

**Response `200`:**
```json
{
  "data": [
    {
      "id": "agent-uuid-1",
      "name": "Text Summarizer Pro",
      "description": "Summarizes long documents into concise bullet points",
      "capability": "text_processing",
      "version": "2.1.0",
      "status": "active",
      "price_per_call": 0.5,
      "pricing_model": "per_call",
      "total_calls": 4823,
      "success_rate": 98.2,
      "created_at": "2026-01-10T08:00:00.000Z"
    }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 18, "pages": 1 }
}
```

---

#### `GET /api/v1/agents/:id`

🔒 **Requires authentication**

Get a single agent by ID.

**Response `200`:** Single agent object (same as list item).

**Response `404`:**
```json
{ "error": "Agent not found" }
```

---

#### `POST /api/v1/agents`

🔒 **Requires authentication** + `admin` role

Register a new AI agent in the marketplace.

**Request Body:**
```json
{
  "name": "Code Reviewer",
  "description": "Reviews code for bugs and style issues",
  "capability": "code_review",
  "endpoint": "https://agent.example.com/execute",
  "auth_type": "api_key",
  "pricing_model": "per_call",
  "price_per_call": 1.0
}
```

| Field | Type | Required | Default |
|-------|------|----------|---------|
| `name` | string | ✅ | — |
| `description` | string | ✅ | — |
| `capability` | string | ✅ | — |
| `endpoint` | string | ✅ | — |
| `auth_type` | string | ❌ | `"api_key"` |
| `pricing_model` | string | ❌ | `"free"` |
| `price_per_call` | number | ❌ | `0` |

**Response `201`:** Created agent object.

---

#### `POST /api/v1/agents/:id/execute`

🔒 **Requires authentication**

Execute an AI agent with a given input payload.

**Request Body:**
```json
{
  "input": {
    "text": "Summarize this content...",
    "max_length": 200
  }
}
```

**Response `200`:**
```json
{
  "execution_id": "exec-uuid-123",
  "output": {
    "summary": "Key points: ...",
    "word_count": 145
  },
  "duration_ms": 823,
  "cost": 0.5
}
```

---

### Users (Admin)

#### `GET /api/v1/users`

🔒 **Requires authentication** + `admin` role

List all platform users.

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | integer | `1` | Page number |
| `limit` | integer | `20` | Items per page |
| `search` | string | — | Search in username and email |

**Response `200`:**
```json
{
  "data": [
    {
      "id": 42,
      "username": "alice",
      "email": "alice@example.com",
      "roles": ["user"],
      "status": "active",
      "kyc_verified": false,
      "created_at": "2026-01-15T10:00:00.000Z"
    }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 1247, "pages": 63 }
}
```

---

## Code Examples

### JavaScript / TypeScript (Fetch)

```typescript
const API_BASE = 'https://api.ubi-platform.com/api/v1';
const token = localStorage.getItem('ubi_token');

// Login
const loginRes = await fetch(`${API_BASE}/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username: 'alice', password: 'MySecurePass1!' }),
});
const { token, user } = await loginRes.json();

// Fetch tasks (authenticated)
const tasksRes = await fetch(`${API_BASE}/tasks?difficulty=easy&status=open`, {
  headers: { 'Authorization': `Bearer ${token}` },
});
const { data: tasks, pagination } = await tasksRes.json();

// Claim UBI
const claimRes = await fetch(`${API_BASE}/ubi/claim`, {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` },
});
const { amount, message } = await claimRes.json();
```

### cURL

```bash
# Login
TOKEN=$(curl -s -X POST https://api.ubi-platform.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"alice","password":"MySecurePass1!"}' \
  | jq -r '.token')

# Get UBI balance
curl -H "Authorization: Bearer $TOKEN" \
  https://api.ubi-platform.com/api/v1/ubi/balance

# Claim UBI
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  https://api.ubi-platform.com/api/v1/ubi/claim

# List tasks
curl -H "Authorization: Bearer $TOKEN" \
  "https://api.ubi-platform.com/api/v1/tasks?status=open&difficulty=medium"
```

---

## Pagination

All list endpoints return a consistent pagination envelope:

```json
{
  "data": [ /* ... items ... */ ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 120,
    "pages": 6
  }
}
```

To fetch subsequent pages, pass `?page=2&limit=20` as query parameters.
