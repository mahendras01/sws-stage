Updated SWS Changes – Safe Implementation Plan
Role
You are a senior product analyst, solution architect, and full-stack developer working on the existing Self Welfare Society (SWS) web application.
Context
Read sws-trct.md first. It contains the functional comparison between the existing SWS application and the public functionality of https://trctup.com/.
The objective is not to rebuild SWS from scratch. Identify and plan incremental, backward-compatible changes without breaking existing functionality, losing data, weakening security, or changing existing API contracts unnecessarily.
Task
Inspect the actual SWS source code, routes, components, API routes, database schema, authentication, authorization, Supabase RLS policies, storage buckets, and existing workflows.
Create or update a new Markdown file named:
updated-sws-changes.md
This file must contain a prioritized, implementation-ready summary of changes required in the existing SWS application based on sws-trct.md.
Do not implement code in this task. Only analyze and document the safe change plan.
Status Definitions
Use these statuses:
* Already Implemented
* Partially Implemented
* Missing
* Needs Verification
* Improvement Required
* Not Required
* Blocked by Dependency
Use these priorities:
* P0: Critical security, authorization, data-loss, or production-blocking issue
* P1: Required for core SWS operations
* P2: Important usability, transparency, reporting, or maintainability improvement
* P3: Optional future enhancement
Mandatory Safety Rules
1. Inspect the current code before proposing changes.
2. Do not mark a feature as implemented merely because a page or menu item exists.
3. Do not rewrite working modules unnecessarily.
4. Prefer small, isolated, backward-compatible changes.
5. Do not delete existing files, tables, routes, columns, or data.
6. Do not change existing API response contracts without checking all consumers.
7. Prefer additive database migrations.
8. Document migration, rollback, and regression risks.
9. Do not weaken authentication, authorization, or Supabase RLS.
10. Enforce district-level data isolation on the server side.
11. Do not expose Aadhaar, bank details, nominee details, mobile numbers, or private documents publicly.
12. Do not install dependencies or modify environment variables.
13. Do not run destructive commands.
14. Do not claim tests passed unless they were actually executed.
15. Mark unclear items as Needs Verification instead of guessing.
Required Document Structure
1. Document Metadata
Include:
* Title
* Last Updated date
* Source file: sws-trct.md
* Reference website
* Scope
* Change Log
2. Executive Summary
Summarize:
* Current SWS maturity.
* Main gaps from the TRCT comparison.
* Critical production risks.
* Changes possible without architectural redesign.
* Changes requiring database/API migration.
* Recommended incremental delivery approach.
3. Existing SWS Baseline
Document the verified current implementation:
* Public routes/pages.
* User routes/pages.
* Admin routes/pages.
* Components.
* API endpoints.
* Database tables.
* Authentication/session logic.
* Roles and permissions.
* Supabase RLS policies.
* Storage buckets and file access.
* Existing workflows.
* Existing tests and deployment configuration.
Include actual file paths, route names, component names, API endpoints, and database objects wherever available.
4. Change Summary Matrix
Create this table:
Change ID	Module	Current Status	Required Change	Reason	Priority	Risk	Dependencies	Files/Routes Affected	Database Impact	API Impact	UI Impact	Rollback Approach
Cover all relevant items from sws-trct.md, including:
* Public pages and content.
* Sahyog, Jivandan, and Kanyadan.
* Registration, login, forgot password, and verification.
* User profile and membership approval.
* State, district, and co-district administration.
* Volunteers and member directory.
* Welfare applications and document upload.
* Nominee management.
* Application status, approval, rejection, and correction workflow.
* Payment tracking, payment proof, and UTR/reference number.
* Financial transparency.
* Notifications and announcements.
* Reports, search, and filtering.
* Audit logs.
* RBAC and Supabase RLS.
* File security.
* Responsive design, accessibility, Hindi/English support, SEO, and legal pages.
* Backup, monitoring, performance, and error handling.
5. Prioritized Change List
P0 – Must Fix Before Production
Include critical security, authorization, data leakage, authentication, RLS, file-security, and data-loss risks.
P1 – Core Operational Changes
Include membership approval, district administration, Co-District Admin, welfare workflow, document verification, nominee management, payment tracking, notifications, and audit history.
P2 – Important Improvements
Include reports, search/filtering, transparency dashboard, bilingual support, mobile responsiveness, accessibility, announcements, and activity gallery.
P3 – Future Enhancements
Include payment gateway integration, automation, advanced analytics, external integrations, and mobile app.
6. Detailed Change Specification
For every important change, use:
Change ID: SWS-XXX
* Title:
* Module:
* Priority:
* Current Status:
* Business Objective:
* Problem Statement:
* Verified Current Implementation:
* Required Behavior:
* Affected Roles:
* Affected Routes/Pages:
* Affected Components:
* Affected API Routes:
* Affected Database Tables:
* Required Migration:
* RLS/Authorization Impact:
* UI Changes:
* Validation Rules:
* Security Considerations:
* Backward Compatibility:
* Regression Risks:
* Dependencies:
* Implementation Steps:
* Testing Steps:
* Acceptance Criteria:
* Rollback Plan:
7. Role and Permission Plan
Review:
* Main Admin
* Co-Admin
* State Admin
* District Admin
* Co-District Admin or Deputy District Coordinator
* Volunteer
* Registered User
* Nominee/Beneficiary
For each role document scope, permissions, data visibility, approval authority, restrictions, and audit requirements.
District admins must access only their assigned district unless a higher-level permission explicitly allows broader access.
8. Safe Database Change Plan
For every database change document:
* Existing object affected.
* Additive or destructive nature.
* New columns/tables.
* Defaults and nullability.
* Indexes and foreign keys.
* Data migration.
* RLS impact.
* Backup requirement.
* Rollback strategy.
Never recommend dropping or renaming existing columns without a migration and rollback plan.
9. Safe API Change Plan
For every API change document:
* Existing endpoint.
* Proposed endpoint or modification.
* Request and response contracts.
* Authentication and role requirements.
* District-scope validation.
* Input validation.
* Error responses.
* Rate limiting.
* Audit logging.
* Backward compatibility.
10. Safe UI Change Plan
For every UI change document:
* Existing page/component.
* New behavior.
* Mobile/tablet/desktop behavior.
* Loading, empty, error, and permission-denied states.
* Validation messages.
* Accessibility.
* Hindi/English considerations.
* Reusable components to preserve.
11. Regression Prevention Plan
Include checks for:
* Public pages.
* Login/logout.
* Registration.
* Forgot password.
* User dashboard.
* Admin dashboard.
* District filtering.
* Welfare submission.
* File upload/download.
* Payment records.
* Notifications.
* Role restrictions.
* RLS.
* Existing database records.
* Existing API consumers.
* Environment variables.
Recommend:
* Git feature branches.
* Small commits.
* Database backup before migration.
* Staging verification.
* Smoke tests.
* Regression tests.
* Rollback procedure.
12. Implementation Roadmap
Provide a dependency-aware sequence:
1. Baseline and backup.
2. Security and authorization fixes.
3. Database migrations.
4. Role and district-scope enforcement.
5. Membership workflow.
6. Welfare workflow.
7. Document verification.
8. Payment tracking and audit history.
9. Notifications.
10. Public transparency.
11. Responsive/accessibility improvements.
12. Final regression and production-readiness testing.
13. Sprint Plan
Create small, independently testable sprints. For each sprint include:
* Objective.
* Change IDs.
* Files/modules affected.
* Database/API/UI changes.
* Testing scope.
* Definition of Done.
* Rollback point.
14. Final Recommendation
Include:
* Top 10 changes to implement first.
* Changes that must not be made directly in production.
* Changes requiring database backup/migration.
* Changes requiring security review.
* Changes safe to implement without affecting existing users.
* Whether SWS can be extended incrementally.
* The next exact Copilot implementation prompt.
Output Rules
* Use clear professional English.
* Be specific and evidence-based.
* Separate verified facts from recommendations.
* Do not invent functionality.
* Do not implement code.
* Do not modify unrelated files.
* Clearly list assumptions and unknowns.
* Keep the document maintainable for future updates.
