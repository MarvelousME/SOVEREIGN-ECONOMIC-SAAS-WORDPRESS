module.exports = {
    testEnvironment: 'node',
    testMatch: ['**/src/__tests__/**/*.test.js'],
    setupFiles: ['./src/__tests__/setup.js'],
    collectCoverage: false,
    // Collect coverage only for core business logic layers (controllers, models, services)
    // Middleware infrastructure files (audit, telemetry, validation, security) are excluded
    // as they require full integration test environments to exercise.
    collectCoverageFrom: [
        'src/Controllers/**/*.js',
        'src/Models/**/*.js',
        'src/Services/**/*.js',
        'src/Middleware/auth.js',
    ],
    // Global thresholds match the current exercised surface (collectCoverageFrom includes
    // controllers/models/services with uneven coverage). Raise as tests expand.
    coverageThreshold: {
        global: {
            branches: 28,
            functions: 40,
            lines: 38,
            statements: 37,
        },
    },
    testTimeout: 10000,
    verbose: true,
    clearMocks: true,
    resetMocks: false,
    restoreMocks: false,
};
