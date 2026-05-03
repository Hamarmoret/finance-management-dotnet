# Finance Management - .NET

## Project Overview
Full-stack financial management web app with expense/income tracking, P&L centers, pipeline management (leads, clients, proposals), analytics, and business planning.

## Repository
- **GitHub**: https://github.com/Hamarmoret/finance-management-dotnet

## Deployed URLs
- **Backend**: https://finance-backend-dotnet-233195483413.me-west1.run.app
- **Frontend**: https://finance-frontend-dotnet-233195483413.me-west1.run.app
- **API base**: `https://finance-backend-dotnet-233195483413.me-west1.run.app/api`

## Tech Stack
- **Backend**: .NET 10, ASP.NET Core, Dapper (micro-ORM), PostgreSQL (Supabase), Serilog
- **Frontend**: React 18, TypeScript, Vite, TailwindCSS, Zustand, React Query, Recharts
- **Auth**: JWT (HS256) + refresh tokens + MFA (TOTP) + Argon2id password hashing
- **Storage**: Google Cloud Storage (`finance-management-uploads` bucket)
- **Email**: Gmail SMTP via `ofer.rosenbloom@gmail.com`
- **Infra**: Docker + Google Cloud Build + Cloud Run (region: me-west1)

## Project Structure
```
Finance-Management-dotnet/
├── backend/FinanceManagement.Api/
│   ├── Config/           # EnvironmentConfig, AppSettings
│   ├── Controllers/      # 17 controllers (includes ReportsController)
│   ├── Database/         # DbContext.cs, MigrationRunner.cs (23 migrations)
│   ├── Middleware/        # AuthMiddleware, ErrorHandlingMiddleware
│   ├── Models/           # DTOs grouped by domain
│   ├── Services/         # 17 services + Reports/ (ReportsService, AiSummaryService, ReportPdfBuilder, LinuxFontResolver)
│   └── FinanceManagement.Api.csproj
├── frontend/
│   ├── src/
│   │   ├── components/   # DataTable, FileUpload, RecurringToggle, PeriodSelector,
│   │   │                 # ClientAutocomplete, VendorAutocomplete, layouts
│   │   ├── pages/        # auth, analytics, dashboard, expenses, income,
│   │   │                 # pnl-centers, settings, business-plan, sales, reports
│   │   ├── services/     # api.ts (Axios client), currencyService.ts
│   │   ├── stores/       # authStore.ts, dataStore.ts (Zustand)
│   │   ├── shared/       # types.ts
│   │   └── utils/        # formatters.ts
│   └── package.json
├── Dockerfile.backend      # Includes fonts-liberation for PdfSharp on Linux
├── Dockerfile.frontend
├── cloudbuild-backend.yaml
├── cloudbuild-frontend.yaml
└── env.yaml              # Production env vars (deployed to Cloud Run)
```

## Local Development

### Backend
```bash
cd backend/FinanceManagement.Api
dotnet run
# Runs on http://localhost:5000 (or https://localhost:7000)
```

### Frontend
```bash
cd frontend
npm install
npm run dev
# Runs on http://localhost:5173
```

Frontend scripts: `dev`, `build`, `preview`, `lint`, `lint:fix`, `test`, `test:coverage`

## Database
- **Provider**: PostgreSQL via Supabase
- **Host**: `db.ogfjdysvqceshqjzijae.supabase.co:5432`
- **ORM**: Dapper (raw SQL, no EF Core)
- **Migrations**: Auto-run on startup via `MigrationRunner.cs` (23 migrations, 001–023)
- **SQL placeholders**: `@ParamName` style (Dapper/Npgsql convention)
- **Fatal migration failure**: `Environment.Exit(1)` on outer catch so Cloud Run stays on previous healthy revision

### Schema (key tables)
- `users` — auth, MFA, lockout tracking
- `sessions` — refresh tokens, device info
- `pnl_centers`, `expenses`, `income` — core financial data
- `leads`, `clients`, `proposals`, `attachments` — pipeline
- `contact_persons` — contacts linked to clients
- `income_contracts`, `income_milestones` — contract billing (status includes `partially_paid`)
- `vendors` — payees (vendor/employee/other); `idx_vendors_name_lower` unique index on LOWER(TRIM(name))
- `business_plans` — with drivers & cost categories
- `audit_logs` — compliance trail
- `password_reset_tokens`

## Authentication Flow
1. Login → returns `accessToken` (30min) + `refreshToken` (stored in DB)
2. Auth middleware validates JWT on protected routes
3. MFA: TOTP-based, optional per user
4. Max 10 concurrent sessions per user
5. Argon2id for password hashing (upgraded from BCrypt)

## Controllers & Services
| Domain | Controller | Service |
|--------|-----------|---------|
| Auth | AuthController | AuthService, PasswordResetService |
| Users | UsersController | UsersService |
| P&L | PnlCentersController | PnlCentersService |
| Expenses | ExpensesController | ExpensesService |
| Income | IncomeController, IncomeContractsController | IncomeService, IncomeContractsService |
| Pipeline | ClientsController, LeadsController, ProposalsController | ClientsService, LeadsService, ProposalsService |
| Contacts | ContactPersonsController | ContactPersonsService |
| Vendors | VendorsController | VendorsService |
| Analytics | AnalyticsController | AnalyticsService |
| Audit | AuditLogsController | AuditLogsService |
| Business Plans | BusinessPlansController | BusinessPlansService |
| Files | UploadsController | UploadsService (GCS) |
| CSV | CsvImportController | CsvImportService |
| Reports | ReportsController | ReportsService, AiSummaryService, ReportPdfBuilder |

## Deployment

### Automatic (normal workflow)
Push to `master` on GitHub → Cloud Build triggers fire → build Docker images → deploy to Cloud Run automatically.
Both `cloudbuild-frontend.yaml` and `cloudbuild-backend.yaml` include the `gcloud run deploy` step.

