# Self-Welfare Society Web Application

A mutual aid society platform where members contribute to help families during emergencies and deaths.

## Tech Stack

- **Next.js 14** (App Router)
- **React** + **Tailwind CSS**
- **Supabase** (PostgreSQL)
- **NextAuth.js** (credentials auth)
- **bcryptjs** (password hashing)

## Setup

### 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Open the SQL Editor and run the schema from `supabase/schema.sql`

### 2. Configure Environment

```bash
cp .env.local.example .env.local
```

Fill in your Supabase URL, anon key, service role key, and generate a NextAuth secret:

```bash
openssl rand -base64 32
```

### 3. Install & Run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 4. Create Admin User

1. Sign up via `/signup` with your admin email
2. In Supabase SQL Editor, run:

```sql
UPDATE users
SET is_admin = true, status = 'approved'
WHERE email = 'admin@example.com';
```

3. Login at `/login` and access admin panel at `/admin`

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
supabase/schema.sql             # Database schema
```

## Deployment (Vercel)

1. Push to GitHub
2. Import project in Vercel
3. Add environment variables from `.env.local.example`
4. Set `NEXTAUTH_URL` to your production domain
5. Deploy

## Features

- Member registration with KYC (Aadhar, PAN, bank details)
- Admin approval workflow
- Death record management
- Contribution tracking with timeline view
- Role-based access (member vs admin)
- 30-day JWT sessions via NextAuth
