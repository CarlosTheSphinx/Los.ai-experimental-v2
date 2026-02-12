-- Performance indexes for frequently queried columns
-- These indexes improve query performance for common lookup patterns
-- Created: 2026-02-12

-- Users table: email lookups for login, status filtering, role-based queries
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);

-- Saved quotes: user's quotes list, stage filtering, program lookups
CREATE INDEX IF NOT EXISTS idx_saved_quotes_user_id ON saved_quotes(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_quotes_stage ON saved_quotes(stage);
CREATE INDEX IF NOT EXISTS idx_saved_quotes_program_id ON saved_quotes(program_id);
CREATE INDEX IF NOT EXISTS idx_saved_quotes_created_at ON saved_quotes(created_at);

-- Projects: user's projects, status filtering, quote lookups, borrower portal
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_quote_id ON projects(quote_id);
CREATE INDEX IF NOT EXISTS idx_projects_program_id ON projects(program_id);
CREATE INDEX IF NOT EXISTS idx_projects_is_archived ON projects(is_archived);
CREATE INDEX IF NOT EXISTS idx_projects_borrower_portal_token ON projects(borrower_portal_token);

-- Documents: per-project document lists
CREATE INDEX IF NOT EXISTS idx_documents_project_id ON documents(project_id);
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);

-- Document fields: per-document field lookups
CREATE INDEX IF NOT EXISTS idx_document_fields_document_id ON document_fields(document_id);

-- Project stages: per-project stage ordering
CREATE INDEX IF NOT EXISTS idx_project_stages_project_id ON project_stages(project_id);

-- Project tasks: per-project and per-stage task lookups
CREATE INDEX IF NOT EXISTS idx_project_tasks_project_id ON project_tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_project_tasks_stage_id ON project_tasks(stage_id);
CREATE INDEX IF NOT EXISTS idx_project_tasks_status ON project_tasks(status);

-- Project activity: timeline queries and project-specific activity
CREATE INDEX IF NOT EXISTS idx_project_activity_project_id ON project_activity(project_id);
CREATE INDEX IF NOT EXISTS idx_project_activity_created_at ON project_activity(created_at);

-- Project documents: per-project document associations
CREATE INDEX IF NOT EXISTS idx_project_documents_project_id ON project_documents(project_id);
CREATE INDEX IF NOT EXISTS idx_project_documents_document_id ON project_documents(document_id);

-- Project webhooks: per-project webhook listings
CREATE INDEX IF NOT EXISTS idx_project_webhooks_project_id ON project_webhooks(project_id);

-- Deal documents: per-deal document lists and status filtering
CREATE INDEX IF NOT EXISTS idx_deal_documents_deal_id ON deal_documents(deal_id);
CREATE INDEX IF NOT EXISTS idx_deal_documents_status ON deal_documents(status);

-- Deal document files: per-document file lookups
CREATE INDEX IF NOT EXISTS idx_deal_document_files_document_id ON deal_document_files(document_id);

-- Deal properties: per-deal property lookups
CREATE INDEX IF NOT EXISTS idx_deal_properties_deal_id ON deal_properties(deal_id);

-- Deal tasks: per-deal task lookups, status filtering, and assignment tracking
CREATE INDEX IF NOT EXISTS idx_deal_tasks_deal_id ON deal_tasks(deal_id);
CREATE INDEX IF NOT EXISTS idx_deal_tasks_status ON deal_tasks(status);
CREATE INDEX IF NOT EXISTS idx_deal_tasks_assigned_to ON deal_tasks(assigned_to);

-- Admin tasks: status filtering and user assignment
CREATE INDEX IF NOT EXISTS idx_admin_tasks_status ON admin_tasks(status);
CREATE INDEX IF NOT EXISTS idx_admin_tasks_assigned_to ON admin_tasks(assigned_to);

-- Admin activity: timeline queries
CREATE INDEX IF NOT EXISTS idx_admin_activity_created_at ON admin_activity(created_at);

-- Loan programs: active program filtering and loan type queries
CREATE INDEX IF NOT EXISTS idx_loan_programs_is_active ON loan_programs(is_active);
CREATE INDEX IF NOT EXISTS idx_loan_programs_loan_type ON loan_programs(loan_type);

-- Program document templates: per-program template lookups
CREATE INDEX IF NOT EXISTS idx_program_document_templates_program_id ON program_document_templates(program_id);

-- Program task templates: per-program template lookups
CREATE INDEX IF NOT EXISTS idx_program_task_templates_program_id ON program_task_templates(program_id);

-- Workflow step definitions: per-program workflow steps
CREATE INDEX IF NOT EXISTS idx_workflow_step_definitions_program_id ON workflow_step_definitions(program_id);

-- Program workflow steps: per-program workflow tracking
CREATE INDEX IF NOT EXISTS idx_program_workflow_steps_program_id ON program_workflow_steps(program_id);

-- Deal processors: per-deal processor assignments
CREATE INDEX IF NOT EXISTS idx_deal_processors_deal_id ON deal_processors(deal_id);

-- Pricing rulesets: active ruleset filtering and program lookups
CREATE INDEX IF NOT EXISTS idx_pricing_rulesets_is_active ON pricing_rulesets(is_active);
CREATE INDEX IF NOT EXISTS idx_pricing_rulesets_program_id ON pricing_rulesets(program_id);

-- Rule proposals: per-ruleset proposal lookups
CREATE INDEX IF NOT EXISTS idx_rule_proposals_ruleset_id ON rule_proposals(ruleset_id);
