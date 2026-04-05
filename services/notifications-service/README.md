# Notifications Service

Multi-channel notification service for the UBI-CMS platform with support for email, SMS, push, and in-app notifications.

## Features

- **Multi-Channel Support**: Email (SendGrid), SMS (Twilio), Push (FCM), In-App
- **Template Management**: Handlebars-based templates with localization
- **Delivery Tracking**: Full notification lifecycle tracking
- **User Preferences**: Per-user and per-type channel preferences
- **Batching & Scheduling**: Scheduled notifications and digest mode
- **Do-Not-Disturb**: Configurable quiet hours
- **Event-Driven**: Consumes events from NATS for automatic notifications

## API Endpoints

### Notifications
- `GET /api/v1/notifications` - List user notifications
- `GET /api/v1/notifications/:id` - Get notification details
- `POST /api/v1/notifications/:id/read` - Mark notification as read
- `POST /api/v1/notifications/read-all` - Mark all notifications as read

### Preferences
- `GET /api/v1/notifications/preferences` - Get user preferences
- `PUT /api/v1/notifications/preferences` - Update user preferences

## Notification Types

- `task_assigned` - New task assigned to user
- `task_approved` - Task submission approved
- `task_rejected` - Task submission rejected
- `ubi_distribution` - UBI payment received
- `reward_received` - Reward issued
- `treasury_performance` - Treasury performance update
- `agent_execution_complete` - AI agent finished execution
- `governance_proposal` - New governance proposal
- `system_alert` - System-level alerts

## Environment Variables

See `.env.example` for required configuration:
- SendGrid API key for email
- Twilio credentials for SMS
- Firebase credentials for push notifications
- PostgreSQL and Redis connection details
- NATS connection details

## Installation

```bash
npm install
npm run build
npm start
```

## Development

```bash
npm run dev
```

## Database Schema

Required tables:
- `notifications` - Notification records
- `notification_preferences` - User preferences
- `notification_templates` - Message templates
- `users` - User contact information (email, phone, push_token)

## Event Subscriptions

The service subscribes to these NATS subjects:
- `task.assigned`
- `task.approved`
- `task.rejected`
- `ubi.distributed`
- `reward.issued`
- `treasury.performance`
- `agent.execution.complete`
- `governance.proposal`
