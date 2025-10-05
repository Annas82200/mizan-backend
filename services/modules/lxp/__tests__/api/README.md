# LXP API Endpoint Tests

Comprehensive tests for all LXP (Learning Experience Platform) API endpoints, ensuring proper request/response handling, data validation, error scenarios, and performance.

## 🎯 Overview

This test suite provides comprehensive coverage for all LXP API endpoints:

- **Learning Path API** - CRUD operations for learning paths
- **Course API** - Course management and enrollment
- **Progress Tracking API** - Learning progress monitoring
- **Assessment API** - Assessment creation and submission
- **Analytics API** - Learning analytics and reporting
- **Integration API** - External system integrations
- **Error Handling** - Comprehensive error scenario testing
- **Performance Testing** - Response time and load testing

## 📁 Test Structure

```
__tests__/api/
├── api-endpoints.test.ts    # Main API endpoint test suite
├── jest.config.js           # Jest configuration
├── setup.ts                 # Test setup and mocks
├── global-setup.ts          # Global test initialization
├── global-teardown.ts       # Global test cleanup
├── package.json             # Test dependencies
├── run-tests.sh             # Test runner script
└── README.md                # This documentation
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn
- TypeScript 5.0+
- Express.js

### Installation

```bash
# Navigate to test directory
cd backend/services/modules/lxp/__tests__/api

# Install dependencies
npm install

# Run all API tests
npm test
```

### Running Tests

```bash
# Run all API endpoint tests
./run-tests.sh

# Run specific API test types
./run-tests.sh learning-path
./run-tests.sh course
./run-tests.sh progress
./run-tests.sh assessment
./run-tests.sh analytics
./run-tests.sh integration
./run-tests.sh performance

# Run with coverage
npm run test:coverage

# Run in watch mode
npm run test:watch
```

## 🧪 Test Categories

### 1. Learning Path API Tests

Tests all learning path CRUD operations:

- **GET /api/lxp/learning-paths** - List learning paths with filtering
- **GET /api/lxp/learning-paths/:id** - Get specific learning path
- **POST /api/lxp/learning-paths** - Create new learning path
- **PUT /api/lxp/learning-paths/:id** - Update existing learning path
- **DELETE /api/lxp/learning-paths/:id** - Delete learning path
- **GET /api/lxp/employees/:employeeId/learning-paths** - Employee-specific paths

**Test Scenarios:**
- Valid data creation and retrieval
- Invalid data validation
- Pagination and filtering
- Employee-specific path retrieval
- Error handling for non-existent resources

### 2. Course API Tests

Tests course management and enrollment:

- **GET /api/lxp/courses** - List courses with filtering
- **GET /api/lxp/courses/:id** - Get specific course
- **POST /api/lxp/courses** - Create new course
- **POST /api/lxp/courses/:id/enroll** - Enroll in course
- **GET /api/lxp/courses/:id/content** - Get course content

**Test Scenarios:**
- Course CRUD operations
- Enrollment validation
- Content retrieval
- Category and difficulty filtering
- Enrollment data validation

### 3. Progress Tracking API Tests

Tests learning progress monitoring:

- **GET /api/lxp/enrollments/:id/progress** - Get enrollment progress
- **POST /api/lxp/enrollments/:id/progress** - Update progress
- **GET /api/lxp/employees/:employeeId/progress** - Employee progress summary
- **POST /api/lxp/enrollments/:id/complete** - Mark completion

**Test Scenarios:**
- Progress tracking and updates
- Completion validation
- Employee progress aggregation
- Progress data validation
- Completion certificate handling

### 4. Assessment API Tests

Tests assessment functionality:

- **GET /api/lxp/assessments/:id** - Get assessment details
- **POST /api/lxp/assessments/:id/start** - Start assessment
- **POST /api/lxp/assessments/:id/submit** - Submit assessment
- **GET /api/lxp/assessments/:id/results** - Get assessment results

**Test Scenarios:**
- Assessment creation and retrieval
- Assessment session management
- Response submission and validation
- Scoring and feedback generation
- Results retrieval and analysis

### 5. Analytics API Tests

Tests learning analytics and reporting:

- **GET /api/lxp/analytics/overview** - Analytics overview
- **GET /api/lxp/analytics/employees/:employeeId** - Employee analytics
- **GET /api/lxp/analytics/courses/:courseId** - Course analytics
- **GET /api/lxp/analytics/effectiveness** - Learning effectiveness

**Test Scenarios:**
- Analytics data generation
- Employee-specific metrics
- Course performance analytics
- Learning effectiveness analysis
- Date range filtering

### 6. Integration API Tests

Tests external system integrations:

- **Skills Integration API** - Skills analysis integration
- **Performance Integration API** - Performance management integration
- **Culture Integration API** - Culture analysis integration

**Test Scenarios:**
- External system communication
- Data synchronization
- Integration error handling
- Cross-system data validation

### 7. Error Handling Tests

Tests comprehensive error scenarios:

- **Invalid JSON** - Malformed request bodies
- **Missing Content-Type** - Incorrect headers
- **Server Errors** - Internal server error handling
- **Validation Errors** - Data validation failures
- **Authentication Errors** - Access control testing

### 8. Performance Tests

Tests API performance and scalability:

- **Response Time** - Individual endpoint performance
- **Concurrent Requests** - Load testing
- **Large Data Sets** - Bulk data handling
- **Memory Usage** - Resource utilization

## 🔧 Test Configuration

### Jest Configuration

The tests use Jest with TypeScript and Supertest support:

```javascript
// jest.config.js
module.exports = {
  testEnvironment: 'node',
  preset: 'ts-jest',
  testTimeout: 30000, // 30 seconds for API tests
  collectCoverage: true,
  coverageThreshold: {
    global: {
      branches: 75,
      functions: 75,
      lines: 75,
      statements: 75
    }
  }
};
```

### Express App Setup

Tests use a dedicated Express app for API testing:

```typescript
// setup.ts
import express from 'express';
import request from 'supertest';

