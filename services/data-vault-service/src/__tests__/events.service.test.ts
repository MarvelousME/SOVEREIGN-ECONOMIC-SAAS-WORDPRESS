jest.mock('nats', () => ({
  connect: jest.fn(),
  StringCodec: jest.fn().mockReturnValue({
    encode: jest.fn((data: string) => Buffer.from(data)),
    decode: jest.fn((data: Buffer) => JSON.parse(data.toString()))
  })
}));

jest.mock('../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }
}));

jest.mock('../config', () => ({
  config: {
    nats: {
      url: 'nats://localhost:4222',
      clusterId: 'test-cluster'
    },
    logging: {
      level: 'info'
    },
    server: {
      name: 'test-service',
      version: '1.0.0'
    }
  }
}));

describe('EventService Module', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('EventService class structure', () => {
    it('should have connect method', () => {
      const { EventService } = require('../services/events.service');
      const eventService = new EventService();
      expect(typeof eventService.connect).toBe('function');
    });

    it('should have publish method', () => {
      const { EventService } = require('../services/events.service');
      const eventService = new EventService();
      expect(typeof eventService.publish).toBe('function');
    });

    it('should have subscribe method', () => {
      const { EventService } = require('../services/events.service');
      const eventService = new EventService();
      expect(typeof eventService.subscribe).toBe('function');
    });

    it('should have close method', () => {
      const { EventService } = require('../services/events.service');
      const eventService = new EventService();
      expect(typeof eventService.close).toBe('function');
    });
  });

  describe('NATS mock integration', () => {
    it('should use mocked nats connect', () => {
      const nats = require('nats');
      expect(nats.connect).toBeDefined();
    });

    it('should create StringCodec mock', () => {
      const nats = require('nats');
      const sc = nats.StringCodec();
      expect(sc).toBeDefined();
      expect(typeof sc.encode).toBe('function');
      expect(typeof sc.decode).toBe('function');
    });

    it('should encode and decode data correctly', () => {
      const nats = require('nats');
      const sc = nats.StringCodec();
      const testData = { key: 'value' };
      const encoded = sc.encode(JSON.stringify(testData));
      const decoded = sc.decode(encoded);
      expect(decoded).toEqual(testData);
    });
  });
});
