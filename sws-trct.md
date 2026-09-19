# SWS vs TRCTUP – Functional Gap Analysis

Last Updated: 2026-09-15

## Change Log
- 2026-09-15: Updated analysis based on direct inspection of the SWS codebase and public review of TRCTUP pages and navigation.
- 2026-09-15: Classified features conservatively with explicit status labels: Implemented, Partially Implemented, Missing, Not Required, and Not Verified.

## 1. Executive Summary

The current SWS application is a partially mature welfare-membership platform. It already demonstrates a solid base for member onboarding, admin review, dashboard reporting, and death-contribution tracking, but it is not yet a production-ready welfare assistance platform comparable to the documented TRCTUP public model.

Main findings:
- SWS has a working member registration flow, pending/approved/rejected status handling, admin dashboard, district-based filtering logic, and a death/contribution record model.
- The app is strongest in member management and internal admin workflow, not in welfare application lifecycle management.
- Public TRCTUP marketing and transparency messaging strongly suggests a welfare-assistance model with member registration, financial aid application flow, public lists, volunteer structure, and support contact channels.
- The SWS codebase does not yet include the core public-facing welfare application workflow that TRCTUP describes: scheme selection, document upload, application review, payment initiation, payment proof, UTR tracking, and public transparency without sensitive data exposure.
- The highest risks are authorization, data isolation, file handling, payment-tracking controls, and missing admin escalation roles.

Current maturity: Medium. It is usable as a foundation, but it is not production-ready for public welfare fund disbursement without a significant security and workflow build-out.

Main similarities with TRCTUP:
- Public-facing landing pages for trust, support, benefits, and registration.
- Member model with identity, district, bank details, and approval lifecycle.
- District-based organization structure and admin review concept.
- Public transparency themes such as reporting totals and members.

Main gaps:
- No complete welfare-application lifecycle with scheme selection, document verification, payment proof, and UTR tracking.
- No email or OTP verification layer for identity assurance.
- No dedicated state/admin hierarchy beyond a basic district admin concept.
- No volunteer management or coordinator role model.
- No public application status tracking, legal pages, or bilingual content.
- No strong file-storage and private-document security model.

Critical production risks:
- Sensitive fields are stored in the users table without a clear masking strategy.
- The schema has service-role-only policies, but no user-level or district-level RLS enforcement beyond a manual service-role access pattern.
- Password reset is implemented, but actual email delivery is not; the reset link is logged to console instead of sent.
- No payment verification, audit trail, or proofing workflow exists for claims or payouts.
- There is no complete workflow for document uploads, verification, or rejection with reasons as a formal process.

Recommended next steps:
1. Fix security and role isolation.
2. Define welfare scheme and application model.
3. Build district and state admin hierarchy with separate audit logs.
4. Add document upload + verification + payment proof workflow.
5. Add notification and public transparency layer.
6. Only then consider large-scale public launch.

## 2. Comparison Scope and Method

### 2.1 SWS code inspected
The following SWS modules were inspected directly:
- app/admin/page.tsx
- app/admin/approve-members/page.tsx
- app/admin/view-deaths/page.tsx
- app/dashboard/page.tsx
- app/login/page.tsx
- app/signup/page.tsx
- app/about-us/page.tsx
- app/contact/page.tsx
- app/sahyog-list/page.tsx
- app/jivandan-list/page.tsx
- app/kanyadan-list/page.tsx
- app/api/auth/signup/route.ts
- app/api/auth/forgot-password/route.ts
- app/api/auth/reset-password/route.ts
- app/api/admin/dashboard-stats/route.ts
- app/api/admin/approve-user/route.ts
- app/api/admin/pending-users/route.ts
- app/api/admin/approved-users/route.ts
- app/api/admin/add-death/route.ts
- app/api/admin/close-death/route.ts
- app/api/contributions/add/route.ts
- app/api/deaths/get-all/route.ts
- app/api/deaths/get-by-id/route.ts
- lib/auth-options.ts
- lib/auth.ts
- lib/db.ts
- lib/validation.ts
- supabase/schema.sql
- components/SignupForm.tsx
- components/LoginForm.tsx
- components/ForgotPasswordForm.tsx
- components/ResetPasswordForm.tsx

### 2.2 TRCTUP public pages and sections inspected
Public content was reviewed from the live website referenced in the task:
- https://trctup.com/
- https://trctup.com/about-us
- https://trctup.com/contact
- https://trctup.com/sahyog
- https://trctup.com/jivandan
- https://trctup.com/kanyadan

The public site reveals:
- Teacher trust/charitable organization messaging.
- Registration instructions.
- Welfare scheme descriptions and support categories.
- Public transparency language about application lists, valid/invalid status, and public reviews.
- Contact and support details.
- Volunteer and team structure.

### 2.3 What could not be verified
The following were not verified from public website evidence or from the codebase:
- Internal admin back office and private APIs.
- Payment gateway implementation details.
- Email delivery infrastructure.
- OTP or multi-factor admin controls.
- Real file upload security architecture.
- Production backup, monitoring, and alerting processes.
- Whether the live TRCTUP site has separate state/district admin roles and a robust legal compliance framework.

