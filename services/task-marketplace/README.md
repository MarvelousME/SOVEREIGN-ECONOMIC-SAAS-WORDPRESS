# Task-to-Earn Marketplace Service

A comprehensive task marketplace service for the UBI-CMS platform with skill-based routing, reward distribution, and AI-powered task recommendations.

## Features

- **Task Management**: Create, claim, and complete tasks
- **Multiple Task Types**: Simple, bounty, recurring, milestone, and survey tasks
- **Skill Matching**: AI-powered algorithm for matching users to tasks
- **Proof-of-Work**: Submission and review system
- **Reward Distribution**: Automated reward processing on task approval
- **Event-Driven**: NATS integration for real-time updates
- **Dispute Resolution**: Built-in dispute management workflow
- **Task Expiration**: Automated handling of expired tasks
- **Recurring Tasks**: Support for daily, weekly, and monthly tasks
- **Milestone Tasks**: Multi-step tasks with individual rewards

## Architecture

```
task-marketplace/
├── src/
│   ├── config/         # Database, Redis, NATS configuration
│   ├── types/          # TypeScript type definitions
│   ├── models/         # Data models
│   ├── repositories/   # Data access layer
│   ├── services/       # Business logic
│   │   ├── task.service.ts
│   │   ├── skill-matching.service.ts
│   │   └── event.service.ts
│   ├── routes/         # API endpoints
│   ├── middleware/     # Authentication, validation
│   ├── utils/          # Utilities (logger, etc.)
│   └── index.ts        # Application entry point
├── migrations/         # Database migrations
└── tests/             # Unit and integration tests
```

## Installation

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env with your configuration
nano .env

# Run database migrations
psql -U ubi_user -d ubi_cms -f ../../migrations/007_create_task_marketplace_tables.sql

# Build
npm run build

# Run in development
npm run dev

# Run in production
npm start
```

## API Endpoints

### Tasks

#### List Tasks
```http
GET /api/v1/tasks?status=open&category=development&difficulty=intermediate&page=1&limit=20
```

**Query Parameters:**
- `status`: Filter by task status (open, claimed, completed, etc.)
- `type`: Filter by task type (simple, bounty, recurring, etc.)
- `category`: Filter by category
- `difficulty`: Filter by difficulty level
- `min_reward`, `max_reward`: Filter by reward range
- `required_skills`: Comma-separated list of skills
- `search`: Search in title and description
- `page`: Page number (default: 1)
- `limit`: Results per page (default: 20, max: 100)
- `sort_by`: Sort field (created_at, reward_amount, difficulty, expires_at)
- `sort_order`: Sort order (asc, desc)

**Response:**
```json
{
  "success": true,
  "data": {
    "tasks": [...],
    "total": 150,
    "page": 1,
    "limit": 20
  }
}
```

#### Create Task
```http
POST /api/v1/tasks
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "title": "Build a React Component",
  "description": "Create a reusable button component with TypeScript",
  "type": "simple",
  "category": "development",
  "difficulty": "intermediate",
  "reward_amount": 50.00,
  "required_skills": ["React", "TypeScript", "CSS"],
  "min_reputation": 100,
  "expires_at": "2024-12-31T23:59:59Z",
  "attachments": [
    {
      "url": "https://example.com/design.png",
      "filename": "design.png",
      "mime_type": "image/png"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "creator_id": "uuid",
    "title": "Build a React Component",
    "status": "open",
    ...
  }
}
```

#### Get Task Details
```http
GET /api/v1/tasks/:id
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "title": "Build a React Component",
    ...
  }
}
```

#### Claim Task
```http
POST /api/v1/tasks/:id/claim
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "message": "I have 5 years of React experience and can complete this in 2 days"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "claimed",
    "assignee_id": "uuid",
    "claimed_at": "2024-01-15T10:00:00Z",
    ...
  }
}
```

#### Submit Proof of Work
```http
POST /api/v1/tasks/:id/submit
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "proof_text": "I've completed the React button component. The code is available in the attached repository. It includes TypeScript types, unit tests, and documentation.",
  "attachments": [
    {
      "url": "https://github.com/user/repo",
      "filename": "repository",
      "mime_type": "text/plain"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "submission-uuid",
    "task_id": "task-uuid",
    "user_id": "user-uuid",
    "status": "pending",
    ...
  }
}
```

#### Approve Submission
```http
POST /api/v1/tasks/submissions/:submissionId/approve
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "feedback": "Excellent work! The component is well-tested and documented.",
  "rating": 5
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "submission-uuid",
    "status": "approved",
    "rating": 5,
    ...
  }
}
```

#### Reject Submission
```http
POST /api/v1/tasks/submissions/:submissionId/reject
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "feedback": "The component doesn't meet the TypeScript requirements. Please add proper type definitions.",
  "rating": 2
}
```

#### Get User's Tasks
```http
GET /api/v1/tasks/my-tasks?role=creator
Authorization: Bearer <token>
```

**Query Parameters:**
- `role`: Either `creator` (tasks you created) or `assignee` (tasks assigned to you)

#### Get Recommended Tasks
```http
GET /api/v1/tasks/recommended?skills=React,TypeScript&reputation=250&completed_tasks=15
Authorization: Bearer <token>
```

**Query Parameters:**
- `skills`: Comma-separated list of user skills
- `reputation`: User reputation score
- `completed_tasks`: Number of completed tasks
- `success_rate`: Success rate (0-1)
- `average_rating`: Average rating (1-5)
- `limit`: Number of recommendations (default: 10)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "task": {...},
      "match_score": 85,
      "reasons": [
        "Excellent match!",
        "You have all required skills",
        "Your reputation exceeds requirements"
      ]
    }
  ]
}
```

