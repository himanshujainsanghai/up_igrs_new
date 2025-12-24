# Backend Tests

This directory contains unit tests for the backend API.

## 📁 Test Structure

```
tests/
├── setup.ts                 # Jest setup file
├── utils/
│   ├── testHelpers.ts      # Test helper functions
│   ├── mocks.ts            # Mock objects
│   └── fixtures.ts         # Test data fixtures
├── services/
│   ├── complaints.service.test.ts
│   ├── documents.service.test.ts
│   └── ai.service.test.ts
└── controllers/
    ├── complaints.controller.test.ts
    └── documents.controller.test.ts
```

## 🚀 Running Tests

### Run all tests
```bash
npm test
```

### Run tests in watch mode
```bash
npm run test:watch
```

### Run tests with coverage
```bash
npm run test:coverage
```

### Run specific test file
```bash
npm test -- complaints.service.test.ts
```

### Run tests matching a pattern
```bash
npm test -- --testNamePattern="should create complaint"
```

## 📝 Test Utilities

### Test Helpers (`utils/testHelpers.ts`)
- `createMockRequest()` - Create mock Express request
- `createMockResponse()` - Create mock Express response
- `createMockNext()` - Create mock NextFunction
- `createMockUser()` - Create mock user object
- `generateId()` - Generate UUID-like string
- `wait()` - Wait for async operations

### Mocks (`utils/mocks.ts`)
- `mockComplaint` - Mock complaint object
- `mockDocument` - Mock document object
- `mockAIResolutionStep` - Mock AI resolution step
- `mockAIStepExecutionInstruction` - Mock step instructions
- `mockUser` - Mock user object
- `createMockModel()` - Create mock Mongoose model

### Fixtures (`utils/fixtures.ts`)
- `complaintFixtures` - Sample complaint data
- `documentFixtures` - Sample document data
- `aiFixtures` - Sample AI data
- `userFixtures` - Sample user data

## 🧪 Test Coverage

Current test coverage includes:

### Services
- ✅ Complaints Service
  - getAllComplaints (with sub_category filtering)
  - getComplaintById
  - createComplaint (with/without sub_category)
  - updateComplaintResearch
  - updateComplaintStage1Data
  - getAIAnalysisProgress

- ✅ Documents Service
  - getAllDocuments (with filters)
  - getDocumentById
  - createDocument
  - updateDocument
  - deleteDocument

- ✅ AI Service
  - generateStepInstructions
  - fetchStepInstructions

### Controllers
- ✅ Complaints Controller
  - getAllComplaints
  - updateComplaintResearch
  - updateComplaintStage1Data

- ✅ Documents Controller
  - getAllDocuments
  - getDocumentById
  - createDocument
  - updateDocument
  - deleteDocument

## 📊 Writing New Tests

### Service Test Example
```typescript
import * as service from '../../src/services/my.service';
import { MyModel } from '../../src/models/MyModel';

jest.mock('../../src/models/MyModel');

describe('My Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should do something', async () => {
    // Arrange
    const mockData = { id: 'test-id' };
    (MyModel.findOne as jest.Mock).mockResolvedValue(mockData);

    // Act
    const result = await service.getById('test-id');

    // Assert
    expect(result).toEqual(mockData);
  });
});
```

### Controller Test Example
```typescript
import * as controller from '../../src/controllers/my.controller';
import * as service from '../../src/services/my.service';
import { createMockRequest, createMockResponse, createMockNext } from '../utils/testHelpers';

jest.mock('../../src/services/my.service');

describe('My Controller', () => {
  let mockReq: any;
  let mockRes: Response;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = createMockRequest();
    mockRes = createMockResponse();
    mockNext = createMockNext();
  });

  it('should handle request', async () => {
    const mockData = { id: 'test-id' };
    (service.getById as jest.Mock).mockResolvedValue(mockData);
    mockReq.params = { id: 'test-id' };

    await controller.getById(mockReq, mockRes, mockNext);

    expect(service.getById).toHaveBeenCalledWith('test-id');
    expect(mockRes.status).toHaveBeenCalledWith(200);
  });
});
```

## 🔍 Best Practices

1. **Isolate Tests**: Each test should be independent
2. **Mock Dependencies**: Mock external dependencies (database, APIs)
3. **Use Fixtures**: Use fixtures for test data
4. **Clear Mocks**: Clear mocks in `beforeEach`
5. **Test Edge Cases**: Test error cases, null values, etc.
6. **Descriptive Names**: Use descriptive test names
7. **Arrange-Act-Assert**: Follow AAA pattern

## 🐛 Debugging Tests

### Run tests with verbose output
```bash
npm test -- --verbose
```

### Run tests with debugging
```bash
node --inspect-brk node_modules/.bin/jest --runInBand
```

### View coverage report
After running `npm run test:coverage`, open `coverage/lcov-report/index.html` in a browser.

## 📚 Resources

- [Jest Documentation](https://jestjs.io/)
- [TypeScript with Jest](https://jestjs.io/docs/getting-started#using-typescript)
- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)

