import { redirect } from "next/navigation";

import { auth } from "~/server/auth";
import { RosterClient } from "./_components/RosterClient";

export default async function AdminRosterPage() {
  const session = await auth();
  if (session?.user.role !== "ADMIN") redirect("/dashboard");

  return <RosterClient />;
}