global.testApp = express();
global.testApp.use(express.json());

// Mount API routers
global.testApp.use('/api/lxp', lxpApiRouter);
```

### Mock Services

Comprehensive mocks for all external dependencies:

- **LXP Module** - Core module functionality
- **Database Operations** - All database interactions
- **External Services** - Notifications, certificates, analytics
- **Authentication** - User validation and authorization

## 📊 Coverage Requirements

The test suite maintains high coverage standards:

- **Branches**: 75% minimum
- **Functions**: 75% minimum  
- **Lines**: 75% minimum
- **Statements**: 75% minimum

## 🎯 Test Scenarios

### Happy Path Scenarios

- Valid API requests with proper responses
- Successful CRUD operations
- Proper data validation and processing
- Correct error responses
- Performance within acceptable limits

### Edge Cases

- Empty request bodies
- Missing required fields
- Invalid data types
- Boundary value testing
- Large payload handling

### Error Scenarios

- Invalid JSON parsing
- Missing authentication
- Database connection failures
- External service timeouts
- Resource not found errors

## 📈 Performance Benchmarks

The tests validate performance against these thresholds:

- **API Response Time**: < 1000ms
- **Database Operations**: < 500ms
- **External Service Calls**: < 2000ms
- **Error Rate**: < 5%
- **Concurrent Requests**: 20+ simultaneous

## 🛠️ Development

### Adding New Tests

1. **Create test file** following naming convention
2. **Use existing utilities** and mocks
3. **Follow test structure** patterns
4. **Add to appropriate test suite**
5. **Update documentation**

### Test Utilities

Available utilities for test development:

- `apiTestUtils.makeRequest()` - Make HTTP requests
- `apiTestUtils.expectSuccess()` - Validate success responses
- `apiTestUtils.expectError()` - Validate error responses
- `assertAPIResponse()` - Validate API response structure
- `performanceTracker` - Measure response times

### Mock Data

Use the provided mock data generators:

```typescript
// Generate test data
const learningPath = testDataGenerators.generateLearningPath({
  category: 'leadership',
  difficulty: 'intermediate'
});

const course = testDataGenerators.generateCourse({
  title: 'Advanced JavaScript',
  duration: 180
});
```

## 🚨 Troubleshooting

### Common Issues

1. **Port Conflicts**
   - Ensure test port (3001) is available
   - Check for running test processes
   - Use different port if needed

2. **Mock Failures**
   - Verify mocks are properly configured
   - Check mock data matches expected structure
   - Ensure mocks are reset between tests

3. **Timeout Errors**
   - Increase test timeout in Jest config
   - Check for infinite loops in test code
   - Verify mock responses are complete

4. **Database Issues**
   - Clear test database between tests
   - Ensure proper cleanup in teardown
   - Check for connection leaks

### Debug Mode

Run tests in debug mode for detailed output:

```bash
npm run test:debug
```

## 📝 Best Practices

1. **Test Isolation** - Each test should be independent
2. **Realistic Data** - Use realistic test data and scenarios
3. **Comprehensive Coverage** - Test all endpoints and scenarios
4. **Performance Awareness** - Monitor and validate performance
5. **Clear Assertions** - Use descriptive assertions and error messages
6. **Proper Cleanup** - Clean up resources after each test
7. **Documentation** - Document complex test scenarios

## 🔄 Continuous Integration

The test suite is designed for CI/CD integration:

- **Automated Execution** - Runs on every commit
- **Coverage Reporting** - Generates coverage reports
- **Performance Monitoring** - Tracks performance metrics
- **Failure Notifications** - Alerts on test failures
- **Artifact Generation** - Creates test reports and coverage data

## 📞 Support

For issues or questions regarding the API endpoint tests:

1. Check this documentation
2. Review test logs and error messages
3. Verify test configuration and setup
4. Check mock implementations
5. Contact the development team

---

**Last Updated**: December 2024  
**Version**: 1.0.0  
**Maintainer**: Mizan Development Team