### 2.4 Classification definitions used in this analysis
- Implemented: Verified in the SWS codebase and working as intended in the app flow.
- Partially Implemented: UI or backend exists but the end-to-end workflow is incomplete or lacks required controls.
- Missing: No usable implementation exists in SWS.
- Not Required: Not needed for the SWS business model or not applicable to this app’s scope.
- Not Verified: Cannot be confirmed from public evidence or code inspection.

## 3. Feature Comparison Matrix

| Module | TRCTUP functionality | Existing SWS status | Evidence in SWS | Gap description | Priority | Recommended action |
|---|---|---:|---|---|---|---|
| Home page | Public site, organization introduction, call-to-action | Implemented | app/page.tsx, components/HeroSlider.tsx, Header.tsx | Basic global landing pages exist; not yet a full trust brand, scheme landing, or campaign content layer | P2 | Add structured charity messaging, scheme tiles, CTA, and trust transparency banners |
| About organization | Trust purpose and founder/team narrative | Implemented | app/about-us/page.tsx | Page exists but not yet calibrated to SWS mission and governance structure | P2 | Replace generic content with SWS-specific governance, founding story, and service values |
| Mission and vision | Public mission/vision content | Partially Implemented | app/about-us/page.tsx, marketing text in homepage | No formal mission/vision governance document or strategic framework is visible | P2 | Add mission, vision, values, and operating principles |
| Welfare schemes | Public scheme listing for support programs | Partially Implemented | app/sahyog-list/page.tsx, app/jivandan-list/page.tsx, app/kanyadan-list/page.tsx | Information pages exist, but no functional scheme application lifecycle | P1 | Define scheme registry and scheme-specific application workflows |
| Sahyog | Assistance or welfare listing | Partially Implemented | app/sahyog-list/page.tsx | Page is static informational content; no application, review, or payout workflow | P1 | Convert to real scheme intake and funding workflow |
| Jivandan | Assistance for death support or welfare aid | Partially Implemented | app/jivandan-list/page.tsx | Static page present; no application submission or validation workflow | P1 | Add scheme-based intake and approval pipeline |
| Kanyadan | Assistance for marriage/family support | Partially Implemented | app/kanyadan-list/page.tsx | Static content without legal/eligibility workflow | P1 | Add scheme prerequisites, documents, and application logic |
| User registration | Member registration and onboarding | Implemented | app/signup/page.tsx, components/SignupForm.tsx, app/api/auth/signup/route.ts | Registration works with strong validation and admin approval state | P0 | Keep, but add email verification and anti-abuse controls |
| Login | Member access and role-aware session | Implemented | app/login/page.tsx, lib/auth-options.ts | Credentials auth is present and session is built around NextAuth | P0 | Add rate limiting, stronger session handling, and better admin isolation |
| Forgot password | Recovery flow exists | Partially Implemented | app/api/auth/forgot-password/route.ts, app/api/auth/reset-password/route.ts | Token flow exists, but actual email delivery is not implemented; reset link is logged to console | P0 | Replace console logging with real transactional email service |
| OTP or email verification | Identity assurance | Missing | No OTP or verification route or model in codebase | Users can register without email verification and there is no identity assurance after signup | P0 | Add email verification and OTP for sensitive actions |
| User profile | Personal profile and editable details | Missing | No dedicated profile page or patch API found in app tree | No way to view or update member profile after approval | P1 | Add profile page with editable fields and audit record |
| Membership approval | Pending/approved/rejected review | Implemented | app/admin/approve-members/page.tsx, lib/db.ts, supabase/schema.sql | Admin approval flow exists at a basic level | P1 | Add reasoned review, history, and stricter district restrictions |
| Member directory | Public or admin member listing | Partially Implemented | lib/db.ts getApprovedUsers, app/admin/approve-members/page.tsx | Listing exists internally but no public member directory page or privacy-safe view | P1 | Add safe public directory plus admin directory with filters |
| District selection | Registration includes district and admin district logic | Implemented | lib/db.ts applyDistrictFilter, signup route, schema.sql | District field exists and is used in admin filtering | P0 | Enforce strict district isolation in all APIs |
| State-level administration | State oversight model | Partially Implemented | role enum in schema.sql includes district_admin and super_admin | No full state admin hierarchy or cross-district workflow is implemented | P1 | Introduce state admin and co-admin roles with explicit rules |
| District Admin | District-based access | Partially Implemented | lib/db.ts, district_admin_mapping table, getAdminContext | Role exists, but governance and enforcement are limited | P1 | Add explicit district mapping management and review controls |
| Co-District Admin or Deputy District Coordinator | De-centralized district management | Missing | No such role or table in schema.sql | No delegated district control layer | P1 | Add district coordinator role and approval chain |
| Volunteer management | Volunteers recruited and managed | Missing | No volunteer table or UI in codebase | No volunteer workflow or district coordination | P2 | Add volunteer model, permissions, and reporting |
| Public application listing | Transparent application dashboard | Partially Implemented | deaths records and aggregation APIs exist, but no public application status list | No public application or claim status pages | P1 | Add public list with masked-limited data |
| Application status tracking | Know status for each claim/application | Missing | No application status table or API found | Users cannot track application progress | P1 | Add application_status table and user-facing status page |
| Application verification | Review of submitted welfare applications | Missing | No application submission model exists | No document review or verification workflow | P1 | Build application intake and verification workflow |
| Document upload | Upload supporting documents | Missing | No storage bucket or document table found in the codebase | Essential for welfare claims is absent | P0 | Add secure document storage with validation and access rules |
| Nominee management | Named nominee relationship | Partially Implemented | signup form captures nominee-related fields in app but no dedicated model | No dedicated nominee profile, verification, or linkage to claims | P1 | Add nominee table and claim-payout relationship model |
| Welfare application workflow | End-to-end aid process | Missing | No scheme/application tables or endpoints in the app | This is the largest functional gap relative to TRCTUP requirements | P0 | Build full application lifecycle: intake, validation, review, payout, closure |
| Approval and rejection workflow | Review and decision logic | Partially Implemented | app/api/admin/approve-user/route.ts, updateUserStatus in lib/db.ts | Basic member approval exists; not yet extended to claim workflow | P1 | Repurpose same governance pattern for scheme application decisions |
| Payment tracking | Track installments or payouts | Missing | No payment table or API found | There is no transparent payment lifecycle | P0 | Add payment ledger, UTR capture, and verification pipeline |
| Payment proof | Proof of transfer for records | Missing | No payment file or proof table exists | Cannot validate or audit disbursement | P0 | Add payment proof attachment and review workflow |
| UTR/reference number | Unique transfer reference | Missing | No UTR field or payment record found | No public or internal traceability for payouts | P0 | Add UTR and reference number capture and validation |
| Financial transparency | Public summary and trust transparency | Partially Implemented | Totals visible in dashboard and deaths/contributions data model | Transparent public view exists only in a very limited internal sense, not to end users | P1 | Add public dashboard with filtered, masked summaries |
| Notifications | User or admin communication | Missing | No notification models or APIs found | No one is notified once an application changes status | P1 | Add email/SMS notification service and status notifications |
| Announcements | Public messages and updates | Missing | No announcement model or page exists | This is a public trust feature, not currently implemented | P2 | Add announcement management and listing pages |
| Videos or activity gallery | Trust activity and media | Missing | No video/gallery infrastructure found | TRCTUP emphasizes community advocacy and media; SWS does not yet include it | P2 | Add gallery and video content management |
| Contact and support | Public support and inquiry forms | Implemented | app/contact/page.tsx | simple contact page is present and is adequate as a starting point | P2 | Add inquiry categorization and admin notification |
| Hindi and English support | bilingual usability | Partially Implemented | many pages are in English; no localization layer | site is currently effectively English-first | P2 | Add i18n or bilingual content strategy |
| Responsive design | Mobile/tablet/desktop support | Implemented | Tailwind CSS usage and responsive components | Likely usable, but not systematically validated across all key workflows | P2 | Perform end-to-end responsive QA on all public and admin flows |
| Accessibility | Keyboard, focus, labels, contrast | Partially Implemented | base Tailwind classes but no systematic audit | Need explicit role labels, ARIA support, keyboard testing | P2 | Run accessibility audit and fix form labels/focus states |
| Search and filtering | Lists by category or district | Missing | No theme or search layer for public lists is found | Users cannot search or filter applications or members well | P2 | Add searchable and filterable admin tables |
| Reports and analytics | Usage reporting and management | Partially Implemented | admin dashboard stats in app/api/admin/dashboard-stats/route.ts | Basic counts only; no downloadable or historical reports | P1 | Add scheme-level analytics and exportable reports |
| Audit logs | History of changes and decisions | Missing | No audit_history table is defined in schema.sql | Critical for trust and compliance | P0 | Add audited actions table for approvals, payments, and updates |
| Role-based access control | user/admin/district_admin separation | Partially Implemented | lib/auth.ts, user role enum, role checks | Role enforcement is present, but not comprehensive enough for production | P0 | Expand to state, co-admin, volunteer, and district isolation enforcement |
| Supabase Row Level Security | Data access policies | Partially Implemented | supabase/schema.sql defines service-role policies only | Security is not granular enough for end-user and district-level access | P0 | Add user-level and district-level RLS rules for real multi-tenant isolation |
| File security | Document privacy and validation | Missing | No document table or storage validation in app | High risk because welfare claims need private documents | P0 | Add Secure Storage + signed URLs + type and size validation |
| Backup and recovery | Disaster recovery | Not Verified | No documented backup process in project | Recovery process is not visible or proven | P0 | Add backup and restore runbook and automated snapshot strategy |
| Error handling | API and UI messages | Partially Implemented | route handlers validate and return messages | Basic handling exists, but no standard error taxonomy or logging strategy | P1 | Add unified API error handling and operational logging |
| Monitoring | Production observability | Not Verified | No monitoring package or dashboard config found | No evidence of production monitoring | P1 | Add app monitoring, error ingestion, and health checks |
| Performance | Page and API speed | Partially Implemented | lightweight Next.js and Supabase query model | Not enough evidence of heavy-load optimization | P2 | Add caching, pagination, and query optimization |
| SEO | Search engine discoverability | Partially Implemented | app pages exist but SEO metadata is not consistently present | Public site may not rank or present well in search | P2 | Add metadata, structured data, and sitemap |
| Privacy policy | Legal and data disclosure page | Missing | No matching privacy route or policy in app tree | This is required for public trust and data protection | P0 | Add privacy policy, consent language, and data-handling page |
| Terms and conditions | Platform terms | Missing | No terms route or document found | Required for member onboarding and legal clarity | P0 | Add terms page and acceptance in registration flow |
| Refund policy | Fee refund policy if relevant | Missing | No refund policy route or text found | The app may not include fees, but legal page should still exist if required | P2 | Add policy only if payment or donation features are introduced |

