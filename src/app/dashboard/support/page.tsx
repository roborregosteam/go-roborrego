import { redirect } from "next/navigation";
import { auth } from "~/server/auth";
import { SupportClient } from "./SupportClient";

export default async function SupportPage() {
  const session = await auth();
  if (!session?.user) redirect("/api/auth/signin");

  return <SupportClient />;
}