#### Get Task Submissions
```http
GET /api/v1/tasks/:id/submissions
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "submission-uuid",
      "user_id": "user-uuid",
      "status": "pending",
      "proof_text": "...",
      ...
    }
  ]
}
```

## Task Types

### Simple Tasks
One-time completion tasks with a single reward.

```json
{
  "type": "simple",
  "reward_amount": 50.00
}
```

### Bounty Tasks
Competitive tasks where the best submission wins.

```json
{
  "type": "bounty",
  "max_submissions": 10,
  "reward_amount": 500.00
}
```

### Recurring Tasks
Tasks that repeat on a schedule.

```json
{
  "type": "recurring",
  "recurrence": {
    "frequency": "weekly",
    "end_date": "2024-12-31T23:59:59Z"
  }
}
```

### Milestone Tasks
Multi-step tasks with individual milestone rewards.

```json
{
  "type": "milestone",
  "milestones": [
    {
      "title": "Design Phase",
      "description": "Create wireframes and mockups",
      "reward_amount": 100.00,
      "order": 1
    },
    {
      "title": "Implementation",
      "description": "Build the feature",
      "reward_amount": 300.00,
      "order": 2
    }
  ]
}
```

### Survey Tasks
Simple questionnaire tasks.

```json
{
  "type": "survey",
  "reward_amount": 5.00
}
```

## Difficulty Levels

- **Beginner**: Low skill requirements, 0-100 reputation, low rewards
- **Intermediate**: Moderate skills, 100-300 reputation, medium rewards
- **Advanced**: High skills, 300-600 reputation, high rewards
- **Expert**: Specialized skills, 500+ reputation, very high rewards

## Skill Matching Algorithm

The skill matching algorithm calculates a match score (0-100) based on:

1. **Skill Match (40%)**: Jaccard similarity between user and required skills
2. **Reputation Fit (25%)**: How well user reputation matches task difficulty
3. **Experience Level (20%)**: Completed tasks vs. difficulty requirements
4. **Success Rate (15%)**: Historical success rate

## Events

The service publishes the following events to NATS:

- `task.created`: When a new task is created
- `task.claimed`: When a user claims a task
- `task.completed`: When proof is submitted
- `task.approved`: When a submission is approved
- `task.rejected`: When a submission is rejected
- `task.expired`: When a task expires
- `task.disputed`: When a dispute is raised

The service subscribes to:

- `reputation.updated`: To refresh user cache and update recommendations

## Environment Variables

See `.env.example` for all configuration options.

## Testing

```bash
# Run unit tests
npm test

# Run tests in watch mode
npm run test:watch

# Run integration tests
npm run test:integration

# Generate coverage report
npm test -- --coverage
```

## Development

```bash
# Run in development mode with hot reload
npm run dev

# Lint code
npm run lint

# Fix linting issues
npm run lint:fix

# Type check
npm run typecheck
```

## Production Deployment

```bash
# Build production bundle
npm run build

# Start production server
npm start
```

## Docker

```bash
# Build image
docker build -t ubi-cms/task-marketplace .

# Run container
docker run -p 3005:3005 --env-file .env ubi-cms/task-marketplace
```

## License

MIT
