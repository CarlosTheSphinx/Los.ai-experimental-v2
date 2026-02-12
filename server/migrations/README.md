# Database Migrations

This directory contains SQL migration files for the Los.ai database schema.

## Migrations

### add-performance-indexes.sql

Performance indexes added to improve query efficiency for common lookup patterns.

**Indexes added for the following tables and operations:**

- **users**: email lookups (login), is_active filtering, role-based queries, Google OAuth lookups
- **saved_quotes**: user's quotes list, stage filtering, program lookups, timeline sorting
- **projects**: user's projects, status filtering, quote associations, borrower portal access
- **documents**: per-project document retrieval
- **document_fields**: field lookups by document
- **project_stages**: per-project stage ordering
- **project_tasks**: per-project/stage task retrieval, status filtering
- **project_activity**: timeline queries, activity history
- **project_documents**: document association lookups
- **project_webhooks**: per-project webhook management
- **deal_documents**: per-deal document retrieval, status filtering
- **deal_document_files**: file lookups by document
- **deal_properties**: per-deal property lookups
- **deal_tasks**: per-deal task retrieval, assignment tracking, status filtering
- **admin_tasks**: status filtering, assignment tracking
- **admin_activity**: activity timeline queries
- **loan_programs**: active program filtering, loan type queries
- **program_document_templates**: template lookups by program
- **program_task_templates**: template lookups by program
- **workflow_step_definitions**: workflow step retrieval
- **program_workflow_steps**: workflow tracking
- **deal_processors**: processor assignments
- **pricing_rulesets**: active ruleset filtering, program-specific rulesets
- **rule_proposals**: proposal lookups by ruleset

## Applying Migrations

To apply migrations using Drizzle Kit:

```bash
drizzle-kit migrate
```

Or execute the SQL file directly against your PostgreSQL database:

```bash
psql -d your_database < add-performance-indexes.sql
```

## Index Naming Convention

All indexes follow the naming pattern: `idx_[table_name]_[column_name]`

This makes it easy to identify which table and column an index is for.
