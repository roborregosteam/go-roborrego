import { auth } from "~/server/auth";
import { WorkPlanClient } from "./_components/WorkPlanClient";

export default async function WorkPlanPage() {
  const session = await auth();
  const isAdmin = session?.user.role === "ADMIN";
  const userId = session?.user.id ?? "";

  return <WorkPlanClient isAdmin={isAdmin} userId={userId} />;
}
