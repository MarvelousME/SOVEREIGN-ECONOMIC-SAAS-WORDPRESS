# Task Marketplace - Quick Start Guide

## 🚀 Get Started in 5 Minutes

### Prerequisites

- Node.js 18+
- PostgreSQL 13+
- Redis 6+
- NATS Server 2.9+

### Installation

```bash
# 1. Navigate to service directory
cd services/task-marketplace

# 2. Install dependencies
npm install

# 3. Set up environment
cp .env.example .env

# 4. Edit .env file
nano .env  # or use your preferred editor
```

### Database Setup

```bash
# Run migration
psql -U ubi_user -d ubi_cms -f ../../migrations/007_create_task_marketplace_tables.sql

# Verify tables created
psql -U ubi_user -d ubi_cms -c "\dt task*"
```

### Running the Service

```bash
# Development mode (hot reload)
npm run dev

# Production build
npm run build
npm start

# Run tests
npm test
```

### Test the API

```bash
# Health check
curl http://localhost:3005/health

# List tasks
curl http://localhost:3005/api/v1/tasks

# Create a task
curl -X POST http://localhost:3005/api/v1/tasks \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "X-User-Id: YOUR_USER_ID" \
  -d '{
    "title": "My First Task",
    "description": "This is a test task to get started",
    "type": "simple",
    "category": "development",
    "difficulty": "beginner",
    "reward_amount": 50.00,
    "required_skills": ["JavaScript"]
  }'
```

### Docker Quick Start

```bash
# Build image
docker build -t task-marketplace .

# Run container
docker run -d \
  --name task-marketplace \
  -p 3005:3005 \
  -e DATABASE_URL=postgresql://ubi_user:password@host.docker.internal:5432/ubi_cms \
  -e NATS_URL=nats://host.docker.internal:4222 \
  -e REDIS_HOST=host.docker.internal \
  task-marketplace

# Check logs
docker logs -f task-marketplace
```

## 📚 Common Operations

### Create a Simple Task

```javascript
POST /api/v1/tasks
{
  "title": "Build a Login Form",
  "description": "Create a responsive login form with validation",
  "type": "simple",
  "category": "development",
  "difficulty": "beginner",
  "reward_amount": 25.00,
  "required_skills": ["HTML", "CSS", "JavaScript"]
}
```

### Create a Milestone Task

```javascript
POST /api/v1/tasks
{
  "title": "Build E-commerce Platform",
  "description": "Full e-commerce website",
  "type": "milestone",
  "category": "development",
  "difficulty": "advanced",
  "reward_amount": 1000.00,
  "milestones": [
    {
      "title": "Product Catalog",
      "description": "Build product listing and details",
      "reward_amount": 300.00,
      "order": 1
    },
    {
      "title": "Shopping Cart",
      "description": "Implement cart functionality",
      "reward_amount": 300.00,
      "order": 2
    },
    {
      "title": "Checkout & Payment",
      "description": "Complete checkout flow",
      "reward_amount": 400.00,
      "order": 3
    }
  ]
}
```

### Get Recommended Tasks

```bash
GET /api/v1/tasks/recommended?skills=React,TypeScript&reputation=250&completed_tasks=15
```

### Claim a Task

```javascript
POST /api/v1/tasks/:taskId/claim
{
  "message": "I'm experienced with this technology and can deliver in 3 days"
}
```

### Submit Work

```javascript
POST /api/v1/tasks/:taskId/submit
{
  "proof_text": "Task completed! Here's what I did:\n1. ...\n2. ...\n3. ...",
  "attachments": [
    {
      "url": "https://github.com/user/repo",
      "filename": "Repository Link",
      "mime_type": "text/plain"
    }
  ]
}
```

## 🔍 Troubleshooting

### Service won't start

**Check PostgreSQL connection:**
```bash
psql -U ubi_user -d ubi_cms -c "SELECT 1"
```

**Check NATS:**
```bash
nats-server --version
```

**Check Redis:**
```bash
redis-cli ping
```

### Database errors

```bash
# Reset database (WARNING: Deletes all data)
psql -U ubi_user -d ubi_cms -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"

# Re-run migrations
psql -U ubi_user -d ubi_cms -f ../../migrations/007_create_task_marketplace_tables.sql
```

### Port already in use

```bash
# Change port in .env
PORT=3006

# Or kill process on port 3005
# Linux/Mac:
lsof -ti:3005 | xargs kill -9

# Windows:
netstat -ano | findstr :3005
taskkill /PID <PID> /F
```

## 📖 Next Steps

1. Read the [README.md](./README.md) for detailed documentation
2. Check [API-DOCUMENTATION.md](./API-DOCUMENTATION.md) for API reference
3. Review [IMPLEMENTATION-SUMMARY.md](./IMPLEMENTATION-SUMMARY.md) for architecture details
4. Explore the test files in `src/__tests__/` for usage examples

## 🆘 Need Help?

- Check logs: `npm run dev` (development) or `docker logs task-marketplace` (Docker)
- Run tests: `npm test`
- Verify database: Check migration status and table creation
- Check connections: Ensure PostgreSQL, NATS, and Redis are running

## 🎯 Example Workflow

```bash
# 1. Start the service
npm run dev

# 2. Create a task (as creator)
curl -X POST http://localhost:3005/api/v1/tasks \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer token" \
  -H "X-User-Id: creator-123" \
  -d @examples/simple-task.json

# 3. List available tasks
curl http://localhost:3005/api/v1/tasks?status=open

# 4. Get recommendations (as worker)
curl "http://localhost:3005/api/v1/tasks/recommended?skills=React,TypeScript" \
  -H "Authorization: Bearer token" \
  -H "X-User-Id: worker-456"

# 5. Claim a task
curl -X POST http://localhost:3005/api/v1/tasks/TASK_ID/claim \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer token" \
  -H "X-User-Id: worker-456" \
  -d '{"message": "I can do this!"}'

# 6. Submit proof
curl -X POST http://localhost:3005/api/v1/tasks/TASK_ID/submit \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer token" \
  -H "X-User-Id: worker-456" \
  -d @examples/submission.json

# 7. Approve submission (as creator)
curl -X POST http://localhost:3005/api/v1/tasks/submissions/SUBMISSION_ID/approve \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer token" \
  -H "X-User-Id: creator-123" \
  -d '{"feedback": "Great work!", "rating": 5}'
```

Happy task marketing! 🎉
