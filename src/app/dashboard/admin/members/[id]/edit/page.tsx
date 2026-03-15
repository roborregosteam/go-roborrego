import { notFound, redirect } from "next/navigation";

import { auth } from "~/server/auth";
import { api } from "~/trpc/server";
import { EditMemberForm } from "./_components/EditMemberForm";

export default async function AdminEditMemberPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (session?.user.role !== "ADMIN") redirect("/dashboard");

  const member = await api.member.getById({ id }).catch(() => null);
  if (!member) notFound();

  return (
    <div className="max-w-xl">
      <EditMemberForm member={member} />
    </div>
  );
}
