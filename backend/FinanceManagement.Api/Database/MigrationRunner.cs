using Dapper;

namespace FinanceManagement.Api.Database;

public class MigrationRunner
{
    private readonly DbContext _db;
    private readonly ILogger<MigrationRunner> _logger;

    public MigrationRunner(DbContext db, ILogger<MigrationRunner> logger)
    {
        _db = db;
        _logger = logger;
    }

    public async Task RunAsync()
    {
        _logger.LogInformation("Running database migrations...");

        var migrations = GetMigrations();

        await using var conn = _db.CreateConnection();
        await conn.OpenAsync();

        foreach (var (name, sql) in migrations)
        {
            try
            {
                await conn.ExecuteAsync(sql);
                _logger.LogInformation("Migration {Name} applied successfully", name);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Migration {Name} warning (may already be applied)", name);
            }
        }

        _logger.LogInformation("Database migrations completed");
    }

    private static List<(string Name, string Sql)> GetMigrations() =>
    [
        ("001_initial_schema", Sql001InitialSchema),
        ("001b_triggers", Sql001bTriggers),
        ("001c_seed_categories", Sql001cSeedCategories),
        ("002_password_reset_tokens", Sql002PasswordResetTokens),
        ("003_invoice_type_pnl_defaults", Sql003InvoiceTypePnlDefaults),
        ("004_linked_invoices", Sql004LinkedInvoices),
        ("005_notification_preferences", Sql005NotificationPreferences),
        ("006_pipeline_management", Sql006PipelineManagement),
        ("006b_pipeline_triggers", Sql006bPipelineTriggers),
        ("007_pipeline_attachments", Sql007PipelineAttachments),
        ("008_lead_sources", Sql008LeadSources),
        ("009_income_extra_dates", Sql009IncomeExtraDates),
        ("010_contact_persons_client_enrichment", Sql010ContactPersonsClientEnrichment),
        ("011_leads_deal_terms", Sql011LeadsDealTerms),
        ("012_income_client_billing", Sql012IncomeClientBilling),
        ("013a_drop_role_constraint", Sql013aDropRoleConstraint),
        ("013b_add_owner_to_role_constraint", Sql013bAddOwnerToRoleConstraint),
        ("013c_promote_owner", Sql013cPromoteOwner),
        ("014a_income_contracts", Sql014aIncomeContracts),
        ("014b_income_milestones", Sql014bIncomeMilestones),
        ("014c_income_contracts_triggers", Sql014cIncomeContractsTriggers),
        ("014d_proposals_contract_column", Sql014dProposalsContractColumn),
        ("015a_contract_attachments", Sql015aContractAttachments),
        ("015b_milestone_attachments", Sql015bMilestoneAttachments),
        ("016_contract_service_type", Sql016ContractServiceType),
        ("017_dropdown_options", Sql017DropdownOptions),
        ("018_backfill_client_ids", Sql018BackfillClientIds),
        ("019_create_clients_from_income", Sql019CreateClientsFromIncome),
    ];

    #region SQL Migrations

