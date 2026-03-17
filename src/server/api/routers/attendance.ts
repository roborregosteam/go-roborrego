import { TRPCError } from "@trpc/server";
import { z } from "zod";

import type { PrismaClient } from "../../../../generated/prisma";
import {
  createTRPCRouter,
  memberProcedure,
  protectedProcedure,
  adminProcedure,
} from "~/server/api/trpc";
import {
  getMsToken,
  getTeamsChannels,
  createCalendarEvent,
  postChannelMessage,
  deleteOutlookEvent,
} from "~/lib/microsoft-graph";
import { env } from "~/env.js";

// 15-minute grace period before a check-in is considered late
const LATE_GRACE_MS = 15 * 60 * 1000;

// ─── Permission helper ────────────────────────────────────────────────────────

async function canManageMeeting(
  db: PrismaClient,
  meetingId: string,
  userId: string,
  userRole: string,
): Promise<boolean> {
  if (userRole === "ADMIN") return true;
  const meeting = await db.meeting.findUnique({
    where: { id: meetingId },
    select: { createdBy: true, projectId: true },
  });
  if (!meeting) return false;
  if (meeting.createdBy === userId) return true;
  if (meeting.projectId) {
    const pm = await db.projectMember.findUnique({
      where: { projectId_userId: { projectId: meeting.projectId, userId } },
      select: { role: true },
    });
    return pm?.role === "PROJECT_MANAGER";
  }
  return false;
}

// ─── Router ───────────────────────────────────────────────────────────────────

