import { redirect } from "next/navigation";
import { auth } from "~/server/auth";
import { AdminDashboardClient } from "./_components/AdminDashboardClient";

export default async function AdminPage() {
  const session = await auth();
  if (!session?.user) redirect("/api/auth/signin");
  if (session.user.role !== "ADMIN") redirect("/dashboard");

  return <AdminDashboardClient />;
}