## 4. Detailed Existing SWS Functionality

### 4.1 User registration and approval workflow
- Page/route: app/signup/page.tsx, components/SignupForm.tsx, app/api/auth/signup/route.ts
- User role: Registered user, pending approval
- Purpose: Collect identity, bank, district, and contact information and create an account.
- Current behavior: The form validates required fields, checks email/Aadhaar/PAN uniqueness, hashes the password with bcrypt, and inserts a user in status = pending.
- API involved: POST /api/auth/signup
- Database tables: users
- Validation rules: validateSignup() in lib/validation.ts enforces email, PAN, Aadhaar, IFSC, phone, district, pincode, and account fields.
- Security controls: bcrypt hashing, duplicate checks, admin approval gating, status checks on login.
- Workflow completeness: The core registration workflow is functional and clear, but stronger email verification and identity validation are still missing.
- Known limitations: No email verification, no OTP, no separate citizen/beneficiary profile, no consent policy acceptance flag.

### 4.2 Login and session handling
- Page/route: app/login/page.tsx, lib/auth-options.ts, app/api/auth/[...nextauth]/route.ts
- User role: Any user with a valid account and approved status
- Purpose: Authenticate using email and password and maintain session.
- Current behavior: Credentials provider checks the user by email, rejects pending/rejected accounts, and compares hashed password.
- API involved: NextAuth signIn flow via credentials provider.
- Database tables: users
- Validation rules: Basic email/password presence checks.
- Security controls: bcrypt password compare, status checks, JWT session, secret from NEXTAUTH_SECRET.
- Workflow completeness: Functional for basic login. 
- Known limitations: No rate limiting, no 2FA, no robust session rotation, no IP or device logging, and no meaningful password policy beyond resets.