    private const string Sql001InitialSchema = """
        CREATE EXTENSION IF NOT EXISTS "pgcrypto";

        CREATE TABLE IF NOT EXISTS users (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          email VARCHAR(255) UNIQUE NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          first_name VARCHAR(100) NOT NULL,
          last_name VARCHAR(100) NOT NULL,
          role VARCHAR(50) NOT NULL DEFAULT 'viewer',
          mfa_secret VARCHAR(255),
          mfa_enabled BOOLEAN DEFAULT FALSE,
          mfa_backup_codes TEXT[],
          is_active BOOLEAN DEFAULT TRUE,
          password_changed_at TIMESTAMP WITH TIME ZONE,
          password_history TEXT[],
          failed_login_attempts INT DEFAULT 0,
          locked_until TIMESTAMP WITH TIME ZONE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT valid_role CHECK (role IN ('admin', 'manager', 'viewer'))
        );
        CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
        CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
        CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active);

        CREATE TABLE IF NOT EXISTS sessions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          refresh_token_hash VARCHAR(255) NOT NULL,
          device_info JSONB,
          ip_address INET,
          user_agent TEXT,
          expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
          last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
        CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
        CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(refresh_token_hash);

        CREATE TABLE IF NOT EXISTS pnl_centers (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(255) NOT NULL,
          description TEXT,
          is_active BOOLEAN DEFAULT TRUE,
          created_by UUID REFERENCES users(id) ON DELETE SET NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_pnl_centers_active ON pnl_centers(is_active);

        CREATE TABLE IF NOT EXISTS user_pnl_permissions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          pnl_center_id UUID NOT NULL REFERENCES pnl_centers(id) ON DELETE CASCADE,
          permission_level VARCHAR(50) NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT valid_permission CHECK (permission_level IN ('view', 'edit', 'admin')),
          CONSTRAINT unique_user_pnl UNIQUE(user_id, pnl_center_id)
        );
        CREATE INDEX IF NOT EXISTS idx_user_pnl_permissions_user ON user_pnl_permissions(user_id);
        CREATE INDEX IF NOT EXISTS idx_user_pnl_permissions_pnl ON user_pnl_permissions(pnl_center_id);

        CREATE TABLE IF NOT EXISTS expense_categories (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(100) NOT NULL,
          type VARCHAR(50) NOT NULL,
          parent_id UUID REFERENCES expense_categories(id) ON DELETE SET NULL,
          is_active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT valid_expense_type CHECK (type IN ('fixed', 'variable', 'salary', 'one_time'))
        );
        CREATE INDEX IF NOT EXISTS idx_expense_categories_type ON expense_categories(type);
        CREATE INDEX IF NOT EXISTS idx_expense_categories_parent ON expense_categories(parent_id);

        CREATE TABLE IF NOT EXISTS expenses (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          description VARCHAR(500) NOT NULL,
          amount DECIMAL(15, 2) NOT NULL,
          currency VARCHAR(3) DEFAULT 'USD',
          category_id UUID REFERENCES expense_categories(id) ON DELETE SET NULL,
          expense_date DATE NOT NULL,
          is_recurring BOOLEAN DEFAULT FALSE,
          recurring_pattern JSONB,
          vendor VARCHAR(255),
          notes TEXT,
          attachments JSONB DEFAULT '[]',
          tags VARCHAR(100)[] DEFAULT '{}',
          created_by UUID REFERENCES users(id) ON DELETE SET NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT positive_amount CHECK (amount > 0)
        );
        CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(expense_date);
        CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category_id);
        CREATE INDEX IF NOT EXISTS idx_expenses_recurring ON expenses(is_recurring);
        CREATE INDEX IF NOT EXISTS idx_expenses_vendor ON expenses(vendor);
        CREATE INDEX IF NOT EXISTS idx_expenses_created_by ON expenses(created_by);

        CREATE TABLE IF NOT EXISTS expense_allocations (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          expense_id UUID NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
          pnl_center_id UUID NOT NULL REFERENCES pnl_centers(id) ON DELETE CASCADE,
          percentage DECIMAL(5, 2) NOT NULL,
          allocated_amount DECIMAL(15, 2) NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT valid_percentage CHECK (percentage > 0 AND percentage <= 100),
          CONSTRAINT unique_expense_pnl UNIQUE(expense_id, pnl_center_id)
        );
        CREATE INDEX IF NOT EXISTS idx_expense_allocations_expense ON expense_allocations(expense_id);
        CREATE INDEX IF NOT EXISTS idx_expense_allocations_pnl ON expense_allocations(pnl_center_id);

        CREATE TABLE IF NOT EXISTS income_categories (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(100) NOT NULL,
          type VARCHAR(50) NOT NULL,
          is_active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT valid_income_type CHECK (type IN ('retainer', 'project', 'other'))
        );
        CREATE INDEX IF NOT EXISTS idx_income_categories_type ON income_categories(type);

        CREATE TABLE IF NOT EXISTS income (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          description VARCHAR(500) NOT NULL,
          amount DECIMAL(15, 2) NOT NULL,
          currency VARCHAR(3) DEFAULT 'USD',
          category_id UUID REFERENCES income_categories(id) ON DELETE SET NULL,
          income_date DATE NOT NULL,
          is_recurring BOOLEAN DEFAULT FALSE,
          recurring_pattern JSONB,
          client_name VARCHAR(255),
          invoice_number VARCHAR(100),
          invoice_status VARCHAR(50),
          payment_due_date DATE,
          payment_received_date DATE,
          notes TEXT,
          tags VARCHAR(100)[] DEFAULT '{}',
          created_by UUID REFERENCES users(id) ON DELETE SET NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT positive_income_amount CHECK (amount > 0),
          CONSTRAINT valid_invoice_status CHECK (
            invoice_status IS NULL OR
            invoice_status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled')
          )
        );
        CREATE INDEX IF NOT EXISTS idx_income_date ON income(income_date);
        CREATE INDEX IF NOT EXISTS idx_income_category ON income(category_id);
        CREATE INDEX IF NOT EXISTS idx_income_status ON income(invoice_status);
        CREATE INDEX IF NOT EXISTS idx_income_client ON income(client_name);
        CREATE INDEX IF NOT EXISTS idx_income_recurring ON income(is_recurring);
        CREATE INDEX IF NOT EXISTS idx_income_due_date ON income(payment_due_date);

        CREATE TABLE IF NOT EXISTS income_allocations (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          income_id UUID NOT NULL REFERENCES income(id) ON DELETE CASCADE,
          pnl_center_id UUID NOT NULL REFERENCES pnl_centers(id) ON DELETE CASCADE,
          percentage DECIMAL(5, 2) NOT NULL,
          allocated_amount DECIMAL(15, 2) NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT valid_income_percentage CHECK (percentage > 0 AND percentage <= 100),
          CONSTRAINT unique_income_pnl UNIQUE(income_id, pnl_center_id)
        );
        CREATE INDEX IF NOT EXISTS idx_income_allocations_income ON income_allocations(income_id);
        CREATE INDEX IF NOT EXISTS idx_income_allocations_pnl ON income_allocations(pnl_center_id);

        CREATE TABLE IF NOT EXISTS recurring_templates (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          type VARCHAR(20) NOT NULL,
          reference_id UUID NOT NULL,
          frequency VARCHAR(20) NOT NULL,
          interval_value INT DEFAULT 1,
          day_of_month INT,
          day_of_week INT,
          next_occurrence DATE NOT NULL,
          end_date DATE,
          is_active BOOLEAN DEFAULT TRUE,
          last_generated_at TIMESTAMP WITH TIME ZONE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT valid_recurring_type CHECK (type IN ('expense', 'income')),
          CONSTRAINT valid_frequency CHECK (frequency IN ('daily', 'weekly', 'monthly', 'yearly')),
          CONSTRAINT valid_day_of_month CHECK (day_of_month IS NULL OR (day_of_month >= 1 AND day_of_month <= 31)),
          CONSTRAINT valid_day_of_week CHECK (day_of_week IS NULL OR (day_of_week >= 0 AND day_of_week <= 6))
        );
        CREATE INDEX IF NOT EXISTS idx_recurring_templates_type ON recurring_templates(type);
        CREATE INDEX IF NOT EXISTS idx_recurring_templates_next ON recurring_templates(next_occurrence);
        CREATE INDEX IF NOT EXISTS idx_recurring_templates_active ON recurring_templates(is_active);

        CREATE TABLE IF NOT EXISTS audit_logs (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID REFERENCES users(id) ON DELETE SET NULL,
          action VARCHAR(100) NOT NULL,
          entity_type VARCHAR(100) NOT NULL,
          entity_id UUID,
          old_values JSONB,
          new_values JSONB,
          ip_address INET,
          user_agent TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
        CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
        CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
        CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at);

        CREATE TABLE IF NOT EXISTS integrations (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(100) NOT NULL,
          type VARCHAR(50) NOT NULL,
          credentials_encrypted TEXT,
          settings JSONB DEFAULT '{}',
          is_active BOOLEAN DEFAULT TRUE,
          last_sync_at TIMESTAMP WITH TIME ZONE,
          sync_error TEXT,
          created_by UUID REFERENCES users(id) ON DELETE SET NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT valid_integration_type CHECK (type IN ('monday', 'quickbooks', 'freshbooks', 'zoho'))
        );
        CREATE INDEX IF NOT EXISTS idx_integrations_type ON integrations(type);
        CREATE INDEX IF NOT EXISTS idx_integrations_active ON integrations(is_active);

        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $$
        BEGIN
          NEW.updated_at = CURRENT_TIMESTAMP;
          RETURN NEW;
        END;
        $$ language 'plpgsql';
        """;

