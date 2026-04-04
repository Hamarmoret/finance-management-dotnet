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
│   ├── Controllers/      # 14 controllers
│   ├── Database/         # DbContext.cs, MigrationRunner.cs (9 migrations)
│   ├── Middleware/        # AuthMiddleware, ErrorHandlingMiddleware
│   ├── Models/           # DTOs grouped by domain
│   ├── Services/         # 15 services
│   └── FinanceManagement.Api.csproj
├── frontend/
│   ├── src/
│   │   ├── components/   # DataTable, FileUpload, RecurringToggle, layouts
│   │   ├── pages/        # auth, analytics, dashboard, expenses, income, pnl-centers, settings, business-plan
│   │   ├── services/     # api.ts (Axios client)
│   │   ├── stores/       # authStore.ts (Zustand)
│   │   ├── types/        # shared.ts
│   │   └── utils/        # formatters.ts
│   └── package.json
├── Dockerfile.backend
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
- **Migrations**: Auto-run on startup via `MigrationRunner.cs` (9 sequential migrations)
- **SQL placeholders**: `@ParamName` style (Dapper/Npgsql convention)

### Schema (key tables)
- `users` — auth, MFA, lockout tracking
- `sessions` — refresh tokens, device info
- `pnl_centers`, `expenses`, `income` — core financial data
- `leads`, `clients`, `proposals`, `attachments` — pipeline
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
| Income | IncomeController | IncomeService |
| Pipeline | ClientsController, LeadsController, ProposalsController | ClientsService, LeadsService, ProposalsService |
| Analytics | AnalyticsController | AnalyticsService |
| Audit | AuditLogsController | AuditLogsService |
| Business Plans | BusinessPlansController | BusinessPlansService |
| Files | UploadsController | UploadsService (GCS) |
| CSV | CsvImportController | CsvImportService |

## Deployment

### Automatic (normal workflow)
Push to `master` on GitHub → Cloud Build trigger fires → builds Docker image → deploys to Cloud Run automatically.
Both `cloudbuild-frontend.yaml` and `cloudbuild-backend.yaml` include the `gcloud run deploy` step.

### Manual (if needed)
```bash
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
