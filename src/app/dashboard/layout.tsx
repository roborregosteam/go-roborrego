import { redirect } from "next/navigation";
import Link from "next/link";

import { auth, signOut } from "~/server/auth";
import { UserMenu } from "./_components/UserMenu";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/api/auth/signin");

  const role = session.user.role;

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-[#1a2744] text-white flex flex-col">
        <div className="p-6 border-b border-white/10">
          <span className="text-xl font-bold tracking-tight">RoBorregos</span>
          <p className="text-xs text-blue-300 mt-1">Team Management</p>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          <NavLink href="/dashboard">Dashboard</NavLink>
          <NavLink href="/dashboard/members">Members</NavLink>
          <NavLink href="/dashboard/workplan">Work Plan</NavLink>
          {(role === "ADMIN" || role === "MEMBER") && (
            <>
              <NavLink href="/dashboard/attendance">Attendance</NavLink>
              <NavLink href="/dashboard/projects">Projects</NavLink>
            </>
          )}
          {role === "ADMIN" && (
            <>
              <NavLink href="/dashboard/admin/members">Roster</NavLink>
              <NavLink href="/dashboard/admin/profile-approvals">Profile Approvals</NavLink>
              <NavLink href="/dashboard/admin">Admin</NavLink>
            </>
          )}
          <NavLink href="/dashboard/support">Report Issue</NavLink>
        </nav>

        <div className="p-3 border-t border-white/10">
          <UserMenu
            id={session.user.id}
            name={session.user.name ?? null}
            email={session.user.email ?? null}
            image={session.user.image ?? null}
            role={role}
            signOutAction={async () => {
              "use server";
              await signOut({ redirectTo: "/" });
            }}
          />
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}

function NavLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="block px-3 py-2 rounded-md text-sm font-medium text-blue-100 hover:bg-white/10 hover:text-white transition-colors"
    >
      {children}
    </Link>
  );
}
