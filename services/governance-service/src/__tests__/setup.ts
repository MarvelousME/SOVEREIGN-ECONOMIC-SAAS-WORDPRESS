jest.mock('../utils/database');
jest.mock('../utils/logger');
jest.mock('../services/events.service');

process.env.JWT_SECRET = 'test-secret';
process.env.NODE_ENV = 'test';
process.env.MIN_PROPOSAL_DEPOSIT = '100';
process.env.MIN_QUORUM_PERCENTAGE = '20';
process.env.VOTING_PERIOD_DAYS = '7';
process.env.EXECUTION_DELAY_HOURS = '48';
