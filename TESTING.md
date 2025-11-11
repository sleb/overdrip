# Testing Guide

This document outlines the testing strategy for the Overdrip hybrid authentication system.

## Test Philosophy

We follow a **targeted testing approach** - focusing on the most critical business logic rather than comprehensive coverage. Tests are designed to catch regressions in core functionality while remaining maintainable and fast (~33ms execution). We avoid testing built-in language features, crypto libraries, or trivial operations.

## Test Structure

```
packages/
├── core/src/__tests__/
│   └── schemas.test.ts          # Schema validation tests
├── functions/src/__tests__/
│   └── auth-code-manager.test.ts # Core auth logic tests
└── cli/src/__tests__/
    ├── oauth.test.ts            # OAuth PKCE & security tests
    └── config.test.ts           # Configuration validation tests
```

## What We Test

### ✅ **Core Business Logic**

- **Schema Validation**: Input validation for all API contracts
- **PKCE Implementation**: OAuth security standards compliance
- **Configuration Management**: Environment variable validation and error handling
- **ID Token Parsing**: JWT structure validation and error cases
- **Auth Code Format**: Business requirements for security tokens

### ✅ **Critical Security Validations**

- Auth code format validation (64-character hex strings)
- Device ID UUID validation
- Custom token claim structure
- PKCE standards compliance (RFC 7636)
- OAuth URL parameter encoding
- Base64URL format requirements

### ❌ **What We Don't Test**

- Built-in crypto functions (`crypto.randomBytes`, etc.)
- JavaScript language features (`===`, `>`, `<`, etc.)
- Math operations (date arithmetic, number comparisons)
- Firebase integration (tested via real deployment)
- UI components (tested manually)
- Network requests (tested via integration)

## Running Tests

```bash
# Run all tests
bun run test

# Run specific test suites
bun run test:core      # Schema validation tests
bun run test:functions # Auth logic tests
bun run test:cli       # CLI utilities tests
```

## Test Categories

### Schema Tests (`packages/core/src/__tests__/schemas.test.ts`)

Tests the Zod schema validation for all API contracts:

- ✅ Valid data passes validation
- ✅ Invalid formats are rejected
- ✅ Edge cases (empty strings, wrong lengths, invalid UUIDs)

**Coverage**: All critical schemas used in the auth flow.

### Auth Logic Tests (`packages/functions/src/__tests__/auth-code-manager.test.ts`)

Tests core authentication business logic:

- ✅ Auth code generation (crypto randomness, format)
- ✅ Expiration calculations (1 year from creation)
- ✅ Validation logic (expiry, device matching)
- ✅ Token claim structure

**Coverage**: Pure functions and critical algorithms.

### OAuth Tests (`packages/cli/src/__tests__/oauth.test.ts`)

Tests OAuth security and PKCE implementation:

- ✅ PKCE generation (format validation, SHA256 challenge creation)
- ✅ OAuth URL building (parameter encoding, validation)
- ✅ ID token parsing (JWT structure, base64 padding, error handling)
- ✅ PKCE standards compliance (RFC 7636 requirements)

**Coverage**: Security-critical OAuth flow components.

### Configuration Tests (`packages/cli/src/__tests__/config.test.ts`)

Tests environment variable handling and validation:

- ✅ Required field validation (helpful error messages)
- ✅ Optional field handling (undefined vs provided)
- ✅ Error reporting (development vs production guidance)
- ✅ Safe configuration loading (non-throwing variants)

**Coverage**: Configuration validation and error handling.

## Test Results

All tests should pass:

```bash
$ bun run test
 56 pass
 0 fail
 128 expect() calls
Ran 56 tests across 4 files. [~33ms]
```

## Testing Strategy Rationale

### Why Targeted Testing?

1. **High Value**: Focus on code that, if broken, would break the entire system
2. **Low Maintenance**: Avoid brittle tests that break on minor changes
3. **Fast Feedback**: Tests run in ~33ms, encouraging frequent execution
4. **Clear Intent**: Each test validates a specific business rule
5. **Security Focus**: Standards compliance and validation logic
6. **No Trivial Tests**: Don't test built-in functions or language features

### What About Integration Testing?

Integration testing happens through:

- **Manual CLI testing**: Real OAuth flows with actual Cloud Functions
- **Deployment verification**: Functions deployed and tested with real data
- **End-to-end validation**: Complete setup → start → authentication flows

### Firebase Testing

We don't mock Firebase extensively because:

- Firebase Admin SDK has its own test coverage
- Real deployment testing catches integration issues better
- Complex mocking often tests the mocks, not the code
- The business logic (our focus) is separate from Firebase calls

## Adding New Tests

When adding tests, ask:

1. **Is this core business logic?** (Algorithm, validation, calculation)
2. **Would this break the system if it failed?** (Auth, security, data integrity)
3. **Can it be tested without complex mocking?** (Pure functions preferred)

If yes to all three, add a focused test. If not, rely on integration testing.

## Debugging Test Failures

Common issues:

```bash
# Schema validation failing
Expected substring: "Invalid auth code"
Received message: "String must contain exactly 64 character(s)"
```

→ Check that test data matches schema expectations (64-char hex, valid UUIDs)

```bash
# Async issues
error: expect(received).toThrow(expected)
Received function did not throw
```

→ Ensure async functions use `await` in test assertions

## Continuous Integration

Tests run automatically on:

- Pre-commit hooks (if configured)
- Before deployment
- In CI/CD pipeline (if configured)

Fast execution (~33ms) makes this practical for frequent validation.