#### Cloud Build Triggers (region: me-west1)
| Trigger name | Config file | Branch |
|---|---|---|
| `deploy-frontend-on-push` | `cloudbuild-frontend.yaml` | `^master$` |
| `deploy-backend-on-push` | `cloudbuild-backend.yaml` | `^master$` |

Both use **Cloud Build repositories (1st gen)**, repo `Hamarmoret/finance-management-dotnet` (GitHub App), service account `233195483413-compute@developer.gserviceaccount.com`.

**If triggers stop firing:** check Cloud Build → Triggers (region me-west1). Common causes:
- Trigger deleted or disabled → recreate using the table above
- Wrong `filename` in trigger config → must match exactly (`cloudbuild-frontend.yaml` / `cloudbuild-backend.yaml`)
- GitHub App authorization expired → GitHub repo Settings → Integrations → Google Cloud Build → reconfigure
- Manual fallback: `gcloud builds submit --config cloudbuild-backend.yaml` (run from repo root after `gcloud auth login`)

### Manual (if needed)
```bash
# Must be run from the repo root (where the yaml files live)
# Frontend
gcloud builds submit --config cloudbuild-frontend.yaml

# Backend
gcloud builds submit --config cloudbuild-backend.yaml
```

### Rollback
Cloud Run keeps all previous revisions. Roll back via:
- **Cloud Console**: Cloud Run → service → Revisions tab → route 100% traffic to previous revision
- **CLI**: `gcloud run services update-traffic finance-frontend-dotnet --to-revisions=REVISION_NAME=100 --region me-west1`

## Environment Variables (env.yaml)
| Variable | Purpose |
|----------|---------|
| `DATABASE_HOST/PORT/NAME/USER/PASSWORD/SSL` | Supabase PostgreSQL |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | JWT signing |
| `JWT_ACCESS_EXPIRATION` | `30m` |
| `ENCRYPTION_KEY` | Sensitive field encryption (32 chars) |
| `GCS_BUCKET` | `finance-management-uploads` |
| `GMAIL_USER` / `GMAIL_APP_PASSWORD` | Email sending |
| `CORS_ORIGIN` / `FRONTEND_URL` | Frontend URL for CORS & links |
| `MAX_CONCURRENT_SESSIONS` | `10` |
| `GEMINI_API_KEY` | Google Gemini API key (optional — reports still render without AI) |
| `GEMINI_MODEL` | Gemini model override (default: `gemini-2.5-flash`) |

## Dark Mode
Implemented via Tailwind `darkMode: 'class'`. The `.dark` class is added to `<html>` by an inline script in `index.html` (reads from `localStorage.getItem('theme')` or system preference). The toggle lives in `DashboardLayout.tsx` (`useDarkMode` hook).

### Key Dark Mode Files Touched
- `index.html` — inline init script (add `.dark` to `<html>` before React mounts)
- `index.css` — `.panel`, `.card`, `.dropdown-menu`, `.modal-box`, `.modal-header` all have `dark:` variants
- `DashboardLayout.tsx` — `useDarkMode()` hook; sidebar always dark (`bg-[#1a2942]`)
- `Dashboard.tsx` — SummaryCards, Recharts chart (uses `isDark` local variable for SVG colors)
- `BusinessPlan.tsx` — dark mode classes + multiple null-safety fixes (see gotchas)
- `PnlCenters.tsx` — summary cards use `.panel` utility
- `PnlCenterDetail.tsx` — `<Link>` (not `<a href>`) to avoid page reloads
- `DateRangeFilter.tsx` — dark mode on trigger button, dropdown, presets
- `components/ErrorBoundary.tsx` — new file, wraps BusinessPlan route in `App.tsx`

### Known Dark Mode Gotchas
- Recharts doesn't support Tailwind — use `isDark = document.documentElement.classList.contains('dark')` and pass hex colors conditionally
- `text-success-600` / `text-danger-600` have no dark variants in config (only 50/500/600/700 exist) — use `dark:text-success-500` / `dark:text-danger-500` for bright-on-dark contrast
- `danger-400` and `danger-900` do NOT exist in the Tailwind config — ErrorBoundary uses them but they silently no-op in production

### BusinessPlan Null-Safety Issues (Recurring)
The `/business-plans/:id/with-engine` and `/business-plans/:id/actuals` endpoints can return null arrays. Always guard with:
- `planWithEngine?.drivers?.filter(...) ?? []` (double optional chain, not single)
- `Array.isArray(data) ? data : []` for `actualsComparison` (not just `?? []`)
- Render: `const safeActuals = Array.isArray(actualsComparison) ? actualsComparison : [];`

### Auth Race Condition (Fixed)
`scheduleTokenRefresh()` used to set a timer with delay=0 for already-expired tokens, racing with the 401 interceptor → both called `/auth/refresh` simultaneously → logout. Fix: return early in `scheduleTokenRefresh` if `timeUntilExpiry <= 2 * 60 * 1000`. Also: `fetchUser()` now only clears auth on HTTP 401, not on network errors.

## Meta: Keeping This File Updated
At the end of each session, update this file with:
- Any new files, services, or controllers added
- Changes to URLs, environment variables, or config
- Current work-in-progress and what was last worked on
- Any new gotchas or known/repeating issues discovered

## Key Conventions
- API responses use `ApiResponse<T>` wrapper (success/error)
- All mutations are logged in `audit_logs`
- FluentValidation for request validation
- Serilog for structured logging
- `ErrorHandlingMiddleware` catches unhandled exceptions globally
- Frontend uses React Query for server state, Zustand for auth state
- Form handling: react-hook-form + Zod schemas

## Sales / Pipeline Module (Phase 1 — Frontend Complete)

New `/sales` page (tabbed, mirrors Settings pattern) with 3 tabs:

### New Files
- `frontend/src/pages/sales/Sales.tsx` — shell with Clients/Leads/Proposals tabs
- `frontend/src/pages/sales/components/ClientsTab.tsx` — client list, search, status filter
- `frontend/src/pages/sales/components/ClientModal.tsx` — create/edit client form (collapsible address section)
- `frontend/src/pages/sales/components/ClientDetailDrawer.tsx` — right-side drawer: Overview, Income, Proposals, Leads tabs (fetches related data in parallel on open)
- `frontend/src/pages/sales/components/LeadsTab.tsx` — lead list, status chip filters, probability bar, pipeline value stats
- `frontend/src/pages/sales/components/LeadModal.tsx` — 2-tab modal: Details (form) + Activities (list + add form); activities disabled for new leads
- `frontend/src/pages/sales/components/ProposalsTab.tsx` — proposal list, status chips, conversion rate stat
- `frontend/src/pages/sales/components/ProposalModal.tsx` — header + dynamic line items with live total calculation

### Types Added to `@finance/shared`
`Client`, `ClientStatus`, `Lead`, `LeadStatus`, `LeadActivity`, `LeadActivityType`, `Proposal`, `ProposalStatus`, `ProposalItem`

### Navigation
- `DashboardLayout.tsx` — "Sales" nav item (Briefcase icon) between P&L Centers and Business Plan
- `App.tsx` — `<Route path="sales" element={<Sales />} />`

### Integration
- ClientDetailDrawer fetches `/income?clientName=`, `/proposals?clientId=`, `/leads?clientId=` in parallel
- LeadModal auto-fills companyName from selected client
- ProposalModal filters leads by selected client; auto-sets clientId from selected lead

### Phase 2 — Data Model Enrichment (Complete)

#### New DB Migrations (010-012)
- **010**: `contact_persons` table + client enrichment columns (industry, business_type, utm_source/medium/campaign)
- **011**: Leads deal terms (deal_type, retainer_renewal_date, follow_up_date, scope_months, min_commitment_months, complimentary_hours, order_number, client_order_number, nda_url)
- **012**: Income enrichment (client_id UUID FK → clients, billable_hours_regular/150/200, hourly_rate_regular/150/200, vat_applicable, vat_percentage, payment_method)

#### New Backend Files
- `backend/.../Services/Pipeline/ContactPersonsService.cs` — DTOs + service (GetByClientId, Create, Update, Delete)
- `backend/.../Controllers/ContactPersonsController.cs` — `GET /api/clients/{id}/contacts`, `POST /api/clients/{id}/contacts`, `PUT /api/contacts/{id}`, `DELETE /api/contacts/{id}`

#### Extended Backend Services
- `ClientsService.cs` — added industry, businessType, utmSource, utmMedium, utmCampaign to Dto/Request/Entity/INSERT/UPDATE
- `LeadsService.cs` — added 9 deal terms fields to Dto/Request/Entity/INSERT/UPDATE
- `IncomeService.cs` — added clientId FK + 9 billing/VAT fields to Dto/Request/DbRow/INSERT/UPDATE/MapIncome

#### New Frontend Files
- `frontend/src/components/ClientAutocomplete.tsx` — debounced typeahead, calls `GET /api/clients?search=`, sets both clientId + clientName on select (backwards-compatible with free-text)

#### Extended Frontend Files
- `frontend/src/shared/types.ts` — added fields to `Client`, `Lead`, `Income`; added `ContactPerson` interface
- `frontend/src/pages/sales/components/ClientModal.tsx` — 3-tab modal: Details (original) + Contacts (add/delete contact_persons) + Industry & Attribution (industry, businessType, UTM fields)
- `frontend/src/pages/sales/components/LeadModal.tsx` — added "Deal Terms" tab (3rd tab) with all 9 deal terms fields
- `frontend/src/pages/income/components/IncomeModal.tsx` — replaced clientName text input with ClientAutocomplete, added Payment Method select, VAT toggle+%, Billable Hours collapsible section (6 fields)

### Phase 3 — CSV Import Extensions (Complete)

Extended all CSV importers to accept Phase 2 new columns:

- **Income import** (`CsvImportService.cs`): added `payment_method`, `vat_applicable`, `vat_percentage`, `billable_hours_regular/150/200`, `hourly_rate_regular/150/200`. Template updated with 22 columns.
- **Clients import** (`CsvImportController.cs`): added `industry`, `business_type`, `utm_source`, `utm_medium`, `utm_campaign`. Template updated with 15 columns.
- **Leads import** (`CsvImportController.cs`): added all 9 deal terms fields (`deal_type`, `order_number`, `client_order_number`, `scope_months`, `min_commitment_months`, `complimentary_hours`, `retainer_renewal_date`, `follow_up_date`, `nda_url`). Template updated with 21 columns.

## UI Fixes & Period Selector (Latest Session)

### Currency Spacing Fix
- `frontend/src/utils/formatters.ts` — changed locale from `en-GB` to `en-US` + `currencyDisplay: 'narrowSymbol'`. Now shows `$1,000` instead of `US$1,000`. Applies to all pages using `formatCurrency`/`formatCurrencyPrecise`.

### Dark Mode Fixes
- `RecurringToggle/RecurringToggle.tsx` — added `dark:` variants to all labels, inputs, selects, pattern editor background, summary box
- `FileUpload/FileUpload.tsx` — added `dark:` variants to drop zone, file rows, icon backgrounds, text
- `Analytics.tsx` — added `dark:text-white` to Total Expenses value (was `text-gray-900` only)
- `ExpenseModal` dark mode was already addressed via RecurringToggle + FileUpload component fixes

### Dashboard Improvements
- Period selector (`1M/3M/6M/1Y/All + Custom`) in header filters summary cards, chart, and recent transactions
- Transaction rows are now clickable — opens a detail popup with amount, date, category, description, P&L center, client/vendor, invoice status badge
- Removed misleading "View all transactions" link (was pointing only to `/expenses`)
- Default period: last 6 months

