# Database Migrations

## Official Exams Feature

### Migration 001: Create official_exams table

**File:** `001_create_official_exams.sql`

This migration creates the infrastructure for official exams feature:

1. Creates `official_exams` table with all necessary fields
2. Adds `source_official_exam_id` column to `simulated_exams` table
3. Creates indexes for performance optimization

**To apply:**
```sql
psql -U your_user -d your_database -f 001_create_official_exams.sql
```

**To rollback:**
```sql
psql -U your_user -d your_database -f 001_rollback_official_exams.sql
```

### Schema Changes

#### New Table: official_exams
- Stores official exam templates (e.g., Revalida 2025)
- Contains exam metadata, question IDs, and configuration
- Supports multiple attempts by creating SimulatedExams from templates

#### Modified Table: simulated_exams
- Added `source_official_exam_id` column (nullable UUID)
- Links personal exam attempts to official exam templates
- Allows tracking multiple attempts of the same official exam

### Testing Migrations

1. **Development Environment:**
   ```bash
   # Apply migration
   npm run migrate:up
   
   # Verify tables
   psql -U your_user -d your_database -c "\d official_exams"
   psql -U your_user -d your_database -c "\d simulated_exams"
   ```

2. **Rollback Test:**
   ```bash
   # Rollback migration
   npm run migrate:down
   
   # Verify tables are removed/restored
   ```

### Important Notes

- Always backup database before running migrations
- Test migrations in development environment first
- The `source_official_exam_id` column is nullable for backwards compatibility
- Existing simulated_exams will have `source_official_exam_id` as NULL
