# Testing Guide for zkpaste Client

This directory contains comprehensive tests for the zkpaste client application.

## Test Structure

```
tests/
├── e2e/                    # End-to-end tests (Playwright)
│   └── paste-flow.spec.ts
├── integration/            # Integration tests
│   ├── api.test.ts
│   └── encryption-flow.test.ts
├── unit/                   # Unit tests (Jest)
│   ├── utils.test.ts
│   ├── encryption.test.ts
│   ├── pow.test.ts
│   └── dom.test.ts
├── setup.ts               # Test setup and mocks
├── run-tests.sh           # Test runner script
└── README.md              # This file
```

## Test Types

### Unit Tests
- **Purpose**: Test individual functions in isolation
- **Framework**: Jest with TypeScript support
- **Coverage**: Utility functions, encryption/decryption, PoW, DOM interactions
- **Run**: `npm run test:unit`

### Integration Tests
- **Purpose**: Test complete workflows and API interactions
- **Framework**: Jest with Supertest for API testing
- **Coverage**: Full encryption/decryption flow, API endpoints, error handling
- **Run**: `npm run test:integration`

### End-to-End Tests
- **Purpose**: Test complete user workflows in real browser
- **Framework**: Playwright
- **Coverage**: Full paste creation and viewing flow, UI responsiveness
- **Run**: `npm run test:e2e`

## Running Tests

### Run All Tests
```bash
./tests/run-tests.sh
```

### Run Specific Test Types
```bash
# Unit tests only
npm run test:unit

# Integration tests only
npm run test:integration

# End-to-end tests only
npm run test:e2e

# All tests
npm run test:all
```

### Run Tests in Watch Mode
```bash
# Unit tests in watch mode
npm run test:watch

# End-to-end tests with UI
npm run test:e2e:ui
```

### Generate Coverage Report
```bash
npm run test:coverage
```

## Test Configuration

### Jest Configuration
- **Unit tests**: `jest.config.js`
- **Integration tests**: `jest.integration.config.js`

### Playwright Configuration
- **E2E tests**: `playwright.config.ts`

## Writing Tests

### Unit Tests
- Test individual functions with mocked dependencies
- Use descriptive test names and group related tests
- Mock external dependencies (crypto, DOM, fetch)

### Integration Tests
- Test complete workflows without mocking internal functions
- Mock only external services (APIs, crypto)
- Test error handling and edge cases

### End-to-End Tests
- Test complete user workflows
- Use realistic test data
- Test on multiple browsers and devices

## Mocking Strategy

### Crypto API
- Mock `crypto.subtle` methods for consistent testing
- Use predictable values for IVs and keys in tests
- Test both success and error scenarios

### DOM API
- Use jsdom environment for unit tests
- Mock specific DOM methods when needed
- Test event handlers and user interactions

### Fetch API
- Mock fetch calls for API testing
- Test different response scenarios (success, error, network issues)
- Verify request parameters and headers

## Best Practices

1. **Test Isolation**: Each test should be independent
2. **Descriptive Names**: Use clear, descriptive test names
3. **Arrange-Act-Assert**: Structure tests clearly
4. **Mock Appropriately**: Mock external dependencies, not internal logic
5. **Test Edge Cases**: Include boundary conditions and error scenarios
6. **Maintain Tests**: Keep tests up to date with code changes

## Debugging Tests

### Unit Tests
```bash
# Run specific test file
npm test -- utils.test.ts

# Run with verbose output
npm test -- --verbose

# Run tests matching pattern
npm test -- --testNamePattern="encryption"
```

### Integration Tests
```bash
# Run with debug output
npm run test:integration -- --verbose
```

### End-to-End Tests
```bash
# Run with headed browser
npx playwright test --headed

# Run specific test
npx playwright test paste-flow.spec.ts

# Debug mode
npx playwright test --debug
```

## Continuous Integration

The test suite is designed to run in CI environments:
- All tests run in headless mode
- No external dependencies required
- Deterministic test results
- Comprehensive error reporting

## Troubleshooting

### Common Issues

1. **Crypto API not available**: Ensure tests run in jsdom environment
2. **Async test failures**: Use proper async/await patterns
3. **Mock not working**: Check mock setup and cleanup
4. **Playwright not found**: Install with `npm install @playwright/test`

### Getting Help

- Check test output for specific error messages
- Use `--verbose` flag for detailed output
- Review test configuration files
- Check that all dependencies are installed