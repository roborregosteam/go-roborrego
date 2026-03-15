# RoBorregos — Team Management Platform

Internal platform for [RoBorregos](https://roborregos.com), the robotics team of Tecnológico de Monterrey. Manages members, projects, work plans, attendance, and more.

---

## Features

- **Members** — directory, profiles, sub-team grouping, role-based access (Viewer / Member / Admin)
- **Work Plan** — semesters, activities with points, interest tracking, admin approval of completions, leaderboard
- **Attendance** — meetings with QR code check-in, self check-in, admin manual check-in, anonymous feedback, attendance reports
- **Projects** — Kanban board (TODO → In Progress → In Review → Done), task assignments and comments, project members with roles, private projects
- **Roster Management** — admin pre-registers members by email; only registered emails can sign in
- **Profile Approvals** — members submit profile changes; admins review and approve/reject with a diff view
- **MCP Server** — AI assistant integration via stdio (local) and HTTP (API key auth) following the Model Context Protocol
- **Issue Reporting** — `/dashboard/support` links directly to GitHub issue templates

---

## Stack

| Layer | Tech |
|---|---|
| Framework | Next.js 15 (App Router) |
| API | tRPC v11 + SuperJSON |
| ORM | Prisma 6 (PostgreSQL) |
| Auth | NextAuth v5 beta — Google OAuth, allowlist-based |
| Styling | Tailwind CSS v4 |
| Storage | Supabase Storage |
| MCP | `@modelcontextprotocol/sdk` |
| Language | TypeScript (strict) |

---

## Getting Started

### Prerequisites

- Node.js 20+
- Docker (for local PostgreSQL) or a hosted PostgreSQL instance
- A Google Cloud project with OAuth 2.0 credentials
- A Supabase project (for file uploads)

### Setup

```bash
# 1. Clone and install
git clone https://github.com/RoBorregos/go-roborrego.git
cd go-roborrego
npm install

# 2. Configure environment
cp .env.example .env
# Fill in the values — see Environment Variables below

# 3. Start the database (Docker)
./start-database.sh

# 4. Push schema and generate Prisma client
npm run db:push

# 5. Start the dev server
npm run dev         # localhost:3000
# or expose on all interfaces (e.g. Tailscale):
./dev.sh
```

### Environment Variables

| Variable | Description |
|---|---|
| `AUTH_SECRET` | Random secret — run `npx auth secret` |
| `AUTH_GOOGLE_ID` | Google OAuth client ID |
| `AUTH_GOOGLE_SECRET` | Google OAuth client secret |
| `DATABASE_URL` | PostgreSQL connection string |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-only) |

### Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com) → APIs & Services → Credentials
2. Create an OAuth 2.0 client (Web application)
3. Add authorised redirect URI: `http://localhost:3000/api/auth/callback/google`
4. Copy the client ID and secret into `.env`

### Supabase Storage Setup

1. Create a Supabase project
2. Create two Storage buckets: `avatars` (public) and `task-attachments` (private)
3. Add a public-read policy on `avatars`:
```sql
CREATE POLICY "Public read avatars" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
```

---

## Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start Next.js dev server with Turbo |
| `./dev.sh` | Dev server exposed on all interfaces (port 3000) |
| `npm run build` | Production build |
| `npm run db:push` | Push schema changes + regenerate Prisma client |
| `npm run db:studio` | Open Prisma Studio |
| `npm run mcp` | Start the stdio MCP server |
| `npm run typecheck` | TypeScript type check |
| `npm run lint` | ESLint |

---

## MCP Integration

The platform exposes data and actions via the [Model Context Protocol](https://modelcontextprotocol.io), allowing AI assistants to query and act on platform data.

### Stdio (local, Claude Desktop / Claude Code)

```bash
npm run mcp
```

Add to `~/.claude/claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "roborrego": {
      "command": "npm",
      "args": ["run", "mcp"],
      "cwd": "/path/to/go-roborrego"
    }
  }
}
```

### HTTP (hosted, API key auth)

```
POST /api/mcp
Authorization: Bearer <your_api_key>
Content-Type: application/json
```

Generate an API key from `/dashboard/profile/edit`. Keys expire after 3 hours and carry the same permissions as your user role.

Available tools: `list_members`, `list_projects`, `get_project`, `list_meetings`, `get_attendance_report`, `get_workplan_leaderboard`, `get_active_semester`, `create_task`, `register_member` (admin), `create_meeting` (admin).

---

## First Login / Bootstrap

The first user to sign in with any Google account automatically becomes the system's first admin (no pre-registration needed). All subsequent sign-ins require the user to be pre-registered by an admin from the Roster page.

---

## Architecture Notes

See [CLAUDE.md](./CLAUDE.md) for detailed developer notes including conventions, known gotchas, and schema documentation.