    private const string Sql001bTriggers = """
        DROP TRIGGER IF EXISTS update_users_updated_at ON users;
        CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        DROP TRIGGER IF EXISTS update_pnl_centers_updated_at ON pnl_centers;
        CREATE TRIGGER update_pnl_centers_updated_at BEFORE UPDATE ON pnl_centers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        DROP TRIGGER IF EXISTS update_expenses_updated_at ON expenses;
        CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON expenses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        DROP TRIGGER IF EXISTS update_income_updated_at ON income;
        CREATE TRIGGER update_income_updated_at BEFORE UPDATE ON income FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        DROP TRIGGER IF EXISTS update_integrations_updated_at ON integrations;
        CREATE TRIGGER update_integrations_updated_at BEFORE UPDATE ON integrations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        """;

    private const string Sql001cSeedCategories = """
        INSERT INTO expense_categories (name, type)
        SELECT name, type FROM (VALUES
          ('Rent', 'fixed'), ('Utilities', 'variable'), ('Insurance', 'fixed'),
          ('Software Subscriptions', 'fixed'), ('Marketing', 'variable'),
          ('Office Supplies', 'variable'), ('Travel', 'variable'),
          ('Professional Services', 'variable'), ('Salaries', 'salary'),
          ('Contractor Payments', 'salary'), ('Equipment', 'one_time'), ('Other', 'one_time')
        ) AS v(name, type)
        WHERE NOT EXISTS (SELECT 1 FROM expense_categories LIMIT 1);

        INSERT INTO income_categories (name, type)
        SELECT name, type FROM (VALUES
          ('Monthly Retainer', 'retainer'), ('Project Fee', 'project'),
          ('Consulting', 'project'), ('Milestone Payment', 'project'), ('Other Revenue', 'other')
        ) AS v(name, type)
        WHERE NOT EXISTS (SELECT 1 FROM income_categories LIMIT 1);
        """;

    private const string Sql002PasswordResetTokens = """
        CREATE TABLE IF NOT EXISTS password_reset_tokens (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          token_hash TEXT NOT NULL,
          expires_at TIMESTAMPTZ NOT NULL,
          used_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user ON password_reset_tokens(user_id);
        CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires ON password_reset_tokens(expires_at);
        """;