### 4.3 Forgot password and reset password
- Page/route: app/api/auth/forgot-password/route.ts, app/api/auth/reset-password/route.ts, components/ForgotPasswordForm.tsx, components/ResetPasswordForm.tsx
- User role: Any registered user
- Purpose: Allow password reset using tokenized links.
- Current behavior: The flow creates a cryptographic hash of a random token, stores it in password_reset_tokens, and validates it on reset. It also invalidates previous tokens after a successful reset.
- Database tables: password_reset_tokens, users
- Security controls: SHA-256 hashing before storage, expiration time, token used checks.
- Workflow completeness: The reset logic is present but not production-ready because email delivery is not implemented; a password reset link is logged to the console instead of sent to the user.
- Known limitations: No actual email infrastructure, no rate limiting on reset requests, no abuse detection, no actual audit for reset actions.

### 4.4 Admin approval and district filtering
- Page/route: app/admin/approve-members/page.tsx and app/api/admin/pending-users/route.ts, app/api/admin/approve-user/route.ts
- User role: Super admin or district admin
- Purpose: Review member applications and approve or reject them.
- Current behavior: Pending users are loaded, district-level filtering is applied when adminRole is district_admin, and a user status is updated to approved or rejected.
- Database tables: users, approval_history
- Security controls: requireAdmin() checks session user is_admin. 
- Workflow completeness: Basic approval is implemented and credible for a first build.
- Known limitations: district admin enforcement is present but not fully hardened for all end-user queries; there is no complete separate role hierarchy beyond district_admin and super_admin; there is no dedicated approval timeline or escalation logic.

### 4.5 Admin dashboard and analytics
- Page/route: app/admin/page.tsx and app/api/admin/dashboard-stats/route.ts
- User role: admin roles
- Purpose: Provide key counts for users, pending approvals, approved members, rejections, deaths, and total contributions.
- Current behavior: Stats are aggregated from users, deaths, and contributions tables.
- Database tables: users, deaths, contributions
- Validation rules: none beyond auth checks.
- Security controls: requireAdmin() and district filter for district admin.
- Workflow completeness: Basic counts are present and functioning.
- Known limitations: No historical analytics, no downloadable reports, no trend charts, no per-scheme amounts or category-level tracking.