### Reusable PeriodSelector Component
**New file: `frontend/src/components/PeriodSelector.tsx`**
- Props: `startDate`, `endDate`, `onChange(s, e)`, `className`
- Preset buttons: 1M / 3M / 6M / 1Y / All
- Custom button: reveals two date pickers (start + end), pre-filled with current dates
- Exported `getPeriodLabel(startDate, endDate)` — returns human-readable string for page subtitles
- Internal `customMode` state so clicking Custom always shows inputs even if dates match a preset

Used in: Dashboard, Expenses, Income, P&L Centers, Sales (Leads + Proposals tabs)

### Period Filtering — Backend Extensions
- `PnlCentersService.GetAllAsync` + `PnlCentersController` — added optional `startDate`/`endDate` query params; filters income/expense allocations by date in SQL
- `ProposalsService.GetAllAsync` + `ProposalsController` — added optional `startDate`/`endDate` query params; filters by `issue_date`
- `LeadsController` already supported `startDate`/`endDate` — no change needed

### Expenses & Income Pages
- Period selector now in the page header (replaces the Start/End Date fields that were in the expanded filters panel)
- Page subtitle shows active period label
- Filter panel retained for Category, P&L Center, Status (Income only)

---

## Vendors / Payees Module (Complete)

### DB Migrations (020a–022)
- **020a**: `vendors` table (id, name, payee_type, email, phone, address, city, country, tax_id, notes, status, created_by, timestamps)
- **020b**: `update_vendors_updated_at` trigger
- **020c**: `expenses.vendor_id UUID FK → vendors(id)`
- **020d**: Backfill vendor records from distinct `expenses.vendor` strings
- **020e**: Link `expenses.vendor_id` to backfilled vendor rows
- **021**: Invalidate Argon2-hashed password reset tokens (now SHA-256)
- **022**: `CREATE UNIQUE INDEX idx_vendors_name_lower ON vendors (LOWER(TRIM(name)))` — required for upsert

### Backend
- **`VendorsService.cs`** — full CRUD + `GetOrCreateVendorAsync` (atomic `INSERT ... ON CONFLICT DO UPDATE ... RETURNING id`)
- **`VendorsController.cs`** — `GET/POST/PUT/DELETE /api/vendors`
- **`ExpensesService.cs`** — `vendor_id` in INSERT/UPDATE, JOIN vendors in SELECT (COALESCE vendor name)

### Frontend
- **`VendorAutocomplete.tsx`** — debounced search → `GET /vendors?search=`, "Create new" option when no match
- **`VendorModal.tsx`** — create/edit payee (Name, Type, Email, Phone, Tax ID, City/Country, Address, Notes, Status)
- **`PayeesTab.tsx`** in Sales page — search + type filter + table + pagination
- **`Sales.tsx`** — added Payees and Contacts tabs
- **`ExpenseModal.tsx`** — replaced vendor text input with `VendorAutocomplete` (required)

### Inline Create Flow
- Typing unknown name in autocomplete → "Create 'X' as new payee/client" option
- Clicking opens modal pre-filled with name → on save, auto-selects result in parent form
- Both `ClientAutocomplete` and `VendorAutocomplete` support this via `onCreateNew` prop

---

## Security Audit Remediations (12 fixes, all committed)

- **`GetRequiredUserId()` extension** on `HttpContext` — returns `Guid`, throws `AppException(401)` on null/malformed claim. Replaced all 53 instances of `Guid.Parse(GetUserId()!)` across all 15 controllers.
- **`EmailService.cs`** — `using var message = new MailMessage(...)` prevents dispose-on-exception leak
- **`UploadsService.cs`** — GCS `GoogleCredential` cached with `SemaphoreSlim` + 10s timeout (was fetched per-request); `DeleteFileAsync` catches all `GoogleApiException` not only 404
- **`ExpensesService.cs`** — `TryParse` guards on all date/categoryId/Guid filter params (was `Guid.Parse` / `DateTime.Parse` → 500 on bad input)
- **`AnalyticsService.cs`** — same `TryParse` guards on pnlCenterId
- **`AuthService.cs`** `RefreshAsync` — combined null+TryParse check for userId claim
- **`Program.cs`** — migration failure → `Log.Fatal` + `Environment.Exit(1)` (was `Log.Error`, app started with broken schema)
- **Frontend**: `AbortController` pattern in `Expenses.tsx`, `Income.tsx`, `BusinessPlan.tsx`, `ClientDetailDrawer.tsx` — cancels in-flight requests on unmount/filter change; guards `CanceledError`

---

## SRE Stability & Data Consistency Fixes (all committed)

### Backend Transactions & Race Conditions
| Race | Fix |
|------|-----|
| `RegisterAsync` email duplicate | INSERT first, catch `23505` unique violation — no SELECT-then-INSERT window |
| `RegisterAsync` first-admin | COUNT inside same transaction as INSERT |
| `LoginAsync` max-sessions | COUNT + DELETE-oldest + INSERT wrapped in one transaction |
| `UpdateRoleAsync` last-admin demotion | Serializable-isolation transaction wraps count + UPDATE |
| `ToggleActiveAsync` last-admin deactivation | Serializable-isolation transaction |
| `DeleteAsync` (UsersService) | All 4 DELETEs (perms, sessions, audit, user) in one transaction |
| `GetOrCreateVendorAsync` vendor duplicate | `INSERT ... ON CONFLICT (LOWER(TRIM(name))) DO UPDATE SET updated_at = vendors.updated_at RETURNING id` |
| `ExpensesService.DeleteAsync` audit atomicity | fetch-info + DELETE + audit log in one transaction |

### Frontend: Cross-Component State Sync
- **`stores/dataStore.ts`** — new Zustand store: `version: number` + `bump()`. Acts as a global mutation bus.
- **`Expenses.tsx` / `Income.tsx`** — call `bump()` after every save and delete
- **`Dashboard.tsx`** — added `version` to `useEffect` deps → auto-refetches when any mutation fires
- **`ClientDetailDrawer.tsx`** — added `version` to `useEffect` deps → keeps drawer in sync with mutations
- **`LeadsTab.tsx`** `handleDelete` — `await Promise.all([fetchLeads(), fetchCounts()])` + `bump()`

