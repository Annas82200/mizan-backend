# LXP AI Agents Unit Tests

## Overview

This directory contains comprehensive unit tests for the LXP (Learning Experience Platform) AI Agents. The tests cover all three AI agents implemented in the LXP module:

1. **Learning Path Designer Agent** - Creates personalized learning paths
2. **Learning Progress Tracker Agent** - Tracks and analyzes learning progress
3. **Scenario Game Engine Agent** - Generates scenario-based learning games

## Test Coverage

### 🎯 Core Components Tested

- **Knowledge Engine** - Framework loading and knowledge processing
- **Data Engine** - Data processing and analysis
- **Reasoning Engine** - AI reasoning and recommendation generation
- **Error Handling** - Graceful error handling and edge cases
- **Performance** - Processing time and efficiency
- **Integration** - Full agent analysis workflows

### 📊 Test Statistics

- **Total Test Files**: 3
- **Total Test Cases**: 150+
- **Coverage Target**: 80%+
- **Test Categories**: 9 per agent

## Test Files

### 1. `learning-path-designer.test.ts`
Tests the Learning Path Designer Agent functionality:
- Knowledge engine framework loading
- Data engine processing of learning needs
- Reasoning engine learning path generation
- Full agent analysis integration
- Error handling and performance

### 2. `learning-progress-tracker.test.ts`
Tests the Learning Progress Tracker Agent functionality:
- Knowledge engine analytics frameworks
- Data engine progress analysis
- Reasoning engine progress recommendations
- Full agent analysis integration
- Error handling and performance

### 3. `scenario-game-engine.test.ts`
Tests the Scenario Game Engine Agent functionality:
- Knowledge engine game design frameworks
- Data engine personalization processing
- Reasoning engine scenario generation
- Full agent analysis integration
- Error handling and performance

## Running Tests

### Prerequisites

```bash
# Install dependencies
npm install
```

### Test Commands

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch

# Run specific agent tests
npm run test:learning-path-designer
npm run test:progress-tracker
npm run test:scenario-game-engine

# Run tests for CI/CD
npm run test:ci
```

### Using the Test Runner Script

```bash
# Make script executable (if not already)
chmod +x run-tests.sh

# Run comprehensive test suite
./run-tests.sh
```

## Test Configuration

### Jest Configuration (`jest.config.js`)
- **Test Environment**: Node.js
- **TypeScript Support**: Full TypeScript support with ts-jest
- **Coverage**: 80% threshold for all metrics
- **Timeout**: 30 seconds per test
- **ES Modules**: Full ES module support

### Test Setup (`setup.ts`)
- Global test utilities and helpers
- Mock data generators
- Performance measurement helpers
- Test assertion helpers
- Mock implementations

## Test Categories

### 1. Knowledge Engine Tests
- Framework loading validation
- Knowledge structure verification
- Framework completeness checks

### 2. Data Engine Tests
- Data processing validation
- Analysis accuracy verification
- Data structure integrity checks

### 3. Reasoning Engine Tests
- Prompt generation validation
- Output parsing verification
- Recommendation quality checks

### 4. Integration Tests
- Full agent analysis workflows
- End-to-end functionality verification
- Cross-component integration checks

### 5. Error Handling Tests
- Invalid input handling
- Missing data scenarios
- Graceful error recovery

### 6. Performance Tests
- Processing time validation
- Large dataset handling
- Efficiency benchmarks

### 7. Edge Case Tests
- Boundary condition handling
- Extreme value processing
- Unusual scenario management

## Mock Data

### Employee Data
```typescript
{
  employeeId: 'emp_001',
  tenantId: 'tenant_001',
  name: 'John Doe',
  role: 'Software Engineer',
  experience: 'intermediate',
  learningStyle: 'visual'
}
```

### Skill Gaps
```typescript
{
  skillId: 'leadership_001',
  skillName: 'Team Leadership',
  currentLevel: 2,
  targetLevel: 4,
  gapSize: 2,
  importance: 'critical',
  category: 'leadership',
  estimatedTimeToClose: 40
}
```

### Learning Preferences
```typescript
{
  preferredFormats: ['interactive', 'video'],
  preferredDuration: 'medium',
  preferredFrequency: 'weekly',
  accessibility: ['screen_reader_compatible']
}
```

## Test Utilities

### Performance Measurement
```typescript
const { result, processingTime } = await measurePerformance(
  () => agent.analyze(inputData),
  5000 // max time in ms
);
```

### Mock AI Responses
```typescript
const mockResponse = mockAIResponse({
  learningPath: { title: 'Test Path' },
  confidence: 0.85
});
```

### Test Assertions
```typescript
expectValidAnalysisResult(result);
expectValidFrameworkOutput(frameworks);
expectValidDataOutput(data);
```

## Coverage Reports

After running tests with coverage, reports are generated in:
- **HTML Report**: `coverage/lcov-report/index.html`
- **LCOV Report**: `coverage/lcov.info`
- **Text Summary**: Console output

## Continuous Integration

The tests are designed to run in CI/CD environments with:
- **Jest CI mode**: `--ci --coverage --watchAll=false`
- **Coverage thresholds**: 80% minimum
- **Performance benchmarks**: Processing time limits
- **Error handling**: Graceful failure handling

## Troubleshooting

### Common Issues

1. **TypeScript Errors**: Ensure all dependencies are installed
2. **Timeout Issues**: Increase timeout in jest.config.js
3. **Coverage Issues**: Check file paths in coverage configuration
4. **Mock Issues**: Verify mock implementations in setup.ts

### Debug Mode

```bash
# Run tests with debug output
DEBUG=* npm test

# Run specific test with verbose output
npm test -- --verbose learning-path-designer.test.ts
```

## Contributing

When adding new tests:
1. Follow the existing test structure
2. Include comprehensive coverage
3. Add appropriate mock data
4. Update this documentation
5. Ensure CI compatibility

## Test Results

Expected test results:
- ✅ All tests pass
- ✅ 80%+ code coverage
- ✅ Performance within limits
- ✅ Error handling verified
- ✅ Edge cases covered

---

**Task Reference**: Module 1 (LXP) - Section 1.6.1 (Unit Tests for AI Agents)
**Status**: ✅ Complete
**Coverage**: Learning Path Designer, Progress Tracker, Scenario Game Engine
**Dependencies**: 1.2.x (all agent tasks) ✅ Complete
