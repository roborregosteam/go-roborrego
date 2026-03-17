/**
 * Initiates Microsoft OAuth flow.
 * User must be signed in; their session ID is used as the state parameter.
 */
import { auth } from "~/server/auth";
import { env } from "~/env.js";

const SCOPES =
  "offline_access Calendars.ReadWrite OnlineMeetings.ReadWrite ChannelMessage.Send Channel.ReadBasic.All User.Read";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.redirect(new URL("/", request.url));
  }

  if (!env.MICROSOFT_CLIENT_ID || !env.MICROSOFT_TENANT_ID) {
    return Response.redirect(
      new URL("/dashboard/profile/edit?ms_error=not_configured", request.url),
    );
  }

  const origin = new URL(request.url).origin;
  const redirectUri = `${origin}/api/auth/microsoft/callback`;

  const params = new URLSearchParams({
    client_id: env.MICROSOFT_CLIENT_ID,
    response_type: "code",
    redirect_uri: redirectUri,
    scope: SCOPES,
    response_mode: "query",
    state: session.user.id,
  });

  return Response.redirect(
    `https://login.microsoftonline.com/${env.MICROSOFT_TENANT_ID}/oauth2/v2.0/authorize?${params.toString()}`,
  );
}