    private const string Sql003InvoiceTypePnlDefaults = """
        ALTER TABLE income ADD COLUMN IF NOT EXISTS invoice_type VARCHAR(50);
        DO $$ BEGIN
          ALTER TABLE income ADD CONSTRAINT valid_invoice_type CHECK (
            invoice_type IS NULL OR invoice_type IN ('standard', 'proforma', 'tax', 'credit_note', 'receipt')
          );
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$;

        CREATE TABLE IF NOT EXISTS pnl_distribution_defaults (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          pnl_center_id UUID NOT NULL REFERENCES pnl_centers(id) ON DELETE CASCADE,
          percentage DECIMAL(5, 2) NOT NULL,
          created_by UUID REFERENCES users(id) ON DELETE SET NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT valid_default_percentage CHECK (percentage > 0 AND percentage <= 100),
          CONSTRAINT unique_default_pnl UNIQUE(pnl_center_id)
        );
        CREATE INDEX IF NOT EXISTS idx_pnl_distribution_defaults_pnl_center ON pnl_distribution_defaults(pnl_center_id);

        CREATE OR REPLACE FUNCTION update_pnl_distribution_defaults_updated_at()
        RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = CURRENT_TIMESTAMP; RETURN NEW; END; $$ LANGUAGE plpgsql;
        DROP TRIGGER IF EXISTS trigger_update_pnl_distribution_defaults_updated_at ON pnl_distribution_defaults;
        CREATE TRIGGER trigger_update_pnl_distribution_defaults_updated_at BEFORE UPDATE ON pnl_distribution_defaults FOR EACH ROW EXECUTE FUNCTION update_pnl_distribution_defaults_updated_at();
        """;

    private const string Sql004LinkedInvoices = """
        ALTER TABLE income ADD COLUMN IF NOT EXISTS linked_proforma_id UUID REFERENCES income(id) ON DELETE SET NULL;
        ALTER TABLE income ADD COLUMN IF NOT EXISTS linked_tax_invoice_id UUID REFERENCES income(id) ON DELETE SET NULL;
        ALTER TABLE income ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb;
        """;

    private const string Sql005NotificationPreferences = """
        ALTER TABLE users ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{
          "emailOnRoleChange": true,
          "emailOnPasswordChange": true,
          "emailOnAccountStatusChange": true,
          "emailOnNewLogin": false
        }'::jsonb;
        """;

    private const string Sql006PipelineManagement = """
        CREATE TABLE IF NOT EXISTS clients (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(255) NOT NULL, company_name VARCHAR(255), email VARCHAR(255), phone VARCHAR(50),
          address TEXT, city VARCHAR(100), state VARCHAR(100), postal_code VARCHAR(20), country VARCHAR(100),
          website VARCHAR(255), notes TEXT, tags TEXT[], default_currency VARCHAR(3) DEFAULT 'USD',
          tax_id VARCHAR(50), payment_terms INTEGER DEFAULT 30,
          status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
          created_by UUID REFERENCES users(id) ON DELETE SET NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_clients_name ON clients(name);
        CREATE INDEX IF NOT EXISTS idx_clients_email ON clients(email);
        CREATE INDEX IF NOT EXISTS idx_clients_status ON clients(status);
        CREATE INDEX IF NOT EXISTS idx_clients_created_by ON clients(created_by);

        CREATE TABLE IF NOT EXISTS leads (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
          title VARCHAR(255) NOT NULL, description TEXT,
          contact_name VARCHAR(255), contact_email VARCHAR(255), contact_phone VARCHAR(50), company_name VARCHAR(255),
          source VARCHAR(50), estimated_value DECIMAL(15, 2), currency VARCHAR(3) DEFAULT 'USD',
          probability INTEGER DEFAULT 50 CHECK (probability >= 0 AND probability <= 100),
          status VARCHAR(30) DEFAULT 'new' CHECK (status IN ('new','contacted','qualified','proposal_sent','negotiation','won','lost','on_hold')),
          status_changed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          lost_reason TEXT, expected_close_date DATE, actual_close_date DATE,
          assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
          pnl_center_id UUID REFERENCES pnl_centers(id) ON DELETE SET NULL,
          notes TEXT,
          created_by UUID REFERENCES users(id) ON DELETE SET NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_leads_client_id ON leads(client_id);
        CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
        CREATE INDEX IF NOT EXISTS idx_leads_assigned_to ON leads(assigned_to);
        CREATE INDEX IF NOT EXISTS idx_leads_created_by ON leads(created_by);
        CREATE INDEX IF NOT EXISTS idx_leads_expected_close ON leads(expected_close_date);

        CREATE TABLE IF NOT EXISTS proposals (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
          client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
          proposal_number VARCHAR(50) UNIQUE NOT NULL, title VARCHAR(255) NOT NULL, description TEXT,
          issue_date DATE NOT NULL DEFAULT CURRENT_DATE, valid_until DATE,
          subtotal DECIMAL(15, 2) DEFAULT 0, tax_rate DECIMAL(5, 2) DEFAULT 0,
          tax_amount DECIMAL(15, 2) DEFAULT 0, discount_amount DECIMAL(15, 2) DEFAULT 0,
          total DECIMAL(15, 2) DEFAULT 0, currency VARCHAR(3) DEFAULT 'USD',
          status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft','sent','viewed','accepted','rejected','expired','converted')),
          status_changed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP, rejection_reason TEXT,
          converted_to_income_id UUID REFERENCES income(id) ON DELETE SET NULL, converted_at TIMESTAMP WITH TIME ZONE,
          terms TEXT, notes TEXT, document_url TEXT,
          created_by UUID REFERENCES users(id) ON DELETE SET NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_proposals_lead_id ON proposals(lead_id);
        CREATE INDEX IF NOT EXISTS idx_proposals_client_id ON proposals(client_id);
        CREATE INDEX IF NOT EXISTS idx_proposals_status ON proposals(status);
        CREATE INDEX IF NOT EXISTS idx_proposals_created_by ON proposals(created_by);
        CREATE INDEX IF NOT EXISTS idx_proposals_number ON proposals(proposal_number);

        CREATE TABLE IF NOT EXISTS proposal_items (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          proposal_id UUID NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
          description TEXT NOT NULL, quantity DECIMAL(10, 2) DEFAULT 1,
          unit_price DECIMAL(15, 2) NOT NULL, discount_percent DECIMAL(5, 2) DEFAULT 0,
          total DECIMAL(15, 2) NOT NULL, sort_order INTEGER DEFAULT 0,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_proposal_items_proposal ON proposal_items(proposal_id);

        CREATE TABLE IF NOT EXISTS lead_activities (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
          activity_type VARCHAR(30) NOT NULL CHECK (activity_type IN ('note','call','email','meeting','task','status_change','proposal_sent')),
          title VARCHAR(255), description TEXT,
          due_date TIMESTAMP WITH TIME ZONE, completed BOOLEAN DEFAULT FALSE, completed_at TIMESTAMP WITH TIME ZONE,
          created_by UUID REFERENCES users(id) ON DELETE SET NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_lead_activities_lead ON lead_activities(lead_id);
        CREATE INDEX IF NOT EXISTS idx_lead_activities_type ON lead_activities(activity_type);

        CREATE SEQUENCE IF NOT EXISTS proposal_number_seq START 1000;
        CREATE OR REPLACE FUNCTION generate_proposal_number()
        RETURNS TEXT AS $$
        DECLARE year_part TEXT; seq_num INTEGER;
        BEGIN
          year_part := to_char(CURRENT_DATE, 'YYYY');
          seq_num := nextval('proposal_number_seq');
          RETURN 'PROP-' || year_part || '-' || LPAD(seq_num::TEXT, 4, '0');
        END;
        $$ LANGUAGE plpgsql;
        """;