### Known Gotchas
- `Income` type does NOT have `attachments` (only `Expense` does) — don't try to init from `income.attachments`
- `GetOrCreateVendorAsync` requires migration 022 (`idx_vendors_name_lower`) to be applied before the `ON CONFLICT` clause works
- `UsersService` admin-quorum operations use `IsolationLevel.Serializable` — PostgreSQL may return serialization errors under high concurrency; callers should handle `23P01` and retry if needed

---

## Clickable Stats & Drill-Down (Complete)

Dashboard, P&L Centers, and Contracts pages all have clickable aggregate stat cards:

- **Dashboard** — Total Income / Total Expenses (opens sorted list modal), Pending Invoices card (opens pending list), "X overdue" text (opens overdue list). Each list row opens `TransactionDetailModal`. Implemented via `DashboardListModal` + `DrillDownModal`.
- **P&L Centers** — Total Income / Total Expenses → `DrillDownModal` fetching actual income/expense records for the period; Net Profit card also clickable (shows all).
- **Contracts** — Overdue stat → `MilestoneListModal` (fetches from `/alerts/overdue`); Outstanding stat → `MilestoneListModal` (fetches from `/alerts/outstanding`); Collected stat → `MilestoneListModal` (fetches from `/alerts/paid`); Total Value → contract list modal.

### Key Components
- `frontend/src/pages/analytics/components/DrillDownModal.tsx` — reusable drill-down list modal (used by Dashboard and P&L Centers)
- `frontend/src/pages/income/components/MilestoneListModal.tsx` — reusable milestone list modal (used by Contracts page)

---

## P&L Report Page (Complete)

New page at `/profit-loss` with "P&L Report" nav item (FileBarChart2 icon).

- **File**: `frontend/src/pages/profit-loss/ProfitLoss.tsx`
- **Default period**: current year Jan 1 → today
- **GroupBy toggle**: Monthly / Quarterly
- **6 summary cards**: Revenue (accrual), Collected, Outstanding, Expenses, Net P&L, Net Cash
- **Breakdown table**: period rows + bold totals footer row
- **Collapsible category tables**: Revenue by Category (Revenue/Collected/Outstanding), Expenses by Category (Amount/%)
- **Accrual rules**: `draft` and `cancelled` income excluded from Revenue; Collected = `invoiceStatus==='paid'` OR `paymentReceivedDate` set

---

## Reports Page (Complete, by separate session)

New `/reports` page with PDF generation, AI summaries (Google Gemini), and templated + custom report modes.

### Backend
- **`ReportsService.cs`** — data collection (income, expenses, P&L centers, contracts, leads)
- **`ReportPdfBuilder.cs`** — PdfSharp/MigraDoc PDF rendering with `LinuxFontResolver`
- **`AiSummaryService.cs`** — Google Gemini API integration for narrative summaries
- **`ReportsController.cs`** — `POST /api/reports/generate` (returns PDF stream)
- **`LinuxFontResolver.cs`** — fixes PdfSharp font crash on Linux/Cloud Run
- Migration 023: `audit_logs` reports entry

### Frontend
- `frontend/src/pages/reports/Reports.tsx` — main page (templated + AI custom modes)
- `frontend/src/pages/reports/components/TemplatePicker.tsx` — period + template selection
- `frontend/src/pages/reports/components/AiCustomForm.tsx` — free-text prompt input
- `frontend/src/pages/reports/components/ReportPreview.tsx` — PDF preview + download

### Env Vars
- `ANTHROPIC_API_KEY` — required for AI summaries (falls back gracefully if missing)
- Gemini model used: `gemini-2.5-pro-exp-03-25`

### Known Gotchas (Reports)
- Gemini returns a "thinking" part before the text response — `AiSummaryService` must skip parts where `Part.Text == null` to avoid null parse errors
- PdfSharp requires `LinuxFontResolver` on Cloud Run; must be registered before any PDF rendering
- The `/reports/generate` endpoint streams a PDF; frontend uses `URL.createObjectURL` + iframe for preview

---

## Expense Payment Tracking (Complete, by separate session)

Migration 024 adds `due_date`, `payment_status`, `payment_date` columns to `expenses`.

- Existing expenses default to `payment_status = 'paid'` (backward-compatible)
- New "Payment pending" checkbox in `ExpenseModal` reveals `due_date` field
- `ExpenseTable` shows Paid/Unpaid/Overdue status badges; mark-as-paid action button
- `Expenses.tsx` filter dropdown for payment status
- Backend: `GET /expenses?paymentStatus=overdue` filter, `POST /expenses/:id/mark-paid`

---

## Income Contract Enhancements (Complete, by separate session)

- **Partial payments** on milestones: `paid_amount` column, `POST /income-milestones/:id/partial-payment`
- **Milestone alerts** endpoints: `/income-contracts/alerts/outstanding` and `/income-contracts/alerts/paid`
- `MilestoneRow.tsx` shows partial payment progress bar
- `MarkPaidModal.tsx` updated with partial amount input

---

## Income Contracts Module — Recent Enhancements

### Milestone amount validation (front + back)
- `IncomeContractsService.CreateMilestoneAsync` / `UpdateMilestoneAsync` — sum existing milestones and reject if total would exceed `contract.total_value`
- `ContractDetailView.tsx` — shows remaining contract amount and blocks save when a new milestone would exceed it
- `MilestoneRow.tsx` — explicit edit mode toggled by a pencil button so editable fields are visibly highlighted; save semantics unchanged (still saves on blur)

### Unmark-paid + post-create file upload
- `POST /income-contracts/milestones/{id}/unmark-paid` — atomically deletes the linked income record and resets the milestone status (pending or overdue based on `due_date`) in one transaction
- `MilestoneRow.tsx` — RotateCcw "Revert payment" button on paid milestone rows with confirmation prompt
- `ContractModal.tsx` — after creating a new contract, shows a `DocumentsPanel` step (contract / proposal / other) so the approved proposal can be attached immediately before `onSaved` fires

