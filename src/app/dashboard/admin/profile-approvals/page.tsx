import { redirect } from "next/navigation";

import { auth } from "~/server/auth";
import { ProfileApprovalsClient } from "./_components/ProfileApprovalsClient";

export default async function ProfileApprovalsPage() {
  const session = await auth();
  if (session?.user.role !== "ADMIN") redirect("/dashboard");

  return <ProfileApprovalsClient />;
}
