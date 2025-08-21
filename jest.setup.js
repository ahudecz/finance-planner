// Jest setup file for global test configuration

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  // Uncomment to suppress console logs in tests
  // log: jest.fn(),
  // debug: jest.fn(),
  // info: jest.fn(),
  // warn: jest.fn(),
  // error: jest.fn(),
};