### Duplicate contract flow
- `POST /income-contracts/{id}/duplicate` (already in controller at line 112) — paired with `DuplicateContractModal.tsx` on the frontend
- `ContractDetailView.tsx` — calls `onDuplicated` so the parent list refreshes and the new contract opens in detail view

### Contracts list — list view toggle + grid view
- `ContractsList.tsx` — Grid/List toggle persisted in `localStorage` (key `contractsViewMode`); list mode shows compact table with type badge, status, value, collected %, and alert indicators

### P&L Center selector in contract form
- `IncomeContractsService` accepts `pnl_center_id`; the contract form (`ContractModal.tsx`) has a P&L center select. The earlier "contact P&L field" idea was reverted in favour of putting it on the contract itself.

### P&L Center detail modal — Summary / Income / Expenses tabs
- `PnlCenterDetail.tsx` — three tabs; Income and Expenses tabs show up to 100 records with totals broken down by currency, date, category, client/vendor

---

## Analytics — Drill-Down + Widget Manager

- `frontend/src/pages/analytics/components/DrillDownModal.tsx` — generic transaction drill-down modal. Props: `{ title, subtitle?, items: DrillDownItem[], onClose }`. `DrillDownItem` shape: `{ id, date, description, amount, currency, category, vendorOrClient, type: 'income'|'expense', notes?, invoiceStatus?, pnlCenters? }`. Sortable date column, expandable per-row detail, sticky summary bar (income / expenses / net), mixed-type aware, dark-mode ready.
- `Analytics.tsx` — wires 5 chart-click handlers (`onPointClick` / `onCategoryClick`) into `DrillDownModal`.
- Widget manager + chart/table toggle on each analytics widget — settings persisted per user.

---

## Multi-Currency & Mark-as-Paid Enhancements

- `currencyService.ts` — `convertTotals(totalsByCurrency, target)` uses live exchange rates so dashboard summary cards can render in any chosen display currency.
- Profile setting + `getPreferredCurrency()` / `setPreferredCurrency()` for the user's default display currency.
- Mark-paid modal on milestones now collects invoice number / payment method / payment date and writes them through to the linked income record.

---

## Clickable Stat Cards (Drill-Down Everywhere)

Stat cards across the app are clickable and open a drill-down modal showing the underlying records.

### Reusable building blocks
- `frontend/src/pages/analytics/components/DrillDownModal.tsx` — generic transaction-style drill-down (see Analytics section above). Reused unchanged.
- `frontend/src/pages/income/components/MilestoneListModal.tsx` — extracted from the original inline `OverdueModal` in `ContractsList.tsx` and parameterized. Props: `{ title, icon, accent: 'danger'|'warning'|'success'|'primary', fetchUrl, emptyMessage, onClose, onOpenContract }`. Used for milestone subsets (overdue / outstanding / paid).

### Where it's wired
- **Dashboard (`Dashboard.tsx`)** — Total Income, Total Expenses, Net Profit, and the Pending Invoices custom card all open `DrillDownModal` filtered from `rawIncome` / `rawExpenses` over the active period. The nested `{N} overdue` subtext on the Pending Invoices card opens its own overdue drill-down via `stopPropagation`. `SummaryCard` gained an optional `onClick` prop with hover-shadow + keyboard support.
- **Contracts list (`ContractsList.tsx`)** — Total Value clears active filters and resets to page 1 (no modal — the underlying contract list is already on the page). Collected, Outstanding, and Overdue all open `MilestoneListModal` against the matching alerts endpoint. The single `showOverdueModal` flag was replaced with an `activeModal` union so all three drill-downs share one state slot.
- **P&L Centers (`PnlCenters.tsx`)** — top three aggregate cards (Total Income / Total Expenses / Net Profit) become buttons that lazy-fetch `/income` and `/expenses` (limit 500), filter by the active period, and open `DrillDownModal`. A spinner replaces the card icon while loading. Per-center cards still open `PnlCenterDetail` unchanged.
- **Analytics** — already drill-down enabled (no change).

### Backend endpoints added
- `GET /income-contracts/alerts/outstanding` — all milestones where `status != 'paid'` on contracts in `('active','on_hold')`, ordered by `due_date ASC`
- `GET /income-contracts/alerts/paid?limit=200` — all paid milestones on active/on-hold contracts, ordered by `COALESCE(payment_received_date, due_date) DESC`, capped
- Both mirror the existing `alerts/overdue` and `alerts/upcoming` endpoints in `IncomeContractsController.cs`.

### Deliberately not clickable
Stat displays sitting directly above the table they describe (Income, Expenses, Sales tabs) — the "details" are already visible.

---

## Reports Module (PDF + AI Executive Summary)

The `/reports` page generates a downloadable PDF report of business data for a selected period, optionally with an AI-generated executive summary, key findings, and recommendations produced by Google Gemini.

### Two report modes
1. **Templated reports** — user picks one of five pre-built templates (`Full Business Report`, `Dashboard Overview`, `P&L Breakdown`, `Contracts & Milestones`, `Sales Pipeline`). Each template pre-checks a default section list, and the user can toggle any of the 11 section checkboxes to include/exclude specific data. Optional AI summary checkbox.
2. **AI custom reports** — user types a free-text prompt (max 1000 chars). The full section catalog is always included so Gemini has the complete picture, the prompt is prepended to the user message, and the AI summary is always on. Four example prompts are clickable to seed the textarea.

### Backend architecture
```
POST /api/reports/generate
  ├── ReportsService.CollectAsync(request)
  │     └── parallel Task.WhenAll fetch from AnalyticsService, PnlCentersService,
  │         IncomeContractsService, IncomeService, ExpensesService, LeadsService,
  │         ProposalsService — each wrapped in SafeFetch so one bad section can't
  │         kill the whole report
  ├── if IncludeAiSummary: AiSummaryService.SummarizeAsync(data, prompt)
  │     └── compacts data to ≤30KB JSON, POSTs to
  │         generativelanguage.googleapis.com/v1beta/models/{model}:generateContent
  │         (named HttpClient "gemini"), parses strict-JSON response
  │         (responseMimeType=application/json), graceful fallback on any failure
  ├── ReportPdfBuilder.Render(data) → byte[] (MigraDoc Document → PdfDocumentRenderer)
  └── ReportsService.LogGenerationAsync → audit_logs (entity_type='report')
```

