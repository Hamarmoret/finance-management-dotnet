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
