# WordPress Plugins Documentation

This document covers the three UBI Platform WordPress plugins that integrate the platform's microservices with WordPress, plus operational notes for bundled third-party plugins.

## Table of Contents

0. [Yoast SEO (manual activation)](#yoast-seo-manual-activation)
1. [UBI Engine](#ubi-engine)
2. [UBI Treasury](#ubi-treasury)
3. [UBI Auth](#ubi-auth)
4. [Integration Architecture](#integration-architecture)
5. [Installation & Setup](#installation--setup)

---

## Yoast SEO (manual activation)

**Plugin path:** `wordpress/wp-content/plugins/wordpress-seo/` (Yoast SEO).

### Activation (manual — project standard)

After you log in to **wp-admin**:

1. Go to **Plugins → Installed Plugins**.
2. Find **Yoast SEO**.
3. Click **Activate**.

We do **not** auto-activate Yoast via code or WP-CLI in this repo so each environment stays explicit and you avoid surprise duplicate SEO output.

### Interaction with Sovereign IAM UX

The **Sovereign IAM UX** plugin adds fallback `<meta name="description">` and document title tweaks for pages that include `[sovereign_saas_landing]` **only when** a major SEO plugin is not handling meta (it detects Yoast, Rank Math, AIOSEO, SEOPress). Once Yoast is **active**, those fallbacks are skipped—configure titles and meta in **Yoast** for the landing page and site-wide templates.

### After activation (recommended)

- Run the Yoast **first-time configuration** wizard.
- Set a **focus keyphrase** and meta description on the main SaaS landing page (the one using `[sovereign_saas_landing]`).
- Enable **XML sitemaps** and submit the sitemap URL in Search Console when the site is public.

---

## UBI Engine

**Plugin File:** `wordpress/wp-content/plugins/ubi-engine/ubi-engine.php`  
**Version:** 1.0.3  
**Description:** Core UBI distribution engine with task-to-earn functionality

### Overview

UBI Engine manages the task marketplace and reward distribution system. It provides WordPress-based task management with blockchain-ready reward tracking.

### Features

- **Task Management**: Create, update, delete, and track tasks
- **Reward Tracking**: Record and manage reward distributions
- **Difficulty Levels**: low, medium, high, expert
- **Status Tracking**: active, completed, expired, cancelled
- **Dashboard Statistics**: Real-time metrics for tasks and rewards

### Database Tables

#### `wp_ubi_tasks`

| Column | Type | Description |
|--------|------|-------------|
| id | BIGINT UNSIGNED | Primary key |
| title | VARCHAR(255) | Task title |
| description | TEXT | Task description |
| category | VARCHAR(50) | Task category |
| difficulty | ENUM | low, medium, high, expert |
| reward | DECIMAL(20,8) | Reward amount |
| reward_currency | VARCHAR(10) | Currency (default: UBI) |
| max_participants | INT | Maximum participants |
| current_participants | INT | Current participant count |
| status | ENUM | active, completed, expired, cancelled |
| deadline | DATETIME | Task deadline |
| proof_requirements | TEXT | Proof submission requirements |
| created_by | BIGINT UNSIGNED | WordPress user ID |
| created_at | TIMESTAMP | Creation timestamp |
| updated_at | TIMESTAMP | Last update timestamp |

#### `wp_ubi_rewards`

| Column | Type | Description |
|--------|------|-------------|
| id | BIGINT UNSIGNED | Primary key |
| user_id | BIGINT UNSIGNED | WordPress user ID |
| task_id | BIGINT UNSIGNED | Related task ID |
| amount | DECIMAL(20,8) | Reward amount |
| currency | VARCHAR(10) | Currency (default: UBI) |
| type | ENUM | task_completion, referral, ubi_distribution, bonus |
| transaction_hash | VARCHAR(66) | Blockchain transaction hash |
| status | ENUM | pending, completed, failed |
| created_at | TIMESTAMP | Creation timestamp |
| processed_at | TIMESTAMP | Processing timestamp |

### WordPress Hooks & Filters

| Hook | Handler | Purpose |
|------|---------|---------|
| `admin_menu` | `add_admin_menu` | Register admin menu pages |
| `wp_ajax_ubi_engine_get_tasks` | `get_tasks` | AJAX: Fetch active tasks |
| `wp_ajax_ubi_engine_create_task` | `create_task` | AJAX: Create new task |
| `wp_ajax_ubi_engine_update_task` | `update_task` | AJAX: Update task status |
| `wp_ajax_ubi_engine_delete_task` | `delete_task` | AJAX: Delete task |
| `wp_ajax_ubi_engine_get_rewards` | `get_rewards` | AJAX: Fetch rewards history |

### AJAX Endpoints

All endpoints require authentication and nonce verification.

**GET Tasks:**
```javascript
$.ajax({
    url: ajaxurl,
    type: 'POST',
    data: {
        action: 'ubi_engine_get_tasks',
        nonce: 'ubi_engine_nonce'
    },
    success: function(response) {
        console.log(response.data.tasks);
    }
});
```

**Create Task:**
```javascript
$.ajax({
    url: ajaxurl,
    type: 'POST',
    data: {
        action: 'ubi_engine_create_task',
        nonce: 'ubi_engine_nonce',
        title: 'Complete survey',
        description: 'Fill out the feedback form',
        difficulty: 'low',
        reward: 10.00
    }
});
```

### Admin Menu Structure

- **UBI Engine** (main menu)
  - Dashboard
  - Tasks
  - Rewards
  - Settings

### Microservice Integration

Integrates with the Task microservice for:
- Task verification workflows
- Reward calculation
- Participant tracking

See [Task Service Documentation](./microservices.md#task-service) for API details.

---

## UBI Treasury

**Plugin File:** `wordpress/wp-content/plugins/ubi-treasury/ubi-treasury.php`  
**Version:** 1.0.4  
**Description:** Treasury management and yield optimization

### Overview

UBI Treasury handles deposit/withdrawal operations, balance tracking, and yield strategy management. Implements rate limiting and atomic transactions for security.

### Features

- **Deposit Management**: Record and track deposits
- **Withdrawal Processing**: Handle withdrawal requests with balance validation
- **Yield Tracking**: Monitor yield earnings from strategies
- **Rate Limiting**: 10 requests per 60 seconds per user
- **Atomic Transactions**: Prevents race conditions via MySQL transactions

### Database Table

#### `wp_ubi_treasury`

| Column | Type | Description |
|--------|------|-------------|
| id | BIGINT UNSIGNED | Primary key |
| user_id | BIGINT UNSIGNED | WordPress user ID |
| amount | DECIMAL(20,8) | Transaction amount |
| type | ENUM | deposit, withdraw, yield, reward |
| status | ENUM | pending, completed, failed |
| transaction_hash | VARCHAR(66) | Blockchain transaction hash |
| metadata | TEXT | Additional JSON metadata |
| created_at | TIMESTAMP | Creation timestamp |

### WordPress Hooks & Filters

| Hook | Handler | Purpose |
|------|---------|---------|
| `admin_menu` | `add_admin_menu` | Register admin menu pages |
| `wp_ajax_ubi_treasury_get_balance` | `get_balance` | AJAX: Get user balance |
| `wp_ajax_ubi_treasury_deposit` | `handle_deposit` | AJAX: Process deposit |
| `wp_ajax_ubi_treasury_withdraw` | `handle_withdraw` | AJAX: Process withdrawal |
| `wp_ajax_ubi_treasury_get_transactions` | `get_transactions` | AJAX: Fetch transactions |

### Security Features

**Rate Limiting:**
- 10 requests per 60-second window per user
- Uses WordPress transients for storage

**Amount Validation:**
- Deposit max: 1,000,000
- Withdrawal max: 100,000

**Atomic Transactions:**
```php
$wpdb->query('START TRANSACTION');
// Lock row with FOR UPDATE
// Validate balance
// Insert withdrawal record
$wpdb->query('COMMIT'); // or ROLLBACK on failure
```

### AJAX Endpoints

**Get Balance:**
```javascript
$.ajax({
    url: ajaxurl,
    type: 'POST',
    data: {
        action: 'ubi_treasury_get_balance',
        nonce: 'ubi_treasury_nonce'
    }
});
```

**Deposit:**
```javascript
$.ajax({
    url: ajaxurl,
    type: 'POST',
    data: {
        action: 'ubi_treasury_deposit',
        nonce: 'ubi_treasury_nonce',
        amount: 1000.00
    }
});
```

**Withdraw:**
```javascript
$.ajax({
    url: ajaxurl,
    type: 'POST',
    data: {
        action: 'ubi_treasury_withdraw',
        nonce: 'ubi_treasury_nonce',
        amount: 500.00
    }
});
```

### Admin Menu Structure

- **UBI Treasury** (main menu)
  - Dashboard
  - Transactions
  - Yield Strategies
  - Settings

### Yield Strategies

| Strategy | APY | Risk Level |
|----------|-----|------------|
| UBI Staking | 5.25% | Low |
| Liquidity Pool | 12.50% | Medium |
| Treasury Bond | 8.00% | Low |

### Microservice Integration

Integrates with Treasury microservice for:
- Balance synchronization
- Yield calculation
- Strategy updates

See [Treasury Service Documentation](./microservices.md#treasury-service) for API details.

---

## UBI Auth

**Plugin File:** `wordpress/wp-content/plugins/ubi-auth/ubi-auth.php`  
**Version:** 1.0.3  
**Description:** Secure authentication with JWT and role-based access

### Overview

UBI Auth provides JWT-based authentication for WordPress, enabling secure API access and SSO integration with the UBI Platform ecosystem.

### Features

- **JWT Authentication**: HS256-signed tokens
- **Role-Based Access**: Maps WordPress roles to platform roles
- **Secure Login**: Integrates with WordPress user authentication
- **Token Verification**: Validates JWT signature and expiration

### WordPress Hooks & Filters

| Hook | Handler | Purpose |
|------|---------|---------|
| `admin_menu` | `add_admin_menu` | Register admin menu pages |
| `wp_ajax_ubi_auth_login` | `handle_login` | AJAX: User login |
| `wp_ajax_nopriv_ubi_auth_login` | `handle_login` | AJAX: Public login endpoint |
| `wp_ajax_ubi_auth_logout` | `handle_logout` | AJAX: User logout |

### JWT Token Structure

**Header:**
```json
{
    "typ": "JWT",
    "alg": "HS256"
}
```

**Payload:**
```json
{
    "iss": "https://example.com",
    "sub": 123,
    "iat": 1704067200,
    "exp": 1704070800,
    "user_id": 123
}
```

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `UBI_JWT_SECRET` | Yes (production) | Secret key for JWT signing |
| `WP_ENV` | No | Set to 'production' for strict mode |

### AJAX Endpoints

**Login:**
```javascript
$.ajax({
    url: ajaxurl,
    type: 'POST',
    data: {
        action: 'ubi_auth_login',
        nonce: 'ubi_auth_nonce',
        username: 'user@example.com',
        password: 'password',
        remember: true
    },
    success: function(response) {
        const token = response.data.token;
        const user = response.data.user;
        // Store token for API requests
    }
});
```

**Logout:**
```javascript
$.ajax({
    url: ajaxurl,
    type: 'POST',
    data: {
        action: 'ubi_auth_logout',
        nonce: 'ubi_auth_nonce'
    }
});
```

### Token Verification

```php
$auth = UBI_Auth_Plugin::get_instance();
$user = $auth->verify_jwt($token);

if (is_wp_error($user)) {
    // Handle error
    echo $user->get_error_message();
} else {
    // User authenticated
    echo $user->user_login;
}
```

### Admin Settings

- **JWT Expiry**: Configurable token expiration (default: 3600 seconds)
- **Token Algorithm**: HS256 (HMAC-SHA256)
- **API Keys**: Management interface (coming soon)

### Microservice Integration

Integrates with Auth/Keycloak microservice for:
- SSO token exchange
- Role synchronization
- Session management

See [Auth Service Documentation](./microservices.md#auth-service) for API details.

---

## Integration Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     WordPress Plugins                            │
├─────────────────┬─────────────────┬─────────────────────────────┤
│   UBI Engine    │  UBI Treasury   │        UBI Auth              │
│                 │                 │                             │
│  - Task CRUD    │  - Deposits     │  - JWT Generation            │
│  - Rewards      │  - Withdrawals  │  - Token Verification        │
│  - Dashboard    │  - Yield Track  │  - Login/Logout              │
└────────┬────────┴────────┬────────┴──────────────┬──────────────┘
         │                │                       │
         ▼                ▼                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Microservices Layer                          │
├─────────────────┬─────────────────┬─────────────────────────────┤
│  Task Service   │ Treasury Service│     Auth/Keycloak            │
│                 │                 │                             │
│  - Verification │  - Balances     │  - SSO                       │
│  - Calculations  │  - Strategies  │  - Role Mapping              │
└─────────────────┴─────────────────┴─────────────────────────────┘
         │                │                       │
         ▼                ▼                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Frontend Applications                         │
├─────────────────────────────────────────────────────────────────┤
│  Portal UI (Port 3000)  │  Admin UI (Port 3001)                 │
│  - User Dashboard       │  - Admin Dashboard                   │
│  - Task Marketplace      │  - User Management                   │
│  - Treasury View         │  - Configuration                    │
└─────────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **Authentication**: WordPress → UBI Auth → Keycloak
2. **Tasks**: Frontend → WordPress AJAX → Task Service
3. **Treasury**: Frontend → WordPress AJAX → Treasury Service
4. **Rewards**: Task completion → UBI Engine → Microservice sync

---

## Installation & Setup

### Prerequisites

- WordPress 5.0+
- PHP 7.4+
- MySQL 5.7+
- SSL certificate (for production)

### Installation Steps

1. **Upload Plugins**
   ```bash
   cp -r wordpress/wp-content/plugins/ubi-* /wp-content/plugins/
   ```

2. **Activate Plugins**
   ```bash
   wp plugin activate ubi-engine ubi-treasury ubi-auth
   ```

3. **Configure Environment Variables**

   Add to `wp-config.php`:
   ```php
   // UBI Auth Configuration
   define('UBI_JWT_SECRET', 'your-64-character-secret-key');
   define('WP_ENV', 'production');
   ```

4. **Configure Microservice URLs**

   Add to `wp-config.php`:
   ```php
   define('UBI_API_URL', 'https://api.ubi-platform.com');
   define('UBI_TASK_SERVICE_URL', 'https://tasks.ubi-platform.com');
   define('UBI_TREASURY_SERVICE_URL', 'https://treasury.ubi-platform.com');
   ```

5. **Verify Installation**

   Access WordPress admin and confirm:
   - UBI Engine menu appears under admin menu
   - UBI Treasury menu appears under admin menu
   - UBI Auth menu appears under admin menu

### Database Tables

Tables are created automatically on plugin activation:
- `wp_ubi_tasks`
- `wp_ubi_rewards`
- `wp_ubi_treasury`

### Admin Capabilities Required

All plugin AJAX endpoints require `manage_options` capability (Administrator role).

### Troubleshooting

**Plugin not activating:**
- Check PHP version >= 7.4
- Verify file permissions on plugin directory
- Check WordPress debug log

**AJAX returns 403:**
- Verify nonce values in AJAX requests
- Confirm user is logged in with admin role
- Check browser console for specific error messages

**JWT verification fails:**
- Confirm `UBI_JWT_SECRET` is defined
- Ensure consistent secret across WordPress and microservices
- Check token expiration settings

---

## Related Documentation

- [Frontend Documentation](./frontend/README.md)
- [Microservices Documentation](./microservices.md)
- [API Documentation](./api.md)