### 4.6 Death record management and contribution flow
- Page/route: app/admin/view-deaths/page.tsx, app/api/admin/add-death/route.ts, app/api/admin/close-death/route.ts, app/api/contributions/add/route.ts, app/api/deaths/get-all/route.ts, app/api/deaths/get-by-id/route.ts
- User role: Admin or approved member-facing public list context
- Purpose: Add death records, maintain active/closed status, and track contributions.
- Current behavior: Admin can create active death cases, view them, add contributions, and close the record. Contribution totals are recalculated by a SQL trigger.
- Database tables: deaths, contributions
- Security controls: admin checks and dynamic routing required for session access.
- Workflow completeness: Functional as a basic donation campaign tracker, but it is not the same as a verified welfare claim application pipeline.
- Known limitations: No document verification, no payment proof, no claim status progression, no legal payout approval chain.

### 4.7 Contact page and static content pages
- Page/route: app/contact/page.tsx, app/about-us/page.tsx, app/sahyog-list/page.tsx, app/jivandan-list/page.tsx, app/kanyadan-list/page.tsx
- User role: Public
- Purpose: Provide general public-facing information.
- Current behavior: These are mostly static informational pages in English.
- Database tables: none
- Workflow completeness: Good for public marketing, but not sufficient for end-to-end welfare operations.
- Known limitations: No bilingual support, no dynamic posts, no forms with inquiry categorization, no SEO metadata strategy.

### 4.8 Supabase schema and security model
- File: supabase/schema.sql
- Purpose: Defines the core data model and operational conventions for SWS.
- Current behavior: Creates schema objects for users, password reset tokens, district mapping, approval history, deaths, and contributions. It also sets service-role-based RLS policies.
- Security controls: Service-role-only create/select access, hashed passwords, admin role and status flags, district mapping table.
- Workflow completeness: The schema is a good foundation but does not yet express a complete welfare application lifecycle.
- Known limitations: No file/document table, no scheme table, no application table, no payment ledger, no audit log table, and no user-level/district-level RLS beyond service-role access pattern.

## 5. TRCTUP Functionality Summary

The public TRCTUP website confirms several visible features and promises. The following items are based on public evidence only and should not be treated as internal platform facts.

### 5.1 Publicly visible TRCTUP features
| Feature | Status |
|---|---|
| Organization introduction and trust positioning | Verified from public website |
| Registration instructions and onboarding process | Verified from public website |
| Welfare assistance descriptions | Verified from public website |
| Public transparency references for application lists and validity checks | Verified from public website |
| Contact information and support numbers | Verified from public website |
| Volunteer and leadership structure | Partially visible |
| Public media / video area | Partially visible |
| Login/portal access | Verified from public website |
| Legal pages such as privacy, refund, and terms | Partially visible in navigation links |
| Private admin workflow and payment engine | Not verified |
| Real email/OTP-based verification system | Not verified |
| Internal district admin escalation model | Not verified |
| Full payout, application tracking, and audit backend | Not verified |

### 5.2 What the public TRCTUP site strongly suggests
- A trust-driven welfare service model for teachers.
- Public registration and likely member-based fundraising or support network.
- Evidence of public application transparency and likely review-based assistance.
- Strong emphasis on community trust, financial assistance, and accountability.
- The existence of a public site does not prove the private internal workflow or dataset quality.

## 6. Missing Functionality in SWS

The following items are critical gaps relative to a welfare trust workflow and the public messaging visible on TRCTUP.

### 6.1 Gap 1: Welfare application and claim workflow
- Why it matters: The current SWS handles member signup and death contribution records, but not scheme-based welfare claims from beneficiaries.
- Affected roles: Registered user, district admin, super admin, nominee, beneficiary
- Expected behavior: A user selects a welfare scheme, fills an application, uploads required documents, gets a reference number, and receives approval/rejection or payout updates.
- Suggested database changes: Create scheme, application, application_status_history, document_upload, and payment_record tables.
- Suggested API changes: POST /api/applications/create, /api/applications/:id, /api/applications/:id/review, /api/applications/:id/payment, /api/applications/public-list.
- Suggested UI changes: Application dashboard, file upload, decision panel, payment proof section.
- Acceptance criteria: A user can create, submit, and track a claim from start to finish.
- Priority: P0
- Dependencies: Document storage, role model, audit log, notifications

### 6.2 Gap 2: Secure document upload and private file handling
- Why it matters: Welfare claims require IDs, death certificates, bank proofs, medical records, and family documentation that should not be publicly exposed.
- Affected roles: User, district admin, state admin, super admin
- Expected behavior: Upload files with validation, secure storage, and role-based visibility.
- Suggested database changes: document_uploads with storage_url, mime_type, checksum, uploaded_by, verified_by.
- Suggested API changes: upload endpoint with type and size checks; signed URL generation; review endpoint.
- Suggested UI changes: secure uploader with accepted file types and validation summary.
- Acceptance criteria: Only eligible reviewers can access private documents; all uploads are validated and stored securely.
- Priority: P0
- Dependencies: Storage bucket policy, encryption, access control

### 6.3 Gap 3: Payment ledger and UTR tracking
- Why it matters: Trust funds need traceability and audit proof for each disbursement.
- Affected roles: Admin, finance reviewer, super admin, beneficiary
- Expected behavior: Each payment must have a transaction reference, amount, mode, confirmation, and proof.
- Suggested database changes: payment_transactions and payment_proof tables.
- Suggested API changes: payment initiation, verification, rejection, and public summary endpoints.
- Suggested UI changes: payment history page and claim status panel.
- Acceptance criteria: Every payout has an auditable transaction record and proof reference.
- Priority: P0
- Dependencies: Finance workflow and legal policy