export const attendanceRouter = createTRPCRouter({
  // ─── Meetings ───────────────────────────────────────────────────────────────

  getMeetings: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;
    const userRole = ctx.session.user.role;

    const [meetings, myProjectMemberships] = await Promise.all([
      ctx.db.meeting.findMany({
        orderBy: { startTime: "desc" },
        include: {
          _count: { select: { attendances: true } },
          project: { select: { id: true, name: true } },
          attendances: {
            where: { userId },
            select: { isLate: true, checkInTime: true },
          },
          feedbacks: {
            where: { userId },
            select: { rating: true, comment: true, isAnonymous: true },
          },
        },
      }),
      ctx.db.projectMember.findMany({
        where: { userId },
        select: { projectId: true, role: true },
      }),
    ]);

    const pmMap = new Map(myProjectMemberships.map((m) => [m.projectId, m.role]));

    return meetings.map(({ attendances, feedbacks, ...m }) => {
      const isOwner = m.createdBy === userId;
      const isPM = m.projectId ? pmMap.get(m.projectId) === "PROJECT_MANAGER" : false;
      const canManage = userRole === "ADMIN" || isOwner || isPM;
      const isAttendee = attendances.length > 0;
      const canEditNotes = canManage || (m.notesAllowAttendees && isAttendee);

      return {
        ...m,
        myAttendance: attendances[0] ?? null,
        myFeedback: feedbacks[0] ?? null,
        canManage,
        canEditNotes,
      };
    });
  }),

  getMeetingDetail: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const canManage = await canManageMeeting(
        ctx.db,
        input.id,
        ctx.session.user.id,
        ctx.session.user.role,
      );
      if (!canManage) throw new TRPCError({ code: "FORBIDDEN" });

      const [meeting, activeMembers] = await Promise.all([
        ctx.db.meeting.findUnique({
          where: { id: input.id },
          include: {
            attendances: {
              include: {
                user: {
                  select: { id: true, name: true, email: true, image: true },
                },
              },
              orderBy: { checkInTime: "asc" },
            },
            feedbacks: {
              include: {
                user: { select: { id: true, name: true, image: true } },
              },
              orderBy: { createdAt: "asc" },
            },
          },
        }),
        ctx.db.user.findMany({
          where: { status: "ACTIVE" },
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            subTeam: true,
          },
          orderBy: { name: "asc" },
        }),
      ]);
      if (!meeting) throw new TRPCError({ code: "NOT_FOUND" });
      const checkedInIds = new Set(meeting.attendances.map((a) => a.userId));
      return {
        ...meeting,
        feedbacks: meeting.feedbacks.map(({ user, ...f }) => ({
          ...f,
          user: f.isAnonymous ? null : user,
        })),
        members: activeMembers.map((m) => ({
          ...m,
          attendance:
            meeting.attendances.find((a) => a.userId === m.id) ?? null,
          isCheckedIn: checkedInIds.has(m.id),
        })),
      };
    }),

  // Returns the channels the current user can post to, or null if not connected.
  // Returns [] if MS env vars are not configured.
  getTeamsChannels: protectedProcedure.query(async ({ ctx }) => {
    if (!env.MICROSOFT_CLIENT_ID) return []; // not configured
    const token = await getMsToken(ctx.session.user.id);
    if (!token) return null; // connected but token invalid / not linked
    return getTeamsChannels(token);
  }),

  createMeeting: memberProcedure
    .input(
      z.object({
        title: z.string().min(1),
        description: z.string().optional(),
        startTime: z.date(),
        duration: z.number().int().positive().default(60),
        notesAllowAttendees: z.boolean().optional(),
        projectId: z.string().optional(),
        teamsChannelId: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { teamsChannelId, ...meetingData } = input;

      const meeting = await ctx.db.meeting.create({
        data: { ...meetingData, createdBy: ctx.session.user.id },
      });

      // Optionally integrate with Teams / Outlook
      if (teamsChannelId) {
        try {
          const token = await getMsToken(ctx.session.user.id);
          if (token) {
            // Fetch all active members as attendees
            const members = await ctx.db.user.findMany({
              where: { status: "ACTIVE" },
              select: { email: true, name: true },
            });

            const attendees = members
              .filter((m): m is typeof m & { email: string } => m.email !== null)
              .map((m) => ({ address: m.email, name: m.name }));

            const { joinUrl, eventId } = await createCalendarEvent(
              token,
              input.title,
              input.description ?? null,
              input.startTime,
              input.duration,
              attendees,
            );

            await postChannelMessage(
              token,
              teamsChannelId,
              input.title,
              input.startTime,
              input.duration,
              joinUrl,
            );

            return ctx.db.meeting.update({
              where: { id: meeting.id },
              data: { teamsJoinUrl: joinUrl, teamsChannelId, outlookEventId: eventId },
            });
          }
        } catch (e) {
          // Teams integration failed — meeting still created in our DB
          console.error("[Teams] createMeeting integration failed:", e);
        }
      }

      return meeting;
    }),

  updateMeeting: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        title: z.string().min(1).optional(),
        description: z.string().optional(),
        startTime: z.date().optional(),
        duration: z.number().int().positive().optional(),
        projectId: z.string().nullable().optional(),
        notesAllowAttendees: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const canManage = await canManageMeeting(
        ctx.db,
        input.id,
        ctx.session.user.id,
        ctx.session.user.role,
      );
      if (!canManage) throw new TRPCError({ code: "FORBIDDEN" });
      const { id, ...data } = input;
      return ctx.db.meeting.update({ where: { id }, data });
    }),

  deleteMeeting: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const canManage = await canManageMeeting(
        ctx.db,
        input.id,
        ctx.session.user.id,
        ctx.session.user.role,
      );
      if (!canManage) throw new TRPCError({ code: "FORBIDDEN" });

      // Delete Outlook event if the current user is the creator and has a token
      const meeting = await ctx.db.meeting.findUnique({
        where: { id: input.id },
        select: { outlookEventId: true, createdBy: true },
      });
      if (meeting?.outlookEventId && meeting.createdBy === ctx.session.user.id) {
        try {
          const token = await getMsToken(ctx.session.user.id);
          if (token) await deleteOutlookEvent(token, meeting.outlookEventId);
        } catch (e) {
          console.error("[Teams] deleteOutlookEvent failed:", e);
        }
      }

      return ctx.db.meeting.delete({ where: { id: input.id } });
    }),

  updateNotes: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        notes: z.string().nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const meeting = await ctx.db.meeting.findUnique({
        where: { id: input.id },
        select: {
          createdBy: true,
          projectId: true,
          notesAllowAttendees: true,
        },
      });
      if (!meeting) throw new TRPCError({ code: "NOT_FOUND" });

      const canManage = await canManageMeeting(
        ctx.db,
        input.id,
        ctx.session.user.id,
        ctx.session.user.role,
      );
      if (!canManage) {
        if (!meeting.notesAllowAttendees)
          throw new TRPCError({ code: "FORBIDDEN" });
        const attendance = await ctx.db.attendance.findUnique({
          where: {
            userId_meetingId: {
              userId: ctx.session.user.id,
              meetingId: input.id,
            },
          },
          select: { id: true },
        });
        if (!attendance) throw new TRPCError({ code: "FORBIDDEN" });
      }

      return ctx.db.meeting.update({
        where: { id: input.id },
        data: { notes: input.notes },
      });
    }),

  // ─── Check-in ────────────────────────────────────────────────────────────────

  checkInByToken: protectedProcedure
    .input(z.object({ token: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const meeting = await ctx.db.meeting.findUnique({
        where: { checkInToken: input.token },
      });
      if (!meeting)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invalid check-in code.",
        });

      const now = new Date();
      const isLate = now > new Date(meeting.startTime.getTime() + LATE_GRACE_MS);

      try {
        return await ctx.db.attendance.create({
          data: {
            userId: ctx.session.user.id,
            meetingId: meeting.id,
            checkInTime: now,
            method: "QR_CODE",
            isLate,
          },
          include: { meeting: { select: { title: true, startTime: true } } },
        });
      } catch {
        throw new TRPCError({
          code: "CONFLICT",
          message: "You have already checked in to this meeting.",
        });
      }
    }),

  selfCheckIn: memberProcedure
    .input(z.object({ meetingId: z.string(), note: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const meeting = await ctx.db.meeting.findUnique({
        where: { id: input.meetingId },
      });
      if (!meeting) throw new TRPCError({ code: "NOT_FOUND" });

      const now = new Date();
      const isLate = now > new Date(meeting.startTime.getTime() + LATE_GRACE_MS);

      try {
        return await ctx.db.attendance.create({
          data: {
            userId: ctx.session.user.id,
            meetingId: input.meetingId,
            checkInTime: now,
            method: "SELF",
            isLate,
            note: input.note,
          },
        });
      } catch {
        throw new TRPCError({
          code: "CONFLICT",
          message: "You have already checked in to this meeting.",
        });
      }
    }),

  adminCheckIn: adminProcedure
    .input(
      z.object({
        userId: z.string(),
        meetingId: z.string(),
        isLate: z.boolean().default(false),
        note: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await ctx.db.attendance.create({
          data: {
            userId: input.userId,
            meetingId: input.meetingId,
            checkInTime: new Date(),
            method: "MANUAL",
            isLate: input.isLate,
            note: input.note,
          },
        });
      } catch {
        throw new TRPCError({
          code: "CONFLICT",
          message: "This member is already checked in.",
        });
      }
    }),

  removeAttendance: adminProcedure
    .input(z.object({ userId: z.string(), meetingId: z.string() }))
    .mutation(({ ctx, input }) => {
      return ctx.db.attendance.delete({
        where: {
          userId_meetingId: {
            userId: input.userId,
            meetingId: input.meetingId,
          },
        },
      });
    }),

  // ─── Member queries ──────────────────────────────────────────────────────────

  getMyAttendance: protectedProcedure.query(({ ctx }) => {
    return ctx.db.attendance.findMany({
      where: { userId: ctx.session.user.id },
      include: {
        meeting: {
          select: {
            id: true,
            title: true,
            startTime: true,
            duration: true,
            feedbacks: {
              where: { userId: ctx.session.user.id },
              select: { rating: true, comment: true, isAnonymous: true },
            },
          },
        },
      },
      orderBy: { checkInTime: "desc" },
    });
  }),

  // ─── Feedback ────────────────────────────────────────────────────────────────

  submitFeedback: protectedProcedure
    .input(
      z.object({
        meetingId: z.string(),
        rating: z.number().int().min(1).max(5).optional(),
        comment: z.string().max(1000).optional(),
        isAnonymous: z.boolean().default(false),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.meetingFeedback.upsert({
        where: {
          userId_meetingId: {
            userId: ctx.session.user.id,
            meetingId: input.meetingId,
          },
        },
        create: {
          userId: ctx.session.user.id,
          meetingId: input.meetingId,
          rating: input.rating,
          comment: input.comment,
          isAnonymous: input.isAnonymous,
        },
        update: {
          rating: input.rating,
          comment: input.comment,
          isAnonymous: input.isAnonymous,
        },
      });
    }),

  // ─── Admin report ────────────────────────────────────────────────────────────

  getReport: adminProcedure
    .input(
      z.object({
        from: z.date().optional(),
        to: z.date().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const dateFilter = {
        ...(input.from && { gte: input.from }),
        ...(input.to && { lte: input.to }),
      };
      const hasFilter = Object.keys(dateFilter).length > 0;

      const [meetings, attendances, members] = await Promise.all([
        ctx.db.meeting.findMany({
          where: hasFilter ? { startTime: dateFilter } : undefined,
          select: { id: true },
        }),
        ctx.db.attendance.findMany({
          where: hasFilter
            ? { meeting: { startTime: dateFilter } }
            : undefined,
          select: { userId: true, meetingId: true, isLate: true },
        }),
        ctx.db.user.findMany({
          where: { status: "ACTIVE", role: { not: "ADMIN" } },
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            subTeam: true,
          },
          orderBy: { name: "asc" },
        }),
      ]);

      const totalMeetings = meetings.length;
      const meetingIdSet = new Set(meetings.map((m) => m.id));

      return members.map((member) => {
        const memberAtt = attendances.filter(
          (a) => a.userId === member.id && meetingIdSet.has(a.meetingId),
        );
        const attended = memberAtt.length;
        const late = memberAtt.filter((a) => a.isLate).length;
        const rate =
          totalMeetings > 0 ? Math.round((attended / totalMeetings) * 100) : 0;
        return { ...member, totalMeetings, attended, late, rate };
      });
    }),
});
