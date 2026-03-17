/**
 * Microsoft OAuth callback — exchanges the auth code for tokens and stores them.
 */
import { auth } from "~/server/auth";
import { db } from "~/server/db";
import { env } from "~/env.js";

const SCOPES =
  "offline_access Calendars.ReadWrite OnlineMeetings.ReadWrite ChannelMessage.Send Channel.ReadBasic.All User.Read";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");
  const profileUrl = `${url.origin}/dashboard/profile/edit`;

  if (error) {
    return Response.redirect(`${profileUrl}?ms_error=${encodeURIComponent(error)}`);
  }
  if (!code || !state) {
    return Response.redirect(`${profileUrl}?ms_error=missing_params`);
  }

  // Verify the authenticated user matches the state (userId)
  const session = await auth();
  if (!session?.user?.id || session.user.id !== state) {
    return Response.redirect(`${profileUrl}?ms_error=session_mismatch`);
  }

  if (!env.MICROSOFT_CLIENT_ID || !env.MICROSOFT_CLIENT_SECRET || !env.MICROSOFT_TENANT_ID) {
    return Response.redirect(`${profileUrl}?ms_error=not_configured`);
  }

  const params = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: env.MICROSOFT_CLIENT_ID,
    client_secret: env.MICROSOFT_CLIENT_SECRET,
    code,
    redirect_uri: `${url.origin}/api/auth/microsoft/callback`,
    scope: SCOPES,
  });

  const tokenRes = await fetch(
    `https://login.microsoftonline.com/${env.MICROSOFT_TENANT_ID}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    },
  );

  if (!tokenRes.ok) {
    return Response.redirect(`${profileUrl}?ms_error=token_exchange_failed`);
  }

  const tokens = (await tokenRes.json()) as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };

  await db.user.update({
    where: { id: session.user.id },
    data: {
      msAccessToken: tokens.access_token,
      msRefreshToken: tokens.refresh_token,
      msTokenExpiry: new Date(Date.now() + tokens.expires_in * 1000),
    },
  });

  return Response.redirect(`${profileUrl}?ms_connected=1`);
}