### 6.4 Gap 4: Role and district enforcement
- Why it matters: District admins must not have access to data outside their assigned district.
- Affected roles: district_admin, super_admin, volunteer, user
- Expected behavior: Role and district boundaries are enforced on every query and update.
- Suggested database changes: district_admin_mapping, role_assignment_history, user_district_assignment tables.
- Suggested API changes: every protected route must verify district context and return 403 for unauthorized cross-district access.
- Suggested UI changes: district-specific portals and clear filters.
- Acceptance criteria: A district admin can only view and act on the district assigned to them.
- Priority: P0
- Dependencies: RBAC and RLS

### 6.5 Gap 5: Audit trail and compliance evidence
- Why it matters: A charitable trust needs a defensible record of who approved what, when, and why.
- Affected roles: all roles with decision authority
- Expected behavior: All decisions and modifications are recorded with user, role, timestamp, and reason.
- Suggested database changes: action_audit_log with action_type, entity_type, entity_id, performed_by, previous_state, new_state.
- Suggested API changes: event logging for approvals, rejections, payments, document verification, and profile changes.
- Suggested UI changes: audit timeline panel for each application.
- Acceptance criteria: Any application status change must have a corresponding audit entry.
- Priority: P0
- Dependencies: full application workflow and role model

### 6.6 Gap 6: Real email and identity verification layer
- Why it matters: A welfare platform should not rely only on a username/password model.
- Affected roles: new user, admin, user with reset flow
- Expected behavior: Account creation and critical actions require verified email and possibly OTP.
- Suggested database changes: email_verification_tokens, otp_codes, login_attempt_log.
- Suggested API changes: verify-email endpoints and email/OTP resend services.
- Suggested UI changes: verification status banner, resend workflows.
- Acceptance criteria: A user cannot complete sensitive actions without validated email or OTP.
- Priority: P0
- Dependencies: mail provider, rate limiting, verification pages

### 6.7 Gap 7: Public transparency dashboard without exposing sensitive information
- Why it matters: TRCTUP messaging emphasizes public transparency, but SWS should maintain privacy-safe visibility.
- Affected roles: public visitors, members, admins
- Expected behavior: show scheme totals, application counts, verified payouts, and district summary without exposing private records.
- Suggested database changes: public_summary_cache or masked_reporting_view.
- Suggested API changes: GET /api/public/summary, GET /api/public/claims.
- Suggested UI changes: public stats widgets and redacted public listing.
- Acceptance criteria: Public pages show processed and aggregate data, but not Aadhaar, account number, or family private details.
- Priority: P1
- Dependencies: application model and privacy policy

### 6.8 Gap 8: Volunteer and coordinator model
- Why it matters: Public trust ecosystems often depend on volunteers and district coordinators.
- Affected roles: volunteers, district admins, state admins
- Expected behavior: volunteer roles can support data collection and public awareness but cannot approve or release funds.
- Suggested database changes: volunteer_profiles and assignment_history.
- Suggested API changes: volunteer registration and assignment endpoints.
- Suggested UI changes: coordinator dashboard and assignment list.
- Acceptance criteria: volunteer actions are logged, limited, and role-guarded.
- Priority: P1
- Dependencies: organization role model

### 6.9 Gap 9: Legal and trust pages
- Why it matters: A public trust platform needs legal clarity.
- Affected roles: all users and public visitors
- Expected behavior: Privacy policy, terms, refund rules, and consent wording are visible to users before onboarding.
- Suggested database changes: legal_document and acceptance_tracking tables.
- Suggested API changes: update acceptance and view tracking endpoints.
- Suggested UI changes: required checkboxes during signup and links in footer.
- Acceptance criteria: Each user accepts current policies before registration or claim submission.
- Priority: P0
- Dependencies: legal review and content approval

### 6.10 Gap 10: Notifications and communication workflows
- Why it matters: Users need status updates after approval, rejection, payment, and document requests.
- Affected roles: user, admin, volunteer
- Expected behavior: notifications are sent for application status changes, document requests, rejection reasons, and payouts.
- Suggested database changes: notifications and notification_preferences.
- Suggested API changes: send-notification job endpoints and schedule-based review.
- Suggested UI changes: inbox panel and email/SMS templates.
- Acceptance criteria: each significant milestone triggers a message and can be reviewed later.
- Priority: P1
- Dependencies: email service and application workflow

## 7. Recommended SWS Role Model

The role model should be explicit and district-aware. A district admin must never be able to act outside their assigned district without explicit multi-district authorization.

