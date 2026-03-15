# TODO — Remaining Requirements

Tracks what is still needed from the SRS (v1.0, March 14 2026). Items are grouped by SRS section and roughly ordered by dependency.

---

## ✅ Done

- **Auth** — Google OAuth, `@tec.mx` restriction, session management, token rotation via NextAuth
- **RBAC** — `VIEWER / MEMBER / ADMIN` roles, `protectedProcedure / memberProcedure / adminProcedure` in tRPC
- **Member Profiles** — all profile fields, edit own profile, searchable/filterable member directory
- **Roster Management (partial)** — admin can update role/status/profile fields via `updateMember`
- **Work Plan** — semester management, activity CRUD, interest/completion flow, admin review, leaderboard, summary stats

---

## 🔲 Section 3.1 — Sponsor Dashboard

A separate public-facing site for sponsors (no auth required).

- [ ] **Landing page** — hero section with team branding + tagline, mission/history overview, recent achievements and awards
- [ ] **Sponsor recognition section** — sponsor logos with links
- [ ] **Events archive** — past events with results and photo galleries
- [ ] **Contact form** — for sponsors, media, and general inquiries (needs email delivery integration e.g. Resend)
- [ ] **Social/GitHub links** — footer with social media and GitHub org links

---

## ✅ Section 3.3.2 — Roster Management

- [x] **Admin roster page** — `/dashboard/admin/members`: table with search/filter, inline role/status/sub-team editing, activity summary columns
- [x] **Activity summary per member** — attendance rate (color-coded), approved work plan completions, last login shown in roster table
- [x] **Bulk CSV import** — upload CSV (`name, email, role, status, subTeam, phone, githubUsername`), preview with validation, upsert by email
- [x] **Member edit page** — `/dashboard/admin/members/[id]/edit`: full profile + admin fields (role, status)

---

## ✅ Section 3.4 — Project & Task Tracking

- [x] **Prisma schema** — `Project`, `Task`, `TaskComment`, `ProjectMember`, `TaskAssignee` models; `ProjectStatus`, `ProjectRole`, `TaskStatus`, `TaskPriority` enums
- [x] **Projects** — create/edit/archive projects (name, description, sub-team, start/end dates, status, linked GitHub repo); `/dashboard/projects`
- [x] **Project overview page** — stats (members, tasks, your role), team member list, editable details; Overview tab
- [x] **Kanban board** — per-project task board with 4 columns (TODO / IN_PROGRESS / IN_REVIEW / DONE), drag-and-drop via @dnd-kit; Board tab
- [x] **Tasks** — full CRUD with title, description, assignees (avatar stacks), priority, due date, labels, comments; TaskPanel drawer
- [x] **Project-based RBAC** — `PROJECT_MEMBER` can create tasks/comments; `PROJECT_MANAGER` can delete tasks, manage members; creator auto-becomes PM
- [ ] **GitHub integration** — display recent commits/PRs/CI status via GitHub API (repo link stored, API calls not yet implemented)
- [x] **File attachments** — task file attachments via Supabase Storage (`task-attachments` bucket); upload, view, remove in TaskPanel

---

## ✅ Section 3.6 — Attendance Tracking

- [x] **Prisma schema** — `Meeting`, `Attendance`, `AttendanceMethod` enum
- [x] **Meeting management** — admin creates/edits/deletes meetings (`/dashboard/attendance` → Manage Meetings tab)
- [x] **QR code check-in** — per-meeting QR code displayed in admin; scanning `/dashboard/attendance/checkin?token=<token>` auto-checks in
- [x] **Manual check-in** — member self-check-in button on Meetings tab; admin batch check-in (mark present / remove) in attendees panel
- [x] **Late check-ins** — check-ins >15 min after start are marked `isLate`
- [x] **Attendance reporting** — Report tab: per-member attended/total/rate/late, filterable by date range
- [x] **Team/sub-team dashboards** — report grouped by `subTeam`
- [x] **Configurable thresholds** — green ≥80%, yellow ≥60%, red <60% (client-side constants in `AdminReportTab`)

---

## 🔲 Section 3.5 / Data Model — Budget & Finance

Referenced in the data model (`BudgetCategory`, `Expense`) but not in a numbered SRS section.

- [ ] **Prisma schema** — add `BudgetCategory` (name, allocatedAmount, semester) and `Expense` (amount, description, category, status, receiptUrl, submittedBy) models
- [ ] **Expense submission** — members submit expense requests with amount, description, category, receipt upload
- [ ] **Admin approval** — admin approves/rejects expense requests
- [ ] **Budget overview** — per-category spending vs. allocation dashboard

---

## 🔲 Data Model — Events

Referenced in the data model (`Event`, RSVPs) but not fully specified in a section.

- [ ] **Prisma schema** — add `Event` (title, description, dateTime, location, type, visibility, isRecurring) and `EventRSVP` models
- [ ] **Event calendar** — view upcoming and past events
- [ ] **RSVP** — members can RSVP to events
- [ ] **Recurring events** — support for weekly/recurring meeting events

---

## 🔲 Section 4.5 — Accessibility

- [ ] Audit all pages for WCAG 2.1 AA compliance
- [ ] Ensure semantic HTML throughout (`<nav>`, `<main>`, `<section>`, `<article>`, proper heading hierarchy)
- [ ] Full keyboard navigation (focus traps in modals, skip-to-content link)
- [ ] Sufficient color contrast (especially blue-on-dark-blue in sidebar)
- [ ] Screen reader support (`aria-label`, `aria-live` for dynamic updates)
- [ ] Responsive layout audit on tablet and mobile viewports

---

## 🔲 Section 4.6 / 7.2 — CI/CD Pipeline

- [ ] **GitHub Actions workflow** — trigger on push to `main` and PRs
- [ ] Steps: lint (`eslint`), type-check (`tsc --noEmit`), build (`next build`)
- [ ] Preview deployments on every PR (Vercel integration)
- [ ] Auto-deploy to production on merge to `main`

---

## 🔲 Section 7.3 — Hosting & Infrastructure

- [ ] Set up managed PostgreSQL (Neon, Supabase, or Railway)
- [ ] Set up Supabase Storage for file uploads — **code is ready; create buckets and add env vars** (see below)
- [ ] Configure Vercel project with environment variables
- [ ] Add `next/image` with allowed remote domains for Google profile photos and Supabase storage

---

## 🔲 Miscellaneous / Nice-to-have

- [x] **Profile photo upload** — upload custom avatar via Supabase Storage (`avatars` bucket); shown on profile edit page with live preview
- [ ] **Notifications** — in-app or email notification when a completion is approved/rejected
- [x] **Admin dashboard** — `/dashboard/admin` overview page with stat cards, pending completions quick-review, upcoming meetings, roster health bar, quick links
- [x] **Semester work plan for other member's view** — admin can view any member's work plan progress at `/dashboard/workplan/[memberId]`, linked from the roster table
