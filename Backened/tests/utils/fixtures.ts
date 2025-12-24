/**
 * Test Fixtures
 * Sample data for testing
 */

export const complaintFixtures = {
  validComplaint: {
    title: 'Road Pothole Complaint',
    description: 'There is a large pothole on Main Street causing traffic issues',
    category: 'roads' as const,
    sub_category: 'potholes',
    priority: 'high' as const,
    location: 'Main Street, City',
    contact_name: 'John Doe',
    contact_email: 'john@example.com',
    contact_phone: '1234567890',
    voter_id: 'VOTER123456',
  },
  complaintWithoutSubCategory: {
    title: 'Water Supply Issue',
    description: 'No water supply in the area',
    category: 'water' as const,
    priority: 'medium' as const,
    location: 'Residential Area',
    contact_name: 'Jane Smith',
    contact_email: 'jane@example.com',
  },
  researchData: {
    findings: 'Research findings indicate this is a critical issue',
    sources: ['Source 1', 'Source 2'],
    notes: 'Additional research notes',
    priority_reason: 'High impact on public safety',
  },
  stage1Data: {
    primary_officer: {
      name: 'Officer Name',
      designation: 'Municipal Commissioner',
      office_address: '123 Main St',
      phone: '1234567890',
      email: 'officer@example.com',
    },
    secondary_officer: {
      name: 'Secondary Officer',
      designation: 'Deputy Commissioner',
      office_address: '456 Oak Ave',
      phone: '0987654321',
      email: 'secondary@example.com',
    },
    drafted_letter: {
      from: 'MLA Office',
      to: 'Municipal Commissioner',
      date: '2024-02-20',
      subject: 'Request for Action',
      body: 'Letter body content',
      attachments: ['file1.pdf', 'file2.pdf'],
    },
    stage1_additional_docs: ['doc1.pdf', 'doc2.pdf'],
  },
};

export const documentFixtures = {
  validDocument: {
    file_name: 'policy.pdf',
    file_type: 'application/pdf',
    file_size: 2048000,
    file_url: 'https://s3.amazonaws.com/bucket/policy.pdf',
    s3_key: 'documents/policy.pdf',
    description: 'Public policy document',
    tags: ['policy', 'public'],
    is_public: true,
  },
  privateDocument: {
    file_name: 'private.pdf',
    file_type: 'application/pdf',
    file_size: 1024000,
    file_url: 'https://s3.amazonaws.com/bucket/private.pdf',
    description: 'Private document',
    tags: ['private'],
    is_public: false,
  },
};

export const aiFixtures = {
  aiAnalysis: {
    summary: 'AI-generated summary',
    recommended_steps: ['Step 1', 'Step 2'],
    estimated_timeline: '2-3 weeks',
    estimated_cost: 50000,
    priority_reason: 'High impact issue',
  },
  resolutionSteps: [
    {
      step_number: 1,
      title: 'Contact Municipal Corporation',
      description: 'Reach out to municipal corporation',
      department: 'Municipal Corporation',
      estimated_cost: 10000,
      estimated_timeline: '1 week',
    },
    {
      step_number: 2,
      title: 'Site Inspection',
      description: 'Conduct site inspection',
      department: 'Engineering Department',
      estimated_cost: 20000,
      estimated_timeline: '1 week',
    },
  ],
  stepInstructions: {
    instructions: `1. Contact the Municipal Commissioner's office
2. Prepare the necessary documentation
3. Schedule a site visit
4. Follow up on the progress`,
  },
};

export const userFixtures = {
  adminUser: {
    name: 'Admin User',
    email: 'admin@example.com',
    password: 'password123',
    role: 'admin',
  },
  regularUser: {
    name: 'Regular User',
    email: 'user@example.com',
    password: 'password123',
    role: 'user',
  },
};

