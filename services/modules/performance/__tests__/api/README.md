# 🧪 Performance Management API - Endpoint Tests

## 📋 **Overview**

Comprehensive API endpoint tests for all 32 Performance Management API endpoints using `supertest` for HTTP assertion testing.

---

## 🎯 **Test Coverage**

### **1. Goals Endpoints Tests** (7 endpoints, 8+ test scenarios)
- ✅ GET /api/performance/goals - List goals
- ✅ GET /api/performance/goals/:id - Get goal details
- ✅ POST /api/performance/goals - Create goal (AI-powered and manual)
- ✅ PUT /api/performance/goals/:id - Update goal
- ✅ DELETE /api/performance/goals/:id - Delete goal
- ✅ POST /api/performance/goals/:id/progress - Update progress
- ✅ GET /api/performance/employees/:employeeId/goals - Employee goals

**Test Scenarios**:
- List all goals with filters
- Filter by status and period
- Get goal by ID (success and 404)
- Create AI-generated goals
- Create manual goals
- Update existing goals
- Delete goals
- Update goal progress
- Get employee-specific goals

### **2. Reviews Endpoints Tests** (6 endpoints, 6+ test scenarios)
- ✅ GET /api/performance/reviews - List reviews
- ✅ GET /api/performance/reviews/:id - Get review details
- ✅ POST /api/performance/reviews - Create review (triggers workflow)
- ✅ PUT /api/performance/reviews/:id - Update review
- ✅ POST /api/performance/reviews/:id/complete - Complete review
- ✅ GET /api/performance/employees/:employeeId/reviews - Employee reviews

**Test Scenarios**:
- List all reviews with filters
- Filter by review type
- Get review details
- Create review with workflow integration
- Create review with coaching
- Update review
- Complete and finalize review
- Get employee reviews

### **3. Feedback Endpoints Tests** (4 endpoints, 4+ test scenarios)
- ✅ GET /api/performance/feedback - List feedback
- ✅ POST /api/performance/feedback - Give feedback
- ✅ GET /api/performance/employees/:employeeId/feedback - Employee feedback with summary
- ✅ GET /api/performance/feedback/sentiment-analysis - Sentiment analysis

**Test Scenarios**:
- List all feedback
- Create new feedback
- Get employee feedback with summary statistics
- Perform sentiment analysis

### **4. Analytics Endpoints Tests** (6 endpoints, 6+ test scenarios)
- ✅ GET /api/performance/analytics/overview - Performance overview
- ✅ GET /api/performance/analytics/employees/:employeeId - Employee analytics
- ✅ GET /api/performance/analytics/trends - Performance trends
- ✅ GET /api/performance/analytics/distribution - Score distribution
- ✅ GET /api/performance/analytics/benchmarks - Performance benchmarks
- ✅ GET /api/performance/analytics/risks - Performance risks

**Test Scenarios**:
- Get performance overview
- Get employee analytics
- Get employee analytics with history
- Get performance trends
- Get score distribution
- Get performance benchmarks
- Get performance risks

### **5. Coaching Endpoints Tests** (6 endpoints, 7+ test scenarios)
- ✅ POST /api/performance/coaching/request - Request coaching
- ✅ GET /api/performance/coaching/sessions - List sessions
- ✅ GET /api/performance/coaching/sessions/:id - Session details
- ✅ POST /api/performance/coaching/sessions/:id/complete - Complete session
- ✅ GET /api/performance/coaching/employees/:employeeId/plans - Coaching plans
- ✅ GET /api/performance/coaching/effectiveness - Effectiveness metrics

**Test Scenarios**:
- Create coaching request
- Test all 5 coaching types
- List coaching sessions
- Get session details
- Complete session
- Get employee coaching plans
- Get coaching effectiveness metrics

### **6. Module Endpoints Tests** (3 endpoints, 3 test scenarios)
- ✅ GET /api/performance/health - Health check
- ✅ GET /api/performance/status - Module status
- ✅ GET /api/performance/docs - API documentation

**Test Scenarios**:
- Health check returns healthy status
- Status returns module configuration
- Docs returns all 32 endpoints

### **7. Error Handling Tests** (3+ test scenarios)
- ✅ Invalid goal creation
- ✅ Invalid review creation
- ✅ Missing feedback data

### **8. Integration Tests** (3 test scenarios)
- ✅ Goals API + Goal Setting Workflow integration
- ✅ Reviews API + Review Workflow integration
- ✅ Coaching API + Coaching Workflow integration

---

## 🚀 **Running Tests**

### **Quick Start**
```bash
cd backend/services/modules/performance/__tests__/api
./run-tests.sh
```

### **Manual Execution**
```bash
cd backend/services/modules/performance/__tests__/api
npm install
npm test
```

### **Watch Mode**
```bash
npm run test:watch
```

### **Coverage Report**
```bash
npm run test:coverage
```

---

## 📊 **Test Statistics**

- **Total API Endpoints**: 32
- **Total Test Scenarios**: 40+ comprehensive tests
- **Endpoint Categories**: 6 categories
- **HTTP Methods**: GET, POST, PUT, DELETE
- **Response Codes**: 200, 404, 500
- **Workflow Integrations**: 3 workflows tested

---

## 🔧 **Test Configuration**

**Test Framework**: Jest with ts-jest and supertest
**Environment**: Node.js with Express
**Timeout**: 30 seconds per test
**Coverage**: All API endpoint files

---

## ✅ **Expected Test Results**

All tests should pass with:
- ✅ All 32 endpoints respond correctly
- ✅ Success responses have correct structure
- ✅ Error responses have proper error messages
- ✅ Workflow integrations execute correctly
- ✅ HTTP status codes are appropriate
- ✅ Query parameters are processed
- ✅ Request bodies are validated

**Total Test Cases**: 40+ comprehensive API tests

---

## 🎉 **Status**

**Test Suite Status**: ✅ Complete and ready to run

Run the tests to verify all Performance Management API endpoints work correctly!