    private const string Sql006bPipelineTriggers = """
        CREATE OR REPLACE FUNCTION update_clients_updated_at()
        RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = CURRENT_TIMESTAMP; RETURN NEW; END; $$ LANGUAGE plpgsql;
        DROP TRIGGER IF EXISTS trigger_update_clients_updated_at ON clients;
        CREATE TRIGGER trigger_update_clients_updated_at BEFORE UPDATE ON clients FOR EACH ROW EXECUTE FUNCTION update_clients_updated_at();

        CREATE OR REPLACE FUNCTION update_leads_updated_at()
        RETURNS TRIGGER AS $$
        BEGIN NEW.updated_at = CURRENT_TIMESTAMP;
          IF NEW.status != OLD.status THEN NEW.status_changed_at = CURRENT_TIMESTAMP; END IF;
          RETURN NEW;
        END; $$ LANGUAGE plpgsql;
        DROP TRIGGER IF EXISTS trigger_update_leads_updated_at ON leads;
        CREATE TRIGGER trigger_update_leads_updated_at BEFORE UPDATE ON leads FOR EACH ROW EXECUTE FUNCTION update_leads_updated_at();

        CREATE OR REPLACE FUNCTION update_proposals_updated_at()
        RETURNS TRIGGER AS $$
        BEGIN NEW.updated_at = CURRENT_TIMESTAMP;
          IF NEW.status != OLD.status THEN NEW.status_changed_at = CURRENT_TIMESTAMP; END IF;
          RETURN NEW;
        END; $$ LANGUAGE plpgsql;
        DROP TRIGGER IF EXISTS trigger_update_proposals_updated_at ON proposals;
        CREATE TRIGGER trigger_update_proposals_updated_at BEFORE UPDATE ON proposals FOR EACH ROW EXECUTE FUNCTION update_proposals_updated_at();

        CREATE OR REPLACE FUNCTION update_proposal_items_updated_at()
        RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = CURRENT_TIMESTAMP; RETURN NEW; END; $$ LANGUAGE plpgsql;
        DROP TRIGGER IF EXISTS trigger_update_proposal_items_updated_at ON proposal_items;
        CREATE TRIGGER trigger_update_proposal_items_updated_at BEFORE UPDATE ON proposal_items FOR EACH ROW EXECUTE FUNCTION update_proposal_items_updated_at();
        """;

    private const string Sql007PipelineAttachments = """
        ALTER TABLE clients ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb;
        ALTER TABLE leads ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb;
        ALTER TABLE proposals ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb;
        """;