### Key files
- `backend/FinanceManagement.Api/Models/Reports/ReportModels.cs` — `ReportRequest`, `ReportData`, `ReportPeriod`, `AiSummary`, `ReportSections` (canonical section keys + per-template defaults).
- `backend/FinanceManagement.Api/Services/Reports/ReportsService.cs` — orchestrates data collection via existing domain services; no direct SQL. Section-level error isolation via `SafeFetch`. Also owns `LogGenerationAsync` which writes the audit row.
- `backend/FinanceManagement.Api/Services/Reports/AiSummaryService.cs` — calls Gemini `generateContent` API via the named HttpClient. Uses `responseMimeType: "application/json"` so Gemini returns strict JSON; defensive code-fence stripping as a fallback. Always returns an `AiSummary`, with `IsFallback=true` on any failure so the PDF still renders with a muted italic note.
- `backend/FinanceManagement.Api/Services/Reports/ReportPdfBuilder.cs` — static class, static `Render(ReportData) → byte[]`. Cover page → optional AI summary block (left-bordered blue callout) → data sections in canonical order → recommendations page → page-numbered footer. Reusable helpers: `AddSectionHeading`, `CreateDataTable` (zebra striping + right-aligned numeric headers), `AddCurrencyCell`, `AddKpiRow`, `Fmt` (per-currency symbol for USD/EUR/GBP/ILS).
- `backend/FinanceManagement.Api/Controllers/ReportsController.cs` — thin controller, `[EnableRateLimiting("reports")]` caps to 10/hr per IP. Returns `File(pdf, "application/pdf", filename)`.
- `frontend/src/pages/reports/Reports.tsx` — main page, hosts the tab switcher, period picker, mode-specific config body, generate button with rolling status message timer, and blob download with JSON-error extraction from blob responses.
- `frontend/src/pages/reports/components/TemplatePicker.tsx` — template radio grid + 11-section checkbox catalog with All/None shortcuts. Exports `TEMPLATE_DEFAULTS` and `ALL_SECTIONS` so `Reports.tsx` stays the single source of truth.
- `frontend/src/pages/reports/components/AiCustomForm.tsx` — textarea with char counter and example prompts.
- `frontend/src/pages/reports/components/ReportPreview.tsx` — right-rail live preview summarizing what will be included.

### Environment variables
- `GEMINI_API_KEY` — **optional**. When unset, reports still render but the executive summary block displays "AI summary unavailable — Gemini API key not configured." Get a free-tier key at https://aistudio.google.com/app/apikey, then bind via Cloud Run secret: `gcloud run services update finance-backend-dotnet --region me-west1 --set-secrets=GEMINI_API_KEY=gemini-api-key:latest`.
- `GEMINI_MODEL` — defaults to `gemini-2.5-flash` (free tier, fast, good at structured output). Lets us swap models without code changes.

Both are read in `Config/EnvironmentConfig.cs` as part of the `GeminiSettings` section on `AppSettings`.

