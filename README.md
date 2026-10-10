# Self-Welfare Society Web Application

A mutual aid society platform where members contribute to help families during emergencies and deaths.

## Tech Stack

- **Next.js 14** (App Router)
- **React** + **Tailwind CSS**
- **PostgreSQL** (local development and VPS deployment)
- **NextAuth.js** (credentials auth)
- **bcryptjs** (password hashing)
- **pg** (PostgreSQL driver for the application database layer)

## Local PostgreSQL setup

This application is now configured to use the local PostgreSQL database through the `DATABASE_URL` environment variable.

### 1. Configure local environment

Copy the example environment file and fill in your local PostgreSQL password while keeping the value out of the repository.

```bash
cp .env.local.example .env.local
```

Use a connection string in this form:

```bash
DATABASE_URL=postgresql://sws_app:URL_ENCODED_PASSWORD@127.0.0.1:5432/sws-stage
```

If your password contains special characters, URL-encode it before placing it in the connection string.

Also set a local NextAuth secret:

```bash
openssl rand -base64 32
```

### 2. Install & run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 3. Create an admin user

1. Sign up via `/signup` with your admin email.
2. Run the following SQL against the local database:

```sql
UPDATE users
SET is_admin = true, status = 'approved'
WHERE email = 'admin@example.com';
```

3. Log in at `/login` and access the admin panel at `/admin`.

## Supabase rollback/reference

The previous Supabase configuration is intentionally left in the environment files as a rollback/reference only until local PostgreSQL validation is complete.

Do not delete or overwrite the existing Supabase project while the local PostgreSQL migration is being validated.

## Project Structure

```
app/
├── page.tsx                    # Landing page
├── login/                      # Login page
├── signup/                     # Registration with KYC
├── dashboard/                  # Member death records view
├── contribution-details/[id]/  # Contribution timeline
├── admin/                      # Admin panel
│   ├── approve-members/        # Pending KYC approvals
│   ├── add-death/              # Add death records
│   └── view-deaths/            # Manage deaths & contributions
└── api/                        # REST API routes
components/                     # Reusable UI components
lib/                            # Auth, DB, validation helpers
sql/                            # PostgreSQL schema and verification scripts
supabase/                       # Legacy Supabase schema and migration reference
```

## Deployment notes

1. Keep the local PostgreSQL database working first.
2. Validate the application with `DATABASE_URL` on the local machine.
3. After local validation, migrate the same database to the VPS PostgreSQL server.
4. Maintain the existing Supabase database as a backup/rollback target until the VPS migration is fully validated.

## Features

- Member registration with KYC (Aadhar, PAN, bank details)
- Admin approval workflow
- Death record management
- Contribution tracking with timeline view
- Role-based access (member vs admin)
- 30-day JWT sessions via NextAuth