    private const string Sql008LeadSources = """
        CREATE TABLE IF NOT EXISTS lead_sources (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(100) NOT NULL UNIQUE,
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
        INSERT INTO lead_sources (name) VALUES
          ('Website'),('Referral'),('LinkedIn'),('Cold Call'),
          ('Trade Show'),('Email Campaign'),('Social Media'),('Partner'),('Other')
        ON CONFLICT (name) DO NOTHING;
        """;

    private const string Sql009IncomeExtraDates = """
        ALTER TABLE income ADD COLUMN IF NOT EXISTS proforma_invoice_date DATE;
        ALTER TABLE income ADD COLUMN IF NOT EXISTS tax_invoice_date DATE;
        CREATE INDEX IF NOT EXISTS idx_income_proforma_date ON income(proforma_invoice_date);
        CREATE INDEX IF NOT EXISTS idx_income_tax_invoice_date ON income(tax_invoice_date);
        """;

    private const string Sql010ContactPersonsClientEnrichment = """
        CREATE TABLE IF NOT EXISTS contact_persons (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
          name VARCHAR(255) NOT NULL,
          email VARCHAR(255),
          phone VARCHAR(50),
          role VARCHAR(100),
          linkedin_url VARCHAR(500),
          country VARCHAR(100),
          is_primary BOOLEAN DEFAULT FALSE,
          notes TEXT,
          created_by UUID REFERENCES users(id) ON DELETE SET NULL,
          created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_contact_persons_client ON contact_persons(client_id);

        CREATE OR REPLACE FUNCTION update_contact_persons_updated_at()
        RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = CURRENT_TIMESTAMP; RETURN NEW; END; $$ LANGUAGE plpgsql;
        DROP TRIGGER IF EXISTS trigger_update_contact_persons_updated_at ON contact_persons;
        CREATE TRIGGER trigger_update_contact_persons_updated_at BEFORE UPDATE ON contact_persons FOR EACH ROW EXECUTE FUNCTION update_contact_persons_updated_at();

        ALTER TABLE clients ADD COLUMN IF NOT EXISTS industry VARCHAR(100);
        ALTER TABLE clients ADD COLUMN IF NOT EXISTS business_type VARCHAR(50);
        ALTER TABLE clients ADD COLUMN IF NOT EXISTS utm_source VARCHAR(100);
        ALTER TABLE clients ADD COLUMN IF NOT EXISTS utm_medium VARCHAR(100);
        ALTER TABLE clients ADD COLUMN IF NOT EXISTS utm_campaign VARCHAR(100);
        """;

    private const string Sql011LeadsDealTerms = """
        ALTER TABLE leads ADD COLUMN IF NOT EXISTS deal_type VARCHAR(50);
        ALTER TABLE leads ADD COLUMN IF NOT EXISTS retainer_renewal_date DATE;
        ALTER TABLE leads ADD COLUMN IF NOT EXISTS follow_up_date DATE;
        ALTER TABLE leads ADD COLUMN IF NOT EXISTS scope_months INTEGER;
        ALTER TABLE leads ADD COLUMN IF NOT EXISTS min_commitment_months INTEGER;
        ALTER TABLE leads ADD COLUMN IF NOT EXISTS complimentary_hours DECIMAL(10,2);
        ALTER TABLE leads ADD COLUMN IF NOT EXISTS order_number VARCHAR(100);
        ALTER TABLE leads ADD COLUMN IF NOT EXISTS client_order_number VARCHAR(100);
        ALTER TABLE leads ADD COLUMN IF NOT EXISTS nda_url VARCHAR(500);
        """;

    private const string Sql012IncomeClientBilling = """
        ALTER TABLE income ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id) ON DELETE SET NULL;
        ALTER TABLE income ADD COLUMN IF NOT EXISTS billable_hours_regular DECIMAL(10,2);
        ALTER TABLE income ADD COLUMN IF NOT EXISTS billable_hours_150 DECIMAL(10,2);
        ALTER TABLE income ADD COLUMN IF NOT EXISTS billable_hours_200 DECIMAL(10,2);
        ALTER TABLE income ADD COLUMN IF NOT EXISTS hourly_rate_regular DECIMAL(15,2);
        ALTER TABLE income ADD COLUMN IF NOT EXISTS hourly_rate_150 DECIMAL(15,2);
        ALTER TABLE income ADD COLUMN IF NOT EXISTS hourly_rate_200 DECIMAL(15,2);
        ALTER TABLE income ADD COLUMN IF NOT EXISTS vat_applicable BOOLEAN DEFAULT FALSE;
        ALTER TABLE income ADD COLUMN IF NOT EXISTS vat_percentage DECIMAL(5,2);
        ALTER TABLE income ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50);
        CREATE INDEX IF NOT EXISTS idx_income_client_id ON income(client_id);
        """;

    // Split into 3 single-statement migrations — Npgsql requires one statement per ExecuteAsync call
    private const string Sql013aDropRoleConstraint =
        "ALTER TABLE users DROP CONSTRAINT IF EXISTS valid_role";

