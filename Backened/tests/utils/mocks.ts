/**
 * Test Mocks
 * Mock objects and functions for testing
 */

import mongoose from 'mongoose';

/**
 * Mock Mongoose Model
 */
export const createMockModel = (mockData: any) => {
  const Model = {
    find: jest.fn(),
    findOne: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    findOneAndUpdate: jest.fn(),
    findOneAndDelete: jest.fn(),
    deleteOne: jest.fn(),
    deleteMany: jest.fn(),
    countDocuments: jest.fn(),
    aggregate: jest.fn(),
    save: jest.fn(),
    toObject: jest.fn(),
    lean: jest.fn(),
  };

  // Setup default return values with proper chaining
  const mockQuery = {
    sort: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    lean: jest.fn().mockResolvedValue(mockData || []),
  };

  Model.find.mockReturnValue(mockQuery);

  Model.findOne.mockReturnValue({
    lean: jest.fn().mockResolvedValue(mockData || null),
    save: jest.fn().mockResolvedValue(mockData),
    toObject: jest.fn().mockReturnValue(mockData),
  });

  Model.countDocuments.mockResolvedValue(0);
  Model.create.mockResolvedValue(mockData);
  Model.save.mockResolvedValue(mockData);
  Model.toObject.mockReturnValue(mockData);

  return Model;
};

/**
 * Mock Complaint object
 */
export const mockComplaint = {
  id: 'complaint-id',
  title: 'Test Complaint',
  description: 'Test description',
  category: 'roads',
  sub_category: 'potholes',
  status: 'pending',
  priority: 'medium',
  location: 'Test Location',
  contact_name: 'John Doe',
  contact_email: 'john@example.com',
  contact_phone: '1234567890',
  voter_id: 'VOTER123',
  research_data: null,
  primary_officer: null,
  secondary_officer: null,
  drafted_letter: null,
  stage1_additional_docs: [],
  ai_analysis: null,
  ai_analysis_completed: false,
  created_at: new Date(),
  updated_at: new Date(),
};

/**
 * Mock AI Resolution Step
 */
export const mockAIResolutionStep = {
  id: 'step-id',
  complaint_id: 'complaint-id',
  step_number: 1,
  title: 'Test Step',
  description: 'Test step description',
  department: 'Municipal Corporation',
  estimated_cost: 10000,
  estimated_timeline: '2 weeks',
  status: 'pending',
  created_at: new Date(),
  updated_at: new Date(),
};

/**
 * Mock AI Step Execution Instruction
 */
export const mockAIStepExecutionInstruction = {
  id: 'instruction-id',
  complaint_id: 'complaint-id',
  step_id: 'step-id',
  instructions: 'Detailed step-by-step instructions...',
  created_at: new Date(),
  updated_at: new Date(),
};

/**
 * Mock Document
 */
export const mockDocument = {
  id: 'document-id',
  file_name: 'test.pdf',
  file_type: 'application/pdf',
  file_size: 1024000,
  file_url: 'https://s3.amazonaws.com/bucket/test.pdf',
  s3_key: 'documents/test.pdf',
  uploaded_by: 'Admin User',
  uploaded_at: new Date(),
  description: 'Test document',
  tags: ['test', 'public'],
  is_public: true,
  created_at: new Date(),
  updated_at: new Date(),
};

/**
 * Mock User
 */
export const mockUser = {
  id: 'user-id',
  name: 'Test User',
  email: 'test@example.com',
  password: 'hashed-password',
  role: 'admin',
  created_at: new Date(),
  updated_at: new Date(),
};

/**
 * Mock Logger
 */
export const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
};

/**
 * Mock Mongoose Connection
 */
export const mockMongooseConnection = {
  readyState: 1,
  close: jest.fn().mockResolvedValue(undefined),
  on: jest.fn(),
  once: jest.fn(),
};