| Role | Scope | Permissions | Data visibility | Approval authority | Restrictions | Audit requirements |
|---|---|---|---|---|---|---|
| Main Admin | Whole platform | Full platform access | Full access | All decisions, role assignment | Must be separate from operational roles | Must log every action |
| Co-Admin | Platform operations | High-level operations but not complete ownership | Broad but constrained | Approvals and escalation | Cannot change core platform settings without main admin | Full audit trail |
| State Admin | Statewide oversight | Cross-district review and reporting | All districts within assigned state | Cross-district escalation and final review | Not allowed to change district-specific private docs without approval | State-level reasoning and signed actions |
| District Admin | Single district | Approve/reject local members and claims | Only assigned district data | Local approvals and document verification | Cannot access other districts | Audit every district action |
| Co-District Admin / Deputy District Coordinator | District support | Support review and document checklists | Assigned district only | Helps with workflow but not final payout decisions | Cannot approve final payout without district admin | Full action log |
| Volunteer | Community support | Data collection and awareness support | Limited to assigned outreach area | No financial decision rights | Cannot access private files or payouts | Must log interactions |
| Registered User | Personal account | Own profile, applications, documents, status tracking | Own data and assigned claim data only | Can apply and submit own requests | Cannot access other users or public admin pages | Each application submission recorded |
| Nominee or Beneficiary | Claimant or family member | Limited claim-related access | Own records and relationship-linked data | Can provide details, upload documents | Cannot see other claimants or modify final decisions | Every claim-related action logged |

## 8. Recommended Welfare Application Workflow

The workflow below is the recommended architecture for SWS to become a production-ready welfare trust platform.

1. User selects a scheme.
2. User fills application form with required personal and family details.
3. User uploads supporting documents (ID, proof, death or retirement certificate, bank proof, etc.).
4. System validates required data and catches format errors.
5. Application is submitted and assigned a unique application number.
6. District admin or assigned reviewer reviews the application.
7. Documents are verified against the claim criteria and metadata.
8. Application is approved, rejected, or returned for correction with reason codes.
9. If approved, payment is initiated by finance or designated admin.
10. Payment is verified using transaction reference and proof attachment.
11. Applicant receives notification about the result.
12. Case is closed and archived for historical transparency.
13. Public transparency view updates aggregate summary without exposing private details.

Required statuses:
- draft
- submitted
- awaiting_review
- under_verification
- returned_for_correction
- approved
- rejected
- payment_initiated
- payment_verified
- closed

Required audit history:
- created
- edited
- submitted
- document_uploaded
- document_verified
- status_changed
- payment_initiated
- payment_verified
- rejected
- closed

## 9. Security and Privacy Gap Analysis

### 9.1 Authentication
Status: Partially Implemented
- Credentials-based login is present in NextAuth and is functional.
- Missing: email verification, OTP, 2FA, rate limiting, password reset abuse prevention, and device logging.

### 9.2 Authorization and RBAC
Status: Partially Implemented
- There is a basic is_admin and role check in lib/auth.ts.
- But the role model is not complete enough for state/district/volunteer governance.
- There is no clear policy that all APIs reject unauthorized district access.

### 9.3 District-level data isolation
Status: Partially Implemented
- District filter logic exists in lib/db.ts via applyDistrictFilter.
- However, the lower-level enforcement is not comprehensive across all tables and APIs.
- This is a security risk if district admins can query all records by accident or by bypass in future edits.

### 9.4 Supabase Row Level Security
Status: Partially Implemented
- schema.sql enables RLS on tables, but the actual policies are minimal and service-role-based.
- This is not enough for a multi-tenant and privacy-sensitive trust platform.

### 9.5 API authorization
Status: Partially Implemented
- Most admin routes call requireAdmin().
- But there is no consistent district-scoped authorization enforcement on admin or user queries.

### 9.6 Password hashing and session security
Status: Implemented
- Password hashing uses bcryptjs.
- Sessions use NextAuth JWT strategy.
- However there is no explicit multi-factor protection or hardened session rotation policy.

### 9.7 OTP/email verification and reset security
Status: Partially Implemented
- Reset flow exists but email is not actually sent.
- No email verification step exists for new users.
- This is a material weakness.

### 9.8 Rate limiting and abuse prevention
Status: Missing
- No rate limiting is evident for login attempts, signup, reset requests, or document upload endpoints.
- This is a serious risk for public access.

### 9.9 File type and size validation
Status: Missing
- No document upload validator is present.
- This creates risk for unsafe or oversized file submissions.

### 9.10 Private document storage
Status: Missing
- There is no secure document table or storage policy in the repo.
- Welfare claims require privacy-safe handling beyond simple database tables.

### 9.11 Aadhaar, bank, and identity protection
Status: Partially Implemented / Risky
- Identity and bank fields are collected and stored in users.
- There is no masking policy or restricted viewing model in the current code.
- This creates risk if these fields are ever rendered publicly.

### 9.12 Audit logs and admin accountability
Status: Missing
- There is no explicit action log or approval timeline attached to user or welfare decisions.

### 9.13 Admin 2FA
Status: Missing
- No evidence of MFA or 2FA is present in code or architecture.

### 9.14 Backup and recovery
Status: Not Verified
- No runbook or automated strategy is visible.

### 9.15 Secrets and env configuration
Status: Partially Implemented
- Environment variables are used for auth and Supabase config, but the project must enforce strict secret management and production guardrails.

