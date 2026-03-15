import { redirect } from "next/navigation";
import { auth } from "~/server/auth";
import { ProjectsClient } from "./_components/ProjectsClient";

export default async function ProjectsPage() {
  const session = await auth();
  if (!session?.user) redirect("/api/auth/signin");
  if (session.user.role === "VIEWER") redirect("/dashboard");

  return (
    <ProjectsClient
      userId={session.user.id}
      userRole={session.user.role}
    />
  );
}
