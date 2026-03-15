import { auth } from "~/server/auth";
import { AttendanceClient } from "./_components/AttendanceClient";

export default async function AttendancePage() {
  const session = await auth();
  const isAdmin = session?.user.role === "ADMIN";
  const isMember =
    session?.user.role === "MEMBER" || session?.user.role === "ADMIN";

  return <AttendanceClient isAdmin={isAdmin} isMember={isMember} />;
}