    private const string Sql013bAddOwnerToRoleConstraint =
        "ALTER TABLE users ADD CONSTRAINT valid_role CHECK (role IN ('admin', 'manager', 'viewer', 'owner'))";

    private const string Sql013cPromoteOwner =
        "UPDATE users SET role = 'owner', updated_at = NOW() WHERE LOWER(email) = 'ofer@hackerseye.com' AND role != 'owner'";

    private const string Sql014aIncomeContracts = """
        CREATE SEQUENCE IF NOT EXISTS contract_number_seq START 1000;

        CREATE OR REPLACE FUNCTION generate_contract_number()
        RETURNS TEXT AS $$
        DECLARE
          year_part TEXT;
          seq_num BIGINT;
        BEGIN
          year_part := to_char(CURRENT_DATE, 'YYYY');
          seq_num := nextval('contract_number_seq');
          RETURN 'CTR-' || year_part || '-' || LPAD(seq_num::TEXT, 4, '0');
        END;
        $$ LANGUAGE plpgsql;

        CREATE TABLE IF NOT EXISTS income_contracts (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          title VARCHAR(255) NOT NULL,
          contract_number VARCHAR(50) UNIQUE DEFAULT generate_contract_number(),
          contract_type VARCHAR(20) NOT NULL,
          status VARCHAR(30) NOT NULL DEFAULT 'active',
          client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
          client_name VARCHAR(255),
          proposal_id UUID REFERENCES proposals(id) ON DELETE SET NULL,
          category_id UUID REFERENCES income_categories(id) ON DELETE SET NULL,
          pnl_center_id UUID REFERENCES pnl_centers(id) ON DELETE SET NULL,
          currency VARCHAR(3) DEFAULT 'ILS',
          total_value DECIMAL(15,2) NOT NULL,
          vat_applicable BOOLEAN DEFAULT FALSE,
          vat_percentage DECIMAL(5,2),
          payment_terms_days INTEGER DEFAULT 30,
          start_date DATE,
          end_date DATE,
          retainer_monthly_amount DECIMAL(15,2),
          retainer_billing_day INTEGER,
          notes TEXT,
          tags TEXT[] DEFAULT '{}',
          created_by UUID REFERENCES users(id) ON DELETE SET NULL,
          created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT valid_contract_type CHECK (contract_type IN ('project','retainer')),
          CONSTRAINT valid_contract_status CHECK (status IN ('active','completed','cancelled','on_hold')),
          CONSTRAINT valid_billing_day CHECK (retainer_billing_day IS NULL OR (retainer_billing_day >= 1 AND retainer_billing_day <= 28))
        );
        CREATE INDEX IF NOT EXISTS idx_income_contracts_client ON income_contracts(client_id);
        CREATE INDEX IF NOT EXISTS idx_income_contracts_proposal ON income_contracts(proposal_id);
        CREATE INDEX IF NOT EXISTS idx_income_contracts_status ON income_contracts(status);
        CREATE INDEX IF NOT EXISTS idx_income_contracts_type ON income_contracts(contract_type);
        CREATE INDEX IF NOT EXISTS idx_income_contracts_created_by ON income_contracts(created_by)
        """;

    private const string Sql014bIncomeMilestones = """
        CREATE TABLE IF NOT EXISTS income_milestones (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          contract_id UUID NOT NULL REFERENCES income_contracts(id) ON DELETE CASCADE,
          sort_order INTEGER NOT NULL DEFAULT 0,
          description VARCHAR(500) NOT NULL,
          amount_due DECIMAL(15,2) NOT NULL,
          currency VARCHAR(3) DEFAULT 'ILS',
          due_date DATE NOT NULL,
          status VARCHAR(30) NOT NULL DEFAULT 'pending',
          proforma_invoice_number VARCHAR(100),
          proforma_invoice_date DATE,
          proforma_amount DECIMAL(15,2),
          tax_invoice_number VARCHAR(100),
          tax_invoice_date DATE,
          payment_received_date DATE,
          payment_method VARCHAR(50),
          actual_amount_paid DECIMAL(15,2),
          income_id UUID REFERENCES income(id) ON DELETE SET NULL,
          notes TEXT,
          created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT valid_milestone_status CHECK (status IN ('pending','proforma_issued','invoice_sent','paid','overdue')),
          CONSTRAINT positive_milestone_amount CHECK (amount_due > 0)
        );
        CREATE INDEX IF NOT EXISTS idx_income_milestones_contract ON income_milestones(contract_id);
        CREATE INDEX IF NOT EXISTS idx_income_milestones_due_date ON income_milestones(due_date);
        CREATE INDEX IF NOT EXISTS idx_income_milestones_status ON income_milestones(status);
        CREATE INDEX IF NOT EXISTS idx_income_milestones_income ON income_milestones(income_id)
        """;