### Gemini API wiring
- Named HttpClient `"gemini"` registered in `Program.cs` with base address `https://generativelanguage.googleapis.com/`, `x-goog-api-key` header attached when configured, and `Timeout = 30s`.
- POST path is `v1beta/models/{model}:generateContent`.
- Request uses `systemInstruction` for the analyst role/output contract, `contents[].parts[].text` for the user message, and `generationConfig` with `temperature: 0.3`, `maxOutputTokens: 1500`, and **`responseMimeType: "application/json"`** — this is Gemini's native JSON mode, so the model is guaranteed to return a valid JSON object and we don't have to parse around markdown preambles.
- System prompt instructs Gemini to return strict JSON with `executiveSummary`, `keyFindings`, `recommendations` and to only cite numbers that appear in the data.
- Response parser deserializes the first candidate's text part. Any parse failure → fallback summary (logged, PDF still renders).
- **Cost**: `gemini-2.5-flash` has a generous free tier (requests per minute / per day limits published at https://ai.google.dev/pricing). Above the free tier, pricing is pennies per million tokens — combined with the 1500-token cap and the 10/hour rate limit, paid overflow is effectively bounded at a few cents per month.

### Cost & abuse guardrails
- **Rate limit**: `reports` fixed-window limiter, 10 requests per hour per IP, applied via `[EnableRateLimiting("reports")]` on the controller.
- **Input compaction**: `AiSummaryService.CompactReportData` trims long row lists to top 10 + totals before sending to Gemini, keeping the payload well under 30KB.
- **Token cap**: `maxOutputTokens: 1500` on the generateContent request.
- **Audit trail**: every successful generation writes to `audit_logs` with `entity_type='report'`, `action='generate'`, and a `new_values` JSON payload containing template, period, section list, `hasPrompt`, `pdfSizeBytes`, `aiSummaryUsed`, `aiSummaryFallback`.

### Frontend UX for cold starts
A rolling status message is driven by a simple `setInterval` timer (pure UX — the frontend doesn't actually know the backend phase):
- `0–2s`: "Collecting data…"
- `2–6s`: "Generating AI summary…"
- `6–15s`: "Rendering PDF…"
- `15s+`: "Still working… large reports can take up to 30 seconds"

Axios timeout is bumped to 60s on this specific call. When the backend returns a JSON error for a blob request, the frontend reads the blob as text, parses it, and surfaces the message in the red error banner.

### PeriodSelector gained a 1W preset
A new `1W` ("Last 7 days") preset was added to `frontend/src/components/PeriodSelector.tsx` for the Reports "weekly" use case. All existing callers keep working unchanged — the preset just appears first in the preset button group.

### PdfSharp Linux font resolver (Cloud Run fix)
PdfSharp 6.x has no font discovery on Linux — `GlobalFontSettings.FontResolver` must be set before any PDF rendering. Without it, `OpenTypeFontFace.CetOrCreateFrom` throws `NullReferenceException`.

- **`LinuxFontResolver.cs`** — implements `IFontResolver`, maps "Arial" and "Liberation Sans" (Regular/Bold/Italic/BoldItalic) to `/usr/share/fonts/truetype/liberation/LiberationSans-*.ttf`. Falls back to any available Liberation Sans font for unknown families.
- **`ReportPdfBuilder.cs`** — thread-safe double-check lock registers the resolver once: `if (GlobalFontSettings.FontResolver is null) GlobalFontSettings.FontResolver = new LinuxFontResolver();`
- **`Dockerfile.backend`** — installs `fonts-liberation fontconfig` and runs `fc-cache -f -v` before the non-root user creation step.

### Gemini 2.5 Flash thinking-parts gotcha
Gemini 2.5 Flash returns "thought" parts (`"thought": true`) in the response before the actual content part. Using `FirstOrDefault()` on `parts` will grab the thinking text (not JSON) and fail to parse. The fix in `AiSummaryService.cs`:
```csharp
var textBlock = parts?.LastOrDefault(p => p.Thought != true)?.Text
             ?? parts?.LastOrDefault()?.Text;
```
The `GeminiPart` class includes `[JsonPropertyName("thought")] public bool? Thought { get; set; }` to deserialize this flag.

---

## Partial Payments on Milestones

### Migration 023
`023_milestone_partially_paid` — adds `'partially_paid'` to the `valid_milestone_status` CHECK constraint on `income_milestones`.

### Backend changes (`IncomeContractsService.cs`)
- `MarkMilestonePaidAsync` now supports cumulative partial payments:
  - Guard changed: rejects only `status == 'paid'` (not `partially_paid`)
  - Computes `previouslyPaid = milestone.actual_amount_paid ?? 0`, `remaining = amount_due - previouslyPaid`, `thisPayment = request.ActualAmountPaid ?? remaining`
  - `cumulativePaid = previouslyPaid + thisPayment`; new status = `'paid'` if `cumulativePaid >= amount_due`, else `'partially_paid'`
  - Each partial payment creates its own income record (amount = `thisPayment`, not cumulative)
  - Income description includes "(partial payment)" suffix when applicable
  - UPDATE writes `@Status` and `@CumulativePaid` instead of hardcoded `'paid'` and single amount

### Frontend changes
- **`shared/types.ts`** — `MilestoneStatus` union includes `'partially_paid'`
- **`MilestoneStatusBadge.tsx`** — amber badge config for `partially_paid`
- **`MilestoneRow.tsx`** — helper booleans `isPaidOrPartial` / `isFullyPaid` control button visibility:
  - Edit/delete: `!isPaidOrPartial` (hidden once any payment recorded)
  - Mark-paid: `!isFullyPaid` (visible for partially_paid — allows recording additional payments)
  - Revert: `isPaidOrPartial`
  - Payment info line shows "Partially paid ($X of $Y) · Remaining: $Z" for partial status
  - Row tint: `border-l-amber-400` for `partially_paid`
- **`MarkPaidModal.tsx`** — detects `isAdditionalPayment` (status === 'partially_paid'), defaults amount to remaining, shows "Previously paid" + "Remaining" breakdown, header changes to "Record Additional Payment"
- **`ContractDetailView.tsx`** — `totalPaid` includes partially_paid milestones; `totalOutstanding` subtracts actual_amount_paid from partially_paid milestones

---

## P&L Auto-Allocation from Contracts

When `MarkMilestonePaidAsync` creates an income record and the frontend sends an empty `allocations` array, the service now auto-allocates 100% to the contract's `pnl_center_id` (if set). Without this, income records from milestones had no `income_allocations` rows, and P&L centers showed $0 for contract-derived income.

**Fix location**: `IncomeContractsService.cs` line ~1313:
```csharp
Allocations = request.Allocations.Count > 0
    ? request.Allocations
    : contract.pnl_center_id.HasValue
        ? [new AllocationInput { PnlCenterId = contract.pnl_center_id.Value, Percentage = 100 }]
        : [],
```

---

## GCS File Viewing Architecture

Attachments are stored in Google Cloud Storage (`finance-management-uploads` bucket, not publicly readable). The file viewing chain in `DocumentsPanel.tsx`:

1. **Signed URL** — `POST /api/uploads/get-signed-url` with `{ url }` body. Backend uses `UrlSigner.FromCredential()` to generate a 1-hour signed read URL. If returned URL starts with `http`, navigate the pre-opened tab to it.
2. **Proxy blob download** — if the signed URL is relative (proxy fallback), download via authenticated axios as a blob (`responseType: 'blob'`), create `URL.createObjectURL`, and navigate the tab to the blob URL. Important: strip leading `/api/` from the proxy path since the axios base URL already includes `/api`.
3. **Raw URL fallback** — on any error, navigate the tab to the original raw URL.

**Popup blocker avoidance**: `window.open('about:blank', '_blank')` is called synchronously inside the click handler (preserving user-gesture context), then the tab's `location.href` is updated after the async fetch completes.

---

## Known Backend Gotchas (Recent)

### IncomeService date parameter types
`IncomeService.GetAllAsync` filters `DateFrom`/`DateTo` must be parsed to `DateTime` before passing to Dapper. PostgreSQL `date >= text` operator doesn't exist — passing strings causes "operator does not exist" errors. Fixed by `DateTime.TryParse` + adding `DateTime` parameters (matching the pattern in `ExpensesService`).

### Dapper + PostgreSQL date columns
Always pass `DateTime` objects (not strings) for `date`-type columns. Dapper maps `DateTime` to the correct PostgreSQL `date` type, but strings need explicit casting which Dapper doesn't do.
