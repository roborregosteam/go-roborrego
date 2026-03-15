import { redirect } from "next/navigation";
import { auth } from "~/server/auth";
import { ProjectClient } from "./_components/ProjectClient";

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/api/auth/signin");
  if (session.user.role === "VIEWER") redirect("/dashboard");

  const { id } = await params;

  return (
    <ProjectClient
      projectId={id}
      userId={session.user.id}
      userRole={session.user.role}
    />
  );
}