### 9.16 Sensitive data exposure risks
High-risk findings:
- Bank details and Aadhaar/PAN data are stored in the main users table without a masking model.
- No document privacy segmentation exists.
- No public listing rules avoid leaking private personal data.

## 10. Responsive and Accessibility Gap Analysis

### 10.1 Mobile layout
Status: Partially Implemented
- Tailwind CSS suggests responsive design patterns, but the application was not fully audited for every key workflow.
- Need QA specifically on signup, admin approval, and dashboard flows.

### 10.2 Tablet and desktop layout
Status: Partially Implemented
- Layout foundations are good, but large tables and admin panel screens need stress testing.

### 10.3 Navigation
Status: Partially Implemented
- Navigation exists, but there is no clear information architecture for claims, files, and application status.

### 10.4 Forms
Status: Partially Implemented
- Forms are validated but have limited support for bilingual labels, field recommendations, and accessible error associations.

### 10.5 Tables and admin dashboards
Status: Partially Implemented
- Admin tables exist but search and accessibility patterns need full review.

### 10.6 File uploads
Status: Missing
- No file upload UX or validation workflow exists.

### 10.7 Validation messages and user feedback
Status: Partially Implemented
- Basic validation errors exist for signup and reset.
- More structured messaging is required for workflow rejections and payment failures.

### 10.8 Keyboard navigation and focus states
Status: Partially Implemented
- No explicit accessibility audit was found.
- This needs to be measured before production launch.

### 10.9 Screen-reader labels and contrast
Status: Partially Implemented
- Tailwind aesthetics are likely acceptable on the surface, but labels and semantics need formal testing.

### 10.10 Hindi text rendering
Status: Missing / Partially Implemented
- Public TRCTUP site contains Hindi content, but SWS is currently effectively English-first.
- If the business objective includes Hindi support, this must be built in deliberately.

## 11. Implementation Roadmap

### P0 – Must fix before production
- Complete role hierarchy and district-boundary enforcement.
- Add secure document storage and validation.
- Add audit log model.
- Add privacy policy and terms acceptance.
- Add complete welfare application workflow.
- Add payment ledger, proof, and UTR capture.
- Add email verification and reset delivery.
- Add rate limiting and abuse protection.
- Fix public/private data separation and masking.

### P1 – Required for operational launch
- Member profile management.
- Notification system.
- Public transparency dashboard.
- Search and filtering for applications and members.
- Reports and analytics.
- Payment verification tracking.
- District admin escalation flow.
- Better admin review history and rejection reasons.

### P2 – Important improvements
- Hindi/English bilingual support.
- Rich gallery and media content.
- SEO metadata and sitemap.
- Accessibility pass and keyboard testing.
- Better admin UX and report exports.

### P3 – Optional future enhancements
- Mobile app companion.
- Payment gateway integration.
- Advanced analytics and donor dashboards.
- External CRM and notification integrations.

## 12. Final Recommendation

### What SWS already does well
- Member registration and admin approval flow are present and functional.
- The backend schema is structured around real members, districts, contributions, and death records.
- Core dashboards and admin review processes are in place.
- The app has a credible starting architecture for a welfare trust platform.

### What is still missing
- A complete welfare application lifecycle.
- Secure document storage and verification.
- Payment ledger and UTR tracking.
- Full district/state/volunteer hierarchy.
- Email verification and operational notifications.
- Audit trails and legal policy pages.
- Public transparency layer that protects private identity data.

### Top 10 implementation tasks
1. Define scheme and application data model.
2. Build document upload and verification flow.
3. Add payment ledger and UTR tracking.
4. Build full application review and rejection workflow.
5. Add audit logs for all status changes.
6. Implement real email-based verification and reset delivery.
7. Harden RBAC and district isolation rules.
8. Add privacy-safe public transparency dashboard.
9. Add legal pages with consent tracking.
10. Add notification and status tracking for applicants.

### Is the current application ready for production?
No. The current SWS application is not yet production-ready as a public-facing welfare trust platform. It is viable as a foundation and should be treated as a strong internal prototype, but it still requires security hardening and workflow completion before real public risk is acceptable.

### Exact next development sprint
Recommended next sprint (Sprint 1): security + governance + workflow foundation
- Add legal pages and consent acceptance.
- Define scheme/application model.
- Add document upload and secure storage.
- Add payment ledger and UTR tracking.
- Add audit log and role enforcement.
- Add email verification and real reset email provider.
- Add district enforcement across all admin queries.

### Functionality that should not be copied from TRCTUP
- Exact branding, logos, images, or content.
- Any direct replication of a proprietary or copyrighted public design.
- Internal operational assumptions that are not verified or appropriate for SWS.
- Any legal or financial process that has not been reviewed against compliance, governance, and business requirements.

The right approach is to learn from TRCTUP’s public business model and trust structure, but rebuild the SWS platform with its own secure, transparent, role-aware, and legally defensible implementation.

## Final status
This analysis is intentionally conservative and evidence-based. Where the public website or the codebase does not support a claim, it is labeled as Not Verified instead of assumed. This preserves the difference between a public-facing informational brand and an operational welfare platform with real governance, payment controls, and data protections.
