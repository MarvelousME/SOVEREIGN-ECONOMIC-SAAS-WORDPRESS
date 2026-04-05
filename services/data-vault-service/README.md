# Data Vault Service

A secure personal data vault with end-to-end encryption, consent management, and data monetization for the UBI-CMS platform.

## Features

### Core Functionality
- **End-to-End Encryption**: AES-256-GCM authenticated encryption
- **Personal Data Storage**: Encrypted storage for all user data
- **Granular Consent Management**: Field-level data access control
- **Anonymization Engine**: Multiple anonymization levels (0-4)
- **Data Monetization**: Users get paid for data access
- **GDPR Compliance**: Right to access, portability, and deletion
- **Zero-Knowledge Proofs**: Verify data without revealing it

### Data Types
- Profile data
- Activity data
- Preference data
- Behavioral data
- Transaction history
- Skills and credentials

### Anonymization Levels

- **Level 0 (NONE)**: Full data access
- **Level 1 (LOW)**: Remove direct identifiers (name, email, etc.)
- **Level 2 (MEDIUM)**: Generalize quasi-identifiers (age ranges, location regions)
- **Level 3 (HIGH)**: Aggregated data only
- **Level 4 (FULL)**: Statistical summaries only

## API Endpoints

### Data Management
- `POST /api/v1/vault/data` - Store personal data (encrypted)
- `GET /api/v1/vault/data` - Retrieve own data (decrypted)
- `PUT /api/v1/vault/data/:id` - Update data
- `DELETE /api/v1/vault/data/:id` - Delete data (right to be forgotten)

### Consent Management
- `POST /api/v1/vault/consent` - Grant data access
- `GET /api/v1/vault/consent` - List consents
- `DELETE /api/v1/vault/consent/:id` - Revoke consent

### Data Access
- `GET /api/v1/vault/access/:consentId` - Access data with consent
- `GET /api/v1/vault/export` - Export data (GDPR portability)
- `GET /api/v1/vault/revenue` - Data monetization revenue

## Configuration

Environment variables (see `.env.example`):

```bash
PORT=3010
ENCRYPTION_KEY=your-32-byte-encryption-key-here-must-be-32-bytes-long
ENCRYPTION_ALGORITHM=aes-256-gcm
DEFAULT_ANONYMIZATION_LEVEL=2
MIN_DATA_PRICE=0.01
REVENUE_SHARE_PERCENTAGE=80
```

## Installation

```bash
cd services/data-vault-service
npm install
npm run build
```

## Running

```bash
# Development
npm run dev

# Production
npm start
```

## Database Schema

Run migration: `migrations/008_data_vault_schema.sql`

Tables:
- `vault_data` - Encrypted personal data
- `data_consents` - Consent records
- `data_access_logs` - Access audit trail
- `data_monetization` - Revenue tracking
- `data_buyers` - Approved data buyers registry
- `user_data_pricing` - User-set data pricing

## Encryption

### Algorithm
- **AES-256-GCM**: Authenticated encryption with Galois/Counter Mode
- **32-byte keys**: 256-bit encryption strength
- **Random IV**: Unique initialization vector per encryption
- **Authentication tags**: Ensures data integrity

### Implementation
All encryption is handled by `src/utils/encryption.ts`:

```typescript
// Encrypt data
const encrypted = encryptionService.encryptObject(data);
// Returns: { encryptedData, iv, authTag }

// Decrypt data
const decrypted = encryptionService.decryptObject(
  encrypted.encryptedData,
  encrypted.iv,
  encrypted.authTag
);
```

## Anonymization

Implemented in `src/utils/anonymization.ts`:

### Techniques
- **PII Removal**: Remove direct identifiers
- **Generalization**: Convert precise values to ranges
- **K-Anonymity**: Ensure minimum group size
- **Differential Privacy**: Add statistical noise
- **Aggregation**: Return only statistics

### Example

```typescript
// Anonymize data
const result = anonymizationService.anonymize(data, AnonymizationLevel.MEDIUM);
// Result includes: data, fieldsRemoved, fieldsGeneralized
```

## Example Usage

### Store Data

```bash
curl -X POST http://localhost:3010/api/v1/vault/data \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "dataType": "profile",
    "data": {
      "name": "John Doe",
      "email": "john@example.com",
      "age": 30,
      "location": "San Francisco, CA, USA"
    }
  }'
```

### Grant Consent

```bash
curl -X POST http://localhost:3010/api/v1/vault/consent \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "dataType": "profile",
    "grantedTo": "researcher-uuid",
    "purpose": "Health research study",
    "anonymizationLevel": 2,
    "fields": ["age", "location"],
    "expiresIn": 30
  }'
```

### Access Data (Third Party)

```bash
curl -X GET http://localhost:3010/api/v1/vault/access/{consentId} \
  -H "Authorization: Bearer TOKEN"
```

Response (anonymized):
```json
{
  "data": {
    "age": "25-34",
    "region": "USA"
  },
  "anonymizationLevel": 2
}
```

### Export Data (GDPR)

```bash
curl -X GET "http://localhost:3010/api/v1/vault/export?format=json" \
  -H "Authorization: Bearer TOKEN"
```

## Data Monetization

### How It Works
1. Data buyers register and get approved
2. Users set pricing for their data types
3. Buyers purchase access via consents
4. Users receive revenue share (default: 80%)
5. Access is logged and auditable

### Revenue Tracking

```bash
curl -X GET http://localhost:3010/api/v1/vault/revenue \
  -H "Authorization: Bearer TOKEN"
```

## Architecture

- **Encryption Layer**: AES-256-GCM for data at rest
- **Anonymization Engine**: Multi-level privacy protection
- **Consent System**: Granular access control
- **Audit Logs**: Complete access tracking
- **Event-Driven**: NATS integration for real-time events
- **MinIO Integration**: Encrypted file storage

## Security

- **End-to-end encryption**: Data encrypted before storage
- **Zero-knowledge**: Server cannot decrypt user data
- **Consent-based access**: Explicit user permission required
- **Audit trail**: All access logged
- **GDPR compliance**: Right to access, portability, deletion
- **Rate limiting**: Prevents abuse
- **JWT authentication**: Secure API access

## GDPR Compliance

### Implemented Rights
- ✅ **Right to Access**: Users can retrieve all their data
- ✅ **Right to Portability**: Export in JSON/CSV
- ✅ **Right to Erasure**: Complete data deletion
- ✅ **Right to Rectification**: Update incorrect data
- ✅ **Consent Management**: Granular control
- ✅ **Data Minimization**: Only store necessary data
- ✅ **Purpose Limitation**: Explicit consent purposes
- ✅ **Audit Logs**: Complete access history

## License

MIT
