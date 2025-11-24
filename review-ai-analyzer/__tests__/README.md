# Database Connection Tests

Comprehensive test suite for the Supabase database connection and sentiments table operations.

## Test Structure

```
__tests__/
├── database/
│   └── sentiments.test.ts          # CRUD operations, RLS, error handling
├── components/
│   └── UrlProcessor.test.tsx       # Component tests with mocked Supabase
├── integration/
│   └── supabase-connection.test.ts # Integration tests for Supabase connection
├── utils/
│   └── database-helpers.test.ts    # Utility function tests
├── setup.ts                        # Test environment setup
└── README.md                       # This file
```

## Running Tests

### Install Dependencies

```bash
npm install
```

### Run All Tests

```bash
npm test
```

### Run Tests in Watch Mode

```bash
npm run test:watch
```

### Run Tests with UI

```bash
npm run test:ui
```

### Run Tests with Coverage

```bash
npm run test:coverage
```

## Environment Variables

Create a `.env.test` file (or set environment variables) with:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key  # For admin operations
TEST_USER_ID=test_user_uuid                       # Optional: for RLS tests
TEST_USER_2_ID=test_user_2_uuid                  # Optional: for RLS tests
```

## Test Categories

### 1. Database Structure Tests

- Table schema validation
- Column existence and types
- Constraints and defaults

### 2. CRUD Operations

- **Create**: Insert new sentiment analyses
- **Read**: Query sentiments by user, order by date
- **Update**: Modify existing analyses
- **Delete**: Remove analyses and cascade behavior

### 3. Row Level Security (RLS)

- Users can only read their own sentiments
- Users can only insert their own sentiments
- Users can only delete their own sentiments
- Cross-user access prevention

### 4. Error Handling

- Missing table handling
- Invalid UUID format
- Foreign key constraint violations
- Null constraint violations
- Network errors

### 5. Data Integrity

- Referential integrity with auth.users
- JSONB field preservation
- Large payload handling
- Timestamp generation

### 6. Performance

- Query efficiency by user_id
- Pagination support
- Large dataset handling

### 7. Component Integration

- URLProcessor component with mocked Supabase
- Error handling in UI
- User authentication state
- API integration

## Writing New Tests

### Database Test Example

```typescript
test("should insert sentiment analysis", async () => {
  const { data, error } = await supabase
    .from("sentiments")
    .insert({
      user_id: testUserId,
      source_url: "https://youtube.com/watch?v=test",
      analysis_title: "Test Analysis",
    })
    .select()
    .single();

  expect(error).toBeNull();
  expect(data).toBeDefined();
  expect(data.id).toBeDefined();
});
```

### Component Test Example

```typescript
test("should save to database on analysis", async () => {
  const { getByLabelText, getByRole } = render(
    <UrlProcessor onAnalysisComplete={mockFn} userId="user-123" />
  );

  await userEvent.type(
    getByLabelText(/url/i),
    "https://youtube.com/watch?v=test"
  );
  await userEvent.click(getByRole("button", { name: /analyze/i }));

  await waitFor(() => {
    expect(mockSupabase.from).toHaveBeenCalledWith("sentiments");
  });
});
```

## Test Data Cleanup

Tests automatically clean up after themselves using `afterEach` hooks. Test data is isolated by using test user IDs.

## Notes

- **RLS Tests**: Some RLS tests require actual authentication context. In a real scenario, you'd authenticate test users before running RLS tests.
- **Service Role Key**: Admin operations (bypassing RLS) require the service role key. Never commit this key to version control.
- **Test Users**: Create dedicated test users in your Supabase project for RLS testing.

## Troubleshooting

### "Table not found" errors

- Run the migration: `002_create_sentiments.sql` in your Supabase SQL editor

### Authentication errors

- Ensure your Supabase credentials are correct
- Check that RLS policies are properly configured

### Network errors

- Verify your Supabase URL is correct
- Check your internet connection
- Ensure Supabase project is active
