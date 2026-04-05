jest.mock('../utils/database');
jest.mock('../utils/redis');
jest.mock('../utils/logger');
jest.mock('../config', () => ({
  config: {
    server: {
      port: 3007,
      env: 'test',
      name: 'notifications-service-test',
      version: '1.0.0'
    },
    database: {
      host: 'localhost',
      port: 5432,
      database: 'test_db',
      user: 'test_user',
      password: 'test_password',
      min: 1,
      max: 5
    },
    redis: {
      host: 'localhost',
      port: 6379,
      password: undefined,
      db: 0
    },
    nats: {
      url: 'nats://localhost:4222',
      clusterId: 'test-cluster'
    },
    sendgrid: {
      apiKey: 'SG.test-key',
      fromEmail: 'test@example.com',
      fromName: 'Test'
    },
    twilio: {
      accountSid: 'AC1234567890abcdef1234567890abcdef',
      authToken: 'test-auth-token',
      phoneNumber: '+1234567890'
    },
    firebase: {
      projectId: 'test-project',
      privateKey: 'test-private-key',
      clientEmail: 'test@project.iam.gserviceaccount.com'
    },
    features: {
      enableEmail: true,
      enableSms: true,
      enablePush: true,
      enableInApp: true
    },
    logging: {
      level: 'error'
    }
  }
}));

jest.mock('@sendgrid/mail', () => ({
  setApiKey: jest.fn(),
  send: jest.fn()
}));

jest.mock('twilio', () => {
  return {
    __esModule: true,
    default: jest.fn(() => ({
      messages: {
        create: jest.fn().mockResolvedValue({ sid: 'SM1234567890', status: 'queued' })
      }
    }))
  };
});

jest.mock('firebase-admin', () => ({
  initializeApp: jest.fn(),
  messaging: jest.fn(() => ({
    send: jest.fn().mockResolvedValue('projects/test/messages/msg-123'),
    sendMulticast: jest.fn().mockResolvedValue({
      successCount: 1,
      failureCount: 0,
      responses: [{ success: true, messageId: 'msg-1' }]
    })
  })),
  credential: {
    cert: jest.fn()
  }
}));

beforeEach(() => {
  jest.clearAllMocks();
});