    private const string Sql014cIncomeContractsTriggers = """
        CREATE OR REPLACE FUNCTION update_income_contracts_updated_at()
        RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = CURRENT_TIMESTAMP; RETURN NEW; END; $$ LANGUAGE plpgsql;
        DROP TRIGGER IF EXISTS trigger_update_income_contracts_updated_at ON income_contracts;
        CREATE TRIGGER trigger_update_income_contracts_updated_at
          BEFORE UPDATE ON income_contracts FOR EACH ROW
          EXECUTE FUNCTION update_income_contracts_updated_at();

        CREATE OR REPLACE FUNCTION update_income_milestones_updated_at()
        RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = CURRENT_TIMESTAMP; RETURN NEW; END; $$ LANGUAGE plpgsql;
        DROP TRIGGER IF EXISTS trigger_update_income_milestones_updated_at ON income_milestones;
        CREATE TRIGGER trigger_update_income_milestones_updated_at
          BEFORE UPDATE ON income_milestones FOR EACH ROW
          EXECUTE FUNCTION update_income_milestones_updated_at()
        """;

    private const string Sql014dProposalsContractColumn =
        "ALTER TABLE proposals ADD COLUMN IF NOT EXISTS converted_to_contract_id UUID REFERENCES income_contracts(id) ON DELETE SET NULL";

    private const string Sql015aContractAttachments =
        "ALTER TABLE income_contracts ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb";

    private const string Sql015bMilestoneAttachments =
        "ALTER TABLE income_milestones ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb";

    private const string Sql016ContractServiceType =
        "ALTER TABLE income_contracts ADD COLUMN IF NOT EXISTS service_type VARCHAR(100)";

    private const string Sql017DropdownOptions = """
        CREATE TABLE IF NOT EXISTS dropdown_options (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            category VARCHAR(100) NOT NULL,
            value VARCHAR(200) NOT NULL,
            label VARCHAR(200) NOT NULL,
            sort_order INT NOT NULL DEFAULT 0,
            is_active BOOLEAN NOT NULL DEFAULT TRUE,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            UNIQUE(category, value)
        );

        CREATE INDEX IF NOT EXISTS idx_dropdown_options_category ON dropdown_options(category);

        INSERT INTO dropdown_options (category, value, label, sort_order) VALUES
            ('service_type', 'penetration_test', 'Penetration Test', 1),
            ('service_type', 'risk_assessment', 'Risk Assessment', 2),
            ('service_type', 'incident_response', 'Incident Response', 3),
            ('service_type', 'soc', 'SOC', 4),
            ('service_type', 'compliance', 'Compliance', 5),
            ('service_type', 'vulnerability_assessment', 'Vulnerability Assessment', 6),
            ('service_type', 'training', 'Training', 7),
            ('service_type', 'other', 'Other', 8),
            ('payment_method', 'bank_transfer', 'Bank Transfer', 1),
            ('payment_method', 'credit_card', 'Credit Card', 2),
            ('payment_method', 'check', 'Check', 3),
            ('payment_method', 'cash', 'Cash', 4),
            ('payment_method', 'paypal', 'PayPal', 5),
            ('payment_method', 'other', 'Other', 6),
            ('contract_type', 'project', 'Project', 1),
            ('contract_type', 'retainer', 'Retainer', 2),
            ('lead_status', 'new', 'New', 1),
            ('lead_status', 'contacted', 'Contacted', 2),
            ('lead_status', 'qualified', 'Qualified', 3),
            ('lead_status', 'proposal_sent', 'Proposal Sent', 4),
            ('lead_status', 'negotiation', 'Negotiation', 5),
            ('lead_status', 'won', 'Won', 6),
            ('lead_status', 'lost', 'Lost', 7)
        ON CONFLICT (category, value) DO NOTHING;
        """;

    private const string Sql018BackfillClientIds = """
        UPDATE income i
        SET client_id = c.id
        FROM clients c
        WHERE i.client_id IS NULL
          AND i.client_name IS NOT NULL
          AND (LOWER(TRIM(i.client_name)) = LOWER(TRIM(c.name))
               OR LOWER(TRIM(i.client_name)) = LOWER(TRIM(COALESCE(c.company_name, ''))));
        """;

    private const string Sql019CreateClientsFromIncome = """
        -- Insert a client record for every distinct income client_name that has no matching client yet
        INSERT INTO clients (name, status)
        SELECT DISTINCT TRIM(i.client_name), 'active'
        FROM income i
        WHERE i.client_name IS NOT NULL
          AND TRIM(i.client_name) <> ''
          AND NOT EXISTS (
              SELECT 1 FROM clients c
              WHERE LOWER(TRIM(c.name)) = LOWER(TRIM(i.client_name))
                 OR LOWER(TRIM(COALESCE(c.company_name, ''))) = LOWER(TRIM(i.client_name))
          );

        -- Now link those newly created clients back to the income rows
        UPDATE income i
        SET client_id = c.id
        FROM clients c
        WHERE i.client_id IS NULL
          AND i.client_name IS NOT NULL
          AND (LOWER(TRIM(i.client_name)) = LOWER(TRIM(c.name))
               OR LOWER(TRIM(i.client_name)) = LOWER(TRIM(COALESCE(c.company_name, ''))));
        """;

    #endregion
}
