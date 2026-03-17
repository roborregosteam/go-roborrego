/**
 * Disconnects the user's Microsoft account by clearing stored tokens.
 */
import { auth } from "~/server/auth";
import { db } from "~/server/db";

export async function DELETE(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  await db.user.update({
    where: { id: session.user.id },
    data: { msAccessToken: null, msRefreshToken: null, msTokenExpiry: null },
  });

  return Response.json({ ok: true });
}
