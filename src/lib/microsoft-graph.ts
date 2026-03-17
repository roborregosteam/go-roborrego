/**
 * Microsoft Graph API helpers.
 * All functions are server-only — tokens are never exposed to the browser.
 */
import "server-only";

import { env } from "~/env.js";
import { db } from "~/server/db";

const GRAPH = "https://graph.microsoft.com/v1.0";
const MS_CONFIGURED =
  !!env.MICROSOFT_CLIENT_ID &&
  !!env.MICROSOFT_CLIENT_SECRET &&
  !!env.MICROSOFT_TENANT_ID;

const SCOPES =
  "offline_access Calendars.ReadWrite OnlineMeetings.ReadWrite ChannelMessage.Send Channel.ReadBasic.All User.Read";

// ─── Token management ─────────────────────────────────────────────────────────

/**
 * Returns a valid access token for the given user, refreshing if near expiry.
 * Returns null if the user has no Microsoft account connected or refresh fails.
 */
export async function getMsToken(userId: string): Promise<string | null> {
  if (!MS_CONFIGURED) return null;

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { msAccessToken: true, msRefreshToken: true, msTokenExpiry: true },
  });
  if (!user?.msRefreshToken) return null;

  // Still valid with 5-min buffer
  if (
    user.msAccessToken &&
    user.msTokenExpiry &&
    user.msTokenExpiry > new Date(Date.now() + 5 * 60 * 1000)
  ) {
    return user.msAccessToken;
  }

  // Refresh
  const params = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: env.MICROSOFT_CLIENT_ID!,
    client_secret: env.MICROSOFT_CLIENT_SECRET!,
    refresh_token: user.msRefreshToken,
    scope: SCOPES,
  });

  const res = await fetch(
    `https://login.microsoftonline.com/${env.MICROSOFT_TENANT_ID}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    },
  );

  if (!res.ok) {
    // Token revoked or expired — clear it
    await db.user.update({
      where: { id: userId },
      data: { msAccessToken: null, msRefreshToken: null, msTokenExpiry: null },
    });
    return null;
  }

  const data = (await res.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
  };

  await db.user.update({
    where: { id: userId },
    data: {
      msAccessToken: data.access_token,
      msRefreshToken: data.refresh_token ?? user.msRefreshToken,
      msTokenExpiry: new Date(Date.now() + data.expires_in * 1000),
    },
  });

  return data.access_token;
}

// ─── Teams channels ───────────────────────────────────────────────────────────

export interface TeamsChannel {
  id: string;
  displayName: string;
  description?: string;
}

export async function getTeamsChannels(token: string): Promise<TeamsChannel[]> {
  if (!env.TEAMS_TEAM_ID) return [];

  const res = await fetch(`${GRAPH}/teams/${env.TEAMS_TEAM_ID}/channels`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Failed to fetch channels: ${res.status}`);

  const data = (await res.json()) as { value: TeamsChannel[] };
  // Filter out the General channel's private sub-channels etc.; return all accessible
  return data.value;
}

// ─── Calendar event + Teams meeting ──────────────────────────────────────────

export interface CreateEventResult {
  joinUrl: string;
  eventId: string;
}

/**
 * Creates an Outlook calendar event with an embedded Teams meeting link.
 * Sends calendar invites to all attendees.
 */
export async function createCalendarEvent(
  token: string,
  subject: string,
  description: string | null,
  startTime: Date,
  durationMinutes: number,
  attendees: { address: string; name: string | null }[],
): Promise<CreateEventResult> {
  const endTime = new Date(startTime.getTime() + durationMinutes * 60 * 1000);

  const body = {
    subject,
    body: {
      contentType: "HTML",
      content: description ?? subject,
    },
    start: { dateTime: startTime.toISOString().slice(0, 19), timeZone: "UTC" },
    end: { dateTime: endTime.toISOString().slice(0, 19), timeZone: "UTC" },
    location: { displayName: "Microsoft Teams Meeting" },
    isOnlineMeeting: true,
    onlineMeetingProvider: "teamsForBusiness",
    attendees: attendees.map((a) => ({
      emailAddress: { address: a.address, name: a.name ?? a.address },
      type: "required",
    })),
  };

  const res = await fetch(`${GRAPH}/me/events`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to create calendar event: ${err}`);
  }

  const event = (await res.json()) as {
    id: string;
    onlineMeeting: { joinUrl: string };
  };
  return { joinUrl: event.onlineMeeting.joinUrl, eventId: event.id };
}

// ─── Teams channel message ────────────────────────────────────────────────────

/** Posts a meeting announcement to a Teams channel. */
export async function postChannelMessage(
  token: string,
  channelId: string,
  subject: string,
  startTime: Date,
  durationMinutes: number,
  joinUrl: string,
): Promise<void> {
  if (!env.TEAMS_TEAM_ID) return;

  const formatted = startTime.toLocaleString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
    timeZoneName: "short",
  });

  const res = await fetch(
    `${GRAPH}/teams/${env.TEAMS_TEAM_ID}/channels/${channelId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        body: {
          contentType: "html",
          content:
            `<b>📅 New Meeting: ${subject}</b><br>` +
            `${formatted} · ${durationMinutes} min<br><br>` +
            `<a href="${joinUrl}">Join Teams Meeting</a>`,
        },
      }),
    },
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to post to channel: ${err}`);
  }
}

// ─── Delete Outlook event ─────────────────────────────────────────────────────

export async function deleteOutlookEvent(
  token: string,
  eventId: string,
): Promise<void> {
  await fetch(`${GRAPH}/me/events/${eventId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  // 204 No Content on success; ignore errors (event may already be gone)
}
